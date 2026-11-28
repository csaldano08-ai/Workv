import { Linking } from 'react-native';
import { appConfig } from '../src/core/config';
import { colors } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { InfoNote } from '../src/ui/mina/kit';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { useT } from '../src/i18n';

/*
 * Aiuto e supporto: risposte brevi alle domande pratiche e i contatti (solo se configurati in
 * app.json → extra.legal; nessun contatto inventato). Nessuna diagnostica viene inviata da qui.
 */
/** Domande frequenti: chiavi `profile:help.faqN.q` / `.a`. */
const FAQ = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'] as const;

export default function Help() {
  const { t } = useT();
  const email = appConfig.legal.supportEmail;
  const url = appConfig.legal.supportUrl;
  return (
    <Screen edges={[]}>
      {FAQ.map((f) => (
        <Card key={f}>
          <Text variant="heading">{t(`profile:help.${f}.q`)}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {t(`profile:help.${f}.a`)}
          </Text>
        </Card>
      ))}
      {email ? <Button kind="secondary" icon="mail-outline" label={t('profile:help.email')} onPress={() => void Linking.openURL(`mailto:${email}`)} /> : null}
      {url ? <Button kind="secondary" icon="open-outline" label={t('profile:help.supportPage')} onPress={() => void Linking.openURL(url)} /> : null}
      {!email && !url ? <InfoNote text={t('profile:help.noContacts')} /> : null}
    </Screen>
  );
}
