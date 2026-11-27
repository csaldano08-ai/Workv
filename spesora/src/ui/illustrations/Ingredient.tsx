import { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { smoothD, superPts } from '../motion/shapes';
import { illo } from './palette';

/**
 * Ingredienti illustrati nello stile dell'intro: forme morbide, contorno scuro, palette di Mina.
 * Disegnati in un riquadro di 100 unità centrato in 0 (viewBox con margine per il contorno).
 */
export const INGREDIENT_KINDS = ['tomato', 'leaf', 'carrot', 'lemon', 'mushroom', 'peas'] as const;
export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

const SW = 4.5; // contorno
const TOMATO_BODY = smoothD(superPts(0, 4, 48, 42, 2.3, 48));

function Tomato() {
  const leaves = [0, 1, 2, 3, 4].map((i) => {
    const a = -Math.PI / 2 + (i - 2) * 0.55;
    const ex = Math.cos(a) * 22;
    const ey = -33 + Math.sin(a + Math.PI / 2) * 5;
    return `M0 -33 Q${(Math.cos(a) * 12).toFixed(1)} ${(-33 + Math.sin(a) * 2 - 4).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  });
  return (
    <G>
      <Path d={TOMATO_BODY} fill={illo.tomato} stroke={illo.ink} strokeWidth={SW} strokeLinejoin="round" />
      <Ellipse cx={-18} cy={-6} rx={10} ry={6} fill="#FFFFFF" opacity={0.35} transform="rotate(-34 -18 -6)" />
      <Path d={leaves.join(' ')} stroke={illo.green} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Line x1={0} y1={-33} x2={3} y2={-47} stroke={illo.ink} strokeWidth={5} strokeLinecap="round" />
    </G>
  );
}

function Carrot() {
  const tops = ([[-0.09, 0.26], [0, 0.32], [0.09, 0.24]] as const)
    .map(([dx, h]) => `M${dx * 60} -31 Q${dx * 220} ${-31 - h * 60} ${dx * 160} ${-31 - h * 100}`)
    .join(' ');
  return (
    <G>
      <Path d="M-20 -28 Q0 -36 20 -28 Q12 20 0 50 Q-12 20 -20 -28 Z" fill={illo.carrot} stroke={illo.ink} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M-10 -5 L3 -5 M-4 15 L7 15" stroke={illo.ink} strokeWidth={3} strokeLinecap="round" />
      <Path d={tops} stroke={illo.green} strokeWidth={8} strokeLinecap="round" fill="none" />
    </G>
  );
}

function Leaf() {
  const veins = [18, -2, -20].map((y) => `M0 ${y + 4} L17 ${y - 8} M0 ${y + 4} L-17 ${y - 8}`).join(' ');
  return (
    <G>
      <Path d="M0 48 C42 20 36 -32 0 -48 C-36 -32 -42 20 0 48 Z" fill={illo.greenMid} stroke={illo.ink} strokeWidth={SW} strokeLinejoin="round" />
      <Path d={`M0 42 L0 -36 ${veins}`} stroke={illo.sageLight} strokeWidth={3.5} strokeLinecap="round" />
    </G>
  );
}

function Lemon() {
  const seg = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return `M${(Math.cos(a) * 5).toFixed(1)} ${(Math.sin(a) * 5).toFixed(1)} L${(Math.cos(a) * 33).toFixed(1)} ${(Math.sin(a) * 33).toFixed(1)}`;
  }).join(' ');
  return (
    <G>
      <Circle r={46} fill={illo.lemon} stroke={illo.ink} strokeWidth={SW} />
      <Circle r={36} fill={illo.lemonLight} />
      <Path d={seg} stroke={illo.lemon} strokeWidth={4.5} strokeLinecap="round" />
    </G>
  );
}

function Mushroom() {
  return (
    <G>
      <Rect x={-12} y={-2} width={24} height={46} rx={10} fill={illo.paper} stroke={illo.ink} strokeWidth={SW} />
      <Path d="M-46 4 C-46 -50 46 -50 46 4 Q0 -6 -46 4 Z" fill={illo.mushroom} stroke={illo.ink} strokeWidth={SW} strokeLinejoin="round" />
      <Circle cx={-18} cy={-18} r={6} fill={illo.peachLight} />
      <Circle cx={12} cy={-24} r={5} fill={illo.peachLight} />
      <Circle cx={24} cy={-6} r={4} fill={illo.peachLight} />
    </G>
  );
}

function Peas() {
  return (
    <G>
      <Path d="M-48 10 C-30 -38 30 -38 48 6 C26 20 -26 24 -48 10 Z" fill={illo.greenMid} stroke={illo.ink} strokeWidth={SW} strokeLinejoin="round" />
      {[-22, 0, 22].map((x) => (
        <Circle key={x} cx={x} cy={-3} r={10} fill={illo.sage} stroke={illo.ink} strokeWidth={2.7} />
      ))}
    </G>
  );
}

const DRAW: Record<IngredientKind, () => React.ReactElement> = { tomato: Tomato, leaf: Leaf, carrot: Carrot, lemon: Lemon, mushroom: Mushroom, peas: Peas };

/** Ingrediente illustrato (decorativo: nascosto agli screen reader). */
export const Ingredient = memo(function Ingredient({ kind, size = 56, style }: { kind: IngredientKind; size?: number; style?: ViewStyle }) {
  const Draw = DRAW[kind];
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="-56 -56 112 112">
        <Draw />
      </Svg>
    </View>
  );
});
