/**
 * Mina 2.0 — la borsetta della spesa di Spesora (e la variante Mina Chef).
 * Disegno vettoriale ricalcato sui fogli approvati:
 *  - Mina 2.0: docs/restyling/riferimenti/mina2_foglio_approvato.webp
 *  - Mina Chef: docs/restyling/riferimenti/mina_chef_style_reference.png
 * Misure, proporzioni, colori e dettagli presi dai fogli (vedi docs/MASCOT.md, «Fedeltà al riferimento»).
 * Diviso in parti separate per l'animazione: ombra, gambe, corpo (verdure, manico, borsa, foglia o grembiule),
 * occhi, bocca, cappello, braccio e avambraccio con mano a dita, oggetti, segni.
 * Mina Chef ha una sagoma propria (borsa più alta e inclinata, viso più piccolo), quindi un suo «scheletro» (RIG).
 *
 * Funzioni pure che producono SVG (nessuna dipendenza da React Native): le usano il componente animato,
 * la versione statica, i test e l'esportazione delle immagini.
 * Coordinate nel riquadro VIEWBOX (x 0…200, y −12…220); i piedi poggiano a y ≈ 204.
 */

export const VIEW = { x: 0, y: -12, w: 200, h: 232 } as const;
export const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;

/** Colori campionati dai fogli di riferimento. */
export const C = {
  line: '#1D4A32', // contorno verde scuro
  ivory: '#F8EDD6', // fronte della borsa
  ivoryLow: '#F2E2C2', // fronte, parte bassa (sfumatura leggera)
  ivoryShade: '#EEDDBB', // fianco sinistro
  chefSide: '#F8E1AE', // fianco di Mina Chef, più caldo (foglio di Mina Chef)
  crease: '#B78550', // piega tra fianco e fronte
  green: '#2E7D4E', // manico, braccia, gambe, grembiule
  greenDeep: '#266B42',
  greenLight: '#4E9E6A',
  leaf: '#8DC63F', // foglia sul davanti, foglie della carota
  lettuce: '#8BC152',
  lettuceChef: '#A2D64A', // lattuga di Mina Chef, più chiara
  leafDark: '#5A9A36',
  spinach: '#3A8743',
  cheek: '#F6B0A7',
  eye: '#17302A',
  mouth: '#7C2B22',
  mouthLine: '#3D1C0E', // sorriso chiuso di Mina Chef
  tongue: '#F2846A',
  tomato: '#EE5B2B',
  tomatoLight: '#FBB49A',
  radish: '#E14B2C',
  calyx: '#3F9A4E',
  bread: '#F3B13A',
  breadMark: '#FCE2A2',
  carrot: '#F6A01E',
  carrotDark: '#D9800E',
  orange: '#F7A80C', // il frutto arancio sotto il cappello di Mina Chef
  orangeLight: '#FFD27A',
  lemon: '#F6C343',
  lemonChef: '#FBB63A',
  white: '#FFFFFF',
  hatShade: '#E4EAEC',
  spoon: '#D8913A',
  spoonLine: '#55300F',
  spoonLight: '#E6A452',
  spoonDark: '#A8652F',
  star: '#F6C343',
  shine: '#FBB91E', // tratti gialli di Mina Chef
  heart: '#EE5050',
  question: '#58A845',
  paper: '#FFFFFF',
  paperLine: '#C9D3CB',
  check: '#6BB24A',
  shadow: '#E2EDD4', // ombra a terra verde chiaro, come nel foglio
  bowl: '#A9D46E', // ciotola verde chiaro della Mina Chef che mescola
  bowlDark: '#7DB34A',
  soup: '#C2D97E',
  steel: '#D9DFE3', // cloche e vassoio
  steelDark: '#8E9CA5',
  steelLine: '#4F5D66',
  steelLight: '#EEF2F3',
} as const;

export type Variant = 'classic' | 'chef';
export type Eyes = 'open' | 'happy' | 'closed' | 'wink' | 'laugh' | 'star' | 'heart' | 'surprised';
export type Mouth = 'smile' | 'grin' | 'small' | 'o' | 'hmm';
export type Prop = 'none' | 'fist' | 'spoon' | 'phone' | 'list' | 'clipboard' | 'bowl' | 'cloche';
export type Emote = 'question' | 'sparkles' | 'hearts' | 'bang' | 'shine' | 'shineUp';
export type Legs = 'stand' | 'walk';
export type Side = 'L' | 'R';

const LW = 3.2; // contorno del corpo
const sw = (w: number, color: string = C.line) => `stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Avvolge un frammento in un SVG a tutto riquadro (stesse coordinate per tutti i livelli). */
export function svg(inner: string, viewBox = VIEWBOX): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
}

/** Gruppo di cerchi fusi in una forma riccia (cappello): contorno sotto, riempimento sopra. */
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

// ───────────────────────────── scheletro (per variante) ─────────────────────────────

export const FEET_Y = 204;

export interface Rig {
  /** Spalle sui bordi della borsa. */
  shoulder: Record<Side, { x: number; y: number }>;
  /** Lunghezze di braccio e avambraccio. */
  upper: number;
  fore: number;
  /** Centro degli occhi (perno del battito di ciglia). */
  eyesCenter: { x: number; y: number };
  /** Perno di tutto il corpo (tra i piedi): inclinazioni e schiacciamenti. */
  bodyPivot: { x: number; y: number };
  /** Base del cappello (oscilla quando Mina salta). */
  hatPivot: { x: number; y: number };
  /** Perno dell'inclinazione della posa (`lean`): i piedi per Mina 2.0, il centro della borsa per Mina Chef. */
  leanPivot: { x: number; y: number };
}

export const RIG: Record<Variant, Rig> = {
  classic: { shoulder: { L: { x: 40, y: 120 }, R: { x: 159.5, y: 116 } }, upper: 16, fore: 17, eyesCenter: { x: 110, y: 107.5 }, bodyPivot: { x: 104, y: FEET_Y }, hatPivot: { x: 101, y: 80 }, leanPivot: { x: 104, y: FEET_Y } },
  // Mina Chef (foglio «Mina Chef — Style Reference»): braccia corte attaccate ai lati, sotto il viso
  chef: { shoulder: { L: { x: 57, y: 145 }, R: { x: 143, y: 131 } }, upper: 12, fore: 12, eyesCenter: { x: 106.8, y: 109.8 }, bodyPivot: { x: 105, y: FEET_Y }, hatPivot: { x: 90, y: 66 }, leanPivot: { x: 98, y: 135 } },
};

/** Perno di tutto il corpo di Mina 2.0 (compatibilità). */
export const BODY_PIVOT = RIG.classic.bodyPivot;

export function shadowPart(variant: Variant = 'classic'): string {
  if (variant === 'chef') return `<ellipse cx="105" cy="${FEET_Y - 0.5}" rx="64" ry="7" fill="${C.shadow}"/>`;
  return `<ellipse cx="104" cy="${FEET_Y + 2}" rx="66" ry="6.5" fill="${C.shadow}"/>`;
}

export function legsPart(legs: Legs = 'stand', variant: Variant = 'classic'): string {
  if (variant === 'chef') {
    // gambe corte e spesse, scarponcini che puntano in fuori
    const leg = (x1: number, y1: number, x2: number, fx: number, dir: number) =>
      `<path d="M${x1},${y1} L${x2},195" ${sw(9.2)} fill="none"/>` +
      `<path d="M${x1},${y1} L${x2},195" stroke="${C.green}" stroke-width="5.4" stroke-linecap="round" fill="none"/>` +
      `<path d="M${fx - 7.5 * dir},${FEET_Y - 1} C${fx - 8.5 * dir},${FEET_Y - 9} ${fx + 5 * dir},${FEET_Y - 10} ${fx + 9.5 * dir},${FEET_Y - 3.5} C${fx + 11 * dir},${FEET_Y + 1} ${fx - 7 * dir},${FEET_Y + 2.5} ${fx - 7.5 * dir},${FEET_Y - 1} Z" fill="${C.green}" ${sw(2.4)}/>`;
    return leg(89, 180, 88.5, 88.8, -1) + leg(119.5, 178, 120.5, 122.3, 1);
  }
  const leg = (x1: number, x2: number, y2: number, fx: number, dir: number) =>
    `<path d="M${x1},166 L${x2},${y2}" ${sw(15.5)} fill="none"/>` +
    `<path d="M${x1},166 L${x2},${y2}" stroke="${C.green}" stroke-width="10.5" stroke-linecap="round" fill="none"/>` +
    // scarponcino arrotondato che punta verso l'esterno
    `<path d="M${fx - 10 * dir},${FEET_Y - 1} C${fx - 11 * dir},${FEET_Y - 11} ${fx + 7 * dir},${FEET_Y - 12} ${fx + 13 * dir},${FEET_Y - 4} C${fx + 15 * dir},${FEET_Y + 1} ${fx - 9 * dir},${FEET_Y + 4} ${fx - 10 * dir},${FEET_Y - 1} Z" fill="${C.green}" ${sw(2.8)}/>`;
  return legs === 'walk' ? leg(85, 81, 196, 77, -1) + leg(123, 135, 194, 139, 1) : leg(86, 85, 197, 81, -1) + leg(122, 123, 197, 127, 1);
}

// ───────────────────────────── Mina 2.0: borsa ─────────────────────────────

/** Scatola vista di tre quarti: più larga che alta, angoli arrotondati, fianco sinistro visibile. */
const BOX = 'M43,80 L155,79 Q161,79 161,85 L157.5,160 Q157,172 145,172 L55,173 Q43.5,173 43,161 L37,86 Q37,80 43,80 Z';
const SIDE = 'M43,80 L58,80 L60,173 L55,173 Q43.5,173 43,161 L37,86 Q37,80 43,80 Z';
const HANDLE = 'M71,88 L71,50 A32,32 0 0 1 135,50 L135,88';
const FRONT_GRADIENT = `<defs><linearGradient id="mina2-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ivory}"/><stop offset="1" stop-color="${C.ivoryLow}"/></linearGradient></defs>`;

function veggiesBack(): string {
  const vein = (d: string, color: string = C.leafDark) => `<path d="${d}" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
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

function veggiesFront(): string {
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
  const bread =
    `<g transform="rotate(-30 52 64)">` +
    `<rect x="40" y="30" width="24" height="70" rx="12" fill="${C.bread}" ${sw(2.8)}/>` +
    `<path d="M45,46 Q52,42 59,44 M45,61 Q52,57 59,59 M45,76 Q52,72 59,74" stroke="${C.breadMark}" stroke-width="2.8" fill="none" stroke-linecap="round"/>` +
    `</g>`;
  return tomato + bread;
}

function panelPart(): string {
  return (
    FRONT_GRADIENT +
    `<path d="${BOX}" fill="url(#mina2-front)"/>` +
    `<path d="${SIDE}" fill="${C.ivoryShade}"/>` +
    `<path d="M58,85 C58.5,110 59,140 60.5,166" stroke="${C.crease}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    // foglia del foglio: verde chiaro, senza contorno, una sola venatura bianca curva che esce come picciolo
    `<g transform="translate(112 151) scale(1.12)">` +
    `<path d="M-12,10 C-15,-4 -2,-13 14,-11 C13,4 2,13 -12,10 Z" fill="${C.leaf}"/>` +
    `<path d="M-17,15 Q-4,4 9,-7" stroke="${C.white}" stroke-width="2.3" fill="none" stroke-linecap="round"/>` +
    `</g>`
  );
}

export const CHEEK_L = { x: 77, y: 124 } as const;
export const CHEEK_R = { x: 143, y: 123 } as const;

// ───────────────────────────── Mina Chef: borsa, grembiule, cappello ─────────────────────────────

/*
 * Mina Chef dal foglio «Mina Chef — Style Reference»: la borsa è più alta che larga e inclinata (circa −12°),
 * con il fianco sinistro più caldo; il manico è un arco basso e spesso su cui poggia la fascia del cappello;
 * dentro l'arco un frutto arancio, a destra un limone, a sinistra la lattuga; il grembiule verde copre il terzo
 * basso della borsa, con la foglia bianca al centro e il fiocco sul bordo sinistro.
 * Coordinate ricalcate sul foglio (0,62 unità per pixel del foglio).
 */
const CHEF_BOX = 'M50.5,97.5 Q92,75.5 135.5,81.4 Q139,82 139.3,85.5 L143.6,128 L144.6,145 L144.9,168 Q145,176 138,177 L76,182 Q71.5,182.3 69.6,178 L46.6,103.5 Q45.5,98.8 50.5,97.5 Z';
const CHEF_SIDE = 'M50.5,97.5 Q54.5,95.3 58.8,93.4 L86,181.5 L76,182 Q71.5,182.3 69.6,178 L46.6,103.5 Q45.5,98.8 50.5,97.5 Z';
/** Apertura della borsa sotto il cappello: il manico visto di fronte, un arco verde pieno, con l'interno scuro. */
const CHEF_OPENING = 'M61,96 C61,78 73,64.5 95,63 C114,62.3 122.5,68 123.8,85 Z';
const CHEF_INSIDE = 'M68,94 C68,80 78,70.5 95,69.8 C110,69.3 117,73.5 118,86 Z';
const CHEF_APRON = 'M70.2,155.4 L143,141.8 Q144.9,141.5 145,143.5 L145.4,167 Q145.6,174.5 139,177 Q112,186 82,185 Q77.2,184.8 77,180.5 L76.3,166 Z';

function chefBodyPart(bow: boolean): string {
  const vein = (d: string) => `<path d="${d}" stroke="${C.leafDark}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  return (
    // lattuga a lobi grandi dietro l'angolo in alto a sinistra, limone che sbuca a destra
    puffs(
      [
        [34, 80, 8.2],
        [41.5, 67.5, 7.6],
        [53.5, 68.5, 7.6],
        [47, 79, 11.5],
        [52, 88, 8],
      ],
      C.lettuceChef,
      2.8,
    ) +
    vein('M55,94 C52,84 49,75 46,64 M49,80 L37,77 M50.5,82 L57,70') +
    `<path d="M58.5,91 L61.5,76 L67,78.5 Z" fill="${C.carrot}" ${sw(2.2)}/>` +
    `<circle cx="122.5" cy="72" r="8.3" fill="${C.lemonChef}" ${sw(2.4)}/>` +
    `<ellipse cx="124.5" cy="68.5" rx="2.8" ry="2" fill="${C.orangeLight}"/>` +
    // apertura: arco del manico verde, interno scuro, frutto arancio
    `<path d="${CHEF_OPENING}" fill="${C.green}" ${sw(2.5)}/>` +
    `<path d="${CHEF_INSIDE}" fill="${C.greenDeep}" ${sw(2.2)}/>` +
    `<circle cx="94.5" cy="86" r="16" fill="${C.orange}" ${sw(2.6)}/>` +
    `<ellipse cx="101" cy="74.5" rx="4.8" ry="2.4" fill="${C.orangeLight}" transform="rotate(-18 101 74.5)"/>` +
    // borsa alta, con il fianco sinistro più caldo
    FRONT_GRADIENT +
    `<path d="${CHEF_BOX}" fill="url(#mina2-front)"/>` +
    `<path d="${CHEF_SIDE}" fill="${C.chefSide}"/>` +
    `<path d="M59.5,97 L84,170" stroke="${C.crease}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.35"/>` +
    `<path d="${CHEF_BOX}" fill="none" ${sw(2.7)}/>` +
    // grembiule verde sul terzo basso, con il suo contorno e la foglia bianca
    `<path d="${CHEF_APRON}" fill="${C.green}" ${sw(2.5)}/>` +
    `<g transform="translate(112.5 165.2) rotate(-7) scale(0.9)">` +
    `<path d="M-12,10 C-15,-4 -2,-13 14,-11 C13,4 2,13 -12,10 Z" fill="${C.white}"/>` +
    `<path d="M-17,15 Q-4,4 9,-7" stroke="${C.green}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `</g>` +
    // fiocco sul bordo sinistro: un'ansa verso sinistra, la coda a coda di rondine che scende, il nodo
    // (nelle pose in cui il braccio sinistro lo copre, nel foglio non si vede)
    (bow ? chefBow() : '') +
    // guance
    `<ellipse cx="82.9" cy="126.4" rx="6.4" ry="5" transform="rotate(-10 82.9 126.4)" fill="${C.cheek}" opacity="0.85"/>` +
    `<ellipse cx="132.4" cy="120.4" rx="6.4" ry="5" transform="rotate(-10 132.4 120.4)" fill="${C.cheek}" opacity="0.85"/>`
  );
}

function chefBow(): string {
  return (
    `<path d="M63.5,163 C57,165 51,168 47.5,172.5 L54.5,181.5 L57.8,176 L60.5,181 C62.5,176 64,169 65.5,164 Z" fill="${C.green}" ${sw(2.4)}/>` +
    `<path d="M62,155.5 C57,151 50,150.5 47,155.5 C45.5,159.5 49,164 55,163.5 C58,163.3 61,162 62.5,160.5 Z" fill="${C.green}" ${sw(2.4)}/>` +
    `<path d="M51,157.5 Q55,157.5 59,159.5" stroke="${C.line}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `<ellipse cx="63" cy="158" rx="5.4" ry="6.6" fill="${C.green}" ${sw(2.4)}/>`
  );
}

/** Corpo completo. Mina 2.0: verdure, manico, borsa con la foglia, guance, contorno. Mina Chef: vedi chefBodyPart. */
export function bodyPart(variant: Variant, opts: { bow?: boolean } = {}): string {
  if (variant === 'chef') return chefBodyPart(opts.bow ?? true);
  return (
    veggiesBack() +
    handlePart() +
    veggiesFront() +
    panelPart() +
    `<ellipse cx="${CHEEK_L.x}" cy="${CHEEK_L.y}" rx="8.6" ry="5.4" fill="${C.cheek}" opacity="0.9"/>` +
    `<ellipse cx="${CHEEK_R.x}" cy="${CHEEK_R.y}" rx="8.6" ry="5.4" fill="${C.cheek}" opacity="0.9"/>` +
    `<path d="${BOX}" fill="none" ${sw(LW)}/>`
  );
}

/** Perno del cappello (base della fascia): oscilla quando Mina salta. */
export const HAT_PIVOT = RIG.chef.hatPivot;

/**
 * Cappello da chef come nel foglio: nuvola bianca a tre lobi con l'ombra grigio-azzurra in basso, e una fascia
 * curva alta che poggia sull'apertura della borsa.
 */
export function hatPart(): string {
  const lobes: [number, number, number][] = [
    [58, 40, 18],
    [85, 24, 20],
    [110.6, 35, 16],
    [85, 42, 17],
    [70, 46, 12],
    [101, 44, 13],
  ];
  return (
    lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.white}" ${sw(2.5)}/>`).join('') +
    // ombra in basso a ogni lobo: cerchio grigio, poi cerchio bianco spostato in alto
    lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${(r - 1.6).toFixed(1)}" fill="${C.hatShade}"/>`).join('') +
    lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${(y - 2.6).toFixed(1)}" r="${(r - 4.4).toFixed(1)}" fill="${C.white}"/>`).join('') +
    // fascia curva
    `<path d="M60.5,59.5 Q93,40 115.5,49.5 L116.8,68.5 Q95,55.5 64.5,75.5 Z" fill="${C.white}"/>` +
    `<path d="M61,60 Q93,40.6 115.6,50 L115.9,54.6 Q93,46.5 61.8,64.6 Z" fill="${C.hatShade}"/>` +
    `<path d="M60.5,59.5 Q93,40 115.5,49.5 L116.8,68.5 Q95,55.5 64.5,75.5 Z" fill="none" ${sw(2.5)}/>`
  );
}

// ───────────────────────────── volto ─────────────────────────────

/** Il viso di Mina 2.0 sta al centro del fronte (a destra della piega), come nel foglio. */
export const EYE_L = { x: 90, y: 108 } as const;
export const EYE_R = { x: 130, y: 107 } as const;
export const MOUTH = { x: 110, y: 125 } as const;
/** Centro degli occhi di Mina 2.0 (perno del battito di ciglia). */
export const EYES_CENTER = RIG.classic.eyesCenter;

/** Viso di Mina Chef (dal foglio): occhi più piccoli, bocca più piccola, tutto inclinato come la borsa. */
const CHEF_FACE = { eyeL: { x: 90.3, y: 112.8 }, eyeR: { x: 123.3, y: 106.8 }, mouth: { x: 108.3, y: 125.5 }, tilt: -10 } as const;

function eye(kind: Eyes, x: number, y: number, side: Side, chef = false): string {
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
      if (side === 'L') return eye('open', x, y, side, chef);
      // Mina Chef strizza l'occhio con una «<», come nel foglio; Mina 2.0 con un arco
      return chef ? `<path d="M${x + 6},${y - 6} L${x - 4.5},${y} L${x + 6},${y + 6}" ${s}/>` : `<path d="M${x - 6.5},${y + 2} Q${x},${y - 6} ${x + 6.5},${y - 2}" ${s}/>`;
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

export function eyesPart(kind: Eyes, variant: Variant = 'classic'): string {
  if (variant === 'chef') {
    // nel foglio l'occhio destro è un po' più piccolo (la borsa è vista di tre quarti)
    const at = (p: { x: number; y: number }, base: { x: number; y: number }, side: Side, k: number) =>
      `<g transform="translate(${p.x} ${p.y}) rotate(${CHEF_FACE.tilt}) scale(${(0.85 * k).toFixed(3)} ${(1.04 * k).toFixed(3)}) translate(${-base.x} ${-base.y})">${eye(kind, base.x, base.y, side, true)}</g>`;
    return at(CHEF_FACE.eyeL, EYE_L, 'L', 1) + at(CHEF_FACE.eyeR, EYE_R, 'R', 0.9);
  }
  return eye(kind, EYE_L.x, EYE_L.y, 'L') + eye(kind, EYE_R.x, EYE_R.y, 'R');
}

function mouthShape(kind: Mouth): string {
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

export function mouthPart(kind: Mouth, variant: Variant = 'classic'): string {
  if (variant === 'chef') {
    const m = CHEF_FACE.mouth;
    // il sorriso chiuso di Mina Chef nel foglio è largo quasi quanto la bocca aperta
    if (kind === 'small') return `<path d="M${m.x - 7.1},${m.y - 4.2} Q${m.x - 0.3},${m.y + 8.5} ${m.x + 8.4},${m.y - 6.2}" stroke="${C.mouthLine}" stroke-width="2.9" fill="none" stroke-linecap="round"/>`;
    return `<g transform="translate(${m.x} ${m.y}) rotate(${CHEF_FACE.tilt}) scale(0.6 0.84) translate(${-MOUTH.x} ${-MOUTH.y})">${mouthShape(kind)}</g>`;
  }
  return mouthShape(kind);
}

// ───────────────────────────── braccia e mani ─────────────────────────────

/** Spalle e lunghezze dei segmenti di Mina 2.0 (compatibilità con i test e le pose esistenti). */
export const SHOULDER = RIG.classic.shoulder;
export const UPPER = RIG.classic.upper;
export const FORE = RIG.classic.fore;

/** Lunghezze [braccio, avambraccio]: quelle dello scheletro, o quelle proprie della posa (`ArmPose.len`). */
export type ArmLen = readonly [number, number];
function segs(variant: Variant, len?: ArmLen): ArmLen {
  return len ?? [RIG[variant].upper, RIG[variant].fore];
}

export function elbowRest(side: Side, variant: Variant = 'classic', len?: ArmLen) {
  const s = RIG[variant].shoulder[side];
  return { x: s.x, y: s.y + segs(variant, len)[0] };
}
export function handRest(side: Side, variant: Variant = 'classic', len?: ArmLen) {
  const s = RIG[variant].shoulder[side];
  const [a, b] = segs(variant, len);
  return { x: s.x, y: s.y + a + b };
}

/** Spessore del braccio (contorno, riempimento): Mina Chef ha braccia un po' più sottili e più lunghe. */
const armWidth = (variant: Variant): [number, number] => (variant === 'chef' ? [9.2, 5.8] : [14, 9.4]);

/** Segmento superiore (spalla → gomito). `pass` = contorno o riempimento: i due passaggi non lasciano giunture. */
export function upperArmPart(side: Side, pass: 'outline' | 'fill', variant: Variant = 'classic', len?: ArmLen): string {
  const s = RIG[variant].shoulder[side];
  const e = elbowRest(side, variant, len);
  const [wo, wi] = armWidth(variant);
  return `<path d="M${s.x},${s.y} L${e.x},${e.y}" stroke="${pass === 'outline' ? C.line : C.green}" stroke-width="${pass === 'outline' ? wo : wi}" stroke-linecap="round" fill="none"/>`;
}

/**
 * Mano a guanto con tre dita e pollice (aperta) o a pugno (quando tiene un oggetto), nel verso del braccio a riposo
 * (le dita continuano oltre il polso). Contorno e riempimento in due passaggi, come il braccio.
 */
function handShape(side: Side, pass: 'outline' | 'fill', fist: boolean, variant: Variant, len?: ArmLen, thumbUp = false): string {
  const h = handRest(side, variant, len);
  const t = side === 'L' ? 1 : -1; // il pollice punta verso il corpo
  const color = pass === 'outline' ? C.line : C.green;
  const grow = pass === 'outline' ? 2.4 : 0;
  const k = variant === 'chef' ? 0.8 : 1;
  const palm = `<circle cx="${h.x}" cy="${h.y + 3}" r="${((thumbUp ? 5.6 : fist ? 8 : 7.2) * k + grow).toFixed(2)}" fill="${color}"/>`;
  const capsule = (x1: number, y1: number, x2: number, y2: number, w: number) => `<path d="M${x1},${y1} L${x2},${y2}" stroke="${color}" stroke-width="${(w * k + grow * 2).toFixed(2)}" stroke-linecap="round"/>`;
  if (thumbUp) return palm;
  if (fist) {
    const knuckles = pass === 'fill' ? `<path d="M${h.x - 3},${h.y + 5} L${h.x - 3},${h.y + 8} M${h.x + 1},${h.y + 5.5} L${h.x + 1},${h.y + 8.5}" stroke="${C.line}" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>` : '';
    return palm + capsule(h.x, h.y + 3, h.x + t * 8 * k, h.y - 0.5, 5.4) + knuckles;
  }
  return (
    palm +
    capsule(h.x - 3.8 * k, h.y + 6, h.x - 5.6 * k, h.y + 6 + 7 * k, 5) +
    capsule(h.x, h.y + 7, h.x, h.y + 7 + 8 * k, 5) +
    capsule(h.x + 3.8 * k, h.y + 6, h.x + 5.6 * k, h.y + 6 + 7 * k, 5) +
    capsule(h.x, h.y + 3, h.x + t * 9 * k, h.y + 0.5, 5.2)
  );
}

/** Avambraccio con la mano ed eventuale oggetto tenuto in mano. */
export function foreArmPart(side: Side, pass: 'outline' | 'fill', prop: Prop = 'none', propRotate = 0, variant: Variant = 'classic', len?: ArmLen): string {
  const e = elbowRest(side, variant, len);
  const h = handRest(side, variant, len);
  const fist = prop !== 'none';
  const [wo, wi] = armWidth(variant);
  const arm = `<path d="M${e.x},${e.y} L${h.x},${h.y}" stroke="${pass === 'outline' ? C.line : C.green}" stroke-width="${pass === 'outline' ? wo : wi}" stroke-linecap="round" fill="none"/>`;
  const up = prop === 'fist';
  if (pass === 'outline') return arm + handShape(side, 'outline', fist, variant, len, up);
  const held = fist ? propPart(prop, h.x, h.y + 3, propRotate) : '';
  // il pugno copre il manico degli oggetti; il pollice in su invece sta sopra la mano
  return arm + (up ? '' : held) + handShape(side, 'outline', fist, variant, len, up) + handShape(side, 'fill', fist, variant, len, up) + (up ? held : '');
}

/** Oggetti tenuti in mano, disegnati attorno al centro della mano (hx, hy), ruotati di `rot` gradi. */
export function propPart(prop: Prop, hx: number, hy: number, rot: number): string {
  const g = (inner: string) => `<g transform="rotate(${rot.toFixed(1)} ${hx} ${hy})">${inner}</g>`;
  switch (prop) {
    case 'spoon': {
      // grande cucchiaio di legno con bordo marrone scuro (foglio di Mina Chef): il manico passa nel pugno,
      // la paletta in alto con il collo che si allarga; contorno e riempimento in due passaggi (sagoma unica)
      const neck = `M${hx - 3.1},${hy - 18} C${hx - 3.3},${hy - 23} ${hx - 7.5},${hy - 26} ${hx - 9.5},${hy - 28.5} L${hx + 9.5},${hy - 28.5} C${hx + 7.5},${hy - 26} ${hx + 3.3},${hy - 23} ${hx + 3.1},${hy - 18} Z`;
      return g(
        `<path d="M${hx},${hy + 22} L${hx},${hy - 22}" stroke="${C.spoonLine}" stroke-width="6.8" stroke-linecap="round"/>` +
          `<path d="${neck}" fill="${C.spoonLine}" stroke="${C.spoonLine}" stroke-width="3.4" stroke-linejoin="round"/>` +
          `<ellipse cx="${hx}" cy="${hy - 46}" rx="17.4" ry="21.9" fill="${C.spoonLine}"/>` +
          `<path d="M${hx},${hy + 22} L${hx},${hy - 22}" stroke="${C.spoon}" stroke-width="3.4" stroke-linecap="round"/>` +
          `<path d="${neck}" fill="${C.spoon}"/>` +
          `<ellipse cx="${hx}" cy="${hy - 46}" rx="14.6" ry="19.1" fill="${C.spoon}"/>` +
          `<ellipse cx="${hx - 1.5}" cy="${hy - 47.5}" rx="10.5" ry="14.5" fill="${C.spoonLight}"/>` +
          `<path d="M${hx - 3},${hy - 60} Q${hx + 9.5},${hy - 47} ${hx},${hy - 31.5}" stroke="${C.spoonDark}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      );
    }
    case 'fist':
      // pollice in su, verso il corpo (foglio di Mina Chef)
      return g(
        `<path d="M${hx + 1},${hy - 2} L${hx + 3.2},${hy - 8.5}" stroke="${C.line}" stroke-width="8.6" stroke-linecap="round"/>` +
          `<path d="M${hx + 1},${hy - 2} L${hx + 3.2},${hy - 8.5}" stroke="${C.green}" stroke-width="4.2" stroke-linecap="round"/>`,
      );
    case 'phone':
      return g(
        `<rect x="${hx - 12}" y="${hy - 38}" width="24" height="42" rx="5" fill="${C.green}" ${sw(2.6)}/>` +
          `<rect x="${hx - 8.5}" y="${hy - 33.5}" width="17" height="31" rx="3" fill="${C.greenLight}"/>` +
          `<path d="M${hx - 5},${hy - 11} C${hx - 7},${hy - 20} ${hx},${hy - 26} ${hx + 6},${hy - 26} C${hx + 6},${hy - 18} ${hx + 2},${hy - 12} ${hx - 5},${hy - 11} Z M${hx - 6},${hy - 9} L${hx + 3},${hy - 21}" fill="${C.white}" stroke="${C.white}" stroke-width="1.2" stroke-linecap="round"/>`,
      );
    case 'list': {
      const tick = (yy: number) =>
        `<path d="M${hx - 9},${yy} l3,3 l5,-6" stroke="${C.green}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hx + 1},${yy} L${hx + 10},${yy}" stroke="${C.paperLine}" stroke-width="2.6" stroke-linecap="round"/>`;
      return g(`<rect x="${hx - 15}" y="${hy - 44}" width="30" height="44" rx="3" fill="${C.paper}" ${sw(2.6)}/>` + tick(hy - 32) + tick(hy - 23) + tick(hy - 14));
    }
    case 'clipboard': {
      // cartellina verde grande (foglio di Mina Chef): la mano la tiene dal bordo destro; molletta in alto
      const tick = (yy: number) =>
        `<path d="M${hx - 43.5},${yy} L${hx - 39.5},${yy + 4.5} L${hx - 31},${yy - 5.5}" stroke="${C.check}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M${hx - 27},${yy + 1} L${hx - 11},${yy + 1.6}" stroke="${C.paperLine}" stroke-width="3.4" stroke-linecap="round"/>`;
      return g(
        `<rect x="${hx - 53.4}" y="${hy - 43.1}" width="54.2" height="76.6" rx="6" fill="${C.green}" ${sw(2.8)}/>` +
          `<rect x="${hx - 48.4}" y="${hy - 38.1}" width="44.2" height="66.6" rx="3" fill="${C.paper}" ${sw(1.6)}/>` +
          `<rect x="${hx - 32.5}" y="${hy - 53}" width="10" height="8" rx="3.5" fill="${C.green}" ${sw(2.4)}/>` +
          `<rect x="${hx - 38.5}" y="${hy - 48.3}" width="22" height="10" rx="3" fill="${C.green}" ${sw(2.4)}/>` +
          tick(hy - 20.5) +
          tick(hy - 2) +
          tick(hy + 15),
      );
    }
    case 'bowl': {
      // ciotola verde chiaro grande quasi quanto la borsa, con la zuppa; la frusta d'acciaio tenuta col manico in su
      const cx = hx - 9;
      const ry = hy + 34; // bordo
      const wires = [
        [-21, 38],
        [-13, 41],
        [-5, 40],
        [2, 35],
      ];
      return g(
        `<ellipse cx="${cx}" cy="${ry + 46}" rx="16" ry="4" fill="${C.bowlDark}" ${sw(2.4)}/>` +
          `<path d="M${cx - 43},${ry} C${cx - 43},${ry + 66} ${cx + 43},${ry + 66} ${cx + 43},${ry} Z" fill="${C.bowl}" ${sw(2.8)}/>` +
          `<ellipse cx="${cx}" cy="${ry}" rx="43" ry="9.5" fill="${C.bowl}" ${sw(2.8)}/>` +
          `<ellipse cx="${cx}" cy="${ry + 1.2}" rx="37" ry="6.6" fill="${C.soup}"/>` +
          `<circle cx="${cx - 26}" cy="${ry + 3}" r="3" fill="${C.carrot}"/><circle cx="${cx + 4}" cy="${ry + 3.5}" r="2.8" fill="${C.carrot}"/><circle cx="${cx + 20}" cy="${ry + 1}" r="2.6" fill="${C.tomato}"/><circle cx="${cx - 11}" cy="${ry + 2}" r="3" fill="${C.leafDark}"/><circle cx="${cx + 13}" cy="${ry - 2}" r="2.4" fill="${C.bowlDark}"/>` +
          // frusta: fili che entrano nella ciotola, manico in alto (il pugno lo copre a metà)
          wires.map(([x, y]) => `<path d="M${hx - 8},${hy + 5} Q${hx - 8 + x * 0.3},${hy + 5 + y * 0.6} ${hx + x},${hy + y}" stroke="${C.line}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`).join('') +
          wires.map(([x, y]) => `<path d="M${hx - 8},${hy + 5} Q${hx - 8 + x * 0.3},${hy + 5 + y * 0.6} ${hx + x},${hy + y}" stroke="${C.steel}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`).join('') +
          `<path d="M${hx + 1},${hy - 33} L${hx - 8},${hy + 5}" stroke="${C.line}" stroke-width="6.4" stroke-linecap="round"/>` +
          `<path d="M${hx + 1},${hy - 33} L${hx - 8},${hy + 5}" stroke="${C.steel}" stroke-width="3" stroke-linecap="round"/>`,
      );
    }
    case 'cloche': {
      // cloche d'argento sul vassoio, tenuta da sotto con la mano destra; il vapore verde sale ondeggiando
      const steam = (x1: number, y1: number, x2: number, y2: number) => {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return `<path d="M${hx + x1},${hy + y1} Q${hx + mx + 4.5},${hy + (y1 + my) / 2} ${hx + mx},${hy + my} Q${hx + mx - 4.5},${hy + (my + y2) / 2} ${hx + x2},${hy + y2}" stroke="${C.green}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;
      };
      return g(
        steam(18, -81, 19.7, -61) +
          steam(32, -91, 29, -56) +
          steam(46, -69, 42, -49) +
          `<ellipse cx="${hx + 4.7}" cy="${hy - 51}" rx="5.4" ry="4" fill="${C.steelDark}" ${sw(2.4)}/>` +
          `<ellipse cx="${hx + 4.7}" cy="${hy - 51}" rx="2.4" ry="1.4" fill="${C.white}"/>` +
          `<path d="M${hx - 28},${hy - 12} C${hx - 28},${hy - 56} ${hx + 41.2},${hy - 56} ${hx + 41.2},${hy - 12} Z" fill="${C.steel}" ${sw(2.8)}/>` +
          `<path d="M${hx - 19},${hy - 25} Q${hx - 14},${hy - 41} ${hx + 3},${hy - 44}" stroke="${C.white}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` +
          `<rect x="${hx - 34.5}" y="${hy - 11.5}" width="83.3" height="7" rx="3.5" fill="${C.steelLight}" ${sw(2.6)}/>`,
      );
    }
    default:
      return '';
  }
}

// ───────────────────────────── segni (emote) ─────────────────────────────

/** Perno dei segni (si accendono con una piccola scala). */
export const EMOTE_PIVOT = { x: 172, y: 40 } as const;

export function emotePart(kind: Emote, lean = 0, variant: Variant = 'classic'): string {
  const p = RIG[variant].leanPivot;
  if ((kind === 'shine' || kind === 'shineUp') && lean) return `<g transform="rotate(${-lean} ${p.x} ${p.y})">${emotePart(kind)}</g>`;
  switch (kind) {
    case 'question':
      return `<path d="M163,26 C163,15 182,14 182,25 C182,32 173,32 173,40" stroke="${C.question}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="173" cy="49" r="3.4" fill="${C.question}"/>`;
    case 'sparkles':
      return (
        `<path d="M172,40 L177,31 M180,50 L190,47 M175,60 L183,64" stroke="${C.star}" stroke-width="4" stroke-linecap="round"/>` +
        `<path d="M30,40 L25,32 M22,50 L13,48 M27,59 L20,64" stroke="${C.star}" stroke-width="4" stroke-linecap="round"/>`
      );
    case 'shine':
      // tre tratti gialli solo a destra, sopra l'oggetto (foglio di Mina Chef)
      return `<path d="M170.6,36.5 L168.4,46.8 M187.6,46.8 L179,54.8 M184,67.6 L194,67.2" stroke="${C.shine}" stroke-width="5" stroke-linecap="round"/>`;
    case 'shineUp':
      // tre tratti sopra la cartellina (posa «checklist»)
      return `<path d="M172.5,36 L176,50.5 M193.5,35.5 L188.5,51.5 M205.5,56 L197,61.5" stroke="${C.shine}" stroke-width="5" stroke-linecap="round"/>`;
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
  /** Lunghezze proprie di braccio e avambraccio per questa posa (nel foglio di Mina Chef variano da posa a posa). */
  len?: ArmLen;
  /** Gomito verso il corpo invece che verso l'esterno (solo per `armTo`). */
  flip?: boolean;
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
export function armTo(side: Side, x: number, y: number, extra: Partial<ArmPose> = {}, variant: Variant = 'classic'): ArmPose {
  const s = RIG[variant].shoulder[side];
  const [a, b] = segs(variant, extra.len);
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
  const deg = (v: number) => (v * 180) / Math.PI;
  const phi = deg(Math.atan2(-dx, dy)); // rotazione oraria del vettore "giù" verso il bersaglio
  const alpha = deg(Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)))));
  const upper = (side === 'L') !== Boolean(extra.flip) ? phi + alpha : phi - alpha;
  const ex = s.x - a * Math.sin((upper * Math.PI) / 180);
  const ey = s.y + a * Math.cos((upper * Math.PI) / 180);
  const fore = deg(Math.atan2(-(s.x + dx - ex), s.y + dy - ey)) - upper;
  const norm = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
  const pose = side === 'L' ? { out: norm(upper), bend: norm(-fore) } : { out: norm(-upper), bend: norm(fore) };
  return { ...pose, ...extra };
}

export function armStatic(side: Side, pose: ArmPose, pass: 'outline' | 'fill', variant: Variant = 'classic'): string {
  const s = RIG[variant].shoulder[side];
  const e = elbowRest(side, variant, pose.len);
  const r = armRotations(side, pose);
  return (
    `<g transform="rotate(${r.upper.toFixed(1)} ${s.x} ${s.y})">` +
    upperArmPart(side, pass, variant, pose.len) +
    `<g transform="rotate(${r.fore.toFixed(1)} ${e.x} ${e.y})">${foreArmPart(side, pass, pose.prop ?? 'none', propLocalRotation(side, pose), variant, pose.len)}</g>` +
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
  /** Spostamento orizzontale di tutta la figura (pose con oggetti larghi, es. la cloche: resta dentro il riquadro). */
  shift?: number;
  /** Mina Chef: fiocco del grembiule visibile (nel foglio si vede solo quando il braccio sinistro non lo copre). */
  bow?: boolean;
}

/** Mina intera in un solo SVG (versione statica: righe piccole, "Riduci movimento", esportazioni). */
export function minaStaticSvg(look: MinaLook, opts: { shadow?: boolean; viewBox?: string } = {}): string {
  const v = look.variant;
  const pivot = RIG[v].leanPivot;
  const lean = look.lean ?? 0;
  return svg(
    `<g transform="translate(${look.shift ?? 0} 0)">` +
      (opts.shadow === false ? '' : shadowPart(v)) +
      `<g transform="rotate(${lean} ${pivot.x} ${pivot.y})">` +
      legsPart(look.legs, v) +
      bodyPart(v, { bow: look.bow }) +
      (v === 'chef' ? hatPart() : '') +
      eyesPart(look.eyes, v) +
      mouthPart(look.mouth, v) +
      armStatic('L', look.armL, 'outline', v) +
      armStatic('R', look.armR, 'outline', v) +
      armStatic('L', look.armL, 'fill', v) +
      armStatic('R', look.armR, 'fill', v) +
      (look.emote ? emotePart(look.emote, lean, v) : '') +
      `</g></g>`,
    opts.viewBox,
  );
}
