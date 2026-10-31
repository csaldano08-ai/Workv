import { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { DishCategory } from '../core/domain/types';
import { hashString } from '../core/domain/random';
import { colors } from '../theme/tokens';

/**
 * Illustrazione originale vettoriale usata quando la ricetta non ha una foto con diritti verificati.
 * Leggera (nessun file immagine), diversa per categoria e stabile per ricetta.
 */

const BACKGROUNDS: Record<DishCategory, string> = {
  pasta: '#F3E3C3',
  riso: '#EFE8D6',
  cereali: '#EDE3CC',
  legumi: '#EADCC4',
  carne: '#F1D9CC',
  pesce: '#D9E6E4',
  uova: '#F6EBC8',
  verdure: '#DCE8D6',
  zuppa: '#F0DCC8',
  pane: '#F1E2CB',
  colazione_dolce: '#F7E4D6',
  colazione_salata: '#E9E6D5',
  frutta: '#F5DCD2',
};

function Topping({ category, seed }: { category: DishCategory; seed: number }) {
  const rot = (seed % 40) - 20;
  switch (category) {
    case 'pasta':
      return (
        <G transform={`rotate(${rot} 100 100)`} fill="none" stroke="#E2B860" strokeWidth={5} strokeLinecap="round">
          <Path d="M70 90 q10 -12 20 0 t20 0 t20 0" />
          <Path d="M66 104 q10 -12 20 0 t20 0 t20 0 t10 0" />
          <Path d="M72 118 q10 -12 20 0 t20 0 t20 0" />
          <Circle cx="88" cy="96" r="5" fill="#C8553D" stroke="none" />
          <Circle cx="114" cy="112" r="5" fill="#C8553D" stroke="none" />
          <Path d="M100 86 l6 -4" stroke={colors.green} strokeWidth={4} />
        </G>
      );
    case 'riso':
    case 'cereali':
      return (
        <G transform={`rotate(${rot} 100 100)`}>
          {Array.from({ length: 22 }, (_, i) => {
            const a = (i * 137.5 * Math.PI) / 180;
            const r = 6 + (i % 7) * 4.5;
            return <Ellipse key={i} cx={100 + Math.cos(a) * r} cy={100 + Math.sin(a) * r} rx={4} ry={2} fill={category === 'riso' ? '#F7F2E4' : '#D7B77A'} transform={`rotate(${i * 31} ${100 + Math.cos(a) * r} ${100 + Math.sin(a) * r})`} />;
          })}
          <Circle cx="112" cy="92" r="5" fill={colors.green} />
          <Circle cx="90" cy="110" r="4" fill={colors.peach} />
        </G>
      );
    case 'legumi':
      return (
        <G>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * 137.5 * Math.PI) / 180;
            const r = 5 + (i % 5) * 6;
            return <Circle key={i} cx={100 + Math.cos(a) * r} cy={100 + Math.sin(a) * r} r={5} fill={i % 3 === 0 ? '#B5793E' : '#D8B36A'} />;
          })}
          <Path d="M84 84 q8 -8 16 0" stroke={colors.green} strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'carne':
      return (
        <G transform={`rotate(${rot} 100 100)`}>
          <Ellipse cx="96" cy="100" rx="30" ry="20" fill="#B5674A" />
          <Path d="M76 96 q20 -10 40 0" stroke="#E7B49A" strokeWidth={3} fill="none" />
          <Circle cx="124" cy="116" r="6" fill={colors.green} />
          <Circle cx="132" cy="106" r="5" fill="#8DB580" />
        </G>
      );
    case 'pesce':
      return (
        <G transform={`rotate(${rot} 100 100)`}>
          <Path d="M66 100 q34 -26 64 0 q-30 26 -64 0 z" fill="#E59A7A" />
          <Path d="M130 100 l14 -10 v20 z" fill="#E59A7A" />
          <Path d="M84 92 q6 8 0 16 M98 90 q6 10 0 20" stroke="#F6C9B5" strokeWidth={3} fill="none" />
          <Path d="M96 122 l10 -4" stroke="#E8D46A" strokeWidth={5} strokeLinecap="round" />
        </G>
      );
    case 'uova':
      return (
        <G>
          <Path d="M72 100 q0 -26 28 -26 q30 0 28 24 q-2 28 -30 26 q-26 -2 -26 -24 z" fill="#FFFDF8" />
          <Circle cx="100" cy="100" r="13" fill="#F2B33D" />
          <Circle cx="80" cy="84" r="3" fill={colors.green} />
          <Circle cx="120" cy="116" r="3" fill={colors.green} />
        </G>
      );
    case 'zuppa':
      return (
        <G>
          <Circle cx="100" cy="100" r="34" fill="#D98E4C" />
          <Circle cx="88" cy="94" r="5" fill="#F3D9A8" />
          <Circle cx="110" cy="108" r="6" fill="#F3D9A8" />
          <Circle cx="104" cy="88" r="4" fill={colors.green} />
          <Path d="M80 112 q8 -4 14 2" stroke="#F6E1C3" strokeWidth={3} fill="none" />
        </G>
      );
    case 'pane':
      return (
        <G transform={`rotate(${rot} 100 100)`}>
          <Rect x="70" y="80" width="60" height="40" rx="18" fill="#D9A15D" />
          <Path d="M84 86 l-6 28 M100 84 l-6 32 M116 86 l-6 28" stroke="#F1D4A0" strokeWidth={3} />
          <Circle cx="132" cy="122" r="6" fill="#C8553D" />
        </G>
      );
    case 'colazione_dolce':
      return (
        <G>
          <Circle cx="100" cy="100" r="30" fill="#F7F0E0" />
          <Circle cx="92" cy="94" r="7" fill="#C84A52" />
          <Circle cx="108" cy="104" r="6" fill="#6B4AA0" />
          <Circle cx="102" cy="88" r="5" fill="#E6A46D" />
          <Path d="M84 110 q16 8 32 0" stroke="#D7B77A" strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'colazione_salata':
      return (
        <G transform={`rotate(${rot} 100 100)`}>
          <Rect x="72" y="80" width="56" height="40" rx="8" fill="#D9A15D" />
          <Rect x="78" y="86" width="44" height="28" rx="6" fill="#8DB580" />
          <Circle cx="92" cy="100" r="6" fill="#E59A7A" />
          <Circle cx="108" cy="100" r="6" fill="#F2B33D" />
        </G>
      );
    case 'frutta':
      return (
        <G>
          <Circle cx="90" cy="100" r="14" fill="#E0614F" />
          <Circle cx="112" cy="96" r="12" fill="#F2B33D" />
          <Circle cx="104" cy="116" r="10" fill="#8DB580" />
          <Path d="M90 86 q4 -8 10 -8" stroke={colors.green} strokeWidth={3} fill="none" />
        </G>
      );
    case 'verdure':
    default:
      return (
        <G transform={`rotate(${rot} 100 100)`}>
          <Path d="M80 108 q-6 -28 20 -34 q4 26 -20 34 z" fill="#6E9F62" />
          <Path d="M104 112 q2 -30 28 -28 q-2 26 -28 28 z" fill="#8DB580" />
          <Circle cx="96" cy="118" r="8" fill="#E0614F" />
          <Circle cx="114" cy="94" r="5" fill={colors.peach} />
        </G>
      );
  }
}

export const DishArt = memo(function DishArt({
  category,
  recipeId,
  style,
  rounded = 18,
}: {
  category: DishCategory;
  recipeId: string;
  style?: ViewStyle;
  rounded?: number;
}) {
  const seed = hashString(recipeId);
  return (
    <View style={[{ aspectRatio: 1.6, borderRadius: rounded, overflow: 'hidden', backgroundColor: BACKGROUNDS[category] }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 25 200 125" preserveAspectRatio="xMidYMid slice">
        <Circle cx={30 + (seed % 30)} cy="40" r="26" fill="#FFFFFF" opacity={0.25} />
        <Circle cx={170 - (seed % 25)} cy="140" r="34" fill="#FFFFFF" opacity={0.2} />
        <Ellipse cx="102" cy="106" rx="56" ry="54" fill="#000000" opacity={0.06} />
        <Circle cx="100" cy="100" r="54" fill="#FFFDF8" />
        <Circle cx="100" cy="100" r="44" fill="none" stroke="#EDE6D6" strokeWidth={2} />
        <Topping category={category} seed={seed} />
      </Svg>
    </View>
  );
});
