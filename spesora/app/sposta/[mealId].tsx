import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/features/navigation';
import { View } from 'react-native';
import { formatLongDate } from '../../src/core/domain/dates';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { useT } from '../../src/i18n';
import { recipeName } from '../../src/i18n/content';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors } from '../../src/theme/tokens';
import { Card } from '../../src/ui/Card';
import { Notice } from '../../src/ui/Notice';
import { Divider, Row } from '../../src/ui/Row';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

function targetName(recipeId: string): string | undefined {
  const r = catalogIndex.recipe(recipeId);
  return r ? recipeName(r) : undefined;
}

/** Sposta un pasto scambiandolo con un altro dello stesso tipo. */
export default function MoveMeal() {
  const { t, language } = useT();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const { snapshot, run } = useApp();
  const meal = snapshot?.meals.find((m) => m.id === mealId);
  if (!meal || !snapshot || meal.status !== 'planned') {
    return (
      <Screen edges={['bottom']}>
        <Notice tone="warning" text={t('week:move.locked')} />
      </Screen>
    );
  }
  const recipe = catalogIndex.recipe(meal.recipeId);
  // in tedesco i nomi comuni restano maiuscoli
  const mealLabel = language === 'de' ? MEAL_LABELS[meal.mealType] : MEAL_LABELS[meal.mealType].toLowerCase();
  const targets = snapshot.meals.filter((m) => m.id !== meal.id && m.status === 'planned' && m.mealType === meal.mealType && m.date >= snapshot.today);
  return (
    <Screen edges={['bottom']}>
      <Text variant="small" color={colors.inkSoft}>
        {t('week:move.intro', { meal: mealLabel, recipe: recipe ? recipeName(recipe) : '' })}
      </Text>
      {targets.length === 0 ? <Notice text={t('week:move.none')} /> : null}
      <Card>
        {targets.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              title={formatLongDate(m.date)}
              subtitle={targetName(m.recipeId)}
              onPress={async () => {
                await run((s) => s.swapMeals(meal.id, m.id));
                goBack('/settimana');
              }}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
