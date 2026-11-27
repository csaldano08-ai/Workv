import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, type ColorValue } from 'react-native';
import { NavGlyph, type NavGlyphName } from './mina/NavGlyph';
import { useReducedMotion } from './useReducedMotion';

const native = Platform.OS !== 'web';

type IconName = keyof typeof Ionicons.glyphMap;

/*
 * La barra disegna due copie di ogni icona (attiva e inattiva) e le alterna con l'opacità: l'icona non vede
 * cambiare `focused`. Il saltello parte quindi dal tocco sulla scheda, annunciato dal layout con `hopTab`.
 */
const listeners = new Set<(route: string) => void>();
export function hopTab(route: string) {
  listeners.forEach((l) => l(route));
}

/**
 * Icona della barra delle schede: piena quando la scheda è attiva; al tocco fa un saltello
 * (si alza, si allunga appena e ricade con un rimbalzo, come Mina). Ferma con "Riduci movimento".
 */
export function TabIcon({ name, glyph, route, focused, color, size }: { name?: IconName; glyph?: NavGlyphName; route: string; focused: boolean; color: ColorValue | null; size: number }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    let running: Animated.CompositeAnimation | null = null;
    const hop = (r: string) => {
      if (r !== route) return;
      running?.stop();
      v.setValue(0);
      running = Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.spring(v, { toValue: 0, friction: 4.5, tension: 220, useNativeDriver: native }),
      ]);
      running.start();
    };
    listeners.add(hop);
    return () => {
      listeners.delete(hop);
      running?.stop();
    };
  }, [reduced, route, v]);
  // icona piena quando la scheda è attiva (le icone di Ionicons hanno la variante «-outline»)
  const shown = (focused ? (name ?? 'ellipse-outline').replace(/-outline$/, '') : (name ?? 'ellipse-outline')) as IconName;
  const tint = typeof color === 'string' ? color : '#000000';
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [-0.3, 0, 1], outputRange: [1, 0, -5] }) },
          { scaleY: v.interpolate({ inputRange: [-0.3, 0, 1], outputRange: [0.94, 1, 1.08] }) },
          { scaleX: v.interpolate({ inputRange: [-0.3, 0, 1], outputRange: [1.05, 1, 0.95] }) },
        ],
      }}
    >
      {glyph ? <NavGlyph name={glyph} focused={focused} color={tint} size={size + 2} /> : <Ionicons name={shown} color={tint} size={size} />}
    </Animated.View>
  );
}
