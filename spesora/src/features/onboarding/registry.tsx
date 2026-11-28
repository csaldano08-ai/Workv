import type { ComponentType } from 'react';
import type { OnboardingDraft } from './draft';
import {
  AllergenStep,
  BudgetStep,
  DietStep,
  DislikeStep,
  EquipmentStep,
  FrequencyStep,
  LanguageStep,
  MealsStep,
  NotificationsStep,
  PantryStep,
  PeopleStep,
  ShoppingDaysStep,
  TimeStep,
  TimesStep,
  type StepProps,
} from './steps';
import { PortionProfileStep, QuantitiesStep, TastesStep } from './stepsPersonal';
import type { MinaPose } from '../../ui/mascot/Mina';
import { t } from '../../i18n';

export interface StepDef {
  id: string;
  title: string;
  subtitle?: string;
  Component: ComponentType<StepProps>;
  optional?: boolean;
  /** Messaggio di errore se il passo non è valido, altrimenti null. */
  validate?: (d: OnboardingDraft) => string | null;
  /** Modificabile dalle Impostazioni. */
  editable?: boolean;
  /** Frase di Mina mostrata nel passo. */
  tip?: string;
  pose?: MinaPose;
  /** Reazione di Mina alle scelte già fatte nel passo (posa e frase); assente = usa `tip`/`pose`. */
  react?: (d: OnboardingDraft) => { pose: MinaPose; tip: string } | null;
  /** Funzione di personalizzazione avanzata (Mina Plus in futuro; oggi disponibile a tutti). */
  premium?: boolean;
}

export const STEPS: StepDef[] = [
  {
    id: 'lingua',
    get title() {
      return t('language:title');
    },
    get subtitle() {
      return t('language:subtitle');
    },
    Component: LanguageStep,
    pose: 'wave',
    get tip() {
      return t('language:tip');
    },
  },
  {
    id: 'persone',
    get title() {
      return t('onboarding:people.title');
    },
    Component: PeopleStep,
    editable: true,
    pose: 'wave',
    get tip() {
      return t('onboarding:people.tip');
    },
  },
  {
    id: 'pasti',
    get title() {
      return t('onboarding:meals.title');
    },
    get subtitle() {
      return t('onboarding:meals.subtitle');
    },
    Component: MealsStep,
    editable: true,
    validate: (d) => (d.profile.mealTypes.length === 0 ? t('onboarding:meals.invalid') : null),
  },
  {
    id: 'dieta',
    get title() {
      return t('onboarding:diet.title');
    },
    Component: DietStep,
    editable: true,
  },
  {
    id: 'esclusioni',
    get title() {
      return t('onboarding:exclusions.title');
    },
    get subtitle() {
      return t('onboarding:exclusions.subtitle');
    },
    Component: AllergenStep,
    optional: true,
    editable: true,
    react: (d) => (d.profile.excludedAllergens.length + d.profile.excludedIngredientIds.length > 0 ? { pose: 'thinking', tip: t('onboarding:exclusions.react') } : null),
  },
  {
    id: 'non-graditi',
    get title() {
      return t('onboarding:dislikes.title');
    },
    get subtitle() {
      return t('onboarding:dislikes.subtitle');
    },
    Component: DislikeStep,
    optional: true,
    editable: true,
    react: (d) => (d.profile.dislikedIngredientIds.length > 0 ? { pose: 'happy', tip: t('onboarding:dislikes.react') } : null),
  },
  {
    id: 'porzioni',
    get title() {
      return t('onboarding:portions.title');
    },
    get subtitle() {
      return t('onboarding:portions.subtitle');
    },
    Component: PortionProfileStep,
    editable: true,
    premium: true,
    get tip() {
      return t('onboarding:portions.tip');
    },
  },
  {
    id: 'quantita',
    get title() {
      return t('onboarding:quantities.title');
    },
    get subtitle() {
      return t('onboarding:quantities.subtitle');
    },
    Component: QuantitiesStep,
    editable: true,
    premium: true,
    pose: 'cooking',
    get tip() {
      return t('onboarding:quantities.tip');
    },
  },
  {
    id: 'gusti',
    get title() {
      return t('onboarding:tastes.title');
    },
    get subtitle() {
      return t('onboarding:tastes.subtitle');
    },
    Component: TastesStep,
    optional: true,
    editable: true,
    premium: true,
    pose: 'thinking',
    get tip() {
      return t('onboarding:tastes.tip');
    },
  },
  {
    id: 'tempo',
    get title() {
      return t('onboarding:time.title');
    },
    get subtitle() {
      return t('onboarding:time.subtitle');
    },
    Component: TimeStep,
    editable: true,
  },
  {
    id: 'orari',
    get title() {
      return t('onboarding:times.title');
    },
    get subtitle() {
      return t('onboarding:times.subtitle');
    },
    Component: TimesStep,
    editable: true,
  },
  {
    id: 'frequenza',
    get title() {
      return t('onboarding:frequency.title');
    },
    Component: FrequencyStep,
  },
  {
    id: 'giorni-spesa',
    get title() {
      return t('onboarding:shoppingDays.title');
    },
    pose: 'shopping',
    get tip() {
      return t('onboarding:shoppingDays.tip');
    },
    Component: ShoppingDaysStep,
    editable: true,
    validate: (d) => (d.profile.shoppingDays.length === 0 ? t('onboarding:shoppingDays.invalid') : null),
  },
  {
    id: 'budget',
    get title() {
      return t('onboarding:budget.title');
    },
    get subtitle() {
      return t('onboarding:budget.subtitle');
    },
    Component: BudgetStep,
    editable: true,
    premium: true,
    pose: 'savings',
    get tip() {
      return t('onboarding:budget.tip');
    },
  },
  {
    id: 'strumenti',
    get title() {
      return t('onboarding:equipment.title');
    },
    Component: EquipmentStep,
    editable: true,
    validate: (d) => (d.profile.equipment.length === 0 ? t('onboarding:equipment.invalid') : null),
  },
  {
    id: 'dispensa',
    get title() {
      return t('onboarding:pantry.title');
    },
    get subtitle() {
      return t('onboarding:pantry.subtitle');
    },
    Component: PantryStep,
    optional: true,
  },
  {
    id: 'notifiche',
    get title() {
      return t('onboarding:notifications.title');
    },
    get subtitle() {
      return t('onboarding:notifications.subtitle');
    },
    Component: NotificationsStep,
    pose: 'thinking',
    get tip() {
      return t('onboarding:notifications.tip');
    },
  },
];

export const PREVIEW_STEP = STEPS.length;
