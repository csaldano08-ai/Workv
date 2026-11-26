import { describe, expect, it } from 'vitest';
import { colors, mealInk, mealTone } from '../theme/tokens';

/** Rapporto di contrasto WCAG 2.1 tra due colori esadecimali. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('Palette: contrasto accessibile (WCAG AA, 4,5:1 per il testo normale)', () => {
  const pairs: [string, string, string][] = [
    ['testo su fondo', colors.ink, colors.desk],
    ['testo secondario su card', colors.inkSoft, colors.white],
    ['testo secondario su fondo', colors.inkSoft, colors.desk],
    ['pulsante verde', colors.white, colors.green],
    ['link verde su card', colors.green, colors.white],
    ['link verde su fondo', colors.green, colors.desk],
    ['verde scuro su verde tenue', colors.greenDark, colors.greenSoft],
    ['testo su pesca chiara', colors.peachInk, colors.peachSoft],
    ['testo su pulsante pesca', colors.ink, colors.peach],
    ['errore su rosa', colors.danger, colors.dangerSoft],
    ['controllo segmentato attivo', colors.greenDark, colors.white],
  ];
  for (const [name, fg, bg] of pairs) {
    it(name, () => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5));
  }
  it('etichette dei pasti leggibili sul loro fondo', () => {
    for (const k of Object.keys(mealTone) as (keyof typeof mealTone)[]) expect(contrast(mealInk[k], mealTone[k]), k).toBeGreaterThanOrEqual(4.5);
  });
});
