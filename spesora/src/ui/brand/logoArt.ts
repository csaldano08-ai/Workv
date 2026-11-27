import { brand } from '../../theme/tokens';

/**
 * Logo MINA disegnato in vettoriale sulle misure del logo approvato (ritaglio del riferimento ingrandito 4×:
 * le coordinate sono quelle dei pixel del ritaglio). La parola è costruita con tratti spessi a estremità tonde,
 * come il carattere arrotondato del riferimento: M a due aste con la V centrale, i con il punto tondo, n ad arco,
 * a a occhiello ovale con l'asta a destra. Il cestino arancione è inclinato di 6° come nell'originale, con bordo
 * e manico verdi, griglia 2×3 e tre trattini verde lime. Nessun ornamento aggiunto (niente arco, foglia o sottolineatura).
 */

/** Riquadro del disegno: x, y, larghezza, altezza. */
export const LOGO_BOX = { x: 58, y: 28, w: 1024, h: 294 } as const;
export const LOGO_RATIO = LOGO_BOX.w / LOGO_BOX.h;

const STEM = 64; // spessore delle aste
const BOWL = 52; // spessore dell'occhiello della a
const ARCH = 54; // spessore dell'arco della n

function word(stroke: string): string {
  const s = `stroke="${stroke}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  return (
    // M: due aste e la V centrale
    `<path d="M97 123 V281 M307 123 V281 M97 123 L202 238 L307 123" stroke-width="${STEM}" ${s}/>` +
    // i: asta e punto
    `<path d="M395 185 V281" stroke-width="${STEM}" ${s}/>` +
    `<circle cx="395" cy="110" r="31" fill="${stroke}"/>` +
    // n: aste e arco
    `<path d="M479 184 V281 M577 232 V281" stroke-width="${STEM}" ${s}/>` +
    `<path d="M479 232 A49 53 0 0 1 577 232" stroke-width="${ARCH}" ${s}/>` +
    // a: occhiello ovale e asta
    `<ellipse cx="708" cy="232" rx="58.5" ry="55.5" stroke-width="${BOWL}" ${s}/>` +
    `<path d="M769 184 V281" stroke-width="${STEM}" ${s}/>`
  );
}

function basket(mono: string | null): string {
  const body = mono ?? brand.basket;
  const shade = mono ?? brand.basketShade;
  const rim = mono ?? brand.basketRim;
  const win = mono ? 'none' : '#FFF6E4';
  // cesto nel suo riferimento locale (origine al centro del bordo), poi ruotato di 6° come nell'originale
  const windows = [
    [-63, 20, 34, 33],
    [-17, 20, 34, 33],
    [29, 20, 34, 33],
    [-55, 66, 30, 32],
    [-15, 66, 30, 32],
    [25, 66, 30, 32],
  ]
    .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${win}"/>`)
    .join('');
  return (
    `<g transform="translate(928.5 176.5) rotate(6)">` +
    // manico
    `<path d="M-41 -4 C-33 -40 -16 -79 0 -79 C16 -79 33 -40 41 -4" stroke="${rim}" stroke-width="19" fill="none" stroke-linecap="round"/>` +
    // corpo a trapezio con angoli morbidi e ombra sul fondo
    `<path d="M-100 4 H100 Q104 4 103 9 L78 118 Q75 130 63 130 H-63 Q-75 130 -78 118 L-103 9 Q-104 4 -100 4 Z" fill="${body}"/>` +
    // ombra leggera sul fondo, come nel riferimento (nessuna fascia netta)
    (mono ? '' : `<path d="M-80 114 H80 L78 118 Q75 130 63 130 H-63 Q-75 130 -78 118 Z" fill="${shade}" opacity="0.55"/>`) +
    windows +
    // bordo verde
    `<rect x="-108" y="-11" width="216" height="22" rx="11" fill="${rim}"/>` +
    `</g>`
  );
}

/** I tre trattini verde lime sopra il cestino. */
function sparkles(mono: string | null): string {
  const spark = mono ?? brand.sparkle;
  return `<path d="M993 44 L983 90 M1063 74 L1013 106 M1071 134 L1030 144" stroke="${spark}" stroke-width="17" fill="none" stroke-linecap="round"/>`;
}

/**
 * SVG del logo. `mono`: un solo colore (per sfondi scuri o la notifica di Android).
 * `viewBox` personalizzabile per ritagli; di norma il riquadro del disegno.
 */
export function minaLogoSvg(opts: { mono?: string; uid?: string } = {}): string {
  const l = minaLogoLayers(opts);
  return wrap(l.defs + l.word + l.basket + l.sparkles);
}

const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_BOX.x} ${LOGO_BOX.y} ${LOGO_BOX.w} ${LOGO_BOX.h}">${inner}</svg>`;

/**
 * Parti del logo (stesso riquadro): servono all'intro per farle entrare una alla volta.
 * `uid` rende unico l'id della sfumatura: sul web un id ripetuto in una schermata nascosta (schede precaricate)
 * fa sparire la sfumatura in tutte le copie.
 */
export function minaLogoLayers(opts: { mono?: string; uid?: string } = {}) {
  const mono = opts.mono ?? null;
  const id = `mina-word${opts.uid ? `-${opts.uid}` : ''}`;
  const defs = mono
    ? ''
    : `<defs><linearGradient id="${id}" x1="0" y1="80" x2="0" y2="316" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${brand.wordTop}"/><stop offset="1" stop-color="${brand.wordBottom}"/></linearGradient></defs>`;
  return { defs, word: word(mono ?? `url(#${id})`), basket: basket(mono), sparkles: sparkles(mono) };
}

/** Le tre parti come SVG separati e sovrapponibili (parola, cestino, trattini). */
export function minaLogoPartsSvg(uid = 'intro'): { word: string; basket: string; sparkles: string } {
  const l = minaLogoLayers({ uid });
  return { word: wrap(l.defs + l.word), basket: wrap(l.basket), sparkles: wrap(l.sparkles) };
}
