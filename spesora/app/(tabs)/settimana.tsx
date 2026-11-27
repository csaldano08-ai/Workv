import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/ui/dialog';
import { diffDays, formatLongDate, minutesToHHMM, rangeDays, weekdayOf, weekdayShort, capitalize } from '../../src/core/domain/dates';
import type { IsoDate, PlannedMeal } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import type { AppSnapshot } from '../../src/features/app/SpesoraService';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { t } from '../../src/i18n/it';
import { colors, mealInk, mealTone, radius, shadow, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { HandLabel, NotebookPage, PaperTabs, StickyNote, TapedPhoto } from '../../src/ui/notebook';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Notice } from '../../src/ui/Notice';
import { Reveal } from '../../src/ui/Reveal';
import { Squish } from '../../src/ui/Squish';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

type View_ = 'giorno' | 'settimana';

export default function Week() {
  const { snapshot, run } = useApp();
  const actions = useMealActions();
  const [view, setView] = useState<View_>('giorno');
  const [picked, setPicked] = useState<IsoDate | null>(null);
  // direzione del cambio di giorno: un giorno dopo entra da destra, uno prima da sinistra
  const [dir, setDir] = useState<'left' | 'right'>('right');
  if (!snapshot?.profile || !snapshot.plan) return <Screen>{null}</Screen>;
  const snap = snapshot;
  const plan = snapshot.plan;
  const days = rangeDays(plan.startDate, diffDays(plan.startDate, plan.endDate) + 1);
  const selected = picked && days.includes(picked) ? picked : days.includes(snap.today) ? snap.today : days[0];
  const tripDates = new Set(snap.shopping.trips.filter((tr) => tr.lines.length > 0).map((tr) => tr.date));
  const pick = (d: IsoDate) => {
    setDir(d >= selected ? 'right' : 'left');
    setPicked(d);
  };

  const regenerate = () =>
    Alert.alert(
      'Rigenerare il menù?',
      'Verranno proposte nuove ricette per i pasti futuri non ancora cucinati. Pasti completati, scelte manuali, acquisti e dispensa restano invariati.',
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: 'Rigenera', onPress: () => void withLoader(LOADER_TEXT.regenerate, () => run((s, today) => s.regenerate(today))) },
      ],
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          La tua settimana
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('action.regenerate')} onPress={regenerate} style={styles.iconBtn} hitSlop={6}>
          <Ionicons name="refresh-outline" size={24} color={colors.green} />
        </Pressable>
      </View>
      <PaperTabs
        tabs={[
          { key: 'giorno', label: 'Giorno' },
          { key: 'settimana', label: 'Settimana' },
        ]}
        value={view}
        onChange={setView}
      />
      {snap.issues.length > 0 ? <Notice tone="warning" title={`${snap.issues.length} pasti senza ricetta`} text={snap.issues[0].message} /> : null}

      {/* Giorno ⇄ Settimana: la vista nuova scivola dal lato della linguetta scelta */}
      <Reveal key={view} from={view === 'giorno' ? 'left' : 'right'} style={styles.viewBody}>
        {view === 'giorno' ? (
          <DayView snap={snap} days={days} selected={selected} onSelect={pick} from={dir} tripDates={tripDates} onMenu={actions.openMenu} />
        ) : (
          <WeekGrid
            snap={snap}
            days={days}
            tripDates={tripDates}
            onOpenDay={(d) => {
              pick(d);
              setView('giorno');
            }}
          />
        )}
      </Reveal>

      <Button kind="ghost" icon="wallet-outline" label="Rendi questa settimana più economica" onPress={() => router.push('/economica')} />
      {actions.sheet}
    </Screen>
  );
}

/** Vista "Giorno": linguette dei giorni, riassunto di Mina, schede dei pasti. */
function DayView({ snap, days, selected, onSelect, from, tripDates, onMenu }: { snap: AppSnapshot; days: IsoDate[]; selected: IsoDate; onSelect: (d: IsoDate) => void; from: 'left' | 'right'; tripDates: Set<string>; onMenu: (m: PlannedMeal) => void }) {
  const meals = snap.meals.filter((m) => m.date === selected);
  const toCook = meals.filter((m) => m.status === 'planned');
  const shopping = tripDates.has(selected);
  const last = toCook[toCook.length - 1];
  const dayName = capitalize(formatLongDate(selected).split(' ')[0]);
  const summary =
    meals.length === 0
      ? 'Niente in programma'
      : toCook.length === 0
        ? 'Giornata completata'
        : `${dayName}: ${toCook.length} ${toCook.length === 1 ? 'pasto' : 'pasti'}${shopping ? ' e la spesa' : ''}`;
  return (
    <>
      <View style={styles.dayTabs} accessibilityRole="tablist">
        {days.map((d) => {
          const on = d === selected;
          return (
            <Squish
              key={d}
              outerStyle={styles.flex}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${formatLongDate(d)}${d === snap.today ? ', oggi' : ''}${tripDates.has(d) ? ', giorno di spesa' : ''}`}
              onPress={() => onSelect(d)}
              style={[styles.dtab, on && styles.dtabOn, d === snap.today && !on && styles.dtabToday]}
            >
              <Text variant="caption" color={on ? colors.greenSoft : colors.inkSoft}>
                {weekdayShort(weekdayOf(d))}
              </Text>
              <Text variant="heading" color={on ? colors.white : colors.ink} style={styles.dnum}>
                {String(Number(d.slice(8)))}
              </Text>
              {tripDates.has(d) ? (
                <View style={styles.shopDot}>
                  <Ionicons name="basket" size={10} color={colors.ink} />
                </View>
              ) : null}
            </Squish>
          );
        })}
      </View>

      <View style={styles.scene}>
        <MinaMascot pose={toCook.length === 0 && meals.length > 0 ? 'success' : 'calendar'} size={92} style={styles.sceneMina} />
        <Reveal key={selected} from={from} style={styles.flex}>
          <StickyNote>
            <Text variant="hand">{summary}</Text>
            {last ? (
              <Text variant="small" color={colors.inkSoft}>
                {`Ultimo pasto alle ${minutesToHHMM(last.timeMinutes)}`}
              </Text>
            ) : null}
            {shopping ? <Button kind="peach" compact icon="basket-outline" label="Lista della spesa" onPress={() => router.push(`/spesa?trip=${selected}`)} style={styles.noteBtn} /> : null}
          </StickyNote>
        </Reveal>
      </View>

      {meals.length === 0 ? (
        <Text variant="small" color={colors.inkSoft}>
          Nessun pasto programmato per questo giorno.
        </Text>
      ) : (
        <View style={styles.cards}>
          {meals.map((m, i) => (
            <Reveal key={`${selected}-${m.id}`} index={i} from={from}>
              <MealCard meal={m} onMenu={() => onMenu(m)} />
            </Reveal>
          ))}
        </View>
      )}
    </>
  );
}

function MealCard({ meal, onMenu }: { meal: PlannedMeal; onMenu: () => void }) {
  const recipe = catalogIndex.recipe(meal.recipeId);
  const done = meal.status !== 'planned';
  const statusText = meal.status === 'cooked' ? 'cucinato' : meal.status === 'planned' ? null : 'non cucinato';
  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={[styles.mealBar, { backgroundColor: done ? colors.lineStrong : mealInk[meal.mealType] }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${MEAL_LABELS[meal.mealType]} alle ${minutesToHHMM(meal.timeMinutes)}: ${recipe?.name ?? ''}${statusText ? `, ${statusText}` : ''}`}
        accessibilityHint="Apre la ricetta. Tieni premuto per altre azioni."
        onPress={() => router.push(`/ricetta/${meal.recipeId}?mealId=${encodeURIComponent(meal.id)}`)}
        onLongPress={done ? undefined : onMenu}
        style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.75 }]}
      >
        {recipe ? (
          <TapedPhoto>
            <RecipeImage variant="thumb" recipe={recipe} rounded={0} aspectRatio={1} style={styles.thumb} />
          </TapedPhoto>
        ) : null}
        <View style={styles.cardText}>
          <HandLabel text={`${MEAL_LABELS[meal.mealType]} · ${minutesToHHMM(meal.timeMinutes)}`} bg={mealTone[meal.mealType]} color={mealInk[meal.mealType]} />
          <Text variant="heading" color={done ? colors.inkSoft : colors.ink} style={done && styles.strike}>
            {recipe?.name ?? 'Ricetta non trovata'}
          </Text>
          <Text variant="caption" color={colors.inkSoft}>
            {statusText ? statusText.toUpperCase() : recipe ? `${recipe.totalMinutes} MIN` : ''}
          </Text>
        </View>
      </Pressable>
      {!done ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Azioni per ${recipe?.name ?? 'pasto'}`} onPress={onMenu} style={styles.more} hitSlop={4}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.green} />
        </Pressable>
      ) : (
        <Ionicons name={meal.status === 'cooked' ? 'checkmark-circle' : 'remove-circle-outline'} size={22} color={meal.status === 'cooked' ? colors.green : colors.inkSoft} style={styles.doneIcon} />
      )}
    </View>
  );
}

/** Vista "Settimana": l'agenda con 7 giorni × pasti in miniatura. Toccando un giorno si apre la vista Giorno. */
function WeekGrid({ snap, days, tripDates, onOpenDay }: { snap: AppSnapshot; days: IsoDate[]; tripDates: Set<string>; onOpenDay: (d: IsoDate) => void }) {
  return (
    <NotebookPage rings={6} contentStyle={styles.gridPage}>
      <Text variant="hand" center>
        {`${Number(days[0].slice(8))} – ${formatLongDate(days[days.length - 1]).split(' ').slice(1).join(' ')}`}
      </Text>
      {days.map((d) => {
        const meals = snap.meals.filter((m) => m.date === d);
        const isToday = d === snap.today;
        return (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${formatLongDate(d)}: ${meals.map((m) => catalogIndex.recipe(m.recipeId)?.name).join(', ')}${tripDates.has(d) ? '. Giorno di spesa' : ''}`}
            onPress={() => onOpenDay(d)}
            style={({ pressed }) => [styles.gridRow, isToday && styles.gridToday, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.gridDay}>
              <Text variant="caption" color={colors.inkSoft}>
                {weekdayShort(weekdayOf(d))}
              </Text>
              <Text variant="heading">{String(Number(d.slice(8)))}</Text>
            </View>
            <View style={styles.gridThumbs}>
              {meals.map((m) => {
                const r = catalogIndex.recipe(m.recipeId);
                return (
                  <View key={m.id} style={[styles.gridThumb, m.status !== 'planned' && { opacity: 0.5 }]}>
                    {r ? <RecipeImage variant="thumb" recipe={r} rounded={0} aspectRatio={1} /> : null}
                    <View style={[styles.gridDot, { backgroundColor: mealInk[m.mealType] }]} />
                  </View>
                );
              })}
            </View>
            {tripDates.has(d) ? <HandLabel text="spesa" bg={colors.peachSoft} /> : null}
          </Pressable>
        );
      })}
      <View style={styles.legend}>
        {(['colazione', 'pranzo', 'cena'] as const).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: mealInk[k] }]} />
            <Text variant="caption" color={colors.inkSoft}>
              {MEAL_LABELS[k]}
            </Text>
          </View>
        ))}
      </View>
    </NotebookPage>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  viewBody: { gap: space.lg },
  flex: { flex: 1 },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  dayTabs: { flexDirection: 'row', gap: 5, marginTop: space.sm },
  dtab: { flex: 1, minHeight: 60, borderRadius: radius.md, backgroundColor: colors.greenMist, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  dtabOn: { backgroundColor: colors.green, ...shadow.card },
  dtabToday: { borderColor: colors.green, backgroundColor: colors.white },
  dnum: { fontWeight: '800', fontSize: 18 },
  shopDot: { position: 'absolute', top: -8, right: -5, width: 19, height: 19, borderRadius: 10, backgroundColor: colors.peach, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  scene: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  sceneMina: { marginLeft: -space.sm },
  noteBtn: { alignSelf: 'flex-start', marginTop: space.sm },
  cards: { gap: space.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingLeft: space.md, paddingVertical: space.md, gap: space.xs, overflow: 'hidden', ...shadow.card },
  cardDone: { backgroundColor: colors.greenMist, shadowOpacity: 0, elevation: 0 },
  mealBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH },
  thumb: { width: 64 },
  cardText: { flex: 1, gap: 4 },
  more: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  doneIcon: { marginRight: space.md },
  strike: { textDecorationLine: 'line-through' },
  gridPage: { paddingHorizontal: 0, paddingBottom: space.sm, gap: 0 },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.line, minHeight: TOUCH + 12 },
  gridToday: { backgroundColor: colors.greenSoft },
  gridDay: { width: 36, alignItems: 'center' },
  gridThumbs: { flex: 1, flexDirection: 'row', gap: 6 },
  gridThumb: { width: 46, height: 46, borderRadius: 12, overflow: 'hidden' },
  gridDot: { position: 'absolute', left: 3, top: 3, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.white },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: space.lg, paddingTop: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
});
