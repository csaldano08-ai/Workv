import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, capitalize, formatLongDate, formatShortDate, minutesToHHMM } from '../../src/core/domain/dates';
import { mealIngredientStatus, toStock } from '../../src/core/domain/pantry';
import type { PlannedMeal } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import type { AppSnapshot } from '../../src/features/app/SpesoraService';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { t } from '../../src/i18n/it';
import { cookSoon, EMPTY, greeting, missingIngredients, shoppingDay, tipOfTheDay } from '../../src/i18n/assistant';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { AssistantBubble } from '../../src/ui/AssistantBubble';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Notice } from '../../src/ui/Notice';
import { Divider, Row, SectionTitle } from '../../src/ui/Row';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Prossimo pasto da cucinare: oggi se ancora in tempo, altrimenti il primo dei giorni seguenti. */
function pickNextMeal(snap: AppSnapshot): PlannedMeal | null {
  const planned = snap.meals.filter((m) => m.status === 'planned' && m.date >= snap.today);
  const now = nowMinutes();
  return planned.find((m) => m.date > snap.today || m.timeMinutes + 60 >= now) ?? null;
}

export default function Today() {
  const { snapshot } = useApp();
  const actions = useMealActions();
  if (!snapshot?.profile) return <Screen>{null}</Screen>;
  const snap = snapshot;
  const next = pickNextMeal(snap);
  const todayMeals = snap.meals.filter((m) => m.date === snap.today);
  const pending = snap.meals.filter(
    (m) => m.status === 'planned' && (m.date < snap.today || (m.date === snap.today && m.timeMinutes + 60 < nowMinutes())) && m.id !== next?.id,
  );
  const todayTrip = snap.shopping.trips.find((tr) => tr.date === snap.today && tr.lines.length > 0);
  const nextTrip = snap.shopping.trips.find((tr) => tr.date > snap.today && !tr.isInitial);
  const issuesToday = snap.issues.filter((i) => i.date === snap.today);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="caption" color={colors.inkSoft}>
            OGGI
          </Text>
          <Text variant="title" accessibilityRole="header">
            {capitalize(formatLongDate(snap.today))}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Impostazioni" onPress={() => router.push('/impostazioni')} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={colors.green} />
        </Pressable>
      </View>

      <TimoMessage snap={snap} next={next} todayTripItems={todayTrip?.lines.length ?? 0} todayTripDate={todayTrip?.date ?? null} initial={!!todayTrip?.isInitial} />

      {next ? <NextMealCard meal={next} snap={snap} onMore={() => actions.openMenu(next)} /> : <NoMealCard snap={snap} />}

      {todayTrip ? null : nextTrip ? (
        <Text variant="small" color={colors.inkSoft}>
          {`Prossima spesa: ${formatLongDate(nextTrip.date)} · ${nextTrip.lines.length} prodotti`}
        </Text>
      ) : null}

      {issuesToday.length > 0 ? <Notice tone="warning" title="Alcuni pasti non hanno una ricetta" text={issuesToday[0].message} /> : null}

      {pending.length > 0 ? (
        <Card tone="green">
          <Text variant="heading">Com’è andata?</Text>
          <Text variant="small" color={colors.inkSoft}>
            Conferma i pasti passati: la dispensa si aggiorna solo per quelli cucinati.
          </Text>
          {pending.slice(0, 3).map((m) => (
            <View key={m.id} style={styles.pendingRow}>
              <Text variant="body" style={styles.flex}>
                {`${MEAL_LABELS[m.mealType]} ${m.date === snap.today ? 'di oggi' : formatShortDate(m.date)}: ${catalogIndex.recipe(m.recipeId)?.name ?? ''}`}
              </Text>
              <View style={styles.pendingActions}>
                <Button compact label="Cucinato" onPress={() => void actions.cooked(m)} />
                <Button compact kind="secondary" label="No" accessibilityHint="Segna come non cucinato" onPress={() => void actions.notFollowed(m, 'skipped')} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {todayMeals.length > 0 ? (
        <View>
          <SectionTitle>Il menù di oggi</SectionTitle>
          {todayMeals.map((m, i) => (
            <View key={m.id}>
              {i > 0 ? <Divider /> : null}
              <Row
                title={catalogIndex.recipe(m.recipeId)?.name ?? 'Ricetta non trovata'}
                subtitle={`${MEAL_LABELS[m.mealType]} · ${minutesToHHMM(m.timeMinutes)} · ${statusLabel(m)}`}
                onPress={() => router.push(`/ricetta/${m.recipeId}?mealId=${encodeURIComponent(m.id)}`)}
              />
            </View>
          ))}
        </View>
      ) : null}
      {actions.sheet}
    </Screen>
  );
}

/** Messaggio contestuale di Timo: spesa, cucina imminente, saluto o giornata conclusa. */
function TimoMessage({ snap, next, todayTripItems, todayTripDate, initial }: { snap: AppSnapshot; next: PlannedMeal | null; todayTripItems: number; todayTripDate: string | null; initial: boolean }) {
  const hour = new Date().getHours();
  const key = `${snap.today}-${hour < 12 ? 'm' : hour < 18 ? 'p' : 's'}`;
  if (todayTripDate) {
    const msg = shoppingDay(todayTripItems, key);
    return (
      <AssistantBubble pose="spesa" title={initial ? 'Serve una piccola spesa oggi' : msg.title} text={msg.body}>
        <Button kind="peach" compact label="Apri la lista" icon="basket-outline" onPress={() => router.push(`/spesa?trip=${todayTripDate}`)} style={styles.bubbleBtn} />
      </AssistantBubble>
    );
  }
  const recipe = next ? catalogIndex.recipe(next.recipeId) : null;
  if (next && recipe && next.date === snap.today) {
    const startsIn = next.timeMinutes - recipe.totalMinutes - nowMinutes();
    if (startsIn <= 90) return <AssistantBubble pose="cucinare" text={cookSoon(recipe.name, recipe.totalMinutes, key)} />;
  }
  if (!next) return <AssistantBubble pose={snap.issues.length > 0 ? 'vuoto' : 'completata'} text={snap.issues.length > 0 ? EMPTY.noRecipes : EMPTY.dayDone} />;
  return <AssistantBubble pose="saluto" text={`${greeting(hour, key)} ${tipOfTheDay(snap.today)}`} />;
}

function statusLabel(m: PlannedMeal): string {
  const map = { planned: 'status.planned', cooked: 'status.cooked', skipped: 'status.skipped', ate_out: 'status.ate_out', other: 'status.other' } as const;
  return t(map[m.status]);
}

function NextMealCard({ meal, snap, onMore }: { meal: PlannedMeal; snap: AppSnapshot; onMore: () => void }) {
  const recipe = catalogIndex.recipe(meal.recipeId);
  if (!recipe) return null;
  const statuses = mealIngredientStatus(meal, catalogIndex, toStock(snap.pantry), snap.staples, snap.profile?.portions);
  const quantified = statuses.filter((s) => s.status !== 'qb_presente' && s.status !== 'qb_mancante');
  const have = quantified.filter((s) => s.status === 'in_dispensa').length;
  const toBuy = quantified.filter((s) => s.status !== 'in_dispensa').length;
  const toCheck = statuses.filter((s) => s.status === 'qb_mancante').length;
  const missing = toBuy + toCheck;
  const when = meal.date === snap.today ? 'Oggi' : meal.date === addDays(snap.today, 1) ? 'Domani' : formatLongDate(meal.date);
  const startAt = minutesToHHMM(Math.max(0, meal.timeMinutes - recipe.totalMinutes));
  return (
    <Card style={styles.nextCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Apri la ricetta ${recipe.name}`}
        onPress={() => router.push(`/ricetta/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`)}
      >
        <RecipeImage recipe={recipe} />
        <View style={styles.heroBadge}>
          <Ionicons name="time-outline" size={14} color={colors.white} />
          <Text variant="caption" color={colors.white}>
            {`${recipe.totalMinutes} MIN`}
          </Text>
        </View>
      </Pressable>
      <Text variant="caption" color={colors.green}>
        {`${when.toUpperCase()} · ${MEAL_LABELS[meal.mealType].toUpperCase()} ALLE ${minutesToHHMM(meal.timeMinutes)}`}
      </Text>
      <Text variant="title">{recipe.name}</Text>
      <View style={styles.facts}>
        <Fact icon="time-outline" text={`${recipe.totalMinutes} min · inizia alle ${startAt}`} />
        <Fact icon="people-outline" text={`${meal.servings} ${meal.servings === 1 ? 'persona' : 'persone'}`} />
        <Fact
          icon={missing === 0 ? 'checkmark-circle-outline' : 'basket-outline'}
          text={
            missing === 0
              ? 'Ingredienti in dispensa (stima)'
              : [`${have} di ${quantified.length} in dispensa`, toCheck ? `${toCheck} q.b. da verificare` : null]
                  .filter(Boolean)
                  .join(' · ')
          }
          tone={missing === 0 ? colors.green : colors.peachInk}
        />
      </View>
      {toBuy > 0 ? (
        <Text variant="small" color={colors.peachInk}>
          {missingIngredients(toBuy)}
        </Text>
      ) : null}
      <Button label={t('action.openRecipe')} icon="restaurant-outline" onPress={() => router.push(`/ricetta/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`)} />
      <View style={styles.row}>
        <Button kind="secondary" compact label={t('action.replace')} onPress={() => router.push(`/cambia/${encodeURIComponent(meal.id)}`)} style={styles.flex} />
        <Button kind="secondary" compact label="Altre azioni" onPress={onMore} style={styles.flex} />
      </View>
    </Card>
  );
}

function Fact({ icon, text, tone = colors.inkSoft }: { icon: keyof typeof Ionicons.glyphMap; text: string; tone?: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={tone} />
      <Text variant="small" color={tone === colors.inkSoft ? colors.ink : tone} style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

function NoMealCard({ snap }: { snap: AppSnapshot }) {
  const { run } = useApp();
  const done = snap.meals.some((m) => m.date === snap.today && m.status !== 'planned');
  return (
    <Card>
      <Text variant="heading">{done ? 'Per oggi hai finito' : 'Nessun pasto da preparare'}</Text>
      <Text variant="small" color={colors.inkSoft}>
        {snap.issues.length > 0
          ? 'Alcuni pasti non hanno ricette compatibili con le tue preferenze. Puoi rivederle dalle impostazioni.'
          : 'Il calendario non ha altri pasti in programma.'}
      </Text>
      <Button kind="secondary" label={t('action.regenerate')} onPress={() => void run((s, today) => s.regenerate(today))} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  nextCard: { gap: space.md, padding: space.md, borderColor: colors.green, borderWidth: 1.5 },
  heroBadge: { position: 'absolute', top: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(36,51,44,0.72)', paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  facts: { gap: space.xs },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  pendingRow: { gap: space.sm, paddingVertical: space.xs },
  pendingActions: { flexDirection: 'row', gap: space.sm },
  bubbleBtn: { alignSelf: 'flex-start', marginTop: space.xs },
});
