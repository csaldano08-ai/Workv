import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { CheaperWeekProposal } from '../src/core/domain/budget';
import { formatLongDate } from '../src/core/domain/dates';
import { formatCents } from '../src/core/domain/prices';
import { catalogIndex, useApp } from '../src/features/app/AppProvider';
import { goBack } from '../src/features/navigation';
import { MEAL_LABELS } from '../src/i18n/labels';
import { colors } from '../src/theme/tokens';
import { AssistantBubble } from '../src/ui/AssistantBubble';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Divider, Row } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/** "Rendi questa settimana più economica": proposta da confermare, nulla cambia prima. */
export default function CheaperWeek() {
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
        <AssistantBubble pose="vuoto" text="Il calendario è già il più semplice possibile con le tue preferenze: non trovo sostituzioni che riducano la spesa senza ripetere piatti o superare i tuoi vincoli." />
        <Button kind="secondary" label="Torna alla settimana" onPress={() => goBack('/settimana')} />
      </Screen>
    );
  }
  const { before, after } = proposal;
  const summary =
    proposal.savingCents !== null
      ? `Stima: da circa ${formatCents(before.knownCents)} a circa ${formatCents(after.knownCents)} (prezzi che conosci).`
      : `Prodotti diversi da comprare: da ${before.purchases} a ${after.purchases}. Non mostro un risparmio in euro perché mancano prezzi per alcuni prodotti.`;
  const limitText = proposal.limitReached === false ? ' Anche così la stima supera il tuo limite: puoi alzare il budget o cambiare qualche preferenza.' : '';

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label={`Applica ${proposal.changes.length} sostituzioni`}
          onPress={async () => {
            await run((s) => s.applyMealChanges(proposal.changes));
            router.replace('/settimana');
          }}
        />
      }
    >
      <AssistantBubble pose="suggerimento" text={`${summary}${limitText} I pasti cucinati e gli acquisti già confermati non cambiano.`} />
      <Card style={{ gap: 0 }}>
        {proposal.changes.map((c, i) => {
          const meal = snapshot?.meals.find((m) => m.id === c.mealId);
          return (
            <View key={c.mealId}>
              {i > 0 ? <Divider /> : null}
              <Row
                title={catalogIndex.recipe(c.toRecipeId)?.name ?? c.toRecipeId}
                subtitle={`${meal ? `${MEAL_LABELS[meal.mealType]} · ${formatLongDate(meal.date)} · ` : ''}al posto di ${catalogIndex.recipe(c.fromRecipeId)?.name ?? ''}`}
              />
            </View>
          );
        })}
      </Card>
      <Text variant="small" color={colors.inkSoft}>
        Le alternative rispettano tutte le esclusioni alimentari, il tempo disponibile e il numero di persone.
      </Text>
    </Screen>
  );
}
