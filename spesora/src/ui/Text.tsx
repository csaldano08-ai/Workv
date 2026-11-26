import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, font, MAX_FONT_SCALE, type as typeScale } from '../theme/tokens';

type Variant = keyof typeof typeScale;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** Peso → famiglia Nunito (i caratteri caricati sono uno per peso: niente grassetti "finti"). */
export function nunito(weight: TextStyle['fontWeight']): string {
  const w = typeof weight === 'number' ? weight : weight === 'bold' ? 700 : weight === 'normal' || !weight ? 400 : Number(weight);
  if (w >= 800) return font.extrabold;
  if (w >= 700) return font.bold;
  if (w >= 500) return font.semibold;
  return font.regular;
}

export function Text({ variant = 'body', color = colors.ink, center, style, ...rest }: AppTextProps) {
  const flat: TextStyle = StyleSheet.flatten([typeScale[variant], style]) ?? {};
  const family = flat.fontFamily ?? nunito(flat.fontWeight);
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[typeScale[variant], { color }, center && { textAlign: 'center' }, style, { fontFamily: family, fontWeight: 'normal' }]}
      {...rest}
    />
  );
}
