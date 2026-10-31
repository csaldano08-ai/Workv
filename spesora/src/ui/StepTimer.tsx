import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Vibration, View } from 'react-native';
import { colors, space } from '../theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

/** Timer di un passaggio. Usa l'orario di fine, quindi resta preciso anche se lo schermo si blocca brevemente. */
export function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const total = minutes * 60;
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState(total);
  const announced = useRef(false);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !announced.current) {
        announced.current = true;
        Vibration.vibrate(600);
        AccessibilityInfo.announceForAccessibility(`Tempo scaduto: ${label}`);
        setEndAt(null);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endAt, label]);

  const running = endAt !== null;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <View style={styles.row}>
      <Text variant="heading" color={left === 0 ? colors.danger : colors.green} accessibilityLabel={`Timer ${Math.floor(left / 60)} minuti e ${left % 60} secondi`}>
        {left === 0 ? 'Tempo!' : `${mm}:${ss}`}
      </Text>
      <Button
        compact
        kind={running ? 'secondary' : 'primary'}
        icon={running ? 'pause' : 'play'}
        label={running ? 'Pausa' : left === total ? `Avvia ${minutes} min` : left === 0 ? 'Ricomincia' : 'Riprendi'}
        onPress={() => {
          if (running) {
            setEndAt(null);
            return;
          }
          announced.current = false;
          const base = left === 0 ? total : left;
          setLeft(base);
          setEndAt(Date.now() + base * 1000);
        }}
      />
      {left !== total && !running ? (
        <Button compact kind="ghost" label="Azzera" onPress={() => setLeft(total)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' } });
