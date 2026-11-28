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
import { useT } from '../src/i18n';
import { ingredientName } from '../src/i18n/content';
import { formatLocale } from '../src/core/domain/locale';


/** Prezzi personali: ciò che paghi di solito. Nessun prezzo viene inventato dall'app. */
export default function Prices() {
  const { snapshot, run } = useApp();
  const { t } = useT();
  const unitWord = (u: 'g' | 'ml' | 'pz') => t(`profile:prices.unitWord.${u}`);
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
    if (euro === null || euro <= 0) return setError(t('profile:prices.errorPrice'));
    if (qty === null || qty <= 0) return setError(t('profile:prices.errorQty', { unit: unitWord(ing.unit) }));
    await run((s, today) => s.setUserPrice(ing.id, Math.round(euro * 100), qty, today));
    setEditing(null);
    setError(null);
  };

  return (
    <Screen edges={['bottom']}>
      <Notice text={t('profile:prices.notice')} />
      {ing ? (
        <Card>
          <Text variant="heading">{ingredientName(ing.id, ing.name)}</Text>
          <Text variant="small" color={colors.inkSoft}>
            {t('profile:prices.question')}
          </Text>
          <View style={styles.row}>
            <TextInput value={priceText} onChangeText={setPriceText} placeholder={t('profile:prices.pricePlaceholder')} placeholderTextColor={colors.inkSoft} keyboardType="decimal-pad" style={styles.input} accessibilityLabel={t('profile:prices.priceA11y')} />
            <TextInput value={qtyText} onChangeText={setQtyText} placeholder={unitWord(ing.unit)} placeholderTextColor={colors.inkSoft} keyboardType="decimal-pad" style={styles.input} accessibilityLabel={t('profile:prices.qtyA11y', { unit: unitWord(ing.unit) })} />
          </View>
          {error ? <Notice tone="warning" text={error} /> : null}
          <View style={styles.row}>
            <Button compact kind="secondary" label={t('profile:prices.cancel')} onPress={() => setEditing(null)} style={styles.flex} />
            <Button compact label={t('profile:prices.save')} onPress={() => void save()} style={styles.flex} />
          </View>
          {userPrices.has(ing.id) ? (
            <Button
              compact
              kind="danger"
              label={t('profile:prices.remove')}
              onPress={async () => {
                await run((s) => s.deleteUserPrice(ing.id));
                setEditing(null);
              }}
            />
          ) : null}
        </Card>
      ) : (
        <>
          <TextInput value={query} onChangeText={setQuery} placeholder={t('profile:prices.search')} placeholderTextColor={colors.inkSoft} style={styles.input} accessibilityLabel={t('profile:prices.search')} autoCorrect={false} />
          <SectionTitle>{query.length < 2 ? t('profile:prices.inList') : t('profile:prices.results')}</SectionTitle>
          <Card style={{ gap: 0 }}>
            {results.length === 0 ? (
              <Text variant="small" color={colors.inkSoft}>
                {t('profile:prices.noResults')}
              </Text>
            ) : (
              results.map((i, idx) => {
                const p = userPrices.get(i.id);
                const sub = p
                  ? `${t('profile:prices.entry', {
                      price: formatCents(p.priceCents),
                      quantity: p.quantity.toLocaleString(formatLocale()),
                      unit: t(`unit.${i.unit}`, { count: p.quantity }),
                      normalized: formatCents(normalizedCents(p)),
                      per: t(`profile:prices.per.${i.unit}`),
                      date: p.observedAt,
                    })}${freshness(p, snapshot.today) === 'obsoleto' ? t('profile:prices.stale') : ''}`
                  : t('profile:prices.unknown');
                return (
                  <View key={i.id}>
                    {idx > 0 ? <Divider /> : null}
                    <Row
                      title={ingredientName(i.id, i.name)}
                      subtitle={sub}
                      onPress={() => {
                        setEditing(i.id);
                        setPriceText(p ? (p.priceCents / 100).toLocaleString(formatLocale(), { useGrouping: false, maximumFractionDigits: 2 }) : '');
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
  input: { flex: 1, minHeight: TOUCH + 4, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 16, color: colors.ink, backgroundColor: colors.paper },
});
