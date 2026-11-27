import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type HostInstance, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { appConfig } from '../src/core/config';
import { useApp } from '../src/features/app/AppProvider';
import { registerIntroAnchor, useIntroState, type IntroAnchor } from '../src/features/intro/introBus';
import { colors, space } from '../src/theme/tokens';
import { MinaLogo } from '../src/ui/brand/MinaLogo';
import { Button } from '../src/ui/Button';
import { MinaMascot } from '../src/ui/mascot/Mina';
import { Text } from '../src/ui/Text';

/*
 * Benvenuto (telefoni 1 e 2 del riferimento): tre pagine brevi, una per vantaggio, grafica grande e poche parole.
 *   1 · Mina 2.0 saluta, logo, «Cucina e organizza la tua spesa.»  → «Inizia»
 *   2 · Mina Chef con cucchiaio e ciotola, «Benvenuto in Mina!»     → «Continua» (le ricette)
 *   3 · Mina 2.0 con la lista, la spesa già pronta                  → «Continua» porta al questionario
 * Nessun account, nessun accesso con email, Google o Apple: si parte e basta.
 * Si vede solo finché il profilo non esiste (OnboardingGate); chi ha già iniziato il questionario lo riprende subito.
 */

/** Registra dove si trova un elemento, perché l'intro possa arrivarci esattamente (passaggio senza tagli). */
function useIntroAnchor(name: IntroAnchor, ref: RefObject<HostInstance | null>) {
  useEffect(
    () =>
      registerIntroAnchor(
        name,
        () =>
          new Promise((resolve) => {
            const node = ref.current;
            if (!node) return resolve(null);
            node.measureInWindow((x, y, w, h) => resolve({ x, y, w, h }));
          }),
      ),
    [name, ref],
  );
}

const PAGES = 3;
/** Abbonamento obbligatorio configurato (app.json → extra.paywallMode = "required"): va detto prima del questionario. */
const SUBSCRIPTION_REQUIRED = appConfig.paywallMode === 'required';

export default function Welcome() {
  const { snapshot } = useApp();
  const resuming = !!snapshot?.onboarding && !snapshot.onboarding.completed;
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollViewInstance>(null);
  // dopo l'intro Mina è già qui e ha già salutato: resta nella posa del saluto, viva, senza ripetere il gesto
  const intro = useIntroState();
  const logoRef = useRef<HostInstance>(null);
  const minaRef = useRef<HostInstance>(null);
  useIntroAnchor('logo', logoRef);
  useIntroAnchor('mina', minaRef);

  // spazio per la grafica: telefoni bassi (iPhone SE) con Mina più piccola, così testo e pulsante restano visibili
  // V4: grafica grande (come nel riferimento) che riempie la pagina; più piccola solo sui telefoni bassi
  const art = Math.round(Math.min(300, Math.max(150, (height - 360) * 0.66)));

  const go = (p: number) => {
    setPage(p);
    pager.current?.scrollTo({ x: p * width, animated: true });
  };
  const next = () => {
    if (resuming || page >= PAGES - 1) router.push('/onboarding');
    else go(page + 1);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (p !== page && p >= 0 && p < PAGES) setPage(p);
  };
  const label = resuming ? 'Riprendi il questionario' : page === 0 ? 'Inizia' : 'Continua';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Blobs />
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        scrollEnabled={!resuming}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={styles.flex}
        accessibilityLabel="Presentazione di Mina"
      >
        <Page width={width}>
          <View ref={minaRef} collapsable={false}>
            <MinaMascot pose="welcome" size={art} animated={intro === 'none'} idle interactive accessibilityLabel="Mina, la tua borsetta della spesa, che ti saluta" />
          </View>
          <View ref={logoRef} collapsable={false} style={styles.logo}>
            <MinaLogo height={Math.round(art * 0.27)} />
          </View>
          <Text variant="heading" center style={styles.tagline}>
            {'Cucina e organizza\nla tua spesa.'}
          </Text>
          {/* trasparenza: chi inizia il questionario sa già che l'accesso completo sarà a pagamento */}
          {SUBSCRIPTION_REQUIRED ? (
            <Text variant="small" color={colors.inkSoft} center style={styles.disclosure}>
              Personalizza il tuo piano. L’accesso completo richiede un abbonamento.
            </Text>
          ) : null}
        </Page>
        <Page width={width}>
          <View style={styles.stage}>
            <StageBlob size={art * 1.35} />
            <MinaMascot pose="cooking" eyes="happy" size={Math.round(Math.min(art * 1.12, 330))} animated={page === 1} idle={page === 1} interactive accessibilityLabel="Mina Chef con il cucchiaio di legno" />
          </View>
          <Text variant="screen" center style={styles.title} accessibilityRole="header">
            Benvenuto in Mina!
          </Text>
          <Text variant="body" color={colors.inkSoft} center style={styles.line}>
            Ricette facili, scelte per i tuoi gusti.
          </Text>
        </Page>
        <Page width={width}>
          <View style={styles.stage}>
            <StageBlob size={art * 1.35} flip />
            <MinaMascot pose="shopping" size={Math.round(art * 1.05)} animated={page === 2} idle={page === 2} interactive accessibilityLabel="Mina con la lista della spesa" />
          </View>
          <Text variant="screen" center style={styles.title} accessibilityRole="header">
            La spesa è già pronta
          </Text>
          <Text variant="body" color={colors.inkSoft} center style={styles.line}>
            Una lista per i giorni in cui esci a comprare.
          </Text>
        </Page>
      </ScrollView>

      <View style={styles.bottom}>
        {!resuming ? (
          <View style={styles.dots} accessible accessibilityLabel={`Pagina ${page + 1} di ${PAGES}`}>
            {Array.from({ length: PAGES }, (_, i) => (
              <Pressable key={i} onPress={() => go(i)} hitSlop={8} accessibilityElementsHidden importantForAccessibility="no">
                <View style={[styles.dot, i === page && styles.dotOn]} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Button label={label} iconRight="arrow-forward" size="large" onPress={next} />
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.privacy} hitSlop={6}>
          <Text variant="small" color={colors.inkSoft} center>
            Nessun account richiesto · <Text variant="small" color={colors.green} style={styles.link}>Privacy</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Page({ width, children }: { width: number; children: ReactNode }) {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.pageInner}>{children}</View>
    </View>
  );
}

/** Forma morbida dietro Mina (pagine 2 e 3), come la macchia salvia del riferimento. */
function StageBlob({ size, flip }: { size: number; flip?: boolean }) {
  return (
    <Svg width={size} height={size * 0.82} viewBox="0 0 200 164" style={[styles.blob, flip && styles.flip]} pointerEvents="none">
      <Path d="M38,30 C70,4 136,0 170,28 C200,54 204,104 182,132 C158,162 96,170 54,152 C14,135 -4,98 6,66 C11,50 22,40 38,30 Z" fill={colors.greenSoft} />
    </Svg>
  );
}

/** Forme morbide salvia ai lati, come nel riferimento (decorative). */
function Blobs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={150} height={260} viewBox="0 0 150 260" style={styles.blobL}>
        <Path d="M0,10 C60,0 120,40 128,104 C136,170 92,236 0,252 Z" fill={colors.sage} opacity={0.55} />
      </Svg>
      <Svg width={120} height={220} viewBox="0 0 120 220" style={styles.blobR}>
        <Path d="M120,0 C60,12 14,56 10,112 C6,170 56,212 120,220 Z" fill={colors.sage} opacity={0.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.desk },
  flex: { flex: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageInner: { width: '100%', maxWidth: 480, alignItems: 'center', paddingHorizontal: space.xl },
  logo: { marginTop: space.lg },
  tagline: { marginTop: space.lg, fontSize: 22, lineHeight: 30, fontWeight: '600' },
  disclosure: { marginTop: space.md, maxWidth: 300 },
  stage: { alignItems: 'center', justifyContent: 'center' },
  blob: { position: 'absolute' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { marginTop: space.xl, fontSize: 30, lineHeight: 36 },
  line: { marginTop: space.sm },
  bottom: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.sm, gap: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#DCD8CF' },
  dotOn: { backgroundColor: colors.green },
  privacy: { alignSelf: 'center', minHeight: 32, justifyContent: 'center', marginTop: -space.xs },
  link: { fontWeight: '700', textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none' },
  blobL: { position: 'absolute', left: -40, top: '36%' },
  blobR: { position: 'absolute', right: -30, top: '40%' },
});
