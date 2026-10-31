import { goBack } from '../src/features/navigation';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { normalizeText } from '../src/core/domain/catalog';
import { parseUserQty, toMilli } from '../src/core/domain/quantity';
import { catalogIndex, useApp } from '../src/features/app/AppProvider';
import { colors, radius, space, TOUCH } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Notice } from '../src/ui/Notice';
import { Divider, Row } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

export default function AddPantry() {
  const { run } = useApp();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [error, setError] = useState<string | null>(null);
  const results = useMemo(() => {
    const q = normalizeText(query);
    const all = catalogIndex.catalog.ingredients;
    return (q.length === 0 ? all : all.filter((i) => [i.name, ...i.aliases].some((a) => normalizeText(a).includes(q)))).slice(0, 30);
  }, [query]);
  const ing = picked ? catalogIndex.ingredient(picked) : null;

  const save = async () => {
    if (!ing) return;
    if (ing.staple) {
      await run((s) => s.setStaplePresent(ing.id, true));
      goBack('/dispensa');
      return;
    }
    const v = parseUserQty(qty);
    if (v === null || v === 0) return setError('Inserisci una quantità maggiore di zero.');
    await run((s) => s.addPantry(ing.id, toMilli(v)));
    goBack('/dispensa');
  };

  return (
    <Screen edges={['bottom']}>
      {ing ? (
        <Card>
          <Text variant="heading">{ing.name}</Text>
          {ing.staple ? (
            <Text variant="small" color={colors.inkSoft}>
              Ingrediente “quanto basta”: verrà segnato come presente.
            </Text>
          ) : (
            <View style={styles.row}>
              <TextInput
                value={qty}
                onChangeText={(v) => {
                  setError(null);
                  setQty(v);
                }}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="Quantità"
                placeholderTextColor={colors.inkSoft}
                accessibilityLabel={`Quantità in ${ing.unit}`}
                autoFocus
              />
              <Text variant="body">{ing.unit}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Button kind="secondary" compact label="Cambia" onPress={() => setPicked(null)} style={styles.flex} />
            <Button compact label="Aggiungi" onPress={() => void save()} style={styles.flex} />
          </View>
          {error ? <Notice tone="warning" text={error} /> : null}
        </Card>
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            placeholder="Cerca un ingrediente"
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel="Cerca un ingrediente"
            autoCorrect={false}
          />
          <Card style={styles.list}>
            {results.map((i, idx) => (
              <View key={i.id}>
                {idx > 0 ? <Divider /> : null}
                <Row title={i.name} subtitle={i.staple ? 'quanto basta' : i.unit} onPress={() => setPicked(i.id)} />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  list: { gap: 0, paddingVertical: space.xs },
  input: {
    flex: 1,
    minHeight: TOUCH + 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
});
