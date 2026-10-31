import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { minutesToHHMM } from '../core/domain/dates';
import { colors, radius, space, TOUCH } from '../theme/tokens';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}

export function Stepper({ value, onChange, min, max, step = 1, format = String, label }: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
    >
      <RoundButton icon="remove" label={`Diminuisci ${label}`} disabled={value <= min} onPress={() => onChange(clamp(value - step))} />
      <Text variant="title" style={styles.value}>
        {format(value)}
      </Text>
      <RoundButton icon="add" label={`Aumenta ${label}`} disabled={value >= max} onPress={() => onChange(clamp(value + step))} />
    </View>
  );
}

export function TimeStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return <Stepper value={value} onChange={onChange} min={0} max={1425} step={15} format={minutesToHHMM} label={label} />;
}

function RoundButton({ icon, label, onPress, disabled }: { icon: 'add' | 'remove'; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.round, { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={colors.green} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  value: { minWidth: 72, textAlign: 'center' },
  round: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
