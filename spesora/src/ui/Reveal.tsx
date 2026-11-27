import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

/**
 * Da dove arriva l'elemento:
 * - `bottom`: sale di poco con un piccolo rimbalzo finale (come i gesti di Mina), il caso normale;
 * - `left` / `right`: scivola dal lato (cambio di giorno o di passo, nella direzione del movimento);
 * - `zoom`: si posa con una leggera riduzione (foto della ricetta che «si appoggia»);
 * - `pop`: sboccia da più piccolo con un rimbalzo (festeggiamenti, nuvolette di Mina);
 * - `sheet`: sale dal basso di più (fogli di azioni).
 */
export type RevealFrom = 'bottom' | 'left' | 'right' | 'zoom' | 'pop' | 'sheet';

/** Ritardo massimo della cascata: oltre il settimo elemento entrano tutti insieme (la pagina non «aspetta»). */
const MAX_STAGGER = 7;

function transformFor(from: RevealFrom, v: Animated.Value) {
  const move = (a: number) => v.interpolate({ inputRange: [0, 1], outputRange: [a, 0] });
  switch (from) {
    case 'left':
      return [{ translateX: move(-18) }];
    case 'right':
      return [{ translateX: move(18) }];
    case 'zoom':
      return [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.045, 1] }) }];
    case 'pop':
      return [{ translateY: move(14) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }];
    case 'sheet':
      return [{ translateY: move(48) }];
    default:
      return [{ translateY: move(12) }];
  }
}

/**
 * Comparsa morbida: dissolvenza più movimento breve con un piccolo rimbalzo (lo stesso «back» dei gesti di Mina).
 * `index` scagliona gli elementi di una schermata (55 ms l'uno), `delay` aggiunge un ritardo fisso.
 * Con "Riduci movimento" l'elemento è subito al suo posto. Gira sul driver nativo.
 */
export function Reveal({
  children,
  index = 0,
  delay = 0,
  from = 'bottom',
  style,
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  from?: RevealFrom;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const pop = from === 'pop';
    const a = pop
      ? Animated.spring(v, { toValue: 1, friction: 6, tension: 120, delay: delay + Math.min(index, MAX_STAGGER) * 55, useNativeDriver: native })
      : Animated.timing(v, {
          toValue: 1,
          duration: from === 'zoom' ? motion.slow + 60 : 320,
          delay: delay + Math.min(index, MAX_STAGGER) * 55,
          // il «back» supera di poco l'arrivo e torna: l'elemento si posa come Mina dopo un gesto
          easing: from === 'zoom' ? Easing.out(Easing.cubic) : Easing.out(Easing.back(1.25)),
          useNativeDriver: native,
        });
    a.start();
    return () => a.stop();
  }, [reduced, index, delay, from, v]);
  // l'opacità arriva a 1 a metà corsa e non risente del rimbalzo; i blocchi della pagina partono già un poco
  // visibili (la pagina non resta mai vuota mentre la scheda cambia), festeggiamenti e nuvolette dal nulla
  const start = from === 'pop' ? 0 : 0.2;
  const opacity = v.interpolate({ inputRange: [0, 0.55, 1], outputRange: [start, 1, 1], extrapolate: 'clamp' });
  return <Animated.View style={[style, { opacity, transform: transformFor(from, v) }]}>{children}</Animated.View>;
}
