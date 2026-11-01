/**
 * Mina — mascotte ufficiale di Spesora: il ricettario vivente.
 * Sorgente vettoriale unica per tutte le pose (app, demo web ed esportazione PNG).
 * Nessuna dipendenza: importato sia dall'app sia dagli script Node.
 *
 * Identità fissa in ogni posa: copertina avorio con rametto verde, dorso verde scuro,
 * elastico verticale, linguette laterali, segnalibro pesca, occhi scuri con ciglia,
 * guance pesca, braccia e gambe verdi. Cambiano solo espressione, braccia e accessori.
 */

/** Pose vettoriali disegnate nel codice (riserva e fonte dei PNG in assets/mascot/mina/vector). */
export const MINA_VECTOR_POSES = ['neutral', 'welcome', 'happy', 'calendar', 'shopping', 'cooking', 'recipe', 'thinking', 'pantry', 'missing', 'success', 'sleepy'] as const;
/** Tutte le pose ufficiali (16): le illustrazioni di Google Flow hanno anche saluto, spiegazione, risparmio e stato vuoto. */
export const MINA_POSES = [...MINA_VECTOR_POSES, 'wave', 'explaining', 'savings', 'empty'] as const;
export type MinaPose = (typeof MINA_POSES)[number];
export type MinaVectorPose = (typeof MINA_VECTOR_POSES)[number];

/** Per le pose senza disegno vettoriale proprio, la più vicina. */
const VECTOR_ALIAS: Record<MinaPose, MinaVectorPose> = {
  neutral: 'neutral', welcome: 'welcome', happy: 'happy', calendar: 'calendar', shopping: 'shopping', cooking: 'cooking', recipe: 'recipe',
  thinking: 'thinking', pantry: 'pantry', missing: 'missing', success: 'success', sleepy: 'sleepy',
  wave: 'welcome', explaining: 'recipe', savings: 'shopping', empty: 'pantry',
};

/** Rapporto larghezza/altezza della tavola di disegno. */
export const MINA_VIEWBOX = { width: 140, height: 156 } as const;

const C = {
  spine: '#2F5C47',
  spineLight: '#4A8468',
  cover: '#FAF6EC',
  page: '#E8E0CB',
  edge: '#D9D2C2',
  stitch: '#D3CBB8',
  leaf: '#5E8F72',
  leafLight: '#8DB580',
  sage: '#A7B897',
  ink: '#24332C',
  peach: '#E6A46D',
  peachLight: '#F3C9A2',
  band: '#386E55',
  wood: '#B98552',
  woodLight: '#CDA073',
  kraft: '#D9A978',
  paper: '#FFFDF8',
  white: '#FFFFFF',
  alert: '#C8553D',
};

type Eyes = 'open' | 'happy' | 'sleepy' | 'wink' | 'up';
type Mouth = 'smile' | 'open' | 'big' | 'small' | 'worry' | 'sleep';
interface Face {
  eyes: Eyes;
  mouth: Mouth;
  brow?: 'raised' | 'worried';
  cheeks?: number;
}

function ell(cx: number, cy: number, rx: number, ry: number, rot: number, fill: string): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/>`;
}

/** Braccio: tratto verde arrotondato dalla spalla alla mano, con piegatura laterale, e mano tonda. */
function arm(sx: number, sy: number, ex: number, ey: number, bend = 0): string {
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bend;
  const cy = my + (dx / len) * bend;
  const f = (n: number) => Number(n.toFixed(1));
  return (
    `<path d="M${sx} ${sy} Q${f(cx)} ${f(cy)} ${ex} ${ey}" stroke="${C.spine}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    `<circle cx="${ex}" cy="${ey}" r="4.8" fill="${C.spine}"/><circle cx="${ex - 1}" cy="${ey - 1.2}" r="1.6" fill="${C.spineLight}" opacity="0.7"/>`
  );
}

function leg(x: number): string {
  return `<rect x="${x}" y="108" width="9" height="30" rx="4.5" fill="${C.spine}"/><ellipse cx="${x + 4.5}" cy="140" rx="8.5" ry="4.2" fill="${C.spine}"/>`;
}

/** Corpo del ricettario (identico in ogni posa). */
function body(): string {
  const sprigs = [
    ell(43, 40, 3, 6, -25, C.leafLight),
    ell(43, 60, 3, 6, 25, C.leafLight),
    ell(43, 80, 3, 6, -25, C.leafLight),
    `<path d="M43 36 v54" stroke="${C.leafLight}" stroke-width="1.2" stroke-linecap="round"/>`,
  ].join('');
  const botanical = [
    `<path d="M75 110 q-1 -16 1 -34" stroke="${C.leaf}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    ell(66, 96, 8, 3.8, -35, C.leaf),
    ell(85, 92, 9, 4, 35, C.leaf),
    ell(67, 82, 7, 3.4, -50, C.leafLight),
    ell(84, 78, 7, 3.4, 48, C.leafLight),
    ell(76, 70, 3.6, 7.2, 0, C.leaf),
  ].join('');
  return (
    // ombra a terra
    `<ellipse cx="75" cy="147" rx="34" ry="4" fill="${C.ink}" opacity="0.09"/>` +
    leg(60) +
    leg(82) +
    // pagine e copertina
    `<rect x="46" y="16" width="62" height="102" rx="9" fill="${C.page}"/>` +
    `<rect x="44" y="14" width="62" height="102" rx="9" fill="${C.cover}" stroke="${C.edge}" stroke-width="1.2"/>` +
    `<rect x="53" y="22" width="44" height="86" rx="5" fill="none" stroke="${C.stitch}" stroke-width="1" stroke-dasharray="3 2.5"/>` +
    `<g transform="translate(0 7)">${botanical}</g>` +
    // dorso
    `<rect x="34" y="12" width="18" height="106" rx="8" fill="${C.spine}"/><rect x="36" y="14" width="3" height="102" rx="1.5" fill="${C.spineLight}" opacity="0.55"/>` +
    sprigs +
    // elastico e linguette
    `<rect x="98" y="10" width="7" height="110" rx="2.5" fill="${C.band}"/><rect x="99.5" y="10" width="1.6" height="110" fill="${C.spineLight}" opacity="0.6"/>` +
    `<rect x="104" y="33" width="10" height="17" rx="3" fill="${C.peach}"/>${ell(109, 41.5, 2, 4, 30, C.paper)}` +
    `<rect x="104" y="56" width="10" height="17" rx="3" fill="${C.sage}"/><circle cx="109" cy="62" r="1.8" fill="${C.paper}"/><rect x="108.2" y="63" width="1.6" height="6" rx="0.8" fill="${C.paper}"/>` +
    // segnalibro
    `<path d="M62 114 v16 l5.5 -4.2 l5.5 4.2 v-16 z" fill="${C.peach}"/>`
  );
}

function eyes(kind: Eyes): string {
  const L = 65;
  const R = 85;
  const y = 46;
  const lash = (x: number, dir: number) => `<path d="M${x + dir * 4.6} ${y - 3.4} l${dir * 3} -2.2" stroke="${C.ink}" stroke-width="1.3" stroke-linecap="round"/>`;
  const open = (x: number, dx = 0, dy = 0) =>
    `<ellipse cx="${x}" cy="${y}" rx="4.3" ry="5.3" fill="${C.ink}"/><circle cx="${x + 1.5 + dx}" cy="${y - 1.8 + dy}" r="1.5" fill="#fff"/><circle cx="${x - 1.4 + dx}" cy="${y + 2 + dy}" r="0.7" fill="#fff" opacity="0.8"/>`;
  const arc = (x: number, up: boolean) => `<path d="M${x - 4.8} ${y + (up ? 1.5 : -1)} q4.8 ${up ? -7 : 7} 9.6 0" stroke="${C.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  switch (kind) {
    case 'happy':
      return arc(L, true) + arc(R, true);
    case 'sleepy':
      return arc(L, false) + arc(R, false);
    case 'wink':
      return arc(L, true) + open(R) + lash(R, 1);
    case 'up':
      return open(L, 1.2, -1.2) + open(R, 1.2, -1.2) + lash(L, -1) + lash(R, 1);
    default:
      return open(L) + open(R) + lash(L, -1) + lash(R, 1);
  }
}

function mouth(kind: Mouth): string {
  const x = 75;
  const y = 58;
  switch (kind) {
    case 'big':
      return `<path d="M${x - 7} ${y - 1} q7 11 14 0 z" fill="${C.ink}"/><path d="M${x - 3.6} ${y + 5} q3.6 2.6 7.2 0 q-3.6 -2.2 -7.2 0z" fill="${C.alert}" opacity="0.85"/>`;
    case 'open':
      return `<path d="M${x - 5.5} ${y} q5.5 8.5 11 0 z" fill="${C.ink}"/>`;
    case 'small':
      return `<path d="M${x - 4.5} ${y + 0.5} q4.5 4 9 0" stroke="${C.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case 'worry':
      return `<path d="M${x - 4.5} ${y + 3} q2.25 -3 4.5 0 q2.25 3 4.5 0" stroke="${C.ink}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
    case 'sleep':
      return `<ellipse cx="${x}" cy="${y + 2}" rx="2.4" ry="2" fill="${C.ink}" opacity="0.85"/>`;
    default:
      return `<path d="M${x - 6} ${y - 0.5} q6 7 12 0" stroke="${C.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
}

function face(f: Face): string {
  const cheeks = f.cheeks ?? 0.6;
  let brows = '';
  if (f.brow === 'raised') brows = `<path d="M60 36 q5 -4 10 -1" stroke="${C.ink}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
  if (f.brow === 'worried') brows = `<path d="M59.5 37 l9 -3" stroke="${C.ink}" stroke-width="1.7" stroke-linecap="round"/><path d="M90.5 37 l-9 -3" stroke="${C.ink}" stroke-width="1.7" stroke-linecap="round"/>`;
  return (
    `<ellipse cx="57.5" cy="57" rx="5.2" ry="3.2" fill="${C.peach}" opacity="${cheeks}"/><ellipse cx="92.5" cy="57" rx="5.2" ry="3.2" fill="${C.peach}" opacity="${cheeks}"/>` +
    brows +
    eyes(f.eyes) +
    mouth(f.mouth)
  );
}

const spark = (x: number, y: number, s = 1) => `<path d="M${x} ${y - 5 * s} v${10 * s} M${x - 5 * s} ${y} h${10 * s}" stroke="${C.peach}" stroke-width="2" stroke-linecap="round"/>`;
const rays = (cx: number, cy: number) => `<path d="M${cx} ${cy - 10} v-5 M${cx + 9} ${cy - 6} l3.5 -3.5 M${cx - 9} ${cy - 6} l-3.5 -3.5" stroke="${C.peach}" stroke-width="1.9" stroke-linecap="round"/>`;

interface Scene {
  face: Face;
  arms: string;
  /** Accessori disegnati sopra il corpo (e sopra le braccia). */
  front?: string;
  /** Accessori disegnati dietro le braccia ma sopra il corpo. */
  mid?: string;
  /** Rotazione dell'intero personaggio (gradi, attorno ai piedi). */
  tilt?: number;
}

const LS: [number, number] = [38, 72];
const RS: [number, number] = [108, 72];

function scene(pose: MinaVectorPose): Scene {
  switch (pose) {
    case 'welcome':
      return {
        face: { eyes: 'open', mouth: 'big' },
        arms: arm(...LS, 27, 98, -4) + arm(...RS, 123, 40, 6),
        front: spark(128, 28, 0.9) + `<path d="M131 46 q4 -2 5 -7" stroke="${C.leafLight}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      };
    case 'happy':
      return {
        face: { eyes: 'happy', mouth: 'big', cheeks: 0.8 },
        arms: arm(...LS, 24, 50, 5) + arm(...RS, 124, 50, -5),
        front: spark(18, 30, 0.8) + spark(128, 28, 0.8) + `<path d="M75 8 q-3 -4 -6 -1 q-2 3 6 9 q8 -6 6 -9 q-3 -3 -6 1z" fill="${C.peach}" transform="translate(0 -2)"/>`,
      };
    case 'calendar': {
      const cal =
        `<g transform="rotate(-6 16 78)"><rect x="2" y="58" width="30" height="38" rx="4" fill="${C.paper}" stroke="${C.edge}" stroke-width="1.2"/><path d="M2 62 a4 4 0 0 1 4 -4 h22 a4 4 0 0 1 4 4 v6 h-30z" fill="${C.peach}"/>` +
        `<circle cx="9" cy="58" r="1.6" fill="${C.ink}"/><circle cx="25" cy="58" r="1.6" fill="${C.ink}"/>` +
        [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<circle cx="${9 + c * 7.5}" cy="${76 + r * 7}" r="1.8" fill="${r === 1 && c === 1 ? C.peach : C.leaf}"/>`)).join('') +
        `</g>`;
      return { face: { eyes: 'open', mouth: 'open' }, arms: arm(...RS, 120, 56, 6), mid: cal, front: arm(...LS, 27, 88, -3) };
    }
    case 'shopping': {
      const bag =
        `<path d="M110 92 q-1 -12 12 -12" stroke="none"/><g><path d="M109 92 h26 l-3 30 a3 3 0 0 1 -3 2.6 h-14 a3 3 0 0 1 -3 -2.6z" fill="${C.kraft}"/>` +
        `<path d="M114 98 v18 M122 98 v18 M130 98 v18" stroke="${C.peachLight}" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>` +
        `<path d="M118 92 l-4 -12 l6 4 z" fill="${C.peach}"/><path d="M124 92 q-1 -9 6 -13" stroke="${C.leaf}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M127 92 q5 -8 9 -8" stroke="${C.leafLight}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="112" cy="90" r="3.6" fill="${C.alert}"/></g>`;
      return { face: { eyes: 'open', mouth: 'open' }, arms: arm(...LS, 27, 98, -4), mid: bag, front: arm(...RS, 116, 96, 4) };
    }
    case 'cooking': {
      const spoon = `<g transform="rotate(14 122 62)"><rect x="120.5" y="30" width="3.6" height="40" rx="1.8" fill="${C.wood}"/><ellipse cx="122.3" cy="26" rx="6.8" ry="9" fill="${C.wood}"/><ellipse cx="122.3" cy="26" rx="4.3" ry="6.2" fill="${C.woodLight}"/></g>`;
      return { face: { eyes: 'wink', mouth: 'big' }, arms: arm(...LS, 27, 98, -4) + spoon + arm(...RS, 121, 66, 5), front: `<path d="M26 40 q-4 -6 0 -12 M20 44 q-3 -4 0 -8" stroke="${C.peach}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.8"/>` };
    }
    case 'recipe': {
      const card =
        `<g transform="rotate(7 123 70)"><rect x="108" y="48" width="30" height="40" rx="4" fill="${C.paper}" stroke="${C.edge}" stroke-width="1.2"/>` +
        `<ellipse cx="123" cy="68" rx="10.5" ry="8" fill="${C.sage}"/><ellipse cx="123" cy="66" rx="8" ry="5.2" fill="${C.peach}"/>${ell(120, 65, 2.4, 1.6, 0, C.leaf)}${ell(126, 67, 2.4, 1.6, 0, C.leaf)}` +
        `<path d="M113 80 h20 M116 84 h14" stroke="#9AA59F" stroke-width="1.6" stroke-linecap="round"/></g>`;
      return { face: { eyes: 'open', mouth: 'smile', brow: 'raised' }, arms: arm(...LS, 27, 98, -4), mid: card, front: arm(...RS, 118, 84, 5) };
    }
    case 'thinking': {
      const bulb =
        `<g><circle cx="120" cy="26" r="9.5" fill="${C.peachLight}"/><circle cx="120" cy="26" r="6.4" fill="${C.peach}"/><rect x="116.5" y="34.5" width="7" height="4.6" rx="1.4" fill="${C.spine}"/>${rays(120, 22)}</g>`;
      return { face: { eyes: 'up', mouth: 'small', brow: 'raised' }, arms: arm(...RS, 118, 100, 4) + arm(...LS, 40, 62, -7), front: bulb };
    }
    case 'pantry': {
      const jar =
        `<g transform="rotate(-5 16 92)"><rect x="3" y="66" width="26" height="9" rx="3" fill="${C.sage}"/><rect x="5" y="73" width="22" height="34" rx="6" fill="${C.paper}" stroke="${C.edge}" stroke-width="1.2"/>` +
        `<path d="M7 90 h18 v11 a5 5 0 0 1 -5 5 h-8 a5 5 0 0 1 -5 -5z" fill="${C.peach}" opacity="0.85"/>` +
        `<circle cx="12" cy="97" r="1.6" fill="${C.peachLight}"/><circle cx="18" cy="100" r="1.6" fill="${C.peachLight}"/><circle cx="22" cy="95" r="1.6" fill="${C.peachLight}"/></g>`;
      return { face: { eyes: 'open', mouth: 'smile' }, arms: arm(...RS, 118, 100, 4), mid: jar, front: arm(...LS, 24, 100, -3) };
    }
    case 'missing': {
      const board =
        `<g transform="rotate(7 123 82)"><rect x="107" y="58" width="31" height="42" rx="4" fill="${C.paper}" stroke="${C.edge}" stroke-width="1.2"/><rect x="117" y="55" width="11" height="6" rx="2" fill="${C.spine}"/>` +
        `<rect x="111" y="68" width="6" height="6" rx="1.5" fill="none" stroke="${C.leaf}" stroke-width="1.4"/><path d="M112 71 l1.6 1.6 l2.6 -3.2" stroke="${C.leaf}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M121 71 h12" stroke="#9AA59F" stroke-width="1.6" stroke-linecap="round"/>` +
        `<rect x="111" y="80" width="6" height="6" rx="1.5" fill="${C.peachLight}" stroke="${C.peach}" stroke-width="1.4"/><path d="M121 83 h9" stroke="#9AA59F" stroke-width="1.6" stroke-linecap="round"/><circle cx="125" cy="92" r="0" fill="none"/></g>`;
      return { face: { eyes: 'open', mouth: 'worry', brow: 'worried' }, arms: arm(...LS, 27, 98, -4), mid: board, front: arm(...RS, 116, 82, 6) + `<path d="M126 36 q0 -8 7 -8 q6 0 6 6 q0 4 -5 6 v3" stroke="${C.peach}" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="129" cy="49" r="1.6" fill="${C.peach}"/>` };
    }
    case 'success': {
      const badge = `<circle cx="120" cy="24" r="12" fill="${C.leaf}"/><path d="M114 24.5 l4.4 4.6 l8 -9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      return {
        face: { eyes: 'happy', mouth: 'big', cheeks: 0.85 },
        arms: arm(...LS, 24, 52, 5) + arm(...RS, 122, 56, -5),
        front: badge + spark(16, 32, 0.9) + `<path d="M14 62 l4 3 M10 74 h5 M32 18 l2 4 M60 6 l1 4 M96 8 l-1 4" stroke="${C.peach}" stroke-width="2" stroke-linecap="round"/>`,
      };
    }
    case 'sleepy':
      return {
        face: { eyes: 'sleepy', mouth: 'sleep', cheeks: 0.5 },
        arms: arm(...LS, 29, 98, -3) + arm(...RS, 121, 98, 3),
        front: `<path d="M112 14 h8 l-8 9 h8 M123 6 h5.5 l-5.5 6.4 h5.5" stroke="${C.peach}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
        tilt: -2,
      };
    case 'neutral':
    default:
      return { face: { eyes: 'open', mouth: 'smile' }, arms: arm(...LS, 28, 100, -4) + arm(...RS, 120, 100, 4) };
  }
}

/** SVG completo di una posa (sfondo trasparente). */
export function minaSvg(pose: MinaPose): string {
  const s = scene(VECTOR_ALIAS[pose]);
  const inner = `${body()}<g transform="translate(-13.5 -9) scale(1.18)">${face(s.face)}</g>${s.mid ?? ''}${s.arms}${s.front ?? ''}`;
  const wrapped = s.tilt ? `<g transform="rotate(${s.tilt} 75 140)">${inner}</g>` : inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MINA_VIEWBOX.width} ${MINA_VIEWBOX.height}">${wrapped}</svg>`;
}

/** Variante compatta (solo copertina con volto) per righe, badge e notifiche interne. */
export function minaBadgeSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect x="14" y="8" width="72" height="84" rx="12" fill="${C.page}"/><rect x="12" y="6" width="72" height="84" rx="12" fill="${C.cover}" stroke="${C.edge}" stroke-width="1.6"/>` +
    `<rect x="10" y="4" width="20" height="88" rx="10" fill="${C.spine}"/><rect x="73" y="4" width="8" height="88" rx="3" fill="${C.band}"/>` +
    `<g transform="translate(-22 -6)">${face({ eyes: 'open', mouth: 'smile' })}</g>` +
    `${ell(50, 74, 12, 5, -30, C.leaf)}${ell(64, 70, 12, 5, 28, C.leafLight)}<path d="M56 86 q-1 -8 0 -14" stroke="${C.leaf}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    `</svg>`
  );
}

/** Corrispondenza con i nomi italiani usati prima dell'arrivo di Mina (compatibilità dei punti di chiamata). */
export const LEGACY_POSES: Record<string, MinaPose> = {
  neutra: 'neutral',
  saluto: 'welcome',
  cucinare: 'cooking',
  spesa: 'shopping',
  completata: 'success',
  mancanti: 'missing',
  suggerimento: 'thinking',
  vuoto: 'pantry',
};

export function resolvePose(pose: string): MinaPose {
  return (MINA_POSES as readonly string[]).includes(pose) ? (pose as MinaPose) : (LEGACY_POSES[pose] ?? 'neutral');
}
