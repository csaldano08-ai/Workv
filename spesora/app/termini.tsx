import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/*
 * Termini e abbonamento: testo su pagina intera, raggiungibile dalla schermata dell'abbonamento e dal Profilo
 * anche quando l'abbonamento è obbligatorio. I termini definitivi vanno pubblicati prima della distribuzione
 * (app.json → extra.legal.termsUrl): finché manca l'indirizzo, qui ci sono le condizioni dell'abbonamento.
 */
const SECTIONS = [
  { title: 'Stato attuale', text: 'In questa versione di prova gli abbonamenti non sono attivi: nessun pagamento viene richiesto o addebitato.' },
  { title: 'Prezzo e periodo', text: 'Quando gli abbonamenti saranno attivi, prezzo, periodo (mensile o annuale) ed eventuali prove gratuite saranno mostrati prima dell’acquisto, letti direttamente dallo store.' },
  { title: 'Rinnovo automatico', text: 'L’abbonamento si rinnova automaticamente alla fine di ogni periodo, salvo disdetta almeno 24 ore prima, dalle impostazioni del tuo account Apple o Google Play.' },
  { title: 'Disdetta e rimborsi', text: 'Puoi disdire quando vuoi dalle impostazioni dello store; resta attivo fino alla fine del periodo pagato. I rimborsi sono gestiti da Apple o Google secondo le loro regole.' },
  { title: 'Ripristino', text: 'Non serve un account Mina: l’abbonamento è legato al tuo account dello store. Su un telefono nuovo usa «Ripristina acquisti» nella schermata dell’abbonamento.' },
  { title: 'I tuoi dati', text: 'Ricette salvate, dispensa e storico restano sul telefono anche se l’abbonamento scade. Per portarli su un altro telefono usa il backup del telefono o l’esportazione dal Profilo.' },
];

export default function Terms() {
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
      <Text variant="small" color={colors.inkSoft}>
        I termini di servizio completi saranno pubblicati prima della distribuzione negli store.
      </Text>
    </Screen>
  );
}
