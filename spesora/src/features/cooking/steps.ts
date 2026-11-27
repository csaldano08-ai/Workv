import type { Recipe, RecipeIngredient } from '../../core/domain/types';

/**
 * Modalità Cucina: tutto viene dai dati veri della ricetta (testo dei passaggi, ingredienti, timer, sostituzioni).
 * Nessuna istruzione inventata: l'«azione» è la prima frase del passaggio, il resto è il dettaglio (a richiesta).
 */

/** Prima frase del passaggio (l'azione da compiere) e il resto del testo (dettagli), senza perdere nulla. */
export function splitStep(text: string): { action: string; detail: string } {
  const t = text.trim();
  // fine della prima frase: punto, punto esclamativo o punto e virgola seguiti da spazio e maiuscola, o fine testo
  const m = /^(.+?[.!;])\s+(?=[A-ZÀ-Ý0-9«"])/.exec(t);
  if (!m) return { action: t, detail: '' };
  return { action: m[1].trim(), detail: t.slice(m[0].length).trim() };
}

/** Radice di una parola per riconoscere singolare e plurale (piadina/piadine, fungo/funghi resta «fung»). */
function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 4) return w;
  return w.slice(0, w.length - (w.length > 6 ? 2 : 1));
}

/** Parole del nome che bastano a riconoscere l'ingrediente nel testo (la prima parola significativa). */
function keyOf(name: string): string | null {
  const words = name
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/[\s,]+/)
    .filter((w) => w.length >= 3 && !['di', 'del', 'della', 'con', 'per', 'senza'].includes(w));
  return words.length ? stem(words[0]) : null;
}

/**
 * Ingredienti nominati nel testo del passaggio (riconosciuti dal nome nel catalogo). Se il passaggio non ne nomina
 * nessuno la lista è vuota: la schermata mostra allora tutti gli ingredienti della ricetta.
 */
export function stepIngredients(recipe: Recipe, text: string, nameOf: (id: string) => string): RecipeIngredient[] {
  const t = text.toLowerCase();
  return recipe.ingredients.filter((ri) => {
    const key = keyOf(nameOf(ri.ingredientId));
    return !!key && new RegExp(`(^|[^a-zà-ÿ])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(t);
  });
}

/** Che cosa si fa nel passaggio, per il gesto di Mina Chef (nessun testo: solo la sua reazione visiva). */
export type StepKind = 'mix' | 'cook' | 'serve' | 'prep';
export function stepKind(text: string): StepKind {
  const t = text.toLowerCase();
  if (/\b(servi|impiatta|porta in tavola|guarnisci)/.test(t)) return 'serve';
  if (/\b(mescol|amalgam|sbatt|frull|impast|monta|emulsion)/.test(t)) return 'mix';
  if (/\b(cuoc|cuoci|scalda|rosola|soffrigg|bolli|lessa|forno|padella|salta|tosta|griglia|friggi|stufa)/.test(t)) return 'cook';
  return 'prep';
}
