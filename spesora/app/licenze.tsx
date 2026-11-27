import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/** Licenze del software e attribuzioni dei contenuti usati nell'app (registro completo in compliance/). */
const ITEMS = [
  { title: 'Carattere Nunito', text: 'SIL Open Font License 1.1 (testo della licenza incluso nell’app: assets/fonts/Nunito-OFL.txt).' },
  { title: 'Icone Ionicons', text: 'Licenza MIT, tramite @expo/vector-icons.' },
  { title: 'React Native, Expo, React Native SVG', text: 'Licenza MIT.' },
  { title: 'Zod', text: 'Licenza MIT.' },
  { title: 'RevenueCat (react-native-purchases)', text: 'Licenza MIT. Usato solo quando gli abbonamenti saranno attivi.' },
  { title: 'Mina, Mina Chef e logo', text: 'Disegni originali realizzati per l’app, nel codice sorgente.' },
  { title: 'Illustrazioni delle ricette', text: 'Generate per l’app; provenienza e condizioni d’uso documentate nel registro delle immagini del progetto.' },
];

export default function Licenses() {
  return (
    <Screen edges={[]}>
      {ITEMS.map((i) => (
        <Card key={i.title}>
          <Text variant="heading">{i.title}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {i.text}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
