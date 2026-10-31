import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { normalizeText } from '../src/core/domain/catalog';
import { formatCents, freshness, normalizedCents } from '../src/core/domain/prices';
import { parseUserQty } from '../src/core/domain/quantity';
import { catalogIndex, useApp } from '../src/features/app/AppProvider';
import { colors, radius, space, TOUCH } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Notice } from '../src/ui/Notice';
import { Divider, Row, SectionTitle } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

const UNIT_WORD = { g: 'grammi', ml: 'millilitri', pz: 'pezzi' } as const;
const PER = { g: '€/kg', ml: '€/l', pz: '€/pezzo' } as const;

/** Prezzi personali: ciò che paghi di solito. Nessun prezzo viene inventato dall'app. */
export default function Prices() {
  const { snapshot, run } = useApp();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [priceText, setPriceText] = useState('');
  const [qtyText, setQtyText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inList = useMemo(() => new Set(snapshot?.shopping.trips.flatMap((t) => t.lines.filter((l) => !l.toTaste).map((l) => l.ingredientId)) ?? []), [snapshot]);
  const results = useMemo(() => {
    const q = normalizeText(query);
    const all = catalogIndex.catalog.ingredients.filter((i) => !i.staple);
    if (q.length < 2) return all.filter((i) => inList.has(i.id)).slice(0, 40);
    return all.filter((i) => [i.name, ...i.aliases].some((a) => normalizeText(a).includes(q))).slice(0, 30);
  }, [query, inList]);
  if (!snapshot) return <Screen edges={['bottom']}>{null}</Screen>;
  const userPrices = new Map(snapshot.userPrices.map((p) => [p.ingredientId, p]));
  const ing = editing ? catalogIndex.ingredient(editing) : null;

  const save = async () => {
    if (!ing) return;
    const euro = parseUserQty(priceText);
    const qty = parseUserQty(qtyText);
    if (euro === null || euro <= 0) return setError('Scrivi il prezzo pagato, ad esempio 1,20.');
    if (qty === null || qty <= 0) return setError(`Scrivi la quantità della confezione in ${UNIT_WORD[ing.unit]}, ad esempio 500.`);
    await run((s, today) => s.setUserPrice(ing.id, Math.round(euro * 100), qty, today));
    setEditing(null);
    setError(null);
  };

  return (
    <Screen edges={['bottom']}>
      <Notice text="Spesora non conosce i prezzi dei negozi: usa quelli che inserisci tu, con la data. Servono a stimare il costo delle ricette e della spesa; le stime restano indicative." />
      {ing ? (
        <Card>
          <Text variant="heading">{ing.name}</Text>
          <Text variant="small" color={colors.inkSoft}>
            Quanto paghi una confezione e quanto contiene?
          </Text>
          <View style={styles.row}>
            <TextInput value={priceText} onChangeText={setPriceText} placeholder="Prezzo €" placeholderTextColor={colors.inkSoft} keyboardType="decimal-pad" style={styles.input} accessibilityLabel="Prezzo pagato in euro" />
            <TextInput value={qtyText} onChangeText={setQtyText} placeholder={UNIT_WORD[ing.unit]} placeholderTextColor={colors.inkSoft} keyboardType="decimal-pad" style={styles.input} accessibilityLabel={`Quantità in ${UNIT_WORD[ing.unit]}`} />
          </View>
          {error ? <Notice tone="warning" text={error} /> : null}
          <View style={styles.row}>
            <Button compact kind="secondary" label="Annulla" onPress={() => setEditing(null)} style={styles.flex} />
            <Button compact label="Salva" onPress={() => void save()} style={styles.flex} />
          </View>
          {userPrices.has(ing.id) ? (
            <Button
              compact
              kind="danger"
              label="Rimuovi il mio prezzo"
              onPress={async () => {
                await run((s) => s.deleteUserPrice(ing.id));
                setEditing(null);
              }}
            />
          ) : null}
        </Card>
      ) : (
        <>
          <TextInput value={query} onChangeText={setQuery} placeholder="Cerca un ingrediente" placeholderTextColor={colors.inkSoft} style={styles.input} accessibilityLabel="Cerca un ingrediente" autoCorrect={false} />
          <SectionTitle>{query.length < 2 ? 'Prodotti nella lista della spesa' : 'Risultati'}</SectionTitle>
          <Card style={{ gap: 0 }}>
            {results.length === 0 ? (
              <Text variant="small" color={colors.inkSoft}>
                Nessun prodotto: cerca per nome.
              </Text>
            ) : (
              results.map((i, idx) => {
                const p = userPrices.get(i.id);
                const sub = p
                  ? `${formatCents(p.priceCents)} per ${p.quantity} ${i.unit} · ${formatCents(normalizedCents(p))} ${PER[i.unit].replace('€', '').trim()} · ${p.observedAt}${freshness(p, snapshot.today) === 'obsoleto' ? ' · da aggiornare' : ''}`
                  : 'Prezzo sconosciuto';
                return (
                  <View key={i.id}>
                    {idx > 0 ? <Divider /> : null}
                    <Row
                      title={i.name}
                      subtitle={sub}
                      onPress={() => {
                        setEditing(i.id);
                        setPriceText(p ? String(p.priceCents / 100).replace('.', ',') : '');
                        setQtyText(p ? String(p.quantity) : String(i.commonPackSizes?.[0] ?? ''));
                        setError(null);
                      }}
                    />
                  </View>
                );
              })
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  input: { flex: 1, minHeight: TOUCH + 4, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 16, color: colors.ink, backgroundColor: colors.paper },
});
