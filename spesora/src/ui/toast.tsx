import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space } from '../theme/tokens';
import { Text } from './Text';
import { useReducedMotion } from './useReducedMotion';

/*
 * Messaggi brevi (toast): conferme e informazioni che non richiedono una scelta. Compaiono in basso, sopra la barra
 * delle schede, e spariscono da soli; si chiudono anche con un tocco. Gli screen reader li leggono subito.
 * Le conferme vere (azioni distruttive o che cambiano dati) restano piccole finestre di dialogo.
 */
export type ToastTone = 'success' | 'info' | 'warning';
interface ToastMsg {
  id: number;
  text: string;
  tone: ToastTone;
}
let push: ((m: ToastMsg) => void) | null = null;
let seq = 0;

export function toast(text: string, tone: ToastTone = 'success'): void {
  const m = { id: ++seq, text, tone };
  if (push) push(m);
  else AccessibilityInfo.announceForAccessibility?.(text);
}

const native = Platform.OS !== 'web';
const TONES: Record<ToastTone, { icon: keyof typeof Ionicons.glyphMap; fg: string; bg: string }> = {
  success: { icon: 'checkmark-circle', fg: colors.white, bg: colors.greenDark },
  info: { icon: 'information-circle', fg: colors.white, bg: colors.ink },
  warning: { icon: 'alert-circle', fg: colors.ink, bg: colors.peachSoft },
};

/** Da montare una sola volta nel layout radice. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [v] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const hide = () =>
      Animated.timing(v, { toValue: 0, duration: reduced ? 1 : 160, useNativeDriver: native }).start(({ finished }) => {
        if (finished) setMsg(null);
      });
    push = (m) => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(m);
      AccessibilityInfo.announceForAccessibility?.(m.text);
      Animated.timing(v, { toValue: 1, duration: reduced ? 1 : 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: native }).start();
      // più tempo per i testi lunghi (circa 60 ms a carattere, tra 2,6 e 6 secondi)
      timer.current = setTimeout(hide, Math.min(6000, Math.max(2600, m.text.length * 60)));
    };
    return () => {
      push = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [v, reduced]);
  if (!msg) return null;
  const t = TONES[msg.tone];
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 76 }]}>
      <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Pressable onPress={() => setMsg(null)} accessibilityRole="alert" accessibilityLabel={msg.text} accessibilityHint="Tocca per chiudere" style={[styles.toast, { backgroundColor: t.bg }]}>
          <Ionicons name={t.icon} size={20} color={msg.tone === 'warning' ? colors.peachInk : t.fg} />
          <Text variant="small" color={t.fg} style={styles.text}>
            {msg.text}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', zIndex: 60 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 520, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, ...shadow.float },
  text: { flexShrink: 1, fontWeight: '700' },
});
