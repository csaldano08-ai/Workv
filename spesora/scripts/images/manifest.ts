import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { CatalogIndex } from '../../src/core/domain/catalog';
import { PATHS } from './config';
import { buildRecipePrompt, mainIngredients, promptHash } from './prompts';

/**
 * Manifest persistente della produzione visiva (assets/recipes/manifest.json).
 * Stato per ricetta, legato all'ID persistente: permette di riprendere senza rigenerare.
 */

export type ImageStatus =
  | 'pending' // da generare
  | 'generated' // controlli tecnici superati, coerenza non verificata
  | 'validated' // controlli tecnici + coerenza superati (o approvata a mano)
  | 'needs_review' // incerta: esclusa dall'app finché non viene approvata
  | 'failed'; // errore dopo i tentativi previsti

export interface RecipeImageEntry {
  id: string;
  name: string;
  dishCategory: string;
  mealTypes: string[];
  mainIngredients: string[];
  status: ImageStatus;
  /** Percorso relativo alla cartella del progetto (es. assets/recipes/pasta_al_tonno.jpg). Mai rinominato. */
  file: string | null;
  /** Versione ottimizzata per le card dell'app (800×600 JPEG), generata dal file sorgente. */
  card?: string | null;
  promptHash: string;
  attempts: number;
  model: string | null;
  phash: string | null;
  qc: { width?: number; height?: number; bytes?: number; semantic?: { matches: boolean; confidence: number; hasText: boolean; issues: string[] } | null; notes: string[] };
  updatedAt: string | null;
}

export interface RunRecord {
  startedAt: string;
  finishedAt: string | null;
  model: string;
  requested: number;
  generated: number;
  failed: number;
  needsReview: number;
  apiCalls: number;
  stoppedReason: string | null;
}

export interface Manifest {
  version: 1;
  style: { reference: string | null; promptHash: string | null };
  recipes: Record<string, RecipeImageEntry>;
  runs: RunRecord[];
}

export function emptyManifest(): Manifest {
  return { version: 1, style: { reference: null, promptHash: null }, recipes: {}, runs: [] };
}

export function loadManifest(path = PATHS.manifest): Manifest {
  if (!existsSync(path)) return emptyManifest();
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest;
}

/** Scrittura atomica: un'interruzione non lascia il manifest a metà. */
export function saveManifest(m: Manifest, path = PATHS.manifest): void {
  const sorted: Manifest = { ...m, recipes: Object.fromEntries(Object.entries(m.recipes).sort(([a], [b]) => a.localeCompare(b))) };
  writeFileSync(`${path}.tmp`, `${JSON.stringify(sorted, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

export interface SyncReport {
  added: string[];
  promptChanged: string[];
  removed: string[];
}

/**
 * Allinea il manifest al catalogo: aggiunge le ricette nuove, segnala quelle il cui prompt è cambiato
 * (ingredienti modificati) e quelle rimosse. Non cancella immagini già prodotte.
 */
export function syncWithCatalog(m: Manifest, catalog: CatalogIndex): SyncReport {
  const report: SyncReport = { added: [], promptChanged: [], removed: [] };
  const hasRef = !!m.style.reference;
  for (const recipe of catalog.catalog.recipes) {
    const hash = promptHash(buildRecipePrompt(recipe, catalog, hasRef));
    const existing = m.recipes[recipe.id];
    const base = {
      id: recipe.id,
      name: recipe.name,
      dishCategory: recipe.dishCategory,
      mealTypes: recipe.mealTypes,
      mainIngredients: mainIngredients(recipe, catalog).map((i) => i.id),
    };
    if (!existing) {
      m.recipes[recipe.id] = { ...base, status: 'pending', file: null, promptHash: hash, attempts: 0, model: null, phash: null, qc: { notes: [] }, updatedAt: null };
      report.added.push(recipe.id);
      continue;
    }
    // Nome/ingredienti aggiornati nel catalogo: l'immagine esistente resta, ma va rivista.
    if (existing.promptHash !== hash && existing.status !== 'pending') {
      const changedIngredients = existing.mainIngredients.join(',') !== base.mainIngredients.join(',') || existing.name !== base.name;
      if (changedIngredients) {
        report.promptChanged.push(recipe.id);
        existing.qc.notes.push('Ricetta modificata nel catalogo dopo la generazione: verificare o rigenerare.');
        if (existing.status === 'validated' || existing.status === 'generated') existing.status = 'needs_review';
      }
    }
    m.recipes[recipe.id] = { ...existing, ...base, promptHash: existing.status === 'pending' ? hash : existing.promptHash };
  }
  for (const id of Object.keys(m.recipes)) {
    if (!catalog.recipes.has(id)) report.removed.push(id);
  }
  return report;
}

export function countByStatus(m: Manifest): Record<ImageStatus, number> {
  const out: Record<ImageStatus, number> = { pending: 0, generated: 0, validated: 0, needs_review: 0, failed: 0 };
  for (const e of Object.values(m.recipes)) out[e.status]++;
  return out;
}

/** Stati mostrati nell'app: le immagini incerte restano escluse finché non vengono approvate. */
export const SHOWN_IN_APP: ImageStatus[] = ['generated', 'validated'];
