import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Alert } from '../../src/ui/dialog';
import { capitalize, formatLongDate, weekdayOf, weekdayShort } from '../../src/core/domain/dates';
import { formatQtyWithUnit, parseUserQty, toMilli } from '../../src/core/domain/quantity';
import { tripCost } from '../../src/core/domain/cost';
import { formatCents } from '../../src/core/domain/prices';
import { WARN_BEFORE_FIRST, type ShoppingLine, type ShoppingTripPlan } from '../../src/core/domain/shopping';
import { SHOPPING_CATEGORIES } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { checkKey } from '../../src/features/app/SpesoraService';
import { CATEGORY_LABELS } from '../../src/i18n/labels';
import { colors, TOUCH, font, radius, shadow, space } from '../../src/theme/tokens';
import { Burst } from '../../src/ui/Burst';
import { CheckBox } from '../../src/ui/CheckBox';
import { Strike } from '../../src/ui/Strike';
import { celebrate } from '../../src/ui/celebration';
import { Button } from '../../src/ui/Button';
import { EMPTY } from '../../src/i18n/assistant';
import { CategoryIcon } from '../../src/ui/illustrations/CategoryIcon';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { LinkRow } from '../../src/ui/notebook';
import { AppHeader, InlineError, Pills, ScreenTitle } from '../../src/ui/mina/kit';
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
  const [filter, setFilter] = useState<'todo' | 'done'>('todo');

  if (!snapshot?.profile) return <Screen>{null}</Screen>;
  const current = trips.find((tr) => tripKey(tr) === selected) ?? fromParam ?? trips[0];
  const isChecked = (l: ShoppingLine) => (current ? (snapshot.checks.get(checkKey(current.date, l.ingredientId)) ?? false) : false);
  const checkedCount = current ? current.lines.filter(isChecked).length : 0;
  const todoCount = current ? current.lines.length - checkedCount : 0;
  const nextOther = current ? trips.find((tr) => tr !== current && tr.date > current.date) : undefined;
  const complete = !!current && current.lines.length > 0 && checkedCount === current.lines.length;

  return (
    <Screen footer={current ? <ConfirmBar trip={current} /> : undefined}>
      <AppHeader />
      <ScreenTitle
        title="Lista della spesa"
        subtitle={current ? `${current.isInitial ? 'Spesa iniziale · ' : ''}${current.date === snapshot.today ? 'oggi, ' : ''}${formatLongDate(current.date)}${nextOther ? ` · poi ${weekdayShort(weekdayOf(nextOther.date))} ${Number(nextOther.date.slice(8))}` : ''}` : undefined}
        right={current && !complete ? <MinaMascot pose="shopping" size={64} animated glance={checkedCount} style={styles.titleMina} /> : undefined}
      />
      {trips.length === 0 ? (
        <View style={styles.empty}>
          <MinaMascot pose="success" size={130} animated />
          <Text variant="title" center>
            Niente da comprare
          </Text>
          <Text variant="body" color={colors.inkSoft} center>
            {EMPTY.noShopping}
          </Text>
        </View>
      ) : (
        <>
          {trips.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripRow} style={styles.tripScroll}>
              <Pills
                soft
                options={trips.map((tr) => ({ key: tripKey(tr), label: tr.isInitial ? 'Iniziale' : tr.date === snapshot.today ? 'Oggi' : `${capitalize(weekdayShort(weekdayOf(tr.date)))} ${Number(tr.date.slice(8))}`, icon: 'basket-outline' as const }))}
                value={current ? tripKey(current) : ''}
                onChange={setSelected}
              />
            </ScrollView>
          ) : null}
          <Pills
            fill
            options={[
              { key: 'todo', label: 'Da acquistare', count: todoCount },
              { key: 'done', label: 'Acquistati', count: checkedCount },
            ]}
            value={filter}
            onChange={setFilter}
          />
          {complete && filter === 'todo' ? (
            <View style={styles.done} accessible accessibilityRole="alert" accessibilityLabel="Mina: lista completata! Conferma gli acquisti per aggiornare la dispensa.">
              {/* la festa: braccia in alto, occhi felici, salto e pugno di vittoria, con foglioline e scintille */}
              <View style={styles.doneMina}>
                <Burst play={tripKey(current)} size={190} style={styles.burst} />
                <MinaMascot pose="success" size={96} animated replayKey={tripKey(current)} />
              </View>
              <View style={styles.flex}>
                <Text variant="title">Lista completata!</Text>
                <Text variant="small" color={colors.inkSoft}>
                  Conferma gli acquisti qui sotto: aggiorno io la dispensa.
                </Text>
              </View>
            </View>
          ) : null}
          {current ? <TripView trip={current} filter={filter} isChecked={isChecked} /> : null}
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

/** La lista di un'uscita: per reparto, in card con la fascia del reparto; «Da acquistare» o «Acquistati». */
function TripView({ trip, filter, isChecked }: { trip: ShoppingTripPlan; filter: 'todo' | 'done'; isChecked: (l: ShoppingLine) => boolean }) {
  const { snapshot, run } = useApp();
  const shown = trip.lines.filter((l) => (filter === 'done' ? isChecked(l) : !isChecked(l)));
  const groups = SHOPPING_CATEGORIES.map((cat) => ({ cat, lines: shown.filter((l) => catalogIndex.ingredient(l.ingredientId).category === cat) })).filter((g) => g.lines.length > 0);
  const toggle = (l: ShoppingLine) => void run((s) => s.setChecked(trip.date, l.ingredientId, !isChecked(l)));
  const isToday = trip.date === snapshot?.today;
  return (
    <View style={styles.tripGap}>
      {trip.isInitial ? <MoreInfo text="Servono prima del tuo primo giorno di spesa." more="Se preferisci non uscire a comprarli, cambia le ricette interessate dalla Settimana." color={colors.peachInk} /> : null}
      <TripCostLine trip={trip} />
      {groups.length === 0 ? (
        filter === 'done' ? (
          <Text variant="body" color={colors.inkSoft} center style={styles.emptyFilter}>
            Spunta i prodotti mentre li metti nel carrello: li ritrovi qui.
          </Text>
        ) : null
      ) : null}
      {groups.map((g) => (
        <View key={g.cat} style={styles.group}>
          <View style={styles.groupHead}>
            <Text variant="heading" color={colors.peachInk} style={[styles.flex, styles.bold]} accessibilityRole="header">
              {CATEGORY_LABELS[g.cat]}
            </Text>
            <Text variant="small" color={colors.peachInk} style={styles.bold}>
              {String(g.lines.length)}
            </Text>
          </View>
          {g.lines.map((l, i) => (
            <View key={l.ingredientId}>
              {i > 0 ? <View style={styles.sep} /> : null}
              <LineRow line={l} trip={trip} checked={isChecked(l)} onToggle={() => toggle(l)} urgentToday={isToday} />
            </View>
          ))}
        </View>
      ))}
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
          <CheckBox checked={checked} size={26} />
          <View style={styles.flex}>
            {/* nel carrello: la riga si disegna sopra il nome */}
            <Strike on={checked}>
              {(wrapped) => (
                <Text variant="heading" style={[styles.lineName, checked && styles.checked, checked && wrapped && styles.through]}>
                  {ing.name}
                </Text>
              )}
            </Strike>
            <View style={styles.lineMeta}>
              <Text variant="small" color={colors.inkSoft}>
                {line.toTaste ? 'q.b. · verifica di averlo' : qtyText(line)}
              </Text>
              {urgent && !checked ? (
                <View style={styles.urgent}>
                  <Text variant="caption" color={colors.peachInk}>
                    {urgentToday ? 'SERVE OGGI' : 'SERVE SUBITO'}
                  </Text>
                </View>
              ) : null}
              {warnings.length > 0 ? <Ionicons name="alert-circle" size={16} color={colors.peachInk} accessibilityLabel="Avviso" /> : null}
            </View>
          </View>
          <CategoryIcon category={ing.category} size={34} />
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
  // la cifra (o il «non stimato») subito; la nota su cosa comprende la stima solo a richiesta
  return <MoreInfo text={`${parts.join(' · ')}.`} more={budget.scopeNote} />;
}

/** Una riga breve con l'informazione essenziale; la spiegazione si apre con ⓘ (mai ripetuta di continuo). */
function MoreInfo({ text, more, color = colors.inkSoft }: { text: string; more: string; color?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.moreInfo}>
      <View style={styles.moreRow}>
        <Text variant="small" color={color} style={styles.flex}>
          {text}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Nascondi la spiegazione' : 'Mostra la spiegazione'} accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={20} color={colors.inkSoft} />
        </Pressable>
      </View>
      {open ? (
        <Text variant="small" color={colors.inkSoft}>
          {more}
        </Text>
      ) : null}
    </View>
  );
}

function ConfirmBar({ trip }: { trip: ShoppingTripPlan }) {
  const { snapshot, run } = useApp();
  const [paid, setPaid] = useState('');
  const [paidError, setPaidError] = useState(false);
  const checked = trip.lines.filter((l) => snapshot?.checks.get(checkKey(trip.date, l.ingredientId)));
  const confirm = () => {
    if (checked.length === 0) return; // il pulsante è disattivato: niente finestra per un caso che non può capitare
    const partial = checked.length < trip.lines.length;
    const parsedPaid = paid.trim() === '' ? null : parseUserQty(paid);
    // errore recuperabile: si mostra accanto al campo, non in una finestra
    if (paid.trim() !== '' && parsedPaid === null) {
      setPaidError(true);
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
          onChangeText={(v) => {
            setPaid(v);
            setPaidError(false);
          }}
          placeholder="Importo pagato (facoltativo), es. 23,40"
          placeholderTextColor={colors.inkSoft}
          keyboardType="decimal-pad"
          style={styles.paid}
          accessibilityLabel="Importo realmente pagato in euro, facoltativo"
        />
      ) : null}
      {paidError ? <InlineError text="Importo non valido: scrivi ad esempio 23,40, oppure lascia vuoto." /> : null}
      <Button
        label={checked.length > 0 ? `Conferma acquisti (${checked.length})` : 'Conferma acquisti'}
        icon="checkmark-done"
        size="large"
        onPress={confirm}
        disabled={checked.length === 0}
        accessibilityHint={`${checked.length} di ${trip.lines.length} prodotti nel carrello. Entrano in dispensa dopo la conferma.`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  titleMina: { marginBottom: -space.xs },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  tripScroll: { marginHorizontal: -space.lg },
  tripRow: { paddingHorizontal: space.lg },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.xl, backgroundColor: colors.greenSoft },
  doneMina: { width: 96, height: 112, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', left: -47, top: -39 },
  tripGap: { gap: space.md },
  emptyFilter: { paddingVertical: space.lg },
  group: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', ...shadow.card },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm + 2, backgroundColor: colors.peachSoft },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: space.lg + 26 + space.md },
  lineWrap: { paddingHorizontal: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  lineMain: { flex: 1, minHeight: TOUCH + 16, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingLeft: space.xs },
  lineName: { fontWeight: '700' },
  lineMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  urgent: { backgroundColor: colors.peachSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  checked: { color: colors.inkSoft },
  through: { textDecorationLine: 'line-through' },
  infoBtn: { width: 36, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  infoBox: { gap: 4, paddingLeft: 26 + space.md + space.xs, paddingRight: space.sm, paddingBottom: space.md },
  moreInfo: { gap: 4 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  coveredRow: { flexDirection: 'row', gap: space.sm, paddingVertical: 6, paddingHorizontal: space.sm },
  confirmWrap: { gap: space.sm },
  paid: { minHeight: TOUCH, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 16, fontFamily: font.regular, color: colors.ink, backgroundColor: colors.white },
});
