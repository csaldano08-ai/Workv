import { armTo, type ArmPose, type MinaLook, type Variant } from './art';

/**
 * Pose chiave del braccio di Mina 2.0, descritte dalla posizione del palmo (la cinematica inversa in `armTo` dà le
 * rotazioni di spalla e gomito). Spalle e lunghezze dal foglio approvato (spalle all'altezza della bocca, braccio
 * 18, avambraccio 16). Le mani restano fuori dal viso e lontane da lattuga (a sinistra) e ciuffo della carota (a
 * destra): nessun braccio attraversa gli ingredienti.
 */
export const ARM = {
  // a riposo (V4): braccia rilassate e quasi distese lungo i fianchi, mano all'altezza del fondo della borsa
  restL: armTo('L', 31.5, 165.6),
  restR: armTo('R', 168.5, 170),
  // mano sul fianco: qui il gomito si piega davvero (è il gesto), con una curva morbida
  hipL: armTo('L', 27, 152),
  // saluto: il braccio si alza dalla spalla con una curva leggera, la mano aperta in alto accanto alla borsa
  waveR: armTo('R', 186, 95),
  // posa intermedia del saluto: il braccio aperto all'altezza della spalla
  liftWaveR: armTo('R', 193, 134),
  // saluto con la sinistra: più basso, sotto la lattuga che sporge a sinistra
  waveL: armTo('L', 9, 112),
  liftWaveL: armTo('L', 6, 140),
  // felice: braccia aperte e in su, quasi distese, ai lati della borsa (non sopra gli ingredienti)
  cheerL: armTo('L', 8, 100),
  cheerR: armTo('R', 192, 102),
  openL: armTo('L', 6, 140),
  openR: armTo('R', 194, 145),
  // pensierosa: la mano alzata accanto all'angolo della borsa, vicino alla guancia (non davanti al viso)
  chinR: armTo('R', 179, 105),
  raiseR: armTo('R', 186, 98),
  // tiene un oggetto (lista, telefono) accanto al fianco destro
  holdR: armTo('R', 182, 150),
  upL: armTo('L', 8, 100),
  upR: armTo('R', 192, 98),
  // indica di lato: braccio disteso all'altezza della spalla
  pointR: armTo('R', 200, 127),
  // solleva un oggetto sopra la spalla, accanto alla borsa
  liftR: armTo('R', 188, 100),
  // pugno di soddisfazione: avambraccio in su accanto al corpo
  pumpR: armTo('R', 184, 106),
  // braccia un po' aperte in basso, da preoccupata
  worryL: armTo('L', 28, 160),
  worryR: armTo('R', 173, 164),
} as const satisfies Record<string, ArmPose>;

const chefArm = (side: 'L' | 'R', x: number, y: number, extra: Partial<ArmPose> = {}) => armTo(side, x, y, extra, 'chef');

/** Inclinazione leggera di alcune pose di Mina Chef (attorno ai piedi, come Mina 2.0). */
const LEAN = { mixing: -2, serving: -2, checklist: -2 } as const;

/**
 * Braccia di Mina Chef: LO STESSO scheletro di Mina 2.0 (V4), nessuna lunghezza propria. Cambiano solo gli oggetti
 * in mano e le posizioni delle mani.
 */
export const CHEF_ARM = {
  restL: chefArm('L', 31.5, 165.6),
  restR: chefArm('R', 168.5, 170),
  cheerL: chefArm('L', 8, 100),
  cheerR: chefArm('R', 192, 102),
  // 1 · cucchiaio di legno alzato accanto alla borsa; la sinistra rilassata lungo il fianco
  bowL: chefArm('L', 31.5, 165.6),
  spoonR: chefArm('R', 185, 100),
  // 2 · mescola: la ciotola è a terra davanti a lei, la destra mescola con la frusta, la sinistra sul fianco
  bowlL: chefArm('L', 27, 152),
  whiskR: chefArm('R', 126, 141),
  // 3 · serve: la cloche alta a destra, la sinistra lungo il fianco
  sideL: chefArm('L', 31.5, 165.6),
  sideL4: chefArm('L', 31.5, 165.6),
  clocheR: chefArm('R', 186, 102),
  // 4 · checklist: la cartellina tenuta accanto al fianco destro
  boardR: chefArm('R', 184, 140),
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
// V4: niente fiocco di serie (il braccio a riposo gli passerebbe sopra); grembiule con la foglia
const chef = (look: Omit<MinaLook, 'variant'>): MinaLook => ({ variant: 'chef', bow: false, ...look });

/**
 * Ogni posa: l'aspetto finale (quello mostrato anche da fermo, con "Riduci movimento") e il gesto.
 * Mina 2.0 per casa, calendario, spesa e promemoria; Mina Chef solo per ricette e cucina.
 */
export const POSES: Record<MinaPose, PoseSpec> = {
  neutral: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.restR }), action: 'none' },
  // saluto (V4): da ferma Mina sta a riposo, braccia distese; il gesto alza la mano, saluta e la riporta giù
  welcome: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.restR, emote: 'sparkles' }), action: 'greet' },
  wave: { look: classic({ eyes: 'open', mouth: 'smile', armL: ARM.restL, armR: ARM.restR }), action: 'greet' },
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
      bowl: { cx: CHEF_ARM.whiskR.at!.x - 9, ry: CHEF_ARM.whiskR.at!.y + 29, tilt: -LEAN.mixing },
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
