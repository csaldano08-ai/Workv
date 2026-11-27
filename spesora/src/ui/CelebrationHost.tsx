import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space } from '../theme/tokens';
import { onCelebrate, type Celebration } from './celebration';
import { MinaMascot } from './mascot/Mina';
import { Reveal } from './Reveal';
import { Text } from './Text';
import { useReducedMotion } from './useReducedMotion';

const VISIBLE_MS = 3200;
const native = Platform.OS !== 'web';

/**
 * Mostra Mina che festeggia per qualche secondo (toccando si chiude). Va montato una sola volta, nel layout radice.
 * La card sboccia dal basso con un rimbalzo e, alla chiusura, scende e si dissolve invece di sparire di colpo.
 */
export function CelebrationHost() {
  const [current, setCurrent] = useState<(Celebration & { id: number }) | null>(null);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // 1 = card presente, 0 = card uscita
  const [out] = useState(() => new Animated.Value(1));
  useEffect(
    () =>
      onCelebrate((c) => {
        out.stopAnimation();
        out.setValue(1);
        setCurrent({ ...c, id: Date.now() });
      }),
    [out],
  );
  const close = useCallback(() => {
    if (reduced) {
      setCurrent(null);
      return;
    }
    Animated.timing(out, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(({ finished }) => {
      if (finished) setCurrent(null);
    });
  }, [out, reduced]);
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(close, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current, close]);
  if (!current) return null;
  const leave = { opacity: out, transform: [{ translateY: out.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: out.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] };
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 84 }]}>
      <Animated.View style={leave}>
        <Reveal key={current.id} from="pop">
          <Pressable accessibilityRole="alert" accessibilityLabel={`Mina: ${current.title}. ${current.text}`} onPress={close} style={styles.card}>
          <MinaMascot pose={current.pose ?? 'success'} size={96} animated style={styles.mina} />
          <View style={styles.text}>
            <Text variant="hand">{current.title}</Text>
            <Text variant="small" color={colors.inkSoft}>
              {current.text}
            </Text>
          </View>
          </Pressable>
        </Reveal>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    paddingRight: space.lg,
    ...shadow.float,
  },
  mina: { marginLeft: space.xs, marginVertical: -space.sm },
  text: { flex: 1, gap: 2, paddingVertical: space.md },
});
