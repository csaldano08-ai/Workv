import { Stack, router, usePathname } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { parseRouteFromNotification } from '../src/core/notifications/routing';
import { AppProvider, useApp } from '../src/features/app/AppProvider';
import { colors, space } from '../src/theme/tokens';
import { CelebrationHost } from '../src/ui/CelebrationHost';
import { Button } from '../src/ui/Button';
import { LogoMark } from '../src/ui/Logo';
import { Text } from '../src/ui/Text';
import { t } from '../src/i18n/it';

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
    const open = ['/benvenuto', '/onboarding', '/privacy'].some((p) => pathname.startsWith(p));
    if (!snapshot.profile && !open) router.replace('/benvenuto');
  }, [status, snapshot, pathname]);
  return null;
}

function Shell() {
  const { status, retry } = useApp();
  if (status.kind === 'loading') {
    return (
      <View style={styles.center}>
        <LogoMark size={64} />
        <ActivityIndicator color={colors.green} accessibilityLabel="Caricamento" />
      </View>
    );
  }
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
      <CelebrationHost />
      <Stack
        screenOptions={{
          headerTintColor: colors.green,
          headerStyle: { backgroundColor: colors.ivory },
          headerTitleStyle: { color: colors.ink },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.ivory },
          headerBackButtonDisplayMode: 'minimal',
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="benvenuto" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy e dati' }} />
        <Stack.Screen name="ricetta/[id]" options={{ title: '' }} />
        <Stack.Screen name="cambia/[mealId]" options={{ title: 'Cambia ricetta', presentation: 'modal' }} />
        <Stack.Screen name="sposta/[mealId]" options={{ title: 'Sposta il pasto', presentation: 'modal' }} />
        <Stack.Screen name="ripeti/[recipeId]" options={{ title: 'Ripeti la ricetta', presentation: 'modal' }} />
        <Stack.Screen name="voce/[ingredientId]" options={{ title: 'Dispensa', presentation: 'modal' }} />
        <Stack.Screen name="aggiungi" options={{ title: 'Aggiungi in dispensa', presentation: 'modal' }} />
        <Stack.Screen name="impostazioni" options={{ title: 'Impostazioni' }} />
        <Stack.Screen name="preferenze/[section]" options={{ title: 'Modifica' }} />
        <Stack.Screen name="notifiche" options={{ title: 'Notifiche' }} />
        <Stack.Screen name="plus" options={{ title: 'Spesora Plus' }} />
        <Stack.Screen name="storico" options={{ title: 'Storico dei pasti' }} />
        <Stack.Screen name="prezzi" options={{ title: 'Prezzi' }} />
        <Stack.Screen name="economica" options={{ title: 'Settimana più economica', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl, backgroundColor: colors.ivory },
});
