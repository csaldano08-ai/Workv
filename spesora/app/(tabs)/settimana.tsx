import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/ui/dialog';
import { diffDays, formatLongDate, minutesToHHMM, rangeDays, weekdayOf, weekdayShort } from '../../src/core/domain/dates';
import type { PlannedMeal } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { t } from '../../src/i18n/it';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

export default function Week() {
  const { snapshot, run } = useApp();
  const actions = useMealActions();
  if (!snapshot?.profile || !snapshot.plan) return <Screen>{null}</Screen>;
  const snap = snapshot;
  const plan = snapshot.plan;
  const days = rangeDays(plan.startDate, diffDays(plan.startDate, plan.endDate) + 1);
  const tripDates = new Set(snap.shopping.trips.map((tr) => tr.date));
  const toCook = snap.meals.filter((m) => m.status === 'planned').length;
  const tripCount = tripDates.size;

  const regenerate = () =>
    Alert.alert(
      'Rigenerare il menù?',
      'Verranno proposte nuove ricette per i pasti futuri non ancora cucinati. Pasti completati, scelte manuali, acquisti e dispensa restano invariati.',
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: 'Rigenera', onPress: () => void run((s, today) => s.regenerate(today)) },
      ],
    );

  return (
    <Screen>
      <View style={styles.header}>
        <MinaMascot pose="calendar" size={104} animated />
        <View style={styles.flex}>
          <Text variant="title" accessibilityRole="header">
            La tua settimana
          </Text>
          <Text variant="small" color={colors.inkSoft}>
            {`${toCook} ${toCook === 1 ? 'pasto da cucinare' : 'pasti da cucinare'} · ${tripCount} ${tripCount === 1 ? 'spesa' : 'spese'}`}
          </Text>
        </View>
      </View>
      <Text variant="small" color={colors.inkSoft}>
        {`Dal ${formatLongDate(plan.startDate)} al ${formatLongDate(plan.endDate)}. Tocca un pasto per la ricetta, tieni premuto per le altre azioni.`}
      </Text>
      {snap.issues.length > 0 ? <Notice tone="warning" title={`${snap.issues.length} pasti senza ricetta`} text={snap.issues[0].message} /> : null}

      {days.map((date) => {
        const isToday = date === snap.today;
        const isPast = date < snap.today;
        const meals = snap.meals.filter((m) => m.date === date);
        const shopping = tripDates.has(date);
        return (
          <View key={date} style={[styles.day, shopping && styles.dayShopping, isToday && styles.dayToday, isPast && styles.dayPast]}>
            <View style={[styles.dateTab, isToday && { backgroundColor: colors.green }]}>
              <Text variant="caption" color={isToday ? colors.white : colors.inkSoft}>
                {weekdayShort(weekdayOf(date)).toUpperCase()}
              </Text>
              <Text variant="title" color={isToday ? colors.white : colors.ink}>
                {String(Number(date.slice(8)))}
              </Text>
            </View>
            <View style={styles.dayBody}>
              {isToday || shopping ? (
                <View style={styles.badges}>
                  {isToday ? <Badge text="Oggi" bg={colors.greenSoft} fg={colors.greenDark} /> : null}
                  {shopping ? <Badge text="Giorno di spesa" bg={colors.peachSoft} fg={colors.peachInk} icon="basket-outline" onPress={() => router.push(`/spesa?trip=${date}`)} /> : null}
                </View>
              ) : null}
              {meals.length === 0 ? (
                <Text variant="small" color={colors.inkSoft}>
                  Nessun pasto programmato
                </Text>
              ) : (
                meals.map((m) => <MealLine key={m.id} meal={m} onMenu={() => actions.openMenu(m)} />)
              )}
            </View>
          </View>
        );
      })}
      <Button kind="secondary" icon="refresh-outline" label={t('action.regenerate')} onPress={regenerate} />
      <Button kind="ghost" icon="wallet-outline" label="Rendi questa settimana più economica" onPress={() => router.push('/economica')} />
      {actions.sheet}
    </Screen>
  );
}

function MealLine({ meal, onMenu }: { meal: PlannedMeal; onMenu: () => void }) {
  const recipe = catalogIndex.recipe(meal.recipeId);
  const done = meal.status !== 'planned';
  const statusIcon = meal.status === 'cooked' ? 'checkmark-circle' : meal.status === 'planned' ? null : 'remove-circle-outline';
  return (
    <View style={styles.mealRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${MEAL_LABELS[meal.mealType]}: ${recipe?.name ?? ''}${done ? ', completato' : ''}`}
        accessibilityHint="Apre la ricetta. Tieni premuto per altre azioni."
        onPress={() => router.push(`/ricetta/${meal.recipeId}?mealId=${encodeURIComponent(meal.id)}`)}
        onLongPress={done ? undefined : onMenu}
        style={({ pressed }) => [styles.mealMain, pressed && { opacity: 0.7 }]}
      >
        {recipe ? <RecipeImage variant="thumb" recipe={recipe} style={styles.thumb} rounded={8} /> : null}
        <View style={styles.mealText}>
        <Text variant="caption" color={colors.inkSoft}>
          {`${MEAL_LABELS[meal.mealType].toUpperCase()} · ${minutesToHHMM(meal.timeMinutes)}${recipe ? ` · ${recipe.totalMinutes} MIN` : ''}`}
        </Text>
        <View style={styles.nameRow}>
          {statusIcon ? <Ionicons name={statusIcon} size={16} color={meal.status === 'cooked' ? colors.green : colors.inkSoft} /> : null}
          <Text variant="body" color={done ? colors.inkSoft : colors.ink} style={[styles.flex, done && styles.strike]}>
            {recipe?.name ?? 'Ricetta non trovata'}
          </Text>
        </View>
        </View>
      </Pressable>
      {!done ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Azioni per ${recipe?.name ?? 'pasto'}`} onPress={onMenu} style={styles.more} hitSlop={4}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.green} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Badge({ text, bg, fg, icon, onPress }: { text: string; bg: string; fg: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  const inner = (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
      <Text variant="caption" color={fg}>
        {text}
      </Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${text}: apri la lista`} onPress={onPress} hitSlop={8}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  day: { flexDirection: 'row', gap: space.md, backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.md },
  dayToday: { borderColor: colors.green, borderWidth: 2 },
  dayPast: { opacity: 0.75 },
  dateTab: { width: 54, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.ivory, alignSelf: 'flex-start' },
  dayBody: { flex: 1, gap: space.sm },
  badges: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  mealMain: { flex: 1, minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mealText: { flex: 1, gap: 2 },
  thumb: { width: 52, aspectRatio: 4 / 3 },
  dayShopping: { borderLeftWidth: 5, borderLeftColor: colors.peach },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  more: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
});
