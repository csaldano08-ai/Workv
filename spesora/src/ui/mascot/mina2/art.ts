/**
 * Mina 2.0 — la borsetta della spesa di Spesora (e la variante Mina Chef).
 * Disegno vettoriale fedele al foglio approvato (docs/restyling/riferimenti/mina2_foglio_approvato.webp),
 * diviso in parti separate per l'animazione: ombra, gambe, corpo (borsa, manico, verdure, foglia),
 * volto (occhi e bocca separati), cappello e grembiule dello chef, braccia in due segmenti con gomito.
 *
 * Funzioni pure che producono SVG (nessuna dipendenza da React Native): le usano il componente animato,
 * la versione statica, i test e l'esportazione delle immagini.
 * Coordinate nel riquadro VIEWBOX (x 0…200, y −12…220); i piedi poggiano a y ≈ 202.
 */

export const VIEW = { x: 0, y: -12, w: 200, h: 232 } as const;
export const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;

export const C = {
  line: '#1E4A34', // contorno (verde scuro, come nel foglio)
  ivory: '#F8EDD5',
  ivoryShade: '#EEDCB8',
  crease: '#C99E66',
  green: '#2F7D50',
  greenLight: '#5AA574',
  leaf: '#8DC63F',
  leafDark: '#5E9E3A',
  lettuce: '#86C255',
  cheek: '#F5A3A0',
  eye: '#1C2A22',
  mouth: '#7E2B26',
  tongue: '#EE7768',
  tomato: '#E9573F',
  tomatoLight: '#F7957D',
  calyx: '#3F9A4E',
  bread: '#E9A43B',
  breadDark: '#C27F22',
  carrot: '#F28C28',
  carrotDark: '#D46E12',
  white: '#FFFFFF',
  hatShade: '#E1E9EC',
  spoon: '#C98A4B',
  spoonDark: '#9A6230',
  star: '#F6C343',
  heart: '#E84A5F',
  paper: '#FFFFFF',
  shadow: 'rgba(30,74,52,0.13)',
} as const;

export type Variant = 'classic' | 'chef';
export type Eyes = 'open' | 'happy' | 'closed' | 'wink' | 'laugh' | 'star' | 'heart' | 'surprised';
export type Mouth = 'smile' | 'grin' | 'small' | 'o' | 'hmm';
export type Prop = 'none' | 'spoon' | 'phone' | 'list' | 'clipboard';
export type Emote = 'question' | 'sparkles' | 'hearts' | 'bang';
export type Side = 'L' | 'R';

const sw = (w: number) => `stroke="${C.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Avvolge un frammento in un SVG a tutto riquadro (stesse coordinate per tutti i livelli). */
export function svg(inner: string, viewBox = VIEWBOX): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
}

// ───────────────────────────── corpo ─────────────────────────────

export const FEET_Y = 202;

export function shadowPart(): string {
  return `<ellipse cx="100" cy="${FEET_Y + 3}" rx="54" ry="7.5" fill="${C.shadow}"/>`;
}

export function legsPart(): string {
  const leg = (x1: number, x2: number, fx: number, dir: number) =>
    `<path d="M${x1},178 L${x2},197" ${sw(16)} fill="none"/>` +
    `<path d="M${x1},178 L${x2},197" stroke="${C.green}" stroke-width="9.5" stroke-linecap="round" fill="none"/>` +
    `<path d="M${fx - 12 * dir},${FEET_Y} C${fx - 12 * dir},${FEET_Y - 9} ${fx + 13 * dir},${FEET_Y - 9} ${fx + 14 * dir},${FEET_Y - 1} C${fx + 14 * dir},${FEET_Y + 4} ${fx - 12 * dir},${FEET_Y + 5} ${fx - 12 * dir},${FEET_Y} Z" fill="${C.green}" ${sw(3)}/>`;
  return leg(83, 80, 77, -1) + leg(118, 121, 124, 1);
}

const HANDLE = 'M69,86 C61,42 78,10 101,10 C124,10 141,42 133,84';

function veggiesBack(): string {
  return (
    `<path d="M60,84 C40,78 34,58 43,48 C48,41 57,43 59,50 C63,42 73,45 71,57 C74,64 70,74 66,84 Z" fill="${C.lettuce}" ${sw(3)}/>` +
    `<path d="M62,82 C57,70 53,60 49,52" stroke="${C.leafDark}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<path d="M140,84 C155,78 166,64 161,53 C158,46 148,49 146,56 C142,50 134,56 136,66 Z" fill="${C.lettuce}" ${sw(3)}/>`
  );
}

function handlePart(): string {
  return (
    `<path d="${HANDLE}" stroke="${C.line}" stroke-width="19" fill="none" stroke-linecap="round"/>` +
    `<path d="${HANDLE}" stroke="${C.green}" stroke-width="12" fill="none" stroke-linecap="round"/>` +
    `<path d="M85,22 C90,16 97,14 105,14" stroke="${C.greenLight}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
  );
}

function veggiesFront(): string {
  const bread =
    `<g transform="rotate(-24 64 54)">` +
    `<rect x="52" y="18" width="24" height="74" rx="12" fill="${C.bread}" ${sw(3.5)}/>` +
    `<path d="M57,33 L71,29 M57,48 L71,44 M57,63 L71,59" stroke="${C.breadDark}" stroke-width="2.8" stroke-linecap="round"/>` +
    `</g>`;
  const tomato =
    `<circle cx="101" cy="62" r="19" fill="${C.tomato}" ${sw(3.5)}/>` +
    `<ellipse cx="93" cy="56" rx="5.5" ry="3.8" fill="${C.tomatoLight}"/>` +
    `<path d="M88,46 Q95,40 101,45 Q107,39 114,46 Q107,49 101,47 Q95,50 88,46 Z" fill="${C.calyx}" ${sw(2.5)}/>` +
    `<path d="M101,45 L103,36" ${sw(3)}/>`;
  const carrot =
    `<path d="M146,42 C141,30 143,19 149,14 C152,24 152,33 150,42 Z" fill="${C.leaf}" ${sw(2.5)}/>` +
    `<path d="M150,43 C154,31 162,25 169,25 C165,33 158,41 152,45 Z" fill="${C.leaf}" ${sw(2.5)}/>` +
    `<path d="M147,43 C137,37 131,29 131,22 C140,24 146,32 150,40 Z" fill="${C.leaf}" ${sw(2.5)}/>` +
    `<path d="M129,84 C129,64 135,50 144,42 C150,39 154,43 153,49 C151,61 146,74 144,84 Z" fill="${C.carrot}" ${sw(3.5)}/>` +
    `<path d="M137,60 L145,62 M133,71 L143,73" stroke="${C.carrotDark}" stroke-width="2.3" stroke-linecap="round"/>`;
  return bread + tomato + carrot;
}

/** Pannello frontale: forma compatta e arrotondata, più larga che alta, con la piega laterale. */
const PANEL = 'M56,82 L145,78 Q157,78 156,90 L151,170 Q150,185 135,185 L68,187 Q53,187 52,173 L45,94 Q44,82 56,82 Z';

function panelPart(variant: Variant): string {
  const panel =
    `<path d="${PANEL}" fill="${C.ivory}" ${sw(4.6)}/>` +
    `<path d="M144,85 L139,178 Q148,178 149,168 L153,92 Q152,84 144,85 Z" fill="${C.ivoryShade}"/>` +
    `<path d="M60,92 C59,118 60,148 63,178" stroke="${C.crease}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` +
    `<path d="${PANEL}" fill="none" ${sw(4.6)}/>`;
  const leaf =
    variant === 'classic'
      ? `<g transform="translate(116 164) rotate(-40) scale(0.92)">` +
        `<path d="M0,-17 C12,-11 13,5 0,17 C-13,5 -12,-11 0,-17 Z" fill="${C.leaf}" ${sw(2.8)}/>` +
        `<path d="M0,13 L0,-11 M0,3 L6,-3 M0,8 L-6,2" stroke="${C.white}" stroke-width="2.3" stroke-linecap="round" fill="none"/>` +
        `</g>`
      : '';
  return panel + leaf;
}

function apronPart(): string {
  return (
    `<path d="M48,154 C35,144 27,151 33,159 C37,164 45,160 48,154 Z" fill="${C.green}" ${sw(3)}/>` +
    `<path d="M48,154 C36,164 32,173 40,174 C46,173 48,163 48,154 Z" fill="${C.green}" ${sw(3)}/>` +
    `<path d="M48,150 Q100,141 155,146 L151,170 Q150,185 135,185 L68,187 Q53,187 52,173 Z" fill="${C.green}" ${sw(4.2)}/>` +
    `<circle cx="49" cy="154" r="4.8" fill="${C.green}" ${sw(2.6)}/>` +
    `<g transform="translate(116 168) rotate(-40) scale(0.88)">` +
    `<path d="M0,-17 C12,-11 13,5 0,17 C-13,5 -12,-11 0,-17 Z" fill="${C.white}"/>` +
    `<path d="M0,13 L0,-11 M0,3 L6,-3 M0,8 L-6,2" stroke="${C.green}" stroke-width="2.3" stroke-linecap="round" fill="none"/>` +
    `</g>`
  );
}

export const CHEEK_L = { x: 66, y: 133 } as const;
export const CHEEK_R = { x: 136, y: 131 } as const;

/** Corpo completo: lattuga, manico, verdure, pannello, foglia (o grembiule), guance. */
export function bodyPart(variant: Variant): string {
  return (
    veggiesBack() +
    handlePart() +
    veggiesFront() +
    panelPart(variant) +
    (variant === 'chef' ? apronPart() : '') +
    `<ellipse cx="${CHEEK_L.x}" cy="${CHEEK_L.y}" rx="10" ry="6" fill="${C.cheek}" opacity="0.85"/>` +
    `<ellipse cx="${CHEEK_R.x}" cy="${CHEEK_R.y}" rx="10" ry="6" fill="${C.cheek}" opacity="0.85"/>`
  );
}

/** Perno del cappello (base): oscilla quando Mina salta. */
export const HAT_PIVOT = { x: 101, y: 48 } as const;

/** Cappello da chef, grande e morbido come nel foglio; poggia sopra il manico. */
export function hatPart(): string {
  const puffs = [
    [76, 26, 17],
    [126, 26, 17],
    [101, 12, 22],
  ];
  return (
    puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.white}" ${sw(3.6)}/>`).join('') +
    puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 1.9}" fill="${C.white}"/>`).join('') +
    `<rect x="66" y="20" width="70" height="16" fill="${C.white}"/>` +
    `<path d="M88,26 Q89,15 95,8 M113,27 Q115,18 120,14" stroke="${C.hatShade}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` +
    `<rect x="64" y="32" width="74" height="18" rx="6" fill="${C.white}" ${sw(3.6)}/>` +
    `<path d="M70,44 L132,44" stroke="${C.hatShade}" stroke-width="3" stroke-linecap="round"/>`
  );
}

// ───────────────────────────── volto ─────────────────────────────

export const EYE_L = { x: 81, y: 115 } as const;
export const EYE_R = { x: 121, y: 113 } as const;
export const MOUTH = { x: 101, y: 135 } as const;
/** Centro degli occhi (perno del battito di ciglia). */
export const EYES_CENTER = { x: 101, y: 114 } as const;

function eye(kind: Eyes, x: number, y: number, side: Side): string {
  const s = `stroke="${C.eye}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  switch (kind) {
    case 'open':
      return `<ellipse cx="${x}" cy="${y}" rx="7.8" ry="10.6" fill="${C.eye}"/><circle cx="${x - 2.6}" cy="${y - 4.4}" r="3" fill="${C.white}"/><circle cx="${x + 2.6}" cy="${y + 3.6}" r="1.3" fill="${C.white}"/>`;
    case 'surprised':
      return `<ellipse cx="${x}" cy="${y}" rx="8.6" ry="11.4" fill="${C.eye}"/><circle cx="${x - 2.8}" cy="${y - 4.6}" r="3.3" fill="${C.white}"/><circle cx="${x + 2.8}" cy="${y + 3.8}" r="1.4" fill="${C.white}"/>`;
    case 'happy':
      return `<path d="M${x - 8},${y + 3} Q${x},${y - 10} ${x + 8},${y + 3}" ${s}/>`;
    case 'closed':
      return `<path d="M${x - 8},${y - 1} Q${x},${y + 7} ${x + 8},${y - 1}" ${s}/>`;
    case 'wink':
      return side === 'L' ? eye('open', x, y, side) : `<path d="M${x + 7},${y - 7} L${x - 5},${y} L${x + 7},${y + 7}" ${s}/>`;
    case 'laugh':
      return side === 'L' ? `<path d="M${x - 7},${y - 7} L${x + 5},${y} L${x - 7},${y + 7}" ${s}/>` : `<path d="M${x + 7},${y - 7} L${x - 5},${y} L${x + 7},${y + 7}" ${s}/>`;
    case 'star': {
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const r = i % 2 === 0 ? 12 : 4.3;
        return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="${C.star}" ${sw(2.4)}/>`;
    }
    case 'heart':
      return `<path d="M${x},${y + 9} C${x - 13},${y} ${x - 11},${y - 11} ${x - 4.5},${y - 10} C${x - 1},${y - 10} ${x},${y - 7} ${x},${y - 6} C${x},${y - 7} ${x + 1},${y - 10} ${x + 4.5},${y - 10} C${x + 11},${y - 11} ${x + 13},${y} ${x},${y + 9} Z" fill="${C.heart}" ${sw(2.4)}/>`;
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
        `<path d="M${x - 13},${y - 4} Q${x},${y - 2} ${x + 13},${y - 4} Q${x + 12},${y + 11} ${x},${y + 12} Q${x - 12},${y + 11} ${x - 13},${y - 4} Z" fill="${C.mouth}" ${sw(2.7)}/>` +
        `<path d="M${x - 7.5},${y + 8} Q${x},${y + 1.5} ${x + 7.5},${y + 8} Q${x + 4},${y + 11.5} ${x},${y + 11.5} Q${x - 4},${y + 11.5} ${x - 7.5},${y + 8} Z" fill="${C.tongue}"/>`
      );
    case 'grin':
      return (
        `<path d="M${x - 16},${y - 5} Q${x},${y - 2} ${x + 16},${y - 5} Q${x + 15},${y + 16} ${x},${y + 16} Q${x - 15},${y + 16} ${x - 16},${y - 5} Z" fill="${C.mouth}" ${sw(2.7)}/>` +
        `<path d="M${x - 9.5},${y + 11} Q${x},${y + 2.5} ${x + 9.5},${y + 11} Q${x + 5},${y + 15.5} ${x},${y + 15.5} Q${x - 5},${y + 15.5} ${x - 9.5},${y + 11} Z" fill="${C.tongue}"/>`
      );
    case 'small':
      return `<path d="M${x - 9},${y - 1} Q${x},${y + 8} ${x + 9},${y - 1}" stroke="${C.mouth}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    case 'o':
      return `<ellipse cx="${x}" cy="${y + 3}" rx="5.5" ry="6.5" fill="${C.mouth}" ${sw(2.7)}/>`;
    case 'hmm':
      return `<path d="M${x - 6},${y + 3} Q${x + 1},${y} ${x + 8},${y + 2}" stroke="${C.mouth}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
  }
}

// ───────────────────────────── braccia ─────────────────────────────

/** Spalle (sul bordo del corpo) e lunghezze dei segmenti; a riposo il braccio pende verso il basso. */
export const SHOULDER: Record<Side, { x: number; y: number }> = { L: { x: 50, y: 124 }, R: { x: 151, y: 122 } };
export const UPPER = 24;
export const FORE = 22;

export function elbowRest(side: Side) {
  const s = SHOULDER[side];
  return { x: s.x, y: s.y + UPPER };
}
export function handRest(side: Side) {
  const s = SHOULDER[side];
  return { x: s.x, y: s.y + UPPER + FORE };
}

/** Segmento superiore (spalla → gomito). `pass` = contorno o riempimento: i due passaggi non lasciano giunture. */
export function upperArmPart(side: Side, pass: 'outline' | 'fill'): string {
  const s = SHOULDER[side];
  const e = elbowRest(side);
  return pass === 'outline'
    ? `<path d="M${s.x},${s.y} L${e.x},${e.y}" stroke="${C.line}" stroke-width="15" stroke-linecap="round" fill="none"/>`
    : `<path d="M${s.x},${s.y} L${e.x},${e.y}" stroke="${C.green}" stroke-width="8.6" stroke-linecap="round" fill="none"/>`;
}

/** Avambraccio con la mano a manopola (pollice verso il corpo) ed eventuale oggetto tenuto in mano. */
export function foreArmPart(side: Side, pass: 'outline' | 'fill', prop: Prop = 'none', propRotate = 0): string {
  const e = elbowRest(side);
  const h = handRest(side);
  const hy = h.y + 3;
  const t = side === 'L' ? 1 : -1; // il pollice punta verso il corpo
  if (pass === 'outline') {
    return (
      `<path d="M${e.x},${e.y} L${h.x},${h.y}" stroke="${C.line}" stroke-width="15" stroke-linecap="round" fill="none"/>` +
      `<circle cx="${h.x}" cy="${hy}" r="12" fill="${C.line}"/>` +
      `<ellipse cx="${h.x + t * 8}" cy="${hy - 4}" rx="6" ry="7" fill="${C.line}"/>`
    );
  }
  const held = prop === 'none' ? '' : propPart(prop, h.x, hy, propRotate);
  const grip = prop === 'none' ? '' : `<circle cx="${h.x}" cy="${hy}" r="10.4" fill="none" stroke="${C.line}" stroke-width="3.2"/>`;
  return (
    `<path d="M${e.x},${e.y} L${h.x},${h.y}" stroke="${C.green}" stroke-width="8.6" stroke-linecap="round" fill="none"/>` +
    held +
    `<ellipse cx="${h.x + t * 8}" cy="${hy - 4}" rx="3.6" ry="4.6" fill="${C.green}"/>` +
    `<circle cx="${h.x}" cy="${hy}" r="8.8" fill="${C.green}"/>` +
    grip +
    `<path d="M${h.x - t * 3},${hy + 5} Q${h.x + t * 2},${hy + 7.5} ${h.x + t * 6},${hy + 3}" stroke="${C.greenLight}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
  );
}

/** Oggetti tenuti in mano, disegnati attorno al centro della mano (hx, hy), ruotati di `rot` gradi. */
export function propPart(prop: Prop, hx: number, hy: number, rot: number): string {
  const g = (inner: string) => `<g transform="rotate(${rot.toFixed(1)} ${hx} ${hy})">${inner}</g>`;
  switch (prop) {
    case 'spoon':
      // cucchiaio di legno: il manico passa nel pugno, la paletta sta in alto
      return g(
        `<path d="M${hx},${hy + 15} L${hx},${hy - 32}" stroke="${C.line}" stroke-width="8.5" stroke-linecap="round"/>` +
          `<path d="M${hx},${hy + 15} L${hx},${hy - 32}" stroke="${C.spoon}" stroke-width="4.2" stroke-linecap="round"/>` +
          `<ellipse cx="${hx}" cy="${hy - 44}" rx="10" ry="13.5" fill="${C.spoon}" ${sw(3)}/>` +
          `<ellipse cx="${hx - 1}" cy="${hy - 46}" rx="5.5" ry="8.5" fill="${C.spoonDark}" opacity="0.35"/>`,
      );
    case 'phone':
      return g(
        `<rect x="${hx - 12}" y="${hy - 34}" width="24" height="42" rx="5" fill="${C.green}" ${sw(3)}/>` +
          `<rect x="${hx - 8}" y="${hy - 29}" width="16" height="28" rx="2.5" fill="${C.white}"/>` +
          `<path d="M${hx - 1},${hy - 8} C${hx - 6},${hy - 13} ${hx - 3},${hy - 22} ${hx + 5},${hy - 22} C${hx + 6},${hy - 14} ${hx + 3},${hy - 9} ${hx - 1},${hy - 8} Z" fill="${C.leaf}"/>`,
      );
    case 'list':
    case 'clipboard': {
      const board = prop === 'clipboard';
      const tick = (yy: number) =>
        `<path d="M${hx - 9},${yy} l3,3 l5,-6" stroke="${C.green}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hx + 1},${yy} L${hx + 10},${yy}" stroke="${C.ivoryShade}" stroke-width="2.8" stroke-linecap="round"/>`;
      return g(
        `<rect x="${hx - 15}" y="${hy - 42}" width="30" height="42" rx="${board ? 4 : 3}" fill="${board ? C.green : C.paper}" ${sw(3)}/>` +
          (board ? `<rect x="${hx - 11}" y="${hy - 37}" width="22" height="32" rx="2" fill="${C.paper}"/><rect x="${hx - 6}" y="${hy - 46}" width="12" height="7" rx="2" fill="${C.ivoryShade}" ${sw(2.4)}/>` : '') +
          tick(hy - 30) +
          tick(hy - 21) +
          tick(hy - 12),
      );
    }
    default:
      return '';
  }
}

// ───────────────────────────── segni (emote) ─────────────────────────────

/** Perno dei segni (si accendono con una piccola scala). */
export const EMOTE_PIVOT = { x: 160, y: 34 } as const;

export function emotePart(kind: Emote): string {
  switch (kind) {
    case 'question':
      return (
        `<path d="M152,24 C152,12 172,11 172,23 C172,31 162,31 162,39" stroke="${C.line}" stroke-width="9" fill="none" stroke-linecap="round"/>` +
        `<path d="M152,24 C152,12 172,11 172,23 C172,31 162,31 162,39" stroke="${C.leaf}" stroke-width="4.5" fill="none" stroke-linecap="round"/>` +
        `<circle cx="162" cy="49" r="4.6" fill="${C.leaf}" ${sw(2.4)}/>`
      );
    case 'sparkles':
      return (
        `<path d="M162,34 L167,26 M171,44 L180,42 M166,53 L173,58" stroke="${C.star}" stroke-width="4.2" stroke-linecap="round"/>` +
        `<path d="M40,36 L35,28 M31,46 L22,44 M36,55 L29,60" stroke="${C.star}" stroke-width="4.2" stroke-linecap="round"/>`
      );
    case 'hearts':
      return `<path d="M164,44 C152,36 154,25 161,25 C165,25 166,28 166,29 C166,28 167,25 171,25 C178,25 180,36 168,44 Z" fill="${C.heart}" ${sw(2.2)}/>`;
    case 'bang':
      return `<path d="M168,28 L173,19 M176,40 L186,38 M171,51 L179,56" stroke="${C.star}" stroke-width="4.2" stroke-linecap="round"/>`;
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
}

/** Mina intera in un solo SVG (versione statica: righe piccole, "Riduci movimento", esportazioni). */
export function minaStaticSvg(look: MinaLook, opts: { shadow?: boolean; viewBox?: string } = {}): string {
  return svg(
    (opts.shadow === false ? '' : shadowPart()) +
      legsPart() +
      bodyPart(look.variant) +
      (look.variant === 'chef' ? hatPart() : '') +
      eyesPart(look.eyes) +
      mouthPart(look.mouth) +
      armStatic('L', look.armL, 'outline') +
      armStatic('R', look.armR, 'outline') +
      armStatic('L', look.armL, 'fill') +
      armStatic('R', look.armR, 'fill') +
      (look.emote ? emotePart(look.emote) : ''),
    opts.viewBox,
  );
}
