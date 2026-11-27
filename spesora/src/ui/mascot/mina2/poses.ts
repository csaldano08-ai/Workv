import { RIG, armTo, type ArmPose, type MinaLook, type Variant } from './art';

/**
 * Pose chiave del braccio di Mina 2.0, descritte dalla posizione del palmo (la cinematica inversa in `armTo` dà le
 * rotazioni di spalla e gomito). Spalle e lunghezze dal foglio approvato (spalle all'altezza della bocca, braccio
 * 18, avambraccio 16). Le mani restano fuori dal viso e lontane da lattuga (a sinistra) e ciuffo della carota (a
 * destra): nessun braccio attraversa gli ingredienti.
 */
export const ARM = {
  // a riposo: braccio un po' aperto, gomito morbido verso l'esterno, mano all'altezza del fondo della borsa (foglio)
  restL: armTo('L', 26, 146),
  restR: armTo('R', 174, 150),
  hipL: armTo('L', 24, 148),
  // saluto (foglio): gomito in fuori all'altezza della guancia, avambraccio in su, mano accanto all'angolo della borsa
  waveR: armTo('R', 181, 103),
  // posa intermedia del saluto: il braccio si alza dalla spalla, l'avambraccio ancora un po' piegato in giù
  liftWaveR: armTo('R', 182, 142),
  // saluto con la sinistra: più basso, sotto la lattuga che sporge a sinistra
  waveL: armTo('L', 17, 123),
  liftWaveL: armTo('L', 19, 146),
  // felice: braccia aperte e in su, ai lati della borsa (non sopra gli ingredienti)
  cheerL: armTo('L', 9, 119),
  cheerR: armTo('R', 185, 104),
  openL: armTo('L', 12, 136),
  openR: armTo('R', 189, 137),
  // pensierosa: la mano sotto la guancia destra, fuori dal viso
  chinR: armTo('R', 150, 140),
  raiseR: armTo('R', 183, 108),
  holdR: armTo('R', 171, 146),
  upL: armTo('L', 8, 120),
  upR: armTo('R', 186, 102),
  // indica di lato: braccio quasi disteso all'altezza della spalla
  pointR: armTo('R', 190, 128),
  // solleva un oggetto sopra la spalla, accanto alla borsa
  liftR: armTo('R', 182, 106),
  // pugno di soddisfazione: avambraccio in su accanto al corpo
  pumpR: armTo('R', 180, 110),
  // braccia un po' aperte in basso, da preoccupata
  worryL: armTo('L', 22, 148),
  worryR: armTo('R', 178, 147),
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
  // la sinistra stringe il laccio del grembiule proprio sopra il fiocco, come nel foglio (pugno chiuso)
  bowL: chefArm('L', 61, 146, { len: [4, 4.5], prop: 'grip' }),
  spoonR: chefArm('R', 166, 116.5, { len: [12, 16] }),
  // 2 · mescola: la sinistra tiene la ciotola dal bordo, la destra la frusta
  bowlL: chefAt('L', 100, 160, LEAN.mixing, { len: [24, 24] }),
  whiskR: chefAt('R', 165, 117, LEAN.mixing, { len: [15, 17] }),
  // 3 · serve: la cloche sul vassoio alto a destra, la sinistra lungo il fianco
  // nel foglio il braccio sinistro è corto e vicino al fianco, la mano all'altezza del grembiule
  sideL: chefAt('L', 57, 168, LEAN.serving, { len: [12, 12] }),
  sideL4: chefAt('L', 57, 168, LEAN.checklist, { len: [12, 12] }),
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
  'concerned',
  'pointing',
  'goodbye',
  'waveLeft',
  'lifting',
  'jumping',
  'satisfied',
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
export type MinaAction = 'greet' | 'greetL' | 'happy' | 'think' | 'done' | 'recipe' | 'present' | 'remind' | 'concern' | 'worry' | 'point' | 'lift' | 'jump' | 'pump' | 'stir' | 'emerge' | 'none';

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
  thinking: { look: classic({ eyes: 'open', mouth: 'hmm', brows: 'focus', armL: ARM.hipL, armR: ARM.chinR, emote: 'question' }), action: 'think' },
  calendar: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: { ...ARM.holdR, prop: 'phone', propTilt: 6 } }), action: 'none' },
  shopping: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.hipL, armR: { ...ARM.holdR, prop: 'list', propTilt: 8 } }), action: 'none' },
  // le quattro pose del foglio di Mina Chef: cucchiaio e occhiolino, mescola, serve, controlla la lista
  cooking: { look: chef({ eyes: 'wink', mouth: 'smile', armL: CHEF_ARM.bowL, armR: { ...CHEF_ARM.spoonR, prop: 'spoon', propTilt: -7 }, emote: 'shine' }), action: 'recipe' },
  recipe: { look: chef({ eyes: 'open', mouth: 'smile', armL: CHEF_ARM.bowL, armR: { ...CHEF_ARM.spoonR, prop: 'spoon', propTilt: -7 } }), action: 'recipe' },
  // la ciotola è ferma davanti a lei e la frusta in mano la mescola (gesto `stir`)
  mixing: {
    look: chef({
      eyes: 'happy',
      mouth: 'small',
      lean: LEAN.mixing,
      bow: false,
      armL: CHEF_ARM.bowlL,
      armR: { ...CHEF_ARM.whiskR, prop: 'whisk', propTilt: -LEAN.mixing },
      bowl: { cx: CHEF_ARM.whiskR.at!.x - 9, ry: CHEF_ARM.whiskR.at!.y + 34, tilt: -LEAN.mixing },
    }),
    action: 'stir',
  },
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
  // recitazione contestuale: vede un problema e lo indica; indica un contenuto; saluta andando via
  concerned: { look: classic({ eyes: 'open', mouth: 'hmm', brows: 'worried', armL: ARM.worryL, armR: ARM.worryR, lean: 2 }), action: 'concern' },
  pointing: { look: classic({ eyes: 'open', mouth: 'small', armL: ARM.hipL, armR: ARM.pointR, lean: -2 }), action: 'point' },
  goodbye: { look: classic({ eyes: 'happy', mouth: 'smile', armL: ARM.restL, armR: ARM.waveR, legs: 'walk', lean: -5 }), action: 'greet' },
  // gesti di prova del rig (e reazioni brevi nelle pagine)
  waveLeft: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.waveL, armR: ARM.restR, lean: 4 }), action: 'greetL' },
  lifting: { look: classic({ eyes: 'happy', mouth: 'grin', brows: 'raised', armL: ARM.hipL, armR: { ...ARM.liftR, prop: 'list', propTilt: 8 } }), action: 'lift' },
  jumping: { look: classic({ eyes: 'happy', mouth: 'grin', armL: ARM.restL, armR: ARM.restR }), action: 'jump' },
  satisfied: { look: classic({ eyes: 'happy', mouth: 'grin', armL: ARM.hipL, armR: { ...ARM.pumpR, prop: 'fist' } }), action: 'pump' },
};

/** Le pose dello chef (per i test e la documentazione). */
export const CHEF_POSES: MinaPose[] = (Object.keys(POSES) as MinaPose[]).filter((p) => POSES[p].look.variant === 'chef');
