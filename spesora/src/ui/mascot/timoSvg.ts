/**
 * Timo — mascotte originale di Spesora: un rametto di timo con grembiulino color pesca.
 * Unica sorgente vettoriale per tutte le pose (app e PNG esportati). Nessuna dipendenza:
 * questo file è importato sia dall'app sia dallo script di esportazione (Node).
 */

export const TIMO_POSES = ['neutra', 'saluto', 'cucinare', 'spesa', 'completata', 'mancanti', 'suggerimento', 'vuoto'] as const;
export type TimoPose = (typeof TIMO_POSES)[number];

const C = {
  body: '#386E55',
  bodyLight: '#4A8468',
  leaf: '#5E8F72',
  leafLight: '#8DB580',
  dark: '#2B5643',
  ink: '#24332C',
  peach: '#E6A46D',
  peachLight: '#F3C9A2',
  ivory: '#F6F3EA',
  wood: '#B98552',
  line: '#D9D2C2',
};

/** Foglia ellittica ruotata attorno al proprio centro. */
function leaf(cx: number, cy: number, rx: number, ry: number, rot: number, fill: string): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/>`;
}

/** Braccio-foglia ancorato alla spalla (x, y) con angolo in gradi (0 = verso il basso). */
function arm(x: number, y: number, angle: number, side: 'l' | 'r'): string {
  const len = 15;
  const rad = (angle * Math.PI) / 180;
  const dir = side === 'l' ? -1 : 1;
  const cx = x + dir * Math.sin(rad) * len * 0.6;
  const cy = y + Math.cos(rad) * len * 0.6;
  const rot = side === 'l' ? angle : -angle;
  return leaf(Number(cx.toFixed(1)), Number(cy.toFixed(1)), 5, 11, rot, C.leaf);
}

function face(pose: TimoPose): string {
  const eyesY = 57;
  let eyes = `<ellipse cx="51.5" cy="${eyesY}" rx="2.7" ry="3.4" fill="${C.ink}"/><ellipse cx="68.5" cy="${eyesY}" rx="2.7" ry="3.4" fill="${C.ink}"/>`;
  eyes += `<circle cx="52.4" cy="${eyesY - 1.2}" r="0.9" fill="#fff"/><circle cx="69.4" cy="${eyesY - 1.2}" r="0.9" fill="#fff"/>`;
  if (pose === 'completata') {
    // occhi sorridenti ad arco
    eyes = `<path d="M48.5 58 q3 -4 6 0" stroke="${C.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M65.5 58 q3 -4 6 0" stroke="${C.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  let brows = '';
  if (pose === 'mancanti') {
    brows = `<path d="M48 50.5 l6 -1.6" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/><path d="M72 50.5 l-6 -1.6" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  const mouths: Record<TimoPose, string> = {
    neutra: `<path d="M55.5 64 q4.5 4 9 0" stroke="${C.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    saluto: `<path d="M54.5 63.5 q5.5 6 11 0 z" fill="${C.ink}"/>`,
    cucinare: `<path d="M55.5 64 q4.5 4 9 0" stroke="${C.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    spesa: `<path d="M54.5 63.5 q5.5 5.5 11 0 z" fill="${C.ink}"/>`,
    completata: `<path d="M53.5 63 q6.5 7 13 0 z" fill="${C.ink}"/>`,
    mancanti: `<path d="M56 66 q4 -2 8 0" stroke="${C.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    suggerimento: `<path d="M55.5 64 q4.5 4 9 0" stroke="${C.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    vuoto: `<path d="M56 65.5 h8" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
  };
  const cheeks = `<ellipse cx="46" cy="63.5" rx="3.6" ry="2.3" fill="${C.peach}" opacity="0.55"/><ellipse cx="74" cy="63.5" rx="3.6" ry="2.3" fill="${C.peach}" opacity="0.55"/>`;
  return cheeks + brows + eyes + mouths[pose];
}

function props(pose: TimoPose): { arms: string; extra: string; front: string } {
  // Spalle: sinistra (39, 80), destra (81, 80)
  switch (pose) {
    case 'saluto':
      return { arms: arm(39, 80, 20, 'l') + arm(81, 78, 150, 'r'), extra: `<path d="M97 52 q4 -3 3 -8 M101 58 q5 -2 6 -7" stroke="${C.leafLight}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`, front: '' };
    case 'cucinare':
      return {
        arms: arm(39, 80, 20, 'l') + arm(81, 80, 115, 'r'),
        extra: '',
        front: `<g transform="rotate(-28 95 76)"><rect x="93.5" y="58" width="3.4" height="34" rx="1.7" fill="${C.wood}"/><ellipse cx="95.2" cy="56" rx="6" ry="8" fill="${C.wood}"/><ellipse cx="95.2" cy="56" rx="3.8" ry="5.6" fill="#C99A6C"/></g>`,
      };
    case 'spesa':
      return {
        arms: arm(39, 80, 20, 'l') + arm(81, 80, 55, 'r'),
        extra: '',
        front: `<path d="M88 96 q8 -14 16 0" stroke="${C.dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M85 96 h22 l-3 16 a3 3 0 0 1 -3 2.5 h-10 a3 3 0 0 1 -3 -2.5 z" fill="${C.peach}"/><path d="M90 101 v9 M96 101 v9 M102 101 v9" stroke="${C.peachLight}" stroke-width="1.6" stroke-linecap="round"/><circle cx="92" cy="94" r="3.2" fill="#C8553D"/><path d="M99 95 l3 -7" stroke="${C.leafLight}" stroke-width="2.6" stroke-linecap="round"/>`,
      };
    case 'completata':
      return {
        arms: arm(39, 78, 155, 'l') + arm(81, 78, 155, 'r'),
        extra: `<path d="M24 40 l4 3 M22 52 h5 M96 40 l-4 3 M98 52 h-5 M30 30 l2 4 M90 30 l-2 4" stroke="${C.peach}" stroke-width="2" stroke-linecap="round"/>`,
        front: '',
      };
    case 'mancanti':
      return {
        arms: arm(39, 80, 30, 'l') + arm(81, 80, 70, 'r'),
        extra: '',
        front: `<g transform="rotate(8 96 92)"><rect x="86" y="80" width="20" height="25" rx="3" fill="${C.ivory}" stroke="${C.line}" stroke-width="1"/><path d="M90 87 h12 M90 92 h9 M90 97 h11" stroke="#9AA59F" stroke-width="1.6" stroke-linecap="round"/><circle cx="102.5" cy="92" r="1.8" fill="${C.peach}"/></g>`,
      };
    case 'suggerimento':
      return {
        arms: arm(39, 80, 20, 'l') + arm(81, 78, 150, 'r'),
        extra: `<g><circle cx="98" cy="40" r="8" fill="${C.peachLight}"/><circle cx="98" cy="40" r="5.2" fill="${C.peach}"/><rect x="95" y="47" width="6" height="4" rx="1.2" fill="${C.dark}"/><path d="M98 26 v-4 M108 30 l3 -3 M88 30 l-3 -3" stroke="${C.peach}" stroke-width="1.8" stroke-linecap="round"/></g>`,
        front: '',
      };
    case 'vuoto':
      return {
        arms: arm(39, 80, 80, 'l') + arm(81, 80, 80, 'r'),
        extra: '',
        front: `<ellipse cx="60" cy="128" rx="20" ry="4.5" fill="${C.ivory}" stroke="#D9D2C2" stroke-width="1.2"/>`,
      };
    case 'neutra':
    default:
      return { arms: arm(39, 80, 22, 'l') + arm(81, 80, 22, 'r'), extra: '', front: '' };
  }
}

/** SVG completo di Timo nella posa indicata. Sfondo trasparente. viewBox 120×140. */
export function timoSvg(pose: TimoPose = 'neutra'): string {
  const p = props(pose);
  const tuft =
    `<path d="M60 36 C59 28 61 20 60 12" stroke="${C.dark}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    leaf(54, 20, 3.6, 7, -38, C.leafLight) +
    leaf(66, 18, 3.6, 7, 38, C.leaf) +
    leaf(53.5, 30, 3.8, 7.5, -50, C.leaf) +
    leaf(66.5, 28, 3.8, 7.5, 50, C.leafLight) +
    leaf(60, 11, 3.2, 6, 0, C.leafLight);
  // Corpo a forma di foglia con nervatura centrale: si legge come un'erba aromatica, non come un ortaggio.
  const body =
    `<path d="M60 30 C79 38 85 66 84 96 a24 24 0 0 1 -48 0 C35 66 41 38 60 30 z" fill="${C.body}"/>` +
    `<path d="M60 36 C52 44 47 58 47 74" stroke="${C.bodyLight}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `<path d="M60 34 V48" stroke="${C.leafLight}" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>`;
  const apron =
    `<path d="M46 81 Q60 71 74 81" stroke="${C.peach}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<path d="M44 81 h32 v17 a16 16 0 0 1 -32 0 z" fill="${C.peach}"/>` +
    `<path d="M44 85 h32" stroke="${C.peachLight}" stroke-width="1.4"/>` +
    `<rect x="53.5" y="93" width="13" height="9" rx="3" fill="${C.peachLight}"/>` +
    `<path d="M60 93 v9" stroke="${C.peach}" stroke-width="1.2"/>`;
  const feet = `<ellipse cx="51" cy="123" rx="7" ry="4" fill="${C.dark}"/><ellipse cx="69" cy="123" rx="7" ry="4" fill="${C.dark}"/>`;
  const front = pose === 'vuoto' ? '' : p.front;
  const ground = pose === 'vuoto' ? p.front : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">${ground}${p.extra}${feet}${p.arms}${body}${tuft}${face(pose)}${apron}${front}</svg>`;
}

/** Variante compatta (solo volto e ciuffo) per icone e spazi ridotti. viewBox 64×64. */
export function timoBadgeSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<circle cx="32" cy="34" r="27" fill="${C.body}"/>` +
    `<path d="M32 9 C31.5 5 32.5 2 32 0.5" stroke="${C.dark}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    leaf(26.5, 6.5, 3, 6, -40, C.leafLight) +
    leaf(37.5, 6, 3, 6, 40, C.leaf) +
    leaf(32, 2, 2.6, 5, 0, C.leafLight) +
    `<ellipse cx="24" cy="38" rx="3.4" ry="2.2" fill="${C.peach}" opacity="0.6"/><ellipse cx="40" cy="38" rx="3.4" ry="2.2" fill="${C.peach}" opacity="0.6"/>` +
    `<ellipse cx="25.5" cy="31" rx="2.7" ry="3.3" fill="${C.ivory}"/><ellipse cx="38.5" cy="31" rx="2.7" ry="3.3" fill="${C.ivory}"/>` +
    `<path d="M27.5 39 q4.5 4 9 0" stroke="${C.ivory}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<path d="M14 50 q18 12 36 0 v4 q-18 12 -36 0 z" fill="${C.peach}"/>` +
    `</svg>`
  );
}
