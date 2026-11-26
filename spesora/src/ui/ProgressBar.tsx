import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/** Barra di avanzamento arrotondata: si allunga con una breve molla (ferma con "Riduci movimento"). */
export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const reduced = useReducedMotion();
  const k = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const [width, setWidth] = useState(0);
  const [v] = useState(() => new Animated.Value(k));
  useEffect(() => {
    if (reduced) v.setValue(k);
    else Animated.spring(v, { toValue: k, friction: 8, tension: 70, useNativeDriver: native }).start();
  }, [k, reduced, v]);
  return (
    <View
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
    >
      {width > 0 ? <Animated.View style={[styles.fill, { width, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }] }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 12, borderRadius: radius.pill, backgroundColor: colors.tab, overflow: 'hidden' },
  fill: { height: 12, borderRadius: radius.pill, backgroundColor: colors.green },
});
