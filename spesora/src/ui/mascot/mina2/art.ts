/**
 * Mina 2.0 — la borsetta della spesa, mascotte di MINA (e la variante Mina Chef).
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
export type Prop = 'none' | 'fist' | 'grip' | 'spoon' | 'phone' | 'list' | 'clipboard' | 'whisk' | 'bowl' | 'cloche';
export type Emote = 'question' | 'sparkles' | 'hearts' | 'bang' | 'shine' | 'shineUp';
export type Legs = 'stand' | 'walk';
export type Side = 'L' | 'R';

const LW = 2.4; // contorno del corpo (foglio: circa 2,3 unità; prima era più pesante)
const sw = (w: number, color: string = C.line) => `stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Avvolge un frammento in un SVG a tutto riquadro (stesse coordinate per tutti i livelli). */
export function svg(inner: string, viewBox = VIEWBOX): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
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
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${sw(2.1)}/>`;
}

// ───────────────────────────── scheletro (per variante) ─────────────────────────────

export const FEET_Y = 197;

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

/**
 * UN SOLO scheletro per Mina 2.0 e Mina Chef (V4): stesso corpo, stesse spalle, stesse braccia, stessi piedi.
 * Mina Chef è Mina 2.0 con cappello, grembiule e oggetti da cucina: cambia solo `hatPivot` (base del cappello).
 * Braccia lunghe abbastanza da stare distese lungo i fianchi (22 + 21 unità, mano fino al fondo della borsa):
 * a riposo sono quasi dritte, si piegano solo nei gesti.
 */
const BASE_RIG: Rig = { shoulder: { L: { x: 43, y: 123 }, R: { x: 157, y: 127.5 } }, upper: 22, fore: 21, eyesCenter: { x: 112.8, y: 105 }, bodyPivot: { x: 104, y: FEET_Y }, hatPivot: { x: 100, y: 80 }, leanPivot: { x: 104, y: FEET_Y } };
export const RIG: Record<Variant, Rig> = { classic: BASE_RIG, chef: BASE_RIG };

/** Perno di tutto il corpo di Mina 2.0 (compatibilità). */
export const BODY_PIVOT = RIG.classic.bodyPivot;

export function shadowPart(variant: Variant = 'classic'): string {
  void variant; // stessa ombra per Mina 2.0 e Mina Chef
  return `<ellipse cx="104" cy="${FEET_Y + 2}" rx="66" ry="6.5" fill="${C.shadow}"/>`;
}

export function legsPart(legs: Legs = 'stand', variant: Variant = 'classic'): string {
  void variant; // stesse gambe per Mina 2.0 e Mina Chef
  // gambe corte e piene come nel foglio (spessore circa 18 unità, piedi a terra poco sotto la borsa)
  const leg = (x1: number, x2: number, y2: number, fx: number, dir: number) =>
    `<path d="M${x1},166 L${x2},${y2}" ${sw(18)} fill="none"/>` +
    `<path d="M${x1},166 L${x2},${y2}" stroke="${C.green}" stroke-width="13.4" stroke-linecap="round" fill="none"/>` +
    // scarponcino arrotondato che punta verso l'esterno
    `<path d="M${fx - 10 * dir},${FEET_Y - 1} C${fx - 11 * dir},${FEET_Y - 11} ${fx + 7 * dir},${FEET_Y - 12} ${fx + 13 * dir},${FEET_Y - 4} C${fx + 15 * dir},${FEET_Y + 1} ${fx - 9 * dir},${FEET_Y + 4} ${fx - 10 * dir},${FEET_Y - 1} Z" fill="${C.green}" ${sw(2.3)}/>`;
  return legs === 'walk' ? leg(80, 76, FEET_Y - 8, 72, -1) + leg(121, 135, FEET_Y - 9, 140, 1) : leg(83, 82, FEET_Y - 8, 78, -1) + leg(122, 123, FEET_Y - 8, 127, 1);
}

// ───────────────────────────── Mina 2.0: borsa ─────────────────────────────

/** Scatola vista di tre quarti: più larga che alta, angoli arrotondati, fianco sinistro visibile. */
const BOX = 'M43,80 L155,79 Q161,79 161,85 L157.5,160 Q157,172 145,172 L55,173 Q43.5,173 43,161 L37,86 Q37,80 43,80 Z';
const SIDE = 'M43,80 L58,80 L60,173 L55,173 Q43.5,173 43,161 L37,86 Q37,80 43,80 Z';
const HANDLE = 'M71,88 L71,50 A32,32 0 0 1 135,50 L135,88';
/*
 * Fronte della borsa: colore pieno + tre fasce basse semitrasparenti che seguono i bordi (sfumatura leggera, senza id).
 * V4: prima era un gradiente con id fisso («mina2-front»). Con più Mina nella stessa pagina (schede precaricate sul web)
 * tutti i riferimenti url(#…) puntavano al PRIMO gradiente del documento; se stava in una parte nascosta il riempimento
 * spariva e il corpo restava trasparente: manico, pane e carota si vedevano attraverso. Niente id = niente collisioni.
 */
const edgeL = (y: number) => 37 + ((y - 86) * 6) / 75; // bordo sinistro del fronte (da 37,86 a 43,161)
const edgeR = (y: number) => 161 - ((y - 85) * 3.5) / 75; // bordo destro (da 161,85 a 157.5,160)
const FRONT_SHADE = [112, 134, 154]
  .map((y) => `<path d="M${edgeL(y).toFixed(1)},${y} L${edgeR(y).toFixed(1)},${y} L157.5,160 Q157,172 145,172 L55,173 Q43.5,173 43,161 Z" fill="${C.ivoryLow}" fill-opacity="0.34"/>`)
  .join('');

function veggiesBack(): string {
  const vein = (d: string, color: string = C.leafDark) => `<path d="${d}" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  return (
    // lattuga riccia che esce dall'angolo in alto a sinistra
    // lattuga (foglio): due foglie ricce dietro l'angolo in alto a sinistra, che sporgono fin quasi al bordo
    // V4: più raccolta dietro l'angolo della borsa, così il braccio sinistro alzato non la attraversa
    `<g transform="translate(12 -8)">` +
    frilly(26, 89, 14, 12.5, -25, 9, 0.17, C.lettuce) +
    frilly(14, 102, 12, 10, 15, 8, 0.18, C.lettuce) +
    vein('M42,96 C33,92 25,89 15,87 M29,91 L24,81 M26,100 L12,106') +
    `</g>` +
    // foglie scure (spinaci) dietro al pane
    `<path d="M62,88 C55,74 57,56 64,46 C68,55 72,67 71,84 Z" fill="${C.spinach}" ${sw(2)}/>` +
    `<path d="M69,88 C67,72 71,59 78,52 C78,65 76,77 75,88 Z" fill="${C.spinach}" ${sw(2)}/>` +
    // ciuffo della carota: foglie ricce verde chiaro
    // carota e ciuffo spostati fuori dal montante destro del manico: il manico non li attraversa più
    `<g transform="translate(9 0)">` +
    frilly(151, 45, 11, 17, -20, 8, 0.15, C.leaf) +
    frilly(167, 44, 11, 16, 30, 8, 0.15, C.leaf) +
    frilly(160, 59, 10, 10, 0, 8, 0.15, C.leaf) +
    vein('M150,72 L156,32 M154,64 L170,32 M152,62 L161,52') +
    `<path d="M135,92 C133,75 138,61 147,56 C155,52 162,58 161,66 C159,79 153,88 150,93 Z" fill="${C.carrot}" ${sw(2.1)}/>` +
    `<path d="M142,68 L150,69 M140,78 L148,79" stroke="${C.carrotDark}" stroke-width="1.8" stroke-linecap="round"/>` +
    `</g>` +
    `<circle cx="69" cy="79" r="6" fill="${C.radish}" ${sw(1.9)}/>`
  );
}

function handlePart(): string {
  return `<path d="${HANDLE}" stroke="${C.line}" stroke-width="13.5" fill="none" stroke-linecap="round"/>` + `<path d="${HANDLE}" stroke="${C.green}" stroke-width="8.9" fill="none" stroke-linecap="round"/>`;
}

function veggiesFront(): string {
  const calyx = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? 10 : 3.8;
    return `${(103 + r * Math.cos(a)).toFixed(1)},${(52 + r * Math.sin(a) * 0.6).toFixed(1)}`;
  }).join(' ');
  // il pomodoro sta dentro l'apertura (la metà bassa è nascosta dal fronte della borsa), tra le gambe del manico
  const tomato =
    // dentro l'arco del manico, senza toccarne i montanti (bordo interno a x 78 e 128)
    `<ellipse cx="103" cy="68" rx="19.5" ry="17" fill="${C.tomato}" ${sw(2.2)}/>` +
    `<ellipse cx="112.5" cy="59.5" rx="4.4" ry="2.4" fill="${C.tomatoLight}" transform="rotate(-25 112.5 59.5)"/>` +
    `<path d="M103,52 L104,44" ${sw(2.2)}/>` +
    `<polygon points="${calyx}" fill="${C.calyx}" ${sw(1.8)}/>`;
  // la baguette sull'asse del foglio: esce dall'angolo in alto a sinistra e la sua base è dentro la borsa
  const bread =
    // spostata a sinistra: la sua base entra nella borsa fuori dal montante sinistro del manico
    `<g transform="translate(-7 3) rotate(-39 57 57)">` +
    `<rect x="45.5" y="15" width="23" height="86" rx="11.5" fill="${C.bread}" ${sw(2.2)}/>` +
    `<path d="M50,31 Q57,27 64,29 M50,46 Q57,42 64,44 M50,61 Q57,57 64,59" stroke="${C.breadMark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `</g>`;
  return bread + tomato;
}

function panelPart(): string {
  return (
    `<path d="${BOX}" fill="${C.ivory}"/>` +
    FRONT_SHADE +
    `<path d="${SIDE}" fill="${C.ivoryShade}"/>` +
    `<path d="M58,85 C58.5,110 59,140 60.5,166" stroke="${C.crease}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    // foglia del foglio: verde chiaro, senza contorno, una sola venatura bianca curva che esce come picciolo
    `<g transform="translate(112 151) scale(1.12)">` +
    `<path d="M-12,10 C-15,-4 -2,-13 14,-11 C13,4 2,13 -12,10 Z" fill="${C.leaf}"/>` +
    `<path d="M-17,15 Q-4,4 9,-7" stroke="${C.white}" stroke-width="2.3" fill="none" stroke-linecap="round"/>` +
    `</g>`
  );
}

export const CHEEK_L = { x: 77.5, y: 120.5 } as const;
export const CHEEK_R = { x: 147, y: 119 } as const;

// ───────────────────────────── Mina Chef: borsa, grembiule, cappello ─────────────────────────────

/*
 * Mina Chef (V4) = Mina 2.0 con gli accessori da cucina. Stessa borsa, stesso viso, stesse braccia e gambe:
 * il cappello poggia sull'apertura (copre manico, pane e pomodoro; ai lati sporgono lattuga e carota) e il
 * grembiule verde copre il terzo basso del fronte, con la foglia bianca e il fiocco sul bordo sinistro.
 */
const APRON = 'M59.5,140.5 Q108,136.5 158.4,139.8 L157.5,160 Q157,172 145,172 L61,173 Z';

function chefBodyPart(bow: boolean, apron = true): string {
  return (
    veggiesBack() +
    panelPart() +
    `<ellipse cx="${CHEEK_L.x}" cy="${CHEEK_L.y}" rx="8.6" ry="5.4" fill="${C.cheek}" opacity="0.9"/>` +
    `<ellipse cx="${CHEEK_R.x}" cy="${CHEEK_R.y}" rx="8.6" ry="5.4" fill="${C.cheek}" opacity="0.9"/>` +
    `<path d="${BOX}" fill="none" ${sw(LW)}/>` +
    // grembiule (livello a parte nella trasformazione, dove compare con una maschera)
    (apron ? apronPart(bow) : '')
  );
}

/** Grembiule di Mina Chef sul fronte della borsa di Mina 2.0: telo verde, foglia bianca, fiocco sul bordo sinistro. */
export function apronPart(bow = true): string {
  return (
    `<path d="${APRON}" fill="${C.green}" ${sw(2)}/>` +
    `<g transform="translate(110 157) scale(0.86)">` +
    `<path d="M-12,10 C-15,-4 -2,-13 14,-11 C13,4 2,13 -12,10 Z" fill="${C.white}"/>` +
    `<path d="M-17,15 Q-4,4 9,-7" stroke="${C.green}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `</g>` +
    (bow ? chefBow() : '')
  );
}

/** Area occupata dal grembiule (fiocco compreso), per la maschera che lo rivela. */
export const APRON_BOX = { top: 134, bottom: 178, left: 38, right: 160 } as const;

function chefBow(): string {
  return (
    `<g transform="translate(-5 -7)">` +
    `<path d="M63.5,163 C57,165 51,168 47.5,172.5 L54.5,181.5 L57.8,176 L60.5,181 C62.5,176 64,169 65.5,164 Z" fill="${C.green}" ${sw(1.9)}/>` +
    `<path d="M62,155.5 C57,151 50,150.5 47,155.5 C45.5,159.5 49,164 55,163.5 C58,163.3 61,162 62.5,160.5 Z" fill="${C.green}" ${sw(1.9)}/>` +
    `<path d="M51,157.5 Q55,157.5 59,159.5" stroke="${C.line}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `<ellipse cx="63" cy="158" rx="5.4" ry="6.6" fill="${C.green}" ${sw(1.9)}/>` +
    `</g>`
  );
}

/** Corpo completo. Mina 2.0: verdure, manico, borsa con la foglia, guance, contorno. Mina Chef: vedi chefBodyPart. */
export function bodyPart(variant: Variant, opts: { bow?: boolean; apron?: boolean } = {}): string {
  if (variant === 'chef') return chefBodyPart(opts.bow ?? true, opts.apron ?? true);
  // livelli come nel foglio: foglie dietro, ingredienti nell'apertura, manico davanti agli ingredienti (è cucito
  // sul fronte), infine il fronte della borsa che nasconde la parte bassa di ogni ingrediente
  return (
    veggiesBack() +
    veggiesFront() +
    handlePart() +
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
    [66, 46, 17],
    [88, 30, 20],
    [114, 30, 19.5],
    [136, 45, 16.5],
    [101, 46, 16],
    [79, 50, 12.5],
    [123, 50, 12.5],
  ];
  return (
    lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.white}" ${sw(2)}/>`).join('') +
    // ombra in basso a ogni lobo: cerchio grigio, poi cerchio bianco spostato in alto
    lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${(r - 1.6).toFixed(1)}" fill="${C.hatShade}"/>`).join('') +
    lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${(y - 2.6).toFixed(1)}" r="${(r - 4.4).toFixed(1)}" fill="${C.white}"/>`).join('') +
    // fascia che poggia sull'apertura della borsa (copre manico e ingredienti al centro)
    `<path d="M53,62 Q100,53 147,62 L148,84 Q100,76 52,84 Z" fill="${C.white}"/>` +
    `<path d="M53.4,62.4 Q100,53.6 146.6,62.4 L146.8,67 Q100,59 53.2,67 Z" fill="${C.hatShade}"/>` +
    `<path d="M53,62 Q100,53 147,62 L148,84 Q100,76 52,84 Z" fill="none" ${sw(2)}/>`
  );
}

// ───────────────────────────── volto ─────────────────────────────

/** Il viso di Mina 2.0 sta al centro del fronte (a destra della piega), come nel foglio. */
export const EYE_L = { x: 91, y: 105.5 } as const;
export const EYE_R = { x: 134.5, y: 104.5 } as const;
export const MOUTH = { x: 113, y: 119.5 } as const;
/** Centro degli occhi di Mina 2.0 (perno del battito di ciglia). */
export const EYES_CENTER = RIG.classic.eyesCenter;

function eye(kind: Eyes, x: number, y: number, side: Side, chef = false): string {
  const s = `stroke="${C.eye}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  switch (kind) {
    case 'open':
      // ovali scuri senza riflessi, come nel foglio
      return `<ellipse cx="${x}" cy="${y}" rx="6.3" ry="10.2" fill="${C.eye}"/>`;
    case 'surprised':
      return `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="7.8" fill="${C.eye}"/>`;
    case 'happy':
      return `<path d="M${x - 7.4},${y + 3.5} Q${x},${y - 8} ${x + 7.4},${y + 3.5}" ${s}/>`;
    case 'closed':
      return `<path d="M${x - 7.4},${y - 1} Q${x},${y + 6} ${x + 7.4},${y - 1}" ${s}/>`;
    case 'wink':
      if (side === 'L') return eye('open', x, y, side, chef);
      // Mina Chef strizza l'occhio con una «<», come nel foglio; Mina 2.0 con un arco
      return chef ? `<path d="M${x + 7},${y - 7} L${x - 5.2},${y} L${x + 7},${y + 7}" ${s}/>` : `<path d="M${x - 7.4},${y + 2.5} Q${x},${y - 7} ${x + 7.4},${y - 2}" ${s}/>`;
    case 'laugh':
      return side === 'L' ? `<path d="M${x - 7},${y - 7} L${x + 5.2},${y} L${x - 7},${y + 7}" ${s}/>` : `<path d="M${x + 7},${y - 7} L${x - 5.2},${y} L${x + 7},${y + 7}" ${s}/>`;
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

/** Occhi: stesso viso per Mina 2.0 e Mina Chef (lo chef strizza l'occhio con la «<» del suo foglio). */
export function eyesPart(kind: Eyes, variant: Variant = 'classic'): string {
  const chef = variant === 'chef';
  return eye(kind, EYE_L.x, EYE_L.y, 'L', chef) + eye(kind, EYE_R.x, EYE_R.y, 'R', chef);
}

function mouthShape(kind: Mouth): string {
  const { x, y } = MOUTH;
  switch (kind) {
    case 'smile':
      return (
        `<path d="M${x - 12.5},${y - 6} Q${x},${y - 4} ${x + 12.5},${y - 6} Q${x + 12},${y + 12.5} ${x},${y + 13} Q${x - 12},${y + 12.5} ${x - 12.5},${y - 6} Z" fill="${C.mouth}" ${sw(2.1)}/>` +
        `<path d="M${x - 8.5},${y + 7} Q${x},${y - 0.5} ${x + 8.5},${y + 7} Q${x + 5},${y + 12} ${x},${y + 12} Q${x - 5},${y + 12} ${x - 8.5},${y + 7} Z" fill="${C.tongue}"/>`
      );
    case 'grin':
      return (
        `<path d="M${x - 15},${y - 7} Q${x},${y - 4} ${x + 15},${y - 7} Q${x + 14},${y + 14} ${x},${y + 14.5} Q${x - 14},${y + 14} ${x - 15},${y - 7} Z" fill="${C.mouth}" ${sw(2.1)}/>` +
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

/** Bocca: la stessa per le due varianti. */
export function mouthPart(kind: Mouth, variant: Variant = 'classic'): string {
  void variant;
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
const armWidth = (variant: Variant): [number, number] => {
  void variant; // stesse braccia per le due varianti
  return [11.2, 7.2];
};

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
  const grow = pass === 'outline' ? 2 : 0;
  void variant;
  const k = 0.92;
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
    case 'grip':
      // pugno chiuso che stringe qualcosa del corpo (il laccio del grembiule): nessun oggetto da disegnare
      return '';
    case 'fist':
      // pollice in su, verso il corpo
      return g(
        `<path d="M${hx + 1},${hy - 2} L${hx + 3.2},${hy - 8.5}" stroke="${C.line}" stroke-width="8.6" stroke-linecap="round"/>` +
          `<path d="M${hx + 1},${hy - 2} L${hx + 3.2},${hy - 8.5}" stroke="${C.green}" stroke-width="4.2" stroke-linecap="round"/>`,
      );
    case 'phone':
      return g(
        `<rect x="${hx - 12}" y="${hy - 38}" width="24" height="42" rx="5" fill="${C.green}" ${sw(2.1)}/>` +
          `<rect x="${hx - 8.5}" y="${hy - 33.5}" width="17" height="31" rx="3" fill="${C.greenLight}"/>` +
          `<path d="M${hx - 5},${hy - 11} C${hx - 7},${hy - 20} ${hx},${hy - 26} ${hx + 6},${hy - 26} C${hx + 6},${hy - 18} ${hx + 2},${hy - 12} ${hx - 5},${hy - 11} Z M${hx - 6},${hy - 9} L${hx + 3},${hy - 21}" fill="${C.white}" stroke="${C.white}" stroke-width="1.2" stroke-linecap="round"/>`,
      );
    case 'list': {
      const tick = (yy: number) =>
        `<path d="M${hx - 9},${yy} l3,3 l5,-6" stroke="${C.green}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hx + 1},${yy} L${hx + 10},${yy}" stroke="${C.paperLine}" stroke-width="2.6" stroke-linecap="round"/>`;
      return g(`<rect x="${hx - 15}" y="${hy - 44}" width="30" height="44" rx="3" fill="${C.paper}" ${sw(2.1)}/>` + tick(hy - 32) + tick(hy - 23) + tick(hy - 14));
    }
    case 'clipboard': {
      // cartellina verde grande (foglio di Mina Chef): la mano la tiene dal bordo destro; molletta in alto
      const tick = (yy: number) =>
        `<path d="M${hx - 43.5},${yy} L${hx - 39.5},${yy + 4.5} L${hx - 31},${yy - 5.5}" stroke="${C.check}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M${hx - 27},${yy + 1} L${hx - 11},${yy + 1.6}" stroke="${C.paperLine}" stroke-width="3.4" stroke-linecap="round"/>`;
      return g(
        `<rect x="${hx - 53.4}" y="${hy - 43.1}" width="54.2" height="76.6" rx="6" fill="${C.green}" ${sw(2.1)}/>` +
          `<rect x="${hx - 48.4}" y="${hy - 38.1}" width="44.2" height="66.6" rx="3" fill="${C.paper}" ${sw(1.6)}/>` +
          `<rect x="${hx - 32.5}" y="${hy - 53}" width="10" height="8" rx="3.5" fill="${C.green}" ${sw(2.1)}/>` +
          `<rect x="${hx - 38.5}" y="${hy - 48.3}" width="22" height="10" rx="3" fill="${C.green}" ${sw(2.1)}/>` +
          tick(hy - 20.5) +
          tick(hy - 2) +
          tick(hy + 15),
      );
    }
    case 'whisk':
    case 'bowl': {
      // frusta d'acciaio tenuta col manico in su; i fili scendono nella ciotola (ferma, disegnata a parte)
      const wires = [
        [-21, 38],
        [-13, 41],
        [-5, 40],
        [2, 35],
      ];
      return g(
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
          `<ellipse cx="${hx + 4.7}" cy="${hy - 51}" rx="5.4" ry="4" fill="${C.steelDark}" ${sw(2.1)}/>` +
          `<ellipse cx="${hx + 4.7}" cy="${hy - 51}" rx="2.4" ry="1.4" fill="${C.white}"/>` +
          `<path d="M${hx - 28},${hy - 12} C${hx - 28},${hy - 56} ${hx + 41.2},${hy - 56} ${hx + 41.2},${hy - 12} Z" fill="${C.steel}" ${sw(2.1)}/>` +
          `<path d="M${hx - 19},${hy - 25} Q${hx - 14},${hy - 41} ${hx + 3},${hy - 44}" stroke="${C.white}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` +
          `<rect x="${hx - 34.5}" y="${hy - 11.5}" width="83.3" height="7" rx="3.5" fill="${C.steelLight}" ${sw(2.1)}/>`,
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
  /** Il punto (centro del palmo) chiesto ad `armTo`: i gesti calcolano le traiettorie della mano da qui. */
  at?: { x: number; y: number };
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
 * Cinematica inversa a due segmenti: la posa che porta il centro del palmo in (x, y) con il gomito verso l'esterno.
 * Il palmo sta 3 unità oltre il polso, lungo l'avambraccio: si risolve con l'avambraccio allungato di 3 unità.
 * Le pose si descrivono così con la posizione della mano (più leggibile e sempre raggiungibile).
 */
export function armTo(side: Side, x: number, y: number, extra: Partial<ArmPose> = {}, variant: Variant = 'classic'): ArmPose {
  const s = RIG[variant].shoulder[side];
  const [a, b0] = segs(variant, extra.len);
  const b = b0 + 3;
  let dx = x - s.x;
  let dy = y - s.y;
  let d = Math.hypot(dx, dy);
  const max = a + b - 0.15;
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
  return { ...pose, at: { x, y }, ...extra };
}

// ───────────────────────────── braccio: braccio + avambraccio rigidi, gomito arrotondato ─────────────────────────────

export interface Pt {
  x: number;
  y: number;
}

/**
 * Un fotogramma del braccio: spalla, gomito e polso dallo scheletro (due segmenti di lunghezza fissa) e la direzione
 * della mano. Il braccio è UN SOLO tracciato: braccio e avambraccio dritti, raccordati al gomito da una curva
 * (gomito stilizzato), disegnato prima tutto il contorno e poi tutto il riempimento: il contorno esterno resta
 * continuo e la giunzione non si vede mai. Le forme non si deformano: ruotano attorno a spalla e gomito.
 */
export interface ArmFrame {
  s: Pt;
  e: Pt;
  w: Pt;
  c: Pt;
  /** Rotazione della mano (gradi, orari, 0 = rivolta in giù) lungo la tangente finale della curva. */
  hand: number;
  /** Centro del palmo (dove si tengono gli oggetti). */
  palm: Pt;
}

const rad = (d: number) => (d * Math.PI) / 180;

export function armFrame(side: Side, upper: number, fore: number, variant: Variant, len?: ArmLen): ArmFrame {
  const s = RIG[variant].shoulder[side];
  const [a, b] = segs(variant, len);
  const e = { x: s.x - a * Math.sin(rad(upper)), y: s.y + a * Math.cos(rad(upper)) };
  const t = upper + fore;
  const w = { x: e.x - b * Math.sin(rad(t)), y: e.y + b * Math.cos(rad(t)) };
  // la mano prosegue l'avambraccio (è attaccata al polso e ruota con lui, mai da sola)
  const hand = t;
  const palm = { x: w.x - 3 * Math.sin(rad(hand)), y: w.y + 3 * Math.cos(rad(hand)) };
  return { s, e, w, c: e, hand, palm };
}

/** Fotogramma della posa finale di un braccio. */
export function poseFrame(side: Side, pose: ArmPose, variant: Variant): ArmFrame {
  const r = armRotations(side, pose);
  return armFrame(side, r.upper, r.fore, variant, pose.len);
}

/**
 * Tracciato del braccio: spalla → braccio dritto → curva del gomito → avambraccio dritto → polso. Il raggio della
 * curva è una frazione del segmento più corto: più il gomito si piega, più la curva si vede (come nel foglio).
 */
export function tubeD(f: ArmFrame): string {
  const n = (v: number) => v.toFixed(2);
  const lu = Math.hypot(f.e.x - f.s.x, f.e.y - f.s.y);
  const lf = Math.hypot(f.w.x - f.e.x, f.w.y - f.e.y);
  // gomito morbido: la curva occupa quasi tutto il segmento più corto, quindi un braccio piegato è un arco
  // continuo (mai uno spigolo) e un braccio disteso resta una linea dritta
  const r = 0.9 * Math.min(lu, lf);
  const p1 = { x: f.e.x + ((f.s.x - f.e.x) * r) / (lu || 1), y: f.e.y + ((f.s.y - f.e.y) * r) / (lu || 1) };
  const p2 = { x: f.e.x + ((f.w.x - f.e.x) * r) / (lf || 1), y: f.e.y + ((f.w.y - f.e.y) * r) / (lf || 1) };
  return `M${n(f.s.x)},${n(f.s.y)} L${n(p1.x)},${n(p1.y)} Q${n(f.e.x)},${n(f.e.y)} ${n(p2.x)},${n(p2.y)} L${n(f.w.x)},${n(f.w.y)}`;
}

export function tubeStyle(variant: Variant, pass: 'outline' | 'fill') {
  const [wo, wi] = armWidth(variant);
  return pass === 'outline' ? { stroke: C.line, width: wo } : { stroke: C.green, width: wi };
}

function tubeSvg(f: ArmFrame, variant: Variant, pass: 'outline' | 'fill'): string {
  const st = tubeStyle(variant, pass);
  return `<path d="${tubeD(f)}" stroke="${st.stroke}" stroke-width="${st.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
}

/**
 * Dove sta l'oggetto rispetto al braccio:
 * - `under`: sotto tutto (il manico passa dietro il pugno: cucchiaio, frusta, lista, telefono, pollice);
 * - `between`: sopra il braccio e sotto la mano (la cartellina copre il braccio, la mano la stringe dal bordo);
 * - `over`: sopra la mano (il vassoio della cloche, tenuto da sotto).
 */
export function propLayer(prop: Prop): 'under' | 'between' | 'over' {
  if (prop === 'clipboard') return 'between';
  if (prop === 'cloche') return 'over';
  return 'under';
}

/** La mano disegnata a riposo (polso nel punto di riposo, rivolta in giù): si sposta e si ruota per ogni fotogramma. */
export function handRestSvg(side: Side, pass: 'outline' | 'fill', prop: Prop, variant: Variant, len?: ArmLen): string {
  const fist = prop !== 'none';
  return handShape(side, pass, fist, variant, len, prop === 'fist');
}

/** L'oggetto disegnato dritto nel centro del palmo a riposo: si sposta col palmo e ruota solo della sua inclinazione. */
export function propRestSvg(prop: Prop, side: Side, variant: Variant, len?: ArmLen): string {
  const h = handRest(side, variant, len);
  return propPart(prop, h.x, h.y + 3, 0);
}

/** Trasformazione SVG che porta la mano dal riposo al fotogramma. */
export function handPlacement(f: ArmFrame, side: Side, variant: Variant, len?: ArmLen): string {
  const h = handRest(side, variant, len);
  return `translate(${(f.w.x - h.x).toFixed(2)} ${(f.w.y - h.y).toFixed(2)}) rotate(${f.hand.toFixed(2)} ${h.x} ${h.y})`;
}

/** Trasformazione SVG che porta l'oggetto dal palmo a riposo al palmo del fotogramma, dritto più la sua inclinazione. */
export function propPlacement(f: ArmFrame, tilt: number, side: Side, variant: Variant, len?: ArmLen): string {
  const h = handRest(side, variant, len);
  return `translate(${(f.palm.x - h.x).toFixed(2)} ${(f.palm.y - h.y - 3).toFixed(2)}) rotate(${tilt.toFixed(2)} ${h.x} ${h.y + 3})`;
}

/** Un braccio completo (tubo, mano, oggetto) nell'ordine giusto per il suo oggetto. */
export function armSvg(side: Side, pose: ArmPose, variant: Variant): string {
  const f = poseFrame(side, pose, variant);
  const prop = pose.prop ?? 'none';
  const hand = (pass: 'outline' | 'fill') => `<g transform="${handPlacement(f, side, variant, pose.len)}">${handRestSvg(side, pass, prop, variant, pose.len)}</g>`;
  const held = prop === 'none' ? '' : `<g transform="${propPlacement(f, pose.propTilt ?? 0, side, variant, pose.len)}">${propRestSvg(prop, side, variant, pose.len)}</g>`;
  const layer = propLayer(prop);
  if (layer === 'between') return tubeSvg(f, variant, 'outline') + tubeSvg(f, variant, 'fill') + held + hand('outline') + hand('fill');
  if (layer === 'over') return tubeSvg(f, variant, 'outline') + hand('outline') + tubeSvg(f, variant, 'fill') + hand('fill') + held;
  return held + tubeSvg(f, variant, 'outline') + hand('outline') + tubeSvg(f, variant, 'fill') + hand('fill');
}

/** Compatibilità: il braccio intero in un solo passaggio (il vecchio disegno a due passaggi non serve più). */
export function armStatic(side: Side, pose: ArmPose, pass: 'outline' | 'fill', variant: Variant = 'classic'): string {
  return pass === 'fill' ? armSvg(side, pose, variant) : '';
}

// ───────────────────────────── sopracciglia ─────────────────────────────

/**
 * Sopracciglia: nel foglio il viso è senza sopracciglia, quindi a riposo non si vedono (`none`). Compaiono solo per
 * recitare: `worried` (preoccupata: interni in alto), `raised` (sorpresa, contenta), `focus` (pensierosa, decisa:
 * interni in basso), `soft` (attenta).
 */
export type Brows = 'none' | 'soft' | 'worried' | 'raised' | 'focus';

function brow(kind: Brows, x: number, y: number, side: Side): string {
  const s = `stroke="${C.eye}" stroke-width="2.7" stroke-linecap="round" fill="none"`;
  const m = side === 'L' ? 1 : -1; // l'estremo interno è verso il centro del viso
  const outer = { x: x - 6.5 * m, y };
  const inner = { x: x + 5.5 * m, y };
  switch (kind) {
    case 'worried':
      return `<path d="M${outer.x},${y + 1.5} Q${x},${y - 1.5} ${inner.x},${y - 4}" ${s}/>`;
    case 'raised':
      return `<path d="M${outer.x},${y - 2} Q${x},${y - 7} ${inner.x},${y - 3}" ${s}/>`;
    case 'focus':
      // pensierosa: un sopracciglio quasi dritto e appena abbassato, l'altro alzato (aria interrogativa, non arrabbiata)
      return side === 'L' ? `<path d="M${outer.x},${y - 0.5} Q${x},${y - 2} ${inner.x},${y + 0.5}" ${s}/>` : `<path d="M${outer.x},${y - 3} Q${x},${y - 8.5} ${inner.x},${y - 4.5}" ${s}/>`;
    case 'soft':
      return `<path d="M${outer.x},${y} Q${x},${y - 3.5} ${inner.x},${y}" ${s}/>`;
    default:
      return '';
  }
}

export function browsPart(kind: Brows, variant: Variant = 'classic'): string {
  if (kind === 'none') return '';
  void variant; // stesso viso per le due varianti
  return brow(kind, EYE_L.x, EYE_L.y - 13, 'L') + brow(kind, EYE_R.x, EYE_R.y - 13, 'R');
}

// ───────────────────────────── ciotola (oggetto fermo davanti a Mina Chef) ─────────────────────────────

/** La ciotola verde con la zuppa, ferma nel corpo (la frusta in mano la mescola). (cx, ry) = centro del bordo. */
/** Ciotola in scala con Mina Chef V4 (corpo di Mina 2.0): appoggiata a terra davanti a lei. */
const BOWL_K = 0.62;

export function bowlPart(cx: number, ry: number, tilt = 0): string {
  return (
    `<g transform="rotate(${tilt} ${cx} ${ry}) translate(${cx} ${ry}) scale(${BOWL_K}) translate(${-cx} ${-ry})">` +
    `<ellipse cx="${cx}" cy="${ry + 46}" rx="16" ry="4" fill="${C.bowlDark}" ${sw(2.1)}/>` +
    `<path d="M${cx - 43},${ry} C${cx - 43},${ry + 66} ${cx + 43},${ry + 66} ${cx + 43},${ry} Z" fill="${C.bowl}" ${sw(2.1)}/>` +
    `<ellipse cx="${cx}" cy="${ry}" rx="43" ry="9.5" fill="${C.bowl}" ${sw(2.1)}/>` +
    `<ellipse cx="${cx}" cy="${ry + 1.2}" rx="37" ry="6.6" fill="${C.soup}"/>` +
    `<circle cx="${cx - 26}" cy="${ry + 3}" r="3" fill="${C.carrot}"/><circle cx="${cx + 4}" cy="${ry + 3.5}" r="2.8" fill="${C.carrot}"/><circle cx="${cx + 20}" cy="${ry + 1}" r="2.6" fill="${C.tomato}"/><circle cx="${cx - 11}" cy="${ry + 2}" r="3" fill="${C.leafDark}"/><circle cx="${cx + 13}" cy="${ry - 2}" r="2.4" fill="${C.bowlDark}"/>` +
    `</g>`
  );
}

/** Il bordo anteriore della ciotola, disegnato sopra la frusta: i fili sembrano dentro la zuppa. */
export function bowlFrontPart(cx: number, ry: number, tilt = 0): string {
  return (
    `<g transform="rotate(${tilt} ${cx} ${ry}) translate(${cx} ${ry}) scale(${BOWL_K}) translate(${-cx} ${-ry})">` +
    `<path d="M${cx - 43},${ry} C${cx - 43},${ry + 66} ${cx + 43},${ry + 66} ${cx + 43},${ry} C${cx + 43},${ry + 6.5} ${cx + 20},${ry + 9.5} ${cx},${ry + 9.5} C${cx - 20},${ry + 9.5} ${cx - 43},${ry + 6.5} ${cx - 43},${ry} Z" fill="${C.bowl}" ${sw(2.1)}/>` +
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
  /** Sopracciglia della posa (a riposo nessuna, come nel foglio). */
  brows?: Brows;
  /** Ciotola ferma davanti a Mina Chef (posa «mescola»): centro del bordo e inclinazione. */
  bowl?: { cx: number; ry: number; tilt: number };
}

/** Mina intera in un solo SVG (versione statica: righe piccole, "Riduci movimento", esportazioni). */
export function minaStaticSvg(look: MinaLook, opts: { shadow?: boolean; viewBox?: string; legs?: boolean } = {}): string {
  const v = look.variant;
  const pivot = RIG[v].leanPivot;
  const lean = look.lean ?? 0;
  const bowl = look.bowl;
  // con la ciotola: braccio destro (frusta), poi la ciotola, poi il braccio sinistro che la tiene dal bordo
  const arms = bowl
    ? armSvg('R', look.armR, v) + bowlFrontPart(bowl.cx, bowl.ry, bowl.tilt) + armSvg('L', look.armL, v)
    : armSvg('L', look.armL, v) + armSvg('R', look.armR, v);
  return svg(
    `<g transform="translate(${look.shift ?? 0} 0)">` +
      (opts.shadow === false ? '' : shadowPart(v)) +
      `<g transform="rotate(${lean} ${pivot.x} ${pivot.y})">` +
      (opts.legs === false ? '' : legsPart(look.legs, v)) +
      bodyPart(v, { bow: look.bow }) +
      (bowl ? bowlPart(bowl.cx, bowl.ry, bowl.tilt) : '') +
      (v === 'chef' ? hatPart() : '') +
      eyesPart(look.eyes, v) +
      browsPart(look.brows ?? 'none', v) +
      mouthPart(look.mouth, v) +
      arms +
      (look.emote ? emotePart(look.emote, lean, v) : '') +
      `</g></g>`,
    opts.viewBox,
  );
}
