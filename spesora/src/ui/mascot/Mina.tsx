import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useReducedMotion } from '../useReducedMotion';
import { MINA_VIEWBOX, minaBadgeSvg, minaSvg, resolvePose, type MinaPose } from './minaSvg';

const native = Platform.OS !== 'web';
const RATIO = MINA_VIEWBOX.height / MINA_VIEWBOX.width;

export type MinaMotion = 'auto' | 'none';

export interface MinaMascotProps {
  /** Posa (nomi inglesi) oppure, per compatibilità, i vecchi nomi italiani. */
  pose?: MinaPose | string;
  /** Larghezza in punti: piccola 40–56, media 64–96, grande 120–180. */
  size?: number;
  /** Se vero, entra con una breve animazione e, per alcune pose, esegue un gesto. Rispetta "Riduci movimento". */
  animated?: boolean;
  /** Se presente, Mina è esposta agli screen reader con questa etichetta; altrimenti è decorativa. */
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/** Gesto per posa: una breve sequenza, mai un ciclo infinito (nessun consumo continuo di batteria). */
function gesture(pose: MinaPose, rotate: Animated.Value, lift: Animated.Value): Animated.CompositeAnimation | null {
  const to = (v: Animated.Value, value: number, duration: number, easing = Easing.inOut(Easing.quad)) => Animated.timing(v, { toValue: value, duration, easing, useNativeDriver: native });
  switch (pose) {
    case 'welcome':
      return Animated.sequence([to(rotate, 1, 180), to(rotate, -1, 260), to(rotate, 1, 260), to(rotate, -1, 260), to(rotate, 0, 180)]);
    case 'happy':
    case 'success':
      return Animated.sequence([to(lift, -1, 170, Easing.out(Easing.quad)), to(lift, 0, 170, Easing.in(Easing.quad)), to(lift, -0.6, 140, Easing.out(Easing.quad)), to(lift, 0, 140, Easing.in(Easing.quad))]);
    case 'cooking':
      return Animated.sequence([to(rotate, 0.6, 140), to(rotate, -0.6, 220), to(rotate, 0.6, 220), to(rotate, 0, 140)]);
    case 'thinking':
    case 'recipe':
      return Animated.sequence([to(lift, -0.35, 420), to(lift, 0, 420)]);
    case 'shopping':
    case 'calendar':
    case 'pantry':
    case 'missing':
      return Animated.sequence([to(rotate, -0.5, 200), to(rotate, 0.4, 240), to(rotate, 0, 200)]);
    case 'sleepy':
      return Animated.sequence([to(lift, 0.25, 900), to(lift, 0, 900)]);
    default:
      return null;
  }
}

/**
 * Mina, la mascotte di Spesora (il ricettario vivente). Vettoriale e offline: nessuna immagine remota.
 * Con `animated` entra con dissolvenza e piccolo scatto; il gesto dipende dalla posa.
 */
export const MinaMascot = memo(function MinaMascot({ pose = 'neutral', size = 96, animated = false, accessibilityLabel, style }: MinaMascotProps) {
  const resolved = resolvePose(pose);
  const xml = useMemo(() => minaSvg(resolved), [resolved]);
  const reduced = useReducedMotion();
  const [enter] = useState(() => new Animated.Value(animated ? 0 : 1));
  const [rotate] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animated || reduced) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    const g = gesture(resolved, rotate, lift);
    const run = Animated.sequence([Animated.timing(enter, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: native }), ...(g ? [g] : [])]);
    run.start();
    return () => run.stop();
  }, [animated, reduced, resolved, enter, rotate, lift]);

  const height = size * RATIO;
  const a11y = accessibilityLabel ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Animated.View
      {...a11y}
      style={[
        { width: size, height },
        style,
        {
          opacity: enter,
          transform: [
            { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }), lift.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.1, size * 0.1] })) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            { rotate: rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) },
          ],
        },
      ]}
    >
      <View style={{ width: '100%', height: '100%' }}>
        <SvgXml xml={xml} width="100%" height="100%" />
      </View>
    </Animated.View>
  );
});

/** Variante compatta (copertina con volto) per righe, badge e richiami piccoli. */
export const MinaBadge = memo(function MinaBadge({ size = 36, style }: { size?: number; style?: ViewStyle }) {
  const xml = useMemo(() => minaBadgeSvg(), []);
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
});
