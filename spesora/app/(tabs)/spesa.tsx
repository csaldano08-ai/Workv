import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Alert } from '../../src/ui/dialog';
import { formatLongDate, weekdayOf, weekdayShort } from '../../src/core/domain/dates';
import { formatQtyWithUnit, parseUserQty, toMilli } from '../../src/core/domain/quantity';
import { tripCost } from '../../src/core/domain/cost';
import { formatCents } from '../../src/core/domain/prices';
import { WARN_BEFORE_FIRST, type ShoppingLine, type ShoppingTripPlan } from '../../src/core/domain/shopping';
import { SHOPPING_CATEGORIES, type ShoppingCategory } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { checkKey } from '../../src/features/app/SpesoraService';
import { CATEGORY_LABELS } from '../../src/i18n/labels';
import { colors, TOUCH, font, radius, shadow, space } from '../../src/theme/tokens';
import { Burst } from '../../src/ui/Burst';
import { CheckBox } from '../../src/ui/CheckBox';
import { Hop } from '../../src/ui/Hop';
import { Strike } from '../../src/ui/Strike';
import { celebrate } from '../../src/ui/celebration';
import { Button } from '../../src/ui/Button';
import { EMPTY } from '../../src/i18n/assistant';
import { CategoryIcon } from '../../src/ui/illustrations/CategoryIcon';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { LinkRow, NotebookPage, PaperTabs, ProgressRing, StickyNote } from '../../src/ui/notebook';
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
  const [showCovered, setShowCovered] = useState(false);

  if (!snapshot?.profile) return <Screen>{null}</Screen>;
  const current = trips.find((tr) => tripKey(tr) === selected) ?? fromParam ?? trips[0];
  const checkedCount = current ? current.lines.filter((l) => snapshot.checks.get(checkKey(current.date, l.ingredientId))).length : 0;
  const nextOther = current ? trips.find((tr) => tr !== current && tr.date > current.date) : undefined;

  return (
    <Screen footer={current ? <ConfirmBar trip={current} /> : undefined}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text variant="title" accessibilityRole="header">
            La spesa
          </Text>
          {current ? (
            <Text variant="small" color={colors.inkSoft}>
              {`${current.date === snapshot.today ? 'oggi, ' : ''}${formatLongDate(current.date)}${nextOther ? ` · poi ${formatLongDate(nextOther.date)}` : ''}`}
            </Text>
          ) : null}
        </View>
        {current ? <ProgressRing done={checkedCount} total={current.lines.length} /> : null}
      </View>
      {trips.length === 0 ? (
        <View style={styles.empty}>
          <MinaMascot pose="success" size={110} animated />
          <StickyNote style={styles.flex}>
            <Text variant="hand">Niente da comprare</Text>
            <Text variant="small" color={colors.inkSoft}>
              {EMPTY.noShopping}
            </Text>
          </StickyNote>
        </View>
      ) : (
        <>
          <PaperTabs
            tabs={trips.map((tr) => ({ key: tripKey(tr), label: tr.isInitial ? 'Iniziale' : tr.date === snapshot.today ? 'Oggi' : `${weekdayShort(weekdayOf(tr.date))} ${Number(tr.date.slice(8))}` }))}
            value={current ? tripKey(current) : ''}
            onChange={setSelected}
            style={styles.tabs}
          />
          {current && current.lines.length > 0 && checkedCount === current.lines.length ? (
            <View style={styles.done} accessible accessibilityRole="alert" accessibilityLabel="Mina: lista completata! Conferma gli acquisti per aggiornare la dispensa.">
              {/* la festa: braccia in alto, occhi felici, salto e pugno di vittoria, con foglioline e scintille */}
              <View style={styles.doneMina}>
                <Burst play={tripKey(current)} size={190} style={styles.burst} />
                <MinaMascot pose="success" size={84} animated replayKey={tripKey(current)} />
              </View>
              <View style={styles.flex}>
                <Text variant="hand">Lista completata!</Text>
                <Text variant="small" color={colors.inkSoft}>
                  Conferma gli acquisti qui sotto: aggiorno io la dispensa.
                </Text>
              </View>
            </View>
          ) : null}
          {current ? <TripView trip={current} /> : null}
        </>
      )}

      {snapshot.shopping.covered.length > 0 ? (
        <View>
          <LinkRow label={`Già in dispensa, non da comprare: ${snapshot.shopping.covered.length}`} onPress={() => setShowCovered((v) => !v)}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text variant="heading" style={styles.flex}>{`Già in dispensa · ${snapshot.shopping.covered.length}`}</Text>
            <Ionicons name={showCovered ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkSoft} />
          </LinkRow>
          {showCovered
            ? snapshot.shopping.covered.map((c) => {
                const ing = catalogIndex.ingredient(c.ingredientId);
                return (
                  <View key={c.ingredientId} style={styles.coveredRow}>
                    <Text variant="small" style={styles.flex}>
                      {ing.name}
                    </Text>
                    <Text variant="small" color={colors.inkSoft}>
                      {`${formatQtyWithUnit(c.qty, ing.unit)} previsti`}
                    </Text>
                  </View>
                );
              })
            : null}
        </View>
      ) : null}

      {snapshot.confirmedTrips.length > 0 ? (
        <Text variant="small" color={colors.inkSoft}>
          {(() => {
            const last = snapshot.confirmedTrips[snapshot.confirmedTrips.length - 1];
            return `Ultima spesa confermata: ${formatLongDate(last.tripDate)}${last.actualCents !== null ? ` · pagato ${formatCents(last.actualCents)} (importo inserito da te)` : ''}.`;
          })()}
        </Text>
      ) : null}
      <Button kind="ghost" label="Aggiorna la lista" icon="refresh-outline" onPress={() => void run(async () => undefined)} />
    </Screen>
  );
}

/** Prodotti che servono già il giorno stesso della spesa (prima ricetta quel giorno). */
const isUrgent = (l: ShoppingLine, trip: ShoppingTripPlan) => !l.toTaste && l.uses.some((u) => u.date === trip.date);

function TripView({ trip }: { trip: ShoppingTripPlan }) {
  const { snapshot, run } = useApp();
  const urgent = trip.lines.filter((l) => isUrgent(l, trip));
  const tiles = urgent.slice(0, 3);
  const tileIds = new Set(tiles.map((l) => l.ingredientId));
  const rest = trip.lines.filter((l) => !tileIds.has(l.ingredientId));
  const groups = SHOPPING_CATEGORIES.map((cat) => ({ cat, lines: rest.filter((l) => catalogIndex.ingredient(l.ingredientId).category === cat) })).filter((g) => g.lines.length > 0);
  const isChecked = (l: ShoppingLine) => snapshot?.checks.get(checkKey(trip.date, l.ingredientId)) ?? false;
  const inCart = trip.lines.filter(isChecked).length;
  const toggle = (l: ShoppingLine) => void run((s) => s.setChecked(trip.date, l.ingredientId, !isChecked(l)));
  const isToday = trip.date === snapshot?.today;
  return (
    <View style={styles.tripGap}>
      <NotebookPage rings={0} contentStyle={styles.tripPage}>
        <View style={styles.minaRow}>
          <MinaMascot pose="shopping" size={84} animated glance={inCart} style={styles.minaShop} />
          <Text variant="hand" style={styles.flex}>
            {urgent.length > 0 ? `${isToday ? 'Prima questi' : 'Per primi questi'} ${urgent.length}: ${isToday ? 'servono oggi!' : 'servono subito!'}` : `${trip.lines.length} ${trip.lines.length === 1 ? 'prodotto' : 'prodotti'} per i prossimi pasti`}
          </Text>
        </View>
        {tiles.length > 0 ? (
          <View style={styles.tiles}>
            {tiles.map((l) => {
              const ing = catalogIndex.ingredient(l.ingredientId);
              const on = isChecked(l);
              return (
                // nel carrello la tessera fa un saltello
                <Hop key={l.ingredientId} on={on} style={styles.flex}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${ing.name}, ${qtyText(l)}, serve ${isToday ? 'oggi' : 'subito'}`}
                    onPress={() => toggle(l)}
                    style={[styles.tile, on && styles.tileOn]}
                  >
                    <CategoryIcon category={ing.category} size={40} />
                    <Text variant="small" center style={styles.tileName} numberOfLines={2}>
                      {ing.name}
                    </Text>
                    <Text variant="caption" color={colors.inkSoft}>
                      {qtyText(l)}
                    </Text>
                    <CheckBox checked={on} />
                  </Pressable>
                </Hop>
              );
            })}
          </View>
        ) : null}
        {urgent.length > tiles.length ? (
          <Text variant="handSmall" color={colors.greenDark} center>
            {`+ altri ${urgent.length - tiles.length} ${isToday ? 'per oggi' : 'subito'}, segnati qui sotto`}
          </Text>
        ) : null}
        {trip.isInitial ? (
          <Text variant="small" color={colors.peachInk}>
            Servono prima del tuo primo giorno di spesa. Se preferisci non uscire, cambia le ricette interessate.
          </Text>
        ) : null}
        <TripCostLine trip={trip} />
      </NotebookPage>

      {groups.length > 0 ? (
        <View style={styles.restHead}>
          <Text variant="hand" style={styles.flex}>
            {tiles.length > 0 ? 'Il resto della lista' : 'La lista'}
          </Text>
          <Text variant="caption" color={colors.inkSoft}>
            {`${rest.length} ${rest.length === 1 ? 'PRODOTTO' : 'PRODOTTI'}`}
          </Text>
        </View>
      ) : null}
      {groups.map((g) => (
        <CategoryGroup key={g.cat} cat={g.cat} lines={g.lines} trip={trip} isChecked={isChecked} onToggle={toggle} urgentToday={isToday} />
      ))}
    </View>
  );
}

function CategoryGroup({ cat, lines, trip, isChecked, onToggle, urgentToday }: { cat: ShoppingCategory; lines: ShoppingLine[]; trip: ShoppingTripPlan; isChecked: (l: ShoppingLine) => boolean; onToggle: (l: ShoppingLine) => void; urgentToday: boolean }) {
  const hasUrgent = lines.some((l) => isUrgent(l, trip));
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? (hasUrgent || lines.length <= 3);
  const done = lines.filter(isChecked).length;
  return (
    <View style={styles.group}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${CATEGORY_LABELS[cat]}: ${lines.length} prodotti, ${done} nel carrello`} onPress={() => setOpen(!isOpen)} style={styles.groupHead}>
        <CategoryIcon category={cat} size={30} />
        <Text variant="heading" style={styles.flex}>
          {CATEGORY_LABELS[cat]}
        </Text>
        <Text variant="caption" color={colors.inkSoft}>{done > 0 ? `${done}/${lines.length}` : `${lines.length}`}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
      </Pressable>
      {isOpen ? lines.map((l) => <LineRow key={l.ingredientId} line={l} trip={trip} checked={isChecked(l)} onToggle={() => onToggle(l)} urgentToday={urgentToday} />) : null}
    </View>
  );
}

function qtyText(line: ShoppingLine): string {
  const ing = catalogIndex.ingredient(line.ingredientId);
  return line.toTaste ? 'q.b.' : line.packs ? `${line.packs.count} × ${formatQtyWithUnit(toMilli(line.packs.packSize), ing.unit)}` : formatQtyWithUnit(line.suggestedQty, ing.unit);
}

function LineRow({ line, trip, checked, onToggle, urgentToday }: { line: ShoppingLine; trip: ShoppingTripPlan; checked: boolean; onToggle: () => void; urgentToday: boolean }) {
  const [info, setInfo] = useState(false);
  // L'avviso "serve prima del primo giorno di spesa" è già scritto sopra, per tutta la spesa iniziale.
  const warnings = trip.isInitial ? line.warnings.filter((w) => w !== WARN_BEFORE_FIRST) : line.warnings;
  const ing = catalogIndex.ingredient(line.ingredientId);
  const recipes = [...new Map(line.uses.map((u) => [u.recipeId + u.date, u])).values()]
    .map((u) => `${catalogIndex.recipe(u.recipeId)?.name ?? ''} (${weekdayShort(weekdayOf(u.date))})`)
    .join(', ');
  const urgent = isUrgent(line, trip);
  return (
    <View style={styles.lineWrap}>
      <View style={styles.line}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`${ing.name}, ${line.toTaste ? 'quanto basta, verifica di averlo' : qtyText(line)}${urgent ? `, serve ${urgentToday ? 'oggi' : 'subito'}` : ''}`}
          accessibilityHint="Segna come messo nel carrello. Diventa acquisto solo dopo la conferma."
          onPress={onToggle}
          style={({ pressed }) => [styles.lineMain, pressed && { opacity: 0.7 }]}
        >
          <CheckBox checked={checked} size={24} />
          <View style={styles.flex}>
            {/* nel carrello: la riga si disegna sopra il nome */}
            <Strike on={checked}>
              {(wrapped) => (
                <Text variant="body" style={[checked && styles.checked, checked && wrapped && styles.through]}>
                  {ing.name}
                  {urgent && !checked ? <Text variant="handSmall" color={colors.danger}>{urgentToday ? '  oggi' : '  subito'}</Text> : null}
                </Text>
              )}
            </Strike>
            {line.toTaste ? (
              <Text variant="caption" color={colors.inkSoft}>
                VERIFICA DI AVERLO
              </Text>
            ) : null}
          </View>
          {warnings.length > 0 ? <Ionicons name="alert-circle" size={18} color={colors.peachInk} accessibilityLabel="Avviso" /> : null}
          {/* quantità in evidenza, in colonna: si legge a colpo d'occhio anche mentre si cammina tra gli scaffali */}
          <View style={[styles.qtyPill, checked && styles.qtyPillDone]}>
            <Text variant="heading" style={styles.qtyText} color={checked ? colors.inkSoft : colors.ink}>
              {qtyText(line)}
            </Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Perché serve ${ing.name}`} accessibilityState={{ expanded: info }} onPress={() => setInfo((v) => !v)} style={styles.infoBtn} hitSlop={4}>
          <Ionicons name={info ? 'information-circle' : 'information-circle-outline'} size={22} color={colors.inkSoft} />
        </Pressable>
      </View>
      {info ? (
        <View style={styles.infoBox}>
          {recipes ? <Text variant="small">{`Per: ${recipes}`}</Text> : null}
          {line.packs ? (
            <Text variant="small" color={colors.inkSoft}>
              {`Servono ${formatQtyWithUnit(line.qty, ing.unit)} · formato comune indicativo, verifica in negozio`}
            </Text>
          ) : null}
          {warnings.map((w) => (
            <Text key={w} variant="small" color={colors.peachInk}>
              {w}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Costo previsto di un'uscita (confezioni intere) e, per la settimana, totale e budget residuo. */
function TripCostLine({ trip }: { trip: ShoppingTripPlan }) {
  const { snapshot } = useApp();
  if (!snapshot?.economics) return null;
  const tc = tripCost(trip, catalogIndex, snapshot.prices);
  const week = snapshot.economics.shopping;
  const budget = snapshot.economics.budget;
  const parts: string[] = [];
  if (tc.completeness === 'completa') parts.push(`Spesa prevista: circa ${formatCents(tc.knownCents)}`);
  else if (tc.completeness === 'parziale') parts.push(`Prezzo noto per ${tc.knownCount} prodotti su ${tc.totalCount}: almeno ${formatCents(tc.knownCents)}`);
  else parts.push('Costo non stimato: nessun prezzo noto per questi prodotti');
  if (week.completeness === 'completa' && snapshot.shopping.trips.length > 1) parts.push(`settimana: circa ${formatCents(week.knownCents)}`);
  if (budget.weeklyLimitCents !== null && week.completeness === 'completa') {
    const left = budget.weeklyLimitCents - week.knownCents;
    parts.push(left >= 0 ? `restano circa ${formatCents(left)} del budget` : `oltre il budget di circa ${formatCents(-left)}`);
  }
  return (
    <Text variant="small" color={colors.inkSoft}>
      {`${parts.join(' · ')}. ${budget.scopeNote}`}
    </Text>
  );
}

function ConfirmBar({ trip }: { trip: ShoppingTripPlan }) {
  const { snapshot, run } = useApp();
  const [paid, setPaid] = useState('');
  const checked = trip.lines.filter((l) => snapshot?.checks.get(checkKey(trip.date, l.ingredientId)));
  const confirm = () => {
    if (checked.length === 0) {
      Alert.alert('Nessun prodotto selezionato', 'Spunta i prodotti che hai acquistato, poi conferma.');
      return;
    }
    const partial = checked.length < trip.lines.length;
    const parsedPaid = paid.trim() === '' ? null : parseUserQty(paid);
    if (paid.trim() !== '' && parsedPaid === null) {
      Alert.alert('Importo non valido', 'Scrivi l’importo pagato, ad esempio 23,40, oppure lascia vuoto.');
      return;
    }
    const paidCents = parsedPaid === null ? null : Math.round(parsedPaid * 100);
    Alert.alert(
      partial ? 'Confermare una spesa parziale?' : 'Confermare la spesa?',
      `${checked.length} prodotti entreranno in dispensa con le quantità indicate. Potrai correggerle dalla Dispensa.${partial ? ' I prodotti non spuntati restano in lista.' : ''}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () =>
            void run(async (s) => {
              await s.confirmShopping(
                trip.date,
                checked.map((l) => ({ ingredientId: l.ingredientId, qty: l.suggestedQty, toTaste: l.toTaste })),
                partial,
                paidCents,
              );
              return true;
            }).then((ok) => {
              if (ok) celebrate({ title: 'Spesa registrata', text: `${checked.length} ${checked.length === 1 ? 'prodotto è' : 'prodotti sono'} in dispensa.`, pose: 'success' });
            }),
        },
      ],
    );
  };
  return (
    <View style={styles.confirmWrap}>
      {checked.length > 0 ? (
        <TextInput
          value={paid}
          onChangeText={setPaid}
          placeholder="Importo pagato (facoltativo), es. 23,40"
          placeholderTextColor={colors.inkSoft}
          keyboardType="decimal-pad"
          style={styles.paid}
          accessibilityLabel="Importo realmente pagato in euro, facoltativo"
        />
      ) : null}
      <View style={styles.confirm}>
        <Text variant="small" color={colors.inkSoft} style={styles.flex}>
          {`${checked.length} di ${trip.lines.length} nel carrello`}
        </Text>
        <Button label="Conferma acquisti" icon="checkmark-done" onPress={confirm} disabled={checked.length === 0} compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  empty: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  tabs: { marginTop: space.sm },
  tripGap: { gap: space.md },
  tripPage: { gap: space.md },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, paddingLeft: space.xs, borderRadius: radius.xl, backgroundColor: colors.greenSoft },
  minaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  minaShop: { marginVertical: -space.sm, marginLeft: -space.sm },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.md, paddingHorizontal: 4, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.greenMist },
  tileOn: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  tileName: { fontWeight: '700', minHeight: 36 },
  restHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line },
  doneMina: { alignItems: 'center', justifyContent: 'center' },
  burst: { left: 42 - 95, top: 48 - 95 },
  qtyPill: { minWidth: 58, alignItems: 'center', paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.greenMist },
  qtyPillDone: { backgroundColor: colors.tab },
  qtyText: { fontVariant: ['tabular-nums'], fontSize: 15 },
  group: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, minHeight: TOUCH + 8 },
  lineWrap: { borderTopWidth: 1, borderTopColor: colors.line },
  line: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.md },
  lineMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH + 4, paddingVertical: space.xs },
  infoBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  infoBox: { gap: 4, marginHorizontal: space.md, marginBottom: space.sm, padding: space.sm, borderRadius: radius.md, backgroundColor: colors.peachSoft },
  confirmWrap: { gap: space.sm },
  paid: { minHeight: TOUCH, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 16, color: colors.ink, backgroundColor: colors.white, fontFamily: font.regular },
  flex: { flex: 1 },
  checked: { color: colors.inkSoft },
  through: { textDecorationLine: 'line-through' },
  coveredRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.xl, paddingVertical: 2 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.md },
});
