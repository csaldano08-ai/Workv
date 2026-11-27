import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../src/theme/tokens';
import { MinaMascot, type MinaPose } from '../src/ui/mascot/Mina';
import { MinaChefTransform } from '../src/ui/mascot/MinaChefTransform';
import { setMinaTimeScale } from '../src/ui/mascot/mina2/Mina2';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/**
 * Vetrina delle animazioni di Mina, solo nella demo web (controllo qualità e video di presentazione).
 * Non è collegata da nessuna schermata; su iPhone/Android rimanda all'app.
 *   /mina                     tutti i gesti
 *   /mina?gruppo=braccia      gli 8 gesti di prova del rig delle braccia
 *   /mina?posa=welcome        un solo gesto in grande
 *   /mina?posa=trasformazione la trasformazione in Mina Chef
 *   &lento=4                  rallentatore (4 volte più lento)
 */
const SHOWCASE: { pose: MinaPose | 'trasformazione'; label: string; group?: 'braccia' }[] = [
  { pose: 'welcome', label: '1 · Saluto con la destra', group: 'braccia' },
  { pose: 'waveLeft', label: '2 · Saluto con la sinistra', group: 'braccia' },
  { pose: 'pointing', label: '3 · Indica di lato', group: 'braccia' },
  { pose: 'lifting', label: '4 · Solleva un oggetto', group: 'braccia' },
  { pose: 'satisfied', label: '5 · Soddisfazione', group: 'braccia' },
  { pose: 'mixing', label: '6 · Mescola (Mina Chef)', group: 'braccia' },
  { pose: 'jumping', label: '7 · Piccolo salto', group: 'braccia' },
  { pose: 'thinking', label: '8 · Pensierosa', group: 'braccia' },
  { pose: 'neutral', label: 'Idle' },
  { pose: 'happy', label: 'Felice' },
  { pose: 'success', label: 'Lista completata' },
  { pose: 'concerned', label: 'Preoccupata' },
  { pose: 'reminder', label: 'Promemoria' },
  { pose: 'cooking', label: 'Mina Chef: cucchiaio' },
  { pose: 'serving', label: 'Mina Chef: serve' },
  { pose: 'checklist', label: 'Mina Chef: checklist' },
  { pose: 'trasformazione', label: 'Trasformazione in Mina Chef' },
];

export default function MinaShowcase() {
  const [run, setRun] = useState(0);
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const only = params?.get('posa') ?? null;
  const group = params?.get('gruppo') ?? null;
  setMinaTimeScale(Number(params?.get('lento') ?? 1) || 1);
  const size = only ? 300 : 150;
  const items = only ? SHOWCASE.filter((s) => s.pose === only) : group ? SHOWCASE.filter((s) => s.group === group) : SHOWCASE;
  return (
    <Screen edges={['bottom']} reveal={false}>
      <Stack.Screen options={{ title: 'Mina' }} />
      <Pressable accessibilityRole="button" onPress={() => setRun((n) => n + 1)} style={styles.replay}>
        <Text variant="heading" color={colors.white}>
          Ripeti le animazioni
        </Text>
      </Pressable>
      <View style={styles.grid}>
        {items.map((s) => (
          <View key={`${s.pose}-${run}`} style={styles.cell}>
            {s.pose === 'trasformazione' ? (
              <MinaChefTransform size={size} play />
            ) : (
              <MinaMascot pose={s.pose} size={size} animated idle interactive accessibilityLabel={`Mina: ${s.label}`} />
            )}
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
