import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { CatalogIndex } from '../../core/domain/catalog';
import { toIsoLocal } from '../../core/domain/dates';
import { configureNotifications, syncNotifications } from '../../core/notifications/NotificationScheduler';
import { openAppDb } from '../../core/storage/expoDb';
import { CATALOG } from '../../data/catalog';
import { t } from '../../i18n/it';
import { SpesoraService, type AppSnapshot } from './SpesoraService';

export const catalogIndex = new CatalogIndex(CATALOG);

type Status = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

interface AppContextValue {
  status: Status;
  snapshot: AppSnapshot | null;
  service: SpesoraService | null;
  catalog: CatalogIndex;
  /** Esegue una modifica, ricarica lo stato e riallinea le notifiche. */
  run: <T>(action: (s: SpesoraService, today: string) => Promise<T>) => Promise<T | undefined>;
  refresh: () => Promise<void>;
  retry: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const today = () => toIsoLocal(new Date());
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const serviceRef = useRef<SpesoraService | null>(null);
  const [service, setService] = useState<SpesoraService | null>(null);
  const [attempt, setAttempt] = useState(0);

  const syncReminders = useCallback(async (snap: AppSnapshot) => {
    if (!snap.profile) return;
    try {
      await syncNotifications({
        meals: snap.meals,
        catalog: catalogIndex,
        shoppingTripDates: snap.shopping.trips.filter((tr) => !tr.isInitial && tr.lines.length > 0).map((tr) => tr.date),
        planEnd: snap.plan?.endDate ?? null,
        settings: snap.notificationSettings,
        now: new Date(),
      });
    } catch {
      // Le notifiche sono un supporto: un errore non deve bloccare l'app.
    }
  }, []);

  const refresh = useCallback(async () => {
    const service = serviceRef.current;
    if (!service) return;
    const d = today();
    await service.ensureCurrentPlan(d, nowMinutes());
    const snap = await service.snapshot(d);
    setSnapshot(snap);
    void syncReminders(snap);
  }, [syncReminders]);

  useEffect(() => {
    let cancelled = false;
    configureNotifications();
    (async () => {
      try {
        const db = await openAppDb();
        if (cancelled) return;
        const svc = new SpesoraService(db, catalogIndex);
        serviceRef.current = svc;
        await refresh();
        if (!cancelled) setService(svc);
        if (!cancelled) setStatus({ kind: 'ready' });
      } catch {
        if (!cancelled) setStatus({ kind: 'error', message: t('error.db') });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, refresh]);

  // Al ritorno in primo piano: la data può essere cambiata, il piano va aggiornato.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh]);

  const run = useCallback<AppContextValue['run']>(
    async (action) => {
      const service = serviceRef.current;
      if (!service) return undefined;
      try {
        const result = await action(service, today());
        await refresh();
        return result;
      } catch (e) {
        const detail = e instanceof Error && !(e as { cause?: unknown }).cause ? `\n\n${e.message}` : '';
        Alert.alert('Operazione non riuscita', `${t('error.generic')}${detail}`);
        await refresh().catch(() => undefined);
        return undefined;
      }
    },
    [refresh],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      snapshot,
      service,
      catalog: catalogIndex,
      run,
      refresh,
      retry: () => {
        setStatus({ kind: 'loading' });
        setAttempt((a) => a + 1);
      },
    }),
    [status, snapshot, service, run, refresh],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp fuori da AppProvider');
  return ctx;
}

/** Snapshot garantito (usato nelle schermate dopo il caricamento). */
export function useSnapshot(): AppSnapshot {
  const { snapshot } = useApp();
  if (!snapshot) throw new Error('Stato non ancora caricato');
  return snapshot;
}
