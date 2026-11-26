import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/** Casella con bordo chiaro e ben visibile; spuntandola il riempimento verde e la spunta compaiono con un rimbalzo. */
export function CheckBox({ checked, size = 28 }: { checked: boolean; size?: number }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(checked ? 1 : 0));
  useEffect(() => {
    if (reduced) v.setValue(checked ? 1 : 0);
    else if (checked) Animated.spring(v, { toValue: 1, friction: 4, tension: 160, useNativeDriver: native }).start();
    else Animated.timing(v, { toValue: 0, duration: 120, useNativeDriver: native }).start();
  }, [checked, reduced, v]);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size * 0.3 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, styles.fill, { opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }) }]} />
      <Animated.View style={{ transform: [{ scale: v }] }}>
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 20 20">
          <Path d="M4 10.5 l4 4 l8 -9" stroke={colors.white} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderColor: colors.lineStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { backgroundColor: colors.green },
});
