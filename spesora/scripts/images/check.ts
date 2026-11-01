/**
 * Controllo di integrità delle illustrazioni (SOLA LETTURA: non modifica manifest, mappe o immagini).
 *
 *   npm run images:check              errori bloccanti → exit 1; avvisi solo stampati
 *   npm run images:check -- --strict  anche le card mancanti per immagini validate diventano errori
 *   npm run images:check -- --json    rapporto in JSON su stdout
 *
 * Verifica: manifest ↔ catalogo, file esistenti e nominati per ID, proporzione 4:3, duplicati,
 * mappe statiche (recipe-images.ts di Codex e recipe-image-cards.ts usata dall'app), peso degli asset.
 * Non chiama alcuna API e non richiede credenziali: è pensato per le pull request di integrazione.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CatalogIndex } from '../../src/core/domain/catalog';
import { CATALOG } from '../../src/data/catalog';
import { IMAGE, PATHS } from './config';
import { loadManifest, SHOWN_IN_APP, type ImageStatus } from './manifest';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const asJson = args.includes('--json');
const out = (s: string) => process.stdout.write(`${s}\n`);

const LIMITS = {
  sourceMaxBytes: 3 * 1024 * 1024,
  sourceWarnBytes: 2 * 1024 * 1024,
  cardMaxBytes: 200 * 1024,
  cardsTotalWarnBytes: 40 * 1024 * 1024,
};

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const catalog = new CatalogIndex(CATALOG);
const catalogIds = new Set(catalog.catalog.recipes.map((r) => r.id));
const manifest = loadManifest();
const entries = Object.values(manifest.recipes);
const ID = /^[a-z0-9_]+$/;

/** Estrae le coppie id → percorso dai require statici di una mappa generata. */
export function parseRequireMap(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /^\s*'?([a-z0-9_]+)'?\s*:\s*require\('\.\.\/\.\.\/([^']+)'\)/gm;
  for (const m of text.matchAll(re)) {
    if (out.has(m[1])) err(`Mappa: chiave duplicata "${m[1]}"`);
    out.set(m[1], m[2]);
  }
  return out;
}

async function dims(path: string): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(path).metadata();
    return meta.width && meta.height ? { width: meta.width, height: meta.height } : null;
  } catch {
    return null;
  }
}

const is43 = (d: { width: number; height: number }) => d.width * 3 === d.height * 4;

async function main() {
  // 1. Manifest ↔ catalogo
  for (const [key, e] of Object.entries(manifest.recipes)) {
    if (e.id !== key) err(`Manifest: chiave "${key}" diversa dall'id "${e.id}"`);
    if (!ID.test(e.id)) err(`Manifest: id non valido "${e.id}"`);
    if (!catalogIds.has(e.id)) err(`Manifest: "${e.id}" non esiste nel catalogo`);
  }
  const missingInManifest = [...catalogIds].filter((id) => !manifest.recipes[id]);
  if (missingInManifest.length) warn(`Catalogo: ${missingInManifest.length} ricette non ancora nel manifest (es. ${missingInManifest.slice(0, 3).join(', ')})`);

  // 2. File sorgente delle immagini mostrate
  const shown = entries.filter((e) => SHOWN_IN_APP.includes(e.status));
  const byFile = new Map<string, string>();
  const byHash = new Map<string, string>();
  let sourceBytes = 0;
  for (const e of shown) {
    if (!e.file) {
      err(`"${e.id}" è ${e.status} ma non ha un file`);
      continue;
    }
    const expected = new RegExp(`^assets/recipes/${e.id}\\.(png|jpg)$`);
    if (!expected.test(e.file)) err(`"${e.id}": nome file non coerente con l'ID (${e.file})`);
    if (byFile.has(e.file)) err(`File condiviso da "${byFile.get(e.file)}" e "${e.id}": ${e.file}`);
    byFile.set(e.file, e.id);
    if (e.phash) {
      if (byHash.has(e.phash)) err(`Probabile immagine duplicata: "${byHash.get(e.phash)}" e "${e.id}" (stesso hash percettivo)`);
      byHash.set(e.phash, e.id);
    }
    const abs = join(PATHS.root, e.file);
    if (!existsSync(abs)) {
      err(`"${e.id}": file mancante ${e.file}`);
      continue;
    }
    const bytes = statSync(abs).size;
    sourceBytes += bytes;
    if (bytes > LIMITS.sourceMaxBytes) err(`"${e.id}": sorgente troppo pesante (${kb(bytes)})`);
    else if (bytes > LIMITS.sourceWarnBytes) warn(`"${e.id}": sorgente pesante (${kb(bytes)})`);
    const d = await dims(abs);
    if (!d) err(`"${e.id}": immagine illeggibile`);
    else {
      if (!is43(d)) err(`"${e.id}": proporzione non 4:3 (${d.width}×${d.height})`);
      if (d.width < IMAGE.minSourceWidth) err(`"${e.id}": larghezza insufficiente (${d.width}px)`);
    }
  }

  // 3. File presenti nella cartella ma non dichiarati (orfani)
  const declared = new Set(entries.map((e) => e.file).filter(Boolean));
  for (const f of readdirSync(PATHS.recipesDir)) {
    if (!/\.(png|jpg|jpeg|webp)$/i.test(f)) continue;
    const rel = `assets/recipes/${f}`;
    if (!declared.has(rel)) {
      const id = f.replace(/\.[^.]+$/, '');
      const e = manifest.recipes[id];
      warn(`File non collegato a un'immagine validata: ${rel}${e ? ` (stato manifest: ${e.status})` : ' (ID assente dal manifest)'}`);
    }
  }

  // 4. Mappa dei sorgenti (scritta dallo script Google Flow; non importata dall'app)
  if (existsSync(PATHS.mapFile)) {
    const text = readFileSync(PATHS.mapFile, 'utf8');
    const map = parseRequireMap(text);
    for (const [id, rel] of map) {
      if (!catalogIds.has(id)) err(`recipe-images.ts: "${id}" non è nel catalogo`);
      if (!existsSync(join(PATHS.root, rel))) err(`recipe-images.ts: "${id}" punta a un file mancante (${rel})`);
      const e = manifest.recipes[id];
      if (!e || !SHOWN_IN_APP.includes(e.status)) err(`recipe-images.ts: "${id}" non è validata nel manifest`);
      else if (e.file !== rel) err(`recipe-images.ts: "${id}" punta a ${rel}, il manifest a ${e.file}`);
    }
    for (const e of shown) if (!map.has(e.id)) err(`recipe-images.ts: manca "${e.id}" (validata nel manifest)`);
    const count = /RECIPE_IMAGE_COUNT\s*=\s*(\d+)/.exec(text);
    if (count && Number(count[1]) !== map.size) err(`recipe-images.ts: RECIPE_IMAGE_COUNT=${count[1]} ma le voci sono ${map.size}`);
  }

  // 5. Mappa delle card (l'unica importata dall'app)
  const cardText = existsSync(PATHS.cardMapFile) ? readFileSync(PATHS.cardMapFile, 'utf8') : '';
  if (!cardText) err('recipe-image-cards.ts mancante');
  const cards = parseRequireMap(cardText);
  let cardBytes = 0;
  for (const [id, rel] of cards) {
    if (!catalogIds.has(id)) err(`Card: "${id}" non è nel catalogo`);
    const e = manifest.recipes[id];
    if (!e || !SHOWN_IN_APP.includes(e.status)) err(`Card: "${id}" mostrata nell'app ma non validata nel manifest`);
    if (rel !== `assets/recipes/card/${id}.jpg`) err(`Card: "${id}" ha un percorso inatteso (${rel})`);
    const abs = join(PATHS.root, rel);
    if (!existsSync(abs)) {
      err(`Card: file mancante ${rel}`);
      continue;
    }
    const bytes = statSync(abs).size;
    cardBytes += bytes;
    if (bytes > LIMITS.cardMaxBytes) err(`Card "${id}" troppo pesante (${kb(bytes)})`);
    const d = await dims(abs);
    if (!d || d.width !== IMAGE.cardWidth || d.height !== IMAGE.cardHeight) err(`Card "${id}": dimensioni attese ${IMAGE.cardWidth}×${IMAGE.cardHeight}, trovate ${d ? `${d.width}×${d.height}` : 'illeggibile'}`);
  }
  const count = /RECIPE_IMAGE_CARD_COUNT\s*=\s*(\d+)/.exec(cardText);
  if (count && Number(count[1]) !== cards.size) err(`recipe-image-cards.ts: RECIPE_IMAGE_CARD_COUNT=${count[1]} ma le voci sono ${cards.size}`);
  const withoutCard = shown.filter((e) => !cards.has(e.id)).map((e) => e.id);
  if (withoutCard.length) {
    const msg = `${withoutCard.length} immagini validate senza card nell'app (es. ${withoutCard.slice(0, 3).join(', ')}): eseguire "npm run images -- cards" dopo l'integrazione`;
    if (strict) err(msg);
    else warn(msg);
  }
  // 5b. Miniature per le liste: solo per ricette con card, dimensioni fisse
  let thumbBytes = 0;
  if (existsSync(PATHS.thumbMapFile)) {
    const thumbs = parseRequireMap(readFileSync(PATHS.thumbMapFile, 'utf8'));
    for (const [id, rel] of thumbs) {
      if (!cards.has(id)) err(`Miniatura "${id}" senza card corrispondente`);
      if (rel !== `assets/recipes/thumb/${id}.jpg`) err(`Miniatura "${id}" con percorso inatteso (${rel})`);
      const abs = join(PATHS.root, rel);
      if (!existsSync(abs)) {
        err(`Miniatura: file mancante ${rel}`);
        continue;
      }
      thumbBytes += statSync(abs).size;
      const d = await dims(abs);
      if (!d || d.width !== IMAGE.thumbWidth || d.height !== IMAGE.thumbHeight) err(`Miniatura "${id}": dimensioni attese ${IMAGE.thumbWidth}×${IMAGE.thumbHeight}`);
    }
    const noThumb = [...cards.keys()].filter((id) => !thumbs.has(id));
    if (noThumb.length) warn(`${noThumb.length} card senza miniatura (le liste usano la card): eseguire "npm run images -- cards"`);
  }
  if (cardBytes > LIMITS.cardsTotalWarnBytes) warn(`Peso totale card elevato: ${kb(cardBytes)}`);

  // 6. Riepilogo
  const counts: Record<ImageStatus, number> = { pending: 0, generated: 0, validated: 0, needs_review: 0, failed: 0 };
  for (const e of entries) counts[e.status]++;
  const report = {
    catalog: catalogIds.size,
    manifest: entries.length,
    status: counts,
    shownSources: shown.length,
    cardsInApp: cards.size,
    sourceBytes,
    cardBytes,
    thumbBytes,
    errors,
    warnings,
  };
  if (asJson) out(JSON.stringify(report, null, 2));
  else {
    out(`Catalogo ${report.catalog} · manifest ${report.manifest} · stati ${JSON.stringify(counts)}`);
    out(`Sorgenti validate ${shown.length} (${kb(sourceBytes)}) · card nell'app ${cards.size} (${kb(cardBytes)}) · miniature ${kb(thumbBytes)}`);
    for (const w of warnings.slice(0, 30)) out(`  avviso: ${w}`);
    if (warnings.length > 30) out(`  … altri ${warnings.length - 30} avvisi`);
    for (const e of errors) out(`  ERRORE: ${e}`);
    out(errors.length ? `${errors.length} errori.` : 'Nessun errore.');
  }
  process.exitCode = errors.length ? 1 : 0;
}

function kb(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

void main();
