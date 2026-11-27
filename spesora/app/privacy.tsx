import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { InfoNote } from '../src/ui/mina/kit';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { t } from '../src/i18n/it';

/*
 * Privacy e dati: testo legale su una pagina intera (non in un popup). Ogni frase descrive ciò che il codice fa
 * davvero (verificato: nessuna chiamata di rete nell'app, nessun SDK di analisi o pubblicità, notifiche locali).
 */
const SECTIONS = [
  {
    title: 'Dove sono i tuoi dati',
    text: 'Preferenze, calendario, dispensa, liste della spesa e storico sono salvati in un database sul tuo telefono. Mina non ha server e non richiede account: nessuna email, password o accesso con Google o Apple.',
  },
  {
    title: 'Allergie e preferenze',
    text: 'Gli ingredienti che escludi restano sul dispositivo. Non vengono inviati a servizi di pagamento, analisi o pubblicità. Non chiediamo peso, altezza, diagnosi o dati anagrafici.',
  },
  {
    title: 'Niente analisi né pubblicità',
    text: 'L’app non contiene strumenti di analisi, tracciamento o pubblicità e non usa identificativi pubblicitari.',
  },
  {
    title: 'Notifiche',
    text: 'I promemoria sono notifiche locali programmate dal telefono stesso. Nessun server invia messaggi.',
  },
  {
    title: 'Backup del telefono',
    text: 'Il database dell’app può essere incluso nei backup del telefono (iCloud o computer su iPhone, backup del tuo account Google su Android), secondo le impostazioni che hai scelto. È il tuo backup: Mina non lo riceve.',
  },
  {
    title: 'Esportare o cancellare',
    text: 'Dal Profilo puoi esportare tutti i dati in formato JSON o cancellarli definitivamente. Dopo la cancellazione l’app riparte dal questionario iniziale.',
  },
  {
    title: 'Abbonamento',
    text: 'Oggi gli acquisti non sono attivi e l’app non contatta alcun servizio di pagamento. Quando lo saranno, i pagamenti verranno gestiti da Apple o Google; lo stato dell’abbonamento sarà verificato tramite RevenueCat con un identificativo anonimo dell’app e la ricevuta dello store. Le tue preferenze alimentari non saranno mai condivise.',
  },
];

export default function Privacy() {
  return (
    <Screen edges={[]}>
      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <Text variant="heading">{s.title}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {s.text}
          </Text>
        </Card>
      ))}
      <InfoNote tone="warning" text={t('allergen.disclaimer')} />
      <Text variant="small" color={colors.inkSoft}>
        Mina non è un dispositivo medico e non fornisce indicazioni dietetiche o nutrizionali. L’informativa privacy completa sarà pubblicata prima della distribuzione negli store.
      </Text>
    </Screen>
  );
}
