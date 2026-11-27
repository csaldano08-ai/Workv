import { StyleSheet, View } from 'react-native';
import type { MinaPose } from './mascot/Mina';
import { MinaMascot } from './mascot/Mina';
import { colors, radius, space } from '../theme/tokens';
import { StickyNote } from './notebook';
import { Reveal } from './Reveal';
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
  replayKey,
  children,
}: {
  pose?: MinaPose | string;
  text: string;
  title?: string;
  size?: number;
  animated?: boolean;
  /** Ripete il gesto quando cambia (es. una reazione a una scelta del questionario). */
  replayKey?: string | number;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Mina: ${title ? `${title}. ` : ''}${text}`}>
      <MinaMascot pose={pose} size={size} animated={animated} replayKey={replayKey} />
      {/* la nuvoletta sboccia subito dopo Mina, come se fosse lei a parlare */}
      <Reveal from="pop" delay={animated ? 220 : 0} style={styles.bubbleWrap}>
        <StickyNote tone="sage" style={styles.bubble}>
        <View style={styles.tail} />
        {title ? <Text variant="hand">{title}</Text> : null}
        <Text variant={title ? 'small' : 'body'} color={title ? colors.inkSoft : colors.ink}>
          {text}
        </Text>
        {children}
        </StickyNote>
      </Reveal>
    </View>
  );
}

/** Piccolo richiamo di Mina (Mina Chef nelle ricette) accanto a un testo breve, senza nuvoletta. */
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubbleWrap: { flex: 1 },
  bubble: { flex: 1, padding: space.md, paddingLeft: space.lg },
  // punta della nuvoletta verso Mina
  tail: { position: 'absolute', left: -6, top: '50%', marginTop: -7, width: 14, height: 14, backgroundColor: colors.greenSoft, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: space.sm, paddingRight: space.md },
  noteText: { flex: 1, gap: 2 },
});
