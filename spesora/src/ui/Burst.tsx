import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

type Kind = 'leaf' | 'spark' | 'dot' | 'confetti';
const KINDS: Kind[] = ['leaf', 'spark', 'dot', 'confetti', 'leaf', 'spark', 'confetti', 'dot', 'leaf', 'spark', 'confetti', 'dot'];

function Piece({ kind, color }: { kind: Kind; color: string }) {
  return (
    <Svg width={14} height={14} viewBox="-7 -7 14 14">
      {kind === 'leaf' ? <Path d="M-6,4 C-5,-3 1,-6.5 6.5,-5.5 C5.5,1.5 -1,6 -6,4 Z" fill={color} /> : null}
      {kind === 'spark' ? <Path d="M0,-6.5 Q1.1,-1.1 6.5,0 Q1.1,1.1 0,6.5 Q-1.1,1.1 -6.5,0 Q-1.1,-1.1 0,-6.5 Z" fill={color} /> : null}
      {kind === 'dot' ? <Circle r={3.4} fill={color} /> : null}
      {kind === 'confetti' ? <Path d="M-4.5,-2 L4.5,-2 L4.5,2 L-4.5,2 Z" fill={color} /> : null}
    </Svg>
  );
}

/**
 * Piccola festa grafica attorno a Mina (lista completata): foglioline, scintille e coriandoli partono dal centro,
 * ruotano, ricadono appena e svaniscono. Una sola volta per `play` (quando cambia, riparte). Sul driver nativo,
 * nessun ciclo; con "Riduci movimento" non c'è.
 */
export function Burst({ play, size = 180, style }: { play: string | number | undefined; size?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (play === undefined || reduced) return;
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [play, reduced, v]);
  if (play === undefined || reduced) return null;
  const palette = [colors.greenBright, '#F6C343', colors.peach, '#8DC63F'];
  const r = size / 2;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {KINDS.map((kind, i) => {
        const ang = (i / KINDS.length) * Math.PI * 2 + (i % 2 ? 0.18 : -0.1);
        const dist = r * (i % 3 === 0 ? 0.95 : i % 3 === 1 ? 0.78 : 0.62);
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist;
        const spin = (i % 2 ? 1 : -1) * (160 + i * 25);
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                left: r - 7,
                top: r - 7,
                opacity: v.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                  // esce veloce e ricade appena (un filo di gravità)
                  { translateY: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, dy * 0.92, dy + 9] }) },
                  { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] }) },
                  { scale: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1.15, 0.85] }) },
                ],
              },
            ]}
          >
            <Piece kind={kind} color={palette[i % palette.length]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ piece: { position: 'absolute', width: 14, height: 14 } });
