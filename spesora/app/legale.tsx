import { appConfig } from '../src/core/config';
import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { InfoNote } from '../src/ui/mina/kit';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/*
 * Informazioni legali: chi pubblica e fornisce il servizio. I dati arrivano da app.json → extra.legal.publisher
 * e non vengono mai inventati: finché mancano, la pagina dice che vanno completati prima della pubblicazione.
 */
export default function Legal() {
  const pub = appConfig.legal.publisher;
  return (
    <Screen edges={[]}>
      <Card>
        <Text variant="heading">Chi fornisce Mina</Text>
        {pub ? (
          <Text variant="body" color={colors.inkSoft}>
            {pub}
          </Text>
        ) : (
          <InfoNote tone="warning" text="Da completare prima della pubblicazione: nome o ragione sociale, indirizzo, email e telefono di contatto (per la vendita nell’Unione europea gli store li mostrano anche nella pagina dell’app)." />
        )}
      </Card>
      <Card>
        <Text variant="heading">Natura del servizio</Text>
        <Text variant="body" color={colors.inkSoft}>
          Mina aiuta a pianificare pasti, ricette, spesa e dispensa. Non è un dispositivo medico e non fornisce indicazioni dietetiche, nutrizionali o terapeutiche.
        </Text>
      </Card>
    </Screen>
  );
}
