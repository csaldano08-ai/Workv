import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, TOUCH } from '../theme/tokens';
import { Squish } from './Squish';
import { Text } from './Text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'peach';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: Kind;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icona dopo l'etichetta (es. la freccia «→» dei pulsanti principali del riferimento). */
  iconRight?: keyof typeof Ionicons.glyphMap;
  /** `large`: pulsante principale a tutta larghezza (stesso stile, solo più alto e con testo più grande). */
  size?: 'regular' | 'large';
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Solo impaginazione del contenitore esterno (es. `flex: 1` in una riga): non cambia l'aspetto del pulsante. */
  outerStyle?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** `border` = bordo sottile, `base` = bordo inferiore più spesso: il pulsante sembra in rilievo e si schiaccia al tocco. */
const palette: Record<Kind, { bg: string; fg: string; border: string; base: string }> = {
  primary: { bg: colors.green, fg: colors.white, border: colors.green, base: colors.greenDeep },
  secondary: { bg: colors.white, fg: colors.green, border: colors.lineStrong, base: colors.lineStrong },
  ghost: { bg: 'transparent', fg: colors.green, border: 'transparent', base: 'transparent' },
  danger: { bg: colors.white, fg: colors.danger, border: colors.danger, base: colors.danger },
  peach: { bg: colors.peach, fg: colors.ink, border: colors.peach, base: '#E8894F' },
};

/**
 * Pulsante arrotondato in leggero rilievo, che si schiaccia elasticamente al tocco.
 * È lo stile dei pulsanti dell'app e resta tale anche nel restyling MINA (niente pulsanti lucidi o sfumati):
 * del riferimento si adattano solo dimensioni, posizione, spaziature, colori e la freccia finale.
 */
export function Button({ label, onPress, kind = 'primary', icon, iconRight, size = 'regular', disabled, loading, compact, style, outerStyle, accessibilityHint }: ButtonProps) {
  const p = palette[kind];
  const inactive = disabled || loading;
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      outerStyle={outerStyle}
      style={[
        styles.base,
        compact && styles.compact,
        size === 'large' && !compact && styles.large,
        kind === 'ghost' ? styles.ghost : null,
        { backgroundColor: p.bg, borderColor: p.border, borderBottomColor: p.base, opacity: inactive ? 0.45 : 1 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={p.fg} /> : icon ? <Ionicons name={icon} size={18} color={p.fg} /> : null}
        <Text variant="heading" color={p.fg} style={[styles.label, size === 'large' && styles.labelLarge, { fontWeight: '800' }]}>
          {label}
        </Text>
        {iconRight && !loading ? <Ionicons name={iconRight} size={size === 'large' ? 22 : 19} color={p.fg} /> : null}
      </View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH + 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    justifyContent: 'center',
  },
  ghost: { borderWidth: 0, borderBottomWidth: 0 },
  compact: { minHeight: TOUCH, paddingHorizontal: space.lg, paddingVertical: space.sm },
  large: { minHeight: 58, paddingVertical: 14 },
  labelLarge: { fontSize: 18, lineHeight: 23 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  label: { textAlign: 'center', flexShrink: 1 },
});
