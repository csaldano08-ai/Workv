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
import { PortionProfileStep, QuantitiesStep, TastesStep } from './stepsPersonal';
import type { TimoPose } from '../../ui/mascot/timoSvg';

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
  /** Frase di Timo mostrata nel passo. */
  tip?: string;
  pose?: TimoPose;
  /** Funzione di personalizzazione avanzata (Spesora Plus in futuro; oggi disponibile a tutti). */
  premium?: boolean;
}

export const STEPS: StepDef[] = [
  { id: 'persone', title: 'Quante persone mangeranno abitualmente?', Component: PeopleStep, editable: true, pose: 'saluto', tip: 'Ciao, sono Timo! Bastano due minuti e organizzo io la tua settimana.' },
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
  {
    id: 'porzioni',
    title: 'Come mangi di solito?',
    subtitle: 'Serve solo a proporti quantità vicine alle tue abitudini.',
    Component: PortionProfileStep,
    editable: true,
    premium: true,
    tip: 'Niente diete: uso queste risposte solo per non farti cucinare troppo o troppo poco.',
  },
  {
    id: 'quantita',
    title: 'Le tue quantità abituali',
    subtitle: 'Le ricette e la spesa useranno questi valori come base.',
    Component: QuantitiesStep,
    editable: true,
    premium: true,
    pose: 'cucinare',
    tip: 'Se di solito cuoci 70 g di pasta, userò 70 g. Semplice.',
  },
  {
    id: 'gusti',
    title: 'I tuoi gusti',
    subtitle: 'Scegli liberamente: puoi combinare più preferenze.',
    Component: TastesStep,
    optional: true,
    editable: true,
    premium: true,
    pose: 'suggerimento',
    tip: 'Dimmi cosa ti piace e lo proporrò più spesso, senza rinunciare alla varietà.',
  },
  { id: 'tempo', title: 'Quanto tempo hai per cucinare?', subtitle: 'Per ogni pasto principale.', Component: TimeStep, editable: true },
  { id: 'orari', title: 'A che ora mangi di solito?', subtitle: 'Servono per i promemoria. Bastano orari indicativi.', Component: TimesStep, editable: true },
  { id: 'frequenza', title: 'Quante volte fai la spesa a settimana?', Component: FrequencyStep },
  {
    id: 'giorni-spesa',
    title: 'In quali giorni fai la spesa?',
    pose: 'spesa',
    tip: 'Dividerò la spesa tra questi giorni, così i prodotti freschi restano freschi.',
    Component: ShoppingDaysStep,
    editable: true,
    validate: (d) => (d.profile.shoppingDays.length === 0 ? 'Scegli almeno un giorno.' : null),
  },
  { id: 'budget', title: 'Quanto vuoi spendere per la tua spesa?', subtitle: 'Facoltativo: aiuta a scegliere ricette che riutilizzano gli ingredienti.', Component: BudgetStep, editable: true, premium: true, pose: 'spesa', tip: 'Mangiare bene secondo i tuoi gusti, senza comprare più del necessario.' },
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
    pose: 'suggerimento',
    tip: 'Ti scrivo solo quando serve: niente spam, promesso.',
  },
];

export const PREVIEW_STEP = STEPS.length;
