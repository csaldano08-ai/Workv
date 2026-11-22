/**
 * Intro "Splash elastico" (concept B approvato): descrizione pura della scena al tempo t.
 * Coordinate di progetto: larghezza 1080, altezza H = altezza dello schermo in proporzione.
 * Nessuna dipendenza da React: il componente SplashIntro trasforma questi dati in SVG e viste.
 */
import { bloomPts, clamp, ease, lerp, rectD, seg, smoothD, spring, superPts, wobble, type Lobe } from '../../ui/motion/shapes';
import type { MarkParts } from '../../ui/illustrations/LogoMarkSvg';

export const INTRO_W = 1080;
export const INTRO_DURATION = 7.05;
/** Da qui inizia l'apertura verso la schermata: "Salta" porta direttamente a questo punto. */
export const INTRO_REVEAL_AT = 5.95;
const TI = 0.95; // impatto
const R0 = 58;
export const LW = 8;
export const MARK_SIZE = 190;

export interface Drop {
  d: string;
  color: 'green' | 'peach';
}
export interface SplashFrame {
  /** Foro (forma dell'onda) che lascia vedere l'app sotto l'intro. */
  holeD: string | null;
  /** Anello verde dell'onda (tracciato evenodd) e contorni. */
  wave: { fillD: string; outerD: string; innerD: string | null } | null;
  bgD: string;
  fall: { d: string; lines: { x1: number; y1: number; x2: number; y2: number }[]; linesAlpha: number; highlight: { cx: number; cy: number }; shadow: { cx: number; cy: number; rx: number; alpha: number } } | null;
  drops: Drop[];
  bloom: { green: string; peach: string | null; core: { cx: number; cy: number; r: number } | null; highlight: { cx: number; cy: number; rx: number; ry: number } | null } | null;
  morph: { d: string; strokeWidth: number } | null;
  mark: { cx: number; cy: number; size: number; parts: MarkParts; scaleX: number; scaleY: number } | null;
  /** Pagina del ricettario (stile B + C) che arriva sotto il logo. */
  page: { cx: number; cy: number; w: number; h: number; scale: number; drop: number } | null;
  letters: { dy: number; sx: number; sy: number; a: number }[];
  minaPop: number;
  contentAlpha: number;
  done: boolean;
}

const DROPS = (() => {
  let s = 42 >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2 + r() * 0.3, v: 900 + r() * 500, size: 12 + r() * 16, color: (i % 3 === 0 ? 'peach' : 'green') as Drop['color'] }));
})();

/**
 * @param H altezza della scena in unità di progetto
 * @param target centro del marchio nella composizione finale (dal layout reale della scritta)
 */
export function splashFrame(t: number, H: number, target?: { x: number; y: number }): SplashFrame {
  const CX = INTRO_W / 2;
  const CY = H * 0.47;
  const T = target ?? { x: 330, y: H * 0.427 };
  const out: SplashFrame = { holeD: null, wave: null, bgD: rectD(0, 0, INTRO_W, H), fall: null, drops: [], bloom: null, morph: null, mark: null, page: null, letters: [], minaPop: 0, contentAlpha: 1, done: t >= INTRO_DURATION };

  /* 1 — caduta */
  if (t < TI) {
    const u = seg(t, 0.15, TI);
    if (u > 0) {
      const y = lerp(-140, CY, ease.inQuad(u));
      const st = Math.pow(u, 1.6);
      const top = y - R0 * (1 + 0.6 * st) - 30;
      out.fall = {
        d: smoothD(superPts(CX, y, R0 * (1 - 0.24 * st), R0 * (1 + 0.6 * st), 2, 48)),
        lines: [-30, 0, 30].map((dx) => ({ x1: CX + dx, y1: top, x2: CX + dx, y2: top - 150 * st * (dx === 0 ? 1 : 0.7) })),
        linesAlpha: clamp((u - 0.35) * 2),
        highlight: { cx: CX - 18, cy: y - R0 * 0.5 },
        shadow: { cx: CX, cy: CY + 75, rx: R0 * (0.4 + 0.8 * u), alpha: 0.08 * u },
      };
    }
  } else if (t < 3.0) {
    /* 2 — splash a petali con gocce, 3 — ritorno al centro */
    const squash = ease.outQuad(seg(t, TI, TI + 0.08)) * (1 - seg(t, TI + 0.08, TI + 0.2));
    const grow = spring(t - (TI + 0.06), 11, 4.2);
    const retract = ease.inOutCubic(seg(t, 1.85, 2.5));
    const lobeLen = 330 * grow * (1 - retract);
    const core = lerp(R0, 150, ease.outCubic(seg(t, 2.1, 2.75))) * (1 + 0.6 * squash);
    const wobAmp = 0.07 * Math.exp(-Math.max(0, t - 2.3) * 3) * seg(t, 2.0, 2.3);
    for (const d of DROPS) {
      const fly = Math.max(0, Math.min(t, 2.05) - (TI + 0.08));
      const back = ease.inOutCubic(seg(t, 2.05, 2.6));
      const x = lerp(CX + Math.cos(d.a) * (d.v * fly - 260 * fly * fly) * 0.7, CX, back);
      const y = lerp(CY + Math.sin(d.a) * (d.v * fly - 260 * fly * fly) * 0.7 + 450 * fly * fly, CY, back);
      const s = d.size * ease.outBack(seg(t, TI + 0.08, TI + 0.25)) * (1 - back * 0.9);
      if (fly > 0 && s > 1) {
        const vy = Math.sin(d.a) * (d.v - 520 * fly) * 0.7 + 900 * fly;
        const vx = Math.cos(d.a) * (d.v - 520 * fly) * 0.7;
        const stretch = back > 0 ? 1 + 0.6 * Math.sin(Math.PI * back) : 1 + 0.35 * clamp(1 - fly * 1.2);
        out.drops.push({ d: smoothD(superPts(x, y, s * stretch, s / Math.sqrt(stretch), 2, 20, Math.atan2(vy, vx))), color: d.color });
      }
    }
    const lobesG: Lobe[] = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2, len: lobeLen * (i % 2 ? 0.82 : 1), w: 0.2 }));
    const lobesP: Lobe[] = Array.from({ length: 9 }, (_, i) => ({ a: ((i + 0.5) / 9) * Math.PI * 2, len: lobeLen * 0.58, w: 0.17 }));
    const rot = 0.25 * grow - 0.4 * retract;
    const cy = CY - 40 * squash;
    const green = bloomPts(CX, cy, core * (1 + 0.8 * squash), lobesG, 160, rot, wobAmp, t).map(([x, y]) => [x, cy + (y - cy) * (1 - 0.55 * squash)] as [number, number]);
    const petals = lobeLen > 8;
    out.bloom = {
      green: smoothD(green),
      peach: petals ? smoothD(bloomPts(CX, CY, core * 0.62, lobesP, 140, -rot * 0.6)) : null,
      core: petals ? { cx: CX, cy: CY, r: core * 0.48 + lobeLen * 0.12 } : null,
      highlight: petals ? null : { cx: CX - core * 0.38, cy: CY - core * 0.42, rx: core * 0.18, ry: core * 0.1 },
    };
  } else {
    /* 4 — la gelatina diventa il marchio, 5 — il marchio va al suo posto */
    const move = ease.inOutCubic(seg(t, 4.15, 4.6));
    const mx = lerp(CX, T.x, move);
    const my = lerp(CY, T.y, move);
    const msize = lerp(320, MARK_SIZE, move);
    const settle = t > 5.55 ? wobble(t - 5.55, 0.07, 20, 7) : 0;
    if (t < 3.42) {
      const m = ease.inOutCubic(seg(t, 3.0, 3.38));
      const u = msize / 64;
      const wob = 0.05 * Math.exp(-(t - 3.0) * 4);
      out.morph = {
        d: smoothD(superPts(mx, my + 2 * u, lerp(150, 28 * u, m), lerp(150, 26 * u, m), lerp(2, 5.2, m), 80, 0, (th) => 1 + wob * Math.sin(5 * th + t * 9))),
        strokeWidth: LW * (1 - m),
      };
    } else {
      const tb = 3.42;
      out.mark = {
        cx: mx,
        cy: my,
        size: msize,
        scaleX: 1 + settle,
        scaleY: 1 - settle,
        parts: {
          body: 1 + wobble(t - tb, 0.05, 22, 8),
          header: seg(t, tb, tb + 0.18),
          ringL: spring(t - tb - 0.1, 18, 6.5),
          ringR: spring(t - tb - 0.17, 18, 6.5),
          plate: ease.outBack(seg(t, tb + 0.26, tb + 0.45), 2.6),
          ring: ease.outCubic(seg(t, tb + 0.36, tb + 0.62)),
          check: ease.outCubic(seg(t, tb + 0.55, tb + 0.75)),
        },
      };
    }
    for (let i = 0; i < 7; i++) {
      const ti = 4.45 + i * 0.075;
      const fr = seg(t, ti, ti + 0.22);
      if (fr <= 0) {
        out.letters.push({ dy: -260, sx: 1, sy: 1, a: 0 });
        continue;
      }
      const land = t - (ti + 0.22);
      const w = land > 0 ? wobble(land, 0.28, 24, 8) : -0.12 * fr;
      out.letters.push({ dy: (1 - ease.inQuad(fr)) * -260, sx: (1 + w) * (1 + settle), sy: (1 - w) * (1 - settle), a: 1 });
    }
    out.minaPop = spring(t - 4.75, 15, 6);
    const pg = spring(t - 4.05, 13, 6);
    if (pg > 0.001) out.page = { cx: INTRO_W / 2, cy: T.y, w: 920, h: 330, scale: pg, drop: (1 - Math.min(1, pg)) * -120 };
  }

  /* 6 — onda verde che apre la schermata vera, sotto l'intro */
  const reveal = seg(t, INTRO_REVEAL_AT, 6.8);
  if (reveal > 0) {
    const R = 2600 * ease.inOutCubic(reveal);
    const R2 = 2600 * ease.inOutCubic(seg(t, 6.15, 6.98));
    const wobR = (th: number) => 1 + 0.06 * Math.sin(6 * th + t * 8) + 0.04 * Math.sin(3 * th - t * 5);
    const outer = smoothD(superPts(T.x, T.y, R, R, 2, 96, 0, wobR));
    const inner = R2 > 1 ? smoothD(superPts(T.x, T.y, R2, R2, 2, 96, 0, wobR)) : null;
    out.holeD = outer;
    out.wave = { fillD: inner ? `${outer}${inner}` : outer, outerD: outer, innerD: inner };
    out.contentAlpha = 1 - seg(t, 6.0, 6.3);
  }
  return out;
}
