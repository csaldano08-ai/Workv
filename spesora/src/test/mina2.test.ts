import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { C, FORE, RIG, SHOULDER, UPPER, armRotations, armTo, minaStaticSvg, type ArmLen, type Side, type Variant } from '../ui/mascot/mina2/art';
import { CHEF_POSES, MINA_POSES, POSES, resolvePose } from '../ui/mascot/mina2/poses';

const ROOT = join(__dirname, '..', '..');

/** Posizione della mano per una posa del braccio (stessa geometria del disegno). */
function hand(side: Side, out: number, bend: number, variant: Variant = 'classic', len?: ArmLen) {
  const r = armRotations(side, { out, bend });
  const s = variant === 'classic' ? SHOULDER[side] : RIG[variant].shoulder[side];
  const [a, b] = len ?? (variant === 'classic' ? [UPPER, FORE] : [RIG[variant].upper, RIG[variant].fore]);
  const rad = (d: number) => (d * Math.PI) / 180;
  const ex = s.x - a * Math.sin(rad(r.upper));
  const ey = s.y + a * Math.cos(rad(r.upper));
  const t = r.upper + r.fore;
  return { x: ex - b * Math.sin(rad(t)), y: ey + b * Math.cos(rad(t)) };
}

describe('Mina 2.0 — la borsetta della spesa', () => {
  it('ogni posa è un SVG valido e chiuso, con l’identità fissa della borsa', () => {
    expect(MINA_POSES).toHaveLength(20);
    for (const p of MINA_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      expect(s.startsWith('<svg')).toBe(true);
      expect(s.endsWith('</svg>')).toBe(true);
      expect(s).not.toMatch(/<text/);
      // corpo avorio, manico e braccia verdi, contorno verde scuro, guance rosa
      for (const color of [C.ivory, C.green, C.line, C.cheek]) expect(s, p).toContain(color);
      const open = (s.match(/<(?!\/|\?|!)[a-zA-Z]/g) ?? []).length;
      const selfClosed = (s.match(/\/>/g) ?? []).length;
      const closed = (s.match(/<\/[a-zA-Z]+>/g) ?? []).length;
      expect(open, p).toBe(selfClosed + closed);
    }
  });

  it('non è un libro: nessun colore della vecchia Mina ricettario', () => {
    for (const p of MINA_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      // copertina, dorso e segnalibro della vecchia Mina
      for (const old of ['#FAF6EC', '#2F5C47', '#E6A46D']) expect(s, p).not.toContain(old);
    }
  });

  it('Mina Chef (cappello e grembiule) solo nelle pose di cucina e ricette', () => {
    expect(CHEF_POSES.sort()).toEqual(['checklist', 'cooking', 'mixing', 'recipe', 'serving']);
    for (const p of MINA_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      const hasHat = s.includes(C.hatShade);
      expect(hasHat, p).toBe(CHEF_POSES.includes(p));
    }
  });

  it('le pose delle braccia portano davvero la mano dove indicato (cinematica inversa)', () => {
    const targets: [Side, number, number][] = [
      ['R', 173, 90],
      ['L', 28, 150],
      ['R', 147, 141],
      ['L', 42, 141],
    ];
    for (const [side, x, y] of targets) {
      const pose = armTo(side, x, y);
      const h = hand(side, pose.out, pose.bend);
      expect(Math.hypot(h.x - x, h.y - (y - 3)), `${side} ${x},${y}`).toBeLessThan(0.6);
    }
    // bersaglio troppo lontano: il braccio si distende (quasi dritto) verso di lui
    const far = armTo('R', 200, 40);
    expect(Math.abs(far.bend)).toBeLessThan(20);
  });

  it('Mina Chef ha il suo scheletro: le braccia (anche con lunghezze proprie) arrivano dove indicato', () => {
    const cases: [Side, number, number, ArmLen | undefined][] = [
      ['R', 162.5, 118, [12, 16]],
      ['R', 168, 104, [20, 23]],
      ['L', 54, 176, [14, 15]],
      ['R', 148, 154, undefined],
    ];
    for (const [side, x, y, len] of cases) {
      const pose = armTo(side, x, y, { len }, 'chef');
      const h = hand(side, pose.out, pose.bend, 'chef', len);
      expect(Math.hypot(h.x - x, h.y - (y - 3)), `${side} ${x},${y}`).toBeLessThan(0.6);
    }
  });

  it('Mina Chef nelle quattro pose del foglio: cucchiaio e occhiolino, ciotola, cloche, cartellina', () => {
    const chef = (p: keyof typeof POSES) => POSES[p].look;
    expect(chef('cooking').armR.prop).toBe('spoon');
    expect(chef('cooking').eyes).toBe('wink');
    expect(chef('mixing').armR.prop).toBe('bowl');
    expect(chef('mixing').eyes).toBe('happy');
    expect(chef('serving').armR.prop).toBe('cloche');
    expect(chef('checklist').armR.prop).toBe('clipboard');
    // gli oggetti larghi restano dentro il riquadro: la figura si sposta a sinistra
    expect(chef('serving').shift ?? 0).toBeLessThan(0);
    for (const p of CHEF_POSES) {
      const s = minaStaticSvg(POSES[p].look);
      expect(s, p).toContain(C.chefSide); // fianco caldo della borsa di Mina Chef
      expect(s, p).not.toContain(C.ivoryShade); // non è la borsa di Mina 2.0 con il cappello sopra
    }
  });

  it('i vecchi nomi delle pose restano validi e un nome ignoto usa la posa neutra', () => {
    expect(resolvePose('saluto')).toBe('welcome');
    expect(resolvePose('spesa')).toBe('shopping');
    expect(resolvePose('success')).toBe('success');
    expect(resolvePose('inesistente')).toBe('neutral');
  });

  it('nessuna immagine raster o di rete: la mascotte è solo vettoriale e locale', () => {
    const dir = join(ROOT, 'src', 'ui', 'mascot');
    const files = [join(dir, 'Mina.tsx'), ...readdirSync(join(dir, 'mina2')).map((f) => join(dir, 'mina2', f))];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/require\(/);
      expect(src, f).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    // la vecchia Mina (ricettario) non è più nel progetto
    expect(existsSync(join(ROOT, 'assets', 'mascot', 'mina'))).toBe(false);
    expect(existsSync(join(dir, 'minaRaster.ts'))).toBe(false);
  });
});
