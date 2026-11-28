import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { colors, radius, space } from '../theme/tokens';
import { Text } from './Text';

/*
 * Avviso compatto (restyling MINA): fondo tenue, icona e testo breve. Niente più rettangoli rossi:
 * anche l'avviso importante usa il pesca con l'icona di attenzione (il significato non dipende dal solo colore).
 * Gli errori recuperabili vanno accanto al campo (InlineError); le informazioni brevi in un toast.
 */
const tones = {
  info: { bg: colors.greenMist, fg: colors.greenDark, icon: 'information-circle-outline' as const },
  peach: { bg: colors.peachSoft, fg: colors.peachInk, icon: 'cart-outline' as const },
  warning: { bg: colors.peachSoft, fg: colors.peachInk, icon: 'warning-outline' as const },
};

export function Notice({ text, tone = 'info', title, children }: { text?: string; tone?: keyof typeof tones; title?: string; children?: ReactNode }) {
  const { t } = useT();
  const palette = tones[tone];
  const spoken = `${title ? `${title}. ` : ''}${text ?? ''}`;
  return (
    <View style={[styles.box, { backgroundColor: palette.bg }]} accessibilityRole="text" accessible={!children} accessibilityLabel={!children ? (tone === 'warning' ? t('ui:a11y.warning', { text: spoken }) : spoken) : undefined}>
      <Ionicons name={palette.icon} size={18} color={palette.fg} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <Text variant="small" color={palette.fg} style={styles.title}>
            {title}
          </Text>
        ) : null}
        {text ? (
          <Text variant="small" color={colors.ink}>
            {text}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.md },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: 2 },
  title: { fontWeight: '800' },
});
