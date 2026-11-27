import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { View } from 'react-native';
import { colors } from '../theme/tokens';
import { MinaLogo } from './brand/MinaLogo';

/**
 * Vecchio marchio (piatto-agenda), usato solo dove serve un simbolo quadrato senza scritta (schermata di errore).
 * Il logo dell'app è `MinaLogo` (src/ui/brand/MinaLogo.tsx).
 */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Rect x="4" y="8" width="56" height="52" rx="14" fill={colors.green} />
        <Rect x="4" y="8" width="56" height="14" rx="7" fill={colors.greenDark} />
        <Rect x="16" y="3" width="5" height="12" rx="2.5" fill={colors.peach} />
        <Rect x="43" y="3" width="5" height="12" rx="2.5" fill={colors.peach} />
        <Circle cx="32" cy="40" r="14" fill={colors.ivory} />
        <Circle cx="32" cy="40" r="9" fill="none" stroke={colors.peach} strokeWidth="2.5" />
        <Path d="M29 40 l2.5 2.5 l5 -5.5" stroke={colors.green} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** Logo MINA (parola + cestino). `size` = altezza del disegno. */
export function Logo({ size = 40 }: { size?: number }) {
  return <MinaLogo height={size} />;
}

