import type { IsoDate, Weekday } from './types';

/**
 * Utilità per date di calendario come stringhe `YYYY-MM-DD`.
 * L'aritmetica avviene in UTC per essere immune all'ora legale; la conversione
 * in istanti reali (per le notifiche) usa il fuso locale del dispositivo.
 */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function parts(date: IsoDate): [number, number, number] {
  const m = ISO_RE.exec(date);
  if (!m) throw new Error(`Data non valida: ${date}`);
  return [+m[1], +m[2], +m[3]];
}

function fromUtc(d: Date): IsoDate {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = parts(date);
  return fromUtc(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Differenza in giorni di calendario (b - a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** 0 = lunedì … 6 = domenica. */
export function weekdayOf(date: IsoDate): Weekday {
  const [y, m, d] = parts(date);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domenica
  return ((js + 6) % 7) as Weekday;
}

export function rangeDays(start: IsoDate, count: number): IsoDate[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** Data locale del dispositivo per un istante. */
export function toIsoLocal(instant: Date): IsoDate {
  const y = instant.getFullYear();
  const m = String(instant.getMonth() + 1).padStart(2, '0');
  const d = String(instant.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Istante locale corrispondente a data + minuti dalla mezzanotte.
 * `new Date(y, m, d, h, min)` applica correttamente l'ora legale del fuso del dispositivo.
 * Se l'orario non esiste (salto in avanti dell'ora legale) JavaScript lo sposta in avanti di un'ora.
 */
export function localInstant(date: IsoDate, minutes: number): Date {
  const [y, m, d] = parts(date);
  const day = Math.floor(minutes / 1440);
  const rest = minutes - day * 1440;
  return new Date(y, m - 1, d + day, Math.floor(rest / 60), rest % 60, 0, 0);
}

export function minutesToHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const WEEKDAY_SHORT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export function weekdayName(w: Weekday): string {
  return WEEKDAY_NAMES[w];
}
export function weekdayShort(w: Weekday): string {
  return WEEKDAY_SHORT[w];
}

/** "martedì 3 novembre" */
export function formatLongDate(date: IsoDate): string {
  const [, m, d] = parts(date);
  return `${WEEKDAY_NAMES[weekdayOf(date)]} ${d} ${MONTHS[m - 1]}`;
}

/** "3 nov" */
export function formatShortDate(date: IsoDate): string {
  const [, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}
