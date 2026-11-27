import { IsFocusedContext } from 'expo-router/build/react-navigation/core/useIsFocused';
import { memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { useReducedMotion } from '../../useReducedMotion';
import {
  EMOTE_PIVOT,
  RIG,
  VIEW,
  VIEWBOX,
  armFrame,
  armRotations,
  armTo,
  bodyPart,
  bowlFrontPart,
  bowlPart,
  browsPart,
  emotePart,
  eyesPart,
  handRest,
  handRestSvg,
  hatPart,
  legsPart,
  minaStaticSvg,
  mouthPart,
  propLayer,
  propRestSvg,
  shadowPart,
  svg,
  tubeD,
  tubeStyle,
  type ArmFrame,
  type ArmLen,
  type ArmPose,
  type Brows,
  type Emote,
  type Eyes,
  type MinaLook,
  type Mouth,
  type Pt,
  type Side,
  type Variant,
} from './art';
import { ARM, CHEER, POSES, REST, resolvePose, type MinaAction, type MinaPose } from './poses';

const native = Platform.OS !== 'web';
export const RATIO = VIEW.h / VIEW.w;

// ───────────────────────────── tempo (rallentatore per il controllo qualità) ─────────────────────────────

let TIME = 1;
/** Rallenta (k > 1) o riporta a velocità normale tutte le animazioni di Mina. Solo per controllo qualità e video. */
export function setMinaTimeScale(k: number) {
  TIME = Math.min(8, Math.max(0.25, k));
}
export const T = (ms: number) => ms * TIME;

/**
 * Margine (in unità del disegno) dei livelli che si muovono: mani e oggetti sono disegnati nel punto di riposo e
 * poi spostati e ruotati; senza margine la cloche, il vapore o la cartellina verrebbero tagliati dal riquadro.
 */
export const PAD = 70;
const PAD_VIEWBOX = `${VIEW.x - PAD} ${VIEW.y - PAD} ${VIEW.w + 2 * PAD} ${VIEW.h + 2 * PAD}`;

/** Cache delle stringhe SVG: le stesse parti servono a tutte le istanze. */
const xmlCache = new Map<string, string>();
export function cached(key: string, make: () => string, pad = false): string {
  const id = pad ? `${key}|pad` : key;
  let v = xmlCache.get(id);
  if (!v) {
    v = pad ? svg(make(), PAD_VIEWBOX) : svg(make());
    xmlCache.set(id, v);
  }
  return v;
}

export interface Mina2Props {
  pose?: MinaPose | string;
  /** Larghezza in punti (l'altezza è 1,16 × la larghezza). */
  size?: number;
  /** Espressione degli occhi al posto di quella della posa (es. una reazione a una scelta). */
  eyes?: Eyes;
  /** Espressione della bocca al posto di quella della posa. */
  mouth?: Mouth;
  /** Sopracciglia al posto di quelle della posa. */
  brows?: Brows;
  /** Chiamata quando il gesto della posa è finito (non con "Riduci movimento", dove non c'è gesto). */
  onDone?: () => void;
  /** Quando cambia, Mina dà un'occhiata al contenuto accanto (sguardo breve, poi torna). */
  glance?: string | number;
  /** Entra con il gesto della posa (saluto, felice, pensierosa…). Rispetta "Riduci movimento". */
  animated?: boolean;
  /** Dopo il gesto resta viva: respiro, battito di ciglia, sguardo. Solo per le Mina grandi in primo piano. */
  idle?: boolean;
  /** Toccando Mina, reagisce con un piccolo salto felice. */
  interactive?: boolean;
  /** Ripete il gesto ogni volta che la schermata torna in primo piano (altrimenti solo la prima volta). */
  replayOnFocus?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Ripete il gesto quando cambia (es. lista appena completata). */
  replayKey?: string | number;
  /** Gesto al posto di quello della posa (es. `emerge` nell'intro: esce dal basso, apre gli occhi e saluta). */
  gesture?: MinaAction;
}

export type Vals = ReturnType<typeof makeValues>;

export function makeValues() {
  const v = (n: number) => new Animated.Value(n);
  return {
    enter: v(0),
    hop: v(0), // unità del disegno, negativo = in alto
    squash: v(1),
    tilt: v(0),
    shadow: v(1),
    // angoli delle braccia: guidati in JavaScript perché la curva del braccio si ridisegna a ogni fotogramma
    lU: v(0),
    lF: v(0),
    rU: v(0),
    rF: v(0),
    blink: v(1),
    gazeX: v(0),
    gazeY: v(0),
    brows: v(0), // 0 = nascoste, 1 = visibili
    hat: v(0),
    emote: v(0),
  };
}

const deg = (a: Animated.Value) => a.interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] });

const ease = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.quad);
const back = Easing.out(Easing.back(1.6));
const linear = Easing.linear;

function isAngle(vals: Vals, v: Animated.Value) {
  return v === vals.lU || v === vals.lF || v === vals.rU || v === vals.rF;
}

// ───────────────────────────── gesti: traiettorie della mano risolte con la cinematica inversa ─────────────────────────────

interface Rot {
  upper: number;
  fore: number;
}

/** Costruttore dei gesti: sa dove si trova ogni mano e con quali angoli, per partire sempre dal punto giusto. */
export class Gesture {
  cur: Record<Side, Pt>;
  ang: Record<Side, Rot>;
  constructor(
    private vals: Vals,
    private variant: Variant,
    private len: Record<Side, ArmLen | undefined>,
    start: Record<Side, Pt>,
  ) {
    this.cur = { ...start };
    this.ang = { L: this.solve('L', start.L), R: this.solve('R', start.R) };
  }

  tween(v: Animated.Value, to: number, ms: number, easing: (t: number) => number = ease) {
    return Animated.timing(v, { toValue: to, duration: T(ms), easing, useNativeDriver: native && !isAngle(this.vals, v) });
  }

  solve(side: Side, p: Pt): Rot {
    return armRotations(side, armTo(side, p.x, p.y, { len: this.len[side] }, this.variant));
  }

  /** Mette le braccia di colpo nella posizione di partenza (senza animazione). */
  place() {
    this.vals.lU.setValue(this.ang.L.upper);
    this.vals.lF.setValue(this.ang.L.fore);
    this.vals.rU.setValue(this.ang.R.upper);
    this.vals.rF.setValue(this.ang.R.fore);
  }

  /**
   * La mano va dal punto attuale a `to` lungo un arco che passa all'esterno del corpo (mai davanti al viso);
   * a ogni tappa la cinematica inversa ricalcola spalla e gomito, che resta sempre piegato verso l'esterno.
   * L'andamento (accelerazione, rimbalzo d'arrivo) viene dalla funzione di easing campionata sulle tappe.
   */
  reach(side: Side, to: Pt, ms: number, opts: { arc?: number; easing?: (t: number) => number; steps?: number } = {}) {
    const from = this.cur[side];
    const steps = opts.steps ?? 8;
    const easing = opts.easing ?? ease;
    const out = side === 'R' ? 1 : -1;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const bulge = (opts.arc ?? 0.3) * dist;
    const mid = { x: (from.x + to.x) / 2 + out * bulge, y: (from.y + to.y) / 2 - bulge * 0.25 };
    const at = (t: number) => ({
      x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x,
      y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y,
    });
    const [u, f] = side === 'L' ? [this.vals.lU, this.vals.lF] : [this.vals.rU, this.vals.rF];
    let prev = this.ang[side];
    const parts: Animated.CompositeAnimation[] = [];
    for (let i = 1; i <= steps; i++) {
      const a = this.solve(side, at(easing(i / steps)));
      // angoli continui (niente giri di 360°)
      const next = { upper: a.upper + 360 * Math.round((prev.upper - a.upper) / 360), fore: a.fore + 360 * Math.round((prev.fore - a.fore) / 360) };
      parts.push(Animated.parallel([this.tween(u, next.upper, ms / steps, linear), this.tween(f, next.fore, ms / steps, linear)]));
      prev = next;
    }
    this.cur[side] = to;
    this.ang[side] = prev;
    return Animated.sequence(parts);
  }

  /** Oscillazione dell'avambraccio attorno al gomito (saluto, pugno): il polso segue, la spalla resta ferma. */
  swing(side: Side, amps: number[], ms: number) {
    const f = side === 'L' ? this.vals.lF : this.vals.rF;
    const base = this.ang[side].fore;
    const dir = side === 'R' ? 1 : -1;
    return Animated.sequence([...amps.map((a) => this.tween(f, base + dir * a, ms, Easing.inOut(Easing.sin))), this.tween(f, base, ms, Easing.inOut(Easing.sin))]);
  }
}

/** Salto con anticipo (si abbassa), stacco, atterraggio con schiacciamento e ritorno elastico. */
export function hop(g: Gesture, vals: Vals, height: number) {
  return Animated.sequence([
    g.tween(vals.squash, 0.93, 110, easeOut),
    Animated.parallel([g.tween(vals.squash, 1.04, 120, easeOut), g.tween(vals.hop, -height, 210, easeOut), g.tween(vals.shadow, 0.78, 210, easeOut), g.tween(vals.hat, -6, 210, easeOut)]),
    Animated.parallel([g.tween(vals.squash, 1, 120), g.tween(vals.hop, 0, 190, easeIn), g.tween(vals.shadow, 1, 190, easeIn), g.tween(vals.hat, 4, 190, easeIn)]),
    Animated.parallel([g.tween(vals.squash, 0.94, 80, easeOut), g.tween(vals.hat, -2, 120)]),
    Animated.parallel([g.tween(vals.squash, 1, 220, back), g.tween(vals.hat, 0, 260, back)]),
  ]);
}

type Cue = [number, Eyes | null, Mouth | null, Brows | null];

interface Timeline {
  /** Stato iniziale; `tilt` serve a partire dall'inclinazione della posa precedente (reazioni senza scatti). */
  start: { at: Record<Side, Pt>; eyes: Eyes; mouth: Mouth; brows: Brows; tilt?: number };
  /** Dove restano le mani a gesto finito (riposo dopo un saluto, oppure la posa). */
  end: Record<Side, Pt>;
  anim: Animated.CompositeAnimation;
  /** Cambi di espressione: [ms, occhi, bocca, sopracciglia] (gli occhi cambiano dentro un battito di ciglia). */
  cues: Cue[];
}

function handAt(side: Side, p: ArmPose, variant: Variant): Pt {
  if (p.at) return p.at;
  const r = armRotations(side, p);
  return armFrame(side, r.upper, r.fore, variant, p.len).palm;
}

/** Il gesto di ogni azione, dal suo stato iniziale all'aspetto finale della posa. */
function timeline(action: MinaAction, look: MinaLook, vals: Vals): Timeline {
  const v = look.variant;
  const len = { L: look.armL.len, R: look.armR.len };
  const posed = { L: handAt('L', look.armL, v), R: handAt('R', look.armR, v) };
  const rest = { L: handAt('L', REST[v].l, v), R: handAt('R', REST[v].r, v) };
  const brows = look.brows ?? 'none';
  const make = (start: Record<Side, Pt>) => new Gesture(vals, v, len, start);
  const still = (): Timeline => {
    const g = make(posed);
    return { start: { at: posed, eyes: look.eyes, mouth: look.mouth, brows }, end: posed, cues: [], anim: g.tween(vals.hop, 0, 0) };
  };
  switch (action) {
    case 'emerge': {
      // intro: esce dal basso a occhi chiusi (la salita la fa l'intro), li apre, sorride e saluta; alla fine il
      // braccio resta alzato, cioè la posa ferma della schermata di Benvenuto, che prende il suo posto senza stacchi
      const g = make(rest);
      return {
        start: { at: rest, eyes: 'closed', mouth: 'small', brows: 'none' },
        end: posed,
        cues: [
          [440, 'open', null, null],
          [540, null, 'smile', 'raised'],
          [1300, null, null, 'none'],
        ],
        anim: Animated.sequence([
          Animated.delay(T(460)),
          Animated.parallel([g.reach('R', posed.R, 250, { arc: 0.32, easing: Easing.out(Easing.back(1.25)) }), g.reach('L', posed.L, 280, { arc: 0.2 }), g.tween(vals.tilt, -2, 250)]),
          Animated.parallel([g.swing('R', [20, -12, 20], 110), Animated.sequence([g.tween(vals.tilt, 1.2, 220), g.tween(vals.tilt, 0, 220)])]),
        ]),
      };
    }
    case 'greet': {
      // sorride e saluta: la mano sale lungo un arco all'esterno, l'avambraccio oscilla due volte dal gomito,
      // poi il braccio torna a riposo con lo stesso arco
      const g = make(rest);
      const wave = handAt('R', ARM.waveR, v);
      return {
        start: { at: rest, eyes: 'open', mouth: 'small', brows: 'none' },
        end: rest,
        cues: [
          [120, null, 'smile', 'raised'],
          [1500, null, null, 'none'],
        ],
        anim: Animated.sequence([
          Animated.parallel([g.reach('R', wave, 560, { arc: 0.32, easing: Easing.out(Easing.back(1.25)) }), g.reach('L', posed.L, 600, { arc: 0.2 }), g.tween(vals.tilt, -2, 460)]),
          Animated.parallel([g.swing('R', [22, -14, 22, -14], 210), Animated.sequence([g.tween(vals.tilt, 1.5, 420), g.tween(vals.tilt, -1.5, 420)])]),
          Animated.delay(T(360)),
          Animated.parallel([g.reach('R', rest.R, 620, { arc: 0.3 }), g.reach('L', rest.L, 620, { arc: 0.15 }), g.tween(vals.tilt, 0, 560)]),
        ]),
      };
    }
    case 'greetL': {
      // lo stesso saluto con la mano sinistra
      const g = make(rest);
      const wave = handAt('L', ARM.waveL, v);
      return {
        start: { at: rest, eyes: 'open', mouth: 'small', brows: 'none' },
        end: rest,
        cues: [[120, null, 'smile', 'raised'], [1500, null, null, 'none']],
        anim: Animated.sequence([
          Animated.parallel([g.reach('L', wave, 560, { arc: 0.32, easing: Easing.out(Easing.back(1.25)) }), g.tween(vals.tilt, 2, 460)]),
          Animated.parallel([g.swing('L', [22, -14, 22, -14], 210), Animated.sequence([g.tween(vals.tilt, -1.5, 420), g.tween(vals.tilt, 1.5, 420)])]),
          Animated.delay(T(360)),
          Animated.parallel([g.reach('L', rest.L, 620, { arc: 0.3 }), g.tween(vals.tilt, 0, 560)]),
        ]),
      };
    }
    case 'happy':
    case 'done': {
      // occhi felici, braccia in alto lungo archi esterni, salto; per «lista completata» anche il pugno di vittoria
      const g = make(rest);
      const big = action === 'done';
      return {
        start: { at: rest, eyes: 'open', mouth: 'smile', brows: 'none' },
        end: posed,
        cues: [[60, 'happy', 'grin', 'raised'], [1800, null, null, 'none']],
        anim: Animated.sequence([
          Animated.parallel([g.reach('L', posed.L, 340, { arc: 0.25, easing: back }), g.reach('R', posed.R, 320, { arc: 0.25, easing: back }), Animated.sequence([Animated.delay(T(120)), g.tween(vals.emote, 1, 260, back)])]),
          hop(g, vals, big ? 18 : 12),
          ...(big ? [g.swing('R', [30], 170), hop(g, vals, 9)] : [Animated.delay(T(80)), hop(g, vals, 7)]),
          Animated.delay(T(400)),
        ]),
      };
    }
    case 'jump': {
      // salto: si carica (braccia indietro, schiacciata), si stacca con le braccia in alto, atterra e si ricompone
      const g = make(rest);
      const up = { L: { x: rest.L.x - 6, y: rest.L.y - 46 }, R: { x: rest.R.x + 6, y: rest.R.y - 46 } };
      const low = { L: { x: rest.L.x - 8, y: rest.L.y + 4 }, R: { x: rest.R.x + 8, y: rest.R.y + 4 } };
      return {
        start: { at: rest, eyes: 'open', mouth: 'smile', brows: 'none' },
        end: rest,
        cues: [[200, 'happy', 'grin', 'raised'], [1400, 'open', 'smile', 'none']],
        anim: Animated.sequence([
          Animated.parallel([g.reach('L', low.L, 200, { arc: 0.1 }), g.reach('R', low.R, 200, { arc: 0.1 }), g.tween(vals.squash, 0.9, 200, easeOut)]),
          Animated.parallel([
            g.reach('L', up.L, 260, { arc: 0.3, easing: easeOut }),
            g.reach('R', up.R, 260, { arc: 0.3, easing: easeOut }),
            g.tween(vals.squash, 1.06, 140, easeOut),
            g.tween(vals.hop, -26, 280, easeOut),
            g.tween(vals.shadow, 0.7, 280, easeOut),
            g.tween(vals.hat, -6, 280, easeOut),
          ]),
          Animated.parallel([g.tween(vals.squash, 1, 160), g.tween(vals.hop, 0, 240, easeIn), g.tween(vals.shadow, 1, 240, easeIn), g.reach('L', rest.L, 300, { arc: 0.2 }), g.reach('R', rest.R, 300, { arc: 0.2 })]),
          g.tween(vals.squash, 0.92, 90, easeOut),
          Animated.parallel([g.tween(vals.squash, 1, 260, back), g.tween(vals.hat, 0, 260, back)]),
        ]),
      };
    }
    case 'pump': {
      // soddisfazione: il pugno sale davanti al corpo e fa due «sì!» dal gomito
      const g = make(rest);
      return {
        start: { at: rest, eyes: 'open', mouth: 'smile', brows: 'none' },
        end: posed,
        cues: [[160, 'happy', 'grin', 'raised'], [1500, null, null, 'none']],
        anim: Animated.sequence([
          Animated.parallel([g.reach('R', posed.R, 380, { arc: 0.25, easing: back }), g.reach('L', posed.L, 420, { arc: 0.15 }), g.tween(vals.tilt, -2, 380)]),
          g.swing('R', [28, 28], 150),
          Animated.parallel([g.tween(vals.tilt, 0, 300), hop(g, vals, 6)]),
        ]),
      };
    }
    case 'lift': {
      // solleva l'oggetto: parte dal fianco, sale sopra la spalla con un piccolo rimbalzo, lei si allunga e saltella
      const g = make({ L: rest.L, R: { x: rest.R.x - 4, y: rest.R.y + 8 } });
      return {
        start: { at: g.cur, eyes: 'open', mouth: 'small', brows: 'none' },
        end: posed,
        cues: [[300, 'happy', 'grin', 'raised'], [1500, null, null, 'none']],
        anim: Animated.sequence([
          Animated.parallel([g.reach('R', posed.R, 520, { arc: 0.3, easing: Easing.out(Easing.back(1.3)) }), g.reach('L', posed.L, 520, { arc: 0.15 }), g.tween(vals.tilt, -3, 520), g.tween(vals.squash, 1.03, 520)]),
          Animated.parallel([g.tween(vals.squash, 1, 200), hop(g, vals, 6)]),
          g.tween(vals.tilt, 0, 300),
        ]),
      };
    }
    case 'think': {
      // pensierosa: la mano arriva al mento con un arco esterno (non passa davanti al viso), lo sguardo sale,
      // le sopracciglia si stringono, il corpo si inclina; poi compare il punto di domanda
      const g = make({ L: posed.L, R: rest.R });
      return {
        start: { at: g.cur, eyes: 'open', mouth: 'small', brows: 'none' },
        end: posed,
        cues: [[240, null, null, 'focus'], [420, null, 'hmm', null]],
        anim: Animated.parallel([
          g.reach('R', posed.R, 620, { arc: 0.45 }),
          Animated.sequence([Animated.delay(T(160)), Animated.parallel([g.tween(vals.gazeY, -3, 420), g.tween(vals.gazeX, 2.5, 420)])]),
          g.tween(vals.tilt, 3, 720, ease),
          Animated.sequence([Animated.delay(T(660)), g.tween(vals.emote, 1, 320, back)]),
        ]),
      };
    }
    case 'recipe': {
      // Mina Chef alza il cucchiaio lungo un arco, piccolo svolazzo, il cappello oscilla, strizza l'occhio
      const g = make(rest);
      return {
        start: { at: rest, eyes: 'open', mouth: 'smile', brows: 'none' },
        end: posed,
        cues: look.eyes === 'wink' ? [[560, 'wink', null, null]] : [],
        anim: Animated.sequence([
          Animated.parallel([g.reach('R', posed.R, 520, { arc: 0.3, easing: Easing.out(Easing.back(1.3)) }), g.reach('L', posed.L, 520, { arc: 0.15 }), g.tween(vals.tilt, -2.5, 480)]),
          g.swing('R', [-14, 8], 180),
          Animated.parallel([g.tween(vals.tilt, 0, 300), g.tween(vals.hat, 3, 150), g.tween(vals.emote, 1, 260, back)]),
          g.tween(vals.hat, 0, 260, back),
        ]),
      };
    }
    case 'stir': {
      // Mina Chef mescola: la ciotola resta ferma, la mano con la frusta fa tre giri piccoli, il cappello ondeggia
      const g = make(posed);
      const c = posed.R;
      const loop = () => [
        g.reach('R', { x: c.x + 4, y: c.y + 1.5 }, 150, { arc: 0, steps: 3, easing: linear }),
        g.reach('R', { x: c.x, y: c.y + 3.5 }, 150, { arc: 0, steps: 3, easing: linear }),
        g.reach('R', { x: c.x - 4, y: c.y + 1.5 }, 150, { arc: 0, steps: 3, easing: linear }),
        g.reach('R', { x: c.x, y: c.y - 1 }, 150, { arc: 0, steps: 3, easing: linear }),
      ];
      return {
        start: { at: posed, eyes: 'open', mouth: look.mouth, brows: 'none' },
        end: posed,
        cues: [[300, look.eyes, null, null]],
        anim: Animated.sequence([
          Animated.parallel([Animated.sequence([...loop(), ...loop(), ...loop()]), Animated.sequence([g.tween(vals.hat, 2, 300), g.tween(vals.hat, -2, 600), g.tween(vals.hat, 0, 300)]), g.tween(vals.tilt, 1.5, 600)]),
          Animated.parallel([g.reach('R', c, 200, { arc: 0 }), g.tween(vals.tilt, 0, 300), g.tween(vals.emote, 1, 260, back)]),
        ]),
      };
    }
    case 'present': {
      // Mina Chef con un oggetto grande (cloche, cartellina): le braccia restano dove sono (l'oggetto non vola),
      // lei si piega appena, fa un saltello, il cappello ondeggia e compaiono i segni
      const g = make(posed);
      return {
        start: { at: posed, eyes: 'open', mouth: look.mouth, brows: 'none' },
        end: posed,
        cues: look.eyes !== 'open' ? [[380, look.eyes, null, null]] : [],
        anim: Animated.sequence([
          g.tween(vals.tilt, 2, 220, easeOut),
          Animated.parallel([g.tween(vals.tilt, -1.5, 260), hop(g, vals, 6)]),
          Animated.parallel([g.tween(vals.tilt, 0, 300, back), g.tween(vals.emote, 1, 260, back)]),
        ]),
      };
    }
    case 'remind': {
      // richiama l'attenzione con garbo: si sporge, alza la mano, due piccoli rimbalzi, poi torna composta
      const g = make({ L: posed.L, R: rest.R });
      return {
        start: { at: g.cur, eyes: 'open', mouth: 'small', brows: 'none' },
        end: { L: posed.L, R: rest.R },
        cues: [[200, null, 'smile', 'raised'], [1700, null, null, 'none']],
        anim: Animated.sequence([
          Animated.parallel([g.reach('R', posed.R, 420, { arc: 0.3, easing: back }), g.tween(vals.tilt, -3, 420), Animated.sequence([Animated.delay(T(200)), g.tween(vals.emote, 1, 260, back)])]),
          g.tween(vals.hop, -5, 150, easeOut),
          g.tween(vals.hop, 0, 150, easeIn),
          g.tween(vals.hop, -4, 140, easeOut),
          g.tween(vals.hop, 0, 160, easeIn),
          Animated.delay(T(800)),
          Animated.parallel([g.reach('R', rest.R, 520, { arc: 0.3 }), g.tween(vals.tilt, 0, 500), g.tween(vals.emote, 0, 300)]),
        ]),
      };
    }
    case 'concern': {
      // vede l'avviso: sopracciglia preoccupate, si inclina verso di lui e lo guarda, lo indica con la mano
      // (traiettoria esterna), resta un momento, poi si ricompone
      const g = make(rest);
      const point = handAt('R', ARM.pointR, v);
      return {
        start: { at: rest, eyes: 'open', mouth: 'small', brows: 'none' },
        end: posed,
        cues: [[80, null, null, 'worried'], [320, null, 'hmm', null]],
        anim: Animated.sequence([
          Animated.parallel([g.reach('L', posed.L, 460, { arc: 0.2 }), g.reach('R', posed.R, 460, { arc: 0.2 }), g.tween(vals.tilt, 2.5, 460), g.tween(vals.gazeX, 2.4, 460), g.tween(vals.gazeY, 1, 460)]),
          Animated.delay(T(160)),
          g.reach('R', point, 440, { arc: 0.3, easing: Easing.out(Easing.back(1.3)) }),
          Animated.delay(T(700)),
          Animated.parallel([g.reach('R', posed.R, 520, { arc: 0.25 }), g.tween(vals.tilt, 0, 500), g.tween(vals.gazeX, 0, 440), g.tween(vals.gazeY, 0, 440)]),
        ]),
      };
    }
    case 'worry': {
      // vede che al pasto qui sotto manca qualcosa: sopracciglia preoccupate, si sporge e guarda in basso verso la
      // card, la mano sinistra la indica, poi resta a guardarla un po' pensierosa (non indica fuori dallo schermo)
      const g = make(rest);
      const down = { x: rest.L.x - 9, y: rest.L.y + 6 };
      return {
        // parte dall'inclinazione del saluto di Home (posa più inclinata all'indietro) e si sporge verso la card
        start: { at: rest, eyes: 'open', mouth: 'small', brows: 'none', tilt: -7 },
        end: posed,
        cues: [
          [60, null, null, 'worried'],
          [260, null, 'hmm', null],
        ],
        anim: Animated.sequence([
          Animated.parallel([
            g.reach('L', down, 420, { arc: 0.2, easing: Easing.out(Easing.back(1.2)) }),
            g.reach('R', posed.R, 420, { arc: 0.15 }),
            g.tween(vals.tilt, -2.5, 420),
            g.tween(vals.gazeX, -1.8, 380),
            g.tween(vals.gazeY, 2.6, 380),
          ]),
          g.swing('L', [8], 160),
          Animated.delay(T(600)),
          Animated.parallel([g.reach('L', posed.L, 420, { arc: 0.15 }), g.tween(vals.tilt, -1, 420)]),
        ]),
      };
    }
    case 'point': {
      // indica il contenuto accanto: il braccio si distende con un rimbalzo, lo sguardo lo segue, piccolo colpetto
      const g = make(rest);
      return {
        start: { at: rest, eyes: 'open', mouth: look.mouth, brows: 'none' },
        end: posed,
        cues: [[100, null, null, 'soft'], [1500, null, null, 'none']],
        anim: Animated.sequence([
          Animated.parallel([g.reach('R', posed.R, 460, { arc: 0.3, easing: Easing.out(Easing.back(1.3)) }), g.reach('L', posed.L, 480, { arc: 0.15 }), g.tween(vals.tilt, -2, 420), g.tween(vals.gazeX, 2.6, 420)]),
          g.swing('R', [10], 200),
          Animated.delay(T(500)),
          Animated.parallel([g.tween(vals.gazeX, 0, 380), g.tween(vals.tilt, 0, 380)]),
        ]),
      };
    }
    default:
      return still();
  }
}

/** Vita a riposo: respiro lento, battiti di ciglia a intervalli irregolari, uno sguardo di lato. Gira sul thread nativo. */
function idleLoop(vals: Vals) {
  const tw = (v: Animated.Value, to: number, ms: number, e: (t: number) => number = ease) => Animated.timing(v, { toValue: to, duration: T(ms), easing: e, useNativeDriver: native });
  const blink = () => Animated.sequence([tw(vals.blink, 0.08, 70, easeIn), tw(vals.blink, 1, 110, easeOut)]);
  const breath = Animated.loop(Animated.sequence([tw(vals.squash, 1.018, 1700, Easing.inOut(Easing.sin)), tw(vals.squash, 1, 1700, Easing.inOut(Easing.sin))]));
  const eyes = Animated.loop(
    Animated.sequence([
      Animated.delay(T(2600)),
      blink(),
      Animated.delay(T(3400)),
      Animated.parallel([tw(vals.gazeX, 2.2, 260), tw(vals.gazeY, -0.6, 260)]),
      Animated.delay(T(900)),
      Animated.parallel([tw(vals.gazeX, 0, 300), tw(vals.gazeY, 0, 300)]),
      Animated.delay(T(1700)),
      blink(),
      Animated.delay(T(160)),
      blink(),
      Animated.delay(T(4200)),
    ]),
  );
  return Animated.parallel([breath, eyes]);
}

/** Vero se la schermata che contiene Mina è in primo piano (fuori dalla navigazione, es. l'intro, sempre vero). */
export function useScreenFocused(): boolean {
  const focused = useContext(IsFocusedContext);
  return focused ?? true;
}

/**
 * Mina 2.0 animata, a livelli: corpo, occhi, sopracciglia, bocca, cappello e braccia curve. Le braccia seguono lo
 * scheletro (spalla e gomito) e sono ridisegnate a ogni fotogramma; le altre parti ruotano attorno al proprio perno
 * sul driver nativo. Senza `animated` o con "Riduci movimento" resta un unico disegno fermo nella posa finale.
 */
export const Mina2 = memo(function Mina2({
  pose = 'neutral',
  size = 120,
  animated = false,
  idle = false,
  interactive = false,
  replayOnFocus = false,
  eyes,
  mouth,
  brows,
  onDone,
  glance,
  accessibilityLabel,
  style,
  replayKey,
  gesture,
}: Mina2Props) {
  const resolved = resolvePose(pose);
  const spec = POSES[resolved];
  const look = useMemo<MinaLook>(() => ({ ...spec.look, ...(eyes ? { eyes } : null), ...(mouth ? { mouth } : null), ...(brows ? { brows } : null) }), [spec, eyes, mouth, brows]);
  const reduced = useReducedMotion();
  const still = !animated || reduced;
  // con `replayOnFocus` ogni ritorno della schermata in primo piano ricrea Mina, che rifà il suo gesto
  const focused = useScreenFocused();
  const [seenFocus, setSeenFocus] = useState(focused);
  const [visits, setVisits] = useState(0);
  // la dissolvenza d'ingresso solo la prima volta: le reazioni successive (cambio di posa) partono da Mina già lì
  const [appeared, setAppeared] = useState(false);
  if (seenFocus !== focused) {
    setSeenFocus(focused);
    if (focused && replayOnFocus) setVisits((n) => n + 1);
  }
  const a11y = accessibilityLabel ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  const W = size;
  const H = size * RATIO;
  const staticXml = useMemo(() => minaStaticSvg(look), [look]);
  if (still && !interactive) {
    return (
      <View {...a11y} style={[{ width: W, height: H }, style]}>
        <SvgXml xml={staticXml} width={W} height={H} />
      </View>
    );
  }
  return (
    <AnimatedMina
      key={`${resolved}|${gesture ?? ''}|${animated}|${reduced}|${idle}|${eyes ?? ''}|${mouth ?? ''}|${brows ?? ''}|${replayKey ?? ''}|${visits}`}
      look={look}
      action={gesture ?? spec.action}
      W={W}
      H={H}
      a11y={a11y}
      style={style}
      reduced={reduced}
      animated={animated}
      idle={idle}
      interactive={interactive}
      onDone={onDone}
      glance={glance}
      entrance={!appeared}
      onAppear={appeared ? undefined : () => setAppeared(true)}
    />
  );
});

function AnimatedMina({
  look,
  action,
  W,
  H,
  a11y,
  style,
  reduced,
  animated,
  idle,
  interactive,
  onDone,
  glance,
  entrance,
  onAppear,
}: {
  look: MinaLook;
  action: MinaAction;
  W: number;
  H: number;
  a11y: object;
  style?: StyleProp<ViewStyle>;
  reduced: boolean;
  animated: boolean;
  idle: boolean;
  interactive: boolean;
  onDone?: () => void;
  glance?: string | number;
  entrance: boolean;
  onAppear?: () => void;
}) {
  const [vals] = useState(makeValues);
  const focused = useScreenFocused();
  const act: MinaAction = animated && !reduced ? action : 'none';
  // Il componente viene ricreato (key) a ogni cambio di posa/gesto: lo stato iniziale nasce qui, non in un effetto.
  const [plan] = useState(() => timeline(act, look, vals));
  const [eyes, setEyes] = useState<Eyes>(plan.start.eyes);
  const [mouth, setMouth] = useState<Mouth>(plan.start.mouth);
  const [brows, setBrows] = useState<Brows>(plan.start.brows);
  const [emote, setEmote] = useState<Emote | undefined>(look.emote);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const idleOn = useRef(false);
  const started = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // occhiata: quando `glance` cambia (non al primo render), Mina guarda un momento il contenuto accanto e poi torna
  const lastGlance = useRef<{ v?: string | number; seen: boolean }>({ seen: false });
  useEffect(() => {
    const st = lastGlance.current;
    if (!st.seen) {
      st.seen = true;
      st.v = glance;
      return;
    }
    if (glance === undefined || st.v === glance) return;
    st.v = glance;
    if (reduced) return;
    const tw = (v: Animated.Value, to: number, ms: number) => Animated.timing(v, { toValue: to, duration: T(ms), easing: easeOut, useNativeDriver: native });
    const a = Animated.sequence([Animated.parallel([tw(vals.gazeX, 2.4, 190), tw(vals.gazeY, 1.5, 190), tw(vals.blink, 0.85, 190)]), Animated.delay(T(430)), Animated.parallel([tw(vals.gazeX, 0, 300), tw(vals.gazeY, 0, 300), tw(vals.blink, 1, 300)])]);
    a.start();
    return () => a.stop();
  }, [glance, reduced, vals]);

  const k = W / VIEW.w;
  /** Trasformazioni attorno a un punto del disegno (px, py), per una vista grande quanto tutto il riquadro. */
  const around = (px: number, py: number, inner: object[]) => {
    const dx = (px - VIEW.x) * k - W / 2;
    const dy = (py - VIEW.y) * k - H / 2;
    return [{ translateX: dx }, { translateY: dy }, ...inner, { translateX: -dx }, { translateY: -dy }] as never;
  };

  /** Cambi di espressione programmati; gli occhi cambiano dentro un battito di ciglia (nessun salto visibile). */
  const schedule = (cues: Cue[]) => {
    for (const [at, e, m, b] of cues) {
      timers.current.push(
        setTimeout(() => {
          if (m) setMouth(m);
          if (b) {
            // le sopracciglia si spengono, cambiano forma e si riaccendono
            Animated.timing(vals.brows, { toValue: 0, duration: T(70), useNativeDriver: native }).start(() => {
              setBrows(b);
              if (b !== 'none') Animated.timing(vals.brows, { toValue: 1, duration: T(160), easing: easeOut, useNativeDriver: native }).start();
            });
          }
          if (e) {
            Animated.timing(vals.blink, { toValue: 0.08, duration: T(60), easing: easeIn, useNativeDriver: native }).start(() => {
              setEyes(e);
              Animated.timing(vals.blink, { toValue: 1, duration: T(110), easing: easeOut, useNativeDriver: native }).start();
            });
          }
        }, T(at)),
      );
    }
  };
  const startIdle = () => {
    if (!idle || reduced) return;
    idleOn.current = true;
    const loop = idleLoop(vals);
    running.current = loop;
    loop.start();
  };
  const stopAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    running.current?.stop();
    running.current = null;
  };
  /** Ferma tutto e porta Mina nella posa di fine gesto (cambio pagina, app in background). */
  const settle = (p: Timeline) => {
    const g = new Gesture(vals, look.variant, { L: look.armL.len, R: look.armR.len }, p.end);
    g.place();
    for (const v of [vals.hop, vals.tilt, vals.gazeX, vals.gazeY, vals.hat]) v.setValue(0);
    for (const v of [vals.squash, vals.shadow, vals.blink, vals.enter, vals.emote]) v.setValue(1);
    vals.brows.setValue(look.brows && look.brows !== 'none' ? 1 : 0);
    timers.current.push(
      setTimeout(() => {
        setEyes(look.eyes);
        setMouth(look.mouth);
        setBrows(look.brows ?? 'none');
      }, 0),
    );
  };

  const run = (p: Timeline) => {
    new Gesture(vals, look.variant, { L: look.armL.len, R: look.armR.len }, p.start.at).place();
    vals.tilt.setValue(p.start.tilt ?? 0);
    vals.brows.setValue(p.start.brows !== 'none' ? 1 : 0);
    vals.emote.setValue(act !== 'none' ? 0 : 1);
    // nell'intro Mina esce dal basso già intera, e una reazione parte da Mina già in scena: niente dissolvenza
    const fadeIn = entrance && act !== 'none' && act !== 'emerge';
    vals.enter.setValue(fadeIn ? 0 : 1);
    schedule(p.cues);
    const intro = fadeIn ? Animated.timing(vals.enter, { toValue: 1, duration: T(320), easing: easeOut, useNativeDriver: native }) : Animated.delay(0);
    const seq = Animated.sequence([intro, p.anim]);
    running.current = seq;
    seq.start(({ finished }) => {
      if (finished) {
        onDoneRef.current?.();
        startIdle();
      }
    });
  };

  useEffect(() => {
    // il gesto parte quando la schermata è in primo piano; lasciandola si ferma e Mina resta composta
    if (!focused) {
      if (started.current) {
        stopAll();
        settle(plan);
      }
      return;
    }
    if (started.current) startIdle();
    else {
      started.current = true;
      run(plan);
      onAppear?.();
    }
    // in background niente animazioni; al ritorno riprende la vita a riposo
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') running.current?.stop();
      else if (idleOn.current) startIdle();
    });
    return () => {
      stopAll();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  /** Tocco: un saltello felice, poi torna alla posa di partenza. */
  const onTap = () => {
    stopAll();
    // Mina Chef con un oggetto in mano non alza le braccia (l'oggetto resta dritto): solo il saltello felice
    const holds = look.variant === 'chef' && (look.armR.prop ?? 'none') !== 'none';
    const cheer = holds ? { l: look.armL, r: look.armR } : CHEER[look.variant];
    const tapEmote = look.variant === 'chef' ? (look.emote ?? 'shine') : 'sparkles';
    const from = plan.end;
    const g = new Gesture(vals, look.variant, { L: look.armL.len, R: look.armR.len }, from);
    const up = { L: handAt('L', cheer.l, look.variant), R: handAt('R', cheer.r, look.variant) };
    setEmote(tapEmote);
    vals.emote.setValue(0);
    for (const v of [vals.hop, vals.tilt, vals.gazeX, vals.gazeY, vals.hat]) v.setValue(0);
    for (const v of [vals.squash, vals.shadow, vals.blink]) v.setValue(1);
    schedule([[40, 'happy', 'grin', 'raised']]);
    const a = Animated.sequence([
      Animated.parallel([g.reach('L', up.L, 300, { arc: 0.25, easing: back }), g.reach('R', up.R, 300, { arc: 0.25, easing: back }), g.tween(vals.emote, 1, 260, back)]),
      hop(g, vals, 12),
      Animated.parallel([g.reach('L', from.L, 420, { arc: 0.2 }), g.reach('R', from.R, 420, { arc: 0.2 }), g.tween(vals.emote, 0, 300)]),
    ]);
    running.current = a;
    a.start(({ finished }) => {
      if (!finished) return;
      setEmote(look.emote);
      schedule([[0, look.eyes, look.mouth, look.brows ?? 'none']]);
      timers.current.push(setTimeout(startIdle, T(200)));
    });
  };

  const variant = look.variant;
  const rig = RIG[variant];
  const lean = look.lean ?? 0;
  const bow = look.bow !== false;
  const xml = {
    shadow: cached(`shadow-${variant}`, () => shadowPart(variant)),
    legs: cached(`legs-${variant}-${look.legs ?? 'stand'}`, () => legsPart(look.legs, variant)),
    body: cached(`body-${variant}-${bow}`, () => bodyPart(variant, { bow })),
    hat: variant === 'chef' ? cached('hat', hatPart) : null,
    eyes: cached(`eyes-${variant}-${eyes}`, () => eyesPart(eyes, variant)),
    brows: brows !== 'none' ? cached(`brows-${variant}-${brows}`, () => browsPart(brows, variant)) : null,
    mouth: cached(`mouth-${variant}-${mouth}`, () => mouthPart(mouth, variant)),
    emote: emote ? cached(`emote-${variant}-${emote}-${lean}`, () => emotePart(emote, lean, variant), true) : null,
    bowl: look.bowl ? cached(`bowl-${look.bowl.cx}-${look.bowl.ry}-${look.bowl.tilt}`, () => bowlPart(look.bowl!.cx, look.bowl!.ry, look.bowl!.tilt)) : null,
    bowlFront: look.bowl ? cached(`bowlf-${look.bowl.cx}-${look.bowl.ry}-${look.bowl.tilt}`, () => bowlFrontPart(look.bowl!.cx, look.bowl!.ry, look.bowl!.tilt)) : null,
  };
  const fill: ViewStyle = { position: 'absolute', left: 0, top: 0, width: W, height: H };
  // ogni livello occupa tutto il riquadro, sovrapposto agli altri (stesse coordinate per tutte le parti)
  const layer = (x: string, pad = false) => (
    <View style={fill} pointerEvents="none">
      {pad ? (
        <SvgXml xml={x} width={W + 2 * PAD * k} height={H + 2 * PAD * k} style={{ position: 'absolute', left: -PAD * k, top: -PAD * k }} />
      ) : (
        <SvgXml xml={x} width={W} height={H} />
      )}
    </View>
  );
  const arms = <Arms look={look} vals={vals} W={W} H={H} k={k} start={plan.start.at} />;

  const body = (
    <Animated.View
      style={[
        fill,
        {
          transform: around(rig.bodyPivot.x, rig.bodyPivot.y, [
            { translateY: Animated.multiply(vals.hop, k) },
            { rotate: deg(vals.tilt) },
            { scaleY: vals.squash },
            { scaleX: vals.squash.interpolate({ inputRange: [0.8, 1, 1.2], outputRange: [1.1, 1, 0.92] }) },
          ]),
        },
      ]}
    >
      {/* inclinazione della posa: attorno ai piedi per Mina 2.0, attorno al centro della borsa per Mina Chef */}
      <View style={[fill, { transform: around(rig.leanPivot.x, rig.leanPivot.y, [{ rotate: `${lean}deg` }]) }]} pointerEvents="none">
        {layer(xml.legs)}
        {layer(xml.body)}
        {xml.bowl ? layer(xml.bowl) : null}
        {xml.hat ? <Animated.View style={[fill, { transform: around(rig.hatPivot.x, rig.hatPivot.y, [{ rotate: deg(vals.hat) }]) }]}>{layer(xml.hat)}</Animated.View> : null}
        <Animated.View
          style={[fill, { transform: around(rig.eyesCenter.x, rig.eyesCenter.y, [{ translateX: Animated.multiply(vals.gazeX, k) }, { translateY: Animated.multiply(vals.gazeY, k) }, { scaleY: vals.blink }]) }]}
        >
          {layer(xml.eyes)}
        </Animated.View>
        {xml.brows ? (
          <Animated.View
            style={[
              fill,
              {
                opacity: vals.brows,
                transform: [{ translateX: Animated.multiply(vals.gazeX, k * 0.6) }, { translateY: Animated.add(Animated.multiply(vals.gazeY, k * 0.6), vals.brows.interpolate({ inputRange: [0, 1], outputRange: [3 * k, 0] })) }],
              },
            ]}
          >
            {layer(xml.brows)}
          </Animated.View>
        ) : null}
        {layer(xml.mouth)}
        {arms}
        {xml.emote ? (
          <Animated.View style={[fill, { opacity: vals.emote, transform: around(EMOTE_PIVOT.x, EMOTE_PIVOT.y, [{ scale: vals.emote.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]) }]}>{layer(xml.emote, true)}</Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );

  const content = (
    <Animated.View
      style={{
        width: W,
        height: H,
        opacity: vals.enter,
        transform: [{ translateY: vals.enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: vals.enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
      }}
    >
      {/* spostamento della figura (pose con oggetti larghi, es. la cloche) */}
      <View style={[fill, { transform: [{ translateX: (look.shift ?? 0) * k }] }]} pointerEvents="none">
        <Animated.View style={[fill, { transform: around(rig.bodyPivot.x, rig.bodyPivot.y + 2, [{ scaleX: vals.shadow }]) }]}>{layer(xml.shadow)}</Animated.View>
        {body}
      </View>
    </Animated.View>
  );

  if (interactive && !reduced) {
    return (
      <Pressable {...a11y} style={[{ width: W, height: H }, style]} onPress={onTap} accessibilityHint="Mina fa un saltello">
        {content}
      </Pressable>
    );
  }
  return (
    <View {...a11y} style={[{ width: W, height: H }, styles.clip, style]}>
      {content}
    </View>
  );
}

// ───────────────────────────── braccia curve, ridisegnate a ogni fotogramma ─────────────────────────────

/**
 * Le due braccia: tubo curvo (contorno e riempimento), mano e oggetto. Ascolta i quattro angoli dello scheletro e si
 * ridisegna una volta per fotogramma; la mano e l'oggetto sono disegni fissi spostati e ruotati sul polso, quindi
 * restano sempre attaccati al braccio. Con la ciotola: braccio destro (frusta), bordo della ciotola, braccio sinistro.
 */
export function Arms({ look, vals, W, H, k, start }: { look: MinaLook; vals: Vals; W: number; H: number; k: number; start: Record<Side, Pt> }) {
  const variant = look.variant;
  const [a, setAngles] = useState(() => {
    const g = new Gesture(vals, variant, { L: look.armL.len, R: look.armR.len }, start);
    return { lU: g.ang.L.upper, lF: g.ang.L.fore, rU: g.ang.R.upper, rF: g.ang.R.fore };
  });
  useEffect(() => {
    // i quattro aggiornamenti di un fotogramma arrivano nello stesso turno: React li raggruppa in un solo ridisegno
    const keys = ['lU', 'lF', 'rU', 'rF'] as const;
    const ids = keys.map((key) => vals[key].addListener(({ value }) => setAngles((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))));
    return () => keys.forEach((key, i) => vals[key].removeListener(ids[i]));
  }, [vals]);

  const frame = { L: armFrame('L', a.lU, a.lF, variant, look.armL.len), R: armFrame('R', a.rU, a.rF, variant, look.armR.len) };
  const fill: ViewStyle = { position: 'absolute', left: 0, top: 0, width: W, height: H };
  const centerAround = (px: number, py: number) => ({ dx: (px - VIEW.x) * k - W / 2, dy: (py - VIEW.y) * k - H / 2 });

  const one = (side: Side) => {
    const pose = side === 'L' ? look.armL : look.armR;
    const f: ArmFrame = frame[side];
    const prop = pose.prop ?? 'none';
    const h0 = handRest(side, variant, pose.len);
    const c = centerAround(h0.x, h0.y);
    const handT = [{ translateX: (f.w.x - h0.x) * k }, { translateY: (f.w.y - h0.y) * k }, { translateX: c.dx }, { translateY: c.dy }, { rotate: `${f.hand}deg` }, { translateX: -c.dx }, { translateY: -c.dy }];
    const p0 = { x: h0.x, y: h0.y + 3 };
    const cp = centerAround(p0.x, p0.y);
    const propT = [{ translateX: (f.palm.x - p0.x) * k }, { translateY: (f.palm.y - p0.y) * k }, { translateX: cp.dx }, { translateY: cp.dy }, { rotate: `${pose.propTilt ?? 0}deg` }, { translateX: -cp.dx }, { translateY: -cp.dy }];
    const len = pose.len?.join('/') ?? '';
    const handXml = (pass: 'outline' | 'fill') => cached(`hand-${variant}-${side}-${pass}-${prop}-${len}`, () => handRestSvg(side, pass, prop, variant, pose.len), true);
    const padded = (xml: string, transform: object[], key: string) => (
      <View key={key} style={[fill, { transform: transform as never }]} pointerEvents="none">
        <SvgXml xml={xml} width={W + 2 * PAD * k} height={H + 2 * PAD * k} style={{ position: 'absolute', left: -PAD * k, top: -PAD * k }} />
      </View>
    );
    const tube = (pass: 'outline' | 'fill') => {
      const st = tubeStyle(variant, pass);
      return (
        <Svg key={`t${side}${pass}`} width={W} height={H} viewBox={VIEWBOX} style={styles.abs} pointerEvents="none">
          <Path d={tubeD(f)} stroke={st.stroke} strokeWidth={st.width} strokeLinecap="round" fill="none" />
        </Svg>
      );
    };
    const held = prop === 'none' ? null : padded(cached(`prop-${variant}-${side}-${prop}-${len}`, () => propRestSvg(prop, side, variant, pose.len), true), propT, `p${side}`);
    const hand = (pass: 'outline' | 'fill') => padded(handXml(pass), handT, `h${side}${pass}`);
    const order = propLayer(prop);
    if (order === 'between') return [tube('outline'), tube('fill'), held, hand('outline'), hand('fill')];
    if (order === 'over') return [tube('outline'), hand('outline'), tube('fill'), hand('fill'), held];
    return [held, tube('outline'), hand('outline'), tube('fill'), hand('fill')];
  };

  const bowlFront = look.bowl ? cached(`bowlf-${look.bowl.cx}-${look.bowl.ry}-${look.bowl.tilt}`, () => bowlFrontPart(look.bowl!.cx, look.bowl!.ry, look.bowl!.tilt)) : null;
  return (
    <View style={fill} pointerEvents="none">
      {look.bowl ? (
        <>
          {one('R')}
          <View style={fill} pointerEvents="none">
            <SvgXml xml={bowlFront!} width={W} height={H} />
          </View>
          {one('L')}
        </>
      ) : (
        <>
          {one('L')}
          {one('R')}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'visible' }, abs: { position: 'absolute', left: 0, top: 0 } });

/** Mina piccola, statica, ritagliata sul viso (righe, badge). */
export const Mina2Badge = memo(function Mina2Badge({ size = 36, variant = 'classic', style }: { size?: number; variant?: 'classic' | 'chef'; style?: StyleProp<ViewStyle> }) {
  const xml = useMemo(
    () =>
      minaStaticSvg(
        variant === 'chef'
          ? { variant, eyes: 'open', mouth: 'smile', armL: REST.chef.l, armR: REST.chef.r }
          : { ...POSES.neutral.look, armL: ARM.restL, armR: ARM.restR },
        { shadow: false, viewBox: variant === 'chef' ? '18 2 150 150' : '30 22 140 140' },
      ),
    [variant],
  );
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
});
