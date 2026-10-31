import { View } from 'react-native';
import { formatLongDate } from '../src/core/domain/dates';
import { catalogIndex, useApp } from '../src/features/app/AppProvider';
import { MEAL_LABELS } from '../src/i18n/labels';
import { t } from '../src/i18n/it';
import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { Divider, Row } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

export default function History() {
  const { snapshot } = useApp();
  const history = snapshot?.history ?? [];
  return (
    <Screen edges={['bottom']}>
      {history.length === 0 ? (
        <Text variant="body" color={colors.inkSoft}>
          Lo storico si riempie quando confermi i pasti come cucinati o non seguiti.
        </Text>
      ) : (
        <Card style={{ gap: 0 }}>
          {history.map((h, i) => (
            <View key={`${h.date}-${h.mealType}`}>
              {i > 0 ? <Divider /> : null}
              <Row
                title={catalogIndex.recipe(h.recipeId)?.name ?? h.recipeId}
                subtitle={`${MEAL_LABELS[h.mealType]} · ${formatLongDate(h.date)} · ${t(`status.${h.outcome}`)}`}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
