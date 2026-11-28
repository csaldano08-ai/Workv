import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Vibration, View } from 'react-native';
import { useT } from '../i18n';
import { colors, space } from '../theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export type TimerPhase = 'idle' | 'running' | 'paused' | 'done';

/**
 * Timer di un passaggio. Usa l'orario di fine, quindi resta preciso anche se lo schermo si blocca brevemente.
 * `onPhase` avvisa quando parte, va in pausa, finisce o viene azzerato (es. per la reazione di Mina Chef).
 */
export function StepTimer({ minutes, label, onPhase }: { minutes: number; label: string; onPhase?: (p: TimerPhase) => void }) {
  const { t } = useT();
  const total = minutes * 60;
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState(total);
  const announced = useRef(false);
  const onPhaseRef = useRef(onPhase);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !announced.current) {
        announced.current = true;
        Vibration.vibrate(600);
        AccessibilityInfo.announceForAccessibility(t('ui:timer.doneAnnounce', { label }));
        setEndAt(null);
        onPhaseRef.current?.('done');
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endAt, label, t]);

  const running = endAt !== null;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <View style={styles.row}>
      <Text variant="heading" color={left === 0 ? colors.danger : colors.green} accessibilityLabel={t('ui:timer.a11y', { minutes: t('ui:timer.minutes', { count: Math.floor(left / 60) }), seconds: t('ui:timer.seconds', { count: left % 60 }) })}>
        {left === 0 ? t('ui:timer.timeUp') : `${mm}:${ss}`}
      </Text>
      <Button
        compact
        kind={running ? 'secondary' : 'primary'}
        icon={running ? 'pause' : 'play'}
        label={running ? t('ui:timer.pause') : left === total ? t('ui:timer.start', { minutes }) : left === 0 ? t('ui:timer.restart') : t('ui:timer.resume')}
        onPress={() => {
          if (running) {
            setEndAt(null);
            onPhase?.('paused');
            return;
          }
          announced.current = false;
          const base = left === 0 ? total : left;
          setLeft(base);
          setEndAt(Date.now() + base * 1000);
          onPhase?.('running');
        }}
      />
      {left !== total && !running ? (
        <Button
          compact
          kind="ghost"
          label={t('ui:timer.reset')}
          onPress={() => {
            setLeft(total);
            onPhase?.('idle');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' } });
