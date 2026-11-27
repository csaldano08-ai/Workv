/**
 * Design token di MINA. Unica fonte dei colori: le schermate non scrivono codici colore propri.
 *
 * Palette approvata (reference «Mina — Pianifica, cucina e fai la spesa in modo semplice»):
 *  - verde #1F6B4A: azioni principali, selezioni, link (bianco sul verde 6,4:1);
 *  - avorio #FFF8EC: superfici calde (benvenuto, fasce, icona), non come fondo uniforme di tutto;
 *  - pesca #FFA56B: accenti e avvisi gentili (mai per testi lunghi);
 *  - salvia #DCECD8: pillole, fondi dei giorni, forme decorative.
 * V4: fondo delle pagine crema caldo (misurato sul riferimento: #FDF8F0–#FEF9F2) e card crema chiarissima con
 * ombra morbida: niente più pagina bianca piatta, ma sempre luminosa e leggibile.
 */
export const colors = {
  green: '#1F6B4A',
  greenBright: '#2A8459', // stessa tinta più luminosa: superfici grandi e illustrazioni, non per testo piccolo
  greenDark: '#174F37',
  greenDeep: '#154832', // base "in rilievo" dei pulsanti verdi
  greenSoft: '#E9F3E5',
  greenMist: '#F3F8EF',
  ivory: '#FFF8EC',
  paper: '#FFFDF8', // card (nome storico)
  /** Superficie delle card: crema chiarissima, quasi il tono del fondo (le card si staccano con l'ombra, come nel riferimento). */
  card: '#FFFDF8',
  desk: '#FDF8F0', // fondo delle schermate: crema caldo misurato sul riferimento (#FDF8F0–#FEF9F2)
  tab: '#EEF4EA', // controlli segmentati non attivi
  shadowPaper: '#EEE8DE',
  sage: '#DCECD8',
  lavender: '#ECE9F7',
  tape: 'transparent',
  peach: '#FFA56B',
  peachSoft: '#FFF0E3',
  peachInk: '#94450F', // testo su pesca chiara, contrasto AA
  ink: '#1D2A23',
  inkSoft: '#5F6B64',
  line: '#EFE6D8',
  lineStrong: '#DED3C3',
  danger: '#B3402F',
  dangerSoft: '#FBE9E5',
  white: '#FFFFFF',
} as const;

/** Colori del marchio (logo e icona): presi dal logo approvato, separati dalla palette dell'interfaccia. */
export const brand = {
  wordTop: '#0C8C41',
  wordBottom: '#065426',
  basket: '#F59B0C',
  basketShade: '#E2860A',
  basketRim: '#1E742E',
  handle: '#1E742E',
  sparkle: '#74C412',
  iconBg: '#FFF4E7',
} as const;

/** Bordi: sottili e chiari (niente più contorni scuri dello stile "ricettario"). */
export const outline = { color: colors.line, width: 1, thin: 1 } as const;

/** Ombra morbida delle card (bruno caldo molto trasparente: niente grigi sporchi sul fondo bianco caldo). */
export const shadow = {
  card: { shadowColor: '#5A4528', shadowOpacity: 0.09, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  float: { shadowColor: '#5A4528', shadowOpacity: 0.15, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Famiglie del carattere Nunito (arrotondato, leggibile, accogliente), una per peso. */
export const font = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

/** Tipografia: Nunito con scala chiara. Rispetta Dynamic Type (fino a MAX_FONT_SCALE). */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.3 },
  /** Titolo grande delle schermate (come nel riferimento: «La tua settimana», «Ricette», «Profilo»). */
  screen: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.4 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '800' as const, letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.3 },
  /** Titoli brevi e caldi (ex scrittura a mano): messaggi di Mina, etichette di sezione. */
  hand: { fontSize: 20, lineHeight: 26, fontWeight: '800' as const },
  handSmall: { fontSize: 15, lineHeight: 20, fontWeight: '700' as const },
} as const;

/** Colore per tipo di pasto (etichette e puntini): toni chiari e distinti, testo sempre scuro. */
export const mealTone = { colazione: '#FFE9D6', pranzo: '#DCECD8', spuntino: '#FFF3C4', cena: '#E6E3F7' } as const;
/** Colore del testo/puntino per tipo di pasto (più saturo del fondo). */
export const mealInk = { colazione: '#9A4A14', pranzo: '#276B49', spuntino: '#725600', cena: '#4F4398' } as const;

/** Area minima di tocco consigliata (Apple HIG: 44pt). */
export const TOUCH = 44;
export const MAX_FONT_SCALE = 1.8;

/** Durate delle micro-animazioni dell'interfaccia (brevi: mai d'intralcio). */
export const motion = { fast: 140, base: 220, slow: 360 } as const;
