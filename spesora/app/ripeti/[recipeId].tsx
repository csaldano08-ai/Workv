import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/features/navigation';
import { View } from 'react-native';
import { formatLongDate } from '../../src/core/domain/dates';
import { checkHardConstraints } from '../../src/core/domain/planner';
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
import { toast } from '../../src/ui/toast';

function currentName(recipeId: string): string {
  const r = catalogIndex.recipe(recipeId);
  return r ? recipeName(r) : '';
}

/** Ripete una ricetta in un altro giorno, sostituendo il pasto scelto. */
export default function RepeatRecipe() {
  const { t } = useT();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { snapshot, run } = useApp();
  const recipe = catalogIndex.recipe(String(recipeId));
  if (!recipe || !snapshot?.profile) return <Screen edges={['bottom']}>{null}</Screen>;
  const name = recipeName(recipe);
  const violations = checkHardConstraints(recipe, snapshot.profile, catalogIndex);
  const slots = snapshot.meals.filter((m) => m.status === 'planned' && m.date >= snapshot.today && recipe.mealTypes.includes(m.mealType) && m.recipeId !== recipe.id);
  return (
    <Screen edges={['bottom']}>
      <Text variant="small" color={colors.inkSoft}>
        {t('week:repeat.intro', { recipe: name })}
      </Text>
      {violations.length > 0 ? (
        <Notice tone="warning" title={t('week:repeat.incompatibleTitle')} text={t('week:repeat.incompatibleText')} />
      ) : (
        <>
          {slots.length === 0 ? <Notice text={t('week:repeat.none')} /> : null}
          <Card>
            {slots.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Divider /> : null}
                <Row
                  title={`${MEAL_LABELS[m.mealType]} · ${formatLongDate(m.date)}`}
                  subtitle={t('week:repeat.current', { recipe: currentName(m.recipeId) })}
                  onPress={async () => {
                    await run((s) => s.replaceRecipe(m.id, recipe.id, 'repeat'));
                    toast(t('week:repeat.added', { recipe: name, date: formatLongDate(m.date) }));
                    goBack('/settimana');
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
