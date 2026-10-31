import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../data/catalog';
import { emptyManifest, loadManifest, syncWithCatalog } from '../../scripts/images/manifest';
import { buildRecipePrompt, mainIngredients } from '../../scripts/images/prompts';
import { hammingDistance, perceptualHash, technicalCheck, toCardJpeg } from '../../scripts/images/quality';
import { TIMO_POSES, timoSvg } from '../ui/mascot/timoSvg';
import { catalog } from './helpers';

const ROOT = join(__dirname, '..', '..');

/** Immagine di prova con contenuto reale: gradiente orizzontale (crescente o decrescente) più rumore. */
async function noise(seed: number) {
  const w = 1024;
  const h = 768;
  const buf = Buffer.alloc(w * h * 3);
  let x = seed;
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < w; c++) {
      const g = Math.round(((seed % 2 ? c : w - c) / w) * 200);
      for (let k = 0; k < 3; k++) {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        buf[(y * w + c) * 3 + k] = Math.min(255, g + (x & 31));
      }
    }
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

describe('Immagini delle ricette', () => {
  it('il manifest copre tutte le ricette reali del catalogo con ID persistenti', () => {
    const m = loadManifest();
    expect(Object.keys(m.recipes).sort()).toEqual(CATALOG.recipes.map((r) => r.id).sort());
    for (const r of CATALOG.recipes) expect(m.recipes[r.id].name).toBe(r.name);
  });

  it('la mappatura punta solo a ricette esistenti con file presenti, senza immagini condivise', () => {
    // Il file usa require() per Metro: qui lo leggiamo come testo.
    const src = readFileSync(join(ROOT, 'src', 'data', 'recipe-images.ts'), 'utf8');
    const entries = [...src.matchAll(/^\s*'?([a-z0-9_]+)'?: require\('\.\.\/\.\.\/([^']+)'\)/gm)].map((m) => ({ id: m[1], file: m[2] }));
    for (const e of entries) {
      expect(catalog.recipes.has(e.id), e.id).toBe(true);
      expect(existsSync(join(ROOT, e.file)), e.file).toBe(true);
      expect(e.file).toContain(e.id);
    }
    expect(new Set(entries.map((e) => e.file)).size).toBe(entries.length);
  });

  it('i prompt usano gli ingredienti reali e distinguono ricette simili', () => {
    const tonno = buildRecipePrompt(catalog.recipe('pasta_al_tonno')!, catalog, true);
    const pesto = buildRecipePrompt(catalog.recipe('pasta_al_pesto')!, catalog, true);
    expect(tonno).toMatch(/tonno in scatola/i);
    expect(pesto).toMatch(/pesto/i);
    expect(tonno).not.toEqual(pesto);
    expect(tonno).toMatch(/No text/);
    expect(mainIngredients(catalog.recipe('pasta_al_tonno')!, catalog).every((i) => !catalog.ingredient(i.id).staple)).toBe(true);
  });

  it('sincronizzazione: riconosce ricette nuove e modificate senza perdere lo stato', () => {
    const m = emptyManifest();
    expect(syncWithCatalog(m, catalog).added).toHaveLength(CATALOG.recipes.length);
    m.recipes.pasta_al_tonno.status = 'validated';
    m.recipes.pasta_al_tonno.mainIngredients = ['altro'];
    m.recipes.pasta_al_tonno.promptHash = 'diverso';
    const r = syncWithCatalog(m, catalog);
    expect(r.added).toHaveLength(0);
    expect(r.promptChanged).toEqual(['pasta_al_tonno']);
    expect(m.recipes.pasta_al_tonno.status).toBe('needs_review');
  });

  it('controllo qualità: rifiuta immagini vuote, ottimizza e riconosce i duplicati', async () => {
    const blank = await sharp({ create: { width: 1024, height: 768, channels: 3, background: '#F6F3EA' } }).png().toBuffer();
    expect((await technicalCheck(blank)).ok).toBe(false);
    const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#386E55' } }).png().toBuffer();
    expect((await technicalCheck(small)).ok).toBe(false);
    const a = await noise(1);
    expect((await technicalCheck(a)).ok).toBe(true);
    const card = await toCardJpeg(a);
    const meta = await sharp(card).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([800, 600, 'jpeg']);
    const hA = await perceptualHash(card);
    expect(hammingDistance(hA, await perceptualHash(await toCardJpeg(a)))).toBe(0);
    expect(hammingDistance(hA, await perceptualHash(await toCardJpeg(await noise(2))))).toBeGreaterThan(4);
  });
});

describe('Mascotte Timo', () => {
  it('ogni posa è un SVG valido, distinto e senza testo', () => {
    const svgs = TIMO_POSES.map((p) => timoSvg(p));
    expect(new Set(svgs).size).toBe(TIMO_POSES.length);
    for (const s of svgs) {
      expect(s.startsWith('<svg')).toBe(true);
      expect(s).not.toMatch(/<text/);
    }
  });

  it('gli asset PNG esportati esistono per tutte le pose', () => {
    for (const p of TIMO_POSES) expect(existsSync(join(ROOT, 'assets', 'mascot', `timo-${p}.png`))).toBe(true);
    expect(existsSync(join(ROOT, 'assets', 'mascot', 'timo-badge.png'))).toBe(true);
  });
});
