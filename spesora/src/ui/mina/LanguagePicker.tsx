import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { setLanguage, useLanguage, useT } from '../../i18n';
import { SUPPORTED, type LanguageCode } from '../../i18n/languages';
import { colors, radius, shadow, space } from '../../theme/tokens';
import { Squish } from '../Squish';
import { Text } from '../Text';

/**
 * Elenco delle lingue nello stile del questionario: righe a tutta larghezza, nome nella lingua stessa,
 * scelta con bordo verde e spunta. Toccare una lingua la applica subito e la salva sul telefono.
 * Usato nel primo passo del questionario e in Profilo → Lingua.
 */
export function LanguagePicker({ onChange }: { onChange?: (code: LanguageCode) => void }) {
  const current = useLanguage();
  const { t } = useT();
  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t('language:title')}>
      {SUPPORTED.map((l) => {
        const on = l.code === current;
        return (
          <Squish
            key={l.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={l.nativeName}
            accessibilityLanguage={l.code}
            onPress={() => {
              void setLanguage(l.code).then(() => onChange?.(l.code));
            }}
            style={[styles.row, on ? styles.rowOn : styles.rowOff]}
          >
            <View style={[styles.code, on && styles.codeOn]}>
              <Text variant="small" color={on ? colors.white : colors.greenDark} style={styles.codeText}>
                {l.code === 'pt-BR' ? 'PT' : l.code.toUpperCase()}
              </Text>
            </View>
            <Text variant="heading" style={styles.name}>
              {l.nativeName}
            </Text>
            {on ? <Ionicons name="checkmark-circle" size={26} color={colors.green} /> : <View style={styles.dot} />}
          </Squish>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: colors.card },
  rowOff: { borderWidth: 1.5, borderColor: colors.line, ...shadow.card },
  rowOn: { borderWidth: 2.5, borderColor: colors.green, backgroundColor: colors.greenMist, ...shadow.card },
  code: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  codeOn: { backgroundColor: colors.green },
  codeText: { fontWeight: '800', letterSpacing: 0.5 },
  name: { flex: 1, fontSize: 18, fontWeight: '700' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.lineStrong },
});
