import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, outline, radius, space } from '../theme/tokens';

/** Superficie con contorno scuro morbido: lo stesso linguaggio degli oggetti illustrati. */
export function Card({ style, tone = 'paper', ...rest }: ViewProps & { tone?: 'paper' | 'green' | 'peach' }) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'peach' ? colors.peachSoft : colors.paper;
  return <View style={[styles.card, { backgroundColor: bg }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: outline.width, borderColor: outline.color, padding: space.lg, gap: space.sm },
});
