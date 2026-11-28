import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { onLanguageChange, t } from '../../i18n';
import { computeNotifications, diffNotifications, NOTIFICATION_PREFIX, type ScheduleInput } from './schedule';

/**
 * NotificationScheduler — adattatore Expo per le notifiche LOCALI.
 * Nessuna notifica push da server. Se il permesso è negato, l'app funziona comunque.
 */

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let configured = false;

export function configureNotifications(): void {
  if (!supported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    setupAndroidChannel();
    // il nome del canale compare nelle impostazioni di sistema: segue la lingua dell'app
    onLanguageChange(setupAndroidChannel);
  }
}

/** Crea o aggiorna (stesso id) il canale Android con il nome nella lingua corrente. */
function setupAndroidChannel(): void {
  void Notifications.setNotificationChannelAsync('promemoria', {
    name: t('services:notif.channel'),
    // eslint-disable-next-line import/namespace -- enum esportato dai tipi, falso positivo
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return p.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export interface SyncResult {
  scheduled: number;
  cancelled: number;
  permission: PermissionState;
}

/** Allinea gli avvisi programmati sul dispositivo al piano attuale (annulla i vecchi, aggiunge i nuovi). */
export async function syncNotifications(input: ScheduleInput): Promise<SyncResult> {
  const permission = await getPermission();
  if (permission !== 'granted') return { scheduled: 0, cancelled: 0, permission };
  const desired = computeNotifications(input);
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const diff = diffNotifications(desired, existing.map((n) => n.identifier));
  for (const id of diff.toCancel) await Notifications.cancelScheduledNotificationAsync(id);
  for (const n of diff.toSchedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { url: n.url, kind: n.kind } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: Platform.OS === 'android' ? 'promemoria' : undefined },
    });
  }
  return { scheduled: diff.toSchedule.length, cancelled: diff.toCancel.length, permission };
}

export async function cancelAllOurs(): Promise<void> {
  if (!supported) return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) if (n.identifier.startsWith(NOTIFICATION_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
}

/** Notifica di prova tra 5 secondi: chiudi o metti in background l'app per vederla. */
export async function sendTestNotification(): Promise<PermissionState> {
  const permission = await getPermission();
  if (permission !== 'granted') return permission;
  await Notifications.scheduleNotificationAsync({
    identifier: `${NOTIFICATION_PREFIX}test:${Date.now()}`,
    content: { title: t('services:notif.test.title'), body: t('services:notif.test.body'), data: { url: '/' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, repeats: false },
  });
  return permission;
}

export async function countScheduled(): Promise<number> {
  if (!supported) return 0;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => n.identifier.startsWith(NOTIFICATION_PREFIX)).length;
}
