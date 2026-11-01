import type { ImageSourcePropType } from 'react-native';
import type { MinaPose } from './minaSvg';

/**
 * Illustrazioni raster di Mina (es. prodotte con Google Flow), per posa.
 * Vuota = l'app usa le pose vettoriali di `minaSvg.ts`. Per attivarle, aggiungere qui i `require` statici
 * (offline, compatibili con Metro), ad esempio:
 *   welcome: require('../../../assets/mascot/mina/mina_welcome.png'),
 * Le pose non elencate continuano a usare il vettoriale, quindi si può passare da una all'altra gradualmente.
 */
export const MINA_RASTER: Partial<Record<MinaPose, ImageSourcePropType>> = {};
