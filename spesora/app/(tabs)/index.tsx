import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, capitalize, formatLongDate, formatShortDate, minutesToHHMM } from '../../src/core/domain/dates';
import { mealIngredientStatus, toStock } from '../../src/core/domain/pantry';
import { prepAheadOf, prepAheadShort } from '../../src/core/domain/prepAhead';
import type { PlannedMeal } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import type { AppSnapshot } from '../../src/features/app/SpesoraService';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { formatCents } from '../../src/core/domain/prices';
import { t } from '../../src/i18n/it';
import { EMPTY, missingIngredients } from '../../src/i18n/assistant';
import { colors, mealTone, radius, space, TOUCH } from '../../src/theme/tokens';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { HandLabel, LinkRow, NotebookPage, StickyNote, TapedPhoto } from '../../src/ui/notebook';
import { Reveal } from '../../src/ui/Reveal';
import { Button } from '../../src/ui/Button';
import { LogoMark } from '../../src/ui/Logo';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Notice } from '../../src/ui/Notice';
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
  const later = snap.meals.filter((m) => m.status === 'planned' && m.date === (next?.date ?? snap.today) && m.id !== next?.id && (m.timeMinutes > (next?.timeMinutes ?? 0)));
  const pending = snap.meals.filter(
    (m) => m.status === 'planned' && (m.date < snap.today || (m.date === snap.today && m.timeMinutes + 60 < nowMinutes())) && m.id !== next?.id,
  );
  const todayTrip = snap.shopping.trips.find((tr) => tr.date === snap.today && tr.lines.length > 0);
  const nextTrip = snap.shopping.trips.find((tr) => tr.date > snap.today && !tr.isInitial);
  const issuesToday = snap.issues.filter((i) => i.date === snap.today);
  const prepTonight = snap.meals
    .filter((m) => m.status === 'planned' && m.date === addDays(snap.today, 1))
    .map((m) => ({ meal: m, recipe: catalogIndex.recipe(m.recipeId) }))
    .filter((x) => x.recipe && prepAheadOf(x.recipe));

  return (
    <Screen>
      <View style={styles.header}>
        <LogoMark size={30} />
        <View style={styles.flex}>
          <Text variant="title" color={colors.green} accessibilityRole="header">
            Spesora
          </Text>
          <Text variant="caption" color={colors.inkSoft}>
            {capitalize(formatLongDate(snap.today)).toUpperCase()}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Impostazioni" onPress={() => router.push('/impostazioni')} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={colors.green} />
        </Pressable>
      </View>

      <Reveal>
        <MinaScene snap={snap} next={next} todayTrip={todayTrip ?? null} />
      </Reveal>

      {prepTonight.map(({ meal, recipe }) => (
        <Pressable key={meal.id} accessibilityRole="button" onPress={() => router.push(`/ricetta/${recipe!.id}?mealId=${encodeURIComponent(meal.id)}`)}>
          <StickyNote tone="sage" tilt={0.8} tape={false}>
            <Text variant="handSmall">{`Stasera, per ${MEAL_LABELS[meal.mealType].toLowerCase()} di domani`}</Text>
            <Text variant="small">{`${recipe!.name}: ${prepAheadShort(prepAheadOf(recipe!)!)}.`}</Text>
          </StickyNote>
        </Pressable>
      ))}

      <Reveal index={1}>{next ? <NextMealPage meal={next} snap={snap} onMore={() => actions.openMenu(next)} /> : <NoMealPage snap={snap} />}</Reveal>

      {later.length > 0 ? (
        <LinkRow label={`Poi: ${later.map((m) => catalogIndex.recipe(m.recipeId)?.name).join(', ')}. Apri la settimana`} onPress={() => router.push('/settimana')}>
          <Text variant="handSmall">Poi:</Text>
          <Text variant="small" color={colors.inkSoft} style={styles.flex} numberOfLines={2}>
            {later.map((m) => catalogIndex.recipe(m.recipeId)?.name).join(' · ')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </LinkRow>
      ) : null}

      {issuesToday.length > 0 ? <Notice tone="warning" title="Alcuni pasti non hanno una ricetta" text={issuesToday[0].message} /> : null}

      {pending.length > 0 ? (
        <StickyNote tone="paper" tilt={0} tape>
          <Text variant="hand">Com’è andata?</Text>
          <Text variant="small" color={colors.inkSoft}>
            La dispensa si aggiorna solo per i pasti che confermi.
          </Text>
          {pending.slice(0, 3).map((m) => (
            <View key={m.id} style={styles.pendingRow}>
              <Text variant="body">{`${MEAL_LABELS[m.mealType]} ${m.date === snap.today ? 'di oggi' : formatShortDate(m.date)}: ${catalogIndex.recipe(m.recipeId)?.name ?? ''}`}</Text>
              <View style={styles.row}>
                <Button compact label="Cucinato" onPress={() => void actions.cooked(m)} />
                <Button compact kind="secondary" label="No" accessibilityHint="Segna come non cucinato" onPress={() => void actions.notFollowed(m, 'skipped')} />
              </View>
            </View>
          ))}
        </StickyNote>
      ) : null}

      <View style={styles.footNotes}>
        {todayTrip ? null : nextTrip ? (
          <Text variant="small" color={colors.inkSoft}>
            {`Prossima spesa: ${formatLongDate(nextTrip.date)} · ${nextTrip.lines.length} prodotti`}
          </Text>
        ) : null}
        {snap.economics && snap.economics.shopping.completeness === 'completa' && snap.economics.shopping.knownCents > 0 ? (
          <Text variant="small" color={colors.inkSoft}>
            {`Spesa prevista questa settimana: circa ${formatCents(snap.economics.shopping.knownCents)}${snap.economics.budget.weeklyLimitCents ? ` (budget ${formatCents(snap.economics.budget.weeklyLimitCents)})` : ''}.`}
          </Text>
        ) : null}
      </View>
      {actions.sheet}
    </Screen>
  );
}

/** Mina e il suo bigliettino: un messaggio breve e, se serve, un'azione. */
function MinaScene({ snap, next, todayTrip }: { snap: AppSnapshot; next: PlannedMeal | null; todayTrip: AppSnapshot['shopping']['trips'][number] | null }) {
  let pose = 'wave';
  let title = '';
  let sub = '';
  let action: React.ReactNode = null;
  const recipe = next ? catalogIndex.recipe(next.recipeId) : null;
  if (todayTrip) {
    const urgent = todayTrip.lines.filter((l) => l.uses.some((u) => u.date === snap.today)).length;
    pose = 'shopping';
    title = todayTrip.isInitial ? 'Serve una piccola spesa' : 'Ho preparato la spesa!';
    sub = `${todayTrip.lines.length} ${todayTrip.lines.length === 1 ? 'prodotto' : 'prodotti'}${urgent ? ` · ${urgent} per oggi` : ''}`;
    action = <Button kind="peach" compact label="Apri la lista" icon="basket-outline" onPress={() => router.push(`/spesa?trip=${todayTrip.date}`)} style={styles.noteBtn} />;
  } else if (next && recipe && next.date === snap.today && next.timeMinutes - recipe.totalMinutes - nowMinutes() <= 90) {
    pose = 'cooking';
    title = 'Tra poco si cucina!';
    sub = `${recipe.name} · ${recipe.totalMinutes} min`;
  } else if (!next) {
    pose = snap.issues.length > 0 ? 'thinking' : 'success';
    title = snap.issues.length > 0 ? 'Mancano alcune ricette' : 'Per oggi hai finito!';
    sub = snap.issues.length > 0 ? 'Puoi allargare le preferenze dalle impostazioni.' : 'A domani.';
  } else {
    const hour = new Date().getHours();
    title = hour < 12 ? 'Buongiorno!' : hour < 18 ? 'Ciao!' : 'Buonasera!';
    sub = next.date === snap.today ? 'Il menù di oggi è pronto.' : 'Per oggi è tutto: ecco il prossimo pasto.';
  }
  return (
    <View style={styles.scene} accessible={!action} accessibilityLabel={`Mina: ${title}. ${sub}`}>
      <MinaMascot pose={pose} size={124} animated style={styles.sceneMina} />
      <StickyNote style={styles.flex}>
        <Text variant="hand">{title}</Text>
        <Text variant="small" color={colors.inkSoft}>
          {sub}
        </Text>
        {action}
      </StickyNote>
    </View>
  );
}

function NextMealPage({ meal, snap, onMore }: { meal: PlannedMeal; snap: AppSnapshot; onMore: () => void }) {
  const recipe = catalogIndex.recipe(meal.recipeId);
  if (!recipe) return null;
  const statuses = mealIngredientStatus(meal, catalogIndex, toStock(snap.pantry), snap.staples, snap.profile?.portions);
  const quantified = statuses.filter((s) => s.status !== 'qb_presente' && s.status !== 'qb_mancante');
  const have = quantified.filter((s) => s.status === 'in_dispensa').length;
  const toBuy = quantified.filter((s) => s.status !== 'in_dispensa').length;
  const toCheck = statuses.filter((s) => s.status === 'qb_mancante').length;
  const when = meal.date === snap.today ? 'Oggi si cucina' : meal.date === addDays(snap.today, 1) ? 'Domani si cucina' : capitalize(formatLongDate(meal.date));
  const open = () => router.push(`/ricetta/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`);
  return (
    <NotebookPage>
      <View style={styles.pageHead}>
        <Text variant="hand" style={styles.flex}>
          {when}
        </Text>
        <HandLabel text={`${MEAL_LABELS[meal.mealType].toLowerCase()} ${minutesToHHMM(meal.timeMinutes)}`} bg={mealTone[meal.mealType]} />
      </View>
      <View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Apri la ricetta ${recipe.name}`} onPress={open}>
          <TapedPhoto>
            <RecipeImage recipe={recipe} rounded={0} style={styles.photo} />
          </TapedPhoto>
        </Pressable>
        <MinaMascot pose="recipe" size={88} style={styles.peek} />
      </View>
      <Text variant="title" style={styles.dishName}>
        {recipe.name}
      </Text>
      <View style={styles.chips}>
        <Chip icon="time-outline" text={`${recipe.totalMinutes} min · dalle ${minutesToHHMM(Math.max(0, meal.timeMinutes - recipe.totalMinutes))}`} />
        <Chip icon="people-outline" text={`${meal.servings}`} label={`${meal.servings} ${meal.servings === 1 ? 'persona' : 'persone'}`} />
        <Chip
          icon={toBuy + toCheck === 0 ? 'checkmark-circle-outline' : 'basket-outline'}
          text={toBuy + toCheck === 0 ? 'tutto in casa (stima)' : `${have}/${quantified.length} in casa${toCheck ? ` · ${toCheck} q.b.` : ''}`}
          tone={toBuy + toCheck === 0 ? 'green' : 'peach'}
        />
      </View>
      {toBuy > 0 ? (
        <Text variant="small" color={colors.peachInk}>
          {missingIngredients(toBuy)}
        </Text>
      ) : null}
      <Button label="Cucina" icon="restaurant-outline" onPress={open} />
      <View style={styles.row}>
        <Button kind="secondary" compact label={t('action.replace')} onPress={() => router.push(`/cambia/${encodeURIComponent(meal.id)}`)} style={styles.flex} />
        <Button kind="secondary" compact label="Altre azioni" onPress={onMore} style={styles.flex} />
      </View>
    </NotebookPage>
  );
}

function Chip({ icon, text, label, tone }: { icon: keyof typeof Ionicons.glyphMap; text: string; label?: string; tone?: 'green' | 'peach' }) {
  const bg = tone === 'peach' ? colors.peachSoft : tone === 'green' ? colors.greenSoft : colors.white;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]} accessible accessibilityLabel={label ?? text}>
      <Ionicons name={icon} size={14} color={colors.ink} />
      <Text variant="caption" color={colors.ink} style={styles.chipText}>
        {text}
      </Text>
    </View>
  );
}

function NoMealPage({ snap }: { snap: AppSnapshot }) {
  const { run } = useApp();
  const done = snap.meals.some((m) => m.date === snap.today && m.status !== 'planned');
  return (
    <NotebookPage>
      <Text variant="hand">{done ? 'Per oggi hai finito' : 'Nessun pasto da preparare'}</Text>
      <Text variant="small" color={colors.inkSoft}>
        {snap.issues.length > 0 ? EMPTY.noRecipes : 'Il calendario non ha altri pasti in programma.'}
      </Text>
      <Button kind="secondary" label={t('action.regenerate')} onPress={() => void withLoader(LOADER_TEXT.regenerate, () => run((s, today) => s.regenerate(today)))} />
    </NotebookPage>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  scene: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  sceneMina: { marginLeft: -space.md },
  noteBtn: { alignSelf: 'flex-start', marginTop: space.sm },
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  photo: { width: '100%' },
  peek: { position: 'absolute', right: -14, bottom: -34 },
  dishName: { paddingRight: 56, marginTop: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ink },
  chipText: { fontSize: 12.5 },
  row: { flexDirection: 'row', gap: space.sm },
  pendingRow: { gap: space.sm, paddingVertical: space.xs },
  footNotes: { gap: space.xs },
});
