import { describe, expect, it } from 'vitest';
import { bloomPts, ease, rectD, seg, smoothD, spring, superPts, wobble } from '../ui/motion/shapes';
import { LOADER_TEXT, minLoaderMs, setLoaderHandler, withLoader } from '../ui/loader/loaderBus';
import { onReplayIntro, replayIntro } from '../features/intro/introBus';

describe('Motore delle animazioni illustrate', () => {
  it('molle ed easing partono da 0, arrivano a 1 e rimbalzano in modo smorzato', () => {
    expect(spring(0)).toBe(0);
    expect(Math.abs(spring(3) - 1)).toBeLessThan(0.01);
    expect(Math.max(...Array.from({ length: 60 }, (_, i) => spring(i / 60)))).toBeGreaterThan(1); // c'è un rimbalzo
    expect(wobble(0)).toBe(0);
    expect(Math.abs(wobble(2))).toBeLessThan(0.001);
    expect(ease.outBack(1)).toBeCloseTo(1);
    expect(seg(5, 0, 10)).toBe(0.5);
  });

  it('il morph cerchio → quadrato arrotondato mantiene lo stesso numero di punti e resta nei limiti', () => {
    const circle = superPts(0, 0, 100, 100, 2, 64);
    const square = superPts(0, 0, 100, 100, 7, 64);
    expect(circle).toHaveLength(64);
    expect(square).toHaveLength(64);
    for (const [x, y] of [...circle, ...square]) {
      expect(Math.abs(x)).toBeLessThanOrEqual(100.0001);
      expect(Math.abs(y)).toBeLessThanOrEqual(100.0001);
    }
    // il quadrato arrotondato riempie gli angoli più del cerchio
    expect(Math.hypot(...square[8])).toBeGreaterThan(Math.hypot(...circle[8]));
  });

  it('i tracciati SVG sono chiusi e validi', () => {
    const d = smoothD(bloomPts(0, 0, 30, [{ a: 0, len: 40, w: 0.2 }], 40));
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).not.toMatch(/NaN|Infinity/);
    expect(rectD(0, 0, 10, 20)).toBe('M0 0H10V20H0Z');
  });
});

describe('Caricamento illustrato', () => {
  it('senza animazione montata esegue comunque il lavoro e restituisce il risultato', async () => {
    setLoaderHandler(null);
    await expect(withLoader(LOADER_TEXT.regenerate, async () => 42)).resolves.toBe(42);
  });

  it('con un host montato passa testi e lavoro all\'animazione', async () => {
    const seen: string[] = [];
    setLoaderHandler(async (text, task) => {
      seen.push(text.title);
      return task();
    });
    await expect(withLoader(LOADER_TEXT.firstWeek, async () => 'ok')).resolves.toBe('ok');
    expect(seen).toEqual(['Preparo la tua settimana']);
    setLoaderHandler(null);
  });

  it('dura abbastanza da leggersi, meno con "Riduci movimento"', () => {
    expect(minLoaderMs(false)).toBeGreaterThan(minLoaderMs(true));
    expect(minLoaderMs(false)).toBeLessThanOrEqual(2000);
  });

  it('"Rivedi l\'animazione iniziale" avvisa chi ascolta', () => {
    let n = 0;
    const off = onReplayIntro(() => n++);
    replayIntro();
    off();
    replayIntro();
    expect(n).toBe(1);
  });
});
