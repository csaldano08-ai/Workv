import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/**
 * Saltello di conferma: quando `on` diventa vero l'elemento si gonfia appena e torna con un rimbalzo
 * (lo stesso schiacciamento elastico di Mina). Non fa nulla all'apertura della pagina, né con "Riduci movimento".
 */
export function Hop({ on, children, style }: { on: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  const was = useRef(on);
  useEffect(() => {
    // il saltello parte solo al passaggio da spento ad acceso, non quando la pagina si apre già acceso
    const start = on && !was.current && !reduced;
    was.current = on;
    if (!start) return;
    v.setValue(0);
    const a = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.spring(v, { toValue: 0, friction: 4, tension: 200, useNativeDriver: native }),
    ]);
    a.start();
    return () => a.stop();
  }, [on, reduced, v]);
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { scaleX: v.interpolate({ inputRange: [-0.4, 0, 1], outputRange: [1.03, 1, 1.06] }) },
            { scaleY: v.interpolate({ inputRange: [-0.4, 0, 1], outputRange: [0.97, 1, 1.06] }) },
            { translateY: v.interpolate({ inputRange: [-0.4, 0, 1], outputRange: [1, 0, -3] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
