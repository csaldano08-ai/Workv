import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import { formatLongDate } from '../../src/core/domain/dates';
import { checkHardConstraints } from '../../src/core/domain/planner';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { MEAL_LABELS } from '../../src/i18n/labels';
import { colors } from '../../src/theme/tokens';
import { Card } from '../../src/ui/Card';
import { Notice } from '../../src/ui/Notice';
import { Divider, Row } from '../../src/ui/Row';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

/** Ripete una ricetta in un altro giorno, sostituendo il pasto scelto. */
export default function RepeatRecipe() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { snapshot, run } = useApp();
  const recipe = catalogIndex.recipe(String(recipeId));
  if (!recipe || !snapshot?.profile) return <Screen edges={['bottom']}>{null}</Screen>;
  const violations = checkHardConstraints(recipe, snapshot.profile, catalogIndex);
  const slots = snapshot.meals.filter((m) => m.status === 'planned' && m.date >= snapshot.today && recipe.mealTypes.includes(m.mealType) && m.recipeId !== recipe.id);
  return (
    <Screen edges={['bottom']}>
      <Text variant="small" color={colors.inkSoft}>
        {`Scegli il pasto da sostituire con “${recipe.name}”.`}
      </Text>
      {violations.length > 0 ? (
        <Notice tone="warning" title="Ricetta non compatibile" text="Questa ricetta contiene ingredienti che hai escluso o richiede strumenti non indicati: non può essere aggiunta al calendario." />
      ) : (
        <>
          {slots.length === 0 ? <Notice text="Nessun pasto compatibile da sostituire in questo calendario." /> : null}
          <Card>
            {slots.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Divider /> : null}
                <Row
                  title={`${MEAL_LABELS[m.mealType]} · ${formatLongDate(m.date)}`}
                  subtitle={`Ora: ${catalogIndex.recipe(m.recipeId)?.name ?? ''}`}
                  onPress={async () => {
                    await run((s) => s.replaceRecipe(m.id, recipe.id, 'repeat'));
                    Alert.alert('Fatto', `${recipe.name} aggiunta a ${formatLongDate(m.date)}.`);
                    router.back();
                  }}
                />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
