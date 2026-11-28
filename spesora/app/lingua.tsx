import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useT } from '../src/i18n';
import { colors, space } from '../src/theme/tokens';
import { InfoNote } from '../src/ui/mina/kit';
import { LanguagePicker } from '../src/ui/mina/LanguagePicker';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

/**
 * Profilo → Lingua. Cambiare lingua aggiorna subito l'interfaccia e la salva sul telefono:
 * piano, ricette salvate, spesa, dispensa, preferenze e abbonamento non cambiano.
 */
export default function LanguageScreen() {
  const { t } = useT();
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('language:settingsTitle') }} />
      <View style={styles.body}>
        <Text variant="body" color={colors.inkSoft}>
          {t('language:settingsIntro')}
        </Text>
        <LanguagePicker />
        <InfoNote text={t('language:contentNote')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
});
