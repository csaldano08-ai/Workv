import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDays, rangeDays, toIsoLocal, weekdayOf, weekdayShort } from '../src/core/domain/dates';
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
import { LOADER_TEXT, withLoader } from '../src/ui/loader/loaderBus';
import { MinaMascot, type MinaPose } from '../src/ui/mascot/Mina';
import { BackCircle, SegmentProgress } from '../src/ui/mina/choices';
import { DayBadge, InfoToggle, InlineError, InfoNote, ListCard, ListRow, MascotStage } from '../src/ui/mina/kit';
import { RecipeImage } from '../src/ui/RecipeImage';
import { Button } from '../src/ui/Button';
import { Text } from '../src/ui/Text';
import { t } from '../src/i18n/it';

/*
 * Questionario (telefoni 3 e 4 del riferimento) e anteprima del piano (telefono 5).
 * Le domande e la logica sono quelle di prima (16 passi, salvataggio a ogni modifica, validazioni):
 * cambiano la presentazione e la quantità di testo. La barra in alto ha un segmento per fase.
 * Alla fine: caricamento con Mina Chef (piano generato dal motore vero), anteprima, poi l'abbonamento.
 */

/** Fasi della barra di avanzamento: gruppi di passi (id) e, per ultima, l'anteprima. */
const PHASES: string[][] = [
  ['persone', 'pasti', 'dieta'],
  ['esclusioni', 'non-graditi', 'porzioni', 'quantita', 'gusti'],
  ['tempo', 'orari', 'frequenza', 'giorni-spesa', 'budget'],
  ['strumenti', 'dispensa', 'notifiche'],
];
const BAR_SEGMENTS = PHASES.length + 1;

function progressOf(stepId: string): { phase: number; within: number } {
  const phase = Math.max(0, PHASES.findIndex((p) => p.includes(stepId)));
  const ids = PHASES[phase];
  return { phase, within: (ids.indexOf(stepId) + 1) / ids.length };
}

/** Mina compare solo in alcuni passi (momenti scelti), grande e senza fumetto. */
const STEP_MINA: Record<string, MinaPose> = {
  persone: 'shopping',
  pasti: 'happy',
  'giorni-spesa': 'shopping',
  budget: 'savings',
  notifiche: 'reminder',
};

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
  // direzione del passaggio: avanti il passo nuovo entra da destra, indietro da sinistra
  const [dir, setDir] = useState<'left' | 'right'>('right');
  const go = (next: number) => {
    setError(null);
    setDir(next >= step ? 'right' : 'left');
    setStep(Math.max(0, Math.min(PREVIEW_STEP, next)));
  };
  const back = () => {
    if (step > 0) go(step - 1);
    else if (router.canGoBack()) router.back();
    else router.replace('/benvenuto');
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
    if (step + 1 >= PREVIEW_STEP) {
      // la settimana viene composta mentre Mina Chef mescola e gli ingredienti le girano intorno
      await withLoader(LOADER_TEXT.firstWeek, async () => go(step + 1));
      return;
    }
    go(step + 1);
  };

  // conferma: salva profilo, dispensa, promemoria e il piano (stesso motore e stesso seme dell'anteprima),
  // poi la schermata dell'abbonamento (che con gli acquisti spenti lascia entrare)
  const finish = async () => {
    setBusy(true);
    const ok = await run(async (s, today) => {
      await s.completeOnboarding(draft.profile, pantryItems(draft), draft.notifications, today, minutesNow());
      await s.updateNotificationSettings(draft.notifications, true);
      return true;
    });
    setBusy(false);
    if (ok) router.replace('/abbonamento?da=questionario');
  };

  if (step >= PREVIEW_STEP) {
    return <Preview draft={draft} busy={busy} onBack={() => go(STEPS.length - 1)} onConfirm={finish} />;
  }

  const reaction = def.react?.(draft) ?? null;
  const pose = reaction?.pose ?? STEP_MINA[def.id];
  const { phase, within } = progressOf(def.id);
  const last = step === STEPS.length - 1;
  const label = last ? 'Continua' : def.optional && isEmptyOptional(def.id, draft) ? t('action.skip') : t('action.next');
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={styles.bar}>
          <SegmentProgress phases={BAR_SEGMENTS} phase={phase} within={within} label={`Domanda ${step + 1} di ${STEPS.length}`} />
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, styles.grow]} keyboardShouldPersistTaps="handled">
        {/* il passo nuovo scivola dentro dalla direzione del movimento; la barra resta ferma. Domanda e risposte in
            alto, Mina in basso sul suo «palco» salvia: la pagina è composta su tutta l'altezza, senza un vuoto sotto */}
        <Reveal key={step} from={dir} style={[styles.stepBody, styles.fill]}>
          <View style={styles.stepTop}>
          <Text variant="screen" center accessibilityRole="header" style={styles.question}>
            {def.title}
          </Text>
          {def.subtitle ? (
            <Text variant="body" color={colors.inkSoft} center>
              {def.subtitle}
            </Text>
          ) : null}
          {def.tip && !reaction ? (
            <View style={styles.center}>
              <InfoToggle text={def.tip} />
            </View>
          ) : null}
          <def.Component draft={draft} setDraft={setDraft} />
          {error ? <InlineError text={error} /> : null}
          </View>
          {pose ? (
            <View style={styles.mina}>
              {reaction ? (
                <Text variant="small" color={colors.inkSoft} center style={styles.reaction}>
                  {reaction.tip}
                </Text>
              ) : null}
              <MascotStage width={230} height={56}>
                <MinaMascot pose={pose} size={180} animated idle interactive replayKey={reaction ? reaction.tip : def.id} />
              </MascotStage>
            </View>
          ) : null}
        </Reveal>
      </ScrollView>
      <View style={styles.footer}>
        <BackCircle onPress={back} label={step > 0 ? 'Domanda precedente' : 'Torna al benvenuto'} />
        <Button label={label} iconRight="arrow-forward" size="large" onPress={next} loading={busy} style={styles.mainBtn} />
      </View>
    </SafeAreaView>
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

/** Quanti giorni mostrare subito nell'anteprima (gli altri a richiesta). */
const PREVIEW_DAYS = 3;

/** Anteprima reale (telefono 5): lo stesso motore e lo stesso seme usati alla conferma. */
function Preview({ draft, busy, onBack, onConfirm }: { draft: OnboardingDraft; busy: boolean; onBack: () => void; onConfirm: () => void }) {
  const today = toIsoLocal(new Date());
  const [all, setAll] = useState(false);
  const result = useMemo(() => {
    try {
      const profile = parseProfile(draft.profile);
      const pantry = new Map(Object.entries(draft.pantry).filter(([, v]) => v !== null).map(([k, v]) => [k, toMilli(v as number)]));
      return generatePlan({ profile, catalog: catalogIndex, startDate: today, days: PLAN_DAYS, pantry, history: [], favorites: new Set(), seed: hashString(`spesora|${today}`), skipFirstDayBefore: minutesNow() });
    } catch {
      return null;
    }
  }, [draft, today]);
  const days = result ? rangeDays(today, PLAN_DAYS).filter((d) => result.meals.some((m) => m.date === d)) : [];
  const shown = all ? days : days.slice(0, PREVIEW_DAYS);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={styles.bar}>
          <SegmentProgress phases={BAR_SEGMENTS} phase={BAR_SEGMENTS - 1} within={0.5} label="Questionario completato: anteprima del piano" />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stepBody}>
          <View>
            <Text variant="screen" center accessibilityRole="header" style={styles.question}>
              La tua settimana
            </Text>
            <Text variant="body" color={colors.inkSoft} center>
              Ecco un’anteprima del tuo piano.
            </Text>
          </View>
          {!result ? <InlineError text="Alcune risposte non sono valide: torna indietro per controllarle." /> : null}
          {result && result.issues.length > 0 ? <InfoNote tone="warning" text={`${result.issues.length} pasti senza ricetta: ${result.issues[0].message}`} /> : null}
          <View style={styles.days}>
            {shown.map((date, i) => {
              const meals = result!.meals.filter((m) => m.date === date);
              const main = meals.find((m) => m.mealType === 'cena') ?? meals.find((m) => m.mealType === 'pranzo') ?? meals[0];
              const recipe = catalogIndex.recipe(main.recipeId);
              const others = meals.filter((m) => m !== main);
              return (
                <Reveal key={date} index={i} style={styles.dayRow}>
                  <DayBadge weekday={capitalizeShort(weekdayShort(weekdayOf(date)))} day={String(Number(date.slice(8)))} size={62} />
                  <ListCard style={styles.flex}>
                    <ListRow
                      left={recipe ? <RecipeImage variant="thumb" recipe={recipe} rounded={radius.md} aspectRatio={1} style={styles.thumb} /> : undefined}
                      title={recipe?.name ?? ''}
                      subtitle={others.length > 0 ? `${MEAL_LABELS[main.mealType]} · +${others.length} ${others.length === 1 ? 'pasto' : 'pasti'}` : MEAL_LABELS[main.mealType]}
                      onPress={recipe ? () => router.push(`/ricetta/${recipe.id}`) : undefined}
                      accessibilityLabel={`${date}: ${meals.map((m) => `${MEAL_LABELS[m.mealType]} ${catalogIndex.recipe(m.recipeId)?.name ?? ''}`).join(', ')}`}
                    />
                  </ListCard>
                </Reveal>
              );
            })}
          </View>
          {days.length > PREVIEW_DAYS ? (
            <Button kind="ghost" compact label={all ? 'Mostra meno' : `Vedi tutti i ${days.length} giorni`} icon={all ? 'chevron-up' : 'chevron-down'} onPress={() => setAll((a) => !a)} />
          ) : null}
          <MascotStage width={220} height={54} style={styles.mina}>
            <MinaMascot pose="success" size={150} animated idle interactive accessibilityLabel="Mina festeggia: la tua settimana è pronta" />
          </MascotStage>
          <Text variant="small" color={colors.inkSoft} center>
            {`Dal ${shortDate(today)} al ${shortDate(addDays(today, PLAN_DAYS - 1))}. Potrai cambiare ogni pasto quando vuoi.`}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <BackCircle onPress={onBack} label="Modifica le risposte" />
        <Button label="Procedi" iconRight="arrow-forward" size="large" onPress={onConfirm} loading={busy} disabled={!result || result.meals.length === 0} style={styles.mainBtn} />
      </View>
    </SafeAreaView>
  );
}

const capitalizeShort = (s: string) => s.charAt(0).toUpperCase() + s.slice(1, 3);
const shortDate = (d: string) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.desk },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  top: { paddingTop: space.md, paddingBottom: space.sm, alignItems: 'center' },
  bar: { width: '62%', maxWidth: 260 },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  stepBody: { gap: space.lg },
  grow: { flexGrow: 1 },
  fill: { flexGrow: 1, justifyContent: 'space-between' },
  stepTop: { gap: space.xl },
  question: { fontSize: 30, lineHeight: 36, marginTop: space.sm },
  mina: { alignItems: 'center', marginTop: space.lg, gap: space.sm, paddingBottom: space.sm },
  reaction: { maxWidth: 300 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  mainBtn: { flex: 1, maxWidth: 260 },
  days: { gap: space.md },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 56, height: 56 },
});
