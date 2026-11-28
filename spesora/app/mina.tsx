import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../src/theme/tokens';
import { MinaMascot, type MinaPose } from '../src/ui/mascot/Mina';
import { MinaChefTransform } from '../src/ui/mascot/MinaChefTransform';
import { setMinaTimeScale } from '../src/ui/mascot/mina2/Mina2';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { useT } from '../src/i18n';

/**
 * Vetrina delle animazioni di Mina, solo nella demo web (controllo qualità e video di presentazione).
 * Non è collegata da nessuna schermata; su iPhone/Android rimanda all'app.
 *   /mina                     tutti i gesti
 *   /mina?gruppo=braccia      gli 8 gesti di prova del rig delle braccia
 *   /mina?posa=welcome        un solo gesto in grande
 *   /mina?posa=trasformazione la trasformazione in Mina Chef
 *   &lento=4                  rallentatore (4 volte più lento)
 */
/** Etichette: chiavi `profile:mina.pose.<posa>`. */
const SHOWCASE: { pose: MinaPose | 'trasformazione'; group?: 'braccia' }[] = [
  { pose: 'welcome', group: 'braccia' },
  { pose: 'waveLeft', group: 'braccia' },
  { pose: 'pointing', group: 'braccia' },
  { pose: 'lifting', group: 'braccia' },
  { pose: 'satisfied', group: 'braccia' },
  { pose: 'mixing', group: 'braccia' },
  { pose: 'jumping', group: 'braccia' },
  { pose: 'thinking', group: 'braccia' },
  { pose: 'neutral' },
  { pose: 'happy' },
  { pose: 'success' },
  { pose: 'concerned' },
  { pose: 'reminder' },
  { pose: 'cooking' },
  { pose: 'serving' },
  { pose: 'checklist' },
  { pose: 'trasformazione' },
];

export default function MinaShowcase() {
  const [run, setRun] = useState(0);
  const { t } = useT();
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
          {t('profile:mina.replay')}
        </Text>
      </Pressable>
      <View style={styles.grid}>
        {items.map((s) => (
          <View key={`${s.pose}-${run}`} style={styles.cell}>
            {s.pose === 'trasformazione' ? (
              <MinaChefTransform size={size} play />
            ) : (
              <MinaMascot pose={s.pose} size={size} animated idle interactive accessibilityLabel={t('profile:mina.a11y', { label: t(`profile:mina.pose.${s.pose}`) })} />
            )}
            <Text variant="small" color={colors.inkSoft} style={{ fontWeight: '700' }}>
              {t(`profile:mina.pose.${s.pose}`)}
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
