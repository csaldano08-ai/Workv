import { describe, expect, it } from 'vitest';
import { CatalogIndex } from '../core/domain/catalog';
import { CATALOG } from '../data/catalog';
import { splitStep, stepIngredients, stepKind } from '../features/cooking/steps';

const catalogIndex = new CatalogIndex(CATALOG);

describe('Modalità Cucina: passaggi dai dati veri della ricetta', () => {
  it("l'azione è la prima frase e il resto resta disponibile come dettaglio (niente testo perso o inventato)", () => {
    const a = splitStep('Pulisci i funghi con un panno umido e affettali. Taglia la fontina a fettine.');
    expect(a.action).toBe('Pulisci i funghi con un panno umido e affettali.');
    expect(a.detail).toBe('Taglia la fontina a fettine.');
    expect(splitStep('Servi subito.')).toEqual({ action: 'Servi subito.', detail: '' });
    // le abbreviazioni con il punto non spezzano la frase se non segue una maiuscola
    expect(splitStep('Cuoci 10 min. a fuoco basso').detail).toBe('');
  });

  it('riconosce gli ingredienti nominati nel passaggio (singolare e plurale) in tutte le ricette', () => {
    const name = (id: string) => catalogIndex.ingredient(id).name;
    let withMatch = 0;
    for (const r of catalogIndex.catalog.recipes) {
      for (const s of r.steps) {
        const found = stepIngredients(r, s.text, name);
        // solo ingredienti della ricetta, senza duplicati
        expect(new Set(found.map((f) => f.ingredientId)).size).toBe(found.length);
        for (const f of found) expect(r.ingredients).toContain(f);
        if (found.length) withMatch++;
      }
    }
    // la grande maggioranza dei passaggi nomina almeno un ingrediente riconosciuto
    const total = catalogIndex.catalog.recipes.reduce((n, r) => n + r.steps.length, 0);
    expect(withMatch / total).toBeGreaterThan(0.6);
  });

  it('il gesto di Mina Chef segue il tipo di passaggio', () => {
    expect(stepKind('Mescola bene il composto con una frusta.')).toBe('mix');
    expect(stepKind('Scalda una padella e rosola la cipolla.')).toBe('cook');
    expect(stepKind('Servi caldo con una spolverata di pepe.')).toBe('serve');
    expect(stepKind('Lava le foglie e rimuovi la costa centrale.')).toBe('prep');
  });
});
