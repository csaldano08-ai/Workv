import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Alert } from '../src/ui/dialog';
import { countScheduled, getPermission, requestPermission, sendTestNotification, type PermissionState } from '../src/core/notifications/NotificationScheduler';
import type { NotificationSettings } from '../src/core/notifications/schedule';
import { useApp } from '../src/features/app/AppProvider';
import { NotificationSettingsEditor } from '../src/features/onboarding/steps';
import { colors } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Notice } from '../src/ui/Notice';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

const PERMISSION_TEXT: Record<PermissionState, string> = {
  granted: 'Permesso concesso: i promemoria sono programmati su questo iPhone.',
  denied: 'Permesso negato: Spesora funziona comunque, ma senza avvisi. Puoi riattivarli dalle Impostazioni di iOS.',
  undetermined: 'Non hai ancora concesso il permesso alle notifiche.',
  unsupported: 'Le notifiche non sono disponibili su questa piattaforma.',
};

export default function NotificationsScreen() {
  const { snapshot, run } = useApp();
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [count, setCount] = useState<number | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(snapshot?.notificationSettings ?? null);

  useEffect(() => {
    void getPermission().then(setPermission);
    void countScheduled().then(setCount).catch(() => setCount(null));
  }, [snapshot]);

  if (!settings || !snapshot?.profile) return <Screen edges={['bottom']}>{null}</Screen>;

  const update = (patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void run((s) => s.updateNotificationSettings(next, true));
  };

  return (
    <Screen edges={['bottom']}>
      <Notice tone={permission === 'denied' ? 'warning' : 'info'} text={PERMISSION_TEXT[permission]} />
      {permission === 'undetermined' ? (
        <Button label="Consenti le notifiche" onPress={async () => setPermission(await requestPermission())} />
      ) : null}
      {permission === 'denied' ? <Button kind="secondary" label="Apri le Impostazioni di iOS" onPress={() => void Linking.openSettings()} /> : null}
      <Card>
        <NotificationSettingsEditor settings={settings} onChange={update} mealTypes={snapshot.profile.mealTypes} />
      </Card>
      {count !== null && permission === 'granted' ? (
        <Text variant="small" color={colors.inkSoft}>
          {`Promemoria programmati ora: ${count}. Vengono aggiornati ogni volta che apri l’app o modifichi il calendario.`}
        </Text>
      ) : null}
      <Button
        kind="secondary"
        icon="notifications-outline"
        label="Invia una notifica di prova"
        disabled={permission !== 'granted'}
        onPress={async () => {
          const p = await sendTestNotification();
          if (p === 'granted') Alert.alert('Notifica di prova', 'Arriverà tra circa 5 secondi. Blocca il telefono o torna alla schermata Home per vederla.');
        }}
      />
      <Text variant="small" color={colors.inkSoft}>
        iOS limita le attività in background: i promemoria coprono il calendario attuale. Apri Spesora almeno una volta a settimana per programmare i successivi.
      </Text>
    </Screen>
  );
}
