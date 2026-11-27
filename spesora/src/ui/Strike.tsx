import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/**
 * Testo barrato «a mano»: quando l'elemento va nel carrello la riga si disegna da sinistra a destra sopra il nome.
 * Il figlio è una funzione che riceve `wrapped`: se il testo va a capo su più righe la riga animata non basta,
 * e il figlio usa il barrato normale del testo. Con "Riduci movimento" la riga compare subito.
 */
export function Strike({ on, children }: { on: boolean; children: (wrapped: boolean) => React.ReactNode }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(on ? 1 : 0));
  const [wrapped, setWrapped] = useState(false);
  useEffect(() => {
    if (reduced) {
      v.setValue(on ? 1 : 0);
      return;
    }
    const a = Animated.timing(v, { toValue: on ? 1 : 0, duration: on ? 280 : 160, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [on, reduced, v]);
  return (
    <View style={styles.wrap} onLayout={(e) => setWrapped(e.nativeEvent.layout.height > 34)}>
      {children(wrapped)}
      {wrapped ? null : <Animated.View pointerEvents="none" style={[styles.line, { transform: [{ scaleX: v }] }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', maxWidth: '100%' },
  line: { position: 'absolute', left: -2, right: -2, top: '50%', height: 2, marginTop: -0.5, borderRadius: 1, backgroundColor: colors.inkSoft, transformOrigin: 'left' },
});
