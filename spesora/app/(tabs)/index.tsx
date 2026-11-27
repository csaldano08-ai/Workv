import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { addDays, capitalize, formatLongDate, formatShortDate, minutesToHHMM, weekdayOf, weekdayShort } from '../../src/core/domain/dates';
import { mealIngredientStatus, toStock } from '../../src/core/domain/pantry';
import { prepAheadOf, prepAheadShort } from '../../src/core/domain/prepAhead';
import { formatCents } from '../../src/core/domain/prices';
import type { PlannedMeal } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import type { AppSnapshot } from '../../src/features/app/SpesoraService';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { EMPTY } from '../../src/i18n/assistant';
import { t } from '../../src/i18n/it';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors, radius, shadow, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { LogoMark } from '../../src/ui/Logo';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { emitMina } from '../../src/ui/mascot/director';
import { LinkRow, StickyNote } from '../../src/ui/notebook';
import { Notice } from '../../src/ui/Notice';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Reveal } from '../../src/ui/Reveal';
import { Screen } from '../../src/ui/Screen';
import { Pulse } from '../../src/ui/Pulse';
import { Squish } from '../../src/ui/Squish';
import { Text } from '../../src/ui/Text';
import { useReducedMotion } from '../../src/ui/useReducedMotion';

/*
 * Oggi (Home V3). Un percorso solo, dall'alto in basso:
 *   saluto con Mina → il pasto di oggi (protagonista) → cosa serve per cucinarlo → la settimana e la spesa.
 * Stessi dati e stesse azioni di prima: cambia la composizione, non la logica.
 */

const native = Platform.OS !== 'web';

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

type Trip = AppSnapshot['shopping']['trips'][number];

export default function Today() {
  const { snapshot } = useApp();
  const actions = useMealActions();
  const { height } = useWindowDimensions();
  // telefoni bassi (es. iPhone SE): foto e Mina più compatte, così «Cucina ora» resta sopra la barra
  const compact = height < 720;
  if (!snapshot?.profile) return <HomeSkeleton />;
  const snap = snapshot;
  const next = pickNextMeal(snap);
  const later = snap.meals.filter((m) => m.status === 'planned' && m.date === (next?.date ?? snap.today) && m.id !== next?.id && m.timeMinutes > (next?.timeMinutes ?? 0));
  const pending = snap.meals.filter((m) => m.status === 'planned' && (m.date < snap.today || (m.date === snap.today && m.timeMinutes + 60 < nowMinutes())) && m.id !== next?.id);
  const todayTrip = snap.shopping.trips.find((tr) => tr.date === snap.today && tr.lines.length > 0) ?? null;
  const nextTrip = snap.shopping.trips.find((tr) => tr.date > snap.today && !tr.isInitial && tr.lines.length > 0) ?? null;
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
  const subtitle = cookingSoon
    ? 'Tra poco si cucina!'
    : !next
      ? snap.issues.length > 0
        ? 'Mancano alcune ricette.'
        : 'Per oggi hai finito. A domani!'
      : next.date === snap.today
        ? 'Cosa cuciniamo oggi?'
        : 'Ecco il prossimo pasto.';
  // reazione contestuale di Mina: un solo gesto all'apertura, poi resta ferma (toccandola fa un saltello)
  const minaPose = finished ? 'success' : !next ? 'thinking' : cookingSoon ? 'reminder' : 'welcome';
  // al pasto di oggi manca qualcosa in dispensa: dopo il saluto Mina guarda la card preoccupata e la indica
  const missingToday = next && next.date === snap.today ? mealIngredientStatus(next, catalogIndex, toStock(snap.pantry), snap.staples, snap.profile?.portions).filter((x) => x.status === 'da_comprare' || x.status === 'parziale').length : 0;

  return (
    <Screen contentContainerStyle={styles.content} reveal={false}>
      <Header snap={snap} />
      <Greeting hello={hello} subtitle={subtitle} pose={minaPose} compact={compact} missing={next && missingToday > 0 ? { key: `${next.id}|${missingToday}`, count: missingToday } : null} />
      <Reveal>{next ? <TodayHero meal={next} snap={snap} todayTrip={todayTrip} compact={compact} onMore={() => actions.openMenu(next)} /> : <EmptyHero snap={snap} />}</Reveal>

      {later.length > 0 ? (
        <LinkRow label={`Poi: ${later.map((m) => catalogIndex.recipe(m.recipeId)?.name).join(', ')}. Apri la settimana`} onPress={() => router.push('/settimana')}>
          <View style={styles.laterDot} />
          <Text variant="small" color={colors.inkSoft} style={styles.flex} numberOfLines={1}>
            <Text variant="small" style={styles.bold}>
              {`Poi, ${MEAL_LABELS[later[0].mealType].toLowerCase()}: `}
            </Text>
            {later.map((m) => catalogIndex.recipe(m.recipeId)?.name).join(' · ')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
        </LinkRow>
      ) : null}

      {issuesToday.length > 0 ? <Notice tone="warning" title="Alcuni pasti non hanno una ricetta" text={issuesToday[0].message} /> : null}

      {prepTonight.map(({ meal, recipe }) => (
        <Pressable key={meal.id} accessibilityRole="button" onPress={() => router.push(`/ricetta/${recipe!.id}?mealId=${encodeURIComponent(meal.id)}`)}>
          <StickyNote tone="sage" style={styles.prep}>
            <View style={styles.prepIcon}>
              <Ionicons name="moon-outline" size={18} color={colors.green} />
            </View>
            <View style={styles.flex}>
              <Text variant="handSmall">{`Stasera, per ${MEAL_LABELS[meal.mealType].toLowerCase()} di domani`}</Text>
              <Text variant="small" color={colors.inkSoft}>{`${recipe!.name}: ${prepAheadShort(prepAheadOf(recipe!)!)}.`}</Text>
            </View>
          </StickyNote>
        </Pressable>
      ))}

      {pending.length > 0 ? (
        <View style={styles.pending}>
          <Text variant="handSmall">Com’è andata?</Text>
          <Text variant="small" color={colors.inkSoft}>
            La dispensa si aggiorna solo per i pasti che confermi.
          </Text>
          {pending.slice(0, 3).map((m) => (
            <View key={m.id} style={styles.pendingRow}>
              <Text variant="body" style={styles.flex}>{`${MEAL_LABELS[m.mealType]} ${m.date === snap.today ? 'di oggi' : formatShortDate(m.date)}: ${catalogIndex.recipe(m.recipeId)?.name ?? ''}`}</Text>
              <View style={styles.row}>
                <Button compact label="Cucinato" onPress={() => void actions.cooked(m)} />
                <Button compact kind="secondary" label="No" accessibilityHint="Segna come non cucinato" onPress={() => void actions.notFollowed(m, 'skipped')} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Reveal index={1}>
        <WeekSection snap={snap} />
      </Reveal>
      <Reveal index={2}>
        <QuickTiles snap={snap} todayTrip={todayTrip} nextTrip={nextTrip} />
      </Reveal>

      {snap.economics && snap.economics.shopping.completeness === 'completa' && snap.economics.shopping.knownCents > 0 ? (
        <Text variant="small" color={colors.inkSoft} center>
          {`Spesa prevista questa settimana: circa ${formatCents(snap.economics.shopping.knownCents)}${snap.economics.budget.weeklyLimitCents ? ` (budget ${formatCents(snap.economics.budget.weeklyLimitCents)})` : ''}.`}
        </Text>
      ) : null}
      {actions.sheet}
    </Screen>
  );
}

/** Intestazione compatta: marchio, data, avvisi e impostazioni. */
function Header({ snap }: { snap: AppSnapshot }) {
  return (
    <View style={styles.header}>
      <LogoMark size={36} />
      <View style={styles.flex}>
        <Text variant="heading" color={colors.greenDark} style={styles.brand}>
          Spesora
        </Text>
        <Text variant="small" color={colors.inkSoft}>
          {capitalize(formatLongDate(snap.today))}
        </Text>
      </View>
      <IconButton icon="notifications-outline" label="Notifiche" onPress={() => router.push('/notifiche')} />
      <IconButton icon="settings-outline" label="Impostazioni" onPress={() => router.push('/impostazioni')} />
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Squish accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconBtn} hitSlop={6}>
      <Ionicons name={icon} size={23} color={colors.greenDark} />
    </Squish>
  );
}

/**
 * Saluto con Mina integrata: Mina sta in piedi a destra e i suoi piedi spariscono dietro la card del pasto,
 * come se ci si affacciasse sopra. Saluta una volta all'apertura, poi resta ferma; toccandola fa un saltello.
 */
function Greeting({ hello, subtitle, pose, compact, missing }: { hello: string; subtitle: string; pose: string; compact: boolean; missing: { key: string; count: number } | null }) {
  // finito il gesto d'ingresso, Mina dà un'occhiata al pasto di oggi (la card sotto di lei); se al pasto manca
  // qualcosa, invece, lo guarda preoccupata e lo indica (una volta: la regia ignora le ripetizioni ravvicinate)
  const [peek, setPeek] = useState(0);
  const [worry, setWorry] = useState<number | null>(null);
  const worried = worry !== null && !!missing;
  const afterGreeting = () => {
    const r = missing ? emitMina({ scope: 'home', kind: 'missingIngredients', key: missing.key }) : null;
    if (r) setWorry(r.id);
    else setPeek(1);
  };
  const mina = compact ? 104 : 136;
  const tall = mina * 1.16;
  const tuck = compact ? 22 : 28; // quanto Mina scende dietro la card: solo i piedi
  return (
    <View style={[styles.greeting, { paddingRight: mina - 10, minHeight: tall - tuck - space.lg + 4 }]}>
      {/* forma morbida di sfondo: lega Mina alla pagina invece di farla sembrare un adesivo */}
      <Svg width={240} height={170} viewBox="0 0 240 170" style={styles.hill} pointerEvents="none">
        <Path d="M40,170 C30,120 60,70 110,52 C160,34 205,10 240,0 L240,170 Z" fill={colors.greenSoft} />
        <Path d="M120,170 C118,138 150,112 190,104 C212,100 230,92 240,84 L240,170 Z" fill={colors.greenMist} />
      </Svg>
      <View accessible accessibilityRole="header" accessibilityLabel={`${hello} ${subtitle}`}>
        <Text variant="display" color={colors.greenDark} style={compact ? styles.helloCompact : styles.hello}>
          {hello}
        </Text>
        <Text variant="heading" color={colors.inkSoft} style={styles.subtitle}>
          {subtitle}
        </Text>
        <Svg width={84} height={10} viewBox="0 0 84 10" style={styles.swoosh}>
          <Path d="M3,7 C24,2 56,1 81,5" stroke={colors.greenBright} strokeOpacity={0.45} strokeWidth={4} fill="none" strokeLinecap="round" />
        </Svg>
      </View>
      <View pointerEvents="box-none" style={[styles.minaSpot, { width: mina + 20, height: tall, bottom: -(tuck + space.lg) }]}>
        <MinaMascot
          pose={worried ? 'concerned' : pose}
          gesture={worried ? 'worry' : undefined}
          size={mina}
          animated
          interactive
          glance={peek}
          onDone={worried ? undefined : afterGreeting}
          accessibilityLabel={worried ? `Mina guarda il pasto di oggi: ${missing!.count === 1 ? 'manca un ingrediente' : `mancano ${missing!.count} ingredienti`}` : 'Mina, la tua borsetta della spesa'}
        />
      </View>
    </View>
  );
}

/** Il pasto di oggi: la sezione protagonista. Foto grande in alto, contenuto pulito sotto, «Cucina ora» sempre visibile. */
function TodayHero({ meal, snap, todayTrip, compact, onMore }: { meal: PlannedMeal; snap: AppSnapshot; todayTrip: Trip | null; compact: boolean; onMore: () => void }) {
  const { run } = useApp();
  const recipe = catalogIndex.recipe(meal.recipeId);
  if (!recipe) return null;
  const statuses = mealIngredientStatus(meal, catalogIndex, toStock(snap.pantry), snap.staples, snap.profile?.portions);
  const quantified = statuses.filter((s) => s.status !== 'qb_presente' && s.status !== 'qb_mancante');
  const toBuy = quantified.filter((s) => s.status !== 'in_dispensa').length;
  const toCheck = statuses.filter((s) => s.status === 'qb_mancante').length;
  const when = meal.date === snap.today ? 'oggi' : meal.date === addDays(snap.today, 1) ? 'domani' : formatShortDate(meal.date);
  const open = () => router.push(`/ricetta/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`);
  // «Cucina ora» apre la Modalità Cucina: un passaggio alla volta
  const cook = () => router.push(`/cucina/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`);
  const favorite = snap.favorites.has(recipe.id);
  // gli ingredienti mancanti sono già nella spesa che arriva prima del pasto
  const trip = snap.shopping.trips.find((tr) => tr.date <= meal.date && tr.lines.length > 0 && tr.lines.some((l) => l.uses.some((u) => u.date === meal.date))) ?? todayTrip;
  const startAt = minutesToHHMM(Math.max(0, meal.timeMinutes - recipe.totalMinutes));
  return (
    <View style={styles.hero}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Apri la ricetta ${recipe.name}`} onPress={open}>
        <RecipeImage recipe={recipe} rounded={0} aspectRatio={compact ? 2.15 : 16 / 9} style={styles.photo} />
      </Pressable>
      <View style={styles.photoPills} pointerEvents="box-none">
        <View style={styles.pill}>
          <Ionicons name="restaurant-outline" size={13} color={colors.greenDark} />
          <Text variant="caption" color={colors.greenDark}>
            {`${MEAL_LABELS[meal.mealType]} di ${when}`}
          </Text>
        </View>
        <View style={styles.pill}>
          <Text variant="caption" color={colors.greenDark}>
            {minutesToHHMM(meal.timeMinutes)}
          </Text>
        </View>
      </View>

      <View style={styles.heroBody}>
        <FavoriteButton on={favorite} name={recipe.name} onToggle={() => void run((s) => s.toggleFavorite(recipe.id, !favorite))} />
        <Text variant="title" style={styles.dish} numberOfLines={3}>
          {recipe.name}
        </Text>
        <View style={styles.meta} accessible accessibilityLabel={`${recipe.totalMinutes} minuti, ${meal.servings} ${meal.servings === 1 ? 'persona' : 'persone'}, inizia alle ${startAt}`}>
          <Ionicons name="time-outline" size={16} color={colors.inkSoft} />
          <Text variant="small" color={colors.ink} style={styles.bold}>{`${recipe.totalMinutes} min`}</Text>
          <View style={styles.metaSep} />
          <Ionicons name="people-outline" size={16} color={colors.inkSoft} />
          <Text variant="small" color={colors.ink} style={styles.bold}>{`${meal.servings} ${meal.servings === 1 ? 'persona' : 'persone'}`}</Text>
          <View style={styles.metaSep} />
          <Text variant="small" color={colors.inkSoft}>{`dalle ${startAt}`}</Text>
        </View>

        {toBuy > 0 ? (
          <Squish accessibilityRole="button" accessibilityLabel={`Ti mancano ${toBuy} ingredienti. Apri la lista della spesa`} onPress={() => router.push(trip ? `/spesa?trip=${trip.date}` : '/spesa')} style={[styles.need, styles.needMissing]}>
            <Ionicons name="basket-outline" size={19} color={colors.peachInk} />
            <Text variant="small" color={colors.peachInk} style={[styles.flex, styles.bold]} numberOfLines={1}>
              {`Ti ${toBuy === 1 ? 'manca 1 ingrediente' : `mancano ${toBuy} ingredienti`}`}
            </Text>
            {toCheck ? (
              <Text variant="caption" color={colors.peachInk}>
                {`+${toCheck} q.b.`}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={17} color={colors.peachInk} />
          </Squish>
        ) : (
          <View style={[styles.need, styles.needOk]} accessible accessibilityLabel={toCheck ? `Hai tutto, controlla ${toCheck} ingredienti quanto basta` : 'Hai tutto in casa, secondo la dispensa'}>
            <Ionicons name="checkmark-circle" size={19} color={colors.green} />
            <Text variant="small" color={colors.greenDark} style={[styles.flex, styles.bold]}>
              {toCheck ? `Hai tutto · controlla ${toCheck} q.b.` : 'Hai tutto in casa (stima)'}
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="Cucina ora" icon="restaurant-outline" onPress={cook} />
          </View>
          <Squish accessibilityRole="button" accessibilityLabel="Altre azioni: cambia ricetta, sposta, segna come cucinato" onPress={onMore} style={styles.more}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.green} />
          </Squish>
        </View>
      </View>
    </View>
  );
}

/** Cuore a cavallo della foto: preferita sì/no, con un piccolo rimbalzo quando si aggiunge (fermo con "Riduci movimento"). */
function FavoriteButton({ on, name, onToggle }: { on: boolean; name: string; onToggle: () => void }) {
  const reduced = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(1));
  const press = () => {
    if (!on && !reduced) {
      Animated.sequence([Animated.timing(pop, { toValue: 1.3, duration: 110, useNativeDriver: native }), Animated.spring(pop, { toValue: 1, friction: 4, tension: 180, useNativeDriver: native })]).start();
    }
    onToggle();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? `Togli ${name} dai preferiti` : `Aggiungi ${name} ai preferiti`}
      accessibilityState={{ selected: on }}
      onPress={press}
      style={styles.heart}
      hitSlop={6}
    >
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Ionicons name={on ? 'heart' : 'heart-outline'} size={21} color={on ? '#E0464E' : colors.greenDark} />
      </Animated.View>
    </Pressable>
  );
}

function EmptyHero({ snap }: { snap: AppSnapshot }) {
  const { run } = useApp();
  const done = snap.meals.some((m) => m.date === snap.today && m.status !== 'planned');
  return (
    <View style={[styles.hero, styles.emptyHero]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={done ? 'checkmark-done' : 'restaurant-outline'} size={28} color={colors.green} />
      </View>
      <Text variant="title" center>
        {done ? 'Per oggi hai finito' : 'Nessun pasto da preparare'}
      </Text>
      <Text variant="small" color={colors.inkSoft} center>
        {snap.issues.length > 0 ? EMPTY.noRecipes : 'Il calendario non ha altri pasti in programma.'}
      </Text>
      <Button kind="secondary" label={t('action.regenerate')} onPress={() => void withLoader(LOADER_TEXT.regenerate, () => run((s, today) => s.regenerate(today)))} />
    </View>
  );
}

/** La settimana in una riga: un giorno per tessera, con la foto del pasto principale; il cestino nei giorni di spesa. */
function WeekSection({ snap }: { snap: AppSnapshot }) {
  const start = snap.plan?.startDate ?? snap.today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const tripDates = new Set(snap.shopping.trips.filter((tr) => tr.lines.length > 0).map((tr) => tr.date));
  const toCook = snap.meals.filter((m) => m.status === 'planned' && m.date >= snap.today).length;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name="calendar-outline" size={18} color={colors.green} />
        </View>
        <View style={styles.flex}>
          <Text variant="heading" accessibilityRole="header">
            La tua settimana
          </Text>
          <Text variant="small" color={colors.inkSoft}>
            {toCook === 0 ? 'Tutti i pasti sono fatti' : `${toCook} ${toCook === 1 ? 'pasto' : 'pasti'} ancora da cucinare`}
          </Text>
        </View>
        <Squish accessibilityRole="button" accessibilityLabel="Vedi il calendario" onPress={() => router.push('/settimana')} style={styles.linkPill}>
          <Text variant="small" color={colors.greenDark} style={styles.bold}>
            Calendario
          </Text>
          <Ionicons name="chevron-forward" size={15} color={colors.greenDark} />
        </Squish>
      </View>
      <View style={styles.week}>
        {days.map((d) => {
          const meals = snap.meals.filter((m) => m.date === d);
          const main = meals.find((m) => m.mealType === 'cena') ?? meals.find((m) => m.mealType === 'pranzo') ?? meals[0];
          const recipe = main ? catalogIndex.recipe(main.recipeId) : null;
          const today = d === snap.today;
          const past = d < snap.today;
          const allDone = meals.length > 0 && meals.every((m) => m.status !== 'planned');
          return (
            <Squish
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${formatLongDate(d)}${today ? ', oggi' : ''}: ${meals.length} pasti${tripDates.has(d) ? ', giorno di spesa' : ''}${allDone ? ', completato' : ''}`}
              onPress={() => router.push('/settimana')}
              style={[styles.day, today && styles.dayToday, past && !today && styles.dayPast]}
            >
              <Text variant="caption" color={today ? colors.greenSoft : colors.inkSoft}>
                {capitalize(weekdayShort(weekdayOf(d)))}
              </Text>
              <Text variant="heading" color={today ? colors.white : colors.ink} style={styles.dayNum}>
                {String(Number(d.slice(8)))}
              </Text>
              <View style={[styles.dayThumb, today && styles.dayThumbToday]}>
                {recipe ? <RecipeImage variant="thumb" recipe={recipe} rounded={0} aspectRatio={1} style={styles.dayThumbImg} /> : null}
                {allDone ? (
                  <View style={styles.dayDone}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  </View>
                ) : null}
              </View>
              {tripDates.has(d) ? (
                <View style={styles.basket}>
                  <Ionicons name="basket" size={10} color={colors.ink} />
                </View>
              ) : null}
            </Squish>
          );
        })}
      </View>
    </View>
  );
}

/** Spesa e dispensa: due accessi piccoli e diversi per colore, senza competere con il pasto. */
function QuickTiles({ snap, todayTrip, nextTrip }: { snap: AppSnapshot; todayTrip: Trip | null; nextTrip: Trip | null }) {
  const trip = todayTrip ?? nextTrip;
  const shopSub = todayTrip
    ? `${todayTrip.lines.length} ${todayTrip.lines.length === 1 ? 'prodotto' : 'prodotti'} per oggi`
    : nextTrip
      ? `${nextTrip.lines.length} prodotti · ${weekdayShort(weekdayOf(nextTrip.date))} ${Number(nextTrip.date.slice(8))}`
      : 'Niente da comprare';
  const inStock = [...snap.pantry.values()].filter((e) => e.qty > 0).length;
  const short = snap.outlook.filter((o) => o.insufficient).length;
  const pantrySub = short > 0 ? `${short} ${short === 1 ? 'prodotto potrebbe' : 'prodotti potrebbero'} non bastare` : inStock > 0 ? `${inStock} prodotti in casa` : 'Ancora vuota';
  return (
    <View style={styles.tiles}>
      <Tile tone="peach" icon="basket-outline" title="Lista della spesa" sub={shopSub} badge={todayTrip ? todayTrip.lines.length : undefined} onPress={() => router.push(trip ? `/spesa?trip=${trip.date}` : '/spesa')} />
      <Tile tone="green" icon="file-tray-stacked-outline" title="Dispensa" sub={pantrySub} onPress={() => router.push('/dispensa')} />
    </View>
  );
}

function Tile({ tone, icon, title, sub, badge, onPress }: { tone: 'peach' | 'green'; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; badge?: number; onPress: () => void }) {
  const peach = tone === 'peach';
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${title}: ${sub}`} onPress={onPress} style={[styles.tile, peach ? styles.tilePeach : styles.tileGreen]}>
      <View style={styles.tileTop}>
        <View style={styles.tileIcon}>
          <Ionicons name={icon} size={20} color={peach ? colors.peachInk : colors.green} />
          {badge ? (
            <View style={styles.tileBadge}>
              <Text variant="caption" color={colors.ink} style={styles.tileBadgeText}>
                {String(badge)}
              </Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={peach ? colors.peachInk : colors.green} />
      </View>
      <Text variant="heading" numberOfLines={1}>
        {title}
      </Text>
      <Text variant="small" color={colors.inkSoft} numberOfLines={2}>
        {sub}
      </Text>
    </Squish>
  );
}

/** Dati non ancora caricati: la stessa forma della pagina, in grigio-verde tenue (niente salti quando arrivano). */
function HomeSkeleton() {
  return (
    <Screen contentContainerStyle={styles.content} reveal={false}>
      <Pulse style={styles.skelStack}>
        <View style={styles.header}>
          <View style={[styles.skel, { width: 36, height: 36, borderRadius: 10 }]} />
          <View style={[styles.skel, { width: 140, height: 18 }]} />
        </View>
        <View style={[styles.skel, { width: 200, height: 34, marginTop: space.md }]} />
        <View style={[styles.skel, { width: '100%', height: 360, borderRadius: radius.xl }]} />
        <View style={[styles.skel, { width: '100%', height: 110, borderRadius: radius.xl }]} />
      </Pulse>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.sm },
  skelStack: { gap: space.lg },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brand: { fontWeight: '800', fontSize: 19, lineHeight: 22 },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  greeting: { justifyContent: 'center', zIndex: 0 },
  hill: { position: 'absolute', right: -space.lg - 8, bottom: -space.lg - 30 },
  hello: { fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  helloCompact: { fontSize: 30, lineHeight: 35, letterSpacing: -0.5 },
  subtitle: { fontSize: 18, lineHeight: 24 },
  swoosh: { marginTop: 2 },
  minaSpot: { position: 'absolute', right: -space.sm, alignItems: 'center', justifyContent: 'flex-start' },
  hero: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', zIndex: 1, ...shadow.card },
  photo: { width: '100%' },
  photoPills: { position: 'absolute', left: space.md, right: space.md, top: space.md, flexDirection: 'row', justifyContent: 'space-between' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill },
  heart: { position: 'absolute', right: space.lg, top: -22, zIndex: 2, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  heroBody: { padding: space.lg, paddingTop: space.md, gap: space.md },
  dish: { fontSize: 24, lineHeight: 29, paddingRight: 44 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: -space.xs },
  metaSep: { width: 1, height: 14, backgroundColor: colors.lineStrong, marginHorizontal: 5 },
  need: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH, paddingHorizontal: space.md, borderRadius: radius.lg },
  needMissing: { backgroundColor: colors.peachSoft },
  needOk: { backgroundColor: colors.greenSoft },
  more: { width: TOUCH + 8, height: TOUCH + 8, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1.5, borderBottomWidth: 4, borderColor: colors.lineStrong },
  emptyHero: { alignItems: 'center', gap: space.md, padding: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  laterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.greenBright, marginLeft: space.xs },
  prep: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  prepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pending: { gap: space.xs, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  pendingRow: { gap: space.sm, paddingVertical: space.xs },
  section: { gap: space.md, marginTop: space.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  linkPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: space.md, paddingRight: space.sm, minHeight: 36, borderRadius: radius.pill, backgroundColor: colors.greenSoft },
  week: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingTop: space.sm, paddingBottom: space.sm, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  dayToday: { backgroundColor: colors.green, borderColor: colors.green, ...shadow.card },
  dayPast: { opacity: 0.55 },
  dayNum: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  dayThumb: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.greenMist, marginTop: 4 },
  dayThumbToday: { borderWidth: 2, borderColor: colors.white },
  dayThumbImg: { width: '100%', height: '100%' },
  dayDone: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(47,127,87,0.78)', alignItems: 'center', justifyContent: 'center' },
  basket: { position: 'absolute', top: -6, right: -4, width: 19, height: 19, borderRadius: 10, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, gap: 2, padding: space.md, borderRadius: radius.xl, minHeight: 116 },
  tilePeach: { backgroundColor: colors.peachSoft },
  tileGreen: { backgroundColor: colors.greenSoft },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.xs },
  tileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tileBadge: { position: 'absolute', top: -5, right: -8, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.peachSoft },
  tileBadgeText: { fontWeight: '800', fontSize: 11, lineHeight: 13 },
  skel: { backgroundColor: colors.greenMist, borderRadius: 8 },
});
