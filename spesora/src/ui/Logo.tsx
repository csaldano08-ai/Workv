import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '../theme/tokens';
import { Text } from './Text';

/** Marchio Spesora: un piatto che è anche la pagina di un'agenda. Disegno originale. */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no">
      <Rect x="4" y="8" width="56" height="52" rx="14" fill={colors.green} />
      <Rect x="4" y="8" width="56" height="14" rx="7" fill={colors.greenDark} />
      <Rect x="16" y="3" width="5" height="12" rx="2.5" fill={colors.peach} />
      <Rect x="43" y="3" width="5" height="12" rx="2.5" fill={colors.peach} />
      <Circle cx="32" cy="40" r="14" fill={colors.ivory} />
      <Circle cx="32" cy="40" r="9" fill="none" stroke={colors.peach} strokeWidth="2.5" />
      <Path d="M29 40 l2.5 2.5 l5 -5.5" stroke={colors.green} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="Spesora">
      <LogoMark size={size} />
      <Text variant="display" color={colors.green}>
        Spesora
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.md } });
