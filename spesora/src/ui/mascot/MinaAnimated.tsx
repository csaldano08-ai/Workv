import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Eyes } from './mina2/art';
import { MINA_STATE_POSE, type MinaState, type MinaVariant } from './mina2/states';
import { MinaMascot } from './Mina';

export type { MinaState, MinaVariant } from './mina2/states';
export { MINA_STATE_POSE } from './mina2/states';

export interface MinaAnimatedProps {
  /** `standard` = Mina 2.0; `chef` = Mina Chef (solo per ricette e cucina). */
  variant?: MinaVariant;
  /** Cosa sta recitando: il gesto parte quando il componente compare o quando cambia `event`. */
  state?: MinaState;
  /** Larghezza in punti. */
  size?: number;
  /** Espressione degli occhi al posto di quella dello stato (es. una reazione a una scelta). */
  expression?: Eyes;
  /** Evento da rappresentare: quando cambia, il gesto dello stato viene rieseguito. */
  event?: string | number;
  /** Chiamata quando il gesto è finito (non con "Riduci movimento": lì non c'è gesto). */
  onDone?: () => void;
  /** Quando cambia, Mina dà un'occhiata breve al contenuto accanto (es. una spunta nella lista). */
  glance?: string | number;
  /** Toccandola fa un saltello felice. */
  interactive?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * «MinaAnimated»: l'ingresso unico per far recitare Mina nelle schermate.
 * Un solo gesto per evento (niente animazioni sovrapposte), idle solo nello stato `idle`,
 * tutto fermo con "Riduci movimento"; allo smontaggio ogni animazione viene interrotta.
 */
export const MinaAnimated = memo(function MinaAnimated({ variant = 'standard', state = 'idle', size = 120, expression, event, onDone, glance, interactive, accessibilityLabel, style }: MinaAnimatedProps) {
  return (
    <MinaMascot
      pose={MINA_STATE_POSE[variant][state]}
      size={size}
      animated
      idle={state === 'idle'}
      eyes={expression}
      replayKey={event}
      onDone={onDone}
      glance={glance}
      interactive={interactive}
      accessibilityLabel={accessibilityLabel}
      style={style}
    />
  );
});
