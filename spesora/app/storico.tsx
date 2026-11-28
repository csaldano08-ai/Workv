import { View } from 'react-native';
import { formatLongDate } from '../src/core/domain/dates';
import { catalogIndex, useApp } from '../src/features/app/AppProvider';
import { MEAL_LABELS } from '../src/i18n/labels';
import { useT } from '../src/i18n';
import { recipeName } from '../src/i18n/content';
import { AssistantBubble } from '../src/ui/AssistantBubble';
import { Card } from '../src/ui/Card';
import { EMPTY } from '../src/i18n/assistant';
import { Divider, Row } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';

export default function History() {
  const { snapshot } = useApp();
  const { t } = useT();
  const history = snapshot?.history ?? [];
  return (
    <Screen edges={['bottom']}>
      {history.length === 0 ? (
        <AssistantBubble pose="empty" text={EMPTY.noHistory} />
      ) : (
        <Card style={{ gap: 0 }}>
          {history.map((h, i) => {
            const recipe = catalogIndex.recipe(h.recipeId);
            return (
              <View key={`${h.date}-${h.mealType}`}>
                {i > 0 ? <Divider /> : null}
                <Row
                  title={recipe ? recipeName(recipe) : h.recipeId}
                  subtitle={`${MEAL_LABELS[h.mealType]} · ${formatLongDate(h.date)} · ${t(`status.${h.outcome}`)}`}
                />
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
