import { RIG, armTo, type ArmPose, type MinaLook, type Variant } from './art';

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

const chefArm = (side: 'L' | 'R', x: number, y: number, extra: Partial<ArmPose> = {}) => armTo(side, x, y, extra, 'chef');

/** Inclinazione delle pose di Mina Chef nel foglio (attorno al centro della borsa). */
const LEAN = { mixing: -2.5, serving: -2, checklist: -2.5 } as const;

/**
 * Mano in un punto misurato sul foglio, dove la figura è inclinata di `lean` gradi:
 * il punto si riporta nelle coordinate del corpo dritto, poi la cinematica inversa.
 */
function chefAt(side: 'L' | 'R', x: number, y: number, lean: number, extra: Partial<ArmPose> = {}) {
  const p = RIG.chef.leanPivot;
  const a = (-lean * Math.PI) / 180;
  const dx = x - p.x;
  const dy = y - p.y;
  return chefArm(side, p.x + dx * Math.cos(a) - dy * Math.sin(a), p.y + dx * Math.sin(a) + dy * Math.cos(a), extra);
}

/** Braccia di Mina Chef (scheletro proprio), ricalcate sulle quattro pose del foglio «Mina Chef — Style Reference». */
export const CHEF_ARM = {
  restL: chefArm('L', 54, 176, { len: [14, 15] }),
  restR: chefArm('R', 147, 157),
  cheerL: chefArm('L', 44, 126),
  cheerR: chefArm('R', 160, 110),
  // 1 · cucchiaio di legno alzato; la sinistra, a pugno, stringe il fiocco del grembiule
  bowL: chefArm('L', 60, 139, { len: [4, 4.5], prop: 'fist' }),
  spoonR: chefArm('R', 162.5, 118, { len: [12, 16] }),
  // 2 · mescola: la sinistra tiene la ciotola dal bordo, la destra la frusta
  bowlL: chefAt('L', 100, 160, LEAN.mixing, { len: [24, 24] }),
  whiskR: chefAt('R', 165, 117, LEAN.mixing, { len: [15, 17] }),
  // 3 · serve: la cloche sul vassoio alto a destra, la sinistra lungo il fianco
  sideL: chefAt('L', 55, 177, LEAN.serving, { len: [14, 15] }),
  sideL4: chefAt('L', 55, 177, LEAN.checklist, { len: [14, 15] }),
  clocheR: chefAt('R', 167, 101, LEAN.serving, { len: [20, 23] }),
  // 4 · checklist: la mano destra tiene la cartellina dal bordo destro (il braccio passa dietro)
  boardR: chefAt('R', 190.5, 124.5, LEAN.checklist, { len: [27, 27] }),
} as const satisfies Record<string, ArmPose>;

/** Braccia a riposo e in festa per variante (punto di partenza dei gesti e del tocco). */
export const REST: Record<Variant, { l: ArmPose; r: ArmPose }> = { classic: { l: ARM.restL, r: ARM.restR }, chef: { l: CHEF_ARM.restL, r: CHEF_ARM.restR } };
export const CHEER: Record<Variant, { l: ArmPose; r: ArmPose }> = { classic: { l: ARM.cheerL, r: ARM.cheerR }, chef: { l: CHEF_ARM.cheerL, r: CHEF_ARM.cheerR } };

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
  'mixing',
  'serving',
  'checklist',
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
export type MinaAction = 'greet' | 'happy' | 'think' | 'done' | 'recipe' | 'present' | 'remind' | 'none';

export interface PoseSpec {
  look: MinaLook;
  action: MinaAction;
}

// nel foglio Mina è sempre un po' inclinata: −3° di base, −6° e a passo nel saluto (il disegno principale)
const classic = (look: Omit<MinaLook, 'variant'>): MinaLook => ({ variant: 'classic', lean: -3, ...look });
// Mina Chef ha la borsa già inclinata nel disegno, come nel suo foglio
const chef = (look: Omit<MinaLook, 'variant'>): MinaLook => ({ variant: 'chef', ...look });

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
  // le quattro pose del foglio di Mina Chef: cucchiaio e occhiolino, mescola, serve, controlla la lista
  cooking: { look: chef({ eyes: 'wink', mouth: 'smile', armL: CHEF_ARM.bowL, armR: { ...CHEF_ARM.spoonR, prop: 'spoon', propTilt: -7 }, emote: 'shine' }), action: 'recipe' },
  recipe: { look: chef({ eyes: 'open', mouth: 'smile', armL: CHEF_ARM.bowL, armR: { ...CHEF_ARM.spoonR, prop: 'spoon', propTilt: -7 } }), action: 'recipe' },
  mixing: { look: chef({ eyes: 'happy', mouth: 'small', lean: LEAN.mixing, bow: false, armL: CHEF_ARM.bowlL, armR: { ...CHEF_ARM.whiskR, prop: 'bowl', propTilt: -LEAN.mixing } }), action: 'present' },
  serving: { look: chef({ eyes: 'open', mouth: 'smile', lean: LEAN.serving, bow: false, armL: CHEF_ARM.sideL, armR: { ...CHEF_ARM.clocheR, prop: 'cloche', propTilt: -LEAN.serving }, shift: -19 }), action: 'present' },
  checklist: { look: chef({ eyes: 'open', mouth: 'small', lean: LEAN.checklist, bow: false, armL: CHEF_ARM.sideL4, armR: { ...CHEF_ARM.boardR, prop: 'clipboard', propTilt: 10.1 - LEAN.checklist }, emote: 'shineUp', shift: -10 }), action: 'present' },
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
