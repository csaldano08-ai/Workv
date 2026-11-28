// prima di tutto: lingua e formati pronti al primo disegno
import { DefaultTheme, Stack, ThemeProvider, router, usePathname } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { parseRouteFromNotification } from '../src/core/notifications/routing';
import { AppProvider, useApp } from '../src/features/app/AppProvider';
import { colors, font, space } from '../src/theme/tokens';
import { useFonts } from 'expo-font';
import { CelebrationHost } from '../src/ui/CelebrationHost';
import { ToastHost } from '../src/ui/toast';
import { IntroGate } from '../src/features/intro/IntroGate';
import { SubscriptionGate } from '../src/features/paywall/subscription';
import { LoaderHost } from '../src/ui/loader/LoaderHost';
import { useReducedMotion } from '../src/ui/useReducedMotion';
import { Button } from '../src/ui/Button';
import { LogoMark } from '../src/ui/Logo';
import { Text } from '../src/ui/Text';
import { useT } from '../src/i18n';

/** Apre la schermata indicata dalla notifica toccata, anche ad app chiusa (avvio a freddo). */
function NotificationRouter() {
  const { status, snapshot } = useApp();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  const ready = status.kind === 'ready' && !!snapshot?.profile;
  useEffect(() => {
    if (!ready || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const key = `${response.notification.request.identifier}|${response.notification.date}`;
    if (handled.current === key) return;
    handled.current = key;
    const url = parseRouteFromNotification(response.notification.request.content.data);
    if (url) router.push(url as never);
  }, [ready, response]);
  return null;
}

/** Porta all'onboarding chi non l'ha ancora completato. */
function OnboardingGate() {
  const { status, snapshot } = useApp();
  const pathname = usePathname();
  useEffect(() => {
    if (status.kind !== 'ready' || !snapshot) return;
    const open = ['/benvenuto', '/onboarding', '/privacy', '/termini', '/legale', '/licenze', '/mina', '/lingua'].some((p) => pathname.startsWith(p));
    if (!snapshot.profile && !open) router.replace('/benvenuto');
  }, [status, snapshot, pathname]);
  return null;
}

function Shell() {
  const { status, retry } = useApp();
  const { t } = useT();
  const reduced = useReducedMotion();
  // Nessun caricamento visibile all'avvio: solo il fondo, poi parte subito l'intro (o l'app).
  if (status.kind === 'loading') return <View style={styles.blank} />;
  if (status.kind === 'error') {
    return (
      <View style={styles.center}>
        <LogoMark size={64} />
        <Text variant="heading" center>
          {status.message}
        </Text>
        <Button label={t('error.retry')} onPress={retry} />
      </View>
    );
  }
  return (
    <>
      {Platform.OS !== 'web' ? <NotificationRouter /> : null}
      <OnboardingGate />
      <SubscriptionGate />
      <Stack
        screenOptions={{
          headerTintColor: colors.green,
          headerStyle: { backgroundColor: colors.desk },
          headerTitleStyle: { color: colors.ink, fontFamily: font.extrabold, fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.desk },
          headerBackButtonDisplayMode: 'minimal',
          // pagine nuove: lo scorrimento di iOS (anche su Android, con la pagina sotto che arretra appena);
          // con "Riduci movimento" una dissolvenza breve
          animation: reduced ? 'fade' : 'ios_from_right',
          animationDuration: reduced ? 150 : 260,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="benvenuto" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="privacy" options={{ title: t('nav.privacy') }} />
        <Stack.Screen name="ricetta/[id]" options={{ title: '' }} />
        <Stack.Screen name="cambia/[mealId]" options={{ title: t('nav.change'), presentation: 'modal' }} />
        <Stack.Screen name="sposta/[mealId]" options={{ title: t('nav.move'), presentation: 'modal' }} />
        <Stack.Screen name="ripeti/[recipeId]" options={{ title: t('nav.repeat'), presentation: 'modal' }} />
        <Stack.Screen name="voce/[ingredientId]" options={{ title: t('nav.pantryItem'), presentation: 'modal' }} />
        <Stack.Screen name="aggiungi" options={{ title: t('nav.addPantry'), presentation: 'modal' }} />
        <Stack.Screen name="impostazioni" options={{ title: t('nav.profile'), headerShown: false }} />
        <Stack.Screen name="aiuto" options={{ title: t('nav.help') }} />
        <Stack.Screen name="legale" options={{ title: t('nav.legal') }} />
        <Stack.Screen name="licenze" options={{ title: t('nav.licenses') }} />
        <Stack.Screen name="preferenze/[section]" options={{ title: t('nav.edit') }} />
        <Stack.Screen name="notifiche" options={{ title: t('nav.notifications') }} />
        <Stack.Screen name="plus" options={{ title: t('nav.subscription') }} />
        <Stack.Screen name="abbonamento" options={{ title: t('nav.subscription') }} />
        <Stack.Screen name="termini" options={{ title: t('nav.terms') }} />
        <Stack.Screen name="storico" options={{ title: t('nav.history') }} />
        <Stack.Screen name="prezzi" options={{ title: t('nav.prices') }} />
        <Stack.Screen name="economica" options={{ title: t('nav.cheaper'), presentation: 'modal' }} />
        <Stack.Screen name="mina" options={{ title: 'Mina 2.0' }} />
        <Stack.Screen name="lingua" />
        <Stack.Screen name="cucina/[id]" options={{ title: t('nav.cooking') }} />
      </Stack>
      <CelebrationHost />
      <ToastHost />
      <LoaderHost />
      <IntroGate />
    </>
  );
}

export default function RootLayout() {
  // Nunito (SIL OFL, assets/fonts): un file per peso. Se non si carica, l'app usa il carattere di sistema.
  const [fontsLoaded, fontError] = useFonts({
    [font.regular]: require('../assets/fonts/Nunito_400Regular.ttf'),
    [font.semibold]: require('../assets/fonts/Nunito_600SemiBold.ttf'),
    [font.bold]: require('../assets/fonts/Nunito_700Bold.ttf'),
    [font.extrabold]: require('../assets/fonts/Nunito_800ExtraBold.ttf'),
  });
  if (!fontsLoaded && !fontError) return <View style={styles.blank} />;
  return (
    <SafeAreaProvider>
      <ThemeProvider value={MINA_THEME}>
        <StatusBar style="dark" />
        <AppProvider>
          <Shell />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Tema del navigatore con i colori di Mina. Il predefinito ha fondo grigio (242) e carte bianche: si vedevano per un
 * istante tra una schermata e l'altra, mentre la nuova si disegnava.
 */
const MINA_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.green, background: colors.desk, card: colors.card, text: colors.ink, border: colors.line, notification: colors.peach },
};

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.ivory },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl, backgroundColor: colors.desk },
});
