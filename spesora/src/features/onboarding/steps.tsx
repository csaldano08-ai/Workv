import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { normalizeText } from '../../core/domain/catalog';
import { formatQtyWithUnit, parseUserQty, toMilli } from '../../core/domain/quantity';
import { suggestShoppingDays, weeklyBudgetCents } from '../../core/domain/profile';
import { ALLERGENS, DIETS, EQUIPMENT, MEAL_TYPES, type MealType, type UserProfile, type Weekday } from '../../core/domain/types';
import { weekdayName } from '../../core/domain/dates';
import { formatLocale } from '../../core/domain/locale';
import { ALLERGEN_LABELS, DIET_LABELS, EQUIPMENT_LABELS, MEAL_LABELS } from '../../i18n/labels';
import { colors, radius, space, TOUCH } from '../../theme/tokens';
import { Chip, ChipGroup } from '../../ui/Chip';
import { ChoiceArt } from '../../ui/mina/ChoiceArt';
import { NumberChoice, NumberRow, OptionTile, TileGrid } from '../../ui/mina/choices';
import { InfoNote, InfoToggle } from '../../ui/mina/kit';
import { SectionTitle } from '../../ui/Row';
import { Stepper, TimeStepper } from '../../ui/Stepper';
import { Text } from '../../ui/Text';
import { catalogIndex } from '../app/AppProvider';
import { COMMON_DISLIKES, MINUTE_OPTIONS, QUICK_PANTRY, type OnboardingDraft } from './draft';
import { lazyLabels, useT } from '../../i18n';
import { ingredientName } from '../../i18n/content';
import { LanguagePicker } from '../../ui/mina/LanguagePicker';
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

/** Primo passo: la lingua. Toccarne una la applica subito, così il resto del questionario è già in quella lingua. */
export function LanguageStep(_: StepProps) {
  const { t } = useT();
  return (
    <View style={styles.gap}>
      <LanguagePicker />
      <InfoNote text={t('language:noAccount')} />
    </View>
  );
}

export function PeopleStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  const n = draft.profile.servings;
  return (
    <View style={styles.gap}>
      <NumberRow>
        {[1, 2, 3, 4].map((v) => (
          <NumberChoice key={v} label={String(v)} accessibilityLabel={t('onboarding:people.count', { count: v })} selected={n === v} onPress={() => setProfile(setDraft, (p) => ({ ...p, servings: v }))} />
        ))}
        <NumberChoice label="5+" accessibilityLabel={t('onboarding:people.fivePlus')} selected={n >= 5} onPress={() => setProfile(setDraft, (p) => ({ ...p, servings: Math.max(5, p.servings) }))} />
      </NumberRow>
      {n >= 5 ? (
        <Stepper label={t('onboarding:people.stepper')} value={n} min={5} max={30} onChange={(v) => setProfile(setDraft, (p) => ({ ...p, servings: v }))} />
      ) : null}
      <InfoNote text={t('onboarding:people.note')} />
    </View>
  );
}

export function MealsStep({ draft, setDraft }: StepProps) {
  useT();
  return (
    <TileGrid>
      {MEAL_TYPES.map((m) => (
        <OptionTile
          key={m}
          multi
          columns={2}
          label={MEAL_LABELS[m]}
          art={<ChoiceArt name={m} size={68} />}
          selected={draft.profile.mealTypes.includes(m)}
          onPress={() => setProfile(setDraft, (p) => ({ ...p, mealTypes: toggle(p.mealTypes, m) }))}
        />
      ))}
    </TileGrid>
  );
}

export function DietStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  return (
    <View style={styles.gap}>
      <TileGrid>
        {DIETS.map((d) => (
          <OptionTile key={d} columns={2} label={DIET_LABELS[d]} art={<ChoiceArt name={d} size={68} />} selected={draft.profile.diet === d} onPress={() => setProfile(setDraft, (p) => ({ ...p, diet: d }))} />
        ))}
      </TileGrid>
      <InfoToggle label={t('onboarding:diet.howLabel')} text={t('onboarding:diet.howText')} />
    </View>
  );
}

export function AllergenStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
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
      <SectionTitle>{t('onboarding:exclusions.others')}</SectionTitle>
      <IngredientPicker
        selected={draft.profile.excludedIngredientIds}
        tone="danger"
        onToggle={(id) => setProfile(setDraft, (p) => ({ ...p, excludedIngredientIds: toggle(p.excludedIngredientIds, id) }))}
      />
      <InfoNote tone="warning" text={t('allergen.disclaimer')} />
      {draft.profile.excludedAllergens.length > 0 ? (
        <InfoNote text={t('onboarding:exclusions.brandNote')} />
      ) : null}
    </View>
  );
}

export function DislikeStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  return (
    <View style={styles.gap}>
      <ChipGroup>
        {COMMON_DISLIKES.filter((id) => catalogIndex.ingredients.has(id)).map((id) => (
          <Chip
            key={id}
            tone="peach"
            label={ingredientName(id, catalogIndex.ingredient(id).name)}
            selected={draft.profile.dislikedIngredientIds.includes(id)}
            onPress={() => setProfile(setDraft, (p) => ({ ...p, dislikedIngredientIds: toggle(p.dislikedIngredientIds, id) }))}
          />
        ))}
      </ChipGroup>
      <SectionTitle>{t('onboarding:dislikes.search')}</SectionTitle>
      <IngredientPicker
        selected={draft.profile.dislikedIngredientIds}
        tone="peach"
        onToggle={(id) => setProfile(setDraft, (p) => ({ ...p, dislikedIngredientIds: toggle(p.dislikedIngredientIds, id) }))}
      />
    </View>
  );
}

function IngredientPicker({ selected, onToggle, tone }: { selected: string[]; onToggle: (id: string) => void; tone: 'danger' | 'peach' }) {
  const { t, language } = useT();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = normalizeText(query);
    if (q.length < 2) return [];
    return catalogIndex.catalog.ingredients
      .filter((i) => [i.name, ingredientName(i.id, i.name), ...i.aliases].some((a) => normalizeText(a).includes(q)))
      .slice(0, 12);
    // la lingua cambia il nome tradotto con cui si cerca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, language]);
  const selectedOthers = selected.filter((id) => catalogIndex.ingredients.has(id));
  return (
    <View style={styles.gap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('onboarding:picker.placeholder')}
        placeholderTextColor={colors.inkSoft}
        style={styles.input}
        accessibilityLabel={t('onboarding:picker.a11y')}
        autoCorrect={false}
      />
      <ChipGroup>
        {results.map((i) => (
          <Chip key={i.id} tone={tone} label={ingredientName(i.id, i.name)} selected={selected.includes(i.id)} onPress={() => onToggle(i.id)} />
        ))}
      </ChipGroup>
      {selectedOthers.length > 0 ? (
        <>
          <Text variant="small" color={colors.inkSoft}>
            {t('onboarding:picker.selected')}
          </Text>
          <ChipGroup>
            {selectedOthers.map((id) => (
              <Chip key={id} tone={tone} label={ingredientName(id, catalogIndex.ingredient(id).name)} selected onPress={() => onToggle(id)} />
            ))}
          </ChipGroup>
        </>
      ) : null}
    </View>
  );
}

export function TimeStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  const [perDay, setPerDay] = useState(false);
  const days = draft.profile.days;
  const setRange = (from: number, to: number, minutes: number) =>
    setProfile(setDraft, (p) => ({ ...p, days: p.days.map((d, i) => (i >= from && i <= to ? { ...d, maxMinutes: minutes } : d)) }));
  return (
    <View style={styles.gap}>
      <SectionTitle>{t('onboarding:time.weekdays')}</SectionTitle>
      <ChipGroup>
        {MINUTE_OPTIONS.map((m) => (
          <Chip key={m} label={minuteLabel(m)} selected={days.slice(0, 5).every((d) => d.maxMinutes === m)} onPress={() => setRange(0, 4, m)} />
        ))}
      </ChipGroup>
      <SectionTitle>{t('onboarding:time.weekend')}</SectionTitle>
      <ChipGroup>
        {MINUTE_OPTIONS.map((m) => (
          <Chip key={m} label={minuteLabel(m)} selected={days.slice(5).every((d) => d.maxMinutes === m)} onPress={() => setRange(5, 6, m)} />
        ))}
      </ChipGroup>
      <ToggleRow label={t('onboarding:time.perDay')} value={perDay} onChange={setPerDay} />
      {perDay
        ? days.map((d, i) => (
            <View key={i} style={styles.dayRow}>
              <Text variant="body" style={styles.dayName}>
                {weekdayName(i as Weekday)}
              </Text>
              <Stepper label={t('onboarding:time.minutesFor', { day: weekdayName(i as Weekday) })} value={d.maxMinutes} min={10} max={120} step={5} format={(v) => `${v}′`} onChange={(v) => setRange(i, i, v)} />
            </View>
          ))
        : null}
    </View>
  );
}

export function TimesStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
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
      {perDay ? [0, 1, 2, 3, 4, 5, 6].map((i) => group(weekdayName(i as Weekday), i, i)) : [group(t('onboarding:time.weekdays'), 0, 4), group(t('onboarding:time.weekend'), 5, 6)]}
      <ToggleRow label={t('onboarding:times.perDay')} value={perDay} onChange={setPerDay} />
    </View>
  );
}

export function FrequencyStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  return (
    <View style={styles.gap}>
      <NumberRow>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <NumberChoice
            key={n}
            label={String(n)}
            accessibilityLabel={t('onboarding:frequency.count', { count: n })}
            selected={draft.shoppingFrequency === n}
            onPress={() => setDraft((d) => ({ ...d, shoppingFrequency: n, profile: { ...d.profile, shoppingDays: suggestShoppingDays(n) } }))}
          />
        ))}
      </NumberRow>
      <InfoNote text={t('onboarding:frequency.note')} />
    </View>
  );
}

export function ShoppingDaysStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
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
          {t('onboarding:shoppingDays.chosen', { count: days.length })}
        </Text>
      ) : null}
      <InfoToggle label={t('onboarding:shoppingDays.howLabel')} text={t('onboarding:shoppingDays.howText')} />
    </View>
  );
}

const BUDGET_MODE_LABELS = lazyLabels(['minimo', 'equilibrato', 'limite', 'off'] as const, (k) => `onboarding:budget.mode.${k}`);
const STORE_LABELS = lazyLabels(['discount', 'supermercato', 'mercato', 'ovunque', 'non_indicato'] as const, (k) => `onboarding:budget.store.${k}`);
const QUICK_AMOUNTS = [30, 50, 70, 100, 150];

export function BudgetStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
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
      <SectionTitle>{t('onboarding:budget.question')}</SectionTitle>
      <ChipGroup>
        {(['minimo', 'equilibrato', 'limite', 'off'] as const).map((m) => (
          <Chip key={m} label={BUDGET_MODE_LABELS[m]} selected={b.mode === m} onPress={() => setBudget({ mode: m })} />
        ))}
      </ChipGroup>
      {b.mode !== 'off' ? (
        <>
          <SectionTitle>{t('onboarding:budget.howMuch')}</SectionTitle>
          <ChipGroup>
            <Chip label={t('onboarding:budget.perWeek')} selected={b.period === 'settimana'} onPress={() => setBudget({ period: 'settimana' })} />
            <Chip label={t('onboarding:budget.perMonth')} selected={b.period === 'mese'} onPress={() => setBudget({ period: 'mese' })} />
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
            placeholder={t('onboarding:budget.placeholder')}
            placeholderTextColor={colors.inkSoft}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel={t('onboarding:budget.amountA11y')}
          />
          {invalid ? (
            <Text variant="small" color={colors.danger}>
              {t('onboarding:budget.invalid')}
            </Text>
          ) : null}
          {b.period === 'mese' && b.amountCents ? (
            <Text variant="small" color={colors.inkSoft}>
              {t('onboarding:budget.weekly', { amount: ((weeklyBudgetCents(b) ?? 0) / 100).toLocaleString(formatLocale(), { style: 'currency', currency: 'EUR' }) })}
            </Text>
          ) : null}
          <SectionTitle>{t('onboarding:budget.scopeTitle')}</SectionTitle>
          <ChipGroup>
            <Chip label={t('onboarding:budget.scopeMeals', { count: draft.profile.servings })} selected={b.scope === 'pasti_spesora'} onPress={() => setBudget({ scope: 'pasti_spesora' })} />
            <Chip label={t('onboarding:budget.scopePart')} selected={b.scope === 'parte_spesa'} onPress={() => setBudget({ scope: 'parte_spesa' })} />
          </ChipGroup>
          <SectionTitle>{t('onboarding:budget.storeTitle')}</SectionTitle>
          <ChipGroup>
            {(Object.keys(STORE_LABELS) as (keyof typeof STORE_LABELS)[]).map((k) => (
              <Chip key={k} label={STORE_LABELS[k]} selected={b.store === k} onPress={() => setBudget({ store: k })} />
            ))}
          </ChipGroup>
        </>
      ) : null}
      <InfoToggle label={t('onboarding:budget.howLabel')} text={t('onboarding:budget.howText')} />
    </View>
  );
}

export function EquipmentStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
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
      <InfoNote text={t('onboarding:equipment.note')} />
    </View>
  );
}

export function PantryStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  const setQty = (id: string, qty: number | null | undefined) =>
    setDraft((d) => {
      const pantry = { ...d.pantry };
      if (qty === undefined) delete pantry[id];
      else pantry[id] = qty;
      return { ...d, pantry };
    });
  return (
    <View style={styles.gap}>
      <InfoNote text={t('onboarding:pantry.note')} />
      {QUICK_PANTRY.filter((id) => catalogIndex.ingredients.has(id)).map((id) => {
        const ing = catalogIndex.ingredient(id);
        const name = ingredientName(id, ing.name);
        const has = id in draft.pantry;
        const value = draft.pantry[id];
        const step = ing.unit === 'pz' ? 1 : ing.unit === 'g' ? 50 : 100;
        return (
          <View key={id} style={styles.pantryRow}>
            <Chip
              label={name}
              selected={has}
              onPress={() => setQty(id, has ? undefined : ing.staple ? null : (ing.commonPackSizes?.[0] ?? (ing.unit === 'pz' ? 1 : 250)))}
            />
            {has && value !== null && value !== undefined ? (
              <Stepper
                label={t('onboarding:pantry.qtyOf', { name })}
                value={value}
                min={step}
                max={ing.unit === 'pz' ? 30 : 5000}
                step={step}
                format={(v) => formatQtyWithUnit(toMilli(v), ing.unit)}
                onChange={(v) => setQty(id, v)}
              />
            ) : has ? (
              <Text variant="small" color={colors.inkSoft}>
                {t('onboarding:pantry.present')}
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
  const { t } = useT();
  return (
    <View style={styles.gap}>
      <ToggleRow label={t('onboarding:notifications.cook')} value={n.mealReminders} onChange={(v) => set({ mealReminders: v })} />
      {n.mealReminders ? (
        <>
          <ChipGroup>
            {MEAL_TYPES.filter((m) => mealTypes.includes(m)).map((m) => (
              <Chip key={m} label={MEAL_LABELS[m]} selected={n.mealTypes.includes(m)} onPress={() => set({ mealTypes: toggle(n.mealTypes, m) })} />
            ))}
          </ChipGroup>
          <View style={styles.dayRow}>
            <Text variant="body" style={styles.dayName}>
              {t('onboarding:notifications.lead')}
            </Text>
            <Stepper label={t('onboarding:notifications.leadA11y')} value={n.leadMinutes} min={0} max={60} step={5} format={(v) => `${v} min`} onChange={(v) => set({ leadMinutes: v })} />
          </View>
          <Text variant="small" color={colors.inkSoft}>
            {t('onboarding:notifications.leadNote')}
          </Text>
        </>
      ) : null}
      <ToggleRow label={t('onboarding:notifications.shopping')} value={n.shoppingReminders} onChange={(v) => set({ shoppingReminders: v })} />
      {n.shoppingReminders ? (
        <View style={styles.dayRow}>
          <Text variant="body" style={styles.dayName}>
            {t('onboarding:notifications.time')}
          </Text>
          <TimeStepper label={t('onboarding:notifications.timeA11y')} value={n.shoppingTimeMinutes} onChange={(v) => set({ shoppingTimeMinutes: v })} />
        </View>
      ) : null}
      <ToggleRow label={t('onboarding:notifications.planEnd')} value={n.planEndReminder} onChange={(v) => set({ planEndReminder: v })} />
      <SectionTitle>{t('onboarding:notifications.quiet')}</SectionTitle>
      <View style={styles.dayRow}>
        <Text variant="body" style={styles.dayName}>
          {t('onboarding:notifications.from')}
        </Text>
        <TimeStepper label={t('onboarding:notifications.quietStart')} value={n.quietStartMinutes} onChange={(v) => set({ quietStartMinutes: v })} />
      </View>
      <View style={styles.dayRow}>
        <Text variant="body" style={styles.dayName}>
          {t('onboarding:notifications.to')}
        </Text>
        <TimeStepper label={t('onboarding:notifications.quietEnd')} value={n.quietEndMinutes} onChange={(v) => set({ quietEndMinutes: v })} />
      </View>
    </View>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.toggle} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <Text variant="body" style={styles.toggleLabel}>
        {label}
      </Text>
      {/* activeThumbColor: solo web (altrimenti il pallino acceso diventa verde acqua) */}
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.green, false: colors.lineStrong }} thumbColor={colors.white} {...({ activeThumbColor: colors.white } as object)} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.md },
  input: {
    minHeight: TOUCH + 4,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' },
  dayName: { flex: 1, minWidth: 100, textTransform: 'capitalize' },
  toggleLabel: { flex: 1, minWidth: 100 },
  pantryRow: { gap: space.sm, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' },
  toggle: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.md },
});
