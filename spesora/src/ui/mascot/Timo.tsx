import { memo, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { timoBadgeSvg, timoSvg, type TimoPose } from './timoSvg';

/**
 * Timo, la mascotte di Spesora. Vettoriale (nitida a ogni dimensione, nessun peso in MB).
 * Decorativa: nascosta agli screen reader, il testo accanto porta il significato.
 */
export const Timo = memo(function Timo({ pose = 'neutra', size = 96, style }: { pose?: TimoPose; size?: number; style?: ViewStyle }) {
  const xml = useMemo(() => timoSvg(pose), [pose]);
  return (
    <View style={[{ width: size, height: (size * 140) / 120 }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
});

/** Variante compatta (volto) per righe, notifiche interne e badge. */
export const TimoBadge = memo(function TimoBadge({ size = 36, style }: { size?: number; style?: ViewStyle }) {
  const xml = useMemo(() => timoBadgeSvg(), []);
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
});
