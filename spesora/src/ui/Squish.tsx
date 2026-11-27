import { useState } from 'react';
import { Animated, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/**
 * Pressable con risposta elastica (squash al tocco, rimbalzo al rilascio), come gli oggetti dell'intro.
 * Con "Riduci movimento" resta fermo e mostra solo la variazione di opacità.
 */
export function Squish({
  style,
  outerStyle,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** Stile dell'area di tocco esterna (es. `flex: 1` quando l'elemento deve allargarsi in una riga). */
  outerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const [s] = useState(() => new Animated.Value(1));
  const to = (v: number, bounce: boolean) =>
    bounce ? Animated.spring(s, { toValue: v, friction: 3.5, tension: 220, useNativeDriver: native }).start() : Animated.timing(s, { toValue: v, duration: 90, useNativeDriver: native }).start();
  return (
    <Pressable
      {...rest}
      style={outerStyle}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduced) to(0.95, false);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) to(1, true);
        onPressOut?.(e);
      }}
    >
      {({ pressed }) => (
        <Animated.View style={[style, { transform: [{ scaleX: s }, { scaleY: Animated.add(1, Animated.multiply(Animated.subtract(s, 1), 1.4)) }] }, reduced && pressed ? { opacity: 0.8 } : null]}>{children}</Animated.View>
      )}
    </Pressable>
  );
}
