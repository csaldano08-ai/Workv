import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { diffDays, formatShortDate } from '../../src/core/domain/dates';
import { EXPIRY_PRIORITY_DAYS } from '../../src/core/domain/planner';
import { Alert } from '../../src/ui/dialog';
import { formatQtyWithUnit } from '../../src/core/domain/quantity';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { t as translate, useT } from '../../src/i18n';
import { ingredientName } from '../../src/i18n/content';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { CategoryIcon } from '../../src/ui/illustrations/CategoryIcon';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { MinaAnimated } from '../../src/ui/mascot/MinaAnimated';
import { emitMina } from '../../src/ui/mascot/director';
import { useMinaScope } from '../../src/ui/mascot/useMinaScope';
import { Reveal } from '../../src/ui/Reveal';
import { StickyNote } from '../../src/ui/notebook';
import { AppHeader, HeaderIcon, InfoToggle, ListCard, ListRow, Pills, ScreenTitle, SearchField } from '../../src/ui/mina/kit';
import { LOADER_TEXT, withLoader } from '../../src/ui/loader/loaderBus';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

/** Nome dell'ingrediente nella lingua corrente. */
function nameOf(id: string): string {
  return ingredientName(id, catalogIndex.ingredient(id).name);
}

export default function Pantry() {
  const { t } = useT();
  const { snapshot, run } = useApp();
  const [filter, setFilter] = useState<'all' | 'expiry' | 'attention'>('all');
  const [query, setQuery] = useState('');
  if (!snapshot?.profile) return <Screen>{null}</Screen>;
  const items = [...snapshot.outlook].sort((a, b) =>
    a.insufficient === b.insufficient ? nameOf(a.ingredientId).localeCompare(nameOf(b.ingredientId)) : a.insufficient ? -1 : 1,
  );
  const quantified = items.filter((i) => !catalogIndex.ingredient(i.ingredientId).staple);
  const staples = [...snapshot.staples].filter((id) => catalogIndex.ingredients.has(id));
  const warnings = quantified.filter((i) => i.insufficient && i.available > 0);
  // In scadenza a breve e non ancora previsti in un pasto: Mina può spostarli in cima al calendario.
  const expiring = quantified.filter((i) => {
    if (!i.expiryDate || i.available <= 0 || i.reserved > 0) return false;
    const left = diffDays(snapshot.today, i.expiryDate);
    return left >= 0 && left <= EXPIRY_PRIORITY_DAYS;
  });
  const prioritize = () =>
    Alert.alert(
      t('pantry:prioritize.title'),
      t('pantry:prioritize.text'),
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: t('pantry:prioritize.confirm'), onPress: () => void withLoader(LOADER_TEXT.expiring, () => run((s, today) => s.regenerate(today))) },
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

  const q = query.trim().toLowerCase();
  const filtered = quantified
    .filter((i) => (filter === 'expiry' ? !!i.expiryDate : filter === 'attention' ? stateOf(i) !== 'ok' : true))
    .filter((i) => !q || nameOf(i.ingredientId).toLowerCase().includes(q));
  const withExpiry = quantified.filter((i) => !!i.expiryDate).length;
  const attention = quantified.length - counts.ok;

  return (
    <Screen>
      <AppHeader right={<HeaderIcon icon="add-circle-outline" label={t('pantry:add')} onPress={() => router.push('/aggiungi')} />} />
      <ScreenTitle title={t('tabs.pantry')} />
      {quantified.length > 5 ? <SearchField value={query} onChangeText={setQuery} placeholder={t('pantry:search.placeholder')} label={t('pantry:search.label')} /> : null}
      {quantified.length > 0 ? (
        <Pills
          fill
          options={[
            { key: 'all', label: t('pantry:filter.all') },
            { key: 'expiry', label: t('pantry:filter.expiry'), count: withExpiry > 0 ? withExpiry : undefined },
            { key: 'attention', label: t('pantry:filter.attention'), count: attention > 0 ? attention : undefined },
          ]}
          value={filter}
          onChange={setFilter}
        />
      ) : null}

      <ShortageScene names={warnings.map((w) => catalogIndex.ingredient(w.ingredientId).name)} labels={warnings.map((w) => nameOf(w.ingredientId))} />

      {expiring.length > 0 ? (
        <View style={styles.scene}>
          <MinaMascot pose="thinking" size={84} style={styles.sceneMina} />
          <StickyNote tone="sage" style={styles.flex}>
            <Text variant="heading" style={styles.bold}>
              {t('pantry:expiring.title')}
            </Text>
            <Text variant="small" color={colors.inkSoft}>
              {t('pantry:expiring.text', { list: expiring.map((e) => `${nameOf(e.ingredientId)} (${formatShortDate(e.expiryDate!)})`).join(', ') })}
            </Text>
            <Button kind="secondary" compact icon="calendar-outline" label={t('pantry:expiring.button')} onPress={prioritize} style={styles.noteBtn} />
          </StickyNote>
        </View>
      ) : null}

      {quantified.length === 0 ? (
        <View style={styles.emptyState}>
          <MinaMascot pose="empty" size={120} animated />
          <Text variant="title" center>
            {t('pantry:empty.title')}
          </Text>
          <Text variant="body" color={colors.inkSoft} center>
            {t('pantry:empty.text')}
          </Text>
          <Button label={t('pantry:add')} icon="add" onPress={() => router.push('/aggiungi')} />
        </View>
      ) : filtered.length === 0 ? (
        <Text variant="body" color={colors.inkSoft} center style={styles.emptyFilter}>
          {q ? t('pantry:filterEmpty.search') : filter === 'expiry' ? t('pantry:filterEmpty.expiry') : t('pantry:filterEmpty.attention')}
        </Text>
      ) : (
        <ListCard>
          {filtered.map((i) => {
            const ing = catalogIndex.ingredient(i.ingredientId);
            const name = nameOf(i.ingredientId);
            const st = stateOf(i);
            const avail = i.available > 0 ? formatQtyWithUnit(i.available, ing.unit) : null;
            const need = i.reserved > 0 ? formatQtyWithUnit(i.reserved, ing.unit) : null;
            const s = STATE[st];
            // quantità subito leggibili («550 g · servono 940 g») e lo stato con icona e parola (mai solo colore);
            // i dettagli (stima, scadenza, correzioni) toccando il prodotto
            return (
              <ListRow
                key={i.ingredientId}
                left={<CategoryIcon category={ing.category} size={42} />}
                title={name}
                subtitle={
                  <View style={styles.sub}>
                    <Text variant="small" color={colors.inkSoft}>
                      {`${avail ?? '0'}${i.estimated && avail ? ` ${t('pantry:row.estimate')}` : ''}${need ? ` · ${t('pantry:row.needed', { qty: need })}` : ''}`}
                    </Text>
                    <View style={styles.stateRow}>
                      {st !== 'ok' ? (
                        <>
                          <Ionicons name={s.icon} size={14} color={s.fg} />
                          <Text variant="small" color={s.fg} style={styles.bold}>
                            {s.row}
                          </Text>
                        </>
                      ) : null}
                      {i.expiryDate ? (
                        <Text variant="small" color={colors.inkSoft}>
                          {`${st !== 'ok' ? ' · ' : ''}${t('pantry:row.expires', { date: formatShortDate(i.expiryDate) })}`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                }
                onPress={() => router.push(`/voce/${i.ingredientId}`)}
                accessibilityLabel={`${name}: ${avail ? `${t('pantry:row.a11yAvailable', { qty: avail })}${i.estimated ? `, ${t('pantry:row.a11yEstimate')}` : ''}` : t('pantry:row.a11yOut')}${need ? `, ${t('pantry:row.a11yNeeded', { qty: need })}` : ''}. ${t('pantry:row.a11yState', { state: s.row })}${i.expiryDate ? `. ${t('pantry:row.a11yExpires', { date: formatShortDate(i.expiryDate) })}` : ''}`}
              />
            );
          })}
        </ListCard>
      )}

      <Text variant="title" style={styles.section} accessibilityRole="header">
        {t('pantry:staples.title')}
      </Text>
      <View style={styles.staples}>
        {staples.length === 0 ? (
          <Text variant="small" color={colors.inkSoft}>
            {t('pantry:staples.empty')}
          </Text>
        ) : (
          staples.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={t('pantry:staples.a11y', { name: nameOf(id) })} onPress={() => router.push(`/voce/${id}`)} style={styles.staple}>
              <Ionicons name="checkmark" size={14} color={colors.green} />
              <Text variant="small">{nameOf(id)}</Text>
            </Pressable>
          ))
        )}
      </View>
      <InfoToggle label={t('pantry:info.label')} text={`${t('pantry:info.text')} ${t('estimate.note')}`} />
    </Screen>
  );
}

type PantryState = 'ok' | 'check' | 'short' | 'out';
const STATE: Record<PantryState, { label: string; row: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ok: { get label() { return translate('pantry:state.ok'); }, get row() { return translate('pantry:state.ok'); }, bg: colors.greenSoft, fg: colors.greenDark, icon: 'checkmark-circle' },
  check: { get label() { return translate('pantry:state.checkLong'); }, get row() { return translate('pantry:state.check'); }, bg: '#F3E3A6', fg: '#6B5410', icon: 'help-circle' },
  short: { get label() { return translate('pantry:state.shortLong'); }, get row() { return translate('pantry:state.short'); }, bg: colors.peachSoft, fg: colors.peachInk, icon: 'alert-circle' },
  out: { get label() { return translate('pantry:state.out'); }, get row() { return translate('pantry:state.out'); }, bg: colors.tab, fg: colors.inkSoft, icon: 'remove-circle' },
};

/**
 * La scena «Potrebbe non bastare», guidata dalla regia di Mina:
 *  - avviso nuovo: Mina lo guarda, sopracciglia preoccupate, si inclina e lo indica (una volta per avviso; tornando
 *    nella pagina resta composta, senza ripetere la scena);
 *  - un ingrediente sistemato (gli altri restano): sorride e fa un saltello, poi torna composta;
 *  - tutto sistemato: l'avviso sparisce e al suo posto Mina sorride per un momento («Ora ci siamo»).
 */
function ShortageScene({ names, labels }: { names: string[]; labels: string[] }) {
  const { t } = useT();
  const key = names.join(', ');
  const reaction = useMinaScope('pantry');
  // l'avviso è appena sparito del tutto? (aggiustamento di stato durante il render, come da guida di React)
  const [prevKey, setPrevKey] = useState(key);
  const [resolved, setResolved] = useState(false);
  if (prevKey !== key) {
    setPrevKey(key);
    setResolved(prevKey !== '' && key === '');
  }
  // eventi per la regia: avviso nuovo, oppure uno o più ingredienti appena sistemati
  const before = useRef<string[] | null>(null);
  useEffect(() => {
    const prev = before.current;
    before.current = names;
    if (names.length === 0) return;
    const fixed = prev ? prev.filter((n) => !names.includes(n)) : [];
    if (prev && fixed.length > 0 && names.every((n) => prev.includes(n))) emitMina({ scope: 'pantry', kind: 'shortageResolved', key: fixed.join(',') });
    else emitMina({ scope: 'pantry', kind: 'shortage', key });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // finito il sorriso per l'ingrediente sistemato, Mina torna composta (senza rifare la scena dell'avviso)
  const [calmFor, setCalmFor] = useState<number | null>(null);
  // livello 2: la spiegazione compare solo se la chiedi (toccando Mina o «Perché?»), mai da sola
  const [why, setWhy] = useState(false);
  if (names.length > 0) {
    const relief = reaction?.kind === 'shortageResolved' && calmFor !== reaction.id ? reaction : undefined;
    const acting = relief || reaction?.kind === 'shortage';
    return (
      <View style={styles.sceneWrap}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: why }} accessibilityLabel={t('pantry:shortage.a11y', { count: names.length })} onPress={() => setWhy((v) => !v)} style={[styles.scene, styles.alert]}>
          <MinaMascot
            pose={relief ? 'happy' : 'concerned'}
            gesture={acting ? undefined : 'none'}
            replayKey={reaction?.id}
            onDone={relief ? () => setCalmFor(relief.id) : undefined}
            size={54}
            animated
            style={styles.alertMina}
          />
          <View style={styles.flex}>
            <Text variant="heading" color={colors.peachInk} style={styles.bold}>
              {relief ? t('pantry:shortage.relief') : t('pantry:shortage.title', { count: names.length })}
            </Text>
            <View style={styles.minaTap}>
              <Ionicons name={why ? 'chevron-up-circle-outline' : 'help-circle-outline'} size={16} color={colors.green} />
              <Text variant="small" color={colors.green}>
                {why ? t('action.close') : t('pantry:shortage.why')}
              </Text>
            </View>
          </View>
        </Pressable>
        {why ? (
          <Reveal from="pop">
            <StickyNote>
              <Text variant="small" color={colors.inkSoft}>
                {t('pantry:shortage.explain', { list: labels.join(', ') })}
              </Text>
            </StickyNote>
          </Reveal>
        ) : null}
      </View>
    );
  }
  if (!resolved) return null;
  return (
    <Reveal from="pop">
      <View style={[styles.scene, styles.alert, styles.alertOk]}>
        <MinaAnimated state="happy" size={54} accessibilityLabel={t('pantry:resolved.a11y')} style={styles.alertMina} />
        <View style={styles.flex}>
          <Text variant="heading" color={colors.greenDark} style={styles.bold}>
            {t('pantry:resolved.title')}
          </Text>
          <Text variant="small" color={colors.inkSoft}>
            {t('pantry:resolved.text')}
          </Text>
        </View>
      </View>
    </Reveal>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
  scene: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sceneWrap: { gap: space.sm },
  sceneMina: { marginLeft: -space.sm },
  alert: { gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: colors.peachSoft },
  alertOk: { backgroundColor: colors.greenSoft },
  alertMina: { marginVertical: -space.xs },
  noteBtn: { alignSelf: 'flex-start', marginTop: space.sm },
  bold: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  minaTap: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sub: { gap: 1 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  emptyState: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  emptyFilter: { paddingVertical: space.lg },
  section: { marginTop: space.sm, fontSize: 22, lineHeight: 28 },
  staples: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  staple: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: TOUCH - 8, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderBottomWidth: 3, borderColor: colors.lineStrong, backgroundColor: colors.card },
});
