import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, TOUCH } from '../theme/tokens';
import { Text } from './Text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'peach';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: Kind;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const palette: Record<Kind, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.green, fg: colors.white, border: colors.green },
  secondary: { bg: colors.paper, fg: colors.green, border: colors.green },
  ghost: { bg: 'transparent', fg: colors.green, border: 'transparent' },
  danger: { bg: colors.paper, fg: colors.danger, border: colors.danger },
  peach: { bg: colors.peach, fg: colors.ink, border: colors.peach },
};

export function Button({ label, onPress, kind = 'primary', icon, disabled, loading, compact, style, accessibilityHint }: ButtonProps) {
  const p = palette[kind];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: p.bg, borderColor: p.border, opacity: inactive ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={p.fg} /> : icon ? <Ionicons name={icon} size={18} color={p.fg} /> : null}
        <Text variant="heading" color={p.fg} style={styles.label}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH + 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    justifyContent: 'center',
  },
  compact: { minHeight: TOUCH, paddingHorizontal: space.lg, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  label: { textAlign: 'center', flexShrink: 1 },
});
