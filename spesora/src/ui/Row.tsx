import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, space, TOUCH } from '../theme/tokens';
import { LeafMark } from './Decor';
import { Text } from './Text';

export interface RowProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityHint?: string;
}

/** Riga di elenco; mostra la freccia solo se è realmente toccabile. */
export function Row({ title, subtitle, right, onPress, icon, accessibilityHint }: RowProps) {
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={22} color={colors.green} /> : null}
      <View style={styles.text}>
        <Text variant="body">{title}</Text>
        {subtitle ? (
          <Text variant="small" color={colors.inkSoft}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <LeafMark />
      <Text variant="caption" color={colors.inkSoft} accessibilityRole="header" style={styles.sectionText}>
        {children.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: TOUCH + 8, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  text: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: colors.line },
  section: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  sectionText: { flex: 1 },
});
