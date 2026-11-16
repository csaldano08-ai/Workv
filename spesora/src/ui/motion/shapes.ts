/**
 * Geometria e tempi delle animazioni illustrate (lo stesso motore dei prototipi in prototypes/intro-concepts).
 * Funzioni pure: restituiscono numeri o tracciati SVG (`d`), quindi sono testabili e identiche su iOS, Android e web.
 */
export type Pt = [number, number];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Avanzamento normalizzato di t nell'intervallo [a, b]. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const ease = {
  inQuad: (k: number) => k * k,
  outQuad: (k: number) => 1 - (1 - k) * (1 - k),
  inCubic: (k: number) => k * k * k,
  outCubic: (k: number) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outBack: (k: number, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
};

/** Molla smorzata 0 → 1 con rimbalzo. */
export function spring(dt: number, freq = 18, damp = 6): number {
  if (dt <= 0) return 0;
  return 1 - Math.exp(-damp * dt) * Math.cos(freq * dt);
}
/** Oscillazione smorzata attorno a 0 (squash & stretch dopo un impatto). */
export function wobble(dt: number, amp = 0.25, freq = 20, damp = 7): number {
  if (dt <= 0) return 0;
  return amp * Math.exp(-damp * dt) * Math.sin(freq * dt);
}

/** Superellisse: e=2 cerchio/ellisse, e≈5–7 quadrato arrotondato. Il morph si ottiene variando a, b, e. */
export function superPts(cx: number, cy: number, a: number, b: number, e: number, n = 72, rot = 0, wob?: (th: number) => number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
    let y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
    if (wob) {
      const r = wob(th);
      x *= r;
      y *= r;
    }
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

export interface Lobe {
  a: number;
  len: number;
  w: number;
}
/** Contorno "a petali": nucleo + petali gaussiani, un unico tracciato continuo. */
export function bloomPts(cx: number, cy: number, core: number, lobes: Lobe[], n = 160, rot = 0, wob = 0, t = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const ph = (i / n) * Math.PI * 2;
    let r = core * (1 + wob * Math.sin(5 * ph + t * 9) + wob * 0.6 * Math.sin(3 * ph - t * 7));
    for (const l of lobes) {
      const d = Math.atan2(Math.sin(ph - l.a - rot), Math.cos(ph - l.a - rot));
      r += l.len * Math.exp(-Math.pow(d / l.w, 2));
    }
    pts.push([cx + Math.cos(ph) * r, cy + Math.sin(ph) * r]);
  }
  return pts;
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();
/** Tracciato chiuso morbido (curve quadratiche sui punti medi), come `d` SVG. */
export function smoothD(pts: Pt[]): string {
  const n = pts.length;
  if (n < 3) return '';
  const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const s = mid(pts[n - 1], pts[0]);
  let d = `M${f(s[0])} ${f(s[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d}Z`;
}
/** Rettangolo come sotto-tracciato (per i "fori" con fillRule evenodd). */
export function rectD(x: number, y: number, w: number, h: number): string {
  return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
}
