import { StyleSheet, View } from 'react-native';
import type { TimoPose } from './mascot/timoSvg';
import { Timo } from './mascot/Timo';
import { colors, radius, space } from '../theme/tokens';
import { Text } from './Text';

/** Messaggio dell'assistente: Timo accanto a una nuvoletta. Usato in Oggi, Spesa, onboarding ed empty state. */
export function AssistantBubble({ pose = 'neutra', text, title, size = 72, children }: { pose?: TimoPose; text: string; title?: string; size?: number; children?: React.ReactNode }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Timo: ${title ? `${title}. ` : ''}${text}`}>
      <Timo pose={pose} size={size} />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        {title ? <Text variant="heading">{title}</Text> : null}
        <Text variant="body" color={colors.ink}>
          {text}
        </Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  bubble: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.xs,
    marginBottom: space.md,
  },
  tail: {
    position: 'absolute',
    left: -6,
    bottom: 10,
    width: 12,
    height: 12,
    backgroundColor: colors.paper,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    transform: [{ rotate: '45deg' }],
  },
});
