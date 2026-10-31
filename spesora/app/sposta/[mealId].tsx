import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { formatLongDate } from '../../src/core/domain/dates';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors } from '../../src/theme/tokens';
import { Card } from '../../src/ui/Card';
import { Notice } from '../../src/ui/Notice';
import { Divider, Row } from '../../src/ui/Row';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

/** Sposta un pasto scambiandolo con un altro dello stesso tipo. */
export default function MoveMeal() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const { snapshot, run } = useApp();
  const meal = snapshot?.meals.find((m) => m.id === mealId);
  if (!meal || !snapshot || meal.status !== 'planned') {
    return (
      <Screen edges={['bottom']}>
        <Notice tone="warning" text="Questo pasto non può più essere spostato." />
      </Screen>
    );
  }
  const targets = snapshot.meals.filter((m) => m.id !== meal.id && m.status === 'planned' && m.mealType === meal.mealType && m.date >= snapshot.today);
  return (
    <Screen edges={['bottom']}>
      <Text variant="small" color={colors.inkSoft}>
        {`Scegli con quale ${MEAL_LABELS[meal.mealType].toLowerCase()} scambiare “${catalogIndex.recipe(meal.recipeId)?.name ?? ''}”. La lista della spesa si aggiorna da sola.`}
      </Text>
      {targets.length === 0 ? <Notice text="Non ci sono altri pasti di questo tipo da scambiare." /> : null}
      <Card>
        {targets.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              title={formatLongDate(m.date)}
              subtitle={catalogIndex.recipe(m.recipeId)?.name}
              onPress={async () => {
                await run((s) => s.swapMeals(meal.id, m.id));
                router.back();
              }}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
