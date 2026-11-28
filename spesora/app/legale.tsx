import { appConfig } from '../src/core/config';
import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { InfoNote } from '../src/ui/mina/kit';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { useT } from '../src/i18n';

/*
 * Informazioni legali: chi pubblica e fornisce il servizio. I dati arrivano da app.json → extra.legal.publisher
 * e non vengono mai inventati: finché mancano, la pagina dice che vanno completati prima della pubblicazione.
 */
export default function Legal() {
  const { t } = useT();
  const pub = appConfig.legal.publisher;
  return (
    <Screen edges={[]}>
      <Text variant="small" color={colors.inkSoft}>
        {t('legal:referenceNote')}
      </Text>
      <Card>
        <Text variant="heading">{t('legal:legal.provider.title')}</Text>
        {pub ? (
          <Text variant="body" color={colors.inkSoft}>
            {pub}
          </Text>
        ) : (
          <InfoNote tone="warning" text={t('legal:legal.provider.missing')} />
        )}
      </Card>
      <Card>
        <Text variant="heading">{t('legal:legal.nature.title')}</Text>
        <Text variant="body" color={colors.inkSoft}>
          {t('legal:legal.nature.text')}
        </Text>
      </Card>
    </Screen>
  );
}
