import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatLongDate, minutesToHHMM } from '../../src/core/domain/dates';
import { mealIngredientStatus, toStock, type IngredientAvailability } from '../../src/core/domain/pantry';
import { formatQtyWithUnit, scaleQty, toMilli } from '../../src/core/domain/quantity';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { ALLERGEN_LABELS, EQUIPMENT_LABELS, MEAL_LABELS } from '../../src/i18n/labels';
import { t } from '../../src/i18n/it';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { DishArt } from '../../src/ui/DishArt';
import { Notice } from '../../src/ui/Notice';
import { SectionTitle } from '../../src/ui/Row';
import { Screen } from '../../src/ui/Screen';
import { Stepper } from '../../src/ui/Stepper';
import { StepTimer } from '../../src/ui/StepTimer';
import { Text } from '../../src/ui/Text';

const AVAILABILITY: Record<IngredientAvailability, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  in_dispensa: { label: 'in dispensa', color: colors.green, icon: 'checkmark-circle' },
  parziale: { label: 'non basta', color: colors.peachInk, icon: 'alert-circle-outline' },
  da_comprare: { label: 'da comprare', color: colors.peachInk, icon: 'basket-outline' },
  qb_presente: { label: 'in casa', color: colors.green, icon: 'checkmark-circle' },
  qb_mancante: { label: 'verifica di averlo', color: colors.peachInk, icon: 'help-circle-outline' },
};

export default function RecipeScreen() {
  const { id, mealId } = useLocalSearchParams<{ id: string; mealId?: string }>();
  const { snapshot, run } = useApp();
  const actions = useMealActions();
  const recipe = catalogIndex.recipe(String(id));
  const meal = mealId ? snapshot?.meals.find((m) => m.id === mealId) : undefined;
  const [localServings, setLocalServings] = useState<number>(snapshot?.profile?.servings ?? recipe?.baseServings ?? 2);

  if (!recipe || !snapshot) {
    return (
      <Screen edges={[]}>
        <Notice tone="warning" title="Ricetta non trovata" text="Questa ricetta non è più presente nel catalogo." />
        <Button label="Torna a Oggi" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const facts = catalogIndex.factsOf(recipe);
  const favorite = snapshot.favorites.has(recipe.id);
  const servings = meal?.servings ?? localServings;
  const planned = meal?.status === 'planned';
  const statuses = meal ? new Map(mealIngredientStatus(meal, catalogIndex, toStock(snapshot.pantry), snapshot.staples).map((s) => [s.ingredientId, s.status])) : null;

  const setServings = (v: number) => {
    if (meal && planned) void run((s) => s.setServings(meal.id, v));
    else setLocalServings(v);
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        meal && planned ? (
          <>
            <Button label={t('action.cooked')} icon="checkmark" onPress={() => void actions.cooked(meal)} />
            <View style={styles.row}>
              <Button kind="secondary" compact label={t('action.replace')} onPress={() => router.push(`/cambia/${encodeURIComponent(meal.id)}`)} style={styles.flex} />
              <Button kind="secondary" compact label="Non cucino" onPress={() => actions.openMenu(meal)} style={styles.flex} />
            </View>
          </>
        ) : undefined
      }
    >
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              accessibilityState={{ selected: favorite }}
              onPress={() => void run((s) => s.toggleFavorite(recipe.id, !favorite))}
              style={styles.headerBtn}
            >
              <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={colors.peach} />
            </Pressable>
          ),
        }}
      />
      <DishArt category={recipe.dishCategory} recipeId={recipe.id} />
      {meal ? (
        <Text variant="caption" color={colors.green}>
          {`${MEAL_LABELS[meal.mealType].toUpperCase()} · ${formatLongDate(meal.date).toUpperCase()} · ${minutesToHHMM(meal.timeMinutes)}`}
          {meal.status !== 'planned' ? ` · ${t(`status.${meal.status}`).toUpperCase()}` : ''}
        </Text>
      ) : null}
      <Text variant="display" accessibilityRole="header">
        {recipe.name}
      </Text>
      <Text variant="body" color={colors.inkSoft}>
        {recipe.description}
      </Text>

      <View style={styles.chips}>
        <Info icon="time-outline" text={`${recipe.totalMinutes} min in tutto`} />
        <Info icon="hand-left-outline" text={`${recipe.prepMinutes} min preparazione`} />
        {recipe.cookMinutes > 0 ? <Info icon="flame-outline" text={`${recipe.cookMinutes} min cottura`} /> : null}
        {recipe.equipment.map((e) => (
          <Info key={e} icon="construct-outline" text={EQUIPMENT_LABELS[e]} />
        ))}
      </View>

      <Card>
        <View style={styles.servingsRow}>
          <View style={styles.flex}>
            <Text variant="heading">Porzioni</Text>
            <Text variant="small" color={colors.inkSoft}>
              {meal && planned ? 'Vale solo per questo pasto: lista della spesa aggiornata.' : 'Le quantità si adattano.'}
            </Text>
          </View>
          <Stepper label="Porzioni" value={servings} min={1} max={30} onChange={setServings} />
        </View>
      </Card>

      {meal && meal.reasons.length > 0 && planned ? (
        <Text variant="small" color={colors.inkSoft}>
          {`Perché questa ricetta: ${meal.reasons.join(' · ')}`}
        </Text>
      ) : null}

      <SectionTitle>Ingredienti</SectionTitle>
      <Card>
        {recipe.ingredients.map((ri) => {
          const ing = catalogIndex.ingredient(ri.ingredientId);
          const qty = ri.qty === undefined ? null : scaleQty(toMilli(ri.qty), servings, recipe.baseServings);
          const st = statuses?.get(ri.ingredientId);
          const a = st && planned ? AVAILABILITY[st] : null;
          return (
            <View key={ri.ingredientId} style={styles.ingRow} accessible accessibilityLabel={`${ing.name}, ${qty === null ? 'quanto basta' : formatQtyWithUnit(qty, ing.unit)}${a ? `, ${a.label}` : ''}`}>
              <Text variant="body" style={styles.flex}>
                {ing.name}
                {ri.hint ? <Text variant="small" color={colors.inkSoft}>{` (${ri.hint})`}</Text> : null}
              </Text>
              <Text variant="body" style={styles.qty}>
                {qty === null ? 'q.b.' : formatQtyWithUnit(qty, ing.unit)}
              </Text>
              {a ? <Ionicons name={a.icon} size={18} color={a.color} /> : null}
            </View>
          );
        })}
        {statuses ? (
          <Text variant="small" color={colors.inkSoft}>
            Disponibilità stimata dalla dispensa confermata.
          </Text>
        ) : null}
      </Card>

      <Card tone="peach">
        <Text variant="heading">Allergeni</Text>
        <Text variant="small">
          {facts.allergens.length > 0 ? `Contiene: ${facts.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}.` : 'Nessun allergene noto tra gli ingredienti generici.'}
        </Text>
        {facts.allergenInfoIncomplete ? (
          <Text variant="small" color={colors.danger}>
            Informazioni non verificate: alcuni ingredienti sono prodotti confezionati la cui composizione dipende dalla marca.
          </Text>
        ) : null}
        <Text variant="small" color={colors.inkSoft}>
          {t('allergen.disclaimer')}
        </Text>
      </Card>

      <SectionTitle>Preparazione</SectionTitle>
      {recipe.steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={styles.stepNum}>
            <Text variant="heading" color={colors.white}>
              {i + 1}
            </Text>
          </View>
          <View style={styles.stepBody}>
            <Text variant="body">{s.text}</Text>
            {s.timerMinutes ? <StepTimer minutes={s.timerMinutes} label={`passaggio ${i + 1}`} /> : null}
          </View>
        </View>
      ))}

      {recipe.substitutions && recipe.substitutions.length > 0 ? (
        <>
          <SectionTitle>Sostituzioni possibili</SectionTitle>
          <Card>
            {recipe.substitutions.map((sub) => (
              <Text key={sub.substituteId} variant="small">
                {`${catalogIndex.ingredient(sub.ingredientId).name} → ${catalogIndex.ingredient(sub.substituteId).name}: ${sub.note}`}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      <Button kind="ghost" icon="repeat-outline" label="Aggiungi a un altro giorno" onPress={() => router.push(`/ripeti/${recipe.id}`)} />
      {actions.sheet}
    </Screen>
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
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  headerBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  info: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenSoft, paddingHorizontal: space.sm, paddingVertical: 6, borderRadius: radius.pill },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
  qty: { fontVariant: ['tabular-nums'] },
  step: { flexDirection: 'row', gap: space.md },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  stepBody: { flex: 1, gap: space.sm, paddingTop: 4 },
});
