import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../src/theme/tokens';
import { MinaMascot, type MinaPose } from '../src/ui/mascot/Mina';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/**
 * Vetrina delle animazioni di Mina 2.0, solo nella demo web (controllo qualità e video di presentazione).
 * Non è collegata da nessuna schermata; su iPhone/Android rimanda all'app.
 */
const SHOWCASE: { pose: MinaPose; label: string }[] = [
  { pose: 'welcome', label: 'Saluto' },
  { pose: 'neutral', label: 'Idle' },
  { pose: 'happy', label: 'Felice' },
  { pose: 'thinking', label: 'Pensierosa' },
  { pose: 'success', label: 'Lista completata' },
  { pose: 'recipe', label: 'Ricetta (Mina Chef)' },
  { pose: 'reminder', label: 'Promemoria' },
  { pose: 'cooking', label: 'Mina Chef' },
];

export default function MinaShowcase() {
  const [run, setRun] = useState(0);
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  const only = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('posa') : null;
  const size = only ? 300 : 150;
  const items = only ? SHOWCASE.filter((s) => s.pose === only) : SHOWCASE;
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Mina 2.0' }} />
      <Pressable accessibilityRole="button" onPress={() => setRun((n) => n + 1)} style={styles.replay}>
        <Text variant="heading" color={colors.white}>
          Ripeti le animazioni
        </Text>
      </Pressable>
      <View style={styles.grid}>
        {items.map((s) => (
          <View key={`${s.pose}-${run}`} style={styles.cell}>
            <MinaMascot pose={s.pose} size={size} animated idle interactive accessibilityLabel={`Mina: ${s.label}`} />
            <Text variant="small" color={colors.inkSoft} style={{ fontWeight: '700' }}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  replay: { alignSelf: 'center', backgroundColor: colors.green, paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: radius.pill },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.lg },
  cell: { alignItems: 'center', gap: space.xs, padding: space.sm, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
});
