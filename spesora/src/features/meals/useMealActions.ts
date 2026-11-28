import { celebrate } from '../../ui/celebration';
import { recipeCompleted } from '../../i18n/assistant';
import { router } from 'expo-router';
import { Alert } from '../../ui/dialog';
import { formatQtyWithUnit } from '../../core/domain/quantity';
import type { MealStatus, PlannedMeal } from '../../core/domain/types';
import { useT } from '../../i18n';
import { ingredientName, recipeName } from '../../i18n/content';
import { MEAL_LABELS } from '../../i18n/labels';
import { catalogIndex, useApp } from '../app/AppProvider';
import { useActionSheet } from '../../ui/ActionSheet';
import { toast } from '../../ui/toast';

/** Azioni sui pasti condivise da Oggi, Settimana e Ricetta. La logica resta nel servizio. */
export function useMealActions() {
  const { t, language } = useT();
  const { run } = useApp();
  const sheet = useActionSheet();

  const cooked = async (meal: PlannedMeal) => {
    const res = await run((s) => s.markCooked(meal.id));
    if (!res) return;
    if (!res.ok) {
      if (res.reason === 'already_done') toast(t('week:actions.alreadyDone'), 'info');
      return;
    }
    if (res.shortfalls.length > 0) {
      const list = res.shortfalls
        .map((sf) => {
          const ing = catalogIndex.ingredient(sf.ingredientId);
          return `${ingredientName(ing.id, ing.name)} (${formatQtyWithUnit(sf.missing, ing.unit)})`;
        })
        .join(', ');
      toast(t('week:actions.shortfall', { list }), 'warning');
      return;
    }
    // il piatto è pronto: festeggia Mina Chef, che lo serve con la cloche (gesto breve)
    celebrate({ title: t('week:actions.completed'), text: recipeCompleted(meal.id), pose: 'serving' });
  };

  const notFollowed = async (meal: PlannedMeal, outcome: Exclude<MealStatus, 'planned' | 'cooked'>) => {
    const ok = await run((s) => s.markNotFollowed(meal.id, outcome));
    if (!ok || outcome === 'other') return;
    const recipe = catalogIndex.recipe(meal.recipeId);
    // in tedesco i nomi comuni restano maiuscoli
    const mealLabel = language === 'de' ? MEAL_LABELS[meal.mealType] : MEAL_LABELS[meal.mealType].toLowerCase();
    Alert.alert(
      t('week:actions.noneSubtracted'),
      t('week:actions.repropose', { recipe: recipe ? recipeName(recipe) : t('week:actions.thisRecipe'), meal: mealLabel }),
      [
        { text: t('week:actions.no'), style: 'cancel' },
        {
          text: t('week:actions.reproposeConfirm'),
          onPress: () =>
            void run(async (s) => {
              const next = await s.reproposeLater(meal.id);
              if (!next) toast(t('week:actions.noFreeSlot'), 'info');
            }),
        },
      ],
    );
  };

  /** Menu completo delle azioni di un pasto ancora da cucinare. */
  const openMenu = (meal: PlannedMeal) => {
    const recipe = catalogIndex.recipe(meal.recipeId);
    sheet.open(recipe ? recipeName(recipe) : t('week:actions.mealFallback'), [
      { label: t('week:actions.openRecipe'), onPress: () => router.push(`/ricetta/${meal.recipeId}?mealId=${encodeURIComponent(meal.id)}`) },
      { label: t('action.replace'), onPress: () => router.push(`/cambia/${encodeURIComponent(meal.id)}`) },
      { label: t('week:actions.move'), onPress: () => router.push(`/sposta/${encodeURIComponent(meal.id)}`) },
      { label: t('action.cooked'), onPress: () => void cooked(meal) },
      { label: t('week:actions.ateOut'), onPress: () => void notFollowed(meal, 'ate_out') },
      { label: t('week:actions.other'), onPress: () => void notFollowed(meal, 'other') },
      { label: t('action.notCooked'), onPress: () => void notFollowed(meal, 'skipped') },
    ]);
  };

  return { cooked, notFollowed, openMenu, sheet: sheet.element };
}
