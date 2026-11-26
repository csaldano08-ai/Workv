/**
 * Design token di Spesora — restyling «Mina 2.0»: stessa identità verde, più fresca e luminosa.
 * Unica fonte dei colori: le schermate non scrivono codici colore propri.
 *
 * Palette di partenza del brief, rifinita sulle schermate reali:
 *  - verde principale #34865E → #2F7F57: stessa tinta, 3% più scuro, così il testo bianco sui pulsanti
 *    e il verde sui link superano il contrasto AA (4,9:1 invece di 4,45:1);
 *  - pesca #FFA873 solo per accenti e momenti positivi, mai per testi lunghi.
 */
export const colors = {
  green: '#2F7F57',
  greenBright: '#34865E', // tinta del brief: superfici grandi e illustrazioni, non per testo piccolo
  greenDark: '#214C36',
  greenDeep: '#24603F', // base "in rilievo" dei pulsanti verdi
  greenSoft: '#EAF6EC',
  greenMist: '#F3F9F4',
  ivory: '#FBFCFA', // fondo dell'app (nome storico)
  paper: '#FFFFFF', // card (nome storico)
  desk: '#FBFCFA', // fondo delle schermate (nome storico)
  tab: '#EEF3EE', // controlli segmentati non attivi
  shadowPaper: '#E5EBE5',
  sage: '#DCEEDF',
  lavender: '#ECE9F7',
  tape: 'transparent',
  peach: '#FFA873',
  peachSoft: '#FFF1E6',
  peachInk: '#94450F', // testo su pesca chiara, contrasto AA
  ink: '#20352A',
  inkSoft: '#56675D',
  line: '#E5EBE5',
  lineStrong: '#D3DDD4',
  danger: '#B3402F',
  dangerSoft: '#FBE9E5',
  white: '#FFFFFF',
} as const;

/** Bordi: sottili e chiari (niente più contorni scuri dello stile "ricettario"). */
export const outline = { color: colors.line, width: 1, thin: 1 } as const;

/** Ombra morbida delle card (verde scuro molto trasparente: niente grigi sporchi). */
export const shadow = {
  card: { shadowColor: '#1E4A34', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  float: { shadowColor: '#1E4A34', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
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
export const mealTone = { colazione: '#FFE9D6', pranzo: '#DCEEDF', spuntino: '#FFF3C4', cena: '#E6E3F7' } as const;
/** Colore del testo/puntino per tipo di pasto (più saturo del fondo). */
export const mealInk = { colazione: '#B3591B', pranzo: '#2F7F57', spuntino: '#8A6A00', cena: '#5B4FA8' } as const;

/** Area minima di tocco consigliata (Apple HIG: 44pt). */
export const TOUCH = 44;
export const MAX_FONT_SCALE = 1.8;

/** Durate delle micro-animazioni dell'interfaccia (brevi: mai d'intralcio). */
export const motion = { fast: 140, base: 220, slow: 360 } as const;
