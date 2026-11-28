import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
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
import { toast } from '../src/ui/toast';
import { useT } from '../src/i18n';

/** Testo dello stato del permesso (chiavi `profile:notifications.<stato>`). */
const PERMISSION_KEY: Record<PermissionState, string> = {
  granted: 'profile:notifications.granted',
  denied: 'profile:notifications.denied',
  undetermined: 'profile:notifications.undetermined',
  unsupported: 'profile:notifications.unsupported',
};

export default function NotificationsScreen() {
  const { snapshot, run } = useApp();
  const { t } = useT();
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
      <Notice tone={permission === 'denied' ? 'warning' : 'info'} text={t(PERMISSION_KEY[permission])} />
      {permission === 'undetermined' ? (
        <Button label={t('profile:notifications.allow')} onPress={async () => setPermission(await requestPermission())} />
      ) : null}
      {permission === 'denied' ? <Button kind="secondary" label={t('profile:notifications.openSettings')} onPress={() => void Linking.openSettings()} /> : null}
      <Card>
        <NotificationSettingsEditor settings={settings} onChange={update} mealTypes={snapshot.profile.mealTypes} />
      </Card>
      {count !== null && permission === 'granted' ? (
        <Text variant="small" color={colors.inkSoft}>
          {t('profile:notifications.scheduled', { count })}
        </Text>
      ) : null}
      <Button
        kind="secondary"
        icon="notifications-outline"
        label={t('profile:notifications.test')}
        disabled={permission !== 'granted'}
        onPress={async () => {
          const p = await sendTestNotification();
          if (p === 'granted') toast(t('profile:notifications.testSent'), 'info');
        }}
      />
      <Text variant="small" color={colors.inkSoft}>
        {t('profile:notifications.iosLimit')}
      </Text>
    </Screen>
  );
}
