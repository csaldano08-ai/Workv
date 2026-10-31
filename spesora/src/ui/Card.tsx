import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, space } from '../theme/tokens';

export function Card({ style, tone = 'paper', ...rest }: ViewProps & { tone?: 'paper' | 'green' | 'peach' }) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'peach' ? colors.peachSoft : colors.paper;
  return <View style={[styles.card, { backgroundColor: bg, borderColor: tone === 'paper' ? colors.line : bg }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.sm },
});
