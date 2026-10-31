import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space, TOUCH } from '../theme/tokens';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'green' | 'peach' | 'danger';
  accessibilityHint?: string;
}

export function Chip({ label, selected, onPress, tone = 'green', accessibilityHint }: ChipProps) {
  const active = tone === 'danger' ? colors.danger : tone === 'peach' ? colors.peachInk : colors.green;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? active : colors.line, backgroundColor: selected ? active : colors.paper, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
      <Text variant="body" color={selected ? colors.white : colors.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
