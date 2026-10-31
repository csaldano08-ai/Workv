import type { ComponentType } from 'react';
import type { OnboardingDraft } from './draft';
import {
  AllergenStep,
  BudgetStep,
  DietStep,
  DislikeStep,
  EquipmentStep,
  FrequencyStep,
  MealsStep,
  NotificationsStep,
  PantryStep,
  PeopleStep,
  ShoppingDaysStep,
  TimeStep,
  TimesStep,
  type StepProps,
} from './steps';

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
}

export const STEPS: StepDef[] = [
  { id: 'persone', title: 'Quante persone mangeranno abitualmente?', Component: PeopleStep, editable: true },
  {
    id: 'pasti',
    title: 'Quali pasti vuoi organizzare?',
    subtitle: 'Puoi sceglierne più di uno.',
    Component: MealsStep,
    editable: true,
    validate: (d) => (d.profile.mealTypes.length === 0 ? 'Scegli almeno un pasto.' : null),
  },
  { id: 'dieta', title: 'Come mangi?', Component: DietStep, editable: true },
  {
    id: 'esclusioni',
    title: 'Ci sono ingredienti da evitare?',
    subtitle: 'Allergie, intolleranze o scelte personali: verranno esclusi sempre.',
    Component: AllergenStep,
    optional: true,
    editable: true,
  },
  { id: 'non-graditi', title: 'C’è qualcosa che non ti piace?', subtitle: 'Non lo vedrai nelle ricette proposte.', Component: DislikeStep, optional: true, editable: true },
  { id: 'tempo', title: 'Quanto tempo hai per cucinare?', subtitle: 'Per ogni pasto principale.', Component: TimeStep, editable: true },
  { id: 'orari', title: 'A che ora mangi di solito?', subtitle: 'Servono per i promemoria. Bastano orari indicativi.', Component: TimesStep, editable: true },
  { id: 'frequenza', title: 'Quante volte fai la spesa a settimana?', Component: FrequencyStep },
  {
    id: 'giorni-spesa',
    title: 'In quali giorni fai la spesa?',
    Component: ShoppingDaysStep,
    editable: true,
    validate: (d) => (d.profile.shoppingDays.length === 0 ? 'Scegli almeno un giorno.' : null),
  },
  { id: 'budget', title: 'Vuoi indicare un budget settimanale?', Component: BudgetStep, optional: true, editable: true },
  {
    id: 'strumenti',
    title: 'Cosa hai in cucina?',
    Component: EquipmentStep,
    editable: true,
    validate: (d) => (d.profile.equipment.length === 0 ? 'Scegli almeno uno strumento.' : null),
  },
  { id: 'dispensa', title: 'Cosa hai già in casa?', subtitle: 'Facoltativo: aiuta a comprare solo il necessario.', Component: PantryStep, optional: true },
  {
    id: 'notifiche',
    title: 'Vuoi dei promemoria?',
    subtitle: 'Un avviso quando è ora di iniziare a cucinare e nei giorni di spesa. Nessuno spam: solo ciò che scegli qui.',
    Component: NotificationsStep,
  },
];

export const PREVIEW_STEP = STEPS.length;
