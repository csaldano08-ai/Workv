import type { Ingredient } from '../core/domain/types';

/*
 * Terzo ampliamento del dizionario canonico (catalogo verso 500+ ricette).
 * Regole invariate: alimenti semplici → 'verificato'; prodotti composti o la cui
 * composizione varia per marca (salumi, formaggi con possibile lisozima, impasti pronti,
 * salse) → 'non_verificato' con gli allergeni noti. Controllare sempre l'etichetta.
 */

const VEGANO = { vegan: true, vegetarian: true, pescatarian: true } as const;
const VEGETARIANO = { vegan: false, vegetarian: true, pescatarian: true } as const;
const PESCE = { vegan: false, vegetarian: false, pescatarian: true } as const;
const CARNE = { vegan: false, vegetarian: false, pescatarian: false } as const;

export const INGREDIENTS_3: Ingredient[] = [
  /* Cereali, farine, impasti */
  { id: 'riso_integrale', name: 'Riso integrale', aliases: ['riso integrale lungo'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000] },
  { id: 'riso_venere', name: 'Riso nero Venere', aliases: ['riso venere', 'riso nero'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'miglio', name: 'Miglio decorticato', aliases: ['miglio'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'grano_saraceno', name: 'Grano saraceno', aliases: ['grano saraceno in chicchi'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'farina_integrale', name: 'Farina integrale di frumento', aliases: ['farina integrale'], unit: 'g', category: 'dispensa', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000] },
  { id: 'farina_riso', name: 'Farina di riso', aliases: ['farina di riso fine'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'semola_rimacinata', name: 'Semola rimacinata', aliases: ['semola di grano duro'], unit: 'g', category: 'dispensa', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [1000] },
  { id: 'fecola_patate', name: 'Fecola di patate', aliases: ['fecola', 'amido di patate'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'amido_mais', name: 'Amido di mais', aliases: ['maizena', 'amido di mais in polvere'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'tortellini', name: 'Tortellini freschi al prosciutto', aliases: ['tortellini', 'tortellini alla carne'], unit: 'g', category: 'latticini_uova', allergens: ['glutine', 'uova', 'latte'], allergenStatus: 'non_verificato', ...CARNE, perishability: 'settimana', commonPackSizes: [250] },
  { id: 'ravioli_ricotta_spinaci', name: 'Ravioli freschi ricotta e spinaci', aliases: ['ravioli', 'ravioli di magro'], unit: 'g', category: 'latticini_uova', allergens: ['glutine', 'uova', 'latte'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana', commonPackSizes: [250] },
  { id: 'lasagne_secche', name: "Lasagne all'uovo secche", aliases: ['sfoglie per lasagne', 'lasagne'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine', 'uova'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'pasta_brisee', name: 'Pasta brisée', aliases: ['brisee', 'rotolo di pasta brisée'], unit: 'pz', category: 'latticini_uova', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'pasta_pizza', name: 'Impasto per pizza pronto', aliases: ['pasta per pizza', 'base pizza'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'focaccia', name: 'Focaccia', aliases: ['focaccia bianca', 'focaccia genovese'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'grissini', name: 'Grissini', aliases: ['grissino'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'taralli', name: 'Taralli', aliases: ['tarallini'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'pane_arabo', name: 'Pane pita', aliases: ['pita', 'pane arabo'], unit: 'pz', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'pane_senza_glutine', name: 'Pane senza glutine', aliases: ['pane per celiaci', 'pane gluten free'], unit: 'g', category: 'pane_forno', allergens: [], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'fiocchi_mais', name: 'Fiocchi di mais naturali', aliases: ['corn flakes senza zucchero aggiunto'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'gallette_mais', name: 'Gallette di mais', aliases: ['gallette mais'], unit: 'g', category: 'pane_forno', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },

  /* Legumi e proteine vegetali */
  { id: 'fave_surgelate', name: 'Fave surgelate', aliases: ['fave', 'fave sgusciate'], unit: 'g', category: 'surgelati', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'fave_secche', name: 'Fave secche decorticate', aliases: ['fave secche', 'fave spezzate'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'lenticchie_secche', name: 'Lenticchie secche', aliases: ['lenticchie piccole', 'lenticchie da cuocere'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'ceci_secchi', name: 'Ceci secchi', aliases: ['ceci da ammollare'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'lupini', name: 'Lupini in salamoia', aliases: ['lupini'], unit: 'g', category: 'legumi', allergens: ['lupini'], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'seitan', name: 'Seitan', aliases: ['seitan al naturale'], unit: 'g', category: 'legumi', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'arachidi', name: 'Arachidi tostate', aliases: ['arachidi', 'noccioline'], unit: 'g', category: 'dispensa', allergens: ['arachidi'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },

  /* Verdura */
  { id: 'bietole', name: 'Bietole', aliases: ['bieta', 'erbette', 'coste'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'cicoria', name: 'Cicoria', aliases: ['catalogna', 'cicoria da campo'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'scarola', name: 'Scarola', aliases: ['indivia scarola'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'cime_rapa', name: 'Cime di rapa', aliases: ['broccoli di rapa', 'friarielli', 'rapini'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'cavolo_rosso', name: 'Cavolo rosso', aliases: ['cavolo cappuccio rosso'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'romanesco', name: 'Cavolo romanesco', aliases: ['broccolo romanesco'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'ravanelli', name: 'Ravanelli', aliases: ['ravanello'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'barbabietola', name: 'Barbabietola cotta', aliases: ['barbabietole', 'rapa rossa'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'cipollotto', name: 'Cipollotto', aliases: ['cipollotti', 'cipolla fresca'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'scalogno', name: 'Scalogno', aliases: ['scalogni'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'funghi_porcini_secchi', name: 'Funghi porcini secchi', aliases: ['porcini secchi'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'funghi_misti_surgelati', name: 'Funghi misti surgelati', aliases: ['funghi surgelati', 'funghi trifolati surgelati'], unit: 'g', category: 'surgelati', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'fiori_zucca', name: 'Fiori di zucca', aliases: ['fiori di zucchina'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_1' },
  { id: 'olive_verdi', name: 'Olive verdi', aliases: ['olive verdi denocciolate'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'concentrato_pomodoro', name: 'Concentrato di pomodoro', aliases: ['doppio concentrato', 'triplo concentrato'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'pomodorini_scatola', name: 'Pomodorini in scatola', aliases: ['pomodorini pelati', 'datterini in scatola'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [400] },
  { id: 'verdure_grigliate_surgelate', name: 'Verdure grigliate surgelate', aliases: ['grigliata di verdure surgelata'], unit: 'g', category: 'surgelati', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'castagne', name: 'Castagne cotte', aliases: ['castagne precotte', 'castagne lessate'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },

  /* Frutta */
  { id: 'uva', name: 'Uva', aliases: ['grappolo d uva', 'acini d uva'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'ciliegie', name: 'Ciliegie', aliases: ['ciliegia'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'albicocche', name: 'Albicocche', aliases: ['albicocca'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'prugne', name: 'Prugne fresche', aliases: ['susine', 'susina', 'prugna'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'melone', name: 'Melone', aliases: ['melone retato', 'melone cantalupo'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'anguria', name: 'Anguria', aliases: ['cocomero'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'fichi', name: 'Fichi freschi', aliases: ['fico', 'fichi'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_1' },
  { id: 'cachi', name: 'Cachi', aliases: ['caco', 'kaki'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'mandarini', name: 'Mandarini', aliases: ['mandarino', 'clementine', 'clementina'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'melagrana', name: 'Melagrana', aliases: ['melograno', 'chicchi di melagrana'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'lamponi', name: 'Lamponi', aliases: ['lampone'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'prugne_secche', name: 'Prugne secche', aliases: ['prugne essiccate'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'albicocche_secche', name: 'Albicocche secche', aliases: ['albicocche essiccate'], unit: 'g', category: 'dispensa', allergens: ['solfiti'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'fichi_secchi', name: 'Fichi secchi', aliases: ['fichi essiccati'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },

  /* Frutta secca e semi */
  { id: 'semi_lino', name: 'Semi di lino', aliases: ['lino'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'semi_girasole', name: 'Semi di girasole', aliases: ['semi di girasole sgusciati'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'crema_nocciole', name: 'Crema spalmabile alle nocciole', aliases: ['crema alle nocciole', 'crema gianduia'], unit: 'g', category: 'dispensa', allergens: ['frutta_guscio', 'latte', 'soia'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'bevanda_mandorla', name: 'Bevanda alla mandorla', aliases: ['latte di mandorla'], unit: 'ml', category: 'bevande', allergens: ['frutta_guscio'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana', commonPackSizes: [1000] },
  { id: 'bevanda_riso', name: 'Bevanda di riso', aliases: ['latte di riso'], unit: 'ml', category: 'bevande', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana', commonPackSizes: [1000] },

  /* Latticini */
  { id: 'grana_padano', name: 'Grana Padano', aliases: ['grana', 'formaggio grana'], unit: 'g', category: 'latticini_uova', allergens: ['latte', 'uova'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'provolone', name: 'Provolone', aliases: ['provolone dolce'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'fontina', name: 'Fontina', aliases: ['formaggio fontina'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'asiago', name: 'Asiago', aliases: ['asiago fresco'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'caciocavallo', name: 'Caciocavallo', aliases: ['caciocavallo silano'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'emmental', name: 'Emmental', aliases: ['groviera', 'formaggio svizzero'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'burrata', name: 'Burrata', aliases: ['stracciatella', 'stracciatella di burrata'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_3' },
  { id: 'primo_sale', name: 'Primo sale', aliases: ['formaggio primo sale'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_5' },
  { id: 'besciamella', name: 'Besciamella pronta', aliases: ['besciamella', 'balsamella'], unit: 'ml', category: 'latticini_uova', allergens: ['latte', 'glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana', commonPackSizes: [200, 500] },
  { id: 'panna_acida', name: 'Panna acida', aliases: ['sour cream'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },

  /* Carne e salumi */
  { id: 'guanciale', name: 'Guanciale', aliases: ['guanciale stagionato'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'settimana' },
  { id: 'mortadella', name: 'Mortadella', aliases: ['mortadella bologna'], unit: 'g', category: 'carne', allergens: ['frutta_guscio'], allergenStatus: 'non_verificato', ...CARNE, perishability: 'fresco_5' },
  { id: 'wurstel', name: 'Würstel', aliases: ['wurstel', 'salsicce di frankfurt'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'settimana' },
  { id: 'macinato_misto', name: 'Macinato misto manzo e maiale', aliases: ['carne macinata mista', 'macinato misto'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_1' },
  { id: 'macinato_pollo', name: 'Macinato di pollo', aliases: ['carne macinata di pollo', 'macinato di tacchino'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_1' },
  { id: 'fettine_manzo', name: 'Fettine di manzo', aliases: ['carne per pizzaiola', 'fettine di vitellone'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'costine_maiale', name: 'Costine di maiale', aliases: ['costine', 'puntine di maiale'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'agnello', name: 'Agnello a pezzi', aliases: ['spezzatino di agnello', 'costolette di agnello'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'coniglio', name: 'Coniglio a pezzi', aliases: ['coniglio'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'fegatini_pollo', name: 'Fegatini di pollo', aliases: ['fegatini'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_1' },

  /* Pesce e molluschi */
  { id: 'alici_fresche', name: 'Alici fresche', aliases: ['acciughe fresche', 'alici'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'sardine_fresche', name: 'Sardine fresche', aliases: ['sarde', 'sardine'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'sgombro_fresco', name: 'Sgombro fresco', aliases: ['filetti di sgombro fresco'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'nasello', name: 'Nasello fresco', aliases: ['merluzzo fresco', 'filetti di nasello freschi'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'platessa', name: 'Filetti di platessa', aliases: ['platessa', 'sogliola'], unit: 'g', category: 'surgelati', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'baccala', name: 'Baccalà dissalato', aliases: ['baccala', 'stoccafisso ammollato'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_3' },
  { id: 'trota', name: 'Filetti di trota', aliases: ['trota salmonata', 'trota'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'seppie', name: 'Seppie pulite', aliases: ['seppia', 'seppioline'], unit: 'g', category: 'pesce', allergens: ['molluschi'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'polpo', name: 'Polpo', aliases: ['polipo', 'polpo surgelato'], unit: 'g', category: 'surgelati', allergens: ['molluschi'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'gamberi_freschi', name: 'Gamberi interi', aliases: ['mazzancolle', 'gamberoni', 'gamberi freschi'], unit: 'g', category: 'pesce', allergens: ['crostacei'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'sardine_scatola', name: 'Sardine sott’olio', aliases: ['sardine in scatola'], unit: 'g', category: 'dispensa', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'salmone_scatola', name: 'Salmone al naturale in scatola', aliases: ['salmone in scatola'], unit: 'g', category: 'dispensa', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },

  /* Condimenti e salse */
  { id: 'maionese', name: 'Maionese', aliases: ['maionese pronta'], unit: 'g', category: 'condimenti_spezie', allergens: ['uova', 'senape'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'pesto_rosso', name: 'Pesto rosso', aliases: ['pesto di pomodori secchi', 'pesto alla siciliana'], unit: 'g', category: 'dispensa', allergens: ['latte', 'frutta_guscio'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
  { id: 'zafferano', name: 'Zafferano', aliases: ['zafferano in polvere', 'pistilli di zafferano'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'maggiorana', name: 'Maggiorana', aliases: ['maggiorana secca'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'semi_finocchio', name: 'Semi di finocchio', aliases: ['finocchietto', 'finocchietto selvatico'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'chiodi_garofano', name: 'Chiodi di garofano', aliases: ['garofano'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'zucchero_canna', name: 'Zucchero di canna grezzo', aliases: ['zucchero grezzo', 'zucchero integrale di canna'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500, 1000] },
  { id: 'gocce_cioccolato', name: 'Gocce di cioccolato', aliases: ['gocce di cioccolato fondente'], unit: 'g', category: 'dispensa', allergens: ['latte', 'soia'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'dispensa' },
];
