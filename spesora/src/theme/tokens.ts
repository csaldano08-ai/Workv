/** Design token di Spesora — stile "Mina interattiva in un ricettario a schede" (B + C). */
export const colors = {
  green: '#386E55',
  greenDark: '#2B5643',
  greenSoft: '#E3ECE5',
  ivory: '#F6F3EA',
  paper: '#FBF6EA', // pagina del ricettario
  desk: '#EFE7D6', // fondo delle schermate (il tavolo su cui sta il ricettario)
  tab: '#E2D7BF', // linguette non attive
  shadowPaper: '#D9CDB4', // pagina sottostante
  sage: '#C9DAC3',
  lavender: '#D9D4E8', // cena
  tape: 'rgba(230,164,109,0.72)',
  peach: '#E6A46D',
  peachSoft: '#F8E6D5',
  peachInk: '#8A4F1F', // testo su pesca chiara, contrasto AA
  ink: '#24332C',
  inkSoft: '#56645D',
  line: '#E2DDCF',
  danger: '#A63D2F',
  dangerSoft: '#F6E1DC',
  white: '#FFFFFF',
} as const;

/** Contorno scuro dello stile illustrato (come nell'intro): oggetti ben definiti, mai aggressivi. */
export const outline = { color: '#24332C', width: 2, thin: 1.5 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Tipografia: font di sistema (SF su iPhone) con scala chiara. Rispetta Dynamic Type. */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  small: { fontSize: 14, lineHeight: 19, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
  /** Scrittura a mano (Caveat): solo per brevi annotazioni, mai per informazioni lunghe o critiche. */
  hand: { fontSize: 27, lineHeight: 30, fontFamily: 'Caveat' },
  handSmall: { fontSize: 19, lineHeight: 22, fontFamily: 'Caveat' },
} as const;

/** Colore per tipo di pasto (etichette e puntini). */
export const mealTone = { colazione: '#F5DCC0', pranzo: '#C9DAC3', spuntino: '#F3E3A6', cena: '#D9D4E8' } as const;

/** Area minima di tocco consigliata (Apple HIG: 44pt). */
export const TOUCH = 44;
export const MAX_FONT_SCALE = 1.8;
