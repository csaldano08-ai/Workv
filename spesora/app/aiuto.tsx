import { Linking } from 'react-native';
import { appConfig } from '../src/core/config';
import { colors } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { InfoNote } from '../src/ui/mina/kit';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/*
 * Aiuto e supporto: risposte brevi alle domande pratiche e i contatti (solo se configurati in
 * app.json → extra.legal; nessun contatto inventato). Nessuna diagnostica viene inviata da qui.
 */
const FAQ = [
  { q: 'Ho cambiato telefono: come ritrovo l’abbonamento?', a: 'Apri Profilo → Abbonamento e tocca «Ripristina acquisti», con lo stesso account Apple o Google usato per l’acquisto.' },
  { q: 'E i miei dati (piano, dispensa, preferenze)?', a: 'Restano sul telefono. Per portarli sul nuovo usa il backup del telefono, oppure Profilo → I tuoi dati → Esporta.' },
  { q: 'Come cambio un pasto?', a: 'In Settimana tocca il pasto per aprire la ricetta, oppure tienilo premuto per cambiarlo, spostarlo o segnarlo.' },
  { q: 'Perché la dispensa non scala gli ingredienti?', a: 'Le quantità cambiano solo quando confermi la spesa o di aver cucinato un pasto: così la dispensa resta affidabile.' },
  { q: 'Non ricevo i promemoria', a: 'Controlla Profilo → Notifiche e le impostazioni delle notifiche del telefono. I promemoria sono locali: funzionano anche senza internet.' },
];

export default function Help() {
  const email = appConfig.legal.supportEmail;
  const url = appConfig.legal.supportUrl;
  return (
    <Screen edges={[]}>
      {FAQ.map((f) => (
        <Card key={f.q}>
          <Text variant="heading">{f.q}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {f.a}
          </Text>
        </Card>
      ))}
      {email ? <Button kind="secondary" icon="mail-outline" label="Scrivi all’assistenza" onPress={() => void Linking.openURL(`mailto:${email}`)} /> : null}
      {url ? <Button kind="secondary" icon="open-outline" label="Pagina di supporto" onPress={() => void Linking.openURL(url)} /> : null}
      {!email && !url ? <InfoNote text="I contatti dell’assistenza saranno indicati qui prima della pubblicazione negli store." /> : null}
    </Screen>
  );
}
