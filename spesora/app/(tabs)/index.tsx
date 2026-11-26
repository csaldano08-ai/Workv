import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, capitalize, formatLongDate, formatShortDate, minutesToHHMM, weekdayOf, weekdayShort } from '../../src/core/domain/dates';
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
import { colors, radius, shadow, space, TOUCH } from '../../src/theme/tokens';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { LinkRow, NotebookPage, StickyNote } from '../../src/ui/notebook';
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

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buongiorno!' : hour < 18 ? 'Ciao!' : 'Buonasera!';
  const nextRecipe = next ? catalogIndex.recipe(next.recipeId) : null;
  const cookingSoon = !!(next && nextRecipe && next.date === snap.today && next.timeMinutes - nextRecipe.totalMinutes - nowMinutes() <= 90);
  const finished = !next && snap.issues.length === 0;
  const subtitle = todayTrip
    ? 'Oggi c’è una piccola spesa da fare.'
    : cookingSoon
      ? 'Tra poco si cucina!'
      : !next
        ? snap.issues.length > 0
          ? 'Mancano alcune ricette: puoi allargare le preferenze.'
          : 'Per oggi hai finito. A domani!'
        : next.date === snap.today
          ? 'Cosa cuciniamo oggi?'
          : 'Per oggi è tutto: ecco il prossimo pasto.';
  const minaPose = finished ? 'success' : !next ? 'thinking' : 'welcome';

  return (
    <Screen>
      <View style={styles.header}>
        <LogoMark size={26} />
        <Text variant="caption" color={colors.inkSoft} style={styles.flex}>
          {capitalize(formatLongDate(snap.today)).toUpperCase()}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Impostazioni" onPress={() => router.push('/impostazioni')} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={colors.green} />
        </Pressable>
      </View>

      <View style={styles.greeting}>
        <View style={styles.flex} accessible accessibilityLabel={`${hello} ${subtitle}`}>
          <Text variant="display" color={colors.greenDark} accessibilityRole="header">
            {hello}
          </Text>
          <Text variant="heading" color={colors.inkSoft}>
            {subtitle}
          </Text>
        </View>
        <MinaMascot pose={minaPose} size={96} animated idle interactive style={styles.greetMina} />
      </View>

      {/* nei giorni di spesa la lista viene prima della ricetta (serve subito) */}
      {todayTrip ? <ShoppingCard snap={snap} todayTrip={todayTrip} nextTrip={nextTrip ?? null} /> : null}

      {prepTonight.map(({ meal, recipe }) => (
        <Pressable key={meal.id} accessibilityRole="button" onPress={() => router.push(`/ricetta/${recipe!.id}?mealId=${encodeURIComponent(meal.id)}`)}>
          <StickyNote tone="sage" style={styles.prep}>
            <Ionicons name="moon-outline" size={20} color={colors.green} />
            <View style={styles.flex}>
              <Text variant="handSmall">{`Stasera, per ${MEAL_LABELS[meal.mealType].toLowerCase()} di domani`}</Text>
              <Text variant="small">{`${recipe!.name}: ${prepAheadShort(prepAheadOf(recipe!)!)}.`}</Text>
            </View>
          </StickyNote>
        </Pressable>
      ))}

      <Reveal>{next ? <NextMealPage meal={next} snap={snap} onMore={() => actions.openMenu(next)} /> : <NoMealPage snap={snap} />}</Reveal>

      {later.length > 0 ? (
        <LinkRow label={`Poi: ${later.map((m) => catalogIndex.recipe(m.recipeId)?.name).join(', ')}. Apri la settimana`} onPress={() => router.push('/settimana')}>
          <Text variant="handSmall" color={colors.green}>
            Poi
          </Text>
          <Text variant="small" color={colors.inkSoft} style={styles.flex} numberOfLines={2}>
            {later.map((m) => catalogIndex.recipe(m.recipeId)?.name).join(' · ')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </LinkRow>
      ) : null}

      {issuesToday.length > 0 ? <Notice tone="warning" title="Alcuni pasti non hanno una ricetta" text={issuesToday[0].message} /> : null}

      {pending.length > 0 ? (
        <StickyNote tone="paper">
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

      <Reveal index={1}>
        <WeekStrip snap={snap} />
      </Reveal>

      {todayTrip ? null : (
        <Reveal index={2}>
          <ShoppingCard snap={snap} todayTrip={null} nextTrip={nextTrip ?? null} />
        </Reveal>
      )}

      {snap.economics && snap.economics.shopping.completeness === 'completa' && snap.economics.shopping.knownCents > 0 ? (
        <Text variant="small" color={colors.inkSoft}>
          {`Spesa prevista questa settimana: circa ${formatCents(snap.economics.shopping.knownCents)}${snap.economics.budget.weeklyLimitCents ? ` (budget ${formatCents(snap.economics.budget.weeklyLimitCents)})` : ''}.`}
        </Text>
      ) : null}
      {actions.sheet}
    </Screen>
  );
}

/** Sintesi della settimana: un giorno per colonna, un pallino per pasto (pieno = cucinato), il cestino nei giorni di spesa. */
function WeekStrip({ snap }: { snap: AppSnapshot }) {
  const start = snap.plan?.startDate ?? snap.today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const tripDates = new Set(snap.shopping.trips.filter((tr) => tr.lines.length > 0).map((tr) => tr.date));
  const planned = snap.meals.filter((m) => m.status === 'planned' && m.date >= snap.today).length;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`La tua settimana: ${planned} pasti ancora da cucinare. Apri il calendario`} onPress={() => router.push('/settimana')}>
      <NotebookPage contentStyle={styles.weekPage}>
        <View style={styles.cardHead}>
          <Ionicons name="calendar-outline" size={20} color={colors.green} />
          <Text variant="heading" style={styles.flex}>
            La tua settimana
          </Text>
          <Text variant="small" color={colors.green} style={styles.linkText}>
            Calendario
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.green} />
        </View>
        <View style={styles.week}>
          {days.map((d) => {
            const meals = snap.meals.filter((m) => m.date === d);
            const today = d === snap.today;
            const past = d < snap.today;
            return (
              <View key={d} style={[styles.day, today && styles.dayToday]}>
                <Text variant="caption" color={today ? colors.greenSoft : colors.inkSoft}>
                  {weekdayShort(weekdayOf(d))}
                </Text>
                <Text variant="heading" color={today ? colors.white : past ? colors.inkSoft : colors.ink}>
                  {String(Number(d.slice(8)))}
                </Text>
                <View style={styles.dots}>
                  {meals.slice(0, 4).map((m) => (
                    <View
                      key={m.id}
                      style={[styles.dot, m.status === 'cooked' ? (today ? styles.dotDoneToday : styles.dotDone) : m.status === 'planned' ? (today ? styles.dotTodoToday : styles.dotTodo) : styles.dotOff]}
                    />
                  ))}
                </View>
                {tripDates.has(d) ? (
                  <View style={styles.basket}>
                    <Ionicons name="basket" size={10} color={colors.ink} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </NotebookPage>
    </Pressable>
  );
}

/** La spesa in una riga: quella di oggi in evidenza (pesca), altrimenti la prossima. */
function ShoppingCard({
  snap,
  todayTrip,
  nextTrip,
}: {
  snap: AppSnapshot;
  todayTrip: AppSnapshot['shopping']['trips'][number] | null;
  nextTrip: AppSnapshot['shopping']['trips'][number] | null;
}) {
  const trip = todayTrip ?? nextTrip;
  const urgent = todayTrip ? todayTrip.lines.filter((l) => l.uses.some((u) => u.date === snap.today)).length : 0;
  const title = todayTrip ? (todayTrip.isInitial ? 'Serve una piccola spesa' : 'Spesa di oggi') : trip ? 'Prossima spesa' : 'Lista della spesa';
  const sub = todayTrip
    ? `${todayTrip.lines.length} ${todayTrip.lines.length === 1 ? 'prodotto' : 'prodotti'}${urgent ? ` · ${urgent} per oggi` : ''}`
    : trip
      ? `${capitalize(formatLongDate(trip.date))} · ${trip.lines.length} ${trip.lines.length === 1 ? 'prodotto' : 'prodotti'}`
      : 'Per ora non c’è niente da comprare.';
  const open = () => router.push(trip ? `/spesa?trip=${trip.date}` : '/spesa');
  return (
    <View style={[styles.shop, todayTrip ? styles.shopToday : null]}>
      <View style={[styles.shopIcon, todayTrip ? styles.shopIconToday : null]}>
        <Ionicons name="basket-outline" size={22} color={todayTrip ? colors.ink : colors.green} />
      </View>
      <View style={styles.flex}>
        <Text variant="heading">{title}</Text>
        <Text variant="small" color={colors.inkSoft}>
          {sub}
        </Text>
      </View>
      <Button kind={todayTrip ? 'peach' : 'secondary'} compact label={todayTrip ? 'Apri la lista' : 'Vedi'} onPress={open} accessibilityHint="Apre la lista della spesa" />
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
  const when = meal.date === snap.today ? 'Oggi' : meal.date === addDays(snap.today, 1) ? 'Domani' : capitalize(formatLongDate(meal.date));
  const open = () => router.push(`/ricetta/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`);
  return (
    <View style={styles.hero}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Apri la ricetta ${recipe.name}`} onPress={open}>
        <RecipeImage recipe={recipe} rounded={0} aspectRatio={16 / 11} style={styles.photo} />
        <View style={styles.photoBadge}>
          <Text variant="caption" color={colors.greenDark}>
            {`${when.toUpperCase()} · ${MEAL_LABELS[meal.mealType].toUpperCase()} ${minutesToHHMM(meal.timeMinutes)}`}
          </Text>
        </View>
      </Pressable>
      <View style={styles.heroBody}>
        <Text variant="title">{recipe.name}</Text>
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
      </View>
    </View>
  );
}

function Chip({ icon, text, label, tone }: { icon: keyof typeof Ionicons.glyphMap; text: string; label?: string; tone?: 'green' | 'peach' }) {
  const bg = tone === 'peach' ? colors.peachSoft : tone === 'green' ? colors.greenSoft : colors.tab;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]} accessible accessibilityLabel={label ?? text}>
      <Ionicons name={icon} size={14} color={tone === 'peach' ? colors.peachInk : colors.greenDark} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: -space.sm },
  flex: { flex: 1 },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  greeting: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  greetMina: { marginRight: -space.xs, marginBottom: -space.sm },
  prep: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hero: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', ...shadow.card },
  photo: { width: '100%' },
  photoBadge: { position: 'absolute', left: space.md, top: space.md, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  heroBody: { padding: space.lg, gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontSize: 12.5 },
  row: { flexDirection: 'row', gap: space.sm },
  pendingRow: { gap: space.sm, paddingVertical: space.xs },
  weekPage: { gap: space.md, paddingHorizontal: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
  linkText: { fontWeight: '700' },
  week: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.greenMist },
  dayToday: { backgroundColor: colors.green },
  dots: { flexDirection: 'row', gap: 3, minHeight: 7, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotDone: { backgroundColor: colors.green },
  dotTodo: { borderWidth: 1.5, borderColor: colors.green },
  dotDoneToday: { backgroundColor: colors.white },
  dotTodoToday: { borderWidth: 1.5, borderColor: colors.white },
  dotOff: { backgroundColor: colors.lineStrong },
  basket: { position: 'absolute', top: -5, right: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  shop: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingLeft: space.md, borderRadius: radius.xl, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...shadow.card },
  shopToday: { backgroundColor: colors.peachSoft, borderColor: colors.peachSoft },
  shopIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  shopIconToday: { backgroundColor: colors.white },
});
