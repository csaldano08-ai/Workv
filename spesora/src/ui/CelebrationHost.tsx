import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from '../theme/tokens';
import { onCelebrate, type Celebration } from './celebration';
import { MinaMascot } from './mascot/Mina';
import { Reveal } from './Reveal';
import { Text } from './Text';

const VISIBLE_MS = 3200;

/** Mostra Mina che festeggia per qualche secondo (toccando si chiude). Va montato una sola volta, nel layout radice. */
export function CelebrationHost() {
  const [current, setCurrent] = useState<(Celebration & { id: number }) | null>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => onCelebrate((c) => setCurrent({ ...c, id: Date.now() })), []);
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current]);
  if (!current) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 84 }]}>
      <Reveal key={current.id}>
        <Pressable accessibilityRole="alert" accessibilityLabel={`Mina: ${current.title}. ${current.text}`} onPress={() => setCurrent(null)} style={styles.card}>
          <MinaMascot pose="success" size={104} animated style={styles.mina} />
          <View style={styles.text}>
            <Text variant="heading">{current.title}</Text>
            <Text variant="small" color={colors.inkSoft}>
              {current.text}
            </Text>
          </View>
        </Pressable>
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green,
    paddingRight: space.lg,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  mina: { marginLeft: space.xs, marginVertical: -space.sm },
  text: { flex: 1, gap: 2, paddingVertical: space.md },
});
