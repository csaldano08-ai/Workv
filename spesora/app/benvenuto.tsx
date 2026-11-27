import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../src/features/app/AppProvider';
import { colors, radius, space } from '../src/theme/tokens';
import { MinaMascot } from '../src/ui/mascot/Mina';
import { Floaty } from '../src/ui/Decor';
import { Ingredient } from '../src/ui/illustrations/Ingredient';
import { Reveal } from '../src/ui/Reveal';
import { StickyNote } from '../src/ui/notebook';
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
      reveal={false}
      footer={
        <>
          <Button label={resuming ? 'Riprendi da dove eri rimasto' : t('welcome.start')} onPress={() => router.push('/onboarding')} />
          <Button kind="ghost" label={t('welcome.privacy')} onPress={() => router.push('/privacy')} />
        </>
      }
    >
      <View style={styles.hero}>
        <Reveal style={styles.brand}>
          <Logo size={36} />
        </Reveal>
        <Reveal>
          <View style={styles.stage}>
            <View style={styles.blob} />
            <View style={styles.blobInner} />
            <Floaty style={styles.ingTL}>
              <Ingredient kind="leaf" size={46} />
            </Floaty>
            <Floaty delay={400} style={styles.ingTR}>
              <Ingredient kind="lemon" size={44} />
            </Floaty>
            <Floaty delay={800} style={styles.ingBL}>
              <Ingredient kind="tomato" size={50} />
            </Floaty>
            <Floaty delay={1200} style={styles.ingBR}>
              <Ingredient kind="carrot" size={48} />
            </Floaty>
            <MinaMascot pose="welcome" size={220} animated idle interactive accessibilityLabel="Mina, la borsetta della spesa di Spesora, che ti saluta" />
          </View>
        </Reveal>
        <Reveal index={1}>
          <StickyNote tone="sage" style={styles.speech}>
            <Text variant="hand" center accessibilityLabel="Mina: Ciao, sono Mina!">Ciao, sono Mina!</Text>
            <Text variant="body" color={colors.inkSoft}>
              Ti aiuto a decidere cosa cucinare, cosa comprare e quando. Tu pensi solo a goderti il pasto.
            </Text>
          </StickyNote>
        </Reveal>
        <Reveal index={2} style={{ gap: space.sm }}>
          <Text variant="title" color={colors.ink} style={styles.slogan}>
            {t('app.slogan')}
          </Text>
          <Text variant="body" color={colors.inkSoft}>
            {t('welcome.value')}
          </Text>
        </Reveal>
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
  hero: { gap: space.md, marginTop: space.md },
  brand: { alignItems: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center', height: 290 },
  blob: { position: 'absolute', width: 270, height: 270, borderRadius: 135, backgroundColor: colors.greenSoft },
  blobInner: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.greenMist },
  ingTL: { position: 'absolute', left: 8, top: 18 },
  ingTR: { position: 'absolute', right: 10, top: 30 },
  ingBL: { position: 'absolute', left: 22, bottom: 10 },
  ingBR: { position: 'absolute', right: 26, bottom: 4 },
  speech: { padding: space.lg, alignItems: 'center', gap: space.xs },
  slogan: { marginTop: space.sm },
  points: { gap: space.lg, marginTop: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, gap: 2 },
});
