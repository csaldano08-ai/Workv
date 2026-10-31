/**
 * Pipeline delle immagini delle ricette Spesora.
 *
 *   npx tsx scripts/images/pipeline.ts status            stato del manifest
 *   npx tsx scripts/images/pipeline.ts sync              allinea il manifest al catalogo (nuove ricette, modifiche)
 *   npx tsx scripts/images/pipeline.ts models            modelli disponibili per la chiave (richiede GEMINI_API_KEY)
 *   npx tsx scripts/images/pipeline.ts style             genera il riferimento di stile (una volta sola)
 *   npx tsx scripts/images/pipeline.ts run --limit 20    genera le immagini mancanti, a lotti, salvando dopo ognuna
 *        [--pilot] (5 immagini) [--ids a,b] [--model nome] [--no-check] [--dry-run]
 *   npx tsx scripts/images/pipeline.ts import <cartella> importa immagini già pronte (es. scaricate da Flow) chiamate <id>.png/jpg
 *   npx tsx scripts/images/pipeline.ts approve <id...>   approva immagini "needs_review"
 *   npx tsx scripts/images/pipeline.ts reject <id...>    scarta e rimette in coda
 *   npx tsx scripts/images/pipeline.ts map               rigenera src/data/recipe-images.ts
 *
 * Nessun acquisto, nessuna esecuzione automatica ricorrente: ogni run ha un tetto di immagini.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { CatalogIndex } from '../../src/core/domain/catalog';
import { CATALOG } from '../../src/data/catalog';
import { LIMITS, MODELS, PATHS } from './config';
import { ApiError, checkImage, generateImage, listModels, QuotaExhaustedError, resolveModel } from './gemini';
import { countByStatus, loadManifest, saveManifest, SHOWN_IN_APP, syncWithCatalog, type Manifest, type RecipeImageEntry, type RunRecord } from './manifest';
import { buildRecipePrompt, buildStylePrompt, promptHash } from './prompts';
import { hammingDistance, perceptualHash, technicalCheck, toCardJpeg } from './quality';

const catalog = new CatalogIndex(CATALOG);
const args = process.argv.slice(2);
const command = args[0] ?? 'status';
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const log = (...m: unknown[]) => console.warn(...m);

function requireKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    log('GEMINI_API_KEY non impostata. In GitHub: Settings → Secrets and variables → Actions → New repository secret "GEMINI_API_KEY".');
    process.exit(2);
  }
  return key;
}

function ensureDirs() {
  for (const d of [PATHS.recipesDir, PATHS.styleDir, PATHS.sourcesDir]) mkdirSync(d, { recursive: true });
}

/**
 * Scrive src/data/recipe-image-cards.ts: SOLO versioni ottimizzate (card 800×600 JPEG), con require statici
 * per Metro. È l'unico file di immagini importato dall'app, così i sorgenti PNG a piena risoluzione non
 * entrano nel bundle. src/data/recipe-images.ts resta gestito dallo script di Google Flow (Codex).
 */
export function writeMap(m: Manifest): number {
  const cardOf = (e: RecipeImageEntry) => e.card ?? (e.file?.endsWith('.jpg') ? e.file : null);
  const entries = Object.values(m.recipes)
    .filter((e) => SHOWN_IN_APP.includes(e.status) && cardOf(e) && existsSync(join(PATHS.root, cardOf(e)!)) && catalog.recipes.has(e.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const body = entries.map((e) => `  ${e.id}: require('../../${cardOf(e)}'),`).join('\n');
  const content = `/* File GENERATO da scripts/images/pipeline.ts (comandi "cards" e "map"). Non modificare a mano. */
import type { ImageSourcePropType } from 'react-native';

/** Card ottimizzate delle ricette, per ID persistente. Le ricette assenti usano l'illustrazione di fallback. */
export const RECIPE_IMAGE_CARDS: Readonly<Record<string, ImageSourcePropType>> = {
${body}
};

export const RECIPE_IMAGE_CARD_COUNT = ${entries.length};
`;
  writeFileSync(PATHS.cardMapFile, content);
  return entries.length;
}

async function storeImage(entry: RecipeImageEntry, source: Buffer, manifest: Manifest): Promise<{ ok: boolean; duplicateOf?: string; notes: string[] }> {
  const tech = await technicalCheck(source);
  if (!tech.ok) return { ok: false, notes: tech.notes };
  const card = await toCardJpeg(source);
  const hash = await perceptualHash(card);
  const dup = Object.values(manifest.recipes).find((o) => o.id !== entry.id && o.phash && SHOWN_IN_APP.concat('needs_review').includes(o.status) && hammingDistance(o.phash, hash) <= LIMITS.duplicateHashDistance);
  if (dup) return { ok: false, duplicateOf: dup.id, notes: [...tech.notes, `Troppo simile all'immagine di ${dup.id}`] };
  writeFileSync(join(PATHS.sourcesDir, `${entry.id}.png`), source);
  const rel = `assets/recipes/${entry.id}.jpg`;
  writeFileSync(join(PATHS.root, rel), card);
  entry.file = rel;
  entry.phash = hash;
  entry.qc = { ...entry.qc, width: tech.width, height: tech.height, bytes: card.length, notes: tech.notes };
  return { ok: true, notes: tech.notes };
}

function diversify(entries: RecipeImageEntry[]): RecipeImageEntry[] {
  const seen = new Set<string>();
  const first = entries.filter((e) => !seen.has(e.dishCategory) && seen.add(e.dishCategory));
  return [...first, ...entries.filter((e) => !first.includes(e))];
}

async function run() {
  ensureDirs();
  const manifest = loadManifest();
  const sync = syncWithCatalog(manifest, catalog);
  if (sync.added.length) log(`Nuove ricette nel manifest: ${sync.added.length}`);
  const pilot = flag('pilot');
  const limit = Math.min(Number(option('limit') ?? (pilot ? 5 : LIMITS.defaultPerRun)), LIMITS.hardMaxPerRun);
  const ids = option('ids')?.split(',').filter(Boolean);
  const eligible = Object.values(manifest.recipes).filter(
    (e) => catalog.recipes.has(e.id) && (ids ? ids.includes(e.id) : e.status === 'pending' || (e.status === 'failed' && e.attempts < LIMITS.maxAttemptsPerRecipe)),
  );
  // Lotto pilota: una ricetta per tipologia di piatto, per verificare subito coerenza e riconoscibilità.
  const queue = pilot && !ids ? diversify(eligible).slice(0, limit) : eligible.slice(0, limit);
  log(`Da generare in questa esecuzione: ${queue.length} (limite ${limit}). Stato: ${JSON.stringify(countByStatus(manifest))}`);

  if (flag('dry-run')) {
    const hasRef = existsSync(PATHS.styleReference);
    for (const e of queue.slice(0, 3)) log(`\n--- ${e.id}\n${buildRecipePrompt(catalog.recipe(e.id)!, catalog, hasRef)}`);
    saveManifest(manifest);
    return;
  }
  const key = requireKey();
  const models = await listModels(key);
  const imageModel = resolveModel(models, option('model') ?? MODELS.image, 'image');
  const checkModel = flag('no-check') ? null : resolveModel(models, MODELS.check, 'check');
  log(`Modello immagine: ${imageModel}${checkModel ? ` · controllo coerenza: ${checkModel}` : ' · controllo coerenza disattivato'}`);
  const reference = existsSync(PATHS.styleReference) ? { mimeType: 'image/jpeg', data: readFileSync(PATHS.styleReference) } : undefined;
  if (!reference) log('Attenzione: nessun riferimento di stile. Esegui prima il comando "style" per la massima coerenza.');

  const record: RunRecord = { startedAt: new Date().toISOString(), finishedAt: null, model: imageModel, requested: queue.length, generated: 0, failed: 0, needsReview: 0, apiCalls: 1, stoppedReason: null };
  manifest.runs.push(record);

  for (let b = 0; b < queue.length; b += LIMITS.batchSize) {
    const batch = queue.slice(b, b + LIMITS.batchSize);
    log(`\nLotto ${b / LIMITS.batchSize + 1}: ${batch.map((e) => e.id).join(', ')}`);
    for (const entry of batch) {
      const recipe = catalog.recipe(entry.id)!;
      const prompt = buildRecipePrompt(recipe, catalog, !!reference);
      let done = false;
      while (!done && entry.attempts < LIMITS.maxAttemptsPerRecipe) {
        entry.attempts++;
        try {
          const extra = entry.qc.semantic && !entry.qc.semantic.matches ? `\nPrevious attempt problems to fix: ${entry.qc.semantic.issues.join('; ')}` : '';
          const img = await generateImage(key, imageModel, prompt + extra, reference);
          record.apiCalls++;
          const stored = await storeImage(entry, img.data, manifest);
          if (!stored.ok) {
            entry.qc.notes = stored.notes;
            log(`  ${entry.id}: scartata (${stored.notes.join('; ')})`);
            continue;
          }
          entry.model = imageModel;
          entry.promptHash = promptHash(prompt);
          if (checkModel) {
            const card = readFileSync(join(PATHS.root, entry.file!));
            const sem = await checkImage(key, checkModel, card, recipe.name, recipe.ingredients.filter((i) => !i.toTaste).map((i) => catalog.ingredient(i.ingredientId).name));
            record.apiCalls++;
            entry.qc.semantic = sem;
            if (sem.matches && !sem.hasText && sem.confidence >= 0.6) {
              entry.status = 'validated';
              done = true;
            } else if (entry.attempts >= LIMITS.maxAttemptsPerRecipe) {
              entry.status = 'needs_review';
              record.needsReview++;
              done = true;
            } else log(`  ${entry.id}: coerenza incerta (${sem.issues.join('; ') || `confidenza ${sem.confidence}`}), rigenero`);
          } else {
            entry.status = 'generated';
            done = true;
          }
        } catch (e) {
          if (e instanceof QuotaExhaustedError) {
            record.stoppedReason = e.message;
            entry.attempts--; // il tentativo non è stato consumato
            log(`\nQuota o crediti esauriti: mi fermo. Stato salvato, alla prossima esecuzione riprendo da qui.`);
            finish(manifest, record);
            return;
          }
          entry.qc.notes = [String(e instanceof ApiError ? e.message : e)];
          log(`  ${entry.id}: errore (${entry.qc.notes[0].slice(0, 160)})`);
          if (e instanceof ApiError && e.status === 400) break; // prompt rifiutato: inutile ripetere
        }
      }
      if (!done) {
        entry.status = 'failed';
        record.failed++;
      } else if (entry.status !== 'needs_review') record.generated++;
      entry.updatedAt = new Date().toISOString();
      saveManifest(manifest); // stato salvato dopo ogni ricetta
      log(`  ${entry.id}: ${entry.status}`);
    }
    writeMap(manifest); // riferimenti aggiornati dopo ogni lotto
  }
  finish(manifest, record);
}

function finish(manifest: Manifest, record: RunRecord) {
  record.finishedAt = new Date().toISOString();
  saveManifest(manifest);
  const n = writeMap(manifest);
  log(`\nFine: generate ${record.generated}, da rivedere ${record.needsReview}, fallite ${record.failed}, chiamate API ${record.apiCalls}. Immagini nell'app: ${n}.`);
}

async function style() {
  ensureDirs();
  const manifest = loadManifest();
  if (existsSync(PATHS.styleReference) && !flag('force')) {
    log('Riferimento di stile già presente (usa --force per rigenerarlo: cambierebbe lo stile delle immagini successive).');
    return;
  }
  const key = requireKey();
  const model = resolveModel(await listModels(key), option('model') ?? MODELS.image, 'image');
  const prompt = buildStylePrompt();
  const img = await generateImage(key, model, prompt);
  const tech = await technicalCheck(img.data);
  if (!tech.ok) throw new Error(`Riferimento non valido: ${tech.notes.join('; ')}`);
  writeFileSync(PATHS.styleReference, await toCardJpeg(img.data));
  manifest.style = { reference: 'assets/recipes/_style/reference.jpg', promptHash: promptHash(prompt) };
  saveManifest(manifest);
  log(`Riferimento di stile creato con ${model}: assets/recipes/_style/reference.jpg`);
}

async function importDir(dir: string) {
  ensureDirs();
  const manifest = loadManifest();
  syncWithCatalog(manifest, catalog);
  let ok = 0;
  for (const file of readdirSync(dir)) {
    const id = file.replace(extname(file), '');
    const entry = manifest.recipes[id];
    if (!entry || !['.png', '.jpg', '.jpeg', '.webp'].includes(extname(file).toLowerCase())) continue;
    const stored = await storeImage(entry, readFileSync(join(dir, file)), manifest);
    entry.status = stored.ok ? 'needs_review' : 'failed';
    entry.qc.notes = [...stored.notes, 'Importata: approvare dopo la verifica visiva (comando approve).'];
    entry.updatedAt = new Date().toISOString();
    if (stored.ok) ok++;
  }
  saveManifest(manifest);
  writeMap(manifest);
  log(`Importate ${ok} immagini (in stato needs_review).`);
}

function setStatus(ids: string[], status: 'validated' | 'pending') {
  const manifest = loadManifest();
  for (const id of ids) {
    const e = manifest.recipes[id];
    if (!e) {
      log(`ID sconosciuto: ${id}`);
      continue;
    }
    if (status === 'pending') {
      if (e.file && existsSync(join(PATHS.root, e.file))) rmSync(join(PATHS.root, e.file));
      Object.assign(e, { status, file: null, phash: null, attempts: 0, qc: { notes: ['Scartata manualmente'] } });
    } else if (e.file) e.status = 'validated';
    e.updatedAt = new Date().toISOString();
  }
  saveManifest(manifest);
  writeMap(manifest);
}

async function main() {
  switch (command) {
    case 'status': {
      const m = loadManifest();
      const sync = syncWithCatalog(m, catalog);
      const counts = countByStatus(m);
      log(`Ricette nel catalogo: ${catalog.catalog.recipes.length}. Nel manifest: ${Object.keys(m.recipes).length}.`);
      log(`Stato: ${JSON.stringify(counts)}. Riferimento di stile: ${m.style.reference ?? 'assente'}.`);
      if (sync.added.length) log(`Non ancora nel manifest: ${sync.added.length} (esegui "sync").`);
      if (sync.removed.length) log(`Nel manifest ma non più nel catalogo: ${sync.removed.join(', ')}`);
      const last = m.runs[m.runs.length - 1];
      if (last) log(`Ultima esecuzione: ${JSON.stringify(last)}`);
      break;
    }
    case 'sync': {
      ensureDirs();
      const m = loadManifest();
      const r = syncWithCatalog(m, catalog);
      saveManifest(m);
      writeMap(m);
      log(`Aggiunte ${r.added.length}, modificate ${r.promptChanged.length}, rimosse dal catalogo ${r.removed.length}.`);
      break;
    }
    case 'models': {
      const ms = await listModels(requireKey());
      for (const mo of ms.filter((x) => x.supportedGenerationMethods?.includes('generateContent'))) log(mo.name);
      break;
    }
    case 'style':
      await style();
      break;
    case 'run':
      await run();
      break;
    case 'import':
      if (!args[1]) throw new Error('Indica la cartella da importare');
      await importDir(args[1]);
      break;
    case 'approve':
      setStatus(args.slice(1), 'validated');
      break;
    case 'reject':
      setStatus(args.slice(1), 'pending');
      break;
    case 'cards': {
      // Versioni leggere per l'app dai sorgenti esistenti (es. PNG da Google Flow): i sorgenti non vengono toccati.
      ensureDirs();
      const m = loadManifest();
      mkdirSync(join(PATHS.recipesDir, 'card'), { recursive: true });
      let made = 0;
      for (const e of Object.values(m.recipes)) {
        if (!SHOWN_IN_APP.includes(e.status) || !e.file || !existsSync(join(PATHS.root, e.file))) continue;
        const rel = `assets/recipes/card/${e.id}.jpg`;
        if (e.card === rel && existsSync(join(PATHS.root, rel)) && !flag('force')) continue;
        const card = await toCardJpeg(readFileSync(join(PATHS.root, e.file)));
        writeFileSync(join(PATHS.root, rel), card);
        e.card = rel;
        e.phash = e.phash ?? (await perceptualHash(card));
        made++;
      }
      saveManifest(m);
      log(`Card generate: ${made}. Immagini nell'app: ${writeMap(m)}`);
      break;
    }
    case 'map':
      ensureDirs();
      log(`Immagini nell'app: ${writeMap(loadManifest())}`);
      break;
    default:
      log(`Comando sconosciuto: ${command}`);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
