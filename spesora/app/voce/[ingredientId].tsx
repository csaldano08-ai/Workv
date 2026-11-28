import { Stack, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/features/navigation';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { addDays, isIsoDate } from '../../src/core/domain/dates';
import { formatQtyWithUnit, fromMilli, parseUserQty, toMilli } from '../../src/core/domain/quantity';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { ToggleRow } from '../../src/features/onboarding/steps';
import { useT } from '../../src/i18n';
import { ingredientName } from '../../src/i18n/content';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

export default function PantryItem() {
  const { t } = useT();
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
        <Notice tone="warning" text={t('pantry:item.notFound')} />
      </Screen>
    );
  }

  const unitName = t(`pantry:unitName.${ing.unit}`);
  const unitShort = t(`unit.${ing.unit}`, { count: 2 });
  const saveQty = async () => {
    const v = parseUserQty(qtyText);
    if (v === null) return setError(t('pantry:item.invalidQty', { unit: unitName }));
    await run((s) => s.setPantryQty(ing.id, toMilli(v)));
    goBack('/dispensa');
  };
  const consume = async () => {
    const v = parseUserQty(useText);
    if (v === null || v === 0) return setError(t('pantry:item.invalidUse'));
    await run((s) => s.removePantry(ing.id, toMilli(v)));
    goBack('/dispensa');
  };
  const saveExpiry = async (value: string | null) => {
    if (value !== null && !isIsoDate(value)) return setError(t('pantry:item.invalidDate'));
    await run((s) => s.setExpiry(ing.id, value));
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: ingredientName(ing.id, ing.name) }} />
      {ing.staple ? (
        <Card>
          <ToggleRow label={t('pantry:item.haveIt')} value={snapshot.staples.has(ing.id)} onChange={(v) => void run((s) => s.setStaplePresent(ing.id, v))} />
          <Text variant="small" color={colors.inkSoft}>
            {t('pantry:item.toTasteNote')}
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text variant="heading">{t('pantry:item.howMuch')}</Text>
            <Text variant="small" color={colors.inkSoft}>
              {entry
                ? t(entry.estimated ? 'pantry:item.recordedEstimate' : 'pantry:item.recorded', { qty: formatQtyWithUnit(entry.qty, ing.unit) })
                : t('pantry:item.noQty')}
              {outlook && outlook.reserved > 0 ? ` ${t('pantry:item.reserved', { qty: formatQtyWithUnit(outlook.reserved, ing.unit) })}` : ''}
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
                accessibilityLabel={t('pantry:qtyA11y', { unit: unitName })}
                placeholder="0"
                placeholderTextColor={colors.inkSoft}
              />
              <Text variant="body">{unitShort}</Text>
            </View>
            <Button label={t('pantry:item.correct')} onPress={() => void saveQty()} />
          </Card>
          <Card>
            <Text variant="heading">{t('pantry:item.usedOutside')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={useText}
                onChangeText={(v) => {
                  setError(null);
                  setUseText(v);
                }}
                keyboardType="decimal-pad"
                style={styles.input}
                accessibilityLabel={t('pantry:item.usedA11y', { unit: unitName })}
                placeholder="0"
                placeholderTextColor={colors.inkSoft}
              />
              <Text variant="body">{unitShort}</Text>
            </View>
            <Button kind="secondary" label={t('pantry:item.subtract')} onPress={() => void consume()} />
          </Card>
        </>
      )}
      <Card>
        <Text variant="heading">{t('pantry:item.expiryTitle')}</Text>
        <Text variant="small" color={colors.inkSoft}>
          {t('pantry:item.expiryNote')}
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
          accessibilityLabel={t('pantry:item.expiryA11y')}
          autoCorrect={false}
        />
        <View style={styles.inputRow}>
          <Button compact kind="secondary" label={t('pantry:item.saveDate')} onPress={() => void saveExpiry(expiry.trim() || null)} style={styles.flex} />
          {snapshot.expiries.get(ing.id) ? (
            <Button
              compact
              kind="ghost"
              label={t('pantry:item.remove')}
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
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 18,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
});
