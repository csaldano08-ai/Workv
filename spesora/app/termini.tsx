import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { useT } from '../src/i18n';

/*
 * Termini e abbonamento: testo su pagina intera, raggiungibile dalla schermata dell'abbonamento e dal Profilo
 * anche quando l'abbonamento è obbligatorio. I termini definitivi vanno pubblicati prima della distribuzione
 * (app.json → extra.legal.termsUrl): finché manca l'indirizzo, qui ci sono le condizioni dell'abbonamento.
 * Testi: `legal:terms.<sezione>.title` / `.text`; la versione italiana è quella di riferimento.
 */
const SECTIONS = ['status', 'price', 'renewal', 'cancel', 'restore', 'data'] as const;

export default function Terms() {
  const { t } = useT();
  return (
    <Screen edges={[]}>
      <Text variant="small" color={colors.inkSoft}>
        {t('legal:referenceNote')}
      </Text>
      {SECTIONS.map((s) => (
        <Card key={s}>
          <Text variant="heading">{t(`legal:terms.${s}.title`)}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {t(`legal:terms.${s}.text`)}
          </Text>
        </Card>
      ))}
      <Text variant="small" color={colors.inkSoft}>
        {t('legal:terms.footer')}
      </Text>
    </Screen>
  );
}
