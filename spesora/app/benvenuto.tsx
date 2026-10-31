import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../src/features/app/AppProvider';
import { colors, space } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { Logo } from '../src/ui/Logo';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { t } from '../src/i18n/it';

const POINTS = [
  { title: 'Cosa cucinare', text: 'Colazione, pranzo e cena per tutta la settimana, nel tempo che hai.' },
  { title: 'Quando fare la spesa', text: 'Liste divise per i giorni in cui esci davvero a comprare.' },
  { title: 'Cosa resta in dispensa', text: 'Le quantità si aggiornano solo quando confermi di aver cucinato.' },
];

export default function Welcome() {
  const { snapshot } = useApp();
  const resuming = !!snapshot?.onboarding && !snapshot.onboarding.completed;
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button label={resuming ? 'Riprendi da dove eri rimasto' : t('welcome.start')} onPress={() => router.push('/onboarding')} />
          <Button kind="ghost" label={t('welcome.privacy')} onPress={() => router.push('/privacy')} />
        </>
      }
    >
      <View style={styles.hero}>
        <Logo size={60} />
        <Text variant="title" color={colors.ink}>
          {t('app.slogan')}
        </Text>
        <Text variant="body" color={colors.inkSoft}>
          {t('welcome.value')}
        </Text>
      </View>
      <View style={styles.points}>
        {POINTS.map((p, i) => (
          <View key={p.title} style={styles.point}>
            <View style={styles.num}>
              <Text variant="heading" color={colors.white}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.pointText}>
              <Text variant="heading">{p.title}</Text>
              <Text variant="small" color={colors.inkSoft}>
                {p.text}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="small" color={colors.inkSoft}>
        {t('welcome.noAccount')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, marginTop: space.xl },
  points: { gap: space.lg, marginTop: space.md },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, gap: 2 },
});
