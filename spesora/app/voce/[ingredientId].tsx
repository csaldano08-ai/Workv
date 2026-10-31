import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { addDays, isIsoDate } from '../../src/core/domain/dates';
import { formatQtyWithUnit, fromMilli, parseUserQty, toMilli } from '../../src/core/domain/quantity';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { ToggleRow } from '../../src/features/onboarding/steps';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

const UNIT_LABEL = { g: 'grammi', ml: 'millilitri', pz: 'pezzi' } as const;

export default function PantryItem() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const { snapshot, run } = useApp();
  const ing = catalogIndex.ingredients.get(String(ingredientId));
  const entry = snapshot?.pantry.get(String(ingredientId));
  const outlook = snapshot?.outlook.find((o) => o.ingredientId === ingredientId);
  const [qtyText, setQtyText] = useState(entry ? String(fromMilli(entry.qty)).replace('.', ',') : '');
  const [useText, setUseText] = useState('');
  const [expiry, setExpiry] = useState(snapshot?.expiries.get(String(ingredientId)) ?? '');
  const [error, setError] = useState<string | null>(null);

  if (!ing || !snapshot) {
    return (
      <Screen edges={[]}>
        <Notice tone="warning" text="Ingrediente non trovato." />
      </Screen>
    );
  }

  const saveQty = async () => {
    const v = parseUserQty(qtyText);
    if (v === null) return setError(`Inserisci una quantità valida in ${UNIT_LABEL[ing.unit]}.`);
    await run((s) => s.setPantryQty(ing.id, toMilli(v)));
    router.back();
  };
  const consume = async () => {
    const v = parseUserQty(useText);
    if (v === null || v === 0) return setError('Inserisci quanto hai usato, ad esempio 100.');
    await run((s) => s.removePantry(ing.id, toMilli(v)));
    router.back();
  };
  const saveExpiry = async (value: string | null) => {
    if (value !== null && !isIsoDate(value)) return setError('Data non valida: usa il formato AAAA-MM-GG, ad esempio 2026-11-20.');
    await run((s) => s.setExpiry(ing.id, value));
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: ing.name }} />
      {ing.staple ? (
        <Card>
          <ToggleRow label="Ce l’ho in casa" value={snapshot.staples.has(ing.id)} onChange={(v) => void run((s) => s.setStaplePresent(ing.id, v))} />
          <Text variant="small" color={colors.inkSoft}>
            Gli ingredienti “quanto basta” non vengono pesati: serve solo sapere se ci sono.
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text variant="heading">Quanto ne hai davvero?</Text>
            <Text variant="small" color={colors.inkSoft}>
              {entry
                ? `Registrato: ${formatQtyWithUnit(entry.qty, ing.unit)}${entry.estimated ? ' (stima dopo i pasti confermati)' : ''}.`
                : 'Nessuna quantità registrata.'}
              {outlook && outlook.reserved > 0 ? ` Previsti nei prossimi pasti: ${formatQtyWithUnit(outlook.reserved, ing.unit)}.` : ''}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={qtyText}
                onChangeText={(v) => {
                  setError(null);
                  setQtyText(v);
                }}
                keyboardType="decimal-pad"
                style={styles.input}
                accessibilityLabel={`Quantità in ${UNIT_LABEL[ing.unit]}`}
                placeholder="0"
                placeholderTextColor={colors.inkSoft}
              />
              <Text variant="body">{ing.unit}</Text>
            </View>
            <Button label="Correggi la quantità" onPress={() => void saveQty()} />
          </Card>
          <Card>
            <Text variant="heading">Usato fuori dall’app</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={useText}
                onChangeText={(v) => {
                  setError(null);
                  setUseText(v);
                }}
                keyboardType="decimal-pad"
                style={styles.input}
                accessibilityLabel={`Quantità usata in ${UNIT_LABEL[ing.unit]}`}
                placeholder="0"
                placeholderTextColor={colors.inkSoft}
              />
              <Text variant="body">{ing.unit}</Text>
            </View>
            <Button kind="secondary" label="Sottrai" onPress={() => void consume()} />
          </Card>
        </>
      )}
      <Card>
        <Text variant="heading">Scadenza (facoltativa)</Text>
        <Text variant="small" color={colors.inkSoft}>
          Solo se la leggi sulla confezione: Spesora non stima le scadenze.
        </Text>
        <TextInput
          value={expiry}
          onChangeText={(v) => {
            setError(null);
            setExpiry(v);
          }}
          style={styles.input}
          placeholder={addDays(snapshot.today, 5)}
          placeholderTextColor={colors.inkSoft}
          accessibilityLabel="Data di scadenza nel formato anno-mese-giorno"
          autoCorrect={false}
        />
        <View style={styles.inputRow}>
          <Button compact kind="secondary" label="Salva data" onPress={() => void saveExpiry(expiry.trim() || null)} style={styles.flex} />
          {snapshot.expiries.get(ing.id) ? (
            <Button
              compact
              kind="ghost"
              label="Rimuovi"
              onPress={() => {
                setExpiry('');
                void saveExpiry(null);
              }}
            />
          ) : null}
        </View>
      </Card>
      {error ? <Notice tone="warning" text={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    flex: 1,
    minHeight: TOUCH + 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 18,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
});
