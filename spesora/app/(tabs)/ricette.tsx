import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalizeText } from '../../src/core/domain/catalog';
import { checkHardConstraints } from '../../src/core/domain/planner';
import { MEAL_TYPES, type MealType, type Recipe } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { DISH_LABELS, EQUIPMENT_LABELS, MEAL_LABELS } from '../../src/i18n/labels';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { AssistantBubble } from '../../src/ui/AssistantBubble';
import { Chip } from '../../src/ui/Chip';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Text } from '../../src/ui/Text';

export default function Recipes() {
  const { snapshot } = useApp();
  const [query, setQuery] = useState('');
  const [meal, setMeal] = useState<MealType | null>(null);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const profile = snapshot?.profile ?? null;

  const list = useMemo(() => {
    const q = normalizeText(query);
    return catalogIndex.catalog.recipes
      .filter((r) => {
        if (meal && !r.mealTypes.includes(meal)) return false;
        if (maxMinutes && r.totalMinutes > maxMinutes) return false;
        if (onlyFav && !snapshot?.favorites.has(r.id)) return false;
        if (onlyCompatible && profile && checkHardConstraints(r, profile, catalogIndex).length > 0) return false;
        if (q) {
          const hay = [r.name, r.description, DISH_LABELS[r.dishCategory], ...r.equipment.map((e) => EQUIPMENT_LABELS[e]), ...r.ingredients.flatMap((i) => {
            const ing = catalogIndex.ingredient(i.ingredientId);
            return [ing.name, ...ing.aliases];
          })].map(normalizeText);
          if (!hay.some((h) => h.includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [query, meal, maxMinutes, onlyFav, onlyCompatible, profile, snapshot?.favorites]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              Ricettario
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca per nome, ingrediente o strumento"
              placeholderTextColor={colors.inkSoft}
              style={styles.input}
              accessibilityLabel="Cerca ricette"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.filters}>
              {MEAL_TYPES.map((m) => (
                <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(meal === m ? null : m)} />
              ))}
              {[15, 30].map((m) => (
                <Chip key={m} label={`≤ ${m} min`} selected={maxMinutes === m} onPress={() => setMaxMinutes(maxMinutes === m ? null : m)} />
              ))}
              <Chip tone="peach" label="Preferite" selected={onlyFav} onPress={() => setOnlyFav(!onlyFav)} />
              <Chip label="Adatte a me" selected={onlyCompatible} onPress={() => setOnlyCompatible(!onlyCompatible)} />
            </View>
            <Text variant="small" color={colors.inkSoft}>
              {`${list.length} ricette`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <AssistantBubble pose="vuoto" text="Nessuna ricetta con questi filtri. Prova a toglierne uno." />
        }
        renderItem={({ item }) => <RecipeRow recipe={item} favorite={snapshot?.favorites.has(item.id) ?? false} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
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
      <RecipeImage recipe={recipe} style={styles.thumb} rounded={12} />
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: {
    minHeight: TOUCH + 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72 },
  thumb: { width: 88, aspectRatio: 1.25 },
  flex: { flex: 1, gap: 2 },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: space.sm },
});
