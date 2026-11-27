import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/** Respiro lento dei segnaposto mentre i dati arrivano (come l'idle di Mina). Fermo con "Riduci movimento". */
export function Pulse({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [reduced, v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}
