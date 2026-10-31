import { Text as RNText, type TextProps } from 'react-native';
import { colors, MAX_FONT_SCALE, type as typeScale } from '../theme/tokens';

type Variant = keyof typeof typeScale;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function Text({ variant = 'body', color = colors.ink, center, style, ...rest }: AppTextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[typeScale[variant], { color }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
