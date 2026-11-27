import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { C, FORE, SHOULDER, UPPER, armRotations, armTo, minaStaticSvg, type Side } from '../ui/mascot/mina2/art';
import { CHEF_POSES, MINA_POSES, POSES, resolvePose } from '../ui/mascot/mina2/poses';

const ROOT = join(__dirname, '..', '..');

/** Posizione della mano per una posa del braccio (stessa geometria del disegno). */
function hand(side: Side, out: number, bend: number) {
  const r = armRotations(side, { out, bend });
  const s = SHOULDER[side];
  const rad = (d: number) => (d * Math.PI) / 180;
  const ex = s.x - UPPER * Math.sin(rad(r.upper));
  const ey = s.y + UPPER * Math.cos(rad(r.upper));
  const t = r.upper + r.fore;
  return { x: ex - FORE * Math.sin(rad(t)), y: ey + FORE * Math.cos(rad(t)) };
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
