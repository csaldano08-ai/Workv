import { celebrate } from '../../ui/celebration';
import { recipeCompleted } from '../../i18n/assistant';
import { router } from 'expo-router';
import { Alert } from '../../ui/dialog';
import { formatQtyWithUnit } from '../../core/domain/quantity';
import type { MealStatus, PlannedMeal } from '../../core/domain/types';
import { catalogIndex, useApp } from '../app/AppProvider';
import { useActionSheet } from '../../ui/ActionSheet';

/** Azioni sui pasti condivise da Oggi, Settimana e Ricetta. La logica resta nel servizio. */
export function useMealActions() {
  const { run } = useApp();
  const sheet = useActionSheet();

  const cooked = async (meal: PlannedMeal) => {
    const res = await run((s) => s.markCooked(meal.id));
    if (!res) return;
    if (!res.ok) {
      if (res.reason === 'already_done') Alert.alert('Già registrato', 'Questo pasto risulta già confermato: gli ingredienti non sono stati sottratti di nuovo.');
      return;
    }
    if (res.shortfalls.length > 0) {
      const list = res.shortfalls
        .map((sf) => {
          const ing = catalogIndex.ingredient(sf.ingredientId);
          return `${ing.name} (${formatQtyWithUnit(sf.missing, ing.unit)})`;
        })
        .join(', ');
      Alert.alert('Pasto registrato', `In dispensa non risultavano: ${list}. Se li avevi, aggiungili dalla Dispensa per tenerla allineata.`);
      return;
    }
    celebrate({ title: 'Pasto completato', text: recipeCompleted(meal.id) });
  };

  const notFollowed = async (meal: PlannedMeal, outcome: Exclude<MealStatus, 'planned' | 'cooked'>) => {
    const ok = await run((s) => s.markNotFollowed(meal.id, outcome));
    if (!ok || outcome === 'other') return;
    const recipe = catalogIndex.recipe(meal.recipeId);
    Alert.alert(
      'Nessun ingrediente sottratto',
      `Vuoi riproporre ${recipe?.name.toLowerCase() ?? 'questa ricetta'} nel prossimo ${meal.mealType} libero? Gli ingredienti acquistati per questo pasto restano in dispensa.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Riproponi',
          onPress: () =>
            void run(async (s) => {
              const next = await s.reproposeLater(meal.id);
              if (!next) Alert.alert('Nessuno spazio libero', 'Non ci sono altri pasti dello stesso tipo in questo calendario.');
            }),
        },
      ],
    );
  };

  /** Menu completo delle azioni di un pasto ancora da cucinare. */
  const openMenu = (meal: PlannedMeal) => {
    const recipe = catalogIndex.recipe(meal.recipeId);
    sheet.open(recipe?.name ?? 'Pasto', [
      { label: 'Apri la ricetta', onPress: () => router.push(`/ricetta/${meal.recipeId}?mealId=${encodeURIComponent(meal.id)}`) },
      { label: 'Cambia ricetta', onPress: () => router.push(`/cambia/${encodeURIComponent(meal.id)}`) },
      { label: 'Sposta in un altro giorno', onPress: () => router.push(`/sposta/${encodeURIComponent(meal.id)}`) },
      { label: 'Ho cucinato', onPress: () => void cooked(meal) },
      { label: 'Mangio fuori', onPress: () => void notFollowed(meal, 'ate_out') },
      { label: 'Ho cucinato altro', onPress: () => void notFollowed(meal, 'other') },
      { label: 'Non ho cucinato', onPress: () => void notFollowed(meal, 'skipped') },
    ]);
  };

  return { cooked, notFollowed, openMenu, sheet: sheet.element };
}
