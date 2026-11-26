import { armTo, type ArmPose, type MinaLook } from './art';

/** Pose del braccio, descritte dalla posizione della mano (cinematica inversa in `armTo`). */
export const ARM = {
  // braccia corte come nel foglio: spalle sui bordi della borsa, mani a guanto
  restL: armTo('L', 28, 150),
  restR: armTo('R', 173, 146),
  hipL: armTo('L', 42, 141),
  waveR: armTo('R', 173, 90),
  cheerL: armTo('L', 26, 94),
  cheerR: armTo('R', 173, 89),
  openL: armTo('L', 16, 128),
  openR: armTo('R', 185, 128),
  chinR: armTo('R', 147, 141),
  raiseR: armTo('R', 179, 106),
  holdR: armTo('R', 165, 141),
  upL: armTo('L', 24, 106),
  upR: armTo('R', 175, 102),
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

// nel foglio Mina è sempre un po' inclinata: −3° di base, −6° e a passo nel saluto (il disegno principale)
const classic = (look: Omit<MinaLook, 'variant'>): MinaLook => ({ variant: 'classic', lean: -3, ...look });
const chef = (look: Omit<MinaLook, 'variant'>): MinaLook => ({ variant: 'chef', lean: -3, ...look });

/**
 * Ogni posa: l'aspetto finale (quello mostrato anche da fermo, con "Riduci movimento") e il gesto.
 * Mina 2.0 per casa, calendario, spesa e promemoria; Mina Chef solo per ricette e cucina.
 */
export const POSES: Record<MinaPose, PoseSpec> = {
  neutral: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.restR }), action: 'none' },
  welcome: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.waveR, legs: 'walk', lean: -6, emote: 'sparkles' }), action: 'greet' },
  wave: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.waveR, legs: 'walk', lean: -6 }), action: 'greet' },
  explaining: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.openR }), action: 'none' },
  thinking: { look: classic({ eyes: 'open', mouth: 'hmm', armL: ARM.hipL, armR: ARM.chinR, emote: 'question' }), action: 'think' },
  calendar: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: { ...ARM.holdR, prop: 'phone', propTilt: 6 } }), action: 'none' },
  shopping: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: { ...ARM.holdR, prop: 'list', propTilt: 8 } }), action: 'none' },
  cooking: { look: chef({ eyes: 'wink', mouth: 'smile', armL: ARM.hipL, armR: { ...ARM.raiseR, prop: 'spoon', propTilt: 4 }, emote: 'sparkles' }), action: 'recipe' },
  recipe: { look: chef({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: { ...ARM.raiseR, prop: 'spoon', propTilt: 4 } }), action: 'recipe' },
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
