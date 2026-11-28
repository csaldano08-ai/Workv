import { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { ShoppingCategory } from '../../core/domain/types';
import { illo } from './palette';

/** Micro-illustrazione per ogni reparto della spesa (contorno scuro, palette di Mina). Decorativa. */
const ink = illo.ink;
const SW = 2.2;

function Draw({ cat }: { cat: ShoppingCategory }) {
  switch (cat) {
    // simboli NEUTRI del reparto (usati quando un ingrediente non ha un'immagine sua): niente carota o formaggio,
    // che accanto a una mela o al latte sarebbero un'immagine sbagliata
    case 'frutta_verdura':
      return (
        <G>
          <Path d="M24 40 Q24 26 24 16" stroke={ink} strokeWidth={SW} strokeLinecap="round" fill="none" />
          <Path d="M24 26 Q12 26 9 13 Q22 12 24 26Z" fill={illo.greenMid} stroke={ink} strokeWidth={SW} strokeLinejoin="round" />
          <Path d="M24 21 Q35 22 39 9 Q26 7 24 21Z" fill={illo.sage} stroke={ink} strokeWidth={SW} strokeLinejoin="round" />
        </G>
      );
    case 'latticini_uova':
      return (
        <G>
          <Path d="M16 10 H30 L29 15 Q35 19 35 27 V38 Q35 41 32 41 H14 Q11 41 11 38 V27 Q11 19 17 15Z" fill={illo.paper} stroke={ink} strokeWidth={SW} strokeLinejoin="round" />
          <Path d="M35 22 Q41 22 41 28 Q41 33 35 33" stroke={ink} strokeWidth={SW} fill="none" />
          <Path d="M12 29 H34" stroke={illo.sage} strokeWidth={3} />
        </G>
      );
    case 'carne':
      return (
        <G>
          <Path d="M9 28 Q8 17 20 15 L32 13 Q41 13 40 22 Q39 31 28 32 L17 34 Q9 35 9 28Z" fill="#C8553D" stroke={ink} strokeWidth={SW} />
          <Path d="M17 22 Q24 19 31 20" stroke={illo.peachLight} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'pesce':
      return (
        <G>
          <Path d="M6 24 Q18 10 32 18 L42 11 L40 24 L42 37 L32 30 Q18 38 6 24Z" fill="#8FB3C4" stroke={ink} strokeWidth={SW} strokeLinejoin="round" />
          <Circle cx={14} cy={22} r={1.8} fill={ink} />
        </G>
      );
    case 'pasta_riso_cereali':
    case 'pane_forno':
      return (
        <G>
          <Path d="M14 14 Q24 10 34 14 L36 38 Q24 42 12 38Z" fill={illo.peachLight} stroke={ink} strokeWidth={SW} strokeLinejoin="round" />
          <Path d="M15 15 Q24 19 33 15" stroke={ink} strokeWidth={1.8} fill="none" />
          <Path d="M24 22v12M24 26l-3-2M24 26l3-2M24 30l-3-2M24 30l3-2" stroke="#B98552" strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'legumi':
      return (
        <G>
          <Ellipse cx={18} cy={26} rx={8} ry={6} fill="#B98552" stroke={ink} strokeWidth={SW} />
          <Ellipse cx={30} cy={22} rx={8} ry={6} fill="#C9A27E" stroke={ink} strokeWidth={SW} />
          <Ellipse cx={26} cy={33} rx={8} ry={6} fill={illo.sage} stroke={ink} strokeWidth={SW} />
        </G>
      );
    case 'surgelati':
      return <Path d="M24 6v36M8 15l32 18M8 33l32-18M20 9l4 4 4-4M20 39l4-4 4 4" stroke="#5F8FA8" strokeWidth={3} strokeLinecap="round" fill="none" />;
    case 'bevande':
      return (
        <G>
          <Rect x={18} y={6} width={12} height={6} rx={2} fill={illo.sage} stroke={ink} strokeWidth={SW} />
          <Path d="M18 12 h12 v6 l4 6 v16 a3 3 0 0 1 -3 3 h-14 a3 3 0 0 1 -3 -3 v-16 l4 -6z" fill="#E8F1F4" stroke={ink} strokeWidth={SW} />
        </G>
      );
    default:
      return (
        <G>
          <Rect x={14} y={8} width={20} height={6} rx={2} fill={illo.sage} stroke={ink} strokeWidth={SW} />
          <Rect x={12} y={13} width={24} height={27} rx={6} fill={illo.paper} stroke={ink} strokeWidth={SW} />
          <Path d="M14 26 H34 V33 Q34 38 29 38 H19 Q14 38 14 33Z" fill={illo.peach} />
        </G>
      );
  }
}

export const CategoryIcon = memo(function CategoryIcon({ category, size = 30, style }: { category: ShoppingCategory; size?: number; style?: ViewStyle }) {
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 48 48">
        <Draw cat={category} />
      </Svg>
    </View>
  );
});
