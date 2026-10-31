import type { Ingredient } from '../core/domain/types';

/*
 * Dizionario canonico degli ingredienti.
 *
 * Regole seguite:
 * - Alimenti semplici e generici con profilo allergenico noto → 'verificato'.
 * - Prodotti composti la cui ricetta cambia da marca a marca (pane, pesto, dado,
 *   biscotti, salumi, bevande vegetali…) → 'non_verificato': gli allergeni elencati
 *   sono quelli noti, ma la lista potrebbe essere incompleta. Controllare l'etichetta.
 * - I legumi e il pesce in scatola si dosano a peso SGOCCIOLATO nelle ricette.
 * - Le unità 'pz' dell'aglio indicano lo spicchio.
 */

const VEGANO = { vegan: true, vegetarian: true, pescatarian: true } as const;
const VEGETARIANO = { vegan: false, vegetarian: true, pescatarian: true } as const;
const PESCE = { vegan: false, vegetarian: false, pescatarian: true } as const;
const CARNE = { vegan: false, vegetarian: false, pescatarian: false } as const;

export const INGREDIENTS: Ingredient[] = [
  /* ------------------------------------------------------------------ */
  /* Pasta, riso, cereali                                                */
  /* ------------------------------------------------------------------ */
  { id: 'pasta_secca', name: 'Pasta di semola', aliases: ['pasta', 'pasta secca', 'spaghetti', 'penne', 'fusilli', 'rigatoni', 'farfalle', 'pastina'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500, 1000] },
  { id: 'pasta_integrale', name: 'Pasta integrale', aliases: ['pasta integrale di semola', 'spaghetti integrali', 'penne integrali'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'pasta_senza_glutine', name: 'Pasta senza glutine', aliases: ['pasta gluten free', 'pasta di mais e riso'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'pasta_uovo', name: "Pasta all'uovo", aliases: ['tagliatelle', 'fettuccine', 'pasta fresca all uovo'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine', 'uova'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'dispensa', commonPackSizes: [250, 500] },
  { id: 'gnocchi_patate', name: 'Gnocchi di patate', aliases: ['gnocchi', 'gnocchi freschi'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana', commonPackSizes: [500] },
  { id: 'riso', name: 'Riso', aliases: ['riso carnaroli', 'riso arborio', 'riso per risotti', 'riso originario'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000] },
  { id: 'riso_basmati', name: 'Riso basmati', aliases: ['basmati', 'riso a chicco lungo'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'couscous', name: 'Couscous', aliases: ['cous cous', 'cuscus', 'cuscussu'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'farro', name: 'Farro perlato', aliases: ['farro', 'farro decorticato'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'quinoa', name: 'Quinoa', aliases: ['quinoa bianca', 'quinoa rossa'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'fiocchi_avena', name: "Fiocchi d'avena", aliases: ['avena', 'fiocchi di avena', 'avena in fiocchi'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'polenta_istantanea', name: 'Farina per polenta istantanea', aliases: ['polenta', 'polenta istantanea', 'farina di mais'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'cereali_colazione', name: 'Cereali da colazione', aliases: ['cereali', 'corn flakes', 'fiocchi di mais'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'muesli', name: 'Muesli', aliases: ['muesli croccante', 'granola'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine', 'frutta_guscio'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'farina', name: 'Farina di grano tenero', aliases: ['farina', 'farina 00', 'farina bianca'], unit: 'g', category: 'dispensa', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000] },
  { id: 'pangrattato', name: 'Pangrattato', aliases: ['pane grattugiato', 'pan grattato'], unit: 'g', category: 'dispensa', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'lievito_dolci', name: 'Lievito per dolci', aliases: ['lievito in polvere', 'lievito chimico', 'bustina di lievito'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },

  /* ------------------------------------------------------------------ */
  /* Pane e prodotti da forno                                            */
  /* ------------------------------------------------------------------ */
  { id: 'pane', name: 'Pane', aliases: ['pane fresco', 'pagnotta', 'pane comune', 'filone', 'pane casereccio'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'pane_integrale', name: 'Pane integrale', aliases: ['pane di farina integrale'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'pane_cassetta', name: 'Pane in cassetta', aliases: ['pancarre', 'pan carre', 'pane da toast', 'pane per tramezzini'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'piadina', name: 'Piadina', aliases: ['piadine', 'piadina romagnola'], unit: 'pz', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'fette_biscottate', name: 'Fette biscottate', aliases: ['fetta biscottata'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'biscotti_secchi', name: 'Biscotti secchi', aliases: ['biscotti', 'biscotti da colazione', 'frollini'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'gallette_riso', name: 'Gallette di riso', aliases: ['gallette', 'galletta di riso'], unit: 'g', category: 'pane_forno', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'crackers', name: 'Crackers', aliases: ['cracker', 'crackers salati'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },

  /* ------------------------------------------------------------------ */
  /* Legumi e proteine vegetali                                          */
  /* ------------------------------------------------------------------ */
  { id: 'ceci_cotti', name: 'Ceci cotti', aliases: ['ceci', 'ceci in scatola', 'ceci lessati', 'ceci precotti'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'fagioli_cannellini', name: 'Fagioli cannellini cotti', aliases: ['cannellini', 'fagioli cannellini', 'fagioli bianchi'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'fagioli_borlotti', name: 'Fagioli borlotti cotti', aliases: ['borlotti', 'fagioli borlotti', 'fagioli'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'lenticchie_cotte', name: 'Lenticchie cotte', aliases: ['lenticchie', 'lenticchie in scatola', 'lenticchie lessate'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'lenticchie_rosse', name: 'Lenticchie rosse decorticate', aliases: ['lenticchie rosse', 'lenticchie decorticate'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'tofu', name: 'Tofu', aliases: ['tofu naturale', 'tofu al naturale'], unit: 'g', category: 'legumi', allergens: ['soia'], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'hummus', name: 'Hummus pronto', aliases: ['hummus', 'crema di ceci pronta'], unit: 'g', category: 'legumi', allergens: ['sesamo'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'fresco_5' },

  /* ------------------------------------------------------------------ */
  /* Verdura fresca                                                      */
  /* ------------------------------------------------------------------ */
  { id: 'pomodoro', name: 'Pomodoro', aliases: ['pomodori', 'pomodoro fresco', 'pomodori freschi', 'pomodoro da insalata'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'pomodorini', name: 'Pomodorini', aliases: ['pomodorino', 'pomodori ciliegino', 'pomodorini ciliegini', 'ciliegini', 'datterini'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'cipolla', name: 'Cipolla', aliases: ['cipolle', 'cipolla dorata', 'cipolla bianca'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'cipolla_rossa', name: 'Cipolla rossa', aliases: ['cipolle rosse', 'cipolla di tropea'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'aglio', name: 'Aglio', aliases: ['spicchio d aglio', 'spicchi d aglio', 'testa d aglio', 'aglio fresco'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana', staple: true },
  { id: 'carota', name: 'Carota', aliases: ['carote'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'sedano', name: 'Sedano', aliases: ['costa di sedano', 'coste di sedano', 'gambo di sedano'], unit: 'g', category: 'frutta_verdura', allergens: ['sedano'], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'zucchina', name: 'Zucchina', aliases: ['zucchine', 'zucchino', 'zucchini'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'melanzana', name: 'Melanzana', aliases: ['melanzane'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'peperone', name: 'Peperone', aliases: ['peperoni', 'peperone rosso', 'peperone giallo'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'patata', name: 'Patata', aliases: ['patate', 'patata a pasta gialla'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'spinaci_freschi', name: 'Spinaci freschi', aliases: ['spinaci', 'spinaci novelli', 'spinacino'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'insalata', name: 'Insalata verde', aliases: ['insalata', 'lattuga', 'misticanza', 'insalata mista'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'rucola', name: 'Rucola', aliases: ['rughetta'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'broccolo', name: 'Broccolo', aliases: ['broccoli', 'cime di broccolo'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'cavolfiore', name: 'Cavolfiore', aliases: ['cavolfiori', 'cavolo bianco'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'funghi_champignon', name: 'Funghi champignon', aliases: ['funghi', 'champignon', 'funghi freschi'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'cetriolo', name: 'Cetriolo', aliases: ['cetrioli'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'fagiolini', name: 'Fagiolini', aliases: ['fagiolino', 'cornetti'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'finocchio', name: 'Finocchio', aliases: ['finocchi'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'zucca', name: 'Zucca', aliases: ['zucca a pezzi', 'zucca delica', 'zucca mantovana'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'porro', name: 'Porro', aliases: ['porri'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'avocado', name: 'Avocado', aliases: ['avocadi'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'limone', name: 'Limone', aliases: ['limoni', 'succo di limone'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'basilico_fresco', name: 'Basilico fresco', aliases: ['basilico', 'foglie di basilico'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'prezzemolo', name: 'Prezzemolo', aliases: ['prezzemolo fresco', 'ciuffo di prezzemolo'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },

  /* ------------------------------------------------------------------ */
  /* Frutta                                                              */
  /* ------------------------------------------------------------------ */
  { id: 'banana', name: 'Banana', aliases: ['banane'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'mela', name: 'Mela', aliases: ['mele'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'pera', name: 'Pera', aliases: ['pere'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'arancia', name: 'Arancia', aliases: ['arance'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'kiwi', name: 'Kiwi', aliases: ['kiwi verde'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'fragole', name: 'Fragole', aliases: ['fragola'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'frutti_bosco', name: 'Frutti di bosco surgelati', aliases: ['frutti di bosco', 'mirtilli', 'frutti rossi'], unit: 'g', category: 'surgelati', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'uvetta', name: 'Uvetta', aliases: ['uva passa', 'uvetta sultanina'], unit: 'g', category: 'dispensa', allergens: ['solfiti'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },

  /* ------------------------------------------------------------------ */
  /* Frutta a guscio, dolci e spalmabili                                 */
  /* ------------------------------------------------------------------ */
  { id: 'noci', name: 'Noci sgusciate', aliases: ['noci', 'gherigli di noce', 'noce'], unit: 'g', category: 'dispensa', allergens: ['frutta_guscio'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'mandorle', name: 'Mandorle', aliases: ['mandorla', 'mandorle sgusciate'], unit: 'g', category: 'dispensa', allergens: ['frutta_guscio'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'burro_arachidi', name: 'Burro di arachidi', aliases: ['crema di arachidi', 'burro d arachidi'], unit: 'g', category: 'dispensa', allergens: ['arachidi'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'cioccolato_fondente', name: 'Cioccolato fondente', aliases: ['cioccolato', 'cioccolata fondente', 'scaglie di cioccolato'], unit: 'g', category: 'dispensa', allergens: ['latte', 'soia'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'marmellata', name: 'Marmellata', aliases: ['confettura', 'confettura di frutta', 'marmellata di frutta'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'miele', name: 'Miele', aliases: ['miele millefiori', 'miele d acacia'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'zucchero', name: 'Zucchero', aliases: ['zucchero semolato', 'zucchero bianco', 'zucchero di canna'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000] },
  { id: 'cacao_amaro', name: 'Cacao amaro in polvere', aliases: ['cacao amaro', 'cacao in polvere', 'cacao'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },

  /* ------------------------------------------------------------------ */
  /* Latte, latticini, uova, alternative vegetali                         */
  /* ------------------------------------------------------------------ */
  { id: 'latte', name: 'Latte', aliases: ['latte intero', 'latte parzialmente scremato', 'latte fresco', 'latte vaccino'], unit: 'ml', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_5', commonPackSizes: [500, 1000] },
  { id: 'bevanda_avena', name: "Bevanda all'avena", aliases: ['latte di avena', 'bevanda di avena'], unit: 'ml', category: 'latticini_uova', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana', commonPackSizes: [1000] },
  { id: 'bevanda_soia', name: 'Bevanda di soia', aliases: ['latte di soia', 'bevanda alla soia'], unit: 'ml', category: 'latticini_uova', allergens: ['soia'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana', commonPackSizes: [1000] },
  { id: 'yogurt_bianco', name: 'Yogurt bianco naturale', aliases: ['yogurt', 'yogurt bianco', 'yogurt naturale', 'yogurt intero'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_5', commonPackSizes: [125, 500] },
  { id: 'yogurt_greco', name: 'Yogurt greco', aliases: ['yogurt colato', 'yogurt greco bianco'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_5' },
  { id: 'yogurt_soia', name: 'Yogurt di soia', aliases: ['yogurt vegetale', 'yogurt alla soia'], unit: 'g', category: 'latticini_uova', allergens: ['soia'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'burro', name: 'Burro', aliases: ['burro fresco', 'burro di latte'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana', commonPackSizes: [125, 250] },
  { id: 'panna_cucina', name: 'Panna da cucina', aliases: ['panna', 'panna da cucina uht'], unit: 'ml', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana', commonPackSizes: [200] },
  { id: 'mozzarella', name: 'Mozzarella', aliases: ['mozzarelle', 'fiordilatte', 'fior di latte'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_3', commonPackSizes: [125] },
  { id: 'ricotta', name: 'Ricotta', aliases: ['ricotta vaccina', 'ricotta fresca'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_3', commonPackSizes: [250] },
  { id: 'parmigiano', name: 'Parmigiano Reggiano', aliases: ['parmigiano', 'parmigiano grattugiato', 'parmigiano reggiano grattugiato'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'pecorino', name: 'Pecorino romano', aliases: ['pecorino', 'pecorino grattugiato'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'feta', name: 'Feta', aliases: ['formaggio feta'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_5' },
  { id: 'formaggio_spalmabile', name: 'Formaggio fresco spalmabile', aliases: ['formaggio spalmabile', 'formaggio cremoso'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'fresco_5' },
  { id: 'uova', name: 'Uova', aliases: ['uovo', 'uova fresche', 'uova di gallina'], unit: 'pz', category: 'latticini_uova', allergens: ['uova'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana', commonPackSizes: [6, 10] },

  /* ------------------------------------------------------------------ */
  /* Carne e salumi                                                      */
  /* ------------------------------------------------------------------ */
  { id: 'petto_pollo', name: 'Petto di pollo', aliases: ['pollo', 'fettine di pollo', 'petti di pollo', 'bocconcini di pollo'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'cosce_pollo', name: 'Cosce di pollo', aliases: ['coscia di pollo', 'sovracosce di pollo', 'fusi di pollo'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'tacchino_fettine', name: 'Fettine di tacchino', aliases: ['tacchino', 'fesa di tacchino', 'petto di tacchino'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'macinato_manzo', name: 'Carne macinata di manzo', aliases: ['macinato', 'carne macinata', 'macinato di manzo', 'trita di manzo'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_1' },
  { id: 'salsiccia', name: 'Salsiccia', aliases: ['salsicce', 'salsiccia di maiale'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'prosciutto_cotto', name: 'Prosciutto cotto', aliases: ['cotto', 'prosciutto cotto a fette'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'fresco_5' },
  { id: 'prosciutto_crudo', name: 'Prosciutto crudo', aliases: ['crudo', 'prosciutto crudo a fette'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'fresco_5' },
  { id: 'pancetta', name: 'Pancetta a cubetti', aliases: ['pancetta', 'dadini di pancetta', 'cubetti di pancetta'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'settimana' },

  /* ------------------------------------------------------------------ */
  /* Pesce                                                               */
  /* ------------------------------------------------------------------ */
  { id: 'tonno_scatola', name: 'Tonno in scatola', aliases: ['tonno', 'tonno sott olio', 'tonno al naturale', 'tonno in scatoletta'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'sgombro_scatola', name: 'Sgombro in scatola', aliases: ['sgombro', 'filetti di sgombro'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'salmone', name: 'Filetto di salmone', aliases: ['salmone', 'salmone fresco', 'trancio di salmone'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'salmone_affumicato', name: 'Salmone affumicato', aliases: ['salmone affumicato a fette'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_5' },
  { id: 'merluzzo_surgelato', name: 'Filetti di merluzzo surgelati', aliases: ['merluzzo', 'filetti di merluzzo', 'nasello', 'filetti di nasello'], unit: 'g', category: 'surgelati', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'gamberetti_surgelati', name: 'Gamberetti sgusciati surgelati', aliases: ['gamberetti', 'gamberi', 'code di gambero'], unit: 'g', category: 'surgelati', allergens: ['crostacei'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },

  /* ------------------------------------------------------------------ */
  /* Surgelati vegetali                                                  */
  /* ------------------------------------------------------------------ */
  { id: 'piselli_surgelati', name: 'Piselli surgelati', aliases: ['piselli', 'pisellini'], unit: 'g', category: 'surgelati', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'spinaci_surgelati', name: 'Spinaci surgelati', aliases: ['spinaci in cubetti', 'cubetti di spinaci'], unit: 'g', category: 'surgelati', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'minestrone_surgelato', name: 'Minestrone surgelato', aliases: ['minestrone', 'verdure per minestrone'], unit: 'g', category: 'surgelati', allergens: ['sedano'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000] },

  /* ------------------------------------------------------------------ */
  /* Dispensa: conserve e salse                                          */
  /* ------------------------------------------------------------------ */
  { id: 'pomodori_pelati', name: 'Pomodori pelati', aliases: ['pelati', 'pomodori pelati in scatola', 'polpa di pomodoro'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [400] },
  { id: 'passata_pomodoro', name: 'Passata di pomodoro', aliases: ['passata', 'salsa di pomodoro', 'pomodoro passato'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [700] },
  { id: 'mais_scatola', name: 'Mais in scatola', aliases: ['mais', 'mais dolce', 'granturco'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'olive_nere', name: 'Olive nere', aliases: ['olive', 'olive denocciolate'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'capperi', name: 'Capperi', aliases: ['capperi sotto sale', 'capperi sott aceto'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'pesto_basilico', name: 'Pesto alla genovese', aliases: ['pesto', 'pesto al basilico', 'pesto di basilico'], unit: 'g', category: 'dispensa', allergens: ['latte', 'frutta_guscio'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'dado_vegetale', name: 'Dado vegetale', aliases: ['dado', 'brodo granulare', 'brodo vegetale', 'brodo'], unit: 'g', category: 'condimenti_spezie', allergens: ['sedano'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'salsa_soia', name: 'Salsa di soia', aliases: ['soy sauce', 'shoyu'], unit: 'ml', category: 'condimenti_spezie', allergens: ['soia', 'glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },

  /* ------------------------------------------------------------------ */
  /* Condimenti e spezie (q.b.)                                          */
  /* ------------------------------------------------------------------ */
  { id: 'olio_evo', name: "Olio extravergine d'oliva", aliases: ['olio', 'olio evo', 'olio extravergine', 'olio d oliva', 'olio extravergine di oliva'], unit: 'ml', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000], staple: true },
  { id: 'aceto', name: 'Aceto di vino', aliases: ['aceto', 'aceto di vino bianco', 'aceto di vino rosso'], unit: 'ml', category: 'condimenti_spezie', allergens: ['solfiti'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'aceto_balsamico', name: 'Aceto balsamico', aliases: ['balsamico', 'aceto balsamico di modena'], unit: 'ml', category: 'condimenti_spezie', allergens: ['solfiti'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'sale', name: 'Sale', aliases: ['sale fino', 'sale grosso', 'sale da cucina'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000], staple: true },
  { id: 'pepe', name: 'Pepe nero', aliases: ['pepe', 'pepe macinato', 'pepe in grani'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'origano', name: 'Origano secco', aliases: ['origano'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'peperoncino', name: 'Peperoncino', aliases: ['peperoncino secco', 'peperoncino in polvere', 'peperoncino tritato'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'rosmarino', name: 'Rosmarino', aliases: ['rosmarino secco', 'rametto di rosmarino'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'salvia', name: 'Salvia', aliases: ['foglie di salvia', 'salvia secca'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'paprika', name: 'Paprika dolce', aliases: ['paprika', 'paprica'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'curcuma', name: 'Curcuma', aliases: ['curcuma in polvere'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'cumino', name: 'Cumino in polvere', aliases: ['cumino', 'semi di cumino'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'curry', name: 'Curry in polvere', aliases: ['curry', 'polvere di curry'], unit: 'g', category: 'condimenti_spezie', allergens: ['senape'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'noce_moscata', name: 'Noce moscata', aliases: ['noce moscata macinata'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'cannella', name: 'Cannella in polvere', aliases: ['cannella'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
];
