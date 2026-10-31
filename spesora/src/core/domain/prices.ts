import { diffDays } from './dates';
import { suggestPacks } from './quantity';
import type { IsoDate, MilliQty, Unit } from './types';

/**
 * IngredientPriceEngine — prezzi indicativi degli ingredienti.
 *
 * Principi:
 * - Importi sempre in centesimi interi; quantità in milli-unità; arrotondamento al centesimo più vicino.
 * - Nessun prezzo inventato: se non esiste un dato attendibile il prezzo è "sconosciuto".
 * - Il prezzo inserito dall'utente prevale sul riferimento; ogni dato conserva fonte e data.
 * - Distinzione centrale: costo della quantità consumata ≠ costo alla cassa delle confezioni intere.
 */

export const STORE_TYPES = ['discount', 'supermercato', 'mercato', 'ovunque', 'non_indicato'] as const;
export type StoreType = (typeof STORE_TYPES)[number];

export type PriceSource = 'utente' | 'riferimento';
export type PriceReliability = 'alta' | 'media' | 'bassa';
export type PriceFreshness = 'aggiornato' | 'obsoleto';

export interface PriceEntry {
  ingredientId: string;
  /** Prezzo pagato per `quantity` unità canoniche (es. 120 centesimi per 500 g). */
  priceCents: number;
  currency: 'EUR';
  /** Quantità di riferimento nell'unità canonica dell'ingrediente (NON milli). */
  quantity: number;
  unit: Unit;
  source: PriceSource;
  /** Nome della fonte o "Inserito da te". */
  sourceName: string;
  observedAt: IsoDate;
  area?: string;
  storeType?: StoreType;
  reliability: PriceReliability;
}

/** Oltre questa età un prezzo è considerato obsoleto (resta utilizzabile, ma segnalato). */
export const PRICE_MAX_AGE_DAYS = 180;

export function validatePriceEntry(e: PriceEntry): string | null {
  if (!Number.isInteger(e.priceCents) || e.priceCents <= 0 || e.priceCents > 100_000) return 'Prezzo non valido';
  if (!(e.quantity > 0) || !Number.isFinite(e.quantity)) return 'Quantità di riferimento non valida';
  if (e.currency !== 'EUR') return 'Valuta non supportata';
  return null;
}

export function freshness(e: PriceEntry, today: IsoDate): PriceFreshness {
  return diffDays(e.observedAt, today) > PRICE_MAX_AGE_DAYS ? 'obsoleto' : 'aggiornato';
}

/** Prezzo normalizzato in centesimi per kg, litro o pezzo (arrotondato). */
export function normalizedCents(e: PriceEntry): number {
  const perUnit = e.priceCents / e.quantity; // centesimi per g, ml o pz
  return Math.round(e.unit === 'pz' ? perUnit : perUnit * 1000);
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

export interface PriceQuote {
  entry: PriceEntry;
  freshness: PriceFreshness;
}

export class IngredientPriceEngine {
  private readonly byIngredient = new Map<string, PriceEntry[]>();

  constructor(
    reference: PriceEntry[],
    user: PriceEntry[],
    private readonly today: IsoDate,
  ) {
    for (const e of [...reference, ...user]) {
      if (validatePriceEntry(e)) continue;
      const list = this.byIngredient.get(e.ingredientId) ?? [];
      list.push(e);
      this.byIngredient.set(e.ingredientId, list);
    }
  }

  /** Miglior dato disponibile: prima quelli dell'utente, poi il più recente. */
  quote(ingredientId: string): PriceQuote | null {
    const list = this.byIngredient.get(ingredientId);
    if (!list || list.length === 0) return null;
    const best = [...list].sort((a, b) => (a.source !== b.source ? (a.source === 'utente' ? -1 : 1) : a.observedAt < b.observedAt ? 1 : -1))[0];
    return { entry: best, freshness: freshness(best, this.today) };
  }

  has(ingredientId: string): boolean {
    return this.quote(ingredientId) !== null;
  }

  /** Costo imputabile alla quantità consumata (centesimi), null se il prezzo è sconosciuto. */
  costForQty(ingredientId: string, qty: MilliQty): number | null {
    const q = this.quote(ingredientId);
    if (!q) return null;
    if (qty <= 0) return 0;
    return Math.round((q.entry.priceCents * qty) / (q.entry.quantity * 1000));
  }

  /**
   * Costo alla cassa per acquistare `needed`: confezioni intere quando il formato è noto
   * (se il prezzo si riferisce proprio a quel formato si usa il prezzo della confezione).
   */
  cartCost(ingredientId: string, needed: MilliQty, packSizes: number[] | undefined): { cents: number; purchasedQty: MilliQty } | null {
    const q = this.quote(ingredientId);
    if (!q) return null;
    if (needed <= 0) return { cents: 0, purchasedQty: 0 };
    // Il formato del prezzo noto è il primo candidato come confezione.
    const sizes = [...new Set([q.entry.quantity, ...(packSizes ?? [])])];
    const pack = suggestPacks(needed, packSizes && packSizes.length > 0 ? sizes : q.entry.unit === 'pz' ? undefined : [q.entry.quantity]);
    if (!pack) {
      // Prodotti sfusi o a pezzo: si paga la quantità necessaria.
      return { cents: this.costForQty(ingredientId, needed)!, purchasedQty: needed };
    }
    const cents = pack.packSize === q.entry.quantity ? q.entry.priceCents * pack.count : Math.round((q.entry.priceCents * pack.total) / (q.entry.quantity * 1000));
    return { cents, purchasedQty: pack.total };
  }
}

/**
 * Prezzi di riferimento inclusi nell'app. VUOTO di proposito: nessuna fonte con licenza e
 * copertura verificate era accessibile durante lo sviluppo (vedi docs/PRICES.md).
 * Il formato è pronto per un aggiornamento controllato da fonti con licenza compatibile.
 */
export const REFERENCE_PRICES: PriceEntry[] = [];
