import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { useT } from '../../src/i18n';
import { recipeName } from '../../src/i18n/content';
import { formatLocale } from '../../src/core/domain/locale';
import { MEAL_LABELS, mealInSentence } from '../../src/i18n/labels';
import { colors, radius, shadow, space } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { emitMina } from '../../src/ui/mascot/director';
import { LinkRow } from '../../src/ui/notebook';
import { AppHeader, Banner, HeaderIcon, InfoNote, PhotoButton } from '../../src/ui/mina/kit';
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
  const { t } = useT();
  const actions = useMealActions();
  const { height, width } = useWindowDimensions();
  // telefoni bassi (es. iPhone SE): Mina e card più compatte, così «Cucina ora» e la settimana restano visibili
  const compact = height < 720 || width < 370;
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
  const hello = t(hour < 12 ? 'home:hello.morning' : hour < 18 ? 'home:hello.day' : 'home:hello.evening');
  const nextRecipe = next ? catalogIndex.recipe(next.recipeId) : null;
  const cookingSoon = !!(next && nextRecipe && next.date === snap.today && next.timeMinutes - nextRecipe.totalMinutes - nowMinutes() <= 90);
  const finished = !next && snap.issues.length === 0;
  const subtitle = t(cookingSoon ? 'home:sub.cookingSoon' : !next ? (snap.issues.length > 0 ? 'home:sub.missingRecipes' : 'home:sub.done') : next.date === snap.today ? 'home:sub.today' : 'home:sub.next');
  const recipeTitle = (id: string) => {
    const r = catalogIndex.recipe(id);
    return r ? recipeName(r) : '';
  };
  // reazione contestuale di Mina: un solo gesto all'apertura, poi resta ferma (toccandola fa un saltello)
  const minaPose = finished ? 'success' : !next ? 'thinking' : cookingSoon ? 'reminder' : 'welcome';
  // stato degli ingredienti del pasto protagonista (stima dalla dispensa)
  const statuses = next ? mealIngredientStatus(next, catalogIndex, toStock(snap.pantry), snap.staples, snap.profile?.portions) : [];
  const toBuy = statuses.filter((x) => x.status === 'da_comprare' || x.status === 'parziale').length;
  const toCheck = statuses.filter((x) => x.status === 'qb_mancante').length;
  const missingToday = next && next.date === snap.today ? toBuy : 0;
  // gli ingredienti mancanti sono già nella spesa che arriva prima del pasto
  const trip = next ? (snap.shopping.trips.find((tr) => tr.date <= next.date && tr.lines.length > 0 && tr.lines.some((l) => l.uses.some((u) => u.date === next.date))) ?? todayTrip) : todayTrip;

  return (
    <Screen contentContainerStyle={styles.content} reveal={false}>
      <AppHeader
        right={
          <>
            <Text variant="small" color={colors.inkSoft} style={styles.headDate} accessibilityLabel={t('home:header.todayIs', { date: formatLongDate(snap.today) })}>
              {shortToday(snap.today)}
            </Text>
            <HeaderIcon icon="notifications-outline" label={t('home:header.notifications')} onPress={() => router.push('/notifiche')} />
            <HeaderIcon icon="settings-outline" label={t('home:header.settings')} onPress={() => router.push('/impostazioni')} />
          </>
        }
      />
      <Greeting
        hello={hello}
        subtitle={subtitle}
        pose={minaPose}
        compact={compact}
        missing={next && missingToday > 0 ? { key: `${next.id}|${missingToday}`, count: missingToday } : null}
      />
      <Reveal>{next ? <TodayHero meal={next} snap={snap} compact={compact} onMore={() => actions.openMenu(next)} /> : <EmptyHero snap={snap} />}</Reveal>

      {next ? (
        <Reveal index={1}>
          {toBuy > 0 ? (
            <Banner
              icon={<BasketMark />}
              text={t('home:missing', { count: toBuy })}
              accessibilityLabel={`${t('home:missing', { count: toBuy })}${toCheck ? `, ${t('home:missing.check', { count: toCheck })}` : ''}. ${t('home:missing.open')}`}
              onPress={() => router.push(trip ? `/spesa?trip=${trip.date}` : '/spesa')}
            />
          ) : (
            <Banner tone="green" icon={<Ionicons name="checkmark-circle" size={26} color={colors.green} />} text={toCheck ? t('home:allGood.check', { count: toCheck }) : t('home:allGood')} />
          )}
        </Reveal>
      ) : null}

      <Reveal index={2}>
        <WeekSection snap={snap} />
      </Reveal>

      {later.length > 0 ? (
        <LinkRow label={t('home:later.a11y', { names: later.map((m) => recipeTitle(m.recipeId)).join(', ') })} onPress={() => router.push('/settimana')}>
          <View style={styles.laterDot} />
          <Text variant="small" color={colors.inkSoft} style={styles.flex} numberOfLines={2}>
            <Text variant="small" style={styles.bold}>
              {t('home:later.label', { meal: mealInSentence(later[0].mealType) })}
            </Text>
            {later.map((m) => recipeTitle(m.recipeId)).join(' · ')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
        </LinkRow>
      ) : null}

      {issuesToday.length > 0 ? <InfoNote tone="warning" text={t('home:issues', { message: issuesToday[0].message })} /> : null}

      {prepTonight.map(({ meal, recipe }) => (
        <Banner
          key={meal.id}
          tone="green"
          icon={<Ionicons name="moon-outline" size={22} color={colors.green} />}
          text={t('home:prepTonight', { meal: mealInSentence(meal.mealType), what: prepAheadShort(prepAheadOf(recipe!)!) })}
          onPress={() => router.push(`/ricetta/${recipe!.id}?mealId=${encodeURIComponent(meal.id)}`)}
        />
      ))}

      {pending.length > 0 ? (
        <View style={styles.pending}>
          <Text variant="heading" style={styles.bold}>
            {t('home:pending.title')}
          </Text>
          <Text variant="small" color={colors.inkSoft}>
            {t('home:pending.note')}
          </Text>
          {pending.slice(0, 3).map((m) => (
            <View key={m.id} style={styles.pendingRow}>
              <Text variant="body" style={styles.flex}>{t('home:pending.meal', { meal: MEAL_LABELS[m.mealType], when: m.date === snap.today ? t('home:pending.today') : t('home:pending.on', { date: formatShortDate(m.date) }), name: recipeTitle(m.recipeId) })}</Text>
              <View style={styles.row}>
                <Button compact label={t('home:pending.cooked')} onPress={() => void actions.cooked(m)} />
                <Button compact kind="secondary" label={t('home:pending.no')} accessibilityHint={t('home:pending.noHint')} onPress={() => void actions.notFollowed(m, 'skipped')} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <QuickTiles snap={snap} todayTrip={todayTrip} nextTrip={nextTrip} />

      {snap.economics && snap.economics.shopping.completeness === 'completa' && snap.economics.shopping.knownCents > 0 ? (
        <Text variant="small" color={colors.inkSoft} center>
          {snap.economics.budget.weeklyLimitCents
            ? t('home:economics.budget', { amount: formatCents(snap.economics.shopping.knownCents), budget: formatCents(snap.economics.budget.weeklyLimitCents) })
            : t('home:economics', { amount: formatCents(snap.economics.shopping.knownCents) })}
        </Text>
      ) : null}
      {actions.sheet}
    </Screen>
  );
}

/** Dimensione del nome del piatto nella card: più piccola se una parola è lunga («all'amatriciana»). */
function dishFit(name: string, compact: boolean) {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length));
  const base = compact ? 20 : 24;
  const size = longest >= 15 ? base - 5 : longest >= 12 ? base - 3 : base;
  return { fontSize: size, lineHeight: Math.round(size * 1.2) };
}

/** Data breve per l'intestazione («lun 23 nov»). */
function shortToday(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(formatLocale(), { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(',', '');
}

/** Cestino pesca del banner «Ti mancano…» (come nel riferimento). */
function BasketMark() {
  return (
    <Svg width={30} height={28} viewBox="0 0 30 28" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M9 11 Q10 3 15 3 Q20 3 21 11" stroke={colors.peachInk} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d="M3 11 H27 L24 24 Q23.5 26 21.5 26 H8.5 Q6.5 26 6 24 Z" fill={colors.peach} stroke={colors.peachInk} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M11 15 V21 M15 15 V21 M19 15 V21" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Saluto: data piccola, «Buongiorno! 👋» grande e la domanda del giorno, con Mina piccola a destra (nel riferimento
 * lo spazio è vuoto: il brief chiede Mina 2.0 in Home). Mina saluta una volta all'apertura; se al pasto di oggi manca
 * qualcosa, dopo il saluto guarda la card preoccupata e la indica (una volta: la regia ignora le ripetizioni).
 */
function Greeting({ hello, subtitle, pose, compact, missing }: { hello: string; subtitle: string; pose: string; compact: boolean; missing: { key: string; count: number } | null }) {
  const { t } = useT();
  const [peek, setPeek] = useState(0);
  const [worry, setWorry] = useState<number | null>(null);
  const worried = worry !== null && !!missing;
  const afterGreeting = () => {
    const r = missing ? emitMina({ scope: 'home', kind: 'missingIngredients', key: missing.key }) : null;
    if (r) setWorry(r.id);
    else setPeek(1);
  };
  const mina = compact ? 80 : 92;
  return (
    <View style={styles.greeting}>
      <View style={styles.flex} accessible accessibilityRole="header" accessibilityLabel={`${hello} ${subtitle}`}>
        <Text variant="display" style={compact ? styles.helloCompact : styles.hello}>
          {`${hello} 👋`}
        </Text>
        <Text variant="body" color={colors.inkSoft} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      <MinaMascot
        pose={worried ? 'concerned' : pose}
        gesture={worried ? 'worry' : undefined}
        size={mina}
        animated
        interactive
        glance={peek}
        onDone={worried ? undefined : afterGreeting}
        style={styles.greetMina}
        accessibilityLabel={worried ? t('home:mina.worried', { count: missing!.count }) : t('home:mina.label')}
      />
    </View>
  );
}

/**
 * Il pasto protagonista (card orizzontale del riferimento): foto a sinistra con il cuore, a destra pasto e ora,
 * nome, tempi e persone, «Cucina ora». Le altre azioni (cambia, sposta, cucinato) dal pulsante «…» sulla foto.
 */
function TodayHero({ meal, snap, compact, onMore }: { meal: PlannedMeal; snap: AppSnapshot; compact: boolean; onMore: () => void }) {
  const { run } = useApp();
  const { t } = useT();
  const recipe = catalogIndex.recipe(meal.recipeId);
  if (!recipe) return null;
  const name = recipeName(recipe);
  const when = meal.date === snap.today ? null : meal.date === addDays(snap.today, 1) ? t('home:hero.tomorrow') : formatShortDate(meal.date);
  const open = () => router.push(`/ricetta/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`);
  // «Cucina ora» apre la Modalità Cucina: un passaggio alla volta
  const cook = () => router.push(`/cucina/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`);
  const favorite = snap.favorites.has(recipe.id);
  const startAt = minutesToHHMM(Math.max(0, meal.timeMinutes - recipe.totalMinutes));
  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      {/* foto protagonista: alta quanto la card (che segue il contenuto), mai sotto il minimo e senza tagli inutili */}
      <View style={[styles.photoCol, compact && styles.photoColCompact]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home:hero.open', { name })} onPress={open} style={styles.photoPress}>
          <RecipeImage recipe={recipe} rounded={0} aspectRatio={null} style={styles.photo} />
        </Pressable>
        <View style={styles.heartSpot}>
          <FavoriteButton on={favorite} name={name} onToggle={() => void run((s) => s.toggleFavorite(recipe.id, !favorite))} />
        </View>
        <PhotoButton icon="ellipsis-horizontal" label={t('home:hero.more')} onPress={onMore} color={colors.green} style={styles.moreSpot} />
      </View>
      {/* contenuto compatto: in alto pasto, ora e nome; in basso tempi, persone e «Cucina ora». Nessuno spazio fisso:
          lo spazio tra i due gruppi c'è solo se la foto è più alta del testo (minimo della card) */}
      <View style={styles.heroBody}>
        <View style={styles.heroHead}>
          <View style={styles.heroTop}>
            <View style={styles.mealChip}>
              <Text variant="small" color={colors.greenDark} style={styles.bold} numberOfLines={1}>
                {MEAL_LABELS[meal.mealType]}
              </Text>
            </View>
            <Text variant="heading" style={styles.time} numberOfLines={1}>
              {when ? `${when} ${minutesToHHMM(meal.timeMinutes)}` : minutesToHHMM(meal.timeMinutes)}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('home:hero.open', { name })} onPress={open}>
            {/* il titolo si adatta alla parola più lunga (mai una parola spezzata a metà) */}
            <Text variant="title" style={[styles.dish, compact && styles.dishCompact, dishFit(name, compact)]} numberOfLines={4}>
              {name}
            </Text>
          </Pressable>
        </View>
        <View style={styles.heroFoot}>
          <View style={styles.meta} accessible accessibilityLabel={t('home:hero.meta', { minutes: recipe.totalMinutes, count: meal.servings, time: startAt })}>
            <Ionicons name="time-outline" size={17} color={colors.ink} />
            <Text variant="small" style={styles.bold}>{`${recipe.totalMinutes} min`}</Text>
            <View style={styles.metaSep} />
            <Ionicons name="people-outline" size={17} color={colors.ink} />
            <Text variant="small" style={styles.bold}>{String(meal.servings)}</Text>
          </View>
          <Button label={t('home:hero.cook')} iconRight="arrow-forward" onPress={cook} />
        </View>
      </View>
    </View>
  );
}
/** Cuore sulla foto: preferita sì/no, con un piccolo rimbalzo quando si aggiunge (fermo con "Riduci movimento"). */
function FavoriteButton({ on, name, onToggle }: { on: boolean; name: string; onToggle: () => void }) {
  const reduced = useReducedMotion();
  const { t } = useT();
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
      accessibilityLabel={t(on ? 'home:fav.remove' : 'home:fav.add', { name })}
      accessibilityState={{ selected: on }}
      onPress={press}
      style={styles.heart}
      hitSlop={6}
    >
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Ionicons name={on ? 'heart' : 'heart-outline'} size={22} color={colors.danger} />
      </Animated.View>
    </Pressable>
  );
}

function EmptyHero({ snap }: { snap: AppSnapshot }) {
  const { run } = useApp();
  const { t } = useT();
  const done = snap.meals.some((m) => m.date === snap.today && m.status !== 'planned');
  return (
    <View style={[styles.heroCard, styles.emptyHero]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={done ? 'checkmark-done' : 'restaurant-outline'} size={28} color={colors.green} />
      </View>
      <Text variant="title" center>
        {t(done ? 'home:empty.done' : 'home:empty.none')}
      </Text>
      <Text variant="small" color={colors.inkSoft} center>
        {snap.issues.length > 0 ? EMPTY.noRecipes : t('home:empty.noMore')}
      </Text>
      <Button kind="secondary" label={t('action.regenerate')} onPress={() => void withLoader(LOADER_TEXT.regenerate, () => run((s, today) => s.regenerate(today)))} />
    </View>
  );
}

/**
 * «La tua settimana»: un chip per giorno (giorno breve e numero), oggi in verde. Dati veri: spunta sui giorni
 * completati, cestino pesca nei giorni di spesa. Toccando un giorno si apre il calendario.
 */
function WeekSection({ snap }: { snap: AppSnapshot }) {
  const { t } = useT();
  const start = snap.plan?.startDate ?? snap.today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const tripDates = new Set(snap.shopping.trips.filter((tr) => tr.lines.length > 0).map((tr) => tr.date));
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header" style={styles.sectionTitle}>
        {t('home:week.title')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.week} style={styles.weekScroll}>
        {days.map((d) => {
          const meals = snap.meals.filter((m) => m.date === d);
          const today = d === snap.today;
          const past = d < snap.today;
          const allDone = meals.length > 0 && meals.every((m) => m.status !== 'planned');
          return (
            <Squish
              key={d}
              accessibilityRole="button"
              accessibilityLabel={[`${formatLongDate(d)}${today ? `, ${t('home:week.today')}` : ''}: ${t('home:week.meals', { count: meals.length })}`, tripDates.has(d) ? t('home:week.shop') : null, allDone ? t('home:week.done') : null].filter(Boolean).join(', ')}
              accessibilityHint={t('home:week.hint')}
              onPress={() => router.push('/settimana')}
              style={[styles.day, today ? styles.dayToday : styles.dayOther, past && !today && styles.dayPast]}
            >
              <Text variant="small" color={today ? colors.white : colors.ink} style={styles.dayWeek}>
                {capitalize(weekdayShort(weekdayOf(d)))}
              </Text>
              <Text variant="heading" color={today ? colors.white : colors.ink} style={styles.dayNum}>
                {String(Number(d.slice(8)))}
              </Text>
              {allDone ? (
                <View style={[styles.dayMark, styles.dayMarkDone]}>
                  <Ionicons name="checkmark" size={11} color={colors.white} />
                </View>
              ) : tripDates.has(d) ? (
                <View style={[styles.dayMark, styles.dayMarkShop]}>
                  <Ionicons name="basket" size={10} color={colors.ink} />
                </View>
              ) : null}
            </Squish>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Spesa e dispensa: due accessi piccoli, sotto la settimana (non competono con il pasto). */
function QuickTiles({ snap, todayTrip, nextTrip }: { snap: AppSnapshot; todayTrip: Trip | null; nextTrip: Trip | null }) {
  const { t } = useT();
  const trip = todayTrip ?? nextTrip;
  const shopSub = todayTrip
    ? t('home:tiles.shopToday', { count: todayTrip.lines.length })
    : nextTrip
      ? t('home:tiles.shopNext', { count: nextTrip.lines.length, day: `${weekdayShort(weekdayOf(nextTrip.date))} ${Number(nextTrip.date.slice(8))}` })
      : t('home:tiles.nothing');
  const inStock = [...snap.pantry.values()].filter((e) => e.qty > 0).length;
  const short = snap.outlook.filter((o) => o.insufficient).length;
  const pantrySub = short > 0 ? t('home:tiles.short', { count: short }) : inStock > 0 ? t('home:tiles.inStock', { count: inStock }) : t('home:tiles.empty');
  return (
    <View style={styles.tiles}>
      <Tile icon="basket-outline" title={t('tabs.shopping')} sub={shopSub} onPress={() => router.push(trip ? `/spesa?trip=${trip.date}` : '/spesa')} />
      <Tile icon="file-tray-stacked-outline" title={t('tabs.pantry')} sub={pantrySub} onPress={() => router.push('/dispensa')} />
    </View>
  );
}

function Tile({ icon, title, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress: () => void }) {
  return (
    <Squish accessibilityRole="button" accessibilityLabel={`${title}: ${sub}`} onPress={onPress} outerStyle={styles.flex} style={styles.tile}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={20} color={colors.green} />
      </View>
      <View style={styles.flex}>
        <Text variant="heading" numberOfLines={1} style={styles.bold}>
          {title}
        </Text>
        <Text variant="small" color={colors.inkSoft} numberOfLines={2}>
          {sub}
        </Text>
      </View>
    </Squish>
  );
}

/** Dati non ancora caricati: la stessa forma della pagina, in grigio-verde tenue (niente salti quando arrivano). */
function HomeSkeleton() {
  return (
    <Screen contentContainerStyle={styles.content} reveal={false}>
      <Pulse style={styles.skelStack}>
        <View style={styles.header}>
          <View style={[styles.skel, { width: 120, height: 34, borderRadius: 10 }]} />
        </View>
        <View style={[styles.skel, { width: 220, height: 34, marginTop: space.md }]} />
        <View style={[styles.skel, { width: '100%', height: 250, borderRadius: radius.xl }]} />
        <View style={[styles.skel, { width: '100%', height: 56, borderRadius: radius.lg }]} />
        <View style={[styles.skel, { width: '100%', height: 80, borderRadius: radius.lg }]} />
      </Pulse>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.xs },
  skelStack: { gap: space.lg },
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 0, marginBottom: space.xs },
  headDate: { fontWeight: '700', marginRight: space.xs },
  hello: { fontSize: 33, lineHeight: 40, letterSpacing: -0.6 },
  helloCompact: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  subtitle: { fontSize: 18, lineHeight: 24, marginTop: 2 },
  greetMina: { marginBottom: -space.sm },
  // altezza dal contenuto, con un minimo perché la foto resti protagonista (prima: 286 fissi e un vuoto sotto il titolo)
  hero: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', minHeight: 214, ...shadow.float },
  heroCompact: { minHeight: 190 },
  heroCard: { backgroundColor: colors.card, borderRadius: radius.xl, ...shadow.card },
  photoCol: { width: '44%' },
  photoColCompact: { width: '40%' },
  photoPress: { flex: 1 },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heartSpot: { position: 'absolute', left: space.md, bottom: space.md },
  moreSpot: { position: 'absolute', right: space.sm, top: space.sm },
  heart: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  heroBody: { flex: 1, padding: space.md, paddingLeft: space.md + 2, gap: space.md, justifyContent: 'space-between' },
  heroHead: { gap: space.sm },
  heroFoot: { gap: space.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  mealChip: { backgroundColor: colors.sage, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  time: { fontWeight: '700', fontSize: 16, flexShrink: 1 },
  dish: { fontSize: 24, lineHeight: 29 },
  dishCompact: { fontSize: 20, lineHeight: 24 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaSep: { width: 1, height: 16, backgroundColor: colors.lineStrong, marginHorizontal: 6 },
  emptyHero: { alignItems: 'center', gap: space.md, padding: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  laterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.greenBright, marginLeft: space.xs },
  pending: { gap: space.xs, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.card, ...shadow.card },
  pendingRow: { gap: space.sm, paddingVertical: space.xs },
  section: { gap: space.md, marginTop: space.md },
  sectionTitle: { fontSize: 24, lineHeight: 30 },
  weekScroll: { marginHorizontal: -space.lg },
  week: { flexDirection: 'row', gap: space.sm + 2, paddingHorizontal: space.lg, paddingVertical: space.sm },
  day: { width: 66, minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.lg },
  dayOther: { backgroundColor: colors.card, ...shadow.card },
  dayToday: { backgroundColor: colors.green, ...shadow.float },
  dayPast: { opacity: 0.55 },
  dayWeek: { fontWeight: '700', fontSize: 16, lineHeight: 20 },
  dayNum: { fontSize: 24, lineHeight: 29, fontWeight: '800' },
  dayMark: { position: 'absolute', top: -5, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.desk },
  dayMarkDone: { backgroundColor: colors.green },
  dayMarkShop: { backgroundColor: colors.peach },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.card, minHeight: 76, ...shadow.card },
  tileIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  skel: { backgroundColor: colors.greenMist, borderRadius: 8 },
});
