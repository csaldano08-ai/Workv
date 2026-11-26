import { armTo, type ArmPose, type MinaLook } from './art';

/** Pose del braccio, descritte dalla posizione della mano (cinematica inversa in `armTo`). */
export const ARM = {
  restL: armTo('L', 40, 168),
  restR: armTo('R', 161, 166),
  hipL: armTo('L', 54, 156),
  waveR: armTo('R', 178, 80),
  waveRLow: armTo('R', 186, 98),
  cheerL: armTo('L', 22, 84),
  cheerR: armTo('R', 179, 82),
  openL: armTo('L', 18, 140),
  openR: armTo('R', 184, 138),
  chinR: armTo('R', 133, 146),
  raiseR: armTo('R', 172, 84),
  holdR: armTo('R', 142, 160),
  upL: armTo('L', 24, 108),
  upR: armTo('R', 177, 106),
} as const satisfies Record<string, ArmPose>;

/** Pose pubbliche della mascotte. I nomi delle pose precedenti restano validi (stesse schermate, nuovo personaggio). */
export const MINA_POSES = [
  'neutral',
  'welcome',
  'wave',
  'explaining',
  'thinking',
  'calendar',
  'shopping',
  'cooking',
  'recipe',
  'pantry',
  'missing',
  'savings',
  'happy',
  'success',
  'sleepy',
  'empty',
  'reminder',
] as const;
export type MinaPose = (typeof MINA_POSES)[number];

/** Vecchi nomi italiani, per compatibilità con i dati già salvati (es. pose nei festeggiamenti). */
const LEGACY: Record<string, MinaPose> = {
  saluto: 'welcome',
  felice: 'happy',
  pensierosa: 'thinking',
  calendario: 'calendar',
  spesa: 'shopping',
  cucina: 'cooking',
  ricetta: 'recipe',
  dispensa: 'pantry',
  manca: 'missing',
  risparmio: 'savings',
  successo: 'success',
  assonnata: 'sleepy',
  vuoto: 'empty',
  promemoria: 'reminder',
};

export function resolvePose(pose: string): MinaPose {
  return (MINA_POSES as readonly string[]).includes(pose) ? (pose as MinaPose) : (LEGACY[pose] ?? 'neutral');
}

/** Gesto animato associato a una posa (eseguito una volta all'ingresso). */
export type MinaAction = 'greet' | 'happy' | 'think' | 'done' | 'recipe' | 'remind' | 'none';

export interface PoseSpec {
  look: MinaLook;
  action: MinaAction;
}

const classic = (look: Omit<MinaLook, 'variant'>): MinaLook => ({ variant: 'classic', ...look });
const chef = (look: Omit<MinaLook, 'variant'>): MinaLook => ({ variant: 'chef', ...look });

/**
 * Ogni posa: l'aspetto finale (quello mostrato anche da fermo, con "Riduci movimento") e il gesto.
 * Mina 2.0 per casa, calendario, spesa e promemoria; Mina Chef solo per ricette e cucina.
 */
export const POSES: Record<MinaPose, PoseSpec> = {
  neutral: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: ARM.restR }), action: 'none' },
  welcome: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: ARM.waveR }), action: 'greet' },
  wave: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: ARM.waveR }), action: 'greet' },
  explaining: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.openR }), action: 'none' },
  thinking: { look: classic({ eyes: 'open', mouth: 'hmm', armL: ARM.hipL, armR: ARM.chinR, emote: 'question' }), action: 'think' },
  calendar: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: { ...ARM.holdR, prop: 'phone', propTilt: -8 } }), action: 'none' },
  shopping: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: { ...ARM.holdR, prop: 'list', propTilt: -10 } }), action: 'none' },
  cooking: { look: chef({ eyes: 'wink', mouth: 'smile', armL: ARM.hipL, armR: { ...ARM.raiseR, prop: 'spoon', propTilt: 12 } }), action: 'recipe' },
  recipe: { look: chef({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: { ...ARM.raiseR, prop: 'spoon', propTilt: 12 } }), action: 'recipe' },
  pantry: { look: classic({ eyes: 'open', mouth: 'small', armL: ARM.restL, armR: ARM.openR }), action: 'none' },
  missing: { look: classic({ eyes: 'surprised', mouth: 'o', armL: ARM.upL, armR: ARM.upR }), action: 'none' },
  savings: { look: classic({ eyes: 'star', mouth: 'grin', armL: ARM.hipL, armR: ARM.cheerR, emote: 'sparkles' }), action: 'happy' },
  happy: { look: classic({ eyes: 'happy', mouth: 'grin', armL: ARM.cheerL, armR: ARM.cheerR, emote: 'sparkles' }), action: 'happy' },
  success: { look: classic({ eyes: 'happy', mouth: 'grin', armL: ARM.cheerL, armR: ARM.cheerR, emote: 'sparkles' }), action: 'done' },
  sleepy: { look: classic({ eyes: 'closed', mouth: 'small', armL: ARM.restL, armR: ARM.restR }), action: 'none' },
  empty: { look: classic({ eyes: 'open', mouth: 'hmm', armL: ARM.hipL, armR: ARM.chinR }), action: 'think' },
  reminder: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: ARM.raiseR, emote: 'bang' }), action: 'remind' },
};

/** Le pose dello chef (per i test e la documentazione). */
export const CHEF_POSES: MinaPose[] = (Object.keys(POSES) as MinaPose[]).filter((p) => POSES[p].look.variant === 'chef');
