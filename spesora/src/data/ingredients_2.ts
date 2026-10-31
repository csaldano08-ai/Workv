import type { Ingredient } from '../core/domain/types';

/*
 * Ampliamento del dizionario canonico (catalogo 150+ ricette).
 * Stesse regole di ingredients.ts: alimenti semplici → 'verificato';
 * prodotti composti o la cui composizione varia per marca → 'non_verificato'.
 * Pesce e legumi in scatola: peso sgocciolato.
 */

const VEGANO = { vegan: true, vegetarian: true, pescatarian: true } as const;
const VEGETARIANO = { vegan: false, vegetarian: true, pescatarian: true } as const;
const PESCE = { vegan: false, vegetarian: false, pescatarian: true } as const;
const CARNE = { vegan: false, vegetarian: false, pescatarian: false } as const;

export const INGREDIENTS_2: Ingredient[] = [
  /* Cereali, farine, impasti */
  { id: 'orzo_perlato', name: 'Orzo perlato', aliases: ['orzo', 'orzo decorticato'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'bulgur', name: 'Bulgur', aliases: ['grano spezzato', 'burghul'], unit: 'g', category: 'pasta_riso_cereali', allergens: ['glutine'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'farina_ceci', name: 'Farina di ceci', aliases: ['farina ceci'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [500] },
  { id: 'pasta_sfoglia', name: 'Pasta sfoglia', aliases: ['sfoglia', 'rotolo di pasta sfoglia'], unit: 'pz', category: 'latticini_uova', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'pane_carasau', name: 'Pane carasau', aliases: ['carasau', 'carta da musica'], unit: 'g', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'tortilla', name: 'Tortilla di frumento', aliases: ['tortillas', 'wrap', 'tortilla'], unit: 'pz', category: 'pane_forno', allergens: ['glutine'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'lievito_birra', name: 'Lievito di birra secco', aliases: ['lievito di birra', 'lievito secco'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'noodles_riso', name: 'Spaghetti di riso', aliases: ['noodles di riso', 'vermicelli di riso', 'tagliatelle di riso'], unit: 'g', category: 'pasta_riso_cereali', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },

  /* Legumi e proteine vegetali */
  { id: 'fagioli_neri', name: 'Fagioli neri cotti', aliases: ['fagioli neri'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'piselli_secchi_spezzati', name: 'Piselli secchi spezzati', aliases: ['piselli spezzati', 'piselli secchi'], unit: 'g', category: 'legumi', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'edamame', name: 'Edamame surgelati', aliases: ['edamame', 'fagioli di soia'], unit: 'g', category: 'surgelati', allergens: ['soia'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'tempeh', name: 'Tempeh', aliases: ['tempe'], unit: 'g', category: 'legumi', allergens: ['soia'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'tahina', name: 'Tahina', aliases: ['tahin', 'crema di sesamo'], unit: 'g', category: 'dispensa', allergens: ['sesamo'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },

  /* Verdura e frutta */
  { id: 'cavolo_nero', name: 'Cavolo nero', aliases: ['cavolo toscano'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'verza', name: 'Verza', aliases: ['cavolo verza', 'cavolo cappuccio'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'asparagi', name: 'Asparagi', aliases: ['asparago', 'punte di asparagi'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_3' },
  { id: 'carciofi', name: 'Carciofi', aliases: ['carciofo', 'cuori di carciofo'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'radicchio', name: 'Radicchio rosso', aliases: ['radicchio', 'radicchio trevisano', 'radicchio di chioggia'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'cavoletti_bruxelles', name: 'Cavoletti di Bruxelles', aliases: ['cavolini di bruxelles', 'cavoletti'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'patata_dolce', name: 'Patata dolce', aliases: ['patate dolci', 'patata americana', 'batata'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'zenzero', name: 'Zenzero fresco', aliases: ['zenzero', 'radice di zenzero'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana', staple: true },
  { id: 'lime', name: 'Lime', aliases: ['limetta', 'lime fresco'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'erba_cipollina', name: 'Erba cipollina', aliases: ['erba cipollina fresca'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5', staple: true },
  { id: 'menta_fresca', name: 'Menta fresca', aliases: ['menta', 'foglie di menta'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5', staple: true },
  { id: 'pomodori_secchi', name: 'Pomodori secchi sott’olio', aliases: ['pomodori secchi', 'pomodori essiccati'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'mirtilli', name: 'Mirtilli freschi', aliases: ['mirtillo fresco', 'mirtilli neri'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'ananas', name: 'Ananas', aliases: ['ananas fresco'], unit: 'g', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'settimana' },
  { id: 'pesca', name: 'Pesca', aliases: ['pesche', 'pesca noce', 'nettarina'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'mango', name: 'Mango', aliases: ['manghi'], unit: 'pz', category: 'frutta_verdura', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'fresco_5' },
  { id: 'datteri', name: 'Datteri secchi', aliases: ['datteri', 'dattero'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },

  /* Frutta secca e semi */
  { id: 'nocciole', name: 'Nocciole', aliases: ['nocciola', 'nocciole tostate'], unit: 'g', category: 'dispensa', allergens: ['frutta_guscio'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'anacardi', name: 'Anacardi', aliases: ['anacardo'], unit: 'g', category: 'dispensa', allergens: ['frutta_guscio'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'pistacchi', name: 'Pistacchi sgusciati', aliases: ['pistacchi', 'pistacchio'], unit: 'g', category: 'dispensa', allergens: ['frutta_guscio'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'pinoli', name: 'Pinoli', aliases: ['pinolo'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'semi_sesamo', name: 'Semi di sesamo', aliases: ['sesamo', 'semi sesamo'], unit: 'g', category: 'dispensa', allergens: ['sesamo'], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'semi_chia', name: 'Semi di chia', aliases: ['chia'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'semi_zucca', name: 'Semi di zucca', aliases: ['semi di zucca sgusciati'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'cocco_rape', name: 'Cocco rapé', aliases: ['cocco grattugiato', 'farina di cocco', 'cocco disidratato'], unit: 'g', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
  { id: 'latte_cocco', name: 'Latte di cocco', aliases: ['latte di cocco in lattina', 'crema di cocco'], unit: 'ml', category: 'dispensa', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', commonPackSizes: [400] },

  /* Latticini */
  { id: 'gorgonzola', name: 'Gorgonzola', aliases: ['gorgonzola dolce'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'stracchino', name: 'Stracchino', aliases: ['crescenza'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'fresco_5' },
  { id: 'scamorza', name: 'Scamorza affumicata', aliases: ['scamorza', 'provola affumicata'], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'mascarpone', name: 'Mascarpone', aliases: [], unit: 'g', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },
  { id: 'kefir', name: 'Kefir', aliases: ['kefir di latte'], unit: 'ml', category: 'latticini_uova', allergens: ['latte'], allergenStatus: 'verificato', ...VEGETARIANO, perishability: 'settimana' },

  /* Carne e salumi */
  { id: 'fesa_tacchino', name: 'Fesa di tacchino a cubetti', aliases: ['bocconcini di tacchino', 'tacchino a cubetti'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'lonza_maiale', name: 'Lonza di maiale a fette', aliases: ['lonza', 'braciole di maiale', 'fettine di maiale'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'fettine_vitello', name: 'Fettine di vitello', aliases: ['scaloppine', 'fesa di vitello'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'spezzatino_manzo', name: 'Manzo a cubetti', aliases: ['spezzatino', 'spezzatino di manzo'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'verificato', ...CARNE, perishability: 'fresco_3' },
  { id: 'bresaola', name: 'Bresaola', aliases: [], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'settimana' },
  { id: 'speck', name: 'Speck', aliases: ['speck a cubetti'], unit: 'g', category: 'carne', allergens: [], allergenStatus: 'non_verificato', ...CARNE, perishability: 'settimana' },

  /* Pesce e molluschi */
  { id: 'orata_filetti', name: 'Filetti di orata', aliases: ['orata', 'filetto di orata', 'branzino', 'filetti di branzino'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'pesce_spada', name: 'Pesce spada a fette', aliases: ['pesce spada', 'trancio di pesce spada'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'calamari_surgelati', name: 'Anelli di calamaro surgelati', aliases: ['calamari', 'anelli di totano', 'totani'], unit: 'g', category: 'surgelati', allergens: ['molluschi'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'cozze', name: 'Cozze', aliases: ['cozza', 'mitili'], unit: 'g', category: 'pesce', allergens: ['molluschi'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'vongole', name: 'Vongole', aliases: ['vongola', 'lupini di mare'], unit: 'g', category: 'pesce', allergens: ['molluschi'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },
  { id: 'acciughe_olio', name: 'Filetti di acciuga sott’olio', aliases: ['acciughe', 'alici sott olio', 'filetti di acciuga'], unit: 'g', category: 'dispensa', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'dispensa' },
  { id: 'tonno_fresco', name: 'Tonno fresco', aliases: ['trancio di tonno', 'tonno a fette'], unit: 'g', category: 'pesce', allergens: ['pesce'], allergenStatus: 'verificato', ...PESCE, perishability: 'fresco_1' },

  /* Condimenti */
  { id: 'senape', name: 'Senape', aliases: ['mostarda di digione', 'senape delicata'], unit: 'g', category: 'condimenti_spezie', allergens: ['senape'], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'vaniglia', name: 'Estratto di vaniglia', aliases: ['vaniglia', 'vanillina', 'aroma vaniglia'], unit: 'ml', category: 'condimenti_spezie', allergens: [], allergenStatus: 'non_verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'timo', name: 'Timo', aliases: ['timo secco', 'timo fresco'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'alloro', name: 'Alloro', aliases: ['foglia di alloro', 'foglie di alloro', 'lauro'], unit: 'g', category: 'condimenti_spezie', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa', staple: true },
  { id: 'sciroppo_acero', name: "Sciroppo d'acero", aliases: ['sciroppo di acero', 'maple'], unit: 'ml', category: 'dispensa', allergens: [], allergenStatus: 'verificato', ...VEGANO, perishability: 'dispensa' },
];
