import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { CheaperWeekProposal } from '../src/core/domain/budget';
import { formatLongDate } from '../src/core/domain/dates';
import { formatCents } from '../src/core/domain/prices';
import { catalogIndex, useApp } from '../src/features/app/AppProvider';
import { goBack } from '../src/features/navigation';
import { useT } from '../src/i18n';
import { recipeName } from '../src/i18n/content';
import { MEAL_LABELS } from '../src/i18n/labels';
import { colors } from '../src/theme/tokens';
import { AssistantBubble } from '../src/ui/AssistantBubble';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Divider, Row } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

function nameOf(recipeId: string): string | undefined {
  const r = catalogIndex.recipe(recipeId);
  return r ? recipeName(r) : undefined;
}

/** "Rendi questa settimana più economica": proposta da confermare, nulla cambia prima. */
export default function CheaperWeek() {
  const { t } = useT();
  const { service, snapshot, run } = useApp();
  const [proposal, setProposal] = useState<CheaperWeekProposal | null | undefined>(undefined);

  useEffect(() => {
    if (!service || !snapshot) return;
    let alive = true;
    void service.previewCheaperWeek(snapshot.today).then((p) => alive && setProposal(p)).catch(() => alive && setProposal(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  if (proposal === undefined) return <Screen edges={['bottom']}><ActivityIndicator color={colors.green} /></Screen>;
  if (!proposal || proposal.changes.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <AssistantBubble pose="happy" text={t('week:cheaper.nothing')} />
        <Button kind="secondary" label={t('week:cheaper.back')} onPress={() => goBack('/settimana')} />
      </Screen>
    );
  }
  const { before, after } = proposal;
  const summary =
    proposal.savingCents !== null
      ? t('week:cheaper.estimate', { before: formatCents(before.knownCents), after: formatCents(after.knownCents) })
      : t('week:cheaper.purchases', { before: before.purchases, after: after.purchases });
  const limitText = proposal.limitReached === false ? ` ${t('week:cheaper.overLimit')}` : '';

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label={t('week:cheaper.apply', { count: proposal.changes.length })}
          onPress={async () => {
            await run((s) => s.applyMealChanges(proposal.changes));
            router.replace('/settimana');
          }}
        />
      }
    >
      <AssistantBubble pose="savings" text={`${summary}${limitText} ${t('week:cheaper.unchanged')}`} />
      <Card style={{ gap: 0 }}>
        {proposal.changes.map((c, i) => {
          const meal = snapshot?.meals.find((m) => m.id === c.mealId);
          return (
            <View key={c.mealId}>
              {i > 0 ? <Divider /> : null}
              <Row
                title={nameOf(c.toRecipeId) ?? c.toRecipeId}
                subtitle={`${meal ? `${MEAL_LABELS[meal.mealType]} · ${formatLongDate(meal.date)} · ` : ''}${t('week:cheaper.instead', { recipe: nameOf(c.fromRecipeId) ?? '' })}`}
              />
            </View>
          );
        })}
      </Card>
      <Text variant="small" color={colors.inkSoft}>
        {t('week:cheaper.footnote')}
      </Text>
    </Screen>
  );
}
