import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, AppState, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { useReducedMotion } from '../useReducedMotion';
import {
  APRON_BOX,
  C,
  EMOTE_PIVOT,
  FEET_Y,
  RIG,
  VIEW,
  VIEWBOX,
  apronPart,
  armSvg,
  bodyPart,
  browsPart,
  emotePart,
  eyesPart,
  handRest,
  hatPart,
  legsPart,
  minaStaticSvg,
  mouthPart,
  poseFrame,
  propRestSvg,
  shadowPart,
  type Eyes,
  type MinaLook,
  type Mouth,
  type Pt,
  type Side,
} from './mina2/art';
import { Arms, Gesture, PAD, RATIO, T, cached, makeValues, useScreenFocused } from './mina2/Mina2';
import { CHEF_ARM, POSES } from './mina2/poses';

const native = Platform.OS !== 'web';

/** Mina 2.0 all'inizio (com'è in casa) e Mina Chef alla fine (la posa «cucchiaio e occhiolino» del suo foglio). */
const START: MinaLook = POSES.neutral.look;
const FINAL: MinaLook = POSES.cooking.look;

/** Anello verde in prospettiva (coordinate del disegno): nasce ai piedi, sale e cambia Mina mentre la attraversa. */
const RING = { cx: 100, cy: 100, rx: 88, ry: 13 } as const;
/** La maschera segue l'arco davanti dell'anello (non il suo centro): la cucitura tra le due Mina resta coperta. */
const SEAM = 10.5;
const SWEEP_FROM = FEET_Y + 6;
const SWEEP_TO = -12;

/** Mani di Mina Chef all'inizio: la destra lungo il fianco, la sinistra aperta vicino al bordo della borsa. */
const HANDS_START: Record<Side, Pt> = { L: { x: 54, y: 152 }, R: CHEF_ARM.restR.at! };
const HANDS_END: Record<Side, Pt> = { L: CHEF_ARM.bowL.at!, R: CHEF_ARM.spoonR.at! };
const LEN = { L: FINAL.armL.len, R: FINAL.armR.len };

/**
 * Tempi della trasformazione (ms, ~1,5 s in tutto):
 * 1 guarda in alto · 2 l'anello verde nasce ai piedi e gira · 3 sale e la trasforma · 4 il cappello scende dall'alto
 * · 5 il grembiule si rivela con una maschera e la sinistra stringe il fiocco · 6 il cucchiaio arriva nella mano
 * destra che sale a prenderlo · 7 sbatte le palpebre, strizza l'occhio e sorride.
 */
const AT = {
  lookMs: 240,
  ring: 90,
  ringMs: 300,
  sweep: 320,
  sweepMs: 380,
  ringOut: 690,
  hat: 600,
  hatMs: 330,
  apron: 780,
  apronMs: 280,
  grab: 1010,
  gazeBack: 940,
  arm: 960,
  armMs: 280,
  spoon: 990,
  spoonMs: 250,
  wink: 1290,
} as const;

const ease = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);
const back = Easing.out(Easing.back(1.5));

/** Una scintilla che gira sull'anello (disegnata attorno all'origine, raggio 7). */
const SPARKS = [
  `<path d="M-6,3 C-5,-4 1,-7 6.5,-5.5 C5.5,2 -1,6.5 -6,3 Z" fill="${C.leaf}" stroke="${C.line}" stroke-width="1.3"/><path d="M-4,2 Q0,-1 4,-3.5" stroke="${C.leafDark}" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  `<path d="M0,-6.5 Q1.2,-1.2 6.5,0 Q1.2,1.2 0,6.5 Q-1.2,1.2 -6.5,0 Q-1.2,-1.2 0,-6.5 Z" fill="${C.lemon}"/>`,
  `<circle r="3.6" fill="${C.white}" stroke="${C.greenLight}" stroke-width="1.4"/>`,
].map((inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 -7 14 14">${inner}</svg>`);

/**
 * Opacità di una copia della scintilla: quella «davanti» si vede nella metà bassa dell'anello (davanti a Mina),
 * quella «dietro» nella metà alta (dietro di lei). Gradini netti ogni 180° lungo il giro.
 */
function sideOpacity(orbit: Animated.Value, offset: number, front: boolean) {
  const input: number[] = [];
  const output: number[] = [];
  const isFront = (deg: number) => ((deg % 360) + 360) % 360 < 180;
  for (let a = -360; a <= 1260; a += 180) {
    const o = a - offset;
    input.push(o - 0.5, o + 0.5);
    output.push(isFront(a - 1) === front ? 1 : 0, isFront(a + 1) === front ? 1 : 0);
  }
  return orbit.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });
}

export interface MinaChefTransformProps {
  /** Larghezza in punti (l'altezza è 1,16 × la larghezza, come Mina). */
  size?: number;
  /** Parte quando diventa vero (e la schermata è in primo piano). */
  play?: boolean;
  /** A trasformazione finita (subito con "Riduci movimento", dove Mina Chef compare già pronta). */
  onDone?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Trasformazione di Mina 2.0 in Mina Chef, a livelli e maschere (niente deformazioni automatiche):
 * due figure complete, una per variante, sono ritagliate dalla linea dell'anello verde che sale dai piedi alla testa;
 * cappello, grembiule e cucchiaio sono livelli propri che entrano ognuno con il suo movimento.
 * Va mostrata una volta, quando si entra nel mondo delle ricette; con "Riduci movimento" Mina Chef è già pronta.
 */
export function MinaChefTransform({ size = 120, play = true, onDone, accessibilityLabel = 'Mina indossa il cappello e diventa Mina Chef', style }: MinaChefTransformProps) {
  const reduced = useReducedMotion();
  const W = size;
  const H = size * RATIO;
  const a11y = { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel };
  if (reduced) {
    return (
      <View {...a11y} style={[{ width: W, height: H }, style]}>
        <ReducedDone onDone={onDone} />
        <SvgXml xml={finalXml()} width={W} height={H} />
      </View>
    );
  }
  return <Transform W={W} H={H} play={play} onDone={onDone} a11y={a11y} style={style} />;
}

let FINAL_XML: string | null = null;
/** Mina Chef già pronta, in un solo disegno (lo stesso della posa ferma). */
function finalXml() {
  FINAL_XML ??= minaStaticSvg(FINAL);
  return FINAL_XML;
}

/** Con "Riduci movimento" la trasformazione non c'è: avvisa subito chi aspetta la fine. */
function ReducedDone({ onDone }: { onDone?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 0);
    return () => clearTimeout(t);
  }, [onDone]);
  return null;
}

function Transform({ W, H, play, onDone, a11y, style }: { W: number; H: number; play: boolean; onDone?: () => void; a11y: object; style?: StyleProp<ViewStyle> }) {
  const k = W / VIEW.w;
  const focused = useScreenFocused();
  const [vals] = useState(makeValues);
  const [x] = useState(() => ({
    sweep: new Animated.Value(SWEEP_FROM),
    ring: new Animated.Value(0),
    ringOut: new Animated.Value(0),
    orbit: new Animated.Value(0),
    hatIn: new Animated.Value(0),
    apron: new Animated.Value(0),
    spoon: new Animated.Value(0),
    browsClassic: new Animated.Value(0),
    browsChef: new Animated.Value(1),
  }));
  // 0 all'inizio · 1 la sinistra stringe il fiocco · 2 il cucchiaio è in mano · 3 finita
  const [stage, setStage] = useState(0);
  const [classicMouth, setClassicMouth] = useState<Mouth>('smile');
  const [chefEyes, setChefEyes] = useState<Eyes>('open');
  const [chefMouth, setChefMouth] = useState<Mouth>('small');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const phase = useRef<'idle' | 'running' | 'done'>('idle');
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const tw = (v: Animated.Value, to: number, ms: number, easing: (t: number) => number = ease) => Animated.timing(v, { toValue: to, duration: T(ms), easing, useNativeDriver: native });
  const at = (ms: number, a: Animated.CompositeAnimation) => Animated.sequence([Animated.delay(T(ms)), a]);
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, T(ms)));

  const stopAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    running.current?.stop();
    running.current = null;
  };
  /** Fine immediata (pagina lasciata o app in background a metà): Mina Chef pronta, nella posa finale. */
  const settle = () => {
    stopAll();
    new Gesture(vals, 'chef', LEN, HANDS_END).place();
    x.sweep.setValue(SWEEP_TO);
    for (const v of [x.ring, x.ringOut, x.hatIn, x.apron, x.spoon, vals.blink, vals.emote, vals.squash]) v.setValue(1);
    for (const v of [x.browsChef, vals.gazeY, vals.hat]) v.setValue(0);
    later(0, () => {
      setStage(3);
      setChefEyes(FINAL.eyes);
      setChefMouth(FINAL.mouth);
    });
    if (phase.current !== 'done') {
      phase.current = 'done';
      later(0, () => onDoneRef.current?.());
    }
  };

  const start = () => {
    phase.current = 'running';
    const g = new Gesture(vals, 'chef', LEN, HANDS_START);
    g.place();
    vals.gazeY.setValue(0);
    vals.emote.setValue(0);
    // 1 · guarda in alto, le sopracciglia si alzano
    later(110, () => setClassicMouth('small'));
    // 5-6-7 · cambi di stato del disegno (mani, occhi, bocca) nei punti giusti del movimento
    later(AT.grab, () => setStage(1));
    later(AT.spoon + AT.spoonMs, () => setStage(2));
    later(AT.wink, () => {
      Animated.timing(vals.blink, { toValue: 0.08, duration: T(60), easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => {
        setChefEyes(FINAL.eyes);
        setChefMouth(FINAL.mouth);
        Animated.timing(vals.blink, { toValue: 1, duration: T(120), easing: easeOut, useNativeDriver: native }).start();
      });
    });
    const arms = Animated.parallel([
      at(AT.arm, g.reach('R', HANDS_END.R, AT.armMs, { arc: 0.3, easing: Easing.out(Easing.back(1.2)) })),
      at(AT.grab - 190, g.reach('L', HANDS_END.L, 190, { arc: 0.12 })),
    ]);
    // piccolo svolazzo del cucchiaio appena preso (costruito dopo l'arrivo del braccio: parte dalla posa finale)
    const flourish = at(AT.spoon + AT.spoonMs + 20, g.swing('R', [-11], 120));
    const seq = Animated.parallel([
      // 1 · lo sguardo sale (le due Mina condividono lo stesso sguardo, così il passaggio non si vede)
      tw(vals.gazeY, -3.2, AT.lookMs),
      at(60, tw(x.browsClassic, 1, 160, easeOut)),
      // 2 · l'anello nasce ai piedi come un'increspatura e inizia a girare
      at(AT.ring, tw(x.ring, 1, AT.ringMs, easeOut)),
      at(AT.ring, Animated.timing(x.orbit, { toValue: 560, duration: T(980), easing: Easing.linear, useNativeDriver: native })),
      // 3 · sale fino sopra la testa: sotto la linea c'è già Mina Chef
      at(AT.sweep, tw(x.sweep, SWEEP_TO, AT.sweepMs, ease)),
      at(AT.ringOut, tw(x.ringOut, 1, 190, Easing.in(Easing.quad))),
      // 4 · il cappello scende dall'alto con un arco controllato, si posa, la borsa si schiaccia appena
      at(AT.hat, tw(x.hatIn, 1, AT.hatMs, easeOut)),
      at(AT.hat + AT.hatMs, Animated.sequence([tw(vals.squash, 0.95, 90, easeOut), tw(vals.squash, 1, 260, back)])),
      at(AT.hat + AT.hatMs, Animated.sequence([tw(vals.hat, -5, 110, easeOut), tw(vals.hat, 0, 300, back)])),
      at(AT.gazeBack, tw(vals.gazeY, 0, 260)),
      at(AT.gazeBack + 120, tw(x.browsChef, 0, 200)),
      // 5 · il grembiule si rivela dall'alto verso il basso
      at(AT.apron, tw(x.apron, 1, AT.apronMs, easeOut)),
      // 6 · il cucchiaio arriva con un lancio morbido nella mano che sale a prenderlo
      at(AT.spoon, Animated.timing(x.spoon, { toValue: 1, duration: T(AT.spoonMs), easing: Easing.linear, useNativeDriver: native })),
      arms,
      flourish,
      // 7 · il luccichio dello chef
      at(AT.wink + 60, tw(vals.emote, 1, 260, back)),
    ]);
    running.current = seq;
    seq.start(({ finished }) => {
      if (!finished) return;
      running.current = null;
      setStage(3);
      phase.current = 'done';
      onDoneRef.current?.();
    });
  };

  useEffect(() => {
    if (!play) return;
    if (!focused) {
      if (phase.current === 'running') settle();
      return;
    }
    if (phase.current === 'idle') start();
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active' && phase.current === 'running') settle();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, focused]);
  useEffect(() => stopAll, []);

  // ─────────── geometria dei livelli ───────────
  const fill: ViewStyle = { position: 'absolute', left: 0, top: 0, width: W, height: H };
  const around = (px: number, py: number, inner: object[]) => {
    const dx = (px - VIEW.x) * k - W / 2;
    const dy = (py - VIEW.y) * k - H / 2;
    return [{ translateX: dx }, { translateY: dy }, ...inner, { translateX: -dx }, { translateY: -dy }] as never;
  };
  const layer = (xml: string, pad = false) => (
    <View style={fill} pointerEvents="none">
      {pad ? (
        <SvgXml xml={xml} width={W + 2 * PAD * k} height={H + 2 * PAD * k} style={{ position: 'absolute', left: -PAD * k, top: -PAD * k }} />
      ) : (
        <SvgXml xml={xml} width={W} height={H} />
      )}
    </View>
  );
  const xml = {
    classicShadow: cached('shadow-classic', () => shadowPart('classic')),
    classicBody: cached('tf-classic-body', () => legsPart(START.legs, 'classic') + bodyPart('classic')),
    classicArms: cached('tf-classic-arms', () => armSvg('L', START.armL, 'classic') + armSvg('R', START.armR, 'classic')),
    classicEyes: cached('eyes-classic-open', () => eyesPart('open', 'classic')),
    classicBrows: cached('brows-classic-raised', () => browsPart('raised', 'classic')),
    classicMouth: cached(`mouth-classic-${classicMouth}`, () => mouthPart(classicMouth, 'classic')),
    chefShadow: cached('shadow-chef', () => shadowPart('chef')),
    chefBody: cached('tf-chef-base', () => legsPart(FINAL.legs, 'chef') + bodyPart('chef', { apron: false })),
    apron: cached('tf-apron', () => apronPart(FINAL.bow !== false)),
    hat: cached('hat', hatPart),
    chefEyes: cached(`eyes-chef-${chefEyes}`, () => eyesPart(chefEyes, 'chef')),
    chefBrows: cached('brows-chef-raised', () => browsPart('raised', 'chef')),
    chefMouth: cached(`mouth-chef-${chefMouth}`, () => mouthPart(chefMouth, 'chef')),
    emote: cached(`emote-chef-${FINAL.emote}-0`, () => emotePart(FINAL.emote ?? 'shine', 0, 'chef'), true),
    spoon: cached(`prop-chef-R-spoon-${FINAL.armR.len?.join('/') ?? ''}`, () => propRestSvg('spoon', 'R', 'chef', FINAL.armR.len), true),
  };

  // anello: posizione (segue la linea che sale), nascita come un'increspatura, scomparsa in alto
  const ringY = x.sweep.interpolate({ inputRange: [SWEEP_TO, SWEEP_FROM], outputRange: [(SWEEP_TO - RING.cy) * k, (SWEEP_FROM - RING.cy) * k] });
  const ringScale = Animated.multiply(
    x.ring.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    x.ringOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }),
  );
  const ringOpacity = Animated.multiply(x.ring, x.ringOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }));
  const ringT = around(RING.cx, RING.cy, [{ translateY: ringY }, { scale: ringScale }]);
  const half = (front: boolean) => {
    const d = `M${RING.cx - RING.rx},${RING.cy} A${RING.rx},${RING.ry} 0 0 ${front ? 0 : 1} ${RING.cx + RING.rx},${RING.cy}`;
    return (
      <Animated.View style={[fill, { opacity: front ? ringOpacity : Animated.multiply(ringOpacity, 0.6), transform: ringT }]} pointerEvents="none">
        <Svg width={W} height={H} viewBox={VIEWBOX}>
          <Path d={d} stroke={C.green} strokeOpacity={0.2} strokeWidth={10} strokeLinecap="round" fill="none" />
          <Path d={d} stroke={C.green} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          <Path d={d} stroke={C.leaf} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    );
  };
  // scintille che girano sull'anello: copia «dietro» e copia «davanti», la forma resta dritta (contro-trasformata)
  const squashRing = RING.ry / RING.rx;
  const sparkR = 7 * k;
  const sparks = (front: boolean) =>
    SPARKS.map((s, i) => {
      const off = i * 120;
      const rot = x.orbit.interpolate({ inputRange: [0, 360], outputRange: [`${off}deg`, `${360 + off}deg`] });
      const unrot = x.orbit.interpolate({ inputRange: [0, 360], outputRange: [`${-off}deg`, `${-360 - off}deg`] });
      return (
        <Animated.View
          key={`s${front ? 'f' : 'b'}${i}`}
          style={[fill, { opacity: Animated.multiply(ringOpacity, sideOpacity(x.orbit, off, front)), transform: around(RING.cx, RING.cy, [{ translateY: ringY }, { scale: ringScale }, { scaleY: squashRing }, { rotate: rot }]) }]}
          pointerEvents="none"
        >
          <Animated.View
            style={{ position: 'absolute', left: (RING.cx + RING.rx - VIEW.x) * k - sparkR, top: (RING.cy - VIEW.y) * k - sparkR, width: 2 * sparkR, height: 2 * sparkR, transform: [{ rotate: unrot }, { scaleY: 1 / squashRing }] }}
          >
            <SvgXml xml={s} width={2 * sparkR} height={2 * sparkR} />
          </Animated.View>
        </Animated.View>
      );
    });

  // maschere delle due figure: sopra la linea Mina 2.0, sotto la linea Mina Chef
  const line = x.sweep.interpolate({ inputRange: [SWEEP_TO, SWEEP_FROM], outputRange: [(SWEEP_TO + SEAM - VIEW.y) * k, (SWEEP_FROM + SEAM - VIEW.y) * k] });
  const negLine = Animated.multiply(line, -1);
  const windowBelow = (child: ReactNode) => (
    <Animated.View style={{ position: 'absolute', left: -W / 2, top: 0, width: 2 * W, height: 2 * H, overflow: 'hidden', transform: [{ translateY: line }] }} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', left: W / 2, top: 0, width: W, height: H, transform: [{ translateY: negLine }] }}>{child}</Animated.View>
    </Animated.View>
  );
  const windowAbove = (child: ReactNode) => (
    <Animated.View style={{ position: 'absolute', left: -W / 2, top: -2 * H, width: 2 * W, height: 2 * H, overflow: 'hidden', transform: [{ translateY: line }] }} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', left: W / 2, top: 2 * H, width: W, height: H, transform: [{ translateY: negLine }] }}>{child}</Animated.View>
    </Animated.View>
  );

  const eyesT = (variant: 'classic' | 'chef') =>
    around(RIG[variant].eyesCenter.x, RIG[variant].eyesCenter.y, [{ translateX: Animated.multiply(vals.gazeX, k) }, { translateY: Animated.multiply(vals.gazeY, k) }, { scaleY: vals.blink }]);
  const browsT = (o: Animated.Value) => [{ translateY: Animated.add(Animated.multiply(vals.gazeY, k * 0.6), o.interpolate({ inputRange: [0, 1], outputRange: [3 * k, 0] })) }] as never;

  const classic = (
    <View style={fill} pointerEvents="none">
      {layer(xml.classicShadow)}
      <View style={[fill, { transform: around(RIG.classic.leanPivot.x, RIG.classic.leanPivot.y, [{ rotate: `${START.lean ?? 0}deg` }]) }]} pointerEvents="none">
        {layer(xml.classicBody)}
        <Animated.View style={[fill, { transform: eyesT('classic') }]}>{layer(xml.classicEyes)}</Animated.View>
        <Animated.View style={[fill, { opacity: x.browsClassic, transform: browsT(x.browsClassic) }]}>{layer(xml.classicBrows)}</Animated.View>
        {layer(xml.classicMouth)}
        {layer(xml.classicArms)}
      </View>
    </View>
  );

  // grembiule: finestra che si allunga dall'alto verso il basso (stesso trucco: la finestra scende, il disegno resta fermo)
  const apronTop = (APRON_BOX.top - VIEW.y) * k;
  const apronH = (APRON_BOX.bottom - APRON_BOX.top) * k;
  const apronShift = x.apron.interpolate({ inputRange: [0, 1], outputRange: [-apronH, 0] });
  const apron = (
    <Animated.View style={{ position: 'absolute', left: 0, top: apronTop, width: W, height: apronH, overflow: 'hidden', transform: [{ translateY: apronShift }] }} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', left: 0, top: -apronTop, width: W, height: H, transform: [{ translateY: Animated.multiply(apronShift, -1) }] }}>{layer(xml.apron)}</Animated.View>
    </Animated.View>
  );

  const squashT = around(RIG.chef.bodyPivot.x, RIG.chef.bodyPivot.y, [{ scaleY: vals.squash }, { scaleX: vals.squash.interpolate({ inputRange: [0.8, 1, 1.2], outputRange: [1.08, 1, 0.94] }) }]);
  const armsLook: MinaLook = {
    ...FINAL,
    armL: { ...FINAL.armL, prop: stage >= 1 ? 'grip' : 'none' },
    armR: { ...FINAL.armR, prop: stage >= 2 ? 'spoon' : 'none' },
  };
  const chef = (
    <View style={fill} pointerEvents="none">
      {layer(xml.chefShadow)}
      <Animated.View style={[fill, { transform: squashT }]} pointerEvents="none">
        {layer(xml.chefBody)}
        {apron}
        <Animated.View style={[fill, { transform: eyesT('chef') }]}>{layer(xml.chefEyes)}</Animated.View>
        <Animated.View style={[fill, { opacity: x.browsChef, transform: browsT(x.browsChef) }]}>{layer(xml.chefBrows)}</Animated.View>
        {layer(xml.chefMouth)}
        <Arms look={armsLook} vals={vals} W={W} H={H} k={k} start={HANDS_START} />
      </Animated.View>
    </View>
  );

  // cappello: scende dall'alto con un arco morbido e una rotazione che si raddrizza, poi oscilla sul perno
  const hp = RIG.chef.hatPivot;
  const hat = (
    <Animated.View style={[fill, { transform: squashT }]} pointerEvents="none">
      <Animated.View
        style={[
          fill,
          {
            opacity: x.hatIn.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
            transform: around(hp.x, hp.y, [
              { translateX: x.hatIn.interpolate({ inputRange: [0, 1], outputRange: [16 * k, 0] }) },
              { translateY: x.hatIn.interpolate({ inputRange: [0, 1], outputRange: [-78 * k, 0] }) },
              { rotate: x.hatIn.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '0deg'] }) },
              { rotate: vals.hat.interpolate({ inputRange: [-20, 20], outputRange: ['-20deg', '20deg'] }) },
            ]),
          },
        ]}
      >
        {layer(xml.hat)}
      </Animated.View>
    </Animated.View>
  );

  // cucchiaio in volo: arriva dall'alto a destra girando e si posa esattamente dove la mano lo terrà
  const fEnd = poseFrame('R', FINAL.armR, 'chef');
  const h0 = handRest('R', 'chef', FINAL.armR.len);
  const p0 = { x: h0.x, y: h0.y + 3 };
  const tilt = FINAL.armR.propTilt ?? 0;
  const spoon =
    stage < 2 ? (
      <Animated.View
        style={[
          fill,
          {
            opacity: x.spoon.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateX: (fEnd.palm.x - p0.x) * k },
              { translateY: (fEnd.palm.y - p0.y) * k },
              { translateX: x.spoon.interpolate({ inputRange: [0, 1], outputRange: [36 * k, 0] }) },
              { translateY: x.spoon.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-66 * k, -62 * k, -50 * k, -29 * k, 0] }) },
              ...(around(p0.x, p0.y, [
                { rotate: x.spoon.interpolate({ inputRange: [0, 0.6, 1], outputRange: [`${tilt + 200}deg`, `${tilt + 40}deg`, `${tilt}deg`] }) },
                { scale: x.spoon.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
              ]) as object[]),
            ] as never,
          },
        ]}
        pointerEvents="none"
      >
        {layer(xml.spoon, true)}
      </Animated.View>
    ) : null;

  const emote = (
    <Animated.View style={[fill, { opacity: vals.emote, transform: around(EMOTE_PIVOT.x, EMOTE_PIVOT.y, [{ scale: vals.emote.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]) }]} pointerEvents="none">
      {layer(xml.emote, true)}
    </Animated.View>
  );

  return (
    <View {...a11y} style={[{ width: W, height: H, overflow: 'visible' }, style]}>
      {stage < 3 ? half(false) : null}
      {stage < 3 ? sparks(false) : null}
      {stage < 3 ? windowAbove(classic) : null}
      {windowBelow(chef)}
      {stage < 3 ? half(true) : null}
      {stage < 3 ? sparks(true) : null}
      {hat}
      {spoon}
      {emote}
    </View>
  );
}
