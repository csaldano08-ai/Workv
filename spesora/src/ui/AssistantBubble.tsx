import { StyleSheet, View } from 'react-native';
import type { MinaPose } from './mascot/minaSvg';
import { MinaMascot } from './mascot/Mina';
import { colors, outline, radius, space } from '../theme/tokens';
import { StickyNote } from './notebook';
import { Text } from './Text';

/**
 * Messaggio dell'assistente: Mina accanto a una nuvoletta. Usato in Oggi, Spesa, onboarding ed empty state.
 * `animated` (predefinito) la fa entrare con un breve gesto; con "Riduci movimento" resta ferma.
 */
export function AssistantBubble({
  pose = 'neutral',
  text,
  title,
  size = 104,
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
      <StickyNote style={styles.bubble}>
        {title ? <Text variant="hand">{title}</Text> : null}
        <Text variant={title ? 'small' : 'body'} color={title ? colors.inkSoft : colors.ink}>
          {text}
        </Text>
        {children}
      </StickyNote>
    </View>
  );
}

/** Piccolo richiamo di Mina (dimensione piccola) accanto a un testo breve, senza nuvoletta. */
export function MinaNote({ pose = 'neutral', title, text, size = 64 }: { pose?: MinaPose | string; title?: string; text: string; size?: number }) {
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  bubble: { flex: 1 },
  tail: {
    position: 'absolute',
    left: -8,
    bottom: 12,
    width: 14,
    height: 14,
    backgroundColor: colors.paper,
    borderLeftWidth: outline.width,
    borderBottomWidth: outline.width,
    borderColor: outline.color,
    transform: [{ rotate: '45deg' }],
  },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.greenSoft, borderRadius: radius.lg, borderWidth: outline.width, borderColor: outline.color, padding: space.sm, paddingRight: space.md },
  noteText: { flex: 1, gap: 2 },
});
