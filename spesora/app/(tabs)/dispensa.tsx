import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

export default function Pantry() {
  const { snapshot, run } = useApp();
  const [filter, setFilter] = useState<'all' | 'expiry' | 'attention'>('all');
  const [query, setQuery] = useState('');
  if (!snapshot?.profile) return <Screen>{null}</Screen>;
  const items = [...snapshot.outlook].sort((a, b) =>
    a.insufficient === b.insufficient ? catalogIndex.ingredient(a.ingredientId).name.localeCompare(catalogIndex.ingredient(b.ingredientId).name) : a.insufficient ? -1 : 1,
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
      'Usare prima questi ingredienti?',
      'Mina riorganizza i pasti futuri non ancora cucinati preferendo ricette che li usano prima della scadenza. Pasti completati, scelte manuali, acquisti e dispensa restano invariati.',
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

  const q = query.trim().toLowerCase();
  const filtered = quantified
    .filter((i) => (filter === 'expiry' ? !!i.expiryDate : filter === 'attention' ? stateOf(i) !== 'ok' : true))
    .filter((i) => !q || catalogIndex.ingredient(i.ingredientId).name.toLowerCase().includes(q));
  const withExpiry = quantified.filter((i) => !!i.expiryDate).length;
  const attention = quantified.length - counts.ok;

  return (
    <Screen>
      <AppHeader right={<HeaderIcon icon="add-circle-outline" label="Aggiungi in dispensa" onPress={() => router.push('/aggiungi')} />} />
      <ScreenTitle title="Dispensa" />
      {quantified.length > 5 ? <SearchField value={query} onChangeText={setQuery} placeholder="Cerca in dispensa..." label="Cerca un prodotto in dispensa" /> : null}
      {quantified.length > 0 ? (
        <Pills
          fill
          options={[
            { key: 'all', label: 'Tutti' },
            { key: 'expiry', label: 'Scadenze', count: withExpiry > 0 ? withExpiry : undefined },
            { key: 'attention', label: 'Da controllare', count: attention > 0 ? attention : undefined },
          ]}
          value={filter}
          onChange={setFilter}
        />
      ) : null}

      <ShortageScene names={warnings.map((w) => catalogIndex.ingredient(w.ingredientId).name)} />

      {expiring.length > 0 ? (
        <View style={styles.scene}>
          <MinaMascot pose="thinking" size={84} style={styles.sceneMina} />
          <StickyNote tone="sage" style={styles.flex}>
            <Text variant="heading" style={styles.bold}>
              In scadenza a breve
            </Text>
            <Text variant="small" color={colors.inkSoft}>
              {`${expiring.map((e) => `${catalogIndex.ingredient(e.ingredientId).name} (${formatShortDate(e.expiryDate!)})`).join(', ')}: non ancora previsti in un pasto.`}
            </Text>
            <Button kind="secondary" compact icon="calendar-outline" label="Usali nei prossimi pasti" onPress={prioritize} style={styles.noteBtn} />
          </StickyNote>
        </View>
      ) : null}

      {quantified.length === 0 ? (
        <View style={styles.emptyState}>
          <MinaMascot pose="empty" size={120} animated />
          <Text variant="title" center>
            La dispensa è vuota
          </Text>
          <Text variant="body" color={colors.inkSoft} center>
            Quando confermi una spesa, i prodotti compaiono qui. Puoi anche aggiungere ciò che hai già.
          </Text>
          <Button label="Aggiungi in dispensa" icon="add" onPress={() => router.push('/aggiungi')} />
        </View>
      ) : filtered.length === 0 ? (
        <Text variant="body" color={colors.inkSoft} center style={styles.emptyFilter}>
          {q ? 'Nessun prodotto con questo nome.' : filter === 'expiry' ? 'Nessuna scadenza inserita. Puoi aggiungerla toccando un prodotto.' : 'Tutto a posto: niente da controllare.'}
        </Text>
      ) : (
        <ListCard>
          {filtered.map((i) => {
            const ing = catalogIndex.ingredient(i.ingredientId);
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
                title={ing.name}
                subtitle={
                  <View style={styles.sub}>
                    <Text variant="small" color={colors.inkSoft}>
                      {`${avail ?? '0'}${i.estimated && avail ? ' (stima)' : ''}${need ? ` · servono ${need}` : ''}`}
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
                          {`${st !== 'ok' ? ' · ' : ''}scade ${formatShortDate(i.expiryDate)}`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                }
                onPress={() => router.push(`/voce/${i.ingredientId}`)}
                accessibilityLabel={`${ing.name}: ${avail ? `${avail} disponibili${i.estimated ? ', stima' : ''}` : 'esaurito'}${need ? `, ${need} necessari` : ''}. Stato: ${s.row}${i.expiryDate ? `. Scade il ${formatShortDate(i.expiryDate)}` : ''}`}
              />
            );
          })}
        </ListCard>
      )}

      <Text variant="title" style={styles.section} accessibilityRole="header">
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
      <InfoToggle label="Come funziona la dispensa" text={`Le quantità arrivano dalle spese confermate e dalle tue correzioni. I pasti programmati non sottraggono nulla finché non confermi di averli cucinati. ${t('estimate.note')}`} />
    </Screen>
  );
}

type PantryState = 'ok' | 'check' | 'short' | 'out';
const STATE: Record<PantryState, { label: string; row: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ok: { label: 'Disponibile', row: 'Disponibile', bg: colors.greenSoft, fg: colors.greenDark, icon: 'checkmark-circle' },
  check: { label: 'Da verificare (stima)', row: 'Da verificare', bg: '#F3E3A6', fg: '#6B5410', icon: 'help-circle' },
  short: { label: 'Potrebbe non bastare', row: 'Insufficiente', bg: colors.peachSoft, fg: colors.peachInk, icon: 'alert-circle' },
  out: { label: 'Esaurito', row: 'Esaurito', bg: colors.tab, fg: colors.inkSoft, icon: 'remove-circle' },
};

/**
 * La scena «Potrebbe non bastare», guidata dalla regia di Mina:
 *  - avviso nuovo: Mina lo guarda, sopracciglia preoccupate, si inclina e lo indica (una volta per avviso; tornando
 *    nella pagina resta composta, senza ripetere la scena);
 *  - un ingrediente sistemato (gli altri restano): sorride e fa un saltello, poi torna composta;
 *  - tutto sistemato: l'avviso sparisce e al suo posto Mina sorride per un momento («Ora ci siamo»).
 */
function ShortageScene({ names }: { names: string[] }) {
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
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: why }} accessibilityLabel={`${names.length} ingredienti potrebbero non bastare. Tocca per sapere perché`} onPress={() => setWhy((v) => !v)} style={[styles.scene, styles.alert]}>
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
              {relief ? 'Meglio così!' : `${names.length} ${names.length === 1 ? 'ingrediente potrebbe' : 'ingredienti potrebbero'} non bastare`}
            </Text>
            <View style={styles.minaTap}>
              <Ionicons name={why ? 'chevron-up-circle-outline' : 'help-circle-outline'} size={16} color={colors.green} />
              <Text variant="small" color={colors.green}>
                {why ? 'Chiudi' : 'Perché?'}
              </Text>
            </View>
          </View>
        </Pressable>
        {why ? (
          <Reveal from="pop">
            <StickyNote>
              <Text variant="small" color={colors.inkSoft}>
                {`Per i pasti previsti serve più di quanto risulta in dispensa (${key}). Quello che manca è già nella lista della spesa. Se in casa ne hai di più, tocca il prodotto e correggi la quantità.`}
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
        <MinaAnimated state="happy" size={54} accessibilityLabel="Mina è contenta: scorte a posto" style={styles.alertMina} />
        <View style={styles.flex}>
          <Text variant="heading" color={colors.greenDark} style={styles.bold}>
            Ora ci siamo
          </Text>
          <Text variant="small" color={colors.inkSoft}>
            Scorte a posto: quello che serve è disponibile o già in lista.
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
