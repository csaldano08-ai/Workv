import { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

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
