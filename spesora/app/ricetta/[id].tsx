import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatLongDate, minutesToHHMM } from '../../src/core/domain/dates';
import { mealIngredientStatus, toStock, type IngredientAvailability } from '../../src/core/domain/pantry';
import { formatQtyWithUnit } from '../../src/core/domain/quantity';
import { ingredientNeed, isPersonalized } from '../../src/core/domain/portions';
import { foodInfo } from '../../src/core/domain/nutrition';
import { metaOf } from '../../src/core/domain/meta';
import { prepAheadOf } from '../../src/core/domain/prepAhead';
import { recipeCost } from '../../src/core/domain/cost';
import { formatCents } from '../../src/core/domain/prices';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { ALLERGEN_LABELS, EQUIPMENT_LABELS, MEAL_LABELS } from '../../src/i18n/labels';
import { useT } from '../../src/i18n';
import { ingredientName, recipeLanguageStatus, recipeName, recipeStep } from '../../src/i18n/content';
import { colors, radius, space } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { CheckBox } from '../../src/ui/CheckBox';
import { Card } from '../../src/ui/Card';
import { MinaNote } from '../../src/ui/AssistantBubble';
import { Reveal } from '../../src/ui/Reveal';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { InfoNote, InfoToggle, Pills, PhotoButton } from '../../src/ui/mina/kit';
import { Screen } from '../../src/ui/Screen';
import { Stepper } from '../../src/ui/Stepper';
import { Text } from '../../src/ui/Text';

/** Stato dell'ingrediente rispetto alla dispensa; l'etichetta è la chiave `recipes:availability.<stato>`. */
const AVAILABILITY: Record<IngredientAvailability, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  in_dispensa: { color: colors.green, icon: 'checkmark-circle' },
  parziale: { color: colors.peachInk, icon: 'alert-circle-outline' },
  da_comprare: { color: colors.peachInk, icon: 'basket-outline' },
  qb_presente: { color: colors.green, icon: 'checkmark-circle' },
  qb_mancante: { color: colors.peachInk, icon: 'help-circle-outline' },
};

type Tab = 'ingredienti' | 'preparazione' | 'consigli';

export default function RecipeScreen() {
  const { t } = useT();
  const { id, mealId } = useLocalSearchParams<{ id: string; mealId?: string }>();
  const { snapshot, run } = useApp();
  const actions = useMealActions();
  const insets = useSafeAreaInsets();
  const recipe = catalogIndex.recipe(String(id));
  const meal = mealId ? snapshot?.meals.find((m) => m.id === mealId) : undefined;
  const [localServings, setLocalServings] = useState<number>(snapshot?.profile?.servings ?? recipe?.baseServings ?? 2);
  const [tab, setTab] = useState<Tab>('ingredienti');
  // caselle degli ingredienti (come nel riferimento): si spuntano mentre si prepara, solo su questa schermata
  const [got, setGot] = useState<Set<string>>(() => new Set());
  const toggleGot = (id: string) =>
    setGot((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!recipe || !snapshot) {
    return (
      <Screen edges={[]}>
        <InfoNote tone="warning" text={t('recipes:detail.notFound')} />
        <Button label={t('recipes:detail.backToToday')} onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const facts = catalogIndex.factsOf(recipe);
  const favorite = snapshot.favorites.has(recipe.id);
  const prepAhead = prepAheadOf(recipe);
  const servings = meal?.servings ?? localServings;
  const planned = meal?.status === 'planned';
  const statuses = meal ? new Map(mealIngredientStatus(meal, catalogIndex, toStock(snapshot.pantry), snapshot.staples, snapshot.profile?.portions).map((s) => [s.ingredientId, s.status])) : null;
  const missingCount = statuses ? [...statuses.values()].filter((s) => s === 'da_comprare' || s === 'parziale').length : 0;
  const name = recipeName(recipe);
  // procedimento non ancora tradotto nella lingua scelta: si mostra l'originale italiano e lo si dice
  const languageStatus = recipeLanguageStatus(recipe);
  const methodItalianOnly = languageStatus === 'name-only' || languageStatus === 'not-translated';
  const prepAheadIndex = prepAhead ? recipe.steps.findIndex((s) => s.text === prepAhead.step) : -1;
  const prepAheadText = prepAhead ? (prepAheadIndex >= 0 ? recipeStep(recipe, prepAheadIndex) : prepAhead.step) : '';
  const ingName = (ingredientId: string) => ingredientName(ingredientId, catalogIndex.ingredient(ingredientId).name);

  const setServings = (v: number) => {
    if (meal && planned) void run((s) => s.setServings(meal.id, v));
    else setLocalServings(v);
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* foto a tutta larghezza (telefono 12): indietro, preferito e azioni del pasto sopra la foto */}
        <Reveal from="zoom">
          <RecipeImage recipe={recipe} rounded={0} aspectRatio={1.34} />
        </Reveal>
        <View style={[styles.overlay, { top: insets.top + space.sm }]}>
          <PhotoButton icon="arrow-back" label={t('action.back')} onPress={back} />
          <View style={styles.flex} />
          {meal && planned ? <PhotoButton icon="ellipsis-horizontal" label={t('recipes:detail.mealActions')} onPress={() => actions.openMenu(meal)} color={colors.green} /> : null}
          <PhotoButton
            icon={favorite ? 'heart' : 'heart-outline'}
            label={favorite ? t('recipes:favorite.remove') : t('recipes:favorite.add')}
            selected={favorite}
            color={colors.danger}
            onPress={() => void run((s) => s.toggleFavorite(recipe.id, !favorite))}
          />
        </View>

        <View style={styles.sheet}>
          {meal ? (
            <Text variant="small" color={colors.green} style={styles.bold}>
              {`${MEAL_LABELS[meal.mealType]} · ${formatLongDate(meal.date)} · ${minutesToHHMM(meal.timeMinutes)}`}
              {meal.status !== 'planned' ? ` · ${t(`status.${meal.status}`)}` : ''}
            </Text>
          ) : null}
          <Text variant="screen" accessibilityRole="header" style={styles.title}>
            {name}
          </Text>

          {/* l'essenziale in una riga: durata e persone (modificabili per questo pasto) */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem} accessible accessibilityLabel={t('recipes:detail.totalA11y', { minutes: recipe.totalMinutes })}>
              <Ionicons name="time-outline" size={20} color={colors.ink} />
              <Text variant="heading">{t('recipes:time.minutes', { minutes: recipe.totalMinutes })}</Text>
            </View>
            <View style={styles.metaSep} />
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={20} color={colors.ink} />
              <Stepper label={t('recipes:detail.servings')} value={servings} min={1} max={30} onChange={setServings} />
            </View>
          </View>

          <Pills
            fill
            options={[
              { key: 'ingredienti', label: t('recipes:tab.ingredients') },
              { key: 'preparazione', label: t('recipes:tab.method') },
              { key: 'consigli', label: t('recipes:tab.tips') },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'ingredienti' ? (
            <View style={styles.tabBody}>
              {/* avviso obbligatorio sugli allergeni: sempre visibile, con icona (non solo colore) */}
              <InfoNote
                tone={facts.allergens.length > 0 ? 'warning' : 'info'}
                text={`${facts.allergens.length > 0 ? t('recipes:allergens.contains', { list: facts.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ') }) : t('recipes:allergens.none')}${facts.allergenInfoIncomplete ? ` ${t('recipes:allergens.checkLabel')}` : ''}`}
              />
              {missingCount > 0 && planned ? <InfoNote text={t('recipes:detail.missing', { count: missingCount })} /> : null}
              <View>
                {recipe.ingredients.map((ri, i) => {
                  const ing = catalogIndex.ingredient(ri.ingredientId);
                  const portions = snapshot.profile?.portions;
                  const qty = ri.qty === undefined ? null : ingredientNeed(recipe, ri, ing, servings, portions);
                  const mine = isPersonalized(recipe, ri, ing, servings, portions);
                  const st = statuses?.get(ri.ingredientId);
                  const a = st && planned ? { ...AVAILABILITY[st], label: t(`recipes:availability.${st}`) } : null;
                  const label = ingredientName(ing.id, ing.name);
                  return (
                    <Pressable
                      key={ri.ingredientId}
                      style={[styles.ingRow, i > 0 && styles.ingLine]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: got.has(ri.ingredientId) }}
                      accessibilityLabel={[label, qty === null ? t('recipes:qty.toTasteLong') : formatQtyWithUnit(qty, ing.unit), a?.label].filter(Boolean).join(', ')}
                      accessibilityHint={t('recipes:ingredient.checkHint')}
                      onPress={() => toggleGot(ri.ingredientId)}
                    >
                      <CheckBox checked={got.has(ri.ingredientId)} size={26} />
                      <View style={styles.flex}>
                        <Text variant="heading" style={styles.ingName}>
                          {label}
                          {ri.hint ? <Text variant="small" color={colors.inkSoft}>{` (${ri.hint})`}</Text> : null}
                        </Text>
                        {a ? (
                          <Text variant="small" color={a.color}>
                            {a.label}
                          </Text>
                        ) : null}
                      </View>
                      {mine ? (
                        <View style={styles.mine} accessibilityLabel={t('recipes:ingredient.personalA11y')}>
                          <Text variant="caption" color={colors.greenDark}>
                            {t('recipes:ingredient.personalBadge')}
                          </Text>
                        </View>
                      ) : null}
                      <Text variant="body" color={colors.inkSoft} style={styles.qty}>
                        {qty === null ? t('recipes:qty.toTaste') : formatQtyWithUnit(qty, ing.unit)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : tab === 'preparazione' ? (
            <View style={styles.tabBody}>
              {methodItalianOnly ? <InfoNote text={t('recipes:language.italianOnly')} /> : null}
              {recipe.steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}>
                    <Text variant="heading" color={colors.white}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text variant="body">{recipeStep(recipe, i)}</Text>
                    {s.timerMinutes ? (
                      <View style={styles.stepTime}>
                        <Ionicons name="time-outline" size={15} color={colors.inkSoft} />
                        <Text variant="small" color={colors.inkSoft}>{t('recipes:step.timer', { minutes: s.timerMinutes })}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.tabBody}>
              {prepAhead ? (
                <MinaNote
                  pose="cooking"
                  title={prepAhead.kind === 'scongelamento' ? (prepAhead.conditional ? t('recipes:prepAhead.thawIfFrozen') : t('recipes:prepAhead.thaw')) : t('recipes:prepAhead.rest')}
                  text={`${prepAheadText}${meal && meal.status === 'planned' ? ` ${t('recipes:prepAhead.reminder')}` : ''}`}
                />
              ) : null}
              <Text variant="body" color={colors.inkSoft}>
                {recipe.description}
              </Text>
              <View style={styles.chips}>
                <Info icon="hand-left-outline" text={t('recipes:time.prep', { minutes: recipe.prepMinutes })} />
                {recipe.cookMinutes > 0 ? <Info icon="flame-outline" text={t('recipes:time.cook', { minutes: recipe.cookMinutes })} /> : null}
                {recipe.equipment.map((e) => (
                  <Info key={e} icon="construct-outline" text={EQUIPMENT_LABELS[e]} />
                ))}
              </View>
              {recipe.substitutions && recipe.substitutions.length > 0 ? (
                <Card>
                  <Text variant="heading">{t('recipes:substitutions.title')}</Text>
                  {recipe.substitutions.map((sub) => (
                    <Text key={sub.substituteId} variant="small">
                      {`${ingName(sub.ingredientId)} → ${ingName(sub.substituteId)}: ${sub.note}`}
                    </Text>
                  ))}
                </Card>
              ) : null}
              <FoodInfoCard recipeId={recipe.id} servings={servings} />
              {meal && meal.reasons.length > 0 && planned ? <InfoNote text={t('recipes:detail.reasons', { reasons: meal.reasons.join(' · ') })} /> : null}
              <InfoToggle
                label={t('recipes:qty.title')}
                text={[
                  meal && planned ? t('recipes:qty.mealOnly') : t('recipes:qty.adapt'),
                  statuses ? t('recipes:qty.pantryEstimate') : null,
                  t('recipes:qty.portionsNote'),
                  t('recipes:qty.personalNote'),
                  t('allergen.disclaimer'),
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <Button kind="ghost" icon="repeat-outline" label={t('recipes:detail.repeat')} onPress={() => router.push(`/ripeti/${recipe.id}`)} />
            </View>
          )}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button label={t('recipes:detail.startCooking')} iconRight="arrow-forward" size="large" onPress={() => router.push(`/cucina/${recipe.id}${meal ? `?mealId=${encodeURIComponent(meal.id)}` : ''}`)} />
      </View>
      {actions.sheet}
    </View>
  );
}

function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={16} color={colors.green} />
      <Text variant="small">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.desk },
  scroll: { paddingBottom: space.xl },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  overlay: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sheet: { marginTop: -28, backgroundColor: colors.desk, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  title: { fontSize: 28, lineHeight: 34 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaSep: { width: 1, height: 22, backgroundColor: colors.lineStrong },
  tabBody: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  info: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenSoft, paddingHorizontal: space.sm, paddingVertical: 6, borderRadius: radius.pill },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  ingLine: { borderTopWidth: 1, borderTopColor: colors.line },
  ingName: { fontWeight: '700' },
  qty: { fontVariant: ['tabular-nums'] },
  mine: { backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  step: { flexDirection: 'row', gap: space.md },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  stepBody: { flex: 1, gap: space.xs, paddingTop: 4 },
  stepTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
});


/** Costo indicativo e informazioni alimentari con stato esplicito: nessun claim non verificato. */
function FoodInfoCard({ recipeId, servings }: { recipeId: string; servings: number }) {
  const { t } = useT();
  const { snapshot } = useApp();
  const recipe = catalogIndex.recipe(recipeId);
  if (!recipe || !snapshot) return null;
  const info = foodInfo(recipe, catalogIndex);
  const meta = metaOf(recipe);
  const cost = recipeCost(recipe, catalogIndex, snapshot.prices, servings, snapshot.profile?.portions, toStock(snapshot.pantry));
  const costText =
    cost.completeness === 'completa'
      ? t('recipes:cost.complete', { perServing: formatCents(cost.perServingCents ?? 0), total: formatCents(cost.knownCents) })
      : cost.completeness === 'parziale'
        ? t('recipes:cost.partial', { known: formatCents(cost.knownCents), knownCount: cost.knownCount, count: cost.totalCount })
        : t('recipes:cost.none');
  return (
    <Card>
      <Text variant="heading">{t('recipes:food.title')}</Text>
      <Text variant="small">{costText}</Text>
      {info.formulatedWithoutGluten.value ? <Text variant="small">{t(info.formulatedWithoutGluten.noteKey)}</Text> : null}
      <Text variant="small">{t(info.noAddedSweeteners.noteKey)}</Text>
      <Text variant="small" color={colors.inkSoft}>
        {[
          meta.cuisine === 'internazionale' ? t('recipes:meta.international') : meta.region ? t('recipes:meta.tradition', { region: meta.region }) : t('recipes:meta.italian'),
          t('recipes:meta.difficulty', { dots: `${'●'.repeat(meta.difficulty)}${'○'.repeat(3 - meta.difficulty)}` }),
          meta.makeAhead ? t('recipes:meta.makeAhead') : null,
          meta.storage ?? null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {meta.review.status !== 'approved_for_release' ? (
        <Text variant="small" color={colors.inkSoft}>
          {t('recipes:meta.inReview')}
        </Text>
      ) : null}
    </Card>
  );
}
