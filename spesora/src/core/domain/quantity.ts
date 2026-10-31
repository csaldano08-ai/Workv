import type { MilliQty, Unit } from './types';

/**
 * Quantità esatte: interi in milli-unità. Nessun float persistito.
 * Conversioni esplicite soltanto tra multipli della stessa grandezza (g↔kg, ml↔l).
 */

export const MILLI = 1000;

export function toMilli(qty: number): MilliQty {
  if (!Number.isFinite(qty) || qty < 0) throw new Error(`Quantità non valida: ${qty}`);
  return Math.round(qty * MILLI);
}

export function fromMilli(q: MilliQty): number {
  return q / MILLI;
}

/** Scala una quantità per porzioni, arrotondando all'intero di milli-unità. */
export function scaleQty(q: MilliQty, servings: number, baseServings: number): MilliQty {
  if (!Number.isInteger(q) || q < 0) throw new Error(`Quantità non valida: ${q}`);
  if (!(servings > 0) || !(baseServings > 0)) throw new Error('Porzioni non valide');
  return Math.round((q * servings) / baseServings);
}

/** Validazione difensiva per input utente (stringhe con virgola o punto). */
export function parseUserQty(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 && value < 1_000_000 ? value : null;
}

/** Arrotondamento leggibile per la lista della spesa (verso l'alto, per non restare senza). */
export function roundUpForShopping(q: MilliQty, unit: Unit): MilliQty {
  if (q <= 0) return 0;
  if (unit === 'pz') return Math.ceil(q / 500) * 500; // mezzi pezzi
  const units = q / MILLI;
  const step = units <= 50 ? 5 : units <= 500 ? 10 : 50;
  return Math.ceil(units / step) * step * MILLI;
}

function trimNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

export function formatQty(q: MilliQty, unit: Unit): string {
  const v = q / MILLI;
  if (unit === 'pz') {
    if (v === 0.5) return '½';
    if (v === 0.25) return '¼';
    return trimNumber(v);
  }
  if (unit === 'g') return v >= 1000 ? `${trimNumber(v / 1000)} kg` : `${trimNumber(v)} g`;
  return v >= 1000 ? `${trimNumber(v / 1000)} l` : `${trimNumber(v)} ml`;
}

export function formatQtyWithUnit(q: MilliQty, unit: Unit): string {
  const base = formatQty(q, unit);
  if (unit !== 'pz') return base;
  return `${base} pz`;
}

export interface PackSuggestion {
  packSize: number; // unità canonica
  count: number;
  total: MilliQty;
}

/**
 * Suggerisce confezioni generiche: la confezione singola più piccola che basta,
 * altrimenti multipli della più grande. Null se non esistono formati noti.
 */
export function suggestPacks(needed: MilliQty, packSizes: number[] | undefined): PackSuggestion | null {
  if (!packSizes || packSizes.length === 0 || needed <= 0) return null;
  const sorted = [...packSizes].sort((a, b) => a - b);
  for (const size of sorted) {
    if (toMilli(size) >= needed) return { packSize: size, count: 1, total: toMilli(size) };
  }
  const largest = sorted[sorted.length - 1];
  const count = Math.ceil(needed / toMilli(largest));
  return { packSize: largest, count, total: count * toMilli(largest) };
}
