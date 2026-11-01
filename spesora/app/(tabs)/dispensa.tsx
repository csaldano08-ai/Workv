import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { diffDays, formatShortDate } from '../../src/core/domain/dates';
import { EXPIRY_PRIORITY_DAYS } from '../../src/core/domain/planner';
import { Alert } from '../../src/ui/dialog';
import { formatQtyWithUnit } from '../../src/core/domain/quantity';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { t } from '../../src/i18n/it';
import { colors, radius, space } from '../../src/theme/tokens';
import { AssistantBubble } from '../../src/ui/AssistantBubble';
import { Button } from '../../src/ui/Button';
import { EMPTY } from '../../src/i18n/assistant';
import { Card } from '../../src/ui/Card';
import { Divider, Row, SectionTitle } from '../../src/ui/Row';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

export default function Pantry() {
  const { snapshot, run } = useApp();
  if (!snapshot?.profile) return <Screen>{null}</Screen>;
  const items = [...snapshot.outlook].sort((a, b) =>
    a.insufficient === b.insufficient ? catalogIndex.ingredient(a.ingredientId).name.localeCompare(catalogIndex.ingredient(b.ingredientId).name) : a.insufficient ? -1 : 1,
  );
  const quantified = items.filter((i) => !catalogIndex.ingredient(i.ingredientId).staple);
  const staples = [...snapshot.staples].filter((id) => catalogIndex.ingredients.has(id));
  const warnings = quantified.filter((i) => i.insufficient && i.available > 0);
  // In scadenza a breve e non ancora previsti in un pasto: Spesora può spostarli in cima al calendario.
  const expiring = quantified.filter((i) => {
    if (!i.expiryDate || i.available <= 0 || i.reserved > 0) return false;
    const left = diffDays(snapshot.today, i.expiryDate);
    return left >= 0 && left <= EXPIRY_PRIORITY_DAYS;
  });
  const prioritize = () =>
    Alert.alert(
      'Usare prima questi ingredienti?',
      'Spesora riorganizza i pasti futuri non ancora cucinati preferendo ricette che li usano prima della scadenza. Pasti completati, scelte manuali, acquisti e dispensa restano invariati.',
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: 'Riorganizza', onPress: () => void run((s, today) => s.regenerate(today)) },
      ],
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          Dispensa
        </Text>
        <Button compact label="Aggiungi" icon="add" onPress={() => router.push('/aggiungi')} />
      </View>
      <Text variant="small" color={colors.inkSoft}>
        Quantità confermate da spesa e correzioni; i pasti programmati non sottraggono nulla finché non confermi di averli cucinati.
      </Text>

      {warnings.length > 0 ? (
        <AssistantBubble pose="missing" size={96} title="Potrebbe non bastare" text={warnings.map((w) => catalogIndex.ingredient(w.ingredientId).name).join(', ') + ': la quantità mancante è già nella lista della spesa.'} />
      ) : null}

      {expiring.length > 0 ? (
        <AssistantBubble
          pose="thinking"
          size={96}
          title="In scadenza a breve"
          text={`${expiring.map((e) => `${catalogIndex.ingredient(e.ingredientId).name} (${formatShortDate(e.expiryDate!)})`).join(', ')}: non sono ancora previsti in un pasto.`}
        >
          <Button kind="secondary" compact icon="calendar-outline" label="Usali nei prossimi pasti" onPress={prioritize} />
        </AssistantBubble>
      ) : null}

      {quantified.length === 0 ? (
        <AssistantBubble pose="empty" text={`${EMPTY.noPantry} Puoi anche aggiungere ciò che hai già.`} />
      ) : (
        <Card style={styles.list}>
          {quantified.map((i, idx) => {
            const ing = catalogIndex.ingredient(i.ingredientId);
            const parts = [
              i.available > 0 ? `${formatQtyWithUnit(i.available, ing.unit)}${i.estimated ? ' (stima)' : ''}` : 'esaurito',
              i.reserved > 0 ? `previsti ${formatQtyWithUnit(i.reserved, ing.unit)} nei prossimi pasti` : null,
              i.expiryDate ? `scade ${formatShortDate(i.expiryDate)}` : null,
            ].filter(Boolean);
            return (
              <View key={i.ingredientId}>
                {idx > 0 ? <Divider /> : null}
                <Row
                  title={ing.name}
                  subtitle={parts.join(' · ')}
                  onPress={() => router.push(`/voce/${i.ingredientId}`)}
                  right={i.insufficient ? <Ionicons name="alert-circle-outline" size={20} color={colors.peachInk} accessibilityLabel="Potrebbe non bastare" /> : null}
                />
              </View>
            );
          })}
        </Card>
      )}

      <SectionTitle>Basi in casa (quanto basta)</SectionTitle>
      <Card style={styles.list}>
        {staples.length === 0 ? (
          <Text variant="small" color={colors.inkSoft}>
            Sale, olio, spezie e simili: segnali come presenti per non vederli in lista.
          </Text>
        ) : (
          staples.map((id, idx) => (
            <View key={id}>
              {idx > 0 ? <Divider /> : null}
              <Row title={catalogIndex.ingredient(id).name} subtitle="Presente" onPress={() => router.push(`/voce/${id}`)} />
            </View>
          ))
        )}
      </Card>
      <View style={styles.note}>
        <Text variant="small" color={colors.inkSoft}>
          {t('estimate.note')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  list: { gap: 0, paddingVertical: space.xs },
  note: { padding: space.sm, borderRadius: radius.md },
});
