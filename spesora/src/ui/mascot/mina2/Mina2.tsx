import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useReducedMotion } from '../../useReducedMotion';
import {
  BODY_PIVOT,
  EMOTE_PIVOT,
  EYES_CENTER,
  HAT_PIVOT,
  SHOULDER,
  VIEW,
  armRotations,
  bodyPart,
  elbowRest,
  emotePart,
  eyesPart,
  foreArmPart,
  hatPart,
  legsPart,
  minaStaticSvg,
  mouthPart,
  propLocalRotation,
  shadowPart,
  svg,
  upperArmPart,
  type ArmPose,
  type Emote,
  type Eyes,
  type MinaLook,
  type Mouth,
  type Side,
} from './art';
import { ARM, POSES, resolvePose, type MinaAction, type MinaPose } from './poses';

const native = Platform.OS !== 'web';
const RATIO = VIEW.h / VIEW.w;

/** Cache delle stringhe SVG: le stesse parti servono a tutte le istanze. */
const xmlCache = new Map<string, string>();
function cached(key: string, make: () => string): string {
  let v = xmlCache.get(key);
  if (!v) {
    v = svg(make());
    xmlCache.set(key, v);
  }
  return v;
}

export interface Mina2Props {
  pose?: MinaPose | string;
  /** Larghezza in punti (l'altezza è 1,16 × la larghezza). */
  size?: number;
  /** Entra con il gesto della posa (saluto, felice, pensierosa…). Rispetta "Riduci movimento". */
  animated?: boolean;
  /** Dopo il gesto resta viva: respiro, battito di ciglia, sguardo. Solo per le Mina grandi in primo piano. */
  idle?: boolean;
  /** Toccando Mina, reagisce con un piccolo salto felice. */
  interactive?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Ripete il gesto quando cambia (es. lista appena completata). */
  replayKey?: string | number;
}

type Vals = ReturnType<typeof makeValues>;

function makeValues() {
  const v = (n: number) => new Animated.Value(n);
  return {
    enter: v(0),
    hop: v(0), // unità del disegno, negativo = in alto
    squash: v(1),
    tilt: v(0),
    shadow: v(1),
    lU: v(0),
    lF: v(0),
    rU: v(0),
    rF: v(0),
    blink: v(1),
    gazeX: v(0),
    gazeY: v(0),
    hat: v(0),
    emote: v(0),
  };
}

const deg = (a: Animated.Value) => a.interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] });

/** Imposta le braccia direttamente su una posa (senza animazione). */
function setArms(vals: Vals, l: ArmPose, r: ArmPose) {
  const L = armRotations('L', l);
  const R = armRotations('R', r);
  vals.lU.setValue(L.upper);
  vals.lF.setValue(L.fore);
  vals.rU.setValue(R.upper);
  vals.rF.setValue(R.fore);
}

const ease = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.quad);
const back = Easing.out(Easing.back(1.6));

function tween(v: Animated.Value, to: number, ms: number, easing: (t: number) => number = ease) {
  return Animated.timing(v, { toValue: to, duration: ms, easing, useNativeDriver: native });
}

/** Braccio verso una posa: spalla e gomito partono insieme ma il gomito arriva un po' dopo (sovrapposizione). */
function armTo(vals: Vals, side: Side, pose: ArmPose, ms: number, easing: (t: number) => number = easeOut) {
  const r = armRotations(side, pose);
  const [u, f] = side === 'L' ? [vals.lU, vals.lF] : [vals.rU, vals.rF];
  return Animated.parallel([tween(u, r.upper, ms, easing), Animated.sequence([Animated.delay(ms * 0.12), tween(f, r.fore, ms * 0.95, easing)])]);
}

/** Salto con anticipo (si abbassa), stacco, atterraggio con schiacciamento e ritorno elastico. */
function hop(vals: Vals, height: number) {
  return Animated.sequence([
    Animated.parallel([tween(vals.squash, 0.93, 110, easeOut)]),
    Animated.parallel([tween(vals.squash, 1.04, 120, easeOut), tween(vals.hop, -height, 210, easeOut), tween(vals.shadow, 0.78, 210, easeOut), tween(vals.hat, -6, 210, easeOut)]),
    Animated.parallel([tween(vals.squash, 1, 120), tween(vals.hop, 0, 190, easeIn), tween(vals.shadow, 1, 190, easeIn), tween(vals.hat, 4, 190, easeIn)]),
    Animated.parallel([tween(vals.squash, 0.94, 80, easeOut), tween(vals.hat, -2, 120)]),
    Animated.parallel([tween(vals.squash, 1, 220, back), tween(vals.hat, 0, 260, back)]),
  ]);
}

interface Timeline {
  start: { l: ArmPose; r: ArmPose; eyes: Eyes; mouth: Mouth; emote?: Emote };
  anim: Animated.CompositeAnimation;
  /** Cambi di espressione: [ms, occhi, bocca] (gli occhi cambiano dentro un battito di ciglia). */
  cues: [number, Eyes | null, Mouth | null][];
}

/** Il gesto di ogni azione, dal suo stato iniziale all'aspetto finale della posa. */
function timeline(action: MinaAction, look: MinaLook, vals: Vals): Timeline {
  const rest = { l: ARM.restL, r: ARM.restR };
  switch (action) {
    case 'greet': {
      // Mina appare, sorride e saluta con la mano destra (due oscillazioni dal gomito), poi la abbassa
      const wave = armRotations('R', ARM.waveR);
      const swing = (to: number, ms: number) => tween(vals.rF, to, ms, Easing.inOut(Easing.sin));
      return {
        start: { ...rest, eyes: 'open', mouth: 'small' },
        cues: [[120, null, 'smile']],
        anim: Animated.sequence([
          Animated.parallel([armTo(vals, 'R', ARM.waveR, 420, back), armTo(vals, 'L', ARM.hipL, 480), tween(vals.tilt, -2, 420)]),
          swing(wave.fore + 26, 190),
          Animated.parallel([swing(wave.fore - 12, 230), tween(vals.tilt, 1.5, 230)]),
          swing(wave.fore + 26, 230),
          Animated.parallel([swing(wave.fore - 12, 230), tween(vals.tilt, -1.5, 230)]),
          swing(wave.fore, 190),
          Animated.delay(450),
          Animated.parallel([armTo(vals, 'R', ARM.restR, 520, ease), tween(vals.tilt, 0, 520)]),
        ]),
      };
    }
    case 'happy':
    case 'done': {
      // occhi che si chiudono felici, braccia in alto, salto; per «lista completata» anche un pugno di vittoria
      const big = action === 'done';
      const cheer = armRotations('R', ARM.cheerR);
      return {
        start: { ...rest, eyes: 'open', mouth: 'smile' },
        cues: [[60, 'happy', 'grin']],
        anim: Animated.sequence([
          Animated.parallel([armTo(vals, 'L', look.armL, 320, back), armTo(vals, 'R', look.armR, 300, back), Animated.sequence([Animated.delay(120), tween(vals.emote, 1, 260, back)])]),
          hop(vals, big ? 18 : 12),
          ...(big
            ? [tween(vals.rF, cheer.fore + 30, 150, easeOut), tween(vals.rF, cheer.fore, 220, back), hop(vals, 9)]
            : [Animated.delay(80), hop(vals, 7)]),
          Animated.delay(500),
        ]),
      };
    }
    case 'think': {
      // guarda in alto, porta la mano al mento, inclina appena il corpo; poi compare il punto di domanda
      return {
        start: { l: ARM.hipL, r: ARM.restR, eyes: 'open', mouth: 'small' },
        cues: [[380, null, 'hmm']],
        anim: Animated.parallel([
          armTo(vals, 'R', look.armR, 560, ease),
          Animated.sequence([Animated.delay(140), Animated.parallel([tween(vals.gazeY, -3, 420), tween(vals.gazeX, 2.5, 420)])]),
          tween(vals.tilt, 3, 700, ease),
          Animated.sequence([Animated.delay(620), tween(vals.emote, 1, 320, back)]),
        ]),
      };
    }
    case 'recipe': {
      // Mina Chef alza il cucchiaio con un piccolo svolazzo, strizza l'occhio
      const r = armRotations('R', look.armR);
      return {
        start: { ...rest, eyes: 'open', mouth: 'smile' },
        cues: look.eyes === 'wink' ? [[520, 'wink', null]] : [],
        anim: Animated.sequence([
          Animated.parallel([armTo(vals, 'R', look.armR, 460, back), armTo(vals, 'L', look.armL, 480), tween(vals.tilt, -2.5, 460)]),
          tween(vals.rF, r.fore - 18, 170, Easing.inOut(Easing.sin)),
          tween(vals.rF, r.fore + 10, 200, Easing.inOut(Easing.sin)),
          Animated.parallel([tween(vals.rF, r.fore, 220, back), tween(vals.tilt, 0, 300), tween(vals.hat, 3, 150)]),
          tween(vals.hat, 0, 260, back),
        ]),
      };
    }
    case 'remind': {
      // richiama l'attenzione con garbo: si sporge, alza la mano, due piccoli rimbalzi
      return {
        start: { l: ARM.hipL, r: ARM.restR, eyes: 'open', mouth: 'small' },
        cues: [[200, null, 'smile']],
        anim: Animated.sequence([
          Animated.parallel([armTo(vals, 'R', look.armR, 380, back), tween(vals.tilt, -3, 380), Animated.sequence([Animated.delay(200), tween(vals.emote, 1, 260, back)])]),
          tween(vals.hop, -5, 150, easeOut),
          tween(vals.hop, 0, 150, easeIn),
          tween(vals.hop, -4, 140, easeOut),
          tween(vals.hop, 0, 160, easeIn),
          Animated.delay(900),
          Animated.parallel([armTo(vals, 'R', ARM.restR, 500, ease), tween(vals.tilt, 0, 500), tween(vals.emote, 0, 300)]),
        ]),
      };
    }
    default:
      return { start: { l: look.armL, r: look.armR, eyes: look.eyes, mouth: look.mouth, emote: look.emote }, cues: [], anim: Animated.delay(0) };
  }
}

/** Vita a riposo: respiro lento, battiti di ciglia a intervalli irregolari, uno sguardo di lato. Gira sul thread nativo. */
function idleLoop(vals: Vals) {
  const blink = () => Animated.sequence([tween(vals.blink, 0.08, 70, easeIn), tween(vals.blink, 1, 110, easeOut)]);
  const breath = Animated.loop(Animated.sequence([tween(vals.squash, 1.018, 1700, Easing.inOut(Easing.sin)), tween(vals.squash, 1, 1700, Easing.inOut(Easing.sin))]));
  const eyes = Animated.loop(
    Animated.sequence([
      Animated.delay(2600),
      blink(),
      Animated.delay(3400),
      Animated.parallel([tween(vals.gazeX, 2.2, 260), tween(vals.gazeY, -0.6, 260)]),
      Animated.delay(900),
      Animated.parallel([tween(vals.gazeX, 0, 300), tween(vals.gazeY, 0, 300)]),
      Animated.delay(1700),
      blink(),
      Animated.delay(160),
      blink(),
      Animated.delay(4200),
    ]),
  );
  return Animated.parallel([breath, eyes]);
}

/**
 * Mina 2.0 animata, a livelli: ogni parte ruota attorno al proprio perno (spalla, gomito, base del cappello,
 * centro degli occhi, piedi). Le animazioni usano il driver nativo; senza `animated` o con "Riduci movimento"
 * resta un unico disegno fermo nella posa finale.
 */
export const Mina2 = memo(function Mina2({ pose = 'neutral', size = 120, animated = false, idle = false, interactive = false, accessibilityLabel, style, replayKey }: Mina2Props) {
  const resolved = resolvePose(pose);
  const spec = POSES[resolved];
  const reduced = useReducedMotion();
  const still = !animated || reduced;
  const a11y = accessibilityLabel ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  const W = size;
  const H = size * RATIO;
  const staticXml = useMemo(() => minaStaticSvg(spec.look), [spec]);
  if (still && !interactive) {
    return (
      <View {...a11y} style={[{ width: W, height: H }, style]}>
        <SvgXml xml={staticXml} width={W} height={H} />
      </View>
    );
  }
  return (
    <AnimatedMina
      key={`${resolved}|${animated}|${reduced}|${idle}|${replayKey ?? ''}`}
      pose={resolved}
      W={W}
      H={H}
      a11y={a11y}
      style={style}
      reduced={reduced}
      animated={animated}
      idle={idle}
      interactive={interactive}
    />
  );
});

function AnimatedMina({
  pose,
  W,
  H,
  a11y,
  style,
  reduced,
  animated,
  idle,
  interactive,
}: {
  pose: MinaPose;
  W: number;
  H: number;
  a11y: object;
  style?: StyleProp<ViewStyle>;
  reduced: boolean;
  animated: boolean;
  idle: boolean;
  interactive: boolean;
}) {
  const spec = POSES[pose];
  const look = spec.look;
  const [vals] = useState(makeValues);
  // Il componente viene ricreato (key) a ogni cambio di posa/gesto: lo stato iniziale nasce qui, non in un effetto.
  const [plan] = useState(() => timeline(animated && !reduced ? spec.action : 'none', look, vals));
  const [eyes, setEyes] = useState<Eyes>(plan.start.eyes);
  const [mouth, setMouth] = useState<Mouth>(plan.start.mouth);
  const [emote, setEmote] = useState<Emote | undefined>(look.emote);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const idleOn = useRef(false);

  const k = W / VIEW.w;
  /** Trasformazioni attorno a un punto del disegno (px, py), per una vista grande quanto tutto il riquadro. */
  const around = (px: number, py: number, inner: object[]) => {
    const dx = (px - VIEW.x) * k - W / 2;
    const dy = (py - VIEW.y) * k - H / 2;
    return [{ translateX: dx }, { translateY: dy }, ...inner, { translateX: -dx }, { translateY: -dy }] as never;
  };

  /** Cambi di espressione programmati; gli occhi cambiano dentro un battito di ciglia (nessun salto visibile). */
  const schedule = (cues: Timeline['cues']) => {
    for (const [at, e, m] of cues) {
      timers.current.push(
        setTimeout(() => {
          if (m) setMouth(m);
          if (e) {
            tween(vals.blink, 0.08, 60, easeIn).start(() => {
              setEyes(e);
              tween(vals.blink, 1, 100, easeOut).start();
            });
          }
        }, at),
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
  };

  useEffect(() => {
    setArms(vals, plan.start.l, plan.start.r);
    vals.emote.setValue(animated && !reduced && spec.action !== 'none' ? 0 : 1);
    vals.enter.setValue(animated && !reduced ? 0 : 1);
    schedule(plan.cues);
    const intro = animated && !reduced ? tween(vals.enter, 1, 320, easeOut) : Animated.delay(0);
    const seq = Animated.sequence([intro, plan.anim]);
    running.current = seq;
    seq.start(({ finished }) => {
      if (finished) startIdle();
    });
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
  }, []);

  /** Tocco: un saltello felice, poi torna alla posa di partenza. */
  const onTap = () => {
    stopAll();
    const tl = timeline('happy', { ...look, eyes: 'happy', mouth: 'grin', armL: ARM.cheerL, armR: ARM.cheerR, emote: 'sparkles' }, vals);
    setEmote('sparkles');
    vals.emote.setValue(0);
    for (const v of [vals.hop, vals.tilt, vals.gazeX, vals.gazeY, vals.hat]) v.setValue(0);
    for (const v of [vals.squash, vals.shadow, vals.blink]) v.setValue(1);
    schedule(tl.cues);
    running.current = tl.anim;
    tl.anim.start(({ finished }) => {
      if (!finished) return;
      Animated.parallel([armTo(vals, 'L', look.armL, 420, ease), armTo(vals, 'R', look.armR, 420, ease), tween(vals.emote, 0, 300)]).start(() => setEmote(look.emote));
      tween(vals.blink, 0.08, 60, easeIn).start(() => {
        setEyes(look.eyes);
        setMouth(look.mouth);
        tween(vals.blink, 1, 100, easeOut).start(startIdle);
      });
    });
  };

  const variant = look.variant;
  const xml = {
    shadow: cached('shadow', shadowPart),
    legs: cached(`legs-${look.legs ?? 'stand'}`, () => legsPart(look.legs)),
    body: cached(`body-${variant}`, () => bodyPart(variant)),
    hat: variant === 'chef' ? cached('hat', hatPart) : null,
    eyes: cached(`eyes-${eyes}`, () => eyesPart(eyes)),
    mouth: cached(`mouth-${mouth}`, () => mouthPart(mouth)),
    emote: emote ? cached(`emote-${emote}`, () => emotePart(emote)) : null,
  };
  const armXml = (side: Side, pass: 'outline' | 'fill', p: ArmPose) => {
    const prop = p.prop ?? 'none';
    const rot = Math.round(propLocalRotation(side, p));
    return {
      upper: cached(`u-${side}-${pass}`, () => upperArmPart(side, pass)),
      fore: cached(`f-${side}-${pass}-${prop}-${rot}`, () => foreArmPart(side, pass, prop, rot)),
    };
  };
  const fill: ViewStyle = { position: 'absolute', left: 0, top: 0, width: W, height: H };
  // ogni livello occupa tutto il riquadro, sovrapposto agli altri (stesse coordinate per tutte le parti)
  const layer = (x: string) => (
    <View style={fill} pointerEvents="none">
      <SvgXml xml={x} width={W} height={H} />
    </View>
  );

  const arm = (side: Side, pass: 'outline' | 'fill') => {
    const p = side === 'L' ? look.armL : look.armR;
    const x = armXml(side, pass, p);
    const s = SHOULDER[side];
    const e = elbowRest(side);
    const [u, f] = side === 'L' ? [vals.lU, vals.lF] : [vals.rU, vals.rF];
    return (
      <Animated.View key={`${side}${pass}`} style={[fill, { transform: around(s.x, s.y, [{ rotate: deg(u) }]) }]}>
        {layer(x.upper)}
        <Animated.View style={[fill, { transform: around(e.x, e.y, [{ rotate: deg(f) }]) }]}>{layer(x.fore)}</Animated.View>
      </Animated.View>
    );
  };

  const body = (
    <Animated.View
      style={[
        fill,
        {
          transform: around(BODY_PIVOT.x, BODY_PIVOT.y, [
            { translateY: Animated.multiply(vals.hop, k) },
            { rotate: deg(vals.tilt) },
            { rotate: `${look.lean ?? 0}deg` },
            { scaleY: vals.squash },
            { scaleX: vals.squash.interpolate({ inputRange: [0.8, 1, 1.2], outputRange: [1.1, 1, 0.92] }) },
          ]),
        },
      ]}
    >
      {layer(xml.legs)}
      {layer(xml.body)}
      {xml.hat ? <Animated.View style={[fill, { transform: around(HAT_PIVOT.x, HAT_PIVOT.y, [{ rotate: deg(vals.hat) }]) }]}>{layer(xml.hat)}</Animated.View> : null}
      <Animated.View
        style={[fill, { transform: around(EYES_CENTER.x, EYES_CENTER.y, [{ translateX: Animated.multiply(vals.gazeX, k) }, { translateY: Animated.multiply(vals.gazeY, k) }, { scaleY: vals.blink }]) }]}
      >
        {layer(xml.eyes)}
      </Animated.View>
      {layer(xml.mouth)}
      {arm('L', 'outline')}
      {arm('R', 'outline')}
      {arm('L', 'fill')}
      {arm('R', 'fill')}
      {xml.emote ? (
        <Animated.View style={[fill, { opacity: vals.emote, transform: around(EMOTE_PIVOT.x, EMOTE_PIVOT.y, [{ scale: vals.emote.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]) }]}>{layer(xml.emote)}</Animated.View>
      ) : null}
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
      <Animated.View style={[fill, { transform: around(BODY_PIVOT.x, BODY_PIVOT.y + 2, [{ scaleX: vals.shadow }]) }]}>{layer(xml.shadow)}</Animated.View>
      {body}
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

const styles = StyleSheet.create({ clip: { overflow: 'visible' } });

/** Mina piccola, statica, ritagliata sul viso (righe, badge). */
export const Mina2Badge = memo(function Mina2Badge({ size = 36, variant = 'classic', style }: { size?: number; variant?: 'classic' | 'chef'; style?: StyleProp<ViewStyle> }) {
  const xml = useMemo(
    () => minaStaticSvg({ ...POSES.neutral.look, variant, armL: ARM.restL, armR: ARM.restR }, { shadow: false, viewBox: variant === 'chef' ? '28 -10 148 148' : '30 22 140 140' }),
    [variant],
  );
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
});
