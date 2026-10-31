import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { normalizeText } from '../../core/domain/catalog';
import { formatQtyWithUnit, parseUserQty, toMilli } from '../../core/domain/quantity';
import { suggestShoppingDays, weeklyBudgetCents } from '../../core/domain/profile';
import { ALLERGENS, DIETS, EQUIPMENT, MEAL_TYPES, type MealType, type UserProfile, type Weekday } from '../../core/domain/types';
import { weekdayName } from '../../core/domain/dates';
import { ALLERGEN_LABELS, DIET_LABELS, EQUIPMENT_LABELS, MEAL_LABELS } from '../../i18n/labels';
import { t } from '../../i18n/it';
import { colors, radius, space, TOUCH } from '../../theme/tokens';
import { Chip, ChipGroup } from '../../ui/Chip';
import { Notice } from '../../ui/Notice';
import { SectionTitle } from '../../ui/Row';
import { Stepper, TimeStepper } from '../../ui/Stepper';
import { Text } from '../../ui/Text';
import { catalogIndex } from '../app/AppProvider';
import { COMMON_DISLIKES, MINUTE_OPTIONS, QUICK_PANTRY, type OnboardingDraft } from './draft';
import type { NotificationSettings } from '../../core/notifications/schedule';

export interface StepProps {
  draft: OnboardingDraft;
  setDraft: (updater: (d: OnboardingDraft) => OnboardingDraft) => void;
}

const setProfile = (setDraft: StepProps['setDraft'], fn: (p: UserProfile) => UserProfile) =>
  setDraft((d) => ({ ...d, profile: fn(d.profile) }));

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const minuteLabel = (m: number) => (m >= 60 ? '60+ min' : `${m} min`);

/* ------------------------------------------------------------------ */

export function PeopleStep({ draft, setDraft }: StepProps) {
  const n = draft.profile.servings;
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {[1, 2, 3, 4].map((v) => (
          <Chip key={v} label={String(v)} selected={n === v} onPress={() => setProfile(setDraft, (p) => ({ ...p, servings: v }))} />
        ))}
        <Chip label="5 o più" selected={n >= 5} onPress={() => setProfile(setDraft, (p) => ({ ...p, servings: Math.max(5, p.servings) }))} />
      </ChipGroup>
      {n >= 5 ? (
        <Stepper label="Numero di persone" value={n} min={5} max={30} onChange={(v) => setProfile(setDraft, (p) => ({ ...p, servings: v }))} />
      ) : null}
      <Text variant="small" color={colors.inkSoft}>
        Le quantità di ricette e spesa vengono calcolate per questo numero. Puoi cambiarlo per un singolo pasto.
      </Text>
    </View>
  );
}

export function MealsStep({ draft, setDraft }: StepProps) {
  return (
    <ChipGroup>
      {MEAL_TYPES.map((m) => (
        <Chip
          key={m}
          label={MEAL_LABELS[m]}
          selected={draft.profile.mealTypes.includes(m)}
          onPress={() => setProfile(setDraft, (p) => ({ ...p, mealTypes: toggle(p.mealTypes, m) }))}
        />
      ))}
    </ChipGroup>
  );
}

export function DietStep({ draft, setDraft }: StepProps) {
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {DIETS.map((d) => (
          <Chip key={d} label={DIET_LABELS[d]} selected={draft.profile.diet === d} onPress={() => setProfile(setDraft, (p) => ({ ...p, diet: d }))} />
        ))}
      </ChipGroup>
      <Text variant="small" color={colors.inkSoft}>
        Pescetariano: niente carne, sì pesce. La compatibilità è calcolata dagli ingredienti di ogni ricetta.
      </Text>
    </View>
  );
}

export function AllergenStep({ draft, setDraft }: StepProps) {
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {ALLERGENS.map((a) => (
          <Chip
            key={a}
            tone="danger"
            label={ALLERGEN_LABELS[a]}
            selected={draft.profile.excludedAllergens.includes(a)}
            onPress={() => setProfile(setDraft, (p) => ({ ...p, excludedAllergens: toggle(p.excludedAllergens, a) }))}
          />
        ))}
      </ChipGroup>
      <SectionTitle>Altri ingredienti da evitare</SectionTitle>
      <IngredientPicker
        selected={draft.profile.excludedIngredientIds}
        tone="danger"
        onToggle={(id) => setProfile(setDraft, (p) => ({ ...p, excludedIngredientIds: toggle(p.excludedIngredientIds, id) }))}
      />
      <Notice tone="warning" text={t('allergen.disclaimer')} />
      {draft.profile.excludedAllergens.length > 0 ? (
        <Text variant="small" color={colors.inkSoft}>
          Con almeno un’esclusione attiva, Spesora scarta anche le ricette con prodotti confezionati i cui allergeni dipendono dalla marca (per esempio pesto o pane).
        </Text>
      ) : null}
    </View>
  );
}

export function DislikeStep({ draft, setDraft }: StepProps) {
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {COMMON_DISLIKES.filter((id) => catalogIndex.ingredients.has(id)).map((id) => (
          <Chip
            key={id}
            tone="peach"
            label={catalogIndex.ingredient(id).name}
            selected={draft.profile.dislikedIngredientIds.includes(id)}
            onPress={() => setProfile(setDraft, (p) => ({ ...p, dislikedIngredientIds: toggle(p.dislikedIngredientIds, id) }))}
          />
        ))}
      </ChipGroup>
      <SectionTitle>Cerca un altro ingrediente</SectionTitle>
      <IngredientPicker
        selected={draft.profile.dislikedIngredientIds}
        tone="peach"
        onToggle={(id) => setProfile(setDraft, (p) => ({ ...p, dislikedIngredientIds: toggle(p.dislikedIngredientIds, id) }))}
      />
    </View>
  );
}

function IngredientPicker({ selected, onToggle, tone }: { selected: string[]; onToggle: (id: string) => void; tone: 'danger' | 'peach' }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = normalizeText(query);
    if (q.length < 2) return [];
    return catalogIndex.catalog.ingredients
      .filter((i) => [i.name, ...i.aliases].some((a) => normalizeText(a).includes(q)))
      .slice(0, 12);
  }, [query]);
  const selectedOthers = selected.filter((id) => catalogIndex.ingredients.has(id));
  return (
    <View style={styles.gap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Scrivi un ingrediente, es. funghi"
        placeholderTextColor={colors.inkSoft}
        style={styles.input}
        accessibilityLabel="Cerca ingrediente"
        autoCorrect={false}
      />
      <ChipGroup>
        {results.map((i) => (
          <Chip key={i.id} tone={tone} label={i.name} selected={selected.includes(i.id)} onPress={() => onToggle(i.id)} />
        ))}
      </ChipGroup>
      {selectedOthers.length > 0 ? (
        <>
          <Text variant="small" color={colors.inkSoft}>
            Selezionati (tocca per rimuovere):
          </Text>
          <ChipGroup>
            {selectedOthers.map((id) => (
              <Chip key={id} tone={tone} label={catalogIndex.ingredient(id).name} selected onPress={() => onToggle(id)} />
            ))}
          </ChipGroup>
        </>
      ) : null}
    </View>
  );
}

export function TimeStep({ draft, setDraft }: StepProps) {
  const [perDay, setPerDay] = useState(false);
  const days = draft.profile.days;
  const setRange = (from: number, to: number, minutes: number) =>
    setProfile(setDraft, (p) => ({ ...p, days: p.days.map((d, i) => (i >= from && i <= to ? { ...d, maxMinutes: minutes } : d)) }));
  return (
    <View style={styles.gap}>
      <SectionTitle>Giorni feriali</SectionTitle>
      <ChipGroup>
        {MINUTE_OPTIONS.map((m) => (
          <Chip key={m} label={minuteLabel(m)} selected={days.slice(0, 5).every((d) => d.maxMinutes === m)} onPress={() => setRange(0, 4, m)} />
        ))}
      </ChipGroup>
      <SectionTitle>Weekend</SectionTitle>
      <ChipGroup>
        {MINUTE_OPTIONS.map((m) => (
          <Chip key={m} label={minuteLabel(m)} selected={days.slice(5).every((d) => d.maxMinutes === m)} onPress={() => setRange(5, 6, m)} />
        ))}
      </ChipGroup>
      <ToggleRow label="Personalizza per singolo giorno" value={perDay} onChange={setPerDay} />
      {perDay
        ? days.map((d, i) => (
            <View key={i} style={styles.dayRow}>
              <Text variant="body" style={styles.dayName}>
                {weekdayName(i as Weekday)}
              </Text>
              <Stepper label={`Minuti ${weekdayName(i as Weekday)}`} value={d.maxMinutes} min={10} max={120} step={5} format={(v) => `${v}′`} onChange={(v) => setRange(i, i, v)} />
            </View>
          ))
        : null}
    </View>
  );
}

export function TimesStep({ draft, setDraft }: StepProps) {
  const [perDay, setPerDay] = useState(false);
  const meals = MEAL_TYPES.filter((m) => draft.profile.mealTypes.includes(m));
  const setTime = (from: number, to: number, meal: MealType, minutes: number) =>
    setProfile(setDraft, (p) => ({
      ...p,
      days: p.days.map((d, i) => (i >= from && i <= to ? { ...d, mealTimes: { ...d.mealTimes, [meal]: minutes } } : d)),
    }));
  const group = (title: string, from: number, to: number) => (
    <View style={styles.gap} key={title}>
      <SectionTitle>{title}</SectionTitle>
      {meals.map((m) => (
        <View key={m} style={styles.dayRow}>
          <Text variant="body" style={styles.dayName}>
            {MEAL_LABELS[m]}
          </Text>
          <TimeStepper label={`${MEAL_LABELS[m]} ${title}`} value={draft.profile.days[from].mealTimes[m]} onChange={(v) => setTime(from, to, m, v)} />
        </View>
      ))}
    </View>
  );
  return (
    <View style={styles.gap}>
      {perDay ? [0, 1, 2, 3, 4, 5, 6].map((i) => group(weekdayName(i as Weekday), i, i)) : [group('Giorni feriali', 0, 4), group('Weekend', 5, 6)]}
      <ToggleRow label="Orari diversi per ogni giorno" value={perDay} onChange={setPerDay} />
    </View>
  );
}

export function FrequencyStep({ draft, setDraft }: StepProps) {
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Chip
            key={n}
            label={n === 1 ? '1 volta' : n >= 4 ? `${n} volte` : `${n} volte`}
            selected={draft.shoppingFrequency === n}
            onPress={() => setDraft((d) => ({ ...d, shoppingFrequency: n, profile: { ...d.profile, shoppingDays: suggestShoppingDays(n) } }))}
          />
        ))}
      </ChipGroup>
      <Text variant="small" color={colors.inkSoft}>
        Nel prossimo passo ti proponiamo dei giorni: potrai cambiarli.
      </Text>
    </View>
  );
}

export function ShoppingDaysStep({ draft, setDraft }: StepProps) {
  const days = draft.profile.shoppingDays;
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Chip
            key={i}
            tone="peach"
            label={weekdayName(i as Weekday)}
            selected={days.includes(i as Weekday)}
            onPress={() =>
              setProfile(setDraft, (p) => ({ ...p, shoppingDays: toggle(p.shoppingDays, i as Weekday).sort() as Weekday[] }))
            }
          />
        ))}
      </ChipGroup>
      {days.length !== draft.shoppingFrequency && days.length > 0 ? (
        <Text variant="small" color={colors.inkSoft}>
          Hai scelto {days.length} {days.length === 1 ? 'giorno' : 'giorni'}: useremo questi.
        </Text>
      ) : null}
      <Text variant="small" color={colors.inkSoft}>
        Ogni prodotto viene assegnato alla spesa più vicina prima del suo utilizzo, tenendo conto di quanto si conserva.
      </Text>
    </View>
  );
}

const BUDGET_MODE_LABELS = {
  minimo: 'Sì, voglio spendere il meno possibile',
  equilibrato: 'Sì, voglio un budget equilibrato',
  limite: 'Sì, ho un limite preciso',
  off: 'No, scelgo solo in base ai gusti',
} as const;
const STORE_LABELS = { discount: 'Discount', supermercato: 'Supermercato', mercato: 'Mercato o negozi locali', ovunque: 'Un po’ ovunque', non_indicato: 'Preferisco non dirlo' } as const;
const QUICK_AMOUNTS = [30, 50, 70, 100, 150];

export function BudgetStep({ draft, setDraft }: StepProps) {
  const b = draft.profile.budget;
  const [text, setText] = useState(b.amountCents === null ? '' : String(b.amountCents / 100).replace('.', ','));
  const invalid = text.trim() !== '' && (parseUserQty(text) === null || (parseUserQty(text) ?? 0) < 1);
  const setBudget = (patch: Partial<UserProfile['budget']>) =>
    setProfile(setDraft, (p) => {
      const budget = { ...p.budget, ...patch };
      return { ...p, budget, weeklyBudgetCents: weeklyBudgetCents(budget) };
    });
  return (
    <View style={styles.gap}>
      <SectionTitle>Vuoi che Spesora tenga conto del budget?</SectionTitle>
      <ChipGroup>
        {(['minimo', 'equilibrato', 'limite', 'off'] as const).map((m) => (
          <Chip key={m} label={BUDGET_MODE_LABELS[m]} selected={b.mode === m} onPress={() => setBudget({ mode: m })} />
        ))}
      </ChipGroup>
      {b.mode !== 'off' ? (
        <>
          <SectionTitle>Quanto vorresti spendere?</SectionTitle>
          <ChipGroup>
            <Chip label="A settimana" selected={b.period === 'settimana'} onPress={() => setBudget({ period: 'settimana' })} />
            <Chip label="Al mese" selected={b.period === 'mese'} onPress={() => setBudget({ period: 'mese' })} />
          </ChipGroup>
          <ChipGroup>
            {QUICK_AMOUNTS.map((v) => (
              <Chip
                key={v}
                tone="peach"
                label={`${v} €`}
                selected={b.amountCents === v * 100}
                onPress={() => {
                  setText(String(v));
                  setBudget({ amountCents: v * 100 });
                }}
              />
            ))}
          </ChipGroup>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              const parsed = parseUserQty(v);
              setBudget({ amountCents: v.trim() === '' || parsed === null || parsed < 1 ? null : Math.round(parsed * 100) });
            }}
            placeholder="Importo libero in euro"
            placeholderTextColor={colors.inkSoft}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel="Importo del budget in euro"
          />
          {invalid ? (
            <Text variant="small" color={colors.danger}>
              Inserisci un importo valido, ad esempio 60 oppure 60,50.
            </Text>
          ) : null}
          {b.period === 'mese' && b.amountCents ? (
            <Text variant="small" color={colors.inkSoft}>
              {`Equivale a circa ${((weeklyBudgetCents(b) ?? 0) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} a settimana.`}
            </Text>
          ) : null}
          <SectionTitle>Il budget riguarda</SectionTitle>
          <ChipGroup>
            <Chip label={`I pasti che organizzo qui (${draft.profile.servings} ${draft.profile.servings === 1 ? 'persona' : 'persone'})`} selected={b.scope === 'pasti_spesora'} onPress={() => setBudget({ scope: 'pasti_spesora' })} />
            <Chip label="Solo una parte della mia spesa" selected={b.scope === 'parte_spesa'} onPress={() => setBudget({ scope: 'parte_spesa' })} />
          </ChipGroup>
          <SectionTitle>Dove fai generalmente la spesa? (facoltativo)</SectionTitle>
          <ChipGroup>
            {(Object.keys(STORE_LABELS) as (keyof typeof STORE_LABELS)[]).map((k) => (
              <Chip key={k} label={STORE_LABELS[k]} selected={b.store === k} onPress={() => setBudget({ store: k })} />
            ))}
          </ChipGroup>
        </>
      ) : null}
      <Notice text="Gli importi rapidi sono solo scorciatoie, non somme consigliate. Spesora non riduce mai pasti o porzioni per stare nel budget: sceglie ricette che riutilizzano gli ingredienti e richiedono meno acquisti. I costi in euro compaiono solo per i prodotti di cui conosci il prezzo (puoi inserirli in Impostazioni → Prezzi)." />
    </View>
  );
}

export function EquipmentStep({ draft, setDraft }: StepProps) {
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {EQUIPMENT.map((e) => (
          <Chip
            key={e}
            label={EQUIPMENT_LABELS[e]}
            selected={draft.profile.equipment.includes(e)}
            onPress={() => setProfile(setDraft, (p) => ({ ...p, equipment: toggle(p.equipment, e) }))}
          />
        ))}
      </ChipGroup>
      <Text variant="small" color={colors.inkSoft}>
        Proporremo solo ricette realizzabili con gli strumenti selezionati.
      </Text>
    </View>
  );
}

export function PantryStep({ draft, setDraft }: StepProps) {
  const setQty = (id: string, qty: number | null | undefined) =>
    setDraft((d) => {
      const pantry = { ...d.pantry };
      if (qty === undefined) delete pantry[id];
      else pantry[id] = qty;
      return { ...d, pantry };
    });
  return (
    <View style={styles.gap}>
      <Text variant="small" color={colors.inkSoft}>
        Seleziona solo ciò che hai davvero. Per gli ingredienti da quantificare indica una quantità approssimativa: potrai correggerla dalla Dispensa.
      </Text>
      {QUICK_PANTRY.filter((id) => catalogIndex.ingredients.has(id)).map((id) => {
        const ing = catalogIndex.ingredient(id);
        const has = id in draft.pantry;
        const value = draft.pantry[id];
        const step = ing.unit === 'pz' ? 1 : ing.unit === 'g' ? 50 : 100;
        return (
          <View key={id} style={styles.pantryRow}>
            <Chip
              label={ing.name}
              selected={has}
              onPress={() => setQty(id, has ? undefined : ing.staple ? null : (ing.commonPackSizes?.[0] ?? (ing.unit === 'pz' ? 1 : 250)))}
            />
            {has && value !== null && value !== undefined ? (
              <Stepper
                label={`Quantità di ${ing.name}`}
                value={value}
                min={step}
                max={ing.unit === 'pz' ? 30 : 5000}
                step={step}
                format={(v) => formatQtyWithUnit(toMilli(v), ing.unit)}
                onChange={(v) => setQty(id, v)}
              />
            ) : has ? (
              <Text variant="small" color={colors.inkSoft}>
                Presente (quanto basta)
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function NotificationsStep({ draft, setDraft }: StepProps) {
  const n = draft.notifications;
  const set = (patch: Partial<NotificationSettings>) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, ...patch } }));
  return <NotificationSettingsEditor settings={n} onChange={set} mealTypes={draft.profile.mealTypes} />;
}

export function NotificationSettingsEditor({
  settings: n,
  onChange: set,
  mealTypes,
}: {
  settings: NotificationSettings;
  onChange: (patch: Partial<NotificationSettings>) => void;
  mealTypes: MealType[];
}) {
  return (
    <View style={styles.gap}>
      <ToggleRow label="Quando iniziare a cucinare" value={n.mealReminders} onChange={(v) => set({ mealReminders: v })} />
      {n.mealReminders ? (
        <>
          <ChipGroup>
            {MEAL_TYPES.filter((m) => mealTypes.includes(m)).map((m) => (
              <Chip key={m} label={MEAL_LABELS[m]} selected={n.mealTypes.includes(m)} onPress={() => set({ mealTypes: toggle(n.mealTypes, m) })} />
            ))}
          </ChipGroup>
          <View style={styles.dayRow}>
            <Text variant="body" style={styles.dayName}>
              Anticipo extra
            </Text>
            <Stepper label="Anticipo in minuti" value={n.leadMinutes} min={0} max={60} step={5} format={(v) => `${v} min`} onChange={(v) => set({ leadMinutes: v })} />
          </View>
          <Text variant="small" color={colors.inkSoft}>
            L’avviso arriva all’orario del pasto meno la durata della ricetta e l’anticipo extra.
          </Text>
        </>
      ) : null}
      <ToggleRow label="Giorno della spesa" value={n.shoppingReminders} onChange={(v) => set({ shoppingReminders: v })} />
      {n.shoppingReminders ? (
        <View style={styles.dayRow}>
          <Text variant="body" style={styles.dayName}>
            Orario
          </Text>
          <TimeStepper label="Orario promemoria spesa" value={n.shoppingTimeMinutes} onChange={(v) => set({ shoppingTimeMinutes: v })} />
        </View>
      ) : null}
      <ToggleRow label="Fine del calendario settimanale" value={n.planEndReminder} onChange={(v) => set({ planEndReminder: v })} />
      <SectionTitle>Fascia di silenzio</SectionTitle>
      <View style={styles.dayRow}>
        <Text variant="body" style={styles.dayName}>
          Dalle
        </Text>
        <TimeStepper label="Inizio silenzio" value={n.quietStartMinutes} onChange={(v) => set({ quietStartMinutes: v })} />
      </View>
      <View style={styles.dayRow}>
        <Text variant="body" style={styles.dayName}>
          Alle
        </Text>
        <TimeStepper label="Fine silenzio" value={n.quietEndMinutes} onChange={(v) => set({ quietEndMinutes: v })} />
      </View>
    </View>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.toggle} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <Text variant="body" style={styles.dayName}>
        {label}
      </Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.green, false: colors.line }} thumbColor={colors.white} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.md },
  input: {
    minHeight: TOUCH + 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' },
  dayName: { flex: 1, minWidth: 100, textTransform: 'capitalize' },
  pantryRow: { gap: space.sm, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' },
  toggle: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.md },
});
