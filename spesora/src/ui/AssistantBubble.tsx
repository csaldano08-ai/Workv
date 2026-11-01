import { StyleSheet, View } from 'react-native';
import type { MinaPose } from './mascot/minaSvg';
import { MinaMascot } from './mascot/Mina';
import { colors, radius, space } from '../theme/tokens';
import { Text } from './Text';

/**
 * Messaggio dell'assistente: Mina accanto a una nuvoletta. Usato in Oggi, Spesa, onboarding ed empty state.
 * `animated` (predefinito) la fa entrare con un breve gesto; con "Riduci movimento" resta ferma.
 */
export function AssistantBubble({
  pose = 'neutral',
  text,
  title,
  size = 88,
  animated = true,
  children,
}: {
  pose?: MinaPose | string;
  text: string;
  title?: string;
  size?: number;
  animated?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Mina: ${title ? `${title}. ` : ''}${text}`}>
      <MinaMascot pose={pose} size={size} animated={animated} />
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

/** Piccolo richiamo di Mina (dimensione piccola) accanto a un testo breve, senza nuvoletta. */
export function MinaNote({ pose = 'neutral', title, text, size = 48 }: { pose?: MinaPose | string; title?: string; text: string; size?: number }) {
  return (
    <View style={styles.note} accessible accessibilityLabel={`Mina: ${title ? `${title}. ` : ''}${text}`}>
      <MinaMascot pose={pose} size={size} />
      <View style={styles.noteText}>
        {title ? <Text variant="heading">{title}</Text> : null}
        <Text variant="small" color={colors.inkSoft}>
          {text}
        </Text>
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
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: space.sm, paddingRight: space.md },
  noteText: { flex: 1, gap: 2 },
});
