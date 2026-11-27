import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Mina2, Mina2Badge } from './mina2/Mina2';
import type { Brows, Eyes, Mouth } from './mina2/art';
import type { MinaAction, MinaPose } from './mina2/poses';

export type { MinaPose } from './mina2/poses';
export { MINA_POSES, resolvePose } from './mina2/poses';

export type MinaMotion = 'auto' | 'none';

export interface MinaMascotProps {
  /** Posa (nomi inglesi) oppure, per compatibilità, i vecchi nomi italiani. */
  pose?: MinaPose | string;
  /** Larghezza in punti: piccola 40–56, media 64–96, grande 120–180. */
  size?: number;
  /** Se vero, entra con il gesto della posa. Rispetta "Riduci movimento". */
  animated?: boolean;
  /** Dopo il gesto resta viva (respiro, battiti di ciglia). Solo per la Mina principale di una schermata. */
  idle?: boolean;
  /** Toccandola fa un saltello felice. */
  interactive?: boolean;
  /** Se presente, Mina è esposta agli screen reader con questa etichetta; altrimenti è decorativa. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  replayKey?: string | number;
  /** Espressioni al posto di quelle della posa (occhi, bocca, sopracciglia). */
  eyes?: Eyes;
  mouth?: Mouth;
  brows?: Brows;
  /** Ripete il gesto ogni volta che la schermata torna in primo piano (altrimenti solo la prima volta). */
  replayOnFocus?: boolean;
  /** Gesto al posto di quello della posa (es. `emerge` nell'intro). */
  gesture?: MinaAction;
  /** Chiamata alla fine del gesto della posa. */
  onDone?: () => void;
  /** Quando cambia, Mina dà un'occhiata breve al contenuto accanto. */
  glance?: string | number;
}

/**
 * Mina 2.0, la mascotte di Spesora: la borsetta della spesa (Mina Chef nelle pose di cucina e ricette).
 * Vettoriale e offline, animata a parti separate. Vedi `mina2/` e docs/MASCOT.md.
 */
export const MinaMascot = memo(function MinaMascot(props: MinaMascotProps) {
  return <Mina2 {...props} />;
});

/** Variante compatta (solo il volto) per righe, badge e richiami piccoli. */
export const MinaBadge = memo(function MinaBadge({ size = 36, style, variant }: { size?: number; style?: StyleProp<ViewStyle>; variant?: 'classic' | 'chef' }) {
  return <Mina2Badge size={size} style={style} variant={variant} />;
});
