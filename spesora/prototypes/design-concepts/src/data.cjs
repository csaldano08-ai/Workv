/* Contenuti reali della demo (catalogo Spesora, settimana del 16–22 novembre come nel video). */
const IMG = (id) => `../../../assets/recipes/card/${id}.jpg`;
const MINA = (pose) => `../../../assets/mascot/mina/optimized/mina_${pose}.png`;

const DAYS = [
  { d: 'Lun', n: 16 },
  { d: 'Mar', n: 17, today: true, shop: true },
  { d: 'Mer', n: 18 },
  { d: 'Gio', n: 19 },
  { d: 'Ven', n: 20 },
  { d: 'Sab', n: 21, shop: true },
  { d: 'Dom', n: 22 },
];

const MEALS = {
  17: [
    { type: 'Colazione', time: '07:30', name: 'Yogurt greco con pere caramellate', id: 'yogurt_greco_pere_caramellate', min: 12, have: '0 di 3 in dispensa' },
    { type: 'Pranzo', time: '13:00', name: 'Polenta concia', id: 'polenta_concia', min: 15, have: '0 di 4 in dispensa' },
    { type: 'Cena', time: '20:00', name: 'Pasta funghi e salsiccia', id: 'pasta_funghi_salsiccia', min: 30, have: '0 di 4 in dispensa' },
  ],
  18: [
    { type: 'Colazione', time: '07:30', name: 'Polenta morbida con uovo al tegamino', id: 'polenta_morbida_uovo_tegamino', min: 20 },
    { type: 'Pranzo', time: '13:00', name: 'Uova alla fiorentina', id: 'uova_alla_fiorentina', min: 30 },
    { type: 'Cena', time: '20:00', name: 'Riso al burro e parmigiano', id: 'riso_burro_parmigiano', min: 20 },
  ],
  16: [
    { type: 'Colazione', time: '07:30', name: 'Fette biscottate con ricotta e marmellata', id: 'fette_biscottate_ricotta_marmellata', min: 5 },
    { type: 'Pranzo', time: '13:00', name: 'Couscous con verdure e ceci', id: 'couscous_verdure_ceci', min: 20 },
    { type: 'Cena', time: '20:00', name: 'Gamberi e zucchine alla curcuma', id: 'gamberi_zucchine_curcuma', min: 20 },
  ],
  20: [
    { type: 'Colazione', time: '07:30', name: 'Yogurt greco con albicocche e avena', id: 'yogurt_greco_albicocche_avena', min: 5 },
    { type: 'Pranzo', time: '13:00', name: 'Tacos di lenticchie', id: 'tacos_lenticchie', min: 25 },
    { type: 'Cena', time: '20:00', name: 'Crocchette di salmone e patate', id: 'crocchette_salmone_patate_friggitrice', min: 30 },
  ],
  21: [
    { type: 'Colazione', time: '08:30', name: 'Fragole con limone e zucchero', id: 'fragole_limone_zucchero', min: 5 },
    { type: 'Pranzo', time: '13:00', name: 'Bruschetta al pomodoro', id: 'bruschetta_pomodoro', min: 10 },
    { type: 'Cena', time: '20:00', name: 'Tagliatelle al ragù', id: 'tagliatelle_ragu_bolognese', min: 30 },
  ],
  22: [
    { type: 'Colazione', time: '08:30', name: 'Crostata di marmellata', id: 'crostata_marmellata', min: 10 },
    { type: 'Pranzo', time: '13:00', name: 'Couscous con pollo e verdure', id: 'couscous_pollo_verdure_speziate', min: 30 },
    { type: 'Cena', time: '20:00', name: 'Borlotti e mais piccanti', id: 'borlotti_mais_piccanti', min: 15 },
  ],
  19: [
    { type: 'Colazione', time: '07:30', name: 'Yogurt con fichi freschi, miele e mandorle', id: 'yogurt_fichi_miele_mandorle', min: 10 },
    { type: 'Pranzo', time: '13:00', name: 'Pasta con gamberetti e pomodorini', id: 'pasta_gamberetti_pomodorini', min: 20 },
    { type: 'Cena', time: '20:00', name: 'Patate dolci ripiene di spinaci e feta', id: 'patate_dolci_ripiene', min: 25 },
  ],
};

/* Spesa di oggi (martedì 17, giorno di spesa): quantità dal catalogo per 2 persone. */
const SHOP = [
  { cat: 'Frutta e verdura', icon: 'veg', items: [
    { name: 'Pere', qty: '2 pz', for: 'Yogurt greco con pere · oggi', urgent: true, done: true },
    { name: 'Funghi champignon', qty: '250 g', for: 'Pasta funghi e salsiccia · stasera', urgent: true },
    { name: 'Fichi freschi', qty: '4 pz', for: 'Yogurt con fichi · giovedì' },
    { name: 'Prezzemolo', qty: 'q.b.', for: 'verifica di averlo', qb: true },
  ] },
  { cat: 'Latticini e uova', icon: 'dairy', items: [
    { name: 'Yogurt greco', qty: '250 g', for: 'Colazione · oggi', urgent: true, done: true },
    { name: 'Fontina', qty: '100 g', for: 'Polenta concia · oggi', urgent: true },
    { name: 'Parmigiano Reggiano', qty: '50 g', for: 'Polenta concia, Pasta funghi' },
    { name: 'Yogurt bianco', qty: '250 g', for: 'Yogurt con fichi · giovedì' },
  ] },
  { cat: 'Carne e pesce', icon: 'meat', items: [{ name: 'Salsiccia', qty: '200 g', for: 'Pasta funghi e salsiccia · stasera', urgent: true }] },
  { cat: 'Pasta, riso e cereali', icon: 'grain', items: [
    { name: 'Farina per polenta istantanea', qty: '1 conf. 500 g', for: 'Polenta concia · oggi', urgent: true, done: true },
    { name: 'Pasta di semola', qty: '1 conf. 500 g', for: 'Pasta funghi e salsiccia' },
  ] },
  { cat: 'Dispensa', icon: 'jar', items: [
    { name: 'Mandorle', qty: '1 conf. 100 g', for: 'Yogurt con fichi · giovedì' },
    { name: 'Miele', qty: '1 vasetto', for: 'Yogurt con fichi · giovedì' },
  ] },
];
const SHOP_TOTAL = SHOP.reduce((s, c) => s + c.items.filter((i) => !i.qb).length, 0);
const SHOP_DONE = SHOP.reduce((s, c) => s + c.items.filter((i) => i.done).length, 0);
const SHOP_URGENT = SHOP.reduce((s, c) => s + c.items.filter((i) => i.urgent).length, 0);

module.exports = { IMG, MINA, DAYS, MEALS, SHOP, SHOP_TOTAL, SHOP_DONE, SHOP_URGENT };
