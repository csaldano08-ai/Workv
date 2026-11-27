import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatLongDate, minutesToHHMM } from '../../src/core/domain/dates';
import { mealIngredientStatus, toStock, type IngredientAvailability } from '../../src/core/domain/pantry';
import { formatQtyWithUnit } from '../../src/core/domain/quantity';
import { ingredientNeed, isPersonalized } from '../../src/core/domain/portions';
import { PORTIONS_NOTE } from '../../src/features/onboarding/stepsPersonal';
import { foodInfo } from '../../src/core/domain/nutrition';
import { metaOf } from '../../src/core/domain/meta';
import { prepAheadOf } from '../../src/core/domain/prepAhead';
import { recipeCost } from '../../src/core/domain/cost';
import { formatCents } from '../../src/core/domain/prices';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { ALLERGEN_LABELS, EQUIPMENT_LABELS, MEAL_LABELS } from '../../src/i18n/labels';
import { t } from '../../src/i18n/it';
import { colors, radius, space } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { MinaNote } from '../../src/ui/AssistantBubble';
import { Reveal } from '../../src/ui/Reveal';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { InfoNote, InfoToggle, Pills, PhotoButton } from '../../src/ui/mina/kit';
import { Screen } from '../../src/ui/Screen';
import { Stepper } from '../../src/ui/Stepper';
import { Text } from '../../src/ui/Text';

const AVAILABILITY: Record<IngredientAvailability, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  in_dispensa: { label: 'in dispensa', color: colors.green, icon: 'checkmark-circle' },
  parziale: { label: 'non basta', color: colors.peachInk, icon: 'alert-circle-outline' },
  da_comprare: { label: 'da comprare', color: colors.peachInk, icon: 'basket-outline' },
  qb_presente: { label: 'in casa', color: colors.green, icon: 'checkmark-circle' },
  qb_mancante: { label: 'verifica di averlo', color: colors.peachInk, icon: 'help-circle-outline' },
};

type Tab = 'ingredienti' | 'preparazione' | 'consigli';

export default function RecipeScreen() {
  const { id, mealId } = useLocalSearchParams<{ id: string; mealId?: string }>();
  const { snapshot, run } = useApp();
  const actions = useMealActions();
  const insets = useSafeAreaInsets();
  const recipe = catalogIndex.recipe(String(id));
  const meal = mealId ? snapshot?.meals.find((m) => m.id === mealId) : undefined;
  const [localServings, setLocalServings] = useState<number>(snapshot?.profile?.servings ?? recipe?.baseServings ?? 2);
  const [tab, setTab] = useState<Tab>('ingredienti');

  if (!recipe || !snapshot) {
    return (
      <Screen edges={[]}>
        <InfoNote tone="warning" text="Ricetta non trovata: non è più presente nel catalogo." />
        <Button label="Torna a Oggi" onPress={() => router.replace('/')} />
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
          <RecipeImage recipe={recipe} rounded={0} aspectRatio={1.22} />
        </Reveal>
        <View style={[styles.overlay, { top: insets.top + space.sm }]}>
          <PhotoButton icon="arrow-back" label="Indietro" onPress={back} />
          <View style={styles.flex} />
          {meal && planned ? <PhotoButton icon="ellipsis-horizontal" label="Azioni del pasto: cambia, sposta, cucinato" onPress={() => actions.openMenu(meal)} color={colors.green} /> : null}
          <PhotoButton
            icon={favorite ? 'heart' : 'heart-outline'}
            label={favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
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
            {recipe.name}
          </Text>

          {/* l'essenziale in una riga: durata e persone (modificabili per questo pasto) */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem} accessible accessibilityLabel={`${recipe.totalMinutes} minuti in tutto`}>
              <Ionicons name="time-outline" size={20} color={colors.ink} />
              <Text variant="heading">{`${recipe.totalMinutes} min`}</Text>
            </View>
            <View style={styles.metaSep} />
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={20} color={colors.ink} />
              <Stepper label="Persone" value={servings} min={1} max={30} onChange={setServings} />
            </View>
          </View>

          <Pills
            fill
            options={[
              { key: 'ingredienti', label: 'Ingredienti' },
              { key: 'preparazione', label: 'Preparazione' },
              { key: 'consigli', label: 'Consigli' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'ingredienti' ? (
            <View style={styles.tabBody}>
              {/* avviso obbligatorio sugli allergeni: sempre visibile, con icona (non solo colore) */}
              <InfoNote
                tone={facts.allergens.length > 0 ? 'warning' : 'info'}
                text={`${facts.allergens.length > 0 ? `Contiene: ${facts.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}.` : 'Nessun allergene noto tra gli ingredienti generici.'}${facts.allergenInfoIncomplete ? ' Alcuni prodotti confezionati: verifica l’etichetta.' : ''}`}
              />
              {missingCount > 0 && planned ? <InfoNote text={`Mancano ${missingCount} ${missingCount === 1 ? 'ingrediente' : 'ingredienti'} in dispensa: ${missingCount === 1 ? 'è già' : 'sono già'} nella lista della spesa.`} /> : null}
              <View>
                {recipe.ingredients.map((ri, i) => {
                  const ing = catalogIndex.ingredient(ri.ingredientId);
                  const portions = snapshot.profile?.portions;
                  const qty = ri.qty === undefined ? null : ingredientNeed(recipe, ri, ing, servings, portions);
                  const mine = isPersonalized(recipe, ri, ing, servings, portions);
                  const st = statuses?.get(ri.ingredientId);
                  const a = st && planned ? AVAILABILITY[st] : null;
                  const have = st === 'in_dispensa' || st === 'qb_presente';
                  return (
                    <View key={ri.ingredientId} style={[styles.ingRow, i > 0 && styles.ingLine]} accessible accessibilityLabel={`${ing.name}, ${qty === null ? 'quanto basta' : formatQtyWithUnit(qty, ing.unit)}${a ? `, ${a.label}` : ''}`}>
                      {/* casella = disponibilità stimata dalla dispensa (solo per un pasto programmato) */}
                      {a ? (
                        <View style={[styles.box, have && styles.boxOn]}>{have ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}</View>
                      ) : (
                        <View style={styles.dot} />
                      )}
                      <View style={styles.flex}>
                        <Text variant="heading" style={styles.ingName}>
                          {ing.name}
                          {ri.hint ? <Text variant="small" color={colors.inkSoft}>{` (${ri.hint})`}</Text> : null}
                        </Text>
                        {a && !have ? (
                          <Text variant="small" color={a.color}>
                            {a.label}
                          </Text>
                        ) : null}
                      </View>
                      {mine ? (
                        <View style={styles.mine} accessibilityLabel="porzione personalizzata">
                          <Text variant="caption" color={colors.greenDark}>
                            TUA
                          </Text>
                        </View>
                      ) : null}
                      <Text variant="body" color={colors.inkSoft} style={styles.qty}>
                        {qty === null ? 'q.b.' : formatQtyWithUnit(qty, ing.unit)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : tab === 'preparazione' ? (
            <View style={styles.tabBody}>
              {recipe.steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}>
                    <Text variant="heading" color={colors.white}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text variant="body">{s.text}</Text>
                    {s.timerMinutes ? (
                      <View style={styles.stepTime}>
                        <Ionicons name="time-outline" size={15} color={colors.inkSoft} />
                        <Text variant="small" color={colors.inkSoft}>{`${s.timerMinutes} min · timer nella Modalità Cucina`}</Text>
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
                  title={prepAhead.kind === 'scongelamento' ? (prepAhead.conditional ? 'Se usi un prodotto surgelato: la sera prima' : 'Da scongelare la sera prima') : 'Da preparare la sera prima'}
                  text={`${prepAhead.step}${meal && meal.status === 'planned' ? ' Con i promemoria attivi te lo ricordo io la sera prima.' : ''}`}
                />
              ) : null}
              <Text variant="body" color={colors.inkSoft}>
                {recipe.description}
              </Text>
              <View style={styles.chips}>
                <Info icon="hand-left-outline" text={`${recipe.prepMinutes} min preparazione`} />
                {recipe.cookMinutes > 0 ? <Info icon="flame-outline" text={`${recipe.cookMinutes} min cottura`} /> : null}
                {recipe.equipment.map((e) => (
                  <Info key={e} icon="construct-outline" text={EQUIPMENT_LABELS[e]} />
                ))}
              </View>
              {recipe.substitutions && recipe.substitutions.length > 0 ? (
                <Card>
                  <Text variant="heading">Sostituzioni possibili</Text>
                  {recipe.substitutions.map((sub) => (
                    <Text key={sub.substituteId} variant="small">
                      {`${catalogIndex.ingredient(sub.ingredientId).name} → ${catalogIndex.ingredient(sub.substituteId).name}: ${sub.note}`}
                    </Text>
                  ))}
                </Card>
              ) : null}
              <FoodInfoCard recipeId={recipe.id} servings={servings} />
              {meal && meal.reasons.length > 0 && planned ? <InfoNote text={`Perché questa ricetta: ${meal.reasons.join(' · ')}`} /> : null}
              <InfoToggle
                label="Quantità e disponibilità"
                text={`${meal && planned ? 'Le persone valgono solo per questo pasto: la lista della spesa si aggiorna.' : 'Le quantità si adattano alle persone.'} ${statuses ? 'Disponibilità stimata dalla dispensa confermata. ' : ''}${PORTIONS_NOTE} «TUA» indica le quantità adattate alle tue abitudini. ${t('allergen.disclaimer')}`}
              />
              <Button kind="ghost" icon="repeat-outline" label="Aggiungi a un altro giorno" onPress={() => router.push(`/ripeti/${recipe.id}`)} />
            </View>
          )}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button label="Inizia a cucinare" iconRight="arrow-forward" size="large" onPress={() => router.push(`/cucina/${recipe.id}${meal ? `?mealId=${encodeURIComponent(meal.id)}` : ''}`)} />
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
  box: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sage, marginHorizontal: 9 },
  qty: { fontVariant: ['tabular-nums'] },
  mine: { backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  step: { flexDirection: 'row', gap: space.md },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  stepBody: { flex: 1, gap: space.xs, paddingTop: 4 },
  stepTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
});


/** Costo indicativo e informazioni alimentari con stato esplicito: nessun claim non verificato. */
function FoodInfoCard({ recipeId, servings }: { recipeId: string; servings: number }) {
  const { snapshot } = useApp();
  const recipe = catalogIndex.recipe(recipeId);
  if (!recipe || !snapshot) return null;
  const info = foodInfo(recipe, catalogIndex);
  const meta = metaOf(recipe);
  const cost = recipeCost(recipe, catalogIndex, snapshot.prices, servings, snapshot.profile?.portions, toStock(snapshot.pantry));
  const costText =
    cost.completeness === 'completa'
      ? `Costo indicativo: circa ${formatCents(cost.perServingCents ?? 0)} a porzione (${formatCents(cost.knownCents)} in tutto), dai prezzi che conosci.`
      : cost.completeness === 'parziale'
        ? `Costo noto solo in parte: almeno ${formatCents(cost.knownCents)} (${cost.knownCount} di ${cost.totalCount} ingredienti con prezzo).`
        : 'Costo non stimato: mancano i prezzi degli ingredienti. Puoi inserirli in Impostazioni → Prezzi.';
  return (
    <Card>
      <Text variant="heading">Da sapere</Text>
      <Text variant="small">{costText}</Text>
      {info.formulatedWithoutGluten.value ? <Text variant="small">{info.formulatedWithoutGluten.note}</Text> : null}
      <Text variant="small">{info.noAddedSweeteners.note}</Text>
      <Text variant="small" color={colors.inkSoft}>
        {[
          meta.cuisine === 'internazionale' ? 'Cucina internazionale' : meta.region ? `Tradizione: ${meta.region}` : 'Cucina italiana',
          `difficoltà ${'●'.repeat(meta.difficulty)}${'○'.repeat(3 - meta.difficulty)}`,
          meta.makeAhead ? 'si può preparare in anticipo' : null,
          meta.storage ?? null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {meta.review.status !== 'approved_for_release' ? (
        <Text variant="small" color={colors.inkSoft}>
          Ricetta in revisione editoriale: segnalaci tempi o passaggi che non tornano.
        </Text>
      ) : null}
    </Card>
  );
}
