import { fileURLToPath } from 'node:url';

/** Configurazione della pipeline immagini. Nessuna credenziale qui: la chiave arriva da GEMINI_API_KEY. */

const root = fileURLToPath(new URL('../../', import.meta.url));

export const PATHS = {
  root,
  recipesDir: `${root}assets/recipes/`,
  styleDir: `${root}assets/recipes/_style/`,
  styleReference: `${root}assets/recipes/_style/reference.jpg`,
  manifest: `${root}assets/recipes/manifest.json`,
  /** Sorgenti a piena risoluzione: NON nel repository (gitignore), caricate come artifact della Action. */
  sourcesDir: `${root}.image-sources/`,
  /** Mappatura dei PNG sorgente, scritta dallo script Google Flow di Codex (non usata dall'app). */
  mapFile: `${root}src/data/recipe-images.ts`,
  /** Mappatura delle card ottimizzate, usata dall'app. */
  cardMapFile: `${root}src/data/recipe-image-cards.ts`,
  /** Miniature per le liste (settimana, ricettario, sostituzioni). */
  thumbMapFile: `${root}src/data/recipe-image-thumbs.ts`,
};

export const IMAGE = {
  aspectRatio: '4:3',
  /** Versione per le card dell'app (JPEG, ~40–90 KB). */
  cardWidth: 800,
  cardHeight: 600,
  /** Miniatura per le liste virtualizzate (JPEG, ~8–15 KB): decodifica leggera durante lo scorrimento. */
  thumbWidth: 320,
  thumbHeight: 240,
  jpegQuality: 78,
  /** Dimensione minima accettata del sorgente generato. */
  minSourceWidth: 640,
};

export const MODELS = {
  /** Modello immagine predefinito (sovrascrivibile con --model o GEMINI_IMAGE_MODEL). */
  image: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  /** Modello testo+visione per il controllo di coerenza (sovrascrivibile con GEMINI_CHECK_MODEL). */
  check: process.env.GEMINI_CHECK_MODEL || 'gemini-2.5-flash',
};

export const LIMITS = {
  defaultPerRun: 20,
  /** Tetto rigido per esecuzione: impedisce consumi accidentali. */
  hardMaxPerRun: 200,
  batchSize: 10,
  /** Tentativi di generazione per ricetta (inclusa la rigenerazione dopo un controllo fallito). */
  maxAttemptsPerRecipe: 3,
  retryDelaysMs: [2000, 5000, 15000, 30000],
  /** Distanza di Hamming minima tra hash percettivi: sotto questa soglia l'immagine è un probabile duplicato. */
  duplicateHashDistance: 4,
};

/** Direzione artistica comune (inglese: i modelli immagine la seguono meglio). */
export const STYLE = {
  palette: { green: '#386E55', ivory: '#F6F3EA', peach: '#E6A46D', anthracite: '#24332C' },
  description: [
    'Contemporary editorial food illustration, refined 2D / semi-illustrated painterly style with subtle paper texture.',
    'Appetizing, clearly recognizable food with natural food colors and soft diffused daylight from the upper left.',
    'Warm ivory background (#F6F3EA) with gentle shadows; accents of sage green (#386E55) and soft peach (#E6A46D) in tableware or linen only.',
    'Consistent framing: three-quarter top-down view (about 45 degrees), the dish centered, filling about 70% of the frame, 4:3 landscape.',
    'Simple ceramic tableware in ivory or sage green; minimal props (a linen napkin, a few raw ingredients from the recipe) placed at the edges.',
  ].join(' '),
  avoid:
    'No text, no letters, no numbers, no logos, no watermarks, no labels, no borders, no hands or people, no glossy plastic look, no cheap 3D render, no cartoon or childish style, no checkerboard pattern.',
};
