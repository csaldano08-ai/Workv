import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { Squish } from './Squish';
import { colors, outline, radius, space, TOUCH } from '../theme/tokens';
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
    <Squish
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? active : colors.paper }]}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
      <Text variant="body" color={selected ? colors.white : colors.ink}>
        {label}
      </Text>
    </Squish>
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
    borderWidth: outline.thin,
    borderColor: outline.color,
  },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
