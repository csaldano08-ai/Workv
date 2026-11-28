import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { InfoNote } from '../src/ui/mina/kit';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { useT } from '../src/i18n';

/*
 * Privacy e dati: testo legale su una pagina intera (non in un popup). Ogni frase descrive ciò che il codice fa
 * davvero (verificato: nessuna chiamata di rete nell'app, nessun SDK di analisi o pubblicità, notifiche locali).
 * Testi: `legal:privacy.<sezione>.title` / `.text`; la versione italiana è quella di riferimento.
 */
const SECTIONS = ['where', 'allergies', 'tracking', 'notifications', 'backup', 'export', 'subscription'] as const;

export default function Privacy() {
  const { t } = useT();
  return (
    <Screen edges={[]}>
      <Text variant="small" color={colors.inkSoft}>
        {t('legal:referenceNote')}
      </Text>
      {SECTIONS.map((s) => (
        <Card key={s}>
          <Text variant="heading">{t(`legal:privacy.${s}.title`)}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {t(`legal:privacy.${s}.text`)}
          </Text>
        </Card>
      ))}
      <InfoNote tone="warning" text={t('allergen.disclaimer')} />
      <Text variant="small" color={colors.inkSoft}>
        {t('legal:privacy.footer')}
      </Text>
    </Screen>
  );
}
