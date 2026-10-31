/**
 * Validazione delle destinazioni contenute nelle notifiche: solo percorsi interni noti.
 */
const ALLOWED = [/^\/$/, /^\/ricetta\/[a-z0-9_]+(\?mealId=[A-Za-z0-9_%-]+)?$/, /^\/spesa(\?trip=\d{4}-\d{2}-\d{2})?$/, /^\/settimana$/];

export function parseRouteFromNotification(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const url = (data as { url?: unknown }).url;
  if (typeof url !== 'string') return null;
  return ALLOWED.some((re) => re.test(url)) ? url : null;
}
