/**
 * Mina 2.0 — la borsetta della spesa di Spesora (e la variante Mina Chef).
 * Disegno vettoriale ricalcato sul foglio approvato (docs/restyling/riferimenti/mina2_foglio_approvato.webp):
 * misure, proporzioni, colori e dettagli presi dal foglio (vedi docs/MASCOT.md, «Fedeltà al riferimento»).
 * Diviso in parti separate per l'animazione: ombra, gambe, corpo (verdure, manico, borsa, foglia o grembiule),
 * occhi, bocca, cappello, braccio e avambraccio con mano a dita, oggetti, segni.
 *
 * Funzioni pure che producono SVG (nessuna dipendenza da React Native): le usano il componente animato,
 * la versione statica, i test e l'esportazione delle immagini.
 * Coordinate nel riquadro VIEWBOX (x 0…200, y −12…220); i piedi poggiano a y ≈ 204.
 */

export const VIEW = { x: 0, y: -12, w: 200, h: 232 } as const;
export const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;

/** Colori campionati dal foglio di riferimento. */
export const C = {
  line: '#1D4A32', // contorno verde scuro
  ivory: '#F8EDD6', // fronte della borsa
  ivoryLow: '#F2E2C2', // fronte, parte bassa (sfumatura leggera)
  ivoryShade: '#EEDDBB', // fianco sinistro
  crease: '#B78550', // piega tra fianco e fronte
  green: '#2E7D4E', // manico, braccia, gambe, grembiule
  greenDeep: '#266B42', // fianco del grembiule
  greenLight: '#4E9E6A',
  leaf: '#8DC63F', // foglia sul davanti, foglie della carota
  lettuce: '#8BC152',
  leafDark: '#5A9A36',
  spinach: '#3A8743',
  cheek: '#F6B0A7',
  eye: '#17302A',
  mouth: '#7C2B22',
  tongue: '#F2846A',
  tomato: '#EE5B2B',
  tomatoLight: '#FBB49A',
  radish: '#E14B2C',
  calyx: '#3F9A4E',
  bread: '#F3B13A',
  breadMark: '#FCE2A2',
  carrot: '#F6A01E',
  carrotDark: '#D9800E',
  lemon: '#F6C343',
  white: '#FFFFFF',
  hatShade: '#E4EAEC',
  spoon: '#CE8641',
  spoonLine: '#7A4A22',
  spoonDark: '#A8652F',
  star: '#F6C343',
  heart: '#EE5050',
  question: '#58A845',
  paper: '#FFFFFF',
  paperLine: '#C9D3CB',
  shadow: '#E2EDD4', // ombra a terra verde chiaro, come nel foglio
} as const;

export type Variant = 'classic' | 'chef';
export type Eyes = 'open' | 'happy' | 'closed' | 'wink' | 'laugh' | 'star' | 'heart' | 'surprised';
export type Mouth = 'smile' | 'grin' | 'small' | 'o' | 'hmm';
export type Prop = 'none' | 'spoon' | 'phone' | 'list' | 'clipboard';
export type Emote = 'question' | 'sparkles' | 'hearts' | 'bang';
export type Legs = 'stand' | 'walk';
export type Side = 'L' | 'R';

const LW = 3.2; // contorno del corpo
const sw = (w: number, color: string = C.line) => `stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Avvolge un frammento in un SVG a tutto riquadro (stesse coordinate per tutti i livelli). */
export function svg(inner: string, viewBox = VIEWBOX): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
}

/** Gruppo di cerchi fusi in una forma riccia (lattuga, foglie della carota, cappello): contorno sotto, riempimento sopra. */
function puffs(circles: [number, number, number][], fill: string, stroke = 2.8): string {
  return circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${sw(stroke)}/>`).join('') + circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${(r - stroke / 2 - 0.2).toFixed(2)}" fill="${fill}"/>`).join('');
}

/**
 * Foglia riccia (lattuga, ciuffo della carota): ellisse con il bordo ondulato a «smerli», come nel foglio.
 * (cx, cy) centro, rx/ry semiassi, rot rotazione in gradi, n smerli, depth profondità degli smerli.
 */
function frilly(cx: number, cy: number, rx: number, ry: number, rot: number, n: number, depth: number, fill: string): string {
  const pts: string[] = [];
  const a = (rot * Math.PI) / 180;
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const k = 1 - depth * (0.5 - 0.5 * Math.cos(n * t));
    const x = rx * k * Math.cos(t);
    const y = ry * k * Math.sin(t);
    pts.push(`${(cx + x * Math.cos(a) - y * Math.sin(a)).toFixed(1)},${(cy + x * Math.sin(a) + y * Math.cos(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${sw(2.6)}/>`;
}

// ───────────────────────────── a terra e gambe ─────────────────────────────

export const FEET_Y = 204;
/** Perno di tutto il corpo (tra i piedi): inclinazioni e schiacciamenti. */
export const BODY_PIVOT = { x: 104, y: FEET_Y } as const;

export function shadowPart(): string {
  return `<ellipse cx="104" cy="${FEET_Y + 2}" rx="66" ry="6.5" fill="${C.shadow}"/>`;
}

export function legsPart(legs: Legs = 'stand'): string {
  const leg = (x1: number, x2: number, y2: number, fx: number, dir: number) =>
    `<path d="M${x1},166 L${x2},${y2}" ${sw(15.5)} fill="none"/>` +
    `<path d="M${x1},166 L${x2},${y2}" stroke="${C.green}" stroke-width="10.5" stroke-linecap="round" fill="none"/>` +
    // scarponcino arrotondato che punta verso l'esterno
    `<path d="M${fx - 10 * dir},${FEET_Y - 1} C${fx - 11 * dir},${FEET_Y - 11} ${fx + 7 * dir},${FEET_Y - 12} ${fx + 13 * dir},${FEET_Y - 4} C${fx + 15 * dir},${FEET_Y + 1} ${fx - 9 * dir},${FEET_Y + 4} ${fx - 10 * dir},${FEET_Y - 1} Z" fill="${C.green}" ${sw(2.8)}/>`;
  return legs === 'walk' ? leg(85, 81, 196, 77, -1) + leg(123, 135, 194, 139, 1) : leg(86, 85, 197, 81, -1) + leg(122, 123, 197, 127, 1);
}

// ───────────────────────────── borsa ─────────────────────────────

/** Scatola vista di tre quarti: più larga che alta, angoli arrotondati, fianco sinistro visibile. */
const BOX = 'M43,80 L155,79 Q161,79 161,85 L157.5,160 Q157,172 145,172 L55,173 Q43.5,173 43,161 L37,86 Q37,80 43,80 Z';
const SIDE = 'M43,80 L58,80 L60,173 L55,173 Q43.5,173 43,161 L37,86 Q37,80 43,80 Z';
const HANDLE = 'M71,88 L71,50 A32,32 0 0 1 135,50 L135,88';

function veggiesBack(variant: Variant): string {
  const vein = (d: string, color: string = C.leafDark) => `<path d="${d}" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  if (variant === 'chef') {
    // nel foglio di Mina Chef: lattuga grande a sinistra, frutti gialli e arancio sotto il cappello
    return (
      frilly(30, 82, 17, 15, -18, 10, 0.16, C.lettuce) +
      frilly(22, 98, 11, 9, 10, 8, 0.18, C.lettuce) +
      vein('M47,92 C39,86 31,82 20,80 M33,84 L24,94') +
      frilly(152, 66, 10, 8, 20, 8, 0.2, C.lettuce) +
      `<circle cx="128" cy="74" r="10" fill="${C.lemon}" ${sw(2.6)}/>`
    );
  }
  return (
    // lattuga riccia che esce dall'angolo in alto a sinistra
    frilly(29, 88, 14, 13, -25, 9, 0.17, C.lettuce) +
    frilly(23, 103, 10, 8.5, 15, 8, 0.18, C.lettuce) +
    vein('M43,96 C35,92 28,88 19,86 M31,90 L26,81 M29,99 L23,106') +
    // foglie scure (spinaci) dietro al pane
    `<path d="M62,88 C55,74 57,56 64,46 C68,55 72,67 71,84 Z" fill="${C.spinach}" ${sw(2.4)}/>` +
    `<path d="M69,88 C67,72 71,59 78,52 C78,65 76,77 75,88 Z" fill="${C.spinach}" ${sw(2.4)}/>` +
    // ciuffo della carota: foglie ricce verde chiaro
    frilly(151, 45, 11, 17, -20, 8, 0.15, C.leaf) +
    frilly(167, 44, 11, 16, 30, 8, 0.15, C.leaf) +
    frilly(160, 59, 10, 10, 0, 8, 0.15, C.leaf) +
    vein('M150,72 L156,32 M154,64 L170,32 M152,62 L161,52') +
    `<path d="M137,90 C135,75 140,63 148,59 C155,56 161,61 160,68 C158,79 152,87 150,91 Z" fill="${C.carrot}" ${sw(2.6)}/>` +
    `<path d="M143,70 L150,71 M141,79 L148,80" stroke="${C.carrotDark}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="69" cy="79" r="6" fill="${C.radish}" ${sw(2.2)}/>`
  );
}

function handlePart(): string {
  return `<path d="${HANDLE}" stroke="${C.line}" stroke-width="13.5" fill="none" stroke-linecap="round"/>` + `<path d="${HANDLE}" stroke="${C.green}" stroke-width="8.4" fill="none" stroke-linecap="round"/>`;
}

function veggiesFront(variant: Variant): string {
  const calyx = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? 11 : 4.2;
    return `${(101 + r * Math.cos(a)).toFixed(1)},${(58 + r * Math.sin(a) * 0.6).toFixed(1)}`;
  }).join(' ');
  const tomato =
    `<ellipse cx="103" cy="76" rx="24" ry="19" fill="${C.tomato}" ${sw(2.8)}/>` +
    `<ellipse cx="115" cy="66" rx="5.2" ry="2.8" fill="${C.tomatoLight}" transform="rotate(-25 115 66)"/>` +
    `<path d="M101,58 L102,49" ${sw(2.6)}/>` +
    `<polygon points="${calyx}" fill="${C.calyx}" ${sw(2)}/>`;
  if (variant === 'chef') return `<ellipse cx="103" cy="78" rx="22" ry="16" fill="${C.carrot}" ${sw(2.8)}/>` + `<ellipse cx="112" cy="70" rx="5" ry="2.6" fill="${C.lemon}" transform="rotate(-20 112 70)"/>`;
  const bread =
    `<g transform="rotate(-30 52 64)">` +
    `<rect x="40" y="30" width="24" height="70" rx="12" fill="${C.bread}" ${sw(2.8)}/>` +
    `<path d="M45,46 Q52,42 59,44 M45,61 Q52,57 59,59 M45,76 Q52,72 59,74" stroke="${C.breadMark}" stroke-width="2.8" fill="none" stroke-linecap="round"/>` +
    `</g>`;
  return tomato + bread;
}

function panelPart(variant: Variant): string {
  const panel =
    `<defs><linearGradient id="mina2-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ivory}"/><stop offset="1" stop-color="${C.ivoryLow}"/></linearGradient></defs>` +
    `<path d="${BOX}" fill="url(#mina2-front)"/>` +
    `<path d="${SIDE}" fill="${C.ivoryShade}"/>` +
    `<path d="M58,85 C58.5,110 59,140 60.5,166" stroke="${C.crease}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  // foglia del foglio: verde chiaro, senza contorno, una sola venatura bianca curva che esce come picciolo
  const leaf =
    variant === 'classic'
      ? `<g transform="translate(112 151) scale(1.12)">` +
        `<path d="M-12,10 C-15,-4 -2,-13 14,-11 C13,4 2,13 -12,10 Z" fill="${C.leaf}"/>` +
        `<path d="M-17,15 Q-4,4 9,-7" stroke="${C.white}" stroke-width="2.3" fill="none" stroke-linecap="round"/>` +
        `</g>`
      : '';
  return panel + leaf;
}

function apronPart(): string {
  return (
    `<path d="M40.4,128.5 L159.1,126 L157.5,160 Q157,172 145,172 L55,173 Q43.5,173 43,161 Z" fill="${C.green}"/>` +
    `<path d="M40.4,128.5 L59.2,128.1 L60,173 L55,173 Q43.5,173 43,161 Z" fill="${C.greenDeep}"/>` +
    `<path d="M59.2,129 L60.2,168" stroke="${C.line}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `<path d="M40.4,128.5 L159.1,126" ${sw(2.8)} fill="none"/>` +
    // foglia bianca con venatura verde
    `<g transform="translate(114 151) scale(1.02)">` +
    `<path d="M-12,10 C-15,-4 -2,-13 14,-11 C13,4 2,13 -12,10 Z" fill="${C.white}"/>` +
    `<path d="M-17,15 Q-4,4 9,-7" stroke="${C.green}" stroke-width="2.3" fill="none" stroke-linecap="round"/>` +
    `</g>` +
    // fiocco sul fianco sinistro
    `<path d="M37,131 C24,121 16,128 22,136 C26,141 34,137 37,131 Z" fill="${C.green}" ${sw(2.6)}/>` +
    `<path d="M37,131 C25,140 21,149 28,151 C34,150 36,140 37,131 Z" fill="${C.green}" ${sw(2.6)}/>` +
    `<path d="M38,133 L34,154 M39,133 L44,153" ${sw(5)} fill="none"/>` +
    `<path d="M38,133 L34,154 M39,133 L44,153" stroke="${C.green}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    `<circle cx="38" cy="132" r="4.4" fill="${C.green}" ${sw(2.4)}/>`
  );
}

export const CHEEK_L = { x: 77, y: 124 } as const;
export const CHEEK_R = { x: 143, y: 123 } as const;

/** Corpo completo: verdure dietro, manico, verdure davanti, borsa (fianco, piega, foglia o grembiule), guance, contorno. */
export function bodyPart(variant: Variant): string {
  return (
    veggiesBack(variant) +
    handlePart() +
    veggiesFront(variant) +
    panelPart(variant) +
    (variant === 'chef' ? apronPart() : '') +
    `<ellipse cx="${CHEEK_L.x}" cy="${CHEEK_L.y}" rx="8.6" ry="5.4" fill="${C.cheek}" opacity="0.9"/>` +
    `<ellipse cx="${CHEEK_R.x}" cy="${CHEEK_R.y}" rx="8.6" ry="5.4" fill="${C.cheek}" opacity="0.9"/>` +
    `<path d="${BOX}" fill="none" ${sw(LW)}/>`
  );
}

/** Perno del cappello (base della fascia): oscilla quando Mina salta. */
export const HAT_PIVOT = { x: 101, y: 70 } as const;

/** Cappello da chef grande e morbido (quasi largo quanto la borsa), poggiato sopra il manico. */
export function hatPart(): string {
  return (
    `<g transform="rotate(-5 101 70)">` +
    puffs(
      [
        [69, 36, 15],
        [80, 17, 17],
        [101, 8, 19.5],
        [122, 15, 17.5],
        [134, 34, 14],
        [101, 30, 18],
      ],
      C.white,
      3,
    ) +
    `<path d="M82,32 Q83,22 90,15 M115,30 Q118,21 125,17" stroke="${C.hatShade}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M64,48 L138,48 L133,70 L69,70 Z" fill="${C.white}" ${sw(3)}/>` +
    `<path d="M66.5,59 L135.5,59 L133,70 L69,70 Z" fill="${C.hatShade}"/>` +
    `<path d="M64,48 L138,48 L133,70 L69,70 Z" fill="none" ${sw(3)}/>` +
    `</g>`
  );
}

// ───────────────────────────── volto ─────────────────────────────

/** Il viso sta al centro del fronte (a destra della piega), come nel foglio. */
export const EYE_L = { x: 90, y: 108 } as const;
export const EYE_R = { x: 130, y: 107 } as const;
export const MOUTH = { x: 110, y: 125 } as const;
/** Centro degli occhi (perno del battito di ciglia). */
export const EYES_CENTER = { x: 110, y: 107.5 } as const;

function eye(kind: Eyes, x: number, y: number, side: Side): string {
  const s = `stroke="${C.eye}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  switch (kind) {
    case 'open':
      // ovali scuri senza riflessi, come nel foglio
      return `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="8" fill="${C.eye}"/>`;
    case 'surprised':
      return `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="6.4" fill="${C.eye}"/>`;
    case 'happy':
      return `<path d="M${x - 6.5},${y + 3} Q${x},${y - 7} ${x + 6.5},${y + 3}" ${s}/>`;
    case 'closed':
      return `<path d="M${x - 6.5},${y - 1} Q${x},${y + 5.5} ${x + 6.5},${y - 1}" ${s}/>`;
    case 'wink':
      return side === 'L' ? eye('open', x, y, side) : `<path d="M${x + 6},${y - 6} L${x - 4.5},${y} L${x + 6},${y + 6}" ${s}/>`;
    case 'laugh':
      return side === 'L' ? `<path d="M${x - 6},${y - 6} L${x + 4.5},${y} L${x - 6},${y + 6}" ${s}/>` : `<path d="M${x + 6},${y - 6} L${x - 4.5},${y} L${x + 6},${y + 6}" ${s}/>`;
    case 'star': {
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const r = i % 2 === 0 ? 10 : 3.4;
        return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="${C.star}" ${sw(2.2)}/>`;
    }
    case 'heart':
      return `<path d="M${x},${y + 8} C${x - 11},${y} ${x - 10},${y - 9} ${x - 4},${y - 8.5} C${x - 1},${y - 8.5} ${x},${y - 6} ${x},${y - 5} C${x},${y - 6} ${x + 1},${y - 8.5} ${x + 4},${y - 8.5} C${x + 10},${y - 9} ${x + 11},${y} ${x},${y + 8} Z" fill="${C.heart}"/>`;
  }
}

export function eyesPart(kind: Eyes): string {
  return eye(kind, EYE_L.x, EYE_L.y, 'L') + eye(kind, EYE_R.x, EYE_R.y, 'R');
}

export function mouthPart(kind: Mouth): string {
  const { x, y } = MOUTH;
  switch (kind) {
    case 'smile':
      return (
        `<path d="M${x - 14},${y - 6} Q${x},${y - 4} ${x + 14},${y - 6} Q${x + 13},${y + 10} ${x},${y + 10.5} Q${x - 13},${y + 10} ${x - 14},${y - 6} Z" fill="${C.mouth}" ${sw(2.4)}/>` +
        `<path d="M${x - 9},${y + 5.5} Q${x},${y - 1.5} ${x + 9},${y + 5.5} Q${x + 5},${y + 9.5} ${x},${y + 9.5} Q${x - 5},${y + 9.5} ${x - 9},${y + 5.5} Z" fill="${C.tongue}"/>`
      );
    case 'grin':
      return (
        `<path d="M${x - 16},${y - 7} Q${x},${y - 4} ${x + 16},${y - 7} Q${x + 15},${y + 13} ${x},${y + 13.5} Q${x - 15},${y + 13} ${x - 16},${y - 7} Z" fill="${C.mouth}" ${sw(2.4)}/>` +
        `<path d="M${x - 10.5},${y + 7.5} Q${x},${y - 1} ${x + 10.5},${y + 7.5} Q${x + 6},${y + 12.5} ${x},${y + 12.5} Q${x - 6},${y + 12.5} ${x - 10.5},${y + 7.5} Z" fill="${C.tongue}"/>`
      );
    case 'small':
      return `<path d="M${x - 7},${y - 2} Q${x},${y + 5} ${x + 7},${y - 2}" stroke="${C.eye}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'o':
      return `<ellipse cx="${x}" cy="${y + 1}" rx="4" ry="5.4" fill="${C.mouth}" ${sw(2.2)}/>`;
    case 'hmm':
      return `<ellipse cx="${x + 1}" cy="${y + 1}" rx="2.8" ry="3.4" fill="${C.eye}"/>`;
  }
}

// ───────────────────────────── braccia e mani ─────────────────────────────

/** Spalle sui bordi della borsa e lunghezze dei segmenti (braccia corte come nel foglio). */
export const SHOULDER: Record<Side, { x: number; y: number }> = { L: { x: 40, y: 120 }, R: { x: 159.5, y: 116 } };
export const UPPER = 16;
export const FORE = 17;

export function elbowRest(side: Side) {
  const s = SHOULDER[side];
  return { x: s.x, y: s.y + UPPER };
}
export function handRest(side: Side) {
  const s = SHOULDER[side];
  return { x: s.x, y: s.y + UPPER + FORE };
}

const ARM_OUT = 14;
const ARM_IN = 9.4;

/** Segmento superiore (spalla → gomito). `pass` = contorno o riempimento: i due passaggi non lasciano giunture. */
export function upperArmPart(side: Side, pass: 'outline' | 'fill'): string {
  const s = SHOULDER[side];
  const e = elbowRest(side);
  return `<path d="M${s.x},${s.y} L${e.x},${e.y}" stroke="${pass === 'outline' ? C.line : C.green}" stroke-width="${pass === 'outline' ? ARM_OUT : ARM_IN}" stroke-linecap="round" fill="none"/>`;
}

/**
 * Mano a guanto con tre dita e pollice (aperta) o a pugno (quando tiene un oggetto), nel verso del braccio a riposo
 * (le dita continuano oltre il polso). Contorno e riempimento in due passaggi, come il braccio.
 */
function handShape(side: Side, pass: 'outline' | 'fill', fist: boolean): string {
  const h = handRest(side);
  const t = side === 'L' ? 1 : -1; // il pollice punta verso il corpo
  const color = pass === 'outline' ? C.line : C.green;
  const grow = pass === 'outline' ? 2.4 : 0;
  const palm = `<circle cx="${h.x}" cy="${h.y + 3}" r="${(fist ? 8 : 7.2) + grow}" fill="${color}"/>`;
  const capsule = (x1: number, y1: number, x2: number, y2: number, w: number) => `<path d="M${x1},${y1} L${x2},${y2}" stroke="${color}" stroke-width="${w + grow * 2}" stroke-linecap="round"/>`;
  if (fist) {
    const knuckles = pass === 'fill' ? `<path d="M${h.x - 3},${h.y + 5} L${h.x - 3},${h.y + 8} M${h.x + 1},${h.y + 5.5} L${h.x + 1},${h.y + 8.5}" stroke="${C.line}" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>` : '';
    return palm + capsule(h.x, h.y + 3, h.x + t * 8, h.y - 0.5, 5.4) + knuckles;
  }
  return (
    palm +
    capsule(h.x - 3.8, h.y + 6, h.x - 5.6, h.y + 13, 5) +
    capsule(h.x, h.y + 7, h.x, h.y + 15, 5) +
    capsule(h.x + 3.8, h.y + 6, h.x + 5.6, h.y + 13, 5) +
    capsule(h.x, h.y + 3, h.x + t * 9, h.y + 0.5, 5.2)
  );
}

/** Avambraccio con la mano ed eventuale oggetto tenuto in mano. */
export function foreArmPart(side: Side, pass: 'outline' | 'fill', prop: Prop = 'none', propRotate = 0): string {
  const e = elbowRest(side);
  const h = handRest(side);
  const fist = prop !== 'none';
  const arm = `<path d="M${e.x},${e.y} L${h.x},${h.y}" stroke="${pass === 'outline' ? C.line : C.green}" stroke-width="${pass === 'outline' ? ARM_OUT : ARM_IN}" stroke-linecap="round" fill="none"/>`;
  if (pass === 'outline') return arm + handShape(side, 'outline', fist);
  const held = fist ? propPart(prop, h.x, h.y + 3, propRotate) : '';
  return arm + held + handShape(side, 'outline', fist) + handShape(side, 'fill', fist);
}

/** Oggetti tenuti in mano, disegnati attorno al centro della mano (hx, hy), ruotati di `rot` gradi. */
export function propPart(prop: Prop, hx: number, hy: number, rot: number): string {
  const g = (inner: string) => `<g transform="rotate(${rot.toFixed(1)} ${hx} ${hy})">${inner}</g>`;
  switch (prop) {
    case 'spoon':
      // grande cucchiaio di legno con bordo marrone: il manico passa nel pugno, la paletta sta in alto
      return g(
        `<path d="M${hx},${hy + 26} L${hx},${hy - 30}" stroke="${C.spoonLine}" stroke-width="9" stroke-linecap="round"/>` +
          `<path d="M${hx},${hy + 26} L${hx},${hy - 30}" stroke="${C.spoon}" stroke-width="5" stroke-linecap="round"/>` +
          `<ellipse cx="${hx}" cy="${hy - 48}" rx="14" ry="19" fill="${C.spoon}" ${sw(2.8, C.spoonLine)}/>` +
          `<path d="M${hx - 7},${hy - 58} Q${hx - 9},${hy - 42} ${hx + 1},${hy - 34}" stroke="${C.spoonDark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      );
    case 'phone':
      return g(
        `<rect x="${hx - 12}" y="${hy - 38}" width="24" height="42" rx="5" fill="${C.green}" ${sw(2.6)}/>` +
          `<rect x="${hx - 8.5}" y="${hy - 33.5}" width="17" height="31" rx="3" fill="${C.greenLight}"/>` +
          `<path d="M${hx - 5},${hy - 11} C${hx - 7},${hy - 20} ${hx},${hy - 26} ${hx + 6},${hy - 26} C${hx + 6},${hy - 18} ${hx + 2},${hy - 12} ${hx - 5},${hy - 11} Z M${hx - 6},${hy - 9} L${hx + 3},${hy - 21}" fill="${C.white}" stroke="${C.white}" stroke-width="1.2" stroke-linecap="round"/>`,
      );
    case 'list':
    case 'clipboard': {
      const board = prop === 'clipboard';
      const tick = (yy: number) =>
        `<path d="M${hx - 9},${yy} l3,3 l5,-6" stroke="${C.green}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hx + 1},${yy} L${hx + 10},${yy}" stroke="${C.paperLine}" stroke-width="2.6" stroke-linecap="round"/>`;
      return g(
        `<rect x="${hx - 15}" y="${hy - 44}" width="30" height="44" rx="${board ? 4 : 3}" fill="${board ? C.green : C.paper}" ${sw(2.6)}/>` +
          (board ? `<rect x="${hx - 11}" y="${hy - 39}" width="22" height="34" rx="2" fill="${C.paper}"/><rect x="${hx - 6}" y="${hy - 48}" width="12" height="7" rx="2" fill="${C.green}" ${sw(2.2)}/>` : '') +
          tick(hy - 32) +
          tick(hy - 23) +
          tick(hy - 14),
      );
    }
    default:
      return '';
  }
}

// ───────────────────────────── segni (emote) ─────────────────────────────

/** Perno dei segni (si accendono con una piccola scala). */
export const EMOTE_PIVOT = { x: 172, y: 40 } as const;

export function emotePart(kind: Emote): string {
  switch (kind) {
    case 'question':
      return `<path d="M163,26 C163,15 182,14 182,25 C182,32 173,32 173,40" stroke="${C.question}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="173" cy="49" r="3.4" fill="${C.question}"/>`;
    case 'sparkles':
      return (
        `<path d="M172,40 L177,31 M180,50 L190,47 M175,60 L183,64" stroke="${C.star}" stroke-width="4" stroke-linecap="round"/>` +
        `<path d="M30,40 L25,32 M22,50 L13,48 M27,59 L20,64" stroke="${C.star}" stroke-width="4" stroke-linecap="round"/>`
      );
    case 'hearts':
      return `<path d="M176,48 C164,40 166,29 173,29 C177,29 178,32 178,33 C178,32 179,29 183,29 C190,29 192,40 180,48 L178,56 Z" fill="${C.heart}"/>`;
    case 'bang':
      return `<path d="M176,74 L181,65 M184,84 L194,82 M178,95 L186,99" stroke="${C.star}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

// ───────────────────────────── pose delle braccia ─────────────────────────────

export interface ArmPose {
  /** Apertura del braccio dalla spalla, in gradi: 0 lungo il fianco, 90 orizzontale verso l'esterno, 160 alzato. */
  out: number;
  /** Piega del gomito verso il corpo, in gradi (negativa = verso l'esterno). */
  bend: number;
  prop?: Prop;
  /** Inclinazione dell'oggetto rispetto alla verticale (gradi, orario). */
  propTilt?: number;
}

/** Rotazioni SVG/RN (positivo = orario) di braccio e avambraccio per un lato. */
export function armRotations(side: Side, pose: Pick<ArmPose, 'out' | 'bend'>): { upper: number; fore: number } {
  return side === 'L' ? { upper: pose.out, fore: -pose.bend } : { upper: -pose.out, fore: pose.bend };
}

/** Rotazione locale dell'oggetto perché a fine posa sia dritto (± inclinazione), qualunque sia il braccio. */
export function propLocalRotation(side: Side, pose: ArmPose): number {
  const r = armRotations(side, pose);
  return (pose.propTilt ?? 0) - (r.upper + r.fore);
}

/**
 * Cinematica inversa a due segmenti: la posa che porta la mano in (x, y) con il gomito verso l'esterno.
 * Le pose si descrivono così con la posizione della mano (più leggibile e sempre raggiungibile).
 */
export function armTo(side: Side, x: number, y: number, extra: Partial<ArmPose> = {}): ArmPose {
  const s = SHOULDER[side];
  const a = UPPER;
  const b = FORE;
  let dx = x - s.x;
  let dy = y - (s.y + 3);
  let d = Math.hypot(dx, dy);
  const max = a + b - 0.5;
  const min = Math.abs(a - b) + 0.5;
  if (d > max || d < min) {
    const k = (d > max ? max : min) / (d || 1);
    dx *= k;
    dy *= k;
    d = Math.hypot(dx, dy);
  }
  const deg = (r: number) => (r * 180) / Math.PI;
  const phi = deg(Math.atan2(-dx, dy)); // rotazione oraria del vettore "giù" verso il bersaglio
  const alpha = deg(Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)))));
  const upper = side === 'L' ? phi + alpha : phi - alpha;
  const ex = s.x - a * Math.sin((upper * Math.PI) / 180);
  const ey = s.y + a * Math.cos((upper * Math.PI) / 180);
  const fore = deg(Math.atan2(-(s.x + dx - ex), s.y + dy - ey)) - upper;
  const norm = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
  const pose = side === 'L' ? { out: norm(upper), bend: norm(-fore) } : { out: norm(-upper), bend: norm(fore) };
  return { ...pose, ...extra };
}

export function armStatic(side: Side, pose: ArmPose, pass: 'outline' | 'fill'): string {
  const s = SHOULDER[side];
  const e = elbowRest(side);
  const r = armRotations(side, pose);
  return (
    `<g transform="rotate(${r.upper.toFixed(1)} ${s.x} ${s.y})">` +
    upperArmPart(side, pass) +
    `<g transform="rotate(${r.fore.toFixed(1)} ${e.x} ${e.y})">${foreArmPart(side, pass, pose.prop ?? 'none', propLocalRotation(side, pose))}</g>` +
    `</g>`
  );
}

export interface MinaLook {
  variant: Variant;
  eyes: Eyes;
  mouth: Mouth;
  armL: ArmPose;
  armR: ArmPose;
  emote?: Emote;
  /** Gambe ferme o a passo (come nel disegno principale del foglio). */
  legs?: Legs;
  /** Inclinazione di tutto il corpo attorno ai piedi, in gradi (nel foglio Mina è leggermente inclinata). */
  lean?: number;
}

/** Mina intera in un solo SVG (versione statica: righe piccole, "Riduci movimento", esportazioni). */
export function minaStaticSvg(look: MinaLook, opts: { shadow?: boolean; viewBox?: string } = {}): string {
  const lean = look.lean ?? 0;
  return svg(
    (opts.shadow === false ? '' : shadowPart()) +
      `<g transform="rotate(${lean} ${BODY_PIVOT.x} ${BODY_PIVOT.y})">` +
      legsPart(look.legs) +
      bodyPart(look.variant) +
      (look.variant === 'chef' ? hatPart() : '') +
      eyesPart(look.eyes) +
      mouthPart(look.mouth) +
      armStatic('L', look.armL, 'outline') +
      armStatic('R', look.armR, 'outline') +
      armStatic('L', look.armL, 'fill') +
      armStatic('R', look.armR, 'fill') +
      (look.emote ? emotePart(look.emote) : '') +
      `</g>`,
    opts.viewBox,
  );
}
