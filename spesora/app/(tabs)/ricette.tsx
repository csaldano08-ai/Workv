import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toStock } from '../../src/core/domain/pantry';
import { MEAL_TYPES, type Recipe } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { filterRecipes, recipeSections, type CourseFilter, type RecipeFilter } from '../../src/features/recipes/search';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { AssistantBubble } from '../../src/ui/AssistantBubble';
import { Chip } from '../../src/ui/Chip';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { SectionTitle } from '../../src/ui/Row';
import { Text } from '../../src/ui/Text';

const COURSES: { id: CourseFilter; label: string }[] = [
  { id: 'primi', label: 'Primi' },
  { id: 'secondi', label: 'Secondi' },
  { id: 'piatti_unici', label: 'Piatti unici' },
  { id: 'colazioni_dolci', label: 'Colazioni dolci' },
  { id: 'colazioni_salate', label: 'Colazioni salate' },
  { id: 'spuntini', label: 'Spuntini' },
];
const DIETS = [
  { id: 'vegetariano', label: 'Vegetariane' },
  { id: 'vegano', label: 'Vegane' },
  { id: 'pescetariano', label: 'Pescetariane' },
] as const;

export default function Recipes() {
  const { snapshot } = useApp();
  const [filter, setFilter] = useState<RecipeFilter>({ onlyCompatible: true });
  const [showFilters, setShowFilters] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);
  const profile = snapshot?.profile ?? null;
  const favorites = useMemo(() => snapshot?.favorites ?? new Set<string>(), [snapshot?.favorites]);
  const set = (patch: Partial<RecipeFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const active = !!(filter.query?.trim() || filter.meal || filter.diet || filter.maxMinutes || filter.course || filter.onlyFavorites || browseAll);

  const list = useMemo(() => (active ? filterRecipes(filter, { catalog: catalogIndex, profile, favorites }) : []), [active, filter, profile, favorites]);
  const sections = useMemo(
    () =>
      active || !snapshot
        ? []
        : recipeSections({ catalog: catalogIndex, profile, favorites, pantry: toStock(snapshot.pantry), plannedIds: new Set(snapshot.meals.map((m) => m.recipeId)), today: snapshot.today }),
    [active, snapshot, profile, favorites],
  );

  const header = (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header">
        Ricettario
      </Text>
      <View style={styles.searchRow}>
        <TextInput
          value={filter.query ?? ''}
          onChangeText={(v) => set({ query: v })}
          placeholder="Cerca per nome, ingrediente o regione"
          placeholderTextColor={colors.inkSoft}
          style={styles.input}
          accessibilityLabel="Cerca ricette"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Pressable accessibilityRole="button" accessibilityLabel={showFilters ? 'Nascondi filtri' : 'Mostra filtri'} onPress={() => setShowFilters(!showFilters)} style={[styles.filterBtn, showFilters && { backgroundColor: colors.greenSoft }]}>
          <Ionicons name="options-outline" size={22} color={colors.green} />
        </Pressable>
      </View>
      {showFilters ? (
        <View style={styles.filters}>
          <FilterRow>
            {COURSES.map((c) => (
              <Chip key={c.id} label={c.label} selected={filter.course === c.id} onPress={() => set({ course: filter.course === c.id ? null : c.id })} />
            ))}
          </FilterRow>
          <FilterRow>
            {MEAL_TYPES.map((m) => (
              <Chip key={m} label={MEAL_LABELS[m]} selected={filter.meal === m} onPress={() => set({ meal: filter.meal === m ? null : m })} />
            ))}
          </FilterRow>
          <FilterRow>
            {DIETS.map((d) => (
              <Chip key={d.id} label={d.label} selected={filter.diet === d.id} onPress={() => set({ diet: filter.diet === d.id ? null : d.id })} />
            ))}
            {[15, 30, 60].map((m) => (
              <Chip key={m} label={`≤ ${m} min`} selected={filter.maxMinutes === m} onPress={() => set({ maxMinutes: filter.maxMinutes === m ? null : m })} />
            ))}
          </FilterRow>
          <FilterRow>
            <Chip tone="peach" label="Preferite" selected={!!filter.onlyFavorites} onPress={() => set({ onlyFavorites: !filter.onlyFavorites })} />
            <Chip label="Rispetta le mie esclusioni" selected={!!filter.onlyCompatible} onPress={() => set({ onlyCompatible: !filter.onlyCompatible })} />
          </FilterRow>
        </View>
      ) : null}
      {active ? (
        <View style={styles.resultBar}>
          <Text variant="small" color={colors.inkSoft} style={styles.flex}>
            {`${list.length} ricette${filter.onlyCompatible ? ' adatte a te' : ''}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFilter({ onlyCompatible: true });
              setBrowseAll(false);
            }}
            hitSlop={8}
          >
            <Text variant="small" color={colors.green}>
              Azzera
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (!active) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {header}
          {sections.map((s) => (
            <View key={s.id} style={styles.section}>
              <SectionTitle>{s.title}</SectionTitle>
              <FlatList
                horizontal
                data={s.recipes}
                keyExtractor={(r) => r.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
                renderItem={({ item }) => <RecipeCard recipe={item} favorite={favorites.has(item.id)} />}
              />
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setBrowseAll(true)} style={styles.allBtn}>
            <Text variant="heading" color={colors.green}>
              {`Tutte le ricette (${catalogIndex.catalog.recipes.length})`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.green} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        initialNumToRender={12}
        windowSize={7}
        ListEmptyComponent={<AssistantBubble pose="empty" text="Nessuna ricetta con questi filtri. Prova a toglierne uno." />}
        renderItem={({ item }) => <RecipeRow recipe={item} favorite={favorites.has(item.id)} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.filterRow}>{children}</View>;
}

function RecipeCard({ recipe, favorite }: { recipe: Recipe; favorite: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${recipe.name}, ${recipe.totalMinutes} minuti`} onPress={() => router.push(`/ricetta/${recipe.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
      <RecipeImage recipe={recipe} rounded={12} />
      <Text variant="small" numberOfLines={2} style={styles.cardTitle}>
        {recipe.name}
      </Text>
      <Text variant="caption" color={colors.inkSoft}>
        {`${recipe.totalMinutes} MIN${favorite ? ' · PREFERITA' : ''}`}
      </Text>
    </Pressable>
  );
}

function RecipeRow({ recipe, favorite }: { recipe: Recipe; favorite: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${recipe.name}, ${recipe.totalMinutes} minuti${favorite ? ', preferita' : ''}`}
      onPress={() => router.push(`/ricetta/${recipe.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <RecipeImage variant="thumb" recipe={recipe} style={styles.thumb} rounded={12} />
      <View style={styles.flex}>
        <Text variant="heading" numberOfLines={2}>
          {recipe.name}
        </Text>
        <Text variant="small" color={colors.inkSoft}>
          {`${recipe.totalMinutes} min · ${recipe.mealTypes.map((m) => MEAL_LABELS[m]).join(', ')}`}
        </Text>
      </View>
      {favorite ? <Ionicons name="heart" size={18} color={colors.peach} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: space.lg, paddingBottom: space.xxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: space.md, marginBottom: space.md },
  searchRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  filterBtn: { width: TOUCH + 4, height: TOUCH + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  filters: { gap: space.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  resultBar: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: TOUCH + 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  section: { gap: space.sm, marginBottom: space.md },
  carousel: { gap: space.md, paddingRight: space.lg },
  card: { width: 150, gap: 4 },
  cardTitle: { fontWeight: '600' },
  allBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: TOUCH, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72 },
  thumb: { width: 88, aspectRatio: 4 / 3 },
  flex: { flex: 1, gap: 2 },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: space.sm },
});
