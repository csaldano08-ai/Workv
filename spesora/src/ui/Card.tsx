import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, shadow, space } from '../theme/tokens';

/** Card chiara: bianca con bordo delicato e ombra morbida; varianti tenui verde e pesca senza bordo. */
export function Card({ style, tone = 'paper', ...rest }: ViewProps & { tone?: 'paper' | 'green' | 'peach' }) {
  const tinted = tone !== 'paper';
  const bg = tone === 'green' ? colors.greenSoft : tone === 'peach' ? colors.peachSoft : colors.white;
  return <View style={[styles.card, tinted ? styles.tinted : styles.plain, { backgroundColor: bg }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  plain: { borderWidth: 1, borderColor: colors.line, ...shadow.card },
  tinted: { borderWidth: 0 },
});
