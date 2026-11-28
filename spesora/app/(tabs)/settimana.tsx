import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alert } from '../../src/ui/dialog';
import { diffDays, formatLongDate, minutesToHHMM, rangeDays, weekdayOf, weekdayShort, capitalize } from '../../src/core/domain/dates';
import { useActionSheet } from '../../src/ui/ActionSheet';
import type { PlannedMeal } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { useT } from '../../src/i18n';
import { recipeName } from '../../src/i18n/content';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors, radius, space } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { emitMina } from '../../src/ui/mascot/director';
import { useMinaScope } from '../../src/ui/mascot/useMinaScope';
import { AppHeader, DayBadge, InfoNote, ListCard, ListRow, ScreenTitle } from '../../src/ui/mina/kit';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Reveal } from '../../src/ui/Reveal';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';


const EMPTY_MEALS: PlannedMeal[] = [];

/** Pasti programmati: ricetta, giorno e ora di ognuno (per capire quando un pasto viene aggiunto, cambiato o spostato). */
function plannedMap(meals: PlannedMeal[]): Map<string, string> {
  return new Map(meals.filter((m) => m.status === 'planned').map((m) => [m.id, `${m.recipeId}|${m.date}|${m.timeMinutes}`]));
}

/**
 * Quando un pasto viene programmato (aggiunto, cambiato o spostato: dalle finestre Cambia, Sposta, Ripeti o con la
 * rigenerazione) Mina fa il gesto della soddisfazione. Cucinare o saltare un pasto non conta. Il gesto parte solo
 * con la pagina in primo piano, cioè appena si chiude la finestra da cui è arrivata la modifica.
 */
function useMealPlannedReaction(meals: PlannedMeal[]) {
  const prev = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    const now = plannedMap(meals);
    const before = prev.current;
    prev.current = now;
    if (!before) return;
    const changed = [...now].filter(([id, v]) => before.get(id) !== v).map(([id]) => id);
    if (changed.length > 0) emitMina({ scope: 'week', kind: 'mealPlanned', key: changed.sort().join(',') });
  }, [meals]);
}

export default function Week() {
  const { t } = useT();
  const { snapshot, run } = useApp();
  const actions = useMealActions();
  const sheet = useActionSheet();
  const reaction = useMinaScope('week');
  useMealPlannedReaction(snapshot?.meals ?? EMPTY_MEALS);
  if (!snapshot?.profile || !snapshot.plan) return <Screen>{null}</Screen>;
  const snap = snapshot;
  const plan = snapshot.plan;
  const days = rangeDays(plan.startDate, diffDays(plan.startDate, plan.endDate) + 1);
  const trips = new Map(snap.shopping.trips.filter((tr) => tr.lines.length > 0).map((tr) => [tr.date, tr]));
  const allDone = snap.meals.length > 0 && snap.meals.every((m) => m.status !== 'planned');

  const regenerate = () =>
    Alert.alert(
      t('week:regenerate.title'),
      t('week:regenerate.text'),
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: t('week:regenerate.confirm'), onPress: () => void withLoader(LOADER_TEXT.regenerate, () => run((s, today) => s.regenerate(today))) },
      ],
    );
  // «Modifica piano» raccoglie le azioni che prima erano sparse nella pagina (nessuna funzione nuova)
  const editPlan = () =>
    sheet.open(t('week:edit.button'), [
      { label: t('action.regenerate'), onPress: regenerate },
      { label: t('week:edit.cheaper'), onPress: () => router.push('/economica') },
      { label: t('week:edit.preferences'), onPress: () => router.push('/impostazioni') },
      { label: t('week:edit.history'), onPress: () => router.push('/storico') },
    ], t('week:edit.hint'));

  const first = days[0];
  const last = days[days.length - 1];
  const range = `${Number(first.slice(8))} – ${formatLongDate(last).split(' ').slice(1).join(' ')}`;
  return (
    <Screen>
      <AppHeader />
      <ScreenTitle
        title={t('week:title')}
        right={
          <MinaMascot
            pose={reaction?.kind === 'mealPlanned' ? 'satisfied' : allDone ? 'success' : 'calendar'}
            replayKey={reaction?.id}
            size={72}
            animated
            interactive
            style={styles.mina}
          />
        }
      />
      <View style={styles.range} accessible accessibilityLabel={t('week:range.a11y', { start: formatLongDate(first), end: formatLongDate(last) })}>
        <Ionicons name="calendar-outline" size={20} color={colors.greenDark} />
        <Text variant="heading" color={colors.ink} style={styles.rangeText}>
          {capitalize(range)}
        </Text>
      </View>
      {snap.issues.length > 0 ? <InfoNote tone="warning" text={t('week:issues', { count: snap.issues.length, message: snap.issues[0].message })} /> : null}

      <View style={styles.days}>
        {days.map((d, i) => {
          const meals = snap.meals.filter((m) => m.date === d);
          const isToday = d === snap.today;
          const past = d < snap.today;
          const trip = trips.get(d);
          return (
            <Reveal key={d} index={i} style={[styles.dayRow, past && styles.past]}>
              <DayBadge
                weekday={capitalize(weekdayShort(weekdayOf(d)))}
                day={String(Number(d.slice(8)))}
                active={isToday}
                size={64}
                dot={
                  trip ? (
                    <View style={styles.shopDot}>
                      <Ionicons name="basket" size={11} color={colors.ink} />
                    </View>
                  ) : undefined
                }
              />
              <ListCard style={styles.flex}>
                {meals.length === 0 ? (
                  <ListRow title={t('week:day.empty')} subtitle={t('week:day.free')} />
                ) : (
                  meals.map((m) => <MealRow key={m.id} meal={m} onMenu={() => actions.openMenu(m)} />)
                )}
                {trip ? (
                  <ListRow
                    key="spesa"
                    left={
                      <View style={styles.shopIcon}>
                        <Ionicons name="basket-outline" size={20} color={colors.peachInk} />
                      </View>
                    }
                    title={trip.isInitial ? t('week:trip.initial') : t('week:trip.day')}
                    subtitle={t('week:trip.products', { count: trip.lines.length })}
                    onPress={() => router.push(`/spesa?trip=${trip.date}`)}
                    accessibilityLabel={t('week:trip.a11y', { date: formatLongDate(d), count: trip.lines.length })}
                  />
                ) : null}
              </ListCard>
            </Reveal>
          );
        })}
      </View>

      <Button label={t('week:edit.button')} size="large" onPress={editPlan} />
      {actions.sheet}
      {sheet.element}
    </Screen>
  );
}

/** Un pasto del giorno: foto, nome, pasto e ora (o stato); tocco = ricetta, pressione lunga = altre azioni. */
function MealRow({ meal, onMenu }: { meal: PlannedMeal; onMenu: () => void }) {
  const { t } = useT();
  const recipe = catalogIndex.recipe(meal.recipeId);
  const name = recipe ? recipeName(recipe) : null;
  const done = meal.status !== 'planned';
  const statusText = meal.status === 'cooked' ? t('week:meal.cooked') : meal.status === 'planned' ? null : t('week:meal.notCooked');
  const a11yVars = { meal: MEAL_LABELS[meal.mealType], time: minutesToHHMM(meal.timeMinutes), recipe: name ?? '' };
  return (
    <ListRow
      left={
        recipe ? (
          <View>
            <RecipeImage variant="thumb" recipe={recipe} rounded={radius.md} aspectRatio={1} style={styles.thumb} />
            {done ? (
              <View style={styles.doneMark}>
                <Ionicons name={meal.status === 'cooked' ? 'checkmark' : 'remove'} size={14} color={colors.white} />
              </View>
            ) : null}
          </View>
        ) : undefined
      }
      title={name ?? t('week:meal.notFound')}
      subtitle={`${MEAL_LABELS[meal.mealType]} · ${statusText ?? minutesToHHMM(meal.timeMinutes)}`}
      dim={done}
      onPress={() => router.push(`/ricetta/${meal.recipeId}?mealId=${encodeURIComponent(meal.id)}`)}
      onLongPress={done ? undefined : onMenu}
      accessibilityLabel={statusText ? t('week:meal.a11yStatus', { ...a11yVars, status: statusText }) : t('week:meal.a11y', a11yVars)}
      accessibilityHint={done ? t('week:meal.hintDone') : t('week:meal.hint')}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mina: { marginBottom: -space.xs },
  range: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.greenSoft },
  rangeText: { fontWeight: '800', fontSize: 18 },
  days: { gap: space.md },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  past: { opacity: 0.6 },
  thumb: { width: 64, height: 64 },
  doneMark: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  shopDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.desk },
  shopIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginRight: 10 },
});
