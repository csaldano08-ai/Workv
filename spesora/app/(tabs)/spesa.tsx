import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { capitalize, formatLongDate, formatShortDate, weekdayOf, weekdayShort } from '../../src/core/domain/dates';
import { formatQtyWithUnit, toMilli } from '../../src/core/domain/quantity';
import type { ShoppingLine, ShoppingTripPlan } from '../../src/core/domain/shopping';
import { SHOPPING_CATEGORIES } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { checkKey } from '../../src/features/app/SpesoraService';
import { CATEGORY_LABELS } from '../../src/i18n/labels';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Chip, ChipGroup } from '../../src/ui/Chip';
import { Notice } from '../../src/ui/Notice';
import { SectionTitle } from '../../src/ui/Row';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

const tripKey = (tr: ShoppingTripPlan) => `${tr.isInitial ? 'i' : 'r'}_${tr.date}`;

export default function Shopping() {
  const { trip } = useLocalSearchParams<{ trip?: string }>();
  const { snapshot, run } = useApp();
  const trips = snapshot?.shopping.trips ?? [];
  // La scelta manuale vale finché non arriva un nuovo parametro `trip` (es. da una notifica).
  const [choice, setChoice] = useState<{ forTrip: string | undefined; key: string } | null>(null);
  const selected = choice && choice.forTrip === trip ? choice.key : null;
  const setSelected = (key: string) => setChoice({ forTrip: trip, key });
  const fromParam = trip ? (trips.find((tr) => tr.date === trip && !tr.isInitial) ?? trips.find((tr) => tr.date === trip)) : undefined;

  if (!snapshot?.profile) return <Screen>{null}</Screen>;
  const current = trips.find((tr) => tripKey(tr) === selected) ?? fromParam ?? trips[0];

  return (
    <Screen
      footer={current ? <ConfirmBar trip={current} /> : undefined}
    >
      <Text variant="title" accessibilityRole="header">
        Spesa
      </Text>
      {trips.length === 0 ? (
        <Card>
          <Text variant="heading">Non serve comprare nulla</Text>
          <Text variant="small" color={colors.inkSoft}>
            Secondo la dispensa confermata hai tutto il necessario per i pasti in programma.
          </Text>
        </Card>
      ) : (
        <>
          <ChipGroup>
            {trips.map((tr) => (
              <Chip
                key={tripKey(tr)}
                tone="peach"
                label={tr.isInitial ? 'Spesa iniziale' : `${weekdayShort(weekdayOf(tr.date))} ${formatShortDate(tr.date)}`}
                selected={current ? tripKey(current) === tripKey(tr) : false}
                onPress={() => setSelected(tripKey(tr))}
              />
            ))}
          </ChipGroup>
          {current ? <TripView trip={current} /> : null}
        </>
      )}

      {snapshot.shopping.covered.length > 0 ? (
        <>
          <SectionTitle>Già in dispensa, non da comprare</SectionTitle>
          <Card>
            {snapshot.shopping.covered.map((c) => {
              const ing = catalogIndex.ingredient(c.ingredientId);
              return (
                <View key={c.ingredientId} style={styles.coveredRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                  <Text variant="small" style={styles.flex}>
                    {ing.name}
                  </Text>
                  <Text variant="small" color={colors.inkSoft}>
                    {`${formatQtyWithUnit(c.qty, ing.unit)} previsti`}
                  </Text>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {snapshot.profile.weeklyBudgetCents !== null ? (
        <Text variant="small" color={colors.inkSoft}>
          {`Budget indicato: ${(snapshot.profile.weeklyBudgetCents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} a settimana. Spesora non conosce i prezzi dei negozi e non stima il costo della lista.`}
        </Text>
      ) : null}
      {snapshot.confirmedTrips.length > 0 ? (
        <Text variant="small" color={colors.inkSoft}>
          {`Ultima spesa confermata: ${formatLongDate(snapshot.confirmedTrips[snapshot.confirmedTrips.length - 1].tripDate)}.`}
        </Text>
      ) : null}
      <Button kind="ghost" label="Aggiorna la lista" icon="refresh-outline" onPress={() => void run(async () => undefined)} />
    </Screen>
  );
}

function TripView({ trip }: { trip: ShoppingTripPlan }) {
  const { snapshot } = useApp();
  const groups = SHOPPING_CATEGORIES.map((cat) => ({
    cat,
    lines: trip.lines.filter((l) => catalogIndex.ingredient(l.ingredientId).category === cat),
  })).filter((g) => g.lines.length > 0);
  return (
    <View style={styles.gap}>
      <Text variant="heading">
        {trip.isInitial ? `Spesa iniziale · ${formatLongDate(trip.date)}` : capitalize(formatLongDate(trip.date))}
      </Text>
      {trip.isInitial ? (
        <Notice tone="peach" text="Questi prodotti servono prima del tuo primo giorno di spesa programmato. Se preferisci non uscire, cambia le ricette interessate." />
      ) : null}
      {groups.map((g) => (
        <View key={g.cat} style={styles.gap}>
          <SectionTitle>{CATEGORY_LABELS[g.cat]}</SectionTitle>
          <Card style={styles.list}>
            {g.lines.map((l) => (
              <LineRow key={l.ingredientId} line={l} trip={trip} checked={snapshot?.checks.get(checkKey(trip.date, l.ingredientId)) ?? false} />
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

function LineRow({ line, trip, checked }: { line: ShoppingLine; trip: ShoppingTripPlan; checked: boolean }) {
  const { run } = useApp();
  const ing = catalogIndex.ingredient(line.ingredientId);
  const recipes = [...new Map(line.uses.map((u) => [u.recipeId + u.date, u])).values()]
    .map((u) => `${catalogIndex.recipe(u.recipeId)?.name ?? ''} (${weekdayShort(weekdayOf(u.date))})`)
    .join(', ');
  const qtyText = line.toTaste
    ? 'q.b. · verifica di averlo'
    : line.packs
      ? `${line.packs.count} × ${formatQtyWithUnit(toMilli(line.packs.packSize), ing.unit)}`
      : formatQtyWithUnit(line.suggestedQty, ing.unit);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${ing.name}, ${qtyText}`}
      accessibilityHint="Segna come messo nel carrello. Diventa acquisto solo dopo la conferma."
      onPress={() => void run((s) => s.setChecked(trip.date, line.ingredientId, !checked))}
      style={({ pressed }) => [styles.line, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={26} color={checked ? colors.green : colors.inkSoft} />
      <View style={styles.flex}>
        <View style={styles.lineTop}>
          <Text variant="body" style={[styles.flex, checked && styles.checked]}>
            {ing.name}
          </Text>
          <Text variant="heading">{qtyText}</Text>
        </View>
        {line.packs ? (
          <Text variant="small" color={colors.inkSoft}>
            {`Servono ${formatQtyWithUnit(line.qty, ing.unit)} · formato comune indicativo, verifica in negozio`}
          </Text>
        ) : null}
        {recipes ? (
          <Text variant="small" color={colors.inkSoft} numberOfLines={2}>
            {`Per: ${recipes}`}
          </Text>
        ) : null}
        {line.warnings.map((w) => (
          <Text key={w} variant="small" color={colors.peachInk}>
            {w}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}

function ConfirmBar({ trip }: { trip: ShoppingTripPlan }) {
  const { snapshot, run } = useApp();
  const checked = trip.lines.filter((l) => snapshot?.checks.get(checkKey(trip.date, l.ingredientId)));
  const confirm = () => {
    if (checked.length === 0) {
      Alert.alert('Nessun prodotto selezionato', 'Spunta i prodotti che hai acquistato, poi conferma.');
      return;
    }
    const partial = checked.length < trip.lines.length;
    Alert.alert(
      partial ? 'Confermare una spesa parziale?' : 'Confermare la spesa?',
      `${checked.length} prodotti entreranno in dispensa con le quantità indicate. Potrai correggerle dalla Dispensa.${partial ? ' I prodotti non spuntati restano in lista.' : ''}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () =>
            void run((s) =>
              s.confirmShopping(
                trip.date,
                checked.map((l) => ({ ingredientId: l.ingredientId, qty: l.suggestedQty, toTaste: l.toTaste })),
                partial,
              ),
            ),
        },
      ],
    );
  };
  return (
    <View style={styles.confirm}>
      <Text variant="small" color={colors.inkSoft} style={styles.flex}>
        {`${checked.length} di ${trip.lines.length} nel carrello`}
      </Text>
      <Button label="Conferma acquisti" icon="checkmark-done" onPress={confirm} disabled={checked.length === 0} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  flex: { flex: 1 },
  list: { gap: 0, paddingVertical: space.xs },
  line: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.sm, minHeight: TOUCH },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  checked: { textDecorationLine: 'line-through', color: colors.inkSoft },
  coveredRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.md },
});
