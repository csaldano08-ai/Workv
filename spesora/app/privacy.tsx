import { Screen } from '../src/ui/Screen';
import { Card } from '../src/ui/Card';
import { Text } from '../src/ui/Text';
import { Notice } from '../src/ui/Notice';
import { colors } from '../src/theme/tokens';
import { t } from '../src/i18n/it';

const SECTIONS = [
  {
    title: 'Dove sono i tuoi dati',
    text: 'Preferenze, calendario, dispensa, liste della spesa e storico sono salvati solo in un database sul tuo iPhone. Spesora non ha server, non richiede account e non invia questi dati a nessuno.',
  },
  {
    title: 'Allergie e preferenze',
    text: 'Gli ingredienti che escludi restano sul dispositivo. Non vengono inviati a servizi di pagamento, analisi o pubblicità. Non chiediamo peso, altezza, diagnosi o dati anagrafici.',
  },
  {
    title: 'Notifiche',
    text: 'I promemoria sono notifiche locali programmate dal telefono stesso. Nessun server invia messaggi.',
  },
  {
    title: 'Backup del dispositivo',
    text: 'Il database dell’app può essere incluso nei backup iCloud o del computer del tuo iPhone, secondo le impostazioni di backup che hai scelto in iOS.',
  },
  {
    title: 'Esportare o cancellare',
    text: 'Da Impostazioni puoi esportare tutti i dati in formato JSON o cancellarli definitivamente. Dopo la cancellazione l’app riparte dal questionario iniziale.',
  },
  {
    title: 'Abbonamenti (in futuro)',
    text: 'Quando Spesora Plus sarà attivo, i pagamenti saranno gestiti da Apple; lo stato dell’abbonamento sarà verificato tramite RevenueCat con un identificativo anonimo. Le tue preferenze alimentari non saranno mai condivise.',
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
      <Notice tone="warning" title="Informazioni alimentari" text={t('allergen.disclaimer')} />
      <Text variant="small" color={colors.inkSoft}>
        Spesora non è un dispositivo medico e non fornisce indicazioni dietetiche o nutrizionali. L’informativa privacy completa sarà pubblicata prima della distribuzione sull’App Store.
      </Text>
    </Screen>
  );
}
