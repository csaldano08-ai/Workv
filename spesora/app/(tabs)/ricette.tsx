import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toStock } from '../../src/core/domain/pantry';
import { MEAL_TYPES, type Recipe } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { filterRecipes, recipeSections, type ContentNames, type CourseFilter, type RecipeFilter } from '../../src/features/recipes/search';
import { useT } from '../../src/i18n';
import { ingredientName, recipeName } from '../../src/i18n/content';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors, font, radius, shadow, space } from '../../src/theme/tokens';
import { Chip } from '../../src/ui/Chip';
import { Squish } from '../../src/ui/Squish';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { MinaChefTransform } from '../../src/ui/mascot/MinaChefTransform';
import { firstTimeThisSession, markSeenThisSession } from '../../src/ui/mascot/director';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { AppHeader, ScreenTitle } from '../../src/ui/mina/kit';
import { ChoiceArt, type ChoiceArtName } from '../../src/ui/mina/ChoiceArt';
import { Text } from '../../src/ui/Text';

/** Etichette come chiavi (namespace `recipes`): tradotte al momento del disegno, nella lingua corrente. */
const COURSES: { id: CourseFilter; labelKey: string }[] = [
  { id: 'primi', labelKey: 'recipes:course.primi' },
  { id: 'secondi', labelKey: 'recipes:course.secondi' },
  { id: 'piatti_unici', labelKey: 'recipes:course.piatti_unici' },
  { id: 'colazioni_dolci', labelKey: 'recipes:course.colazioni_dolci' },
  { id: 'colazioni_salate', labelKey: 'recipes:course.colazioni_salate' },
  { id: 'spuntini', labelKey: 'recipes:course.spuntini' },
];
const DIETS = [
  { id: 'vegetariano', labelKey: 'recipes:diet.vegetariano' },
  { id: 'vegano', labelKey: 'recipes:diet.vegano' },
  { id: 'pescetariano', labelKey: 'recipes:diet.pescetariano' },
] as const;

/** Tessere delle categorie (le prime quattro come nel riferimento; le altre sono funzioni già esistenti). */
type TileId = 'tutte' | CourseFilter | 'veg' | 'veloci' | 'dispensa' | 'idee' | 'preferite';
const TILES: { id: TileId; labelKey: string; icon: keyof typeof Ionicons.glyphMap; art?: ChoiceArtName }[] = [
  { id: 'tutte', labelKey: 'recipes:tile.tutte', icon: 'grid-outline' },
  { id: 'primi', labelKey: 'recipes:tile.primi', icon: 'restaurant-outline', art: 'pranzo' },
  { id: 'secondi', labelKey: 'recipes:tile.secondi', icon: 'flame-outline', art: 'onnivoro' },
  { id: 'veg', labelKey: 'recipes:tile.veg', icon: 'leaf-outline', art: 'vegano' },
  { id: 'idee', labelKey: 'recipes:tile.idee', icon: 'sparkles-outline' },
  { id: 'dispensa', labelKey: 'recipes:tile.dispensa', icon: 'file-tray-stacked-outline' },
  { id: 'veloci', labelKey: 'recipes:tile.veloci', icon: 'timer-outline' },
  { id: 'preferite', labelKey: 'recipes:tile.preferite', icon: 'heart-outline' },
  { id: 'piatti_unici', labelKey: 'recipes:tile.piatti_unici', icon: 'pizza-outline' },
  { id: 'colazioni_dolci', labelKey: 'recipes:tile.colazioni_dolci', icon: 'cafe-outline' },
  { id: 'spuntini', labelKey: 'recipes:tile.spuntini', icon: 'nutrition-outline' },
];

export default function Recipes() {
  const { t, language } = useT();
  const { snapshot, run } = useApp();
  // la prima volta in questa sessione Mina indossa cappello e grembiule (trasformazione in Mina Chef);
  // alle aperture successive Mina Chef fa solo il suo ingresso breve (solleva il cucchiaio, strizza l'occhio)
  const [chefMode, setChefMode] = useState<'transform' | 'chef'>(() => (firstTimeThisSession('chef-transform') ? 'transform' : 'chef'));
  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setVisit((n) => n + 1);
      if (!firstTimeThisSession('chef-transform')) setChefMode('chef');
    }, []),
  );
  const [tile, setTile] = useState<TileId>('tutte');
  const [filter, setFilter] = useState<RecipeFilter>({ onlyCompatible: true });
  const [showFilters, setShowFilters] = useState(false);
  const profile = snapshot?.profile ?? null;
  const favorites = useMemo(() => snapshot?.favorites ?? new Set<string>(), [snapshot?.favorites]);
  const set = (patch: Partial<RecipeFilter>) => setFilter((f) => ({ ...f, ...patch }));
  // nomi nella lingua dell'interfaccia: la ricerca trova sia quelli tradotti sia gli originali italiani
  const names = useMemo<ContentNames>(() => ({ lang: language, recipeName, ingredientName }), [language]);
  // le sezioni «Idee per questa settimana» e «Con ciò che hai in dispensa» diventano tessere (stessi dati di prima)
  const sections = useMemo(
    () => (snapshot ? recipeSections({ catalog: catalogIndex, profile, favorites, names, pantry: toStock(snapshot.pantry), plannedIds: new Set(snapshot.meals.map((m) => m.recipeId)), today: snapshot.today }) : []),
    [snapshot, profile, favorites, names],
  );
  const list = useMemo(() => {
    const tileFilter: Partial<RecipeFilter> =
      tile === 'veg'
        ? { diet: 'vegetariano' }
        : tile === 'veloci'
          ? { maxMinutes: 15 }
          : tile === 'preferite'
            ? { onlyFavorites: true }
            : tile === 'tutte' || tile === 'dispensa' || tile === 'idee'
              ? {}
              : { course: tile };
    const merged = { ...filter, ...tileFilter };
    const all = filterRecipes(merged, { catalog: catalogIndex, profile, favorites, names });
    if (tile === 'dispensa' || tile === 'idee') {
      const ids = new Set((sections.find((x) => x.id === tile)?.recipes ?? []).map((r) => r.id));
      return all.filter((r) => ids.has(r.id));
    }
    return all;
  }, [tile, filter, profile, favorites, sections, names]);
  const servings = profile?.servings ?? 2;
  const toggleFav = (id: string) => void run((s) => s.toggleFavorite(id, !favorites.has(id)));
  const filtersOn = !!(filter.meal || filter.diet || filter.maxMinutes || filter.course || filter.onlyFavorites || !filter.onlyCompatible);

  const header = (
    <View style={styles.header}>
      <AppHeader />
      <ScreenTitle
        title={t('recipes:title')}
        right={
          chefMode === 'transform' ? (
            <MinaChefTransform size={72} play onDone={() => markSeenThisSession('chef-transform')} style={styles.chef} />
          ) : (
            <MinaMascot pose="cooking" size={72} animated replayKey={visit} style={styles.chef} />
          )
        }
      />
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={22} color={colors.ink} />
          <TextInput
            value={filter.query ?? ''}
            onChangeText={(v) => set({ query: v })}
            placeholder={t('recipes:search.placeholder')}
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            accessibilityLabel={t('recipes:search.a11y')}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <Squish accessibilityRole="button" accessibilityLabel={showFilters ? t('recipes:filters.hide') : t('recipes:filters.show')} accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters(!showFilters)} style={[styles.filterBtn, (showFilters || filtersOn) && styles.filterBtnOn]}>
          <Ionicons name="funnel-outline" size={22} color={colors.greenDark} />
          {filtersOn ? <View style={styles.filterDot} /> : null}
        </Squish>
      </View>
      {showFilters ? (
        <View style={styles.filters}>
          <FilterRow>
            {MEAL_TYPES.map((m) => (
              <Chip key={m} label={MEAL_LABELS[m]} selected={filter.meal === m} onPress={() => set({ meal: filter.meal === m ? null : m })} />
            ))}
          </FilterRow>
          <FilterRow>
            {DIETS.map((d) => (
              <Chip key={d.id} label={t(d.labelKey)} selected={filter.diet === d.id} onPress={() => set({ diet: filter.diet === d.id ? null : d.id })} />
            ))}
            {[15, 30, 60].map((m) => (
              <Chip key={m} label={t('recipes:filter.maxMinutes', { minutes: m })} selected={filter.maxMinutes === m} onPress={() => set({ maxMinutes: filter.maxMinutes === m ? null : m })} />
            ))}
          </FilterRow>
          <FilterRow>
            {COURSES.map((c) => (
              <Chip key={c.id} label={t(c.labelKey)} selected={filter.course === c.id} onPress={() => set({ course: filter.course === c.id ? null : c.id })} />
            ))}
          </FilterRow>
          <FilterRow>
            <Chip tone="peach" label={t('recipes:filter.favorites')} selected={!!filter.onlyFavorites} onPress={() => set({ onlyFavorites: !filter.onlyFavorites })} />
            <Chip label={t('recipes:filter.compatible')} selected={!!filter.onlyCompatible} onPress={() => set({ onlyCompatible: !filter.onlyCompatible })} />
          </FilterRow>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles} style={styles.tilesScroll} keyboardShouldPersistTaps="handled" accessibilityRole="tablist">
        {TILES.map((tl) => {
          const on = tl.id === tile;
          const label = t(tl.labelKey, { minutes: 15 });
          return (
            <Squish key={tl.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => setTile(tl.id)} style={[styles.tile, on ? styles.tileOn : styles.tileOff]}>
              {tl.art ? <ChoiceArt name={tl.art} size={44} /> : <Ionicons name={on ? (tl.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : tl.icon} size={32} color={on ? colors.white : colors.green} />}
              <Text variant="small" color={on ? colors.white : colors.ink} style={styles.tileText} numberOfLines={1}>
                {label}
              </Text>
            </Squish>
          );
        })}
      </ScrollView>
      <View style={styles.resultBar}>
        <Text variant="small" color={colors.inkSoft} style={styles.flex}>
          {t(filter.onlyCompatible ? 'recipes:results.forYou' : 'recipes:results.count', { count: list.length })}
        </Text>
        {filtersOn || filter.query ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFilter({ onlyCompatible: true });
              setTile('tutte');
            }}
            hitSlop={8}
          >
            <Text variant="small" color={colors.green} style={styles.bold}>
              {t('recipes:filters.reset')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MinaMascot pose="thinking" size={100} />
            <Text variant="body" color={colors.inkSoft} center>
              {t('recipes:empty')}
            </Text>
          </View>
        }
        renderItem={({ item }) => <RecipeCard recipe={item} favorite={favorites.has(item.id)} servings={servings} onFavorite={() => toggleFav(item.id)} />}
      />
    </SafeAreaView>
  );
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.filterRow}>{children}</View>;
}

/** Card della griglia: foto con il cuore, nome, tempo e persone (come nel riferimento). */
function RecipeCard({ recipe, favorite, servings, onFavorite }: { recipe: Recipe; favorite: boolean; servings: number; onFavorite: () => void }) {
  const { t } = useT();
  const name = recipeName(recipe);
  return (
    <Squish accessibilityRole="button" accessibilityLabel={t(favorite ? 'recipes:card.a11yFavorite' : 'recipes:card.a11y', { name, minutes: recipe.totalMinutes })} onPress={() => router.push(`/ricetta/${recipe.id}`)} outerStyle={styles.cardOuter} style={styles.card}>
      <View>
        {/* miniatura 320×240: nitida a questa misura e molto più leggera da decodificare dell'immagine grande */}
        <RecipeImage variant="thumb" recipe={recipe} rounded={0} aspectRatio={1.08} />
        <Pressable accessibilityRole="button" accessibilityLabel={favorite ? t('recipes:favorite.removeNamed', { name }) : t('recipes:favorite.addNamed', { name })} accessibilityState={{ selected: favorite }} onPress={onFavorite} hitSlop={6} style={styles.heart}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={19} color={colors.danger} />
        </Pressable>
      </View>
      <View style={styles.cardBody}>
        <Text variant="heading" numberOfLines={2} style={styles.cardTitle}>
          {name}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={15} color={colors.ink} />
          <Text variant="small">{t('recipes:time.minutes', { minutes: recipe.totalMinutes })}</Text>
          <Ionicons name="people-outline" size={15} color={colors.ink} style={styles.metaGap} />
          <Text variant="small">{String(servings)}</Text>
        </View>
      </View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.desk },
  content: { padding: space.lg, paddingTop: 0, paddingBottom: space.xxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: space.lg, marginBottom: space.md },
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  chef: { marginTop: -18, marginBottom: -10 },
  searchRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 54, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow.card },
  input: { flex: 1, minHeight: 50, fontSize: 17, color: colors.ink, fontFamily: font.regular },
  filterBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  filterBtnOn: { backgroundColor: colors.sage },
  filterDot: { position: 'absolute', top: 12, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.peach },
  filters: { gap: space.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tilesScroll: { marginHorizontal: -space.lg },
  tiles: { gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.xs },
  tile: { width: 82, height: 94, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tileOn: { backgroundColor: colors.green, ...shadow.float },
  tileOff: { backgroundColor: colors.card, ...shadow.card },
  tileText: { fontWeight: '800', fontSize: 15 },
  resultBar: { flexDirection: 'row', alignItems: 'center', marginTop: -space.xs },
  gridRow: { gap: space.md, marginBottom: space.md },
  cardOuter: { flex: 1, maxWidth: '50%' },
  card: { borderRadius: radius.xl, backgroundColor: colors.card, overflow: 'hidden', ...shadow.card },
  heart: { position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: space.md, gap: 6 },
  cardTitle: { fontWeight: '800', fontSize: 18, lineHeight: 23 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaGap: { marginLeft: space.sm },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
});
