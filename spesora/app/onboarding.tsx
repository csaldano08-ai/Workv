import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDays, capitalize, formatLongDate, rangeDays, toIsoLocal, weekdayOf } from '../src/core/domain/dates';
import { generatePlan } from '../src/core/domain/planner';
import { parseProfile } from '../src/core/domain/profile';
import { hashString } from '../src/core/domain/random';
import { toMilli } from '../src/core/domain/quantity';
import { requestPermission } from '../src/core/notifications/NotificationScheduler';
import { catalogIndex, useApp } from '../src/features/app/AppProvider';
import { PLAN_DAYS } from '../src/features/app/SpesoraService';
import { newDraft, pantryItems, restoreDraft, type OnboardingDraft } from '../src/features/onboarding/draft';
import { PREVIEW_STEP, STEPS } from '../src/features/onboarding/registry';
import { MEAL_LABELS } from '../src/i18n/labels';
import { colors, radius, space } from '../src/theme/tokens';
import { Reveal } from '../src/ui/Reveal';
import { AssistantBubble } from '../src/ui/AssistantBubble';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Notice } from '../src/ui/Notice';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { t } from '../src/i18n/it';

export default function Onboarding() {
  const { snapshot, service, run } = useApp();
  const [initial] = useState(() => (snapshot?.onboarding && !snapshot.onboarding.completed ? snapshot.onboarding : null));
  const [draft, setDraftState] = useState<OnboardingDraft>(() => (initial ? restoreDraft(initial.draft) : newDraft()));
  const [step, setStep] = useState(() => Math.min(Math.max(initial?.step ?? 0, 0), PREVIEW_STEP));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setDraft = (fn: (d: OnboardingDraft) => OnboardingDraft) => {
    setError(null);
    setDraftState(fn);
  };

  // Salvataggio progressivo: ogni modifica e ogni passo vengono memorizzati.
  useEffect(() => {
    const handle = setTimeout(() => void service?.saveOnboardingStep(draft, step).catch(() => undefined), 250);
    return () => clearTimeout(handle);
  }, [draft, step, service]);

  const def = STEPS[step];
  const go = (next: number) => {
    setError(null);
    setStep(Math.max(0, Math.min(PREVIEW_STEP, next)));
  };

  const next = async () => {
    if (!def) return;
    const problem = def.validate?.(draft) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    if (def.id === 'notifiche' && (draft.notifications.mealReminders || draft.notifications.shoppingReminders || draft.notifications.planEndReminder)) {
      setBusy(true);
      await requestPermission(); // se negato, l'app continua a funzionare senza avvisi
      setBusy(false);
    }
    go(step + 1);
  };

  const finish = async () => {
    setBusy(true);
    const ok = await run(async (s, today) => {
      await s.completeOnboarding(draft.profile, pantryItems(draft), draft.notifications, today, minutesNow());
      await s.updateNotificationSettings(draft.notifications, true);
      return true;
    });
    setBusy(false);
    if (ok) router.replace('/');
  };

  if (step >= PREVIEW_STEP) {
    return <Preview draft={draft} busy={busy} onBack={() => go(STEPS.length - 1)} onConfirm={finish} />;
  }

  const reaction = def.react?.(draft) ?? null;
  const mina = reaction ?? (def.tip ? { pose: def.pose ?? 'explaining', tip: def.tip } : null);
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footerRow}>
          {step > 0 ? <Button kind="secondary" label={t('action.back')} onPress={() => go(step - 1)} style={styles.flex} /> : null}
          <Button
            label={def.id === 'notifiche' ? 'Continua' : def.optional && isEmptyOptional(def.id, draft) ? t('action.skip') : t('action.next')}
            onPress={next}
            loading={busy}
            style={styles.flex}
          />
        </View>
      }
    >
      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEPS.length, now: step + 1 }}>
        <View style={[styles.progressFill, { width: `${((step + 1) / (STEPS.length + 1)) * 100}%` }]} />
      </View>
      <Text variant="caption" color={colors.inkSoft}>
        {`PASSO ${step + 1} DI ${STEPS.length}`}
      </Text>
      {mina ? <AssistantBubble pose={mina.pose} text={mina.tip} size={96} /> : null}
      <Text variant="title" accessibilityRole="header">
        {def.title}
      </Text>
      {def.subtitle ? (
        <Text variant="body" color={colors.inkSoft}>
          {def.subtitle}
        </Text>
      ) : null}
      <def.Component draft={draft} setDraft={setDraft} />
      {error ? <Notice tone="warning" text={error} /> : null}
    </Screen>
  );
}

function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function isEmptyOptional(id: string, d: OnboardingDraft): boolean {
  if (id === 'esclusioni') return d.profile.excludedAllergens.length === 0 && d.profile.excludedIngredientIds.length === 0;
  if (id === 'non-graditi') return d.profile.dislikedIngredientIds.length === 0;
  if (id === 'gusti') return d.profile.tastes.likes.length === 0 && d.profile.tastes.weekStyles.length === 0;
  if (id === 'dispensa') return Object.keys(d.pantry).length === 0;
  return false;
}

/** Anteprima reale: lo stesso motore e lo stesso seed usati alla conferma. */
function Preview({ draft, busy, onBack, onConfirm }: { draft: OnboardingDraft; busy: boolean; onBack: () => void; onConfirm: () => void }) {
  const today = toIsoLocal(new Date());
  const result = useMemo(() => {
    try {
      const profile = parseProfile(draft.profile);
      const pantry = new Map(Object.entries(draft.pantry).filter(([, v]) => v !== null).map(([k, v]) => [k, toMilli(v as number)]));
      return generatePlan({ profile, catalog: catalogIndex, startDate: today, days: PLAN_DAYS, pantry, history: [], favorites: new Set(), seed: hashString(`spesora|${today}`), skipFirstDayBefore: minutesNow() });
    } catch {
      return null;
    }
  }, [draft, today]);

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footerRow}>
          <Button kind="secondary" label="Modifica" onPress={onBack} style={styles.flex} />
          <Button label="Inizia la settimana" onPress={onConfirm} loading={busy} disabled={!result || result.meals.length === 0} style={styles.flex} />
        </View>
      }
    >
      <Text variant="title" accessibilityRole="header">
        La tua prima settimana
      </Text>
      <AssistantBubble pose="success" size={96} text="È pronta! L’ho preparata con le tue risposte. Puoi cambiare ogni pasto quando vuoi." />
      <Text variant="body" color={colors.inkSoft}>
        {`Dal ${formatLongDate(today)} al ${formatLongDate(addDays(today, PLAN_DAYS - 1))}. Potrai cambiare ogni pasto in qualsiasi momento.`}
      </Text>
      {!result ? <Notice tone="warning" text="Alcune risposte non sono valide. Torna indietro per controllarle." /> : null}
      {result && result.issues.length > 0 ? (
        <Notice tone="warning" title={`${result.issues.length} pasti senza ricetta`} text={result.issues[0].message} />
      ) : null}
      {result
        ? rangeDays(today, PLAN_DAYS).map((date, dayIndex) => {
            const meals = result.meals.filter((m) => m.date === date);
            return (
              <Reveal key={date} index={dayIndex}>
              <Card>
                <Text variant="heading">
                  {capitalize(formatLongDate(date))}
                  {draft.profile.shoppingDays.includes(weekdayOf(date)) ? ' · giorno di spesa' : ''}
                </Text>
                {meals.length === 0 ? (
                  <Text variant="small" color={colors.inkSoft}>
                    Nessun pasto
                  </Text>
                ) : (
                  meals.map((m) => {
                    const r = catalogIndex.recipe(m.recipeId);
                    return (
                      <View key={m.id} style={styles.mealRow}>
                        <Text variant="small" color={colors.inkSoft} style={styles.mealType}>
                          {MEAL_LABELS[m.mealType]}
                        </Text>
                        <Text variant="body" style={styles.flex}>
                          {r?.name}
                        </Text>
                        <Text variant="small" color={colors.inkSoft}>
                          {r ? `${r.totalMinutes}′` : ''}
                        </Text>
                      </View>
                    );
                  })
                )}
              </Card>
              </Reveal>
            );
          })
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden', marginTop: space.sm },
  progressFill: { height: 6, backgroundColor: colors.green },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mealType: { width: 84 },
});
