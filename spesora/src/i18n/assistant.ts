import { hashString } from '../core/domain/random';
import type { MealType } from '../core/domain/types';

/**
 * Micro-copy dell'assistente (Timo). Tono: amichevole, utile, breve, mai colpevolizzante.
 * Le varianti sono scelte in modo deterministico (stessa chiave → stessa frase) per evitare
 * testi che cambiano a ogni apertura.
 */

function pick(options: string[], key: string): string {
  return options[hashString(key) % options.length];
}

const MEAL_ARTICLE: Record<MealType, string> = { colazione: 'la colazione', pranzo: 'il pranzo', cena: 'la cena', spuntino: 'lo spuntino' };

export function greeting(hour: number, key: string): string {
  if (hour < 5) return pick(['Ancora sveglio? Domani ci pensiamo insieme.', 'Notte fonda: il menù di domani è già pronto.'], key);
  if (hour < 12) return pick(['Buongiorno! Ecco cosa ti aspetta oggi.', 'Buongiorno. La giornata in cucina è già organizzata.', 'Ciao! Oggi ho già pensato io al menù.'], key);
  if (hour < 18) return pick(['Buon pomeriggio! Diamo un’occhiata a stasera?', 'Ciao! Ecco il prossimo pasto.', 'Tutto sotto controllo: ecco cosa viene dopo.'], key);
  return pick(['Buonasera! Ecco cosa c’è in programma.', 'Ciao! La cena è già decisa.', 'Buonasera. Ci pensiamo insieme?'], key);
}

export function cookSoon(recipeName: string, minutes: number, key: string): string {
  const name = recipeName.toLowerCase();
  if (minutes <= 15) return pick([`Hai poco tempo? Oggi ${name} richiede solo ${minutes} minuti.`, `Bastano ${minutes} minuti: oggi si prepara ${name}.`], key);
  return pick([`È quasi ora di cucinare: oggi ti aspetta ${name}.`, `Tra poco si comincia: ${name}, circa ${minutes} minuti.`, `Oggi si cucina ${name}. Tieni la ricetta a portata di mano.`], key);
}

export function mealReminderTitle(mealType: MealType, key: string): string {
  return pick([`È quasi ora di preparare ${MEAL_ARTICLE[mealType]}`, `Timo ti ricorda ${MEAL_ARTICLE[mealType]}`, `Pronto per ${MEAL_ARTICLE[mealType]}?`], key);
}

export function mealReminderBody(recipeName: string, minutes: number, servings: number, key: string): string {
  const people = `per ${servings} ${servings === 1 ? 'persona' : 'persone'}`;
  return `${cookSoon(recipeName, minutes, key)} Preparazione ${minutes} minuti, ${people}. Tocca per vedere la ricetta.`;
}

export function shoppingDay(items: number, key: string): { title: string; body: string } {
  return {
    title: pick(['Oggi è giorno di spesa', 'Giorno di spesa!', 'La spesa di oggi è pronta'], key),
    body: pick([
      `La tua lista è pronta: ${items} ${items === 1 ? 'prodotto' : 'prodotti'} per le prossime ricette.`,
      `Ho preparato la lista per le prossime ricette (${items} ${items === 1 ? 'prodotto' : 'prodotti'}).`,
    ], key),
  };
}

export const SHOPPING_REMINDER_BODY = 'La tua lista è pronta per le prossime ricette. Tocca per aprirla.';

export function swapSuggestion(key: string): string {
  return pick(['Ti va di cambiare? Possiamo sostituire la ricetta di oggi.', 'Non ti ispira? Scegline un’altra in un tocco.'], key);
}

export function missingIngredients(count: number): string {
  return count === 1 ? 'Manca un ingrediente: è già nella lista della spesa.' : `Mancano ${count} ingredienti: sono già nella lista della spesa.`;
}

export function recipeCompleted(key: string): string {
  return pick(['Fatto! Dispensa aggiornata.', 'Ottimo lavoro: ho aggiornato la dispensa.', 'Buon appetito! La dispensa è aggiornata.'], key);
}

export const EMPTY = {
  noMeal: 'Per oggi non c’è altro da cucinare. Goditi la serata.',
  noRecipes: 'Non trovo ricette compatibili con queste preferenze. Prova ad allargare un po’ le scelte: le esclusioni alimentari restano sempre rispettate.',
  noShopping: 'Niente da comprare: secondo la dispensa hai tutto per i prossimi pasti.',
  noPantry: 'La dispensa è vuota. Quando confermi una spesa, i prodotti compaiono qui.',
  noHistory: 'Lo storico si riempie quando confermi i pasti.',
  dayDone: 'Per oggi hai finito. A domani!',
};

export const TIPS = [
  'Puoi cambiare le porzioni di un solo pasto dalla ricetta.',
  'Spunta i prodotti mentre fai la spesa, poi conferma: solo allora entrano in dispensa.',
  'Mangi fuori? Segnalo: gli ingredienti restano disponibili.',
  'Le porzioni seguono le tue abitudini: le cambi in Impostazioni.',
  'Tieni premuto un pasto nella settimana per spostarlo o cambiarlo.',
];

export function tipOfTheDay(key: string): string {
  return pick(TIPS, key);
}

/** Parole da evitare: il tono non deve mai colpevolizzare. */
export const FORBIDDEN_TONE = ['dovresti', 'hai dimenticato', 'ancora una volta', 'sbagliato', 'colpa', 'pigro'];
