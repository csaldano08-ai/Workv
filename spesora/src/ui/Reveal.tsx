import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, type ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/** Comparsa morbida (dissolvenza + piccolo scorrimento). `index` scagliona gli elementi di una schermata. Senza movimento se ridotto. */
export function Reveal({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, { toValue: 1, duration: 260, delay: Math.min(index, 6) * 55, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [reduced, index, v]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}
