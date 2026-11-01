import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/features/navigation';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { formatLongDate } from '../../src/core/domain/dates';
import type { ScoredCandidate } from '../../src/core/domain/planner';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors, space } from '../../src/theme/tokens';
import { Card } from '../../src/ui/Card';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

export default function ReplaceMeal() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const { snapshot, service, run } = useApp();
  const meal = snapshot?.meals.find((m) => m.id === mealId);
  const [alts, setAlts] = useState<ScoredCandidate[] | null>(null);

  useEffect(() => {
    if (!service || !meal || !snapshot) return;
    let alive = true;
    void service.alternatives(meal.id, snapshot.today, 10).then((a) => alive && setAlts(a)).catch(() => alive && setAlts([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, meal?.id]);

  if (!meal || meal.status !== 'planned') {
    return (
      <Screen edges={['bottom']}>
        <Notice tone="warning" text="Questo pasto non può più essere modificato." />
      </Screen>
    );
  }
  const current = catalogIndex.recipe(meal.recipeId);

  return (
    <Screen edges={['bottom']}>
      <Text variant="small" color={colors.inkSoft}>
        {`${MEAL_LABELS[meal.mealType]} di ${formatLongDate(meal.date)} · ora: ${current?.name ?? ''}. Le alternative rispettano tutte le tue esclusioni; in alto quelle che usano ciò che hai già.`}
      </Text>
      {alts === null ? <ActivityIndicator color={colors.green} /> : null}
      {alts && alts.length === 0 ? <Notice tone="warning" text="Nessuna alternativa compatibile con le tue preferenze per questo pasto." /> : null}
      {alts?.map((a) => (
        <Pressable
          key={a.recipe.id}
          accessibilityRole="button"
          accessibilityLabel={`Scegli ${a.recipe.name}, ${a.recipe.totalMinutes} minuti`}
          onPress={async () => {
            await run((s) => s.replaceRecipe(meal.id, a.recipe.id));
            goBack('/settimana');
          }}
        >
          {({ pressed }) => (
            <Card style={[styles.card, pressed && { borderColor: colors.green }]}>
              <View style={styles.row}>
                <RecipeImage variant="thumb" recipe={a.recipe} style={styles.thumb} rounded={10} />
                <View style={styles.flex}>
                  <Text variant="heading">{a.recipe.name}</Text>
                  <Text variant="small" color={colors.inkSoft}>
                    {a.reasons.slice(0, 2).join(' · ')}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 72, aspectRatio: 1.25 },
  flex: { flex: 1, gap: 2 },
});
