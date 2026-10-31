/** Stringhe italiane principali. Le chiavi sono verificate da `npm run verify`. */
export const it = {
  'app.name': 'Spesora',
  'app.slogan': 'La tua settimana, già in tavola.',
  'welcome.value': 'Un calendario che decide cosa cucinare, quando fare la spesa e cosa comprare. Tu devi solo cucinare.',
  'welcome.start': 'Inizia',
  'welcome.privacy': 'Come usiamo i tuoi dati',
  'welcome.noAccount': 'Nessun account richiesto. Tutto resta sul tuo telefono.',
  'tabs.today': 'Oggi',
  'tabs.week': 'Settimana',
  'tabs.shopping': 'Spesa',
  'tabs.pantry': 'Dispensa',
  'tabs.recipes': 'Ricette',
  'meal.colazione': 'Colazione',
  'meal.pranzo': 'Pranzo',
  'meal.cena': 'Cena',
  'meal.spuntino': 'Spuntino',
  'status.planned': 'Da cucinare',
  'status.cooked': 'Cucinato',
  'status.skipped': 'Non cucinato',
  'status.ate_out': 'Mangiato fuori',
  'status.other': 'Cucinato altro',
  'action.cooked': 'Ho cucinato',
  'action.notCooked': 'Non ho cucinato',
  'action.ateOut': 'Oggi mangio fuori',
  'action.other': 'Ho già cucinato altro',
  'action.replace': 'Cambia ricetta',
  'action.move': 'Sposta',
  'action.openRecipe': 'Apri la preparazione',
  'action.regenerate': 'Rigenera il menù',
  'action.confirmShopping': 'Conferma la spesa',
  'action.cancel': 'Annulla',
  'action.save': 'Salva',
  'action.back': 'Indietro',
  'action.next': 'Avanti',
  'action.skip': 'Salta',
  'allergen.disclaimer':
    'Spesora esclude le ricette in base agli ingredienti che indichi, ma non certifica l’assenza di allergeni. Controlla sempre etichette, ingredienti e possibili contaminazioni.',
  'estimate.note': 'Le quantità marcate “stima” derivano dalle ricette confermate: correggile se non corrispondono.',
  'error.generic': 'Qualcosa non ha funzionato. I tuoi dati non sono stati modificati.',
  'error.db': 'Non è stato possibile aprire i dati locali. Nessun dato è stato cancellato.',
  'error.retry': 'Riprova',
} as const;

export type StringKey = keyof typeof it;

export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = it[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
