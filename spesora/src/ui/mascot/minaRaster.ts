import type { ImageSourcePropType } from 'react-native';
import type { MinaPose } from './minaSvg';

/**
 * Illustrazioni di Mina prodotte con Google Flow (PNG trasparenti, canvas quadrato), una per posa.
 * Riferimenti statici e locali: offline, compatibili con Metro, nessuna rete.
 * Le pose non elencate usano il vettoriale di `minaSvg.ts`.
 */

/** Versione 512 px (display piccoli e medi). */
export const MINA_RASTER: Partial<Record<MinaPose, ImageSourcePropType>> = {
  neutral: require('../../../assets/mascot/mina/optimized/mina_neutral.png'),
  welcome: require('../../../assets/mascot/mina/optimized/mina_welcome.png'),
  wave: require('../../../assets/mascot/mina/optimized/mina_wave.png'),
  explaining: require('../../../assets/mascot/mina/optimized/mina_explaining.png'),
  thinking: require('../../../assets/mascot/mina/optimized/mina_thinking.png'),
  calendar: require('../../../assets/mascot/mina/optimized/mina_calendar.png'),
  shopping: require('../../../assets/mascot/mina/optimized/mina_shopping.png'),
  cooking: require('../../../assets/mascot/mina/optimized/mina_cooking.png'),
  recipe: require('../../../assets/mascot/mina/optimized/mina_recipe.png'),
  pantry: require('../../../assets/mascot/mina/optimized/mina_pantry.png'),
  missing: require('../../../assets/mascot/mina/optimized/mina_missing.png'),
  savings: require('../../../assets/mascot/mina/optimized/mina_savings.png'),
  happy: require('../../../assets/mascot/mina/optimized/mina_happy.png'),
  success: require('../../../assets/mascot/mina/optimized/mina_success.png'),
  sleepy: require('../../../assets/mascot/mina/optimized/mina_sleepy.png'),
  empty: require('../../../assets/mascot/mina/optimized/mina_empty.png'),
};

/** Versione 1024 px, solo per le pose mostrate in grande (benvenuto e completamento). */
export const MINA_RASTER_LARGE: Partial<Record<MinaPose, ImageSourcePropType>> = {
  welcome: require('../../../assets/mascot/mina/poses/mina_welcome.png'),
  success: require('../../../assets/mascot/mina/poses/mina_success.png'),
};

/** Sopra questa larghezza (dp) si usa la versione 1024 px, se disponibile. */
export const MINA_LARGE_FROM = 200;

/** Livelli separati per il saluto animato (braccio dietro al corpo, ruota attorno alla spalla). Canvas 1024. */
export const MINA_WAVE = {
  body: require('../../../assets/mascot/mina/animation-frames/layers/wave_body.png') as ImageSourcePropType,
  arm: require('../../../assets/mascot/mina/animation-frames/layers/wave_arm.png') as ImageSourcePropType,
  pivot: [797, 522] as const,
  canvas: 1024,
};
