import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { capitalize, formatLongDate, weekdayOf, weekdayShort } from '../../src/core/domain/dates';
import { formatLocale } from '../../src/core/domain/locale';
import { formatQtyWithUnit, parseUserQty, toMilli } from '../../src/core/domain/quantity';
import { tripCost } from '../../src/core/domain/cost';
import { formatCents } from '../../src/core/domain/prices';
import { WARN_BEFORE_FIRST, type ShoppingLine, type ShoppingTripPlan } from '../../src/core/domain/shopping';
import { SHOPPING_CATEGORIES, type ShoppingCategory } from '../../src/core/domain/types';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { checkKey } from '../../src/features/app/SpesoraService';
import { useT } from '../../src/i18n';
import { EMPTY } from '../../src/i18n/assistant';
import { ingredientName, recipeName } from '../../src/i18n/content';
import { CATEGORY_LABELS } from '../../src/i18n/labels';
import { colors, TOUCH, font, radius, shadow, space } from '../../src/theme/tokens';
import { Burst } from '../../src/ui/Burst';
import { Button } from '../../src/ui/Button';
import { CheckBox } from '../../src/ui/CheckBox';
import { celebrate } from '../../src/ui/celebration';
import { CategoryIcon } from '../../src/ui/illustrations/CategoryIcon';
import { IngredientSymbol } from '../../src/ui/illustrations/IngredientSymbol';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { AppHeader, Expandable, InlineError, Pills, ScreenTitle } from '../../src/ui/mina/kit';
import { LinkRow } from '../../src/ui/notebook';
import { Reveal } from '../../src/ui/Reveal';
import { Screen } from '../../src/ui/Screen';
import { Strike } from '../../src/ui/Strike';
import { Text } from '../../src/ui/Text';

/*
 * Lista della spesa. Ordine: titolo → scelta della lista (giorno) → filtri Da acquistare / Acquistati → prodotti per
 * reparto (casella, simbolo, nome, quantità) → dettagli a richiesta. In basso un solo pulsante «Conferma acquisti»:
 * l'importo pagato (facoltativo) si inserisce nel pannello di conferma, così non copre più la lista.
 */

const tripKey = (tr: ShoppingTripPlan) => `${tr.isInitial ? 'i' : 'r'}_${tr.date}`;
const ingName = (id: string) => ingredientName(id, catalogIndex.ingredient(id).name);
/** Importo d'esempio nel formato locale («23,40», «23.40»). */
const exampleAmount = () => (23.4).toLocaleString(formatLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Shopping() {
  const { trip } = useLocalSearchParams<{ trip?: string }>();
  const { snapshot, run } = useApp();
  const { t } = useT();
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
  const subtitle =
    current && trips.length <= 1
      ? [
          current.isInitial ? t('shopping:sub.initial') : null,
          current.date === snapshot.today ? t('shopping:sub.todayDate', { date: formatLongDate(current.date) }) : formatLongDate(current.date),
          nextOther ? t('shopping:sub.then', { day: `${weekdayShort(weekdayOf(nextOther.date))} ${Number(nextOther.date.slice(8))}` }) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;
  const last = snapshot.confirmedTrips[snapshot.confirmedTrips.length - 1];

  return (
    <Screen footer={current ? <ConfirmBar trip={current} /> : undefined}>
      <AppHeader />
      <ScreenTitle
        title={t('shopping:title')}
        subtitle={subtitle}
        right={current && !complete ? <MinaMascot pose="shopping" size={64} animated glance={checkedCount} style={styles.titleMina} /> : undefined}
      />
      {trips.length === 0 ? (
        <View style={styles.empty}>
          <MinaMascot pose="success" size={130} animated />
          <Text variant="title" center>
            {t('shopping:empty.title')}
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
                options={trips.map((tr) => ({
                  key: tripKey(tr),
                  label: tr.isInitial ? t('shopping:trip.initial') : tr.date === snapshot.today ? t('tabs.today') : `${capitalize(weekdayShort(weekdayOf(tr.date)))} ${Number(tr.date.slice(8))}`,
                  icon: 'basket-outline' as const,
                }))}
                value={current ? tripKey(current) : ''}
                onChange={setSelected}
              />
            </ScrollView>
          ) : null}
          <Pills
            fill
            options={[
              { key: 'todo', label: t('shopping:filter.todo'), count: todoCount },
              { key: 'done', label: t('shopping:filter.done'), count: checkedCount },
            ]}
            value={filter}
            onChange={setFilter}
          />
          {complete && filter === 'todo' ? (
            <View style={styles.done} accessible accessibilityRole="alert" accessibilityLabel={t('shopping:done.a11y')}>
              {/* la festa: braccia in alto, occhi felici, salto e pugno di vittoria, con foglioline e scintille */}
              <View style={styles.doneMina}>
                <Burst play={tripKey(current)} size={190} style={styles.burst} />
                <MinaMascot pose="success" size={96} animated replayKey={tripKey(current)} />
              </View>
              <View style={styles.flex}>
                <Text variant="title">{t('shopping:done.title')}</Text>
                <Text variant="small" color={colors.inkSoft}>
                  {t('shopping:done.text')}
                </Text>
              </View>
            </View>
          ) : null}
          {current ? <TripView trip={current} filter={filter} isChecked={isChecked} /> : null}
        </>
      )}

      {snapshot.shopping.covered.length > 0 ? (
        <View>
          <LinkRow label={t('shopping:covered.a11y', { count: snapshot.shopping.covered.length })} onPress={() => setShowCovered((v) => !v)}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text variant="heading" style={styles.flex}>
              {t('shopping:covered.label', { count: snapshot.shopping.covered.length })}
            </Text>
            <Ionicons name={showCovered ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkSoft} />
          </LinkRow>
          {showCovered
            ? snapshot.shopping.covered.map((c) => {
                const ing = catalogIndex.ingredient(c.ingredientId);
                return (
                  <View key={c.ingredientId} style={styles.coveredRow}>
                    <Text variant="small" style={styles.flex}>
                      {ingName(c.ingredientId)}
                    </Text>
                    <Text variant="small" color={colors.inkSoft}>
                      {t('shopping:covered.qty', { qty: formatQtyWithUnit(c.qty, ing.unit) })}
                    </Text>
                  </View>
                );
              })
            : null}
        </View>
      ) : null}

      {last ? (
        <Text variant="small" color={colors.inkSoft}>
          {last.actualCents !== null ? t('shopping:last.paid', { date: formatLongDate(last.tripDate), amount: formatCents(last.actualCents) }) : t('shopping:last', { date: formatLongDate(last.tripDate) })}
        </Text>
      ) : null}
      <Button kind="ghost" label={t('shopping:refresh')} icon="refresh-outline" onPress={() => void run(async () => undefined)} />
    </Screen>
  );
}

/** Prodotti che servono già il giorno stesso della spesa (prima ricetta quel giorno). */
const isUrgent = (l: ShoppingLine, trip: ShoppingTripPlan) => !l.toTaste && l.uses.some((u) => u.date === trip.date);

/** La lista di un'uscita: per reparto, in card con la fascia del reparto (comprimibile); «Da acquistare» o «Acquistati». */
function TripView({ trip, filter, isChecked }: { trip: ShoppingTripPlan; filter: 'todo' | 'done'; isChecked: (l: ShoppingLine) => boolean }) {
  const { snapshot, run } = useApp();
  const { t } = useT();
  const [closed, setClosed] = useState<Set<ShoppingCategory>>(() => new Set());
  const shown = trip.lines.filter((l) => (filter === 'done' ? isChecked(l) : !isChecked(l)));
  const groups = SHOPPING_CATEGORIES.map((cat) => ({ cat, lines: shown.filter((l) => catalogIndex.ingredient(l.ingredientId).category === cat) })).filter((g) => g.lines.length > 0);
  const toggle = (l: ShoppingLine) => void run((s) => s.setChecked(trip.date, l.ingredientId, !isChecked(l)));
  const flip = (cat: ShoppingCategory) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  const isToday = trip.date === snapshot?.today;
  return (
    <View style={styles.tripGap}>
      {groups.length === 0 && filter === 'done' ? (
        <Text variant="body" color={colors.inkSoft} center style={styles.emptyFilter}>
          {t('shopping:filter.doneEmpty')}
        </Text>
      ) : null}
      {groups.map((g) => {
        const open = !closed.has(g.cat);
        const name = CATEGORY_LABELS[g.cat];
        return (
          <View key={g.cat} style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${name}, ${g.lines.length}`}
              accessibilityHint={t(open ? 'shopping:group.collapse' : 'shopping:group.expand', { name })}
              onPress={() => flip(g.cat)}
              style={styles.groupHead}
            >
              <CategoryIcon category={g.cat} size={24} />
              <Text variant="heading" color={colors.peachInk} style={[styles.flex, styles.groupName]} accessibilityRole="header" numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.count}>
                <Text variant="small" color={colors.peachInk} style={styles.bold}>
                  {String(g.lines.length)}
                </Text>
              </View>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.peachInk} />
            </Pressable>
            {open
              ? g.lines.map((l, i) => (
                  <View key={l.ingredientId}>
                    {i > 0 ? <View style={styles.sep} /> : null}
                    <LineRow line={l} trip={trip} checked={isChecked(l)} onToggle={() => toggle(l)} urgentToday={isToday} />
                  </View>
                ))
              : null}
          </View>
        );
      })}
      {/* informazioni secondarie in fondo, a richiesta: non coprono l'elenco dei prodotti */}
      <Expandable title={t('shopping:details')} icon="receipt-outline">
        {trip.isInitial ? <MoreInfo text={t('shopping:initial.text')} more={t('shopping:initial.more')} color={colors.peachInk} /> : null}
        <TripCostLine trip={trip} />
      </Expandable>
    </View>
  );
}

function qtyText(line: ShoppingLine, toTaste: string): string {
  const ing = catalogIndex.ingredient(line.ingredientId);
  return line.toTaste ? toTaste : line.packs ? `${line.packs.count} × ${formatQtyWithUnit(toMilli(line.packs.packSize), ing.unit)}` : formatQtyWithUnit(line.suggestedQty, ing.unit);
}

function LineRow({ line, trip, checked, onToggle, urgentToday }: { line: ShoppingLine; trip: ShoppingTripPlan; checked: boolean; onToggle: () => void; urgentToday: boolean }) {
  const { t } = useT();
  const [info, setInfo] = useState(false);
  // L'avviso "serve prima del primo giorno di spesa" è già scritto sopra, per tutta la spesa iniziale.
  const warnings = trip.isInitial ? line.warnings.filter((w) => w !== WARN_BEFORE_FIRST) : line.warnings;
  const ing = catalogIndex.ingredient(line.ingredientId);
  const name = ingName(line.ingredientId);
  const recipes = [...new Map(line.uses.map((u) => [u.recipeId + u.date, u])).values()]
    .map((u) => {
      const r = catalogIndex.recipe(u.recipeId);
      return `${r ? recipeName(r) : ''} (${weekdayShort(weekdayOf(u.date))})`;
    })
    .join(', ');
  const urgent = isUrgent(line, trip);
  const qty = line.toTaste ? t('shopping:toTaste.line') : qtyText(line, t('shopping:toTaste'));
  return (
    <View style={styles.lineWrap}>
      <View style={styles.line}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={[name, line.toTaste ? t('shopping:toTaste.a11y') : qtyText(line, t('shopping:toTaste')), urgent ? t(urgentToday ? 'shopping:urgent.a11yToday' : 'shopping:urgent.a11yNow') : null].filter(Boolean).join(', ')}
          accessibilityHint={t('shopping:line.hint')}
          onPress={onToggle}
          style={({ pressed }) => [styles.lineMain, pressed && styles.pressed]}
        >
          <CheckBox checked={checked} size={26} />
          <IngredientSymbol id={line.ingredientId} category={ing.category} size={36} style={checked ? styles.dim : undefined} />
          <View style={styles.flex}>
            {/* nel carrello: la riga si disegna sopra il nome */}
            <Strike on={checked}>
              {(wrapped) => (
                <Text variant="heading" style={[styles.lineName, checked && styles.checked, checked && wrapped && styles.through]} numberOfLines={2}>
                  {name}
                </Text>
              )}
            </Strike>
            <View style={styles.lineMeta}>
              <Text variant="small" color={colors.inkSoft} style={styles.qty}>
                {qty}
              </Text>
              {urgent && !checked ? (
                <View style={styles.urgent}>
                  <Text variant="caption" color={colors.peachInk}>
                    {t(urgentToday ? 'shopping:urgent.today' : 'shopping:urgent.now')}
                  </Text>
                </View>
              ) : null}
              {warnings.length > 0 ? <Ionicons name="alert-circle" size={16} color={colors.peachInk} accessibilityLabel={t('shopping:warning')} /> : null}
            </View>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('shopping:why', { name })} accessibilityState={{ expanded: info }} onPress={() => setInfo((v) => !v)} style={styles.infoBtn} hitSlop={4}>
          <Ionicons name={info ? 'information-circle' : 'information-circle-outline'} size={22} color={colors.inkSoft} />
        </Pressable>
      </View>
      {info ? (
        <View style={styles.infoBox}>
          {recipes ? <Text variant="small">{t('shopping:for', { recipes })}</Text> : null}
          {line.packs ? (
            <Text variant="small" color={colors.inkSoft}>
              {t('shopping:packs', { qty: formatQtyWithUnit(line.qty, ing.unit) })}
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
  const { t } = useT();
  if (!snapshot?.economics) return null;
  const tc = tripCost(trip, catalogIndex, snapshot.prices);
  const week = snapshot.economics.shopping;
  const budget = snapshot.economics.budget;
  const parts: string[] = [];
  if (tc.completeness === 'completa') parts.push(t('shopping:cost.complete', { amount: formatCents(tc.knownCents) }));
  else if (tc.completeness === 'parziale') parts.push(t('shopping:cost.partial', { known: tc.knownCount, total: tc.totalCount, amount: formatCents(tc.knownCents) }));
  else parts.push(t('shopping:cost.none'));
  if (week.completeness === 'completa' && snapshot.shopping.trips.length > 1) parts.push(t('shopping:cost.week', { amount: formatCents(week.knownCents) }));
  if (budget.weeklyLimitCents !== null && week.completeness === 'completa') {
    const left = budget.weeklyLimitCents - week.knownCents;
    parts.push(left >= 0 ? t('shopping:cost.left', { amount: formatCents(left) }) : t('shopping:cost.over', { amount: formatCents(-left) }));
  }
  // la cifra (o il «non stimato») subito; la nota su cosa comprende la stima solo a richiesta
  return <MoreInfo text={`${parts.join(' · ')}.`} more={budget.scopeNote} />;
}

/** Una riga breve con l'informazione essenziale; la spiegazione si apre con ⓘ (mai ripetuta di continuo). */
function MoreInfo({ text, more, color = colors.inkSoft }: { text: string; more: string; color?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.moreInfo}>
      <View style={styles.moreRow}>
        <Text variant="small" color={color} style={styles.flex}>
          {text}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t(open ? 'shopping:more.hide' : 'shopping:more.show')} accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} hitSlop={8}>
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

/** In basso solo il pulsante: la conferma (con l'importo facoltativo) si apre in un pannello compatto. */
function ConfirmBar({ trip }: { trip: ShoppingTripPlan }) {
  const { snapshot } = useApp();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const checked = trip.lines.filter((l) => snapshot?.checks.get(checkKey(trip.date, l.ingredientId)));
  return (
    <>
      <Button
        label={checked.length > 0 ? t('shopping:confirm.buttonCount', { count: checked.length }) : t('shopping:confirm.button')}
        icon="checkmark-done"
        size="large"
        onPress={() => checked.length > 0 && setOpen(true)}
        disabled={checked.length === 0}
        accessibilityHint={t('shopping:confirm.hint', { checked: checked.length, total: trip.lines.length })}
      />
      {open ? <ConfirmPanel trip={trip} checked={checked} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Pannello di completamento: riepilogo, importo pagato (facoltativo) e conferma. Sale dal basso sopra la lista. */
function ConfirmPanel({ trip, checked, onClose }: { trip: ShoppingTripPlan; checked: ShoppingLine[]; onClose: () => void }) {
  const { run } = useApp();
  const { t } = useT();
  const [paid, setPaid] = useState('');
  const [paidError, setPaidError] = useState(false);
  const partial = checked.length < trip.lines.length;
  const confirm = () => {
    const parsedPaid = paid.trim() === '' ? null : parseUserQty(paid);
    // errore recuperabile: si mostra accanto al campo
    if (paid.trim() !== '' && parsedPaid === null) {
      setPaidError(true);
      return;
    }
    const paidCents = parsedPaid === null ? null : Math.round(parsedPaid * 100);
    onClose();
    void run(async (s) => {
      await s.confirmShopping(
        trip.date,
        checked.map((l) => ({ ingredientId: l.ingredientId, qty: l.suggestedQty, toTaste: l.toTaste })),
        partial,
        paidCents,
      );
      return true;
    }).then((ok) => {
      if (ok) celebrate({ title: t('shopping:saved.title'), text: t('shopping:saved.text', { count: checked.length }), pose: 'success' });
    });
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('action.cancel')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap} pointerEvents="box-none">
        <Reveal from="sheet">
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <Text variant="title" accessibilityRole="header">
              {t(partial ? 'shopping:confirm.titlePartial' : 'shopping:confirm.title')}
            </Text>
            <Text variant="body" color={colors.inkSoft}>
              {`${t('shopping:confirm.text', { count: checked.length })}${partial ? ` ${t('shopping:confirm.partialNote')}` : ''}`}
            </Text>
            <View style={styles.paidBlock}>
              <Text variant="heading" style={styles.paidLabel}>
                {t('shopping:paid.label')}
              </Text>
              <TextInput
                value={paid}
                onChangeText={(v) => {
                  setPaid(v);
                  setPaidError(false);
                }}
                placeholder={t('shopping:paid.placeholder', { example: exampleAmount() })}
                placeholderTextColor={colors.inkSoft}
                keyboardType="decimal-pad"
                style={styles.paid}
                accessibilityLabel={t('shopping:paid.a11y')}
              />
              {paidError ? <InlineError text={t('shopping:paid.error', { example: exampleAmount() })} /> : <Text variant="small" color={colors.inkSoft}>{t('shopping:paid.note')}</Text>}
            </View>
            <View style={styles.sheetButtons}>
              <Button kind="secondary" label={t('action.cancel')} onPress={onClose} outerStyle={styles.flex} />
              <Button label={t('shopping:confirm.ok')} icon="checkmark-done" onPress={confirm} outerStyle={styles.flex} />
            </View>
          </SafeAreaView>
        </Reveal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.5 },
  titleMina: { marginBottom: -space.xs },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  tripScroll: { marginHorizontal: -space.lg },
  tripRow: { paddingHorizontal: space.lg },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.xl, backgroundColor: colors.greenSoft },
  doneMina: { width: 96, height: 112, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', left: -47, top: -39 },
  tripGap: { gap: space.md },
  emptyFilter: { paddingVertical: space.lg },
  group: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', ...shadow.card },
  // fascia del reparto: icona, nome, conteggio e freccia per comprimere (come nel riferimento)
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 46, paddingHorizontal: space.md, backgroundColor: colors.peachSoft },
  groupName: { fontWeight: '800', fontSize: 17 },
  count: { minWidth: 26, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: space.md + 26 + space.sm + 36 + space.sm },
  lineWrap: { paddingHorizontal: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // righe più basse (56): casella, simbolo, nome e quantità allineati a sinistra sotto il nome
  lineMain: { flex: 1, minHeight: TOUCH + 12, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  lineName: { fontWeight: '700', fontSize: 16, lineHeight: 21 },
  lineMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  qty: { fontVariant: ['tabular-nums'] },
  urgent: { backgroundColor: colors.peachSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  checked: { color: colors.inkSoft },
  through: { textDecorationLine: 'line-through' },
  infoBtn: { width: 36, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  infoBox: { gap: 4, paddingLeft: 26 + space.sm + 36 + space.sm, paddingRight: space.sm, paddingBottom: space.md },
  moreInfo: { gap: 4 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  coveredRow: { flexDirection: 'row', gap: space.sm, paddingVertical: 6, paddingHorizontal: space.sm },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(29,42,35,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { gap: space.md, padding: space.xl, paddingBottom: space.lg, backgroundColor: colors.desk, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  paidBlock: { gap: space.xs },
  paidLabel: { fontSize: 16 },
  paid: { minHeight: TOUCH + 4, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 17, fontFamily: font.regular, color: colors.ink, backgroundColor: colors.card },
  sheetButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
});
