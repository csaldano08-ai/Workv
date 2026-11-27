import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LOGO_RATIO, minaLogoSvg } from './logoArt';

const XML = minaLogoSvg();

/**
 * Logo MINA (parola + cestino arancione), disegnato in vettoriale sulle misure del logo approvato.
 * `height` = altezza del disegno compresi i trattini sopra il cestino; la larghezza segue le proporzioni originali.
 */
export function MinaLogo({ height = 36, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessible accessibilityRole="image" accessibilityLabel="Mina">
      <SvgXml xml={XML} width={Math.round(height * LOGO_RATIO)} height={height} />
    </View>
  );
}
