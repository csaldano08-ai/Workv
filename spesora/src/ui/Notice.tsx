import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme/tokens';
import { Text } from './Text';

const tones = {
  info: { bg: colors.greenSoft, fg: colors.greenDark, icon: 'information-circle-outline' as const },
  peach: { bg: colors.peachSoft, fg: colors.peachInk, icon: 'cart-outline' as const },
  warning: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle-outline' as const },
};

export function Notice({ text, tone = 'info', title, children }: { text?: string; tone?: keyof typeof tones; title?: string; children?: React.ReactNode }) {
  const t = tones[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg }]} accessibilityRole="text">
      <Ionicons name={t.icon} size={20} color={t.fg} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <Text variant="heading" color={t.fg}>
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
  box: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: space.xs },
});
