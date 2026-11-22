import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { diffDays, formatShortDate } from '../../src/core/domain/dates';
import { EXPIRY_PRIORITY_DAYS } from '../../src/core/domain/planner';
import { Alert } from '../../src/ui/dialog';
import { formatQtyWithUnit } from '../../src/core/domain/quantity';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { t } from '../../src/i18n/it';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { CategoryIcon } from '../../src/ui/illustrations/CategoryIcon';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { LinkRow, NotebookPage, StickyNote } from '../../src/ui/notebook';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

export default function Pantry() {
  const { snapshot, run } = useApp();
  const [info, setInfo] = useState(false);
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
        { text: 'Riorganizza', onPress: () => void withLoader(LOADER_TEXT.expiring, () => run((s, today) => s.regenerate(today))) },
      ],
    );

  const stateOf = (i: (typeof quantified)[number]): PantryState => {
    if (i.available <= 0) return 'out';
    if (i.insufficient) return 'short';
    if (i.estimated) return 'check';
    return 'ok';
  };
  const counts = { ok: 0, check: 0, short: 0, out: 0 } as Record<PantryState, number>;
  for (const i of quantified) counts[stateOf(i)]++;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          Dispensa
        </Text>
        <Button compact label="Aggiungi" icon="add" onPress={() => router.push('/aggiungi')} />
      </View>

      {quantified.length > 0 ? (
        <View style={styles.legend} accessibilityLabel={`${counts.ok} disponibili, ${counts.check} da verificare, ${counts.short} potrebbero non bastare, ${counts.out} esauriti`}>
          {(['ok', 'check', 'short', 'out'] as const).map((k) => (counts[k] > 0 ? <StatePill key={k} state={k} count={counts[k]} /> : null))}
        </View>
      ) : null}

      {warnings.length > 0 ? (
        <View style={styles.scene}>
          <MinaMascot pose="missing" size={92} style={styles.sceneMina} />
          <StickyNote style={styles.flex}>
            <Text variant="hand">Potrebbe non bastare</Text>
            <Text variant="small" color={colors.inkSoft}>
              {`${warnings.map((w) => catalogIndex.ingredient(w.ingredientId).name).join(', ')}: il resto è già nella lista della spesa.`}
            </Text>
          </StickyNote>
        </View>
      ) : null}

      {expiring.length > 0 ? (
        <View style={styles.scene}>
          <MinaMascot pose="thinking" size={92} style={styles.sceneMina} />
          <StickyNote tone="sage" style={styles.flex}>
            <Text variant="hand">In scadenza a breve</Text>
            <Text variant="small" color={colors.inkSoft}>
              {`${expiring.map((e) => `${catalogIndex.ingredient(e.ingredientId).name} (${formatShortDate(e.expiryDate!)})`).join(', ')}: non ancora previsti in un pasto.`}
            </Text>
            <Button kind="secondary" compact icon="calendar-outline" label="Usali nei prossimi pasti" onPress={prioritize} style={styles.noteBtn} />
          </StickyNote>
        </View>
      ) : null}

      {quantified.length === 0 ? (
        <View style={styles.scene}>
          <MinaMascot pose="empty" size={110} animated style={styles.sceneMina} />
          <StickyNote style={styles.flex}>
            <Text variant="hand">La dispensa è vuota</Text>
            <Text variant="small" color={colors.inkSoft}>
              Quando confermi una spesa, i prodotti compaiono qui. Puoi anche aggiungere ciò che hai già.
            </Text>
          </StickyNote>
        </View>
      ) : (
        <NotebookPage rings={5} contentStyle={styles.page}>
          {quantified.map((i, idx) => {
            const ing = catalogIndex.ingredient(i.ingredientId);
            const st = stateOf(i);
            const parts = [
              i.available > 0 ? `${formatQtyWithUnit(i.available, ing.unit)}${i.estimated ? ' (stima)' : ''}` : null,
              i.reserved > 0 ? `previsti ${formatQtyWithUnit(i.reserved, ing.unit)}` : null,
              i.expiryDate ? `scade ${formatShortDate(i.expiryDate)}` : null,
            ].filter(Boolean);
            return (
              <Pressable
                key={i.ingredientId}
                accessibilityRole="button"
                accessibilityLabel={`${ing.name}: ${STATE[st].label}. ${parts.join(', ')}`}
                onPress={() => router.push(`/voce/${i.ingredientId}`)}
                style={({ pressed }) => [styles.item, idx > 0 && styles.itemLine, pressed && { opacity: 0.7 }]}
              >
                <CategoryIcon category={ing.category} size={30} />
                <View style={styles.flex}>
                  <Text variant="body">{ing.name}</Text>
                  {parts.length ? (
                    <Text variant="small" color={colors.inkSoft}>
                      {parts.join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <StatePill state={st} />
                <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
              </Pressable>
            );
          })}
        </NotebookPage>
      )}

      <Text variant="hand" style={styles.section}>
        Basi in casa
      </Text>
      <View style={styles.staples}>
        {staples.length === 0 ? (
          <Text variant="small" color={colors.inkSoft}>
            Sale, olio, spezie e simili: segnali come presenti per non vederli in lista.
          </Text>
        ) : (
          staples.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${catalogIndex.ingredient(id).name}, presente`} onPress={() => router.push(`/voce/${id}`)} style={styles.staple}>
              <Ionicons name="checkmark" size={14} color={colors.green} />
              <Text variant="small">{catalogIndex.ingredient(id).name}</Text>
            </Pressable>
          ))
        )}
      </View>

      <LinkRow label="Come funziona la dispensa" onPress={() => setInfo((v) => !v)}>
        <Ionicons name="information-circle-outline" size={20} color={colors.green} />
        <Text variant="heading" color={colors.green} style={styles.flex}>
          Come funziona la dispensa
        </Text>
        <Ionicons name={info ? 'chevron-up' : 'chevron-down'} size={18} color={colors.green} />
      </LinkRow>
      {info ? (
        <View style={styles.infoBox}>
          <Text variant="small">Le quantità arrivano dalle spese confermate e dalle tue correzioni. I pasti programmati non sottraggono nulla finché non confermi di averli cucinati.</Text>
          <Text variant="small">{t('estimate.note')}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

type PantryState = 'ok' | 'check' | 'short' | 'out';
const STATE: Record<PantryState, { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ok: { label: 'Disponibile', bg: colors.greenSoft, fg: colors.greenDark, icon: 'checkmark-circle' },
  check: { label: 'Da verificare (stima)', bg: '#F3E3A6', fg: '#6B5410', icon: 'help-circle' },
  short: { label: 'Potrebbe non bastare', bg: colors.peachSoft, fg: colors.peachInk, icon: 'alert-circle' },
  out: { label: 'Esaurito', bg: colors.tab, fg: colors.inkSoft, icon: 'remove-circle' },
};

function StatePill({ state, count }: { state: PantryState; count?: number }) {
  const s = STATE[state];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={14} color={s.fg} />
      <Text variant="caption" color={s.fg}>
        {count !== undefined ? `${count} · ${s.label.replace(' (stima)', '')}` : s.label.replace(' (stima)', '')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink },
  scene: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sceneMina: { marginLeft: -space.sm },
  noteBtn: { alignSelf: 'flex-start', marginTop: space.sm },
  page: { paddingHorizontal: space.md, gap: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH + 8, paddingVertical: space.sm },
  itemLine: { borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: 'rgba(36,51,44,0.22)' },
  section: { marginTop: space.sm },
  staples: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  staple: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: TOUCH - 8, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.white },
  infoBox: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.ink },
});
