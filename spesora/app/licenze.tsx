import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { useT } from '../src/i18n';

/**
 * Licenze del software e attribuzioni dei contenuti usati nell'app (registro completo in compliance/).
 * Testi: `legal:licenses.<voce>.text` (e `.title`); `name` = nome proprio del software, non tradotto.
 */
const ITEMS: { id: string; name?: string }[] = [
  { id: 'nunito' },
  { id: 'ionicons' },
  { id: 'rn', name: 'React Native, Expo, React Native SVG' },
  { id: 'zod', name: 'Zod' },
  { id: 'revenuecat', name: 'RevenueCat (react-native-purchases)' },
  { id: 'mina' },
  { id: 'images' },
];

export default function Licenses() {
  const { t } = useT();
  return (
    <Screen edges={[]}>
      <Text variant="small" color={colors.inkSoft}>
        {t('legal:referenceNote')}
      </Text>
      {ITEMS.map((i) => (
        <Card key={i.id}>
          <Text variant="heading">{i.name ?? t(`legal:licenses.${i.id}.title`)}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {t(`legal:licenses.${i.id}.text`)}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
