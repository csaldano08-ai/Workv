/*
 * Simboli (emoji) degli ingredienti, per id.
 *
 * Regola: un ingrediente ha un simbolo SOLO se l'emoji raffigura esattamente quel cibo
 * (🍎 per la mela, 🥕 per la carota, 🧀 solo per i formaggi…). Mai un frutto per una verdura
 * o viceversa, mai un'emoji «somigliante» (niente 🫒 per l'olio, 🍝 per la pasta generica,
 * 🐟 per il tonno in scatola, 🍋 per il lime).
 * Nel dubbio l'ingrediente resta fuori: l'interfaccia mostra il simbolo neutro del reparto,
 * che è meglio di un'immagine sbagliata.
 *
 * Le chiavi sono id del catalogo (`src/data/ingredients*.ts`), verificati da
 * `src/test/ingredientSymbols.test.ts`.
 */
export const INGREDIENT_SYMBOLS: Readonly<Record<string, string>> = {
  // Frutta
  mela: '🍎',
  pera: '🍐',
  uva: '🍇',
  limone: '🍋',
  lime: '🍋‍🟩',
  arancia: '🍊',
  mandarini: '🍊',
  banana: '🍌',
  fragole: '🍓',
  mirtilli: '🫐',
  pesca: '🍑',
  ciliegie: '🍒',
  kiwi: '🥝',
  ananas: '🍍',
  mango: '🥭',
  anguria: '🍉',
  melone: '🍈',
  avocado: '🥑',
  cocco_rape: '🥥',

  // Verdura
  pomodoro: '🍅',
  pomodorini: '🍅',
  carota: '🥕',
  cipolla: '🧅',
  cipolla_rossa: '🧅',
  aglio: '🧄',
  patata: '🥔',
  patata_dolce: '🍠',
  broccolo: '🥦',
  insalata: '🥬',
  spinaci_freschi: '🥬',
  bietole: '🥬',
  scarola: '🥬',
  cetriolo: '🥒',
  peperone: '🫑',
  peperoncino: '🌶️',
  melanzana: '🍆',
  mais_scatola: '🌽',
  funghi_champignon: '🍄',
  piselli_surgelati: '🫛',
  zenzero: '🫚',

  // Legumi, frutta secca
  fagioli_cannellini: '🫘',
  fagioli_borlotti: '🫘',
  fagioli_neri: '🫘',
  arachidi: '🥜',
  castagne: '🌰',

  // Latticini e uova
  uova: '🥚',
  latte: '🥛',
  burro: '🧈',
  mozzarella: '🧀',
  parmigiano: '🧀',
  pecorino: '🧀',
  feta: '🧀',
  gorgonzola: '🧀',
  stracchino: '🧀',
  scamorza: '🧀',
  grana_padano: '🧀',
  provolone: '🧀',
  fontina: '🧀',
  asiago: '🧀',
  caciocavallo: '🧀',
  emmental: '🧀',
  burrata: '🧀',
  primo_sale: '🧀',

  // Pane e cereali
  pane: '🍞',
  pane_integrale: '🍞',
  pane_cassetta: '🍞',
  pane_senza_glutine: '🍞',
  riso: '🍚',
  riso_basmati: '🍚',

  // Carne
  petto_pollo: '🍗',
  cosce_pollo: '🍗',
  fettine_manzo: '🥩',
  pancetta: '🥓',

  // Pesce (freschi o surgelati al naturale; niente scatolame né affumicati)
  salmone: '🐟',
  merluzzo_surgelato: '🐟',
  orata_filetti: '🐟',
  pesce_spada: '🐟',
  tonno_fresco: '🐟',
  alici_fresche: '🐟',
  sardine_fresche: '🐟',
  sgombro_fresco: '🐟',
  nasello: '🐟',
  platessa: '🐟',
  trota: '🐟',
  gamberetti_surgelati: '🦐',
  gamberi_freschi: '🦐',
  calamari_surgelati: '🦑',
  polpo: '🐙',

  // Dispensa
  miele: '🍯',
  olive_nere: '🫒',
  olive_verdi: '🫒',
  sale: '🧂',
  cioccolato_fondente: '🍫',
  gocce_cioccolato: '🍫',
};
