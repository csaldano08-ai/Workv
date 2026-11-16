import { memo, useEffect, useState } from 'react';
import { Animated, Easing, Platform, View, type ViewStyle } from 'react-native';
import RNSvg, { Circle, Path, SvgXml } from 'react-native-svg';
import { Ingredient, type IngredientKind } from './illustrations/Ingredient';
import { illo } from './illustrations/palette';
import { bloomPts, smoothD } from './motion/shapes';
import { useReducedMotion } from './useReducedMotion';

/** Decorazioni leggere e puramente grafiche (nascoste agli screen reader), nei colori di Spesora. */

const BLOB = (a: string, b: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path fill="${a}" d="M45 38c26-24 74-26 104-6 27 18 42 50 36 84-6 33-34 58-70 62-37 4-77-12-93-44-13-27-3-70 23-96z"/><path fill="${b}" opacity="0.55" d="M150 150c-11 17-34 26-55 22-22-4-40-20-43-38 18 4 34-1 51-6 18-5 36-4 47 22z"/></svg>`;

const SPRIG = (c1: string, c2: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100"><path d="M30 98 C28 70 31 40 34 6" stroke="${c1}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
  [
    [22, 76, -42],
    [40, 66, 40],
    [21, 52, -46],
    [41, 42, 44],
    [24, 28, -40],
    [37, 18, 38],
  ]
    .map(([x, y, r], i) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="3.8" fill="${i % 2 ? c2 : c1}" transform="rotate(${r} ${x} ${y})"/>`)
    .join('') +
  `</svg>`;

const DIVIDER = (c: string, d: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 14"><path d="M4 7 H66 M94 7 H156" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="73" cy="7" rx="6" ry="2.6" fill="${d}" transform="rotate(-25 73 7)"/><ellipse cx="87" cy="7" rx="6" ry="2.6" fill="${d}" transform="rotate(25 87 7)"/><circle cx="80" cy="7" r="2" fill="${c}"/></svg>`;

function Svg({ xml, width, height, style }: { xml: string; width: number; height: number; style?: ViewStyle }) {
  return (
    <View style={[{ width, height }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}

/** Forma organica morbida da mettere dietro a Mina o a un titolo. */
export const SoftBlob = memo(function SoftBlob({ size = 200, tone = 'green', style }: { size?: number; tone?: 'green' | 'peach'; style?: ViewStyle }) {
  return <Svg xml={tone === 'green' ? BLOB('#E3ECE5', '#CFE0D3') : BLOB('#F8E6D5', '#F1D3B6')} width={size} height={size} style={style} />;
});

/** Rametto decorativo. */
export const Sprig = memo(function Sprig({ height = 70, tone = 'green', style }: { height?: number; tone?: 'green' | 'peach'; style?: ViewStyle }) {
  return <Svg xml={tone === 'green' ? SPRIG('#A7C3AE', '#C5DAC4') : SPRIG('#E9BE95', '#F3D5B8')} width={(height * 60) / 100} height={height} style={style} />;
});

/** Separatore elegante con foglioline, per staccare le sezioni. */
export const OrnamentDivider = memo(function OrnamentDivider({ width = 140, style }: { width?: number; style?: ViewStyle }) {
  return <Svg xml={DIVIDER('#D3CBB8', '#A7C3AE')} width={width} height={(width * 14) / 160} style={{ alignSelf: 'center', ...style }} />;
});

const LEAF_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M3 13 C3 6 8 2 14 2 C14 9 10 14 3 13z" fill="#A7C3AE"/><path d="M3 13 C6 9 9 6 12 4" stroke="#386E55" stroke-width="1" fill="none" stroke-linecap="round"/></svg>`;

/** Piccola fogliolina per i titoli di sezione. */
export const LeafMark = memo(function LeafMark({ size = 14, style }: { size?: number; style?: ViewStyle }) {
  return <Svg xml={LEAF_MARK} width={size} height={size} style={style} />;
});

/* ---- Linguaggio dei video: fiore a petali (intro B) e ingredienti che fluttuano (caricamento C) ---- */

/** Fiore a petali dello splash, fermo o con una rotazione lentissima. Colori tenui per stare dietro ai contenuti. */
export const PetalBloom = memo(function PetalBloom({ size = 260, spin = true, soft = true, style }: { size?: number; spin?: boolean; soft?: boolean; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!spin || reduced) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [spin, reduced, v]);
  const c = 100;
  const lobesG = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2, len: i % 2 ? 46 : 56, w: 0.2 }));
  const lobesP = Array.from({ length: 9 }, (_, i) => ({ a: ((i + 0.5) / 9) * Math.PI * 2, len: 34, w: 0.17 }));
  const outer = smoothD(bloomPts(c, c, 34, lobesG, 160));
  const inner = smoothD(bloomPts(c, c, 22, lobesP, 140));
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }, style]}
    >
      <RNSvg width="100%" height="100%" viewBox="0 0 200 200">
        <Path d={outer} fill={soft ? illo.sageLight : illo.green} stroke={illo.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d={inner} fill={soft ? illo.peachSoft : illo.peach} stroke={illo.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <Circle cx={c} cy={c} r={20} fill={illo.ivory} stroke={illo.ink} strokeWidth={2.5} />
      </RNSvg>
    </Animated.View>
  );
});

/** Fa fluttuare lentamente il contenuto (su e giù, leggera rotazione). Fermo con "Riduci movimento". */
export function Floaty({ children, delay = 0, amp = 5, style }: { children: React.ReactNode; delay?: number; amp?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, delay, v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [amp, -amp] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** Piccolo gruppo di ingredienti illustrati per le intestazioni. */
export function HeaderDecor({ kinds = ['leaf', 'tomato', 'lemon'], size = 26 }: { kinds?: IngredientKind[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kinds.map((k, i) => (
        <Floaty key={k} delay={i * 350} amp={3}>
          <Ingredient kind={k} size={size} />
        </Floaty>
      ))}
    </View>
  );
}
