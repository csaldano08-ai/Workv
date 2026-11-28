import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions, type LayoutRectangle } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { LOGO_BOX, LOGO_RATIO, minaLogoPartsSvg } from '../../ui/brand/logoArt';
import { MinaMascot } from '../../ui/mascot/Mina';
import { useT } from '../../i18n';
import { measureIntroAnchor } from './introBus';

const native = Platform.OS !== 'web';

/**
 * Tempi dell'intro, in millisecondi (~2,7 s in tutto, una sola volta al primo avvio; V4: fase vuota accorciata):
 *   0–350     una goccia verde cade dall'alto verso il centro, accelerando
 *   350–600   tocca terra, si schiaccia, rimbalza; un'increspatura circolare le si allarga intorno
 *   600–1100  dal punto d'impatto un cerchio verde si allarga fino a riempire lo schermo
 *   1100–1520 la maschera circolare si apre e rivela la nuova composizione; entra il logo: il cestino sboccia,
 *             la parola «Mina» scivola fuori, i tre trattini del cestino scattano
 *   1600–2470 Mina 2.0 esce dal basso (prima il manico, poi la borsa), apre gli occhi, sorride e saluta
 *   2250–2940 la composizione vola al posto del logo e di Mina nella schermata di Benvenuto e lascia il posto a lei
 */
// V4: la fase iniziale (goccia su schermo vuoto) è più breve: logo e Mina arrivano circa 300 ms prima
const T = {
  fall: 260,
  bounce: 200,
  fill: 440,
  fillMs: 400,
  reveal: 800,
  revealMs: 400,
  mark: 950,
  word: 1040,
  spark: 1160,
  disc: 1170,
  minaMount: 1020,
  rise: 1300,
  riseMs: 380,
  morph: 2050,
  morphMs: 450,
  fade: 2480,
  fadeMs: 260,
} as const;

/** La stessa Mina (e la stessa misura) della schermata di Benvenuto: alla fine prende il suo posto. */
const MINA = 220;
const MINA_H = MINA * (232 / 200);
/** Linea da cui Mina esce: appena sotto la sua ombra (coordinate del disegno: y 213 su un riquadro da −12 a 220). */
const FEET_LINE = ((213 + 12) / 232) * MINA_H;
const DROP = { w: 20, h: 28 } as const;
const DOT = 18;
const LOGO_SCALE = 1.5;
/** Logo dell'intro: le tre parti sovrapposte nello stesso riquadro (vedi src/ui/brand/logoArt.ts). */
const LOGO_PARTS = minaLogoPartsSvg();
const LOGO_H = 46;
const LOGO_W = Math.round(LOGO_H * LOGO_RATIO);
/** Centri del cestino e dei trattini rispetto al centro del logo (per farli sbocciare dal loro posto). */
const BASKET_DX = ((928 - LOGO_BOX.x) / LOGO_BOX.w - 0.5) * LOGO_W;
const SPARK_DX = ((1030 - LOGO_BOX.x) / LOGO_BOX.w - 0.5) * LOGO_W;
const SPARK_DY = ((95 - LOGO_BOX.y) / LOGO_BOX.h - 0.5) * LOGO_H;
const MINA_SCALE = 0.8;

/** Fotogrammi chiave dell'impatto (0 = tocca terra, 1 = ferma): schiacciamento, rimbalzo, piccolo assestamento. */
const BOUNCE_T = [0, 0.24, 0.4, 0.55, 0.7, 0.8, 0.9, 1];
const BOUNCE_SX = [0.9, 1.55, 1.05, 0.92, 0.96, 1, 1.16, 1];
const BOUNCE_SY = [1.25, 0.5, 0.95, 1.12, 1.05, 1, 0.86, 1];
const BOUNCE_Y = [0, 0, -15, -22, -14, 0, 0, 0];

/**
 * Intro dell'app: «la goccia che diventa MINA». Tutto è disegnato e animato dal vivo (nessuna sequenza di
 * immagini), con i colori ufficiali. Si salta con un tocco; se l'app va in background a metà, l'intro finisce.
 * Viene mostrata solo al primo avvio o su richiesta dalle Impostazioni (vedi IntroGate).
 */
export function MinaIntro({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { width: W, height: H } = useWindowDimensions();
  const [v] = useState(() => ({
    fall: new Animated.Value(0),
    bounce: new Animated.Value(0),
    ripple: new Animated.Value(0),
    ripple2: new Animated.Value(0),
    fill: new Animated.Value(0),
    reveal: new Animated.Value(0),
    mark: new Animated.Value(0),
    word: new Animated.Value(0),
    spark: new Animated.Value(0),
    disc: new Animated.Value(0),
    rise: new Animated.Value(0),
    logoX: new Animated.Value(0),
    logoY: new Animated.Value(0),
    logoS: new Animated.Value(LOGO_SCALE),
    minaX: new Animated.Value(0),
    minaY: new Animated.Value(0),
    minaS: new Animated.Value(MINA_SCALE),
    fade: new Animated.Value(1),
  }));
  const [minaOn, setMinaOn] = useState(false);
  const logoBox = useRef<LayoutRectangle | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anims = useRef<Animated.CompositeAnimation[]>([]);
  const ended = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // geometria (coordinate della finestra: l'intro copre tutto lo schermo)
  const impact = { x: W / 2, y: H * 0.42 };
  const center = { x: impact.x, y: impact.y - DOT / 2 };
  const R = Math.hypot(Math.max(center.x, W - center.x), Math.max(center.y, H - center.y)) + 8;
  // come nel Benvenuto: Mina in alto, il logo sotto (così il passaggio finale non incrocia le due parti)
  const minaTop = H * 0.36 - MINA_H / 2;
  const logoTop = H * 0.64 - LOGO_H / 2;

  useEffect(() => {
    const tw = (val: Animated.Value, to: number, ms: number, easing: (t: number) => number) => Animated.timing(val, { toValue: to, duration: ms, easing, useNativeDriver: native });
    const at = (ms: number, a: Animated.CompositeAnimation) => {
      const run = Animated.sequence([Animated.delay(ms), a]);
      anims.current.push(run);
      run.start();
    };
    const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    const end = (fadeMs: number) => {
      if (ended.current) return;
      ended.current = true;
      const out = tw(v.fade, 0, fadeMs, Easing.inOut(Easing.quad));
      anims.current.push(out);
      out.start(() => onDoneRef.current());
    };

    // 1 · la goccia cade accelerando (gravità)
    at(0, tw(v.fall, 1, T.fall, Easing.in(Easing.quad)));
    // 2 · impatto: schiacciamento e rimbalzo; due increspature
    at(T.fall, Animated.timing(v.bounce, { toValue: 1, duration: T.bounce, easing: Easing.linear, useNativeDriver: native }));
    at(T.fall, tw(v.ripple, 1, 460, Easing.out(Easing.cubic)));
    at(T.fall + 110, tw(v.ripple2, 1, 420, Easing.out(Easing.cubic)));
    // 3 · il cerchio verde si allarga fino a riempire lo schermo
    at(T.fill, tw(v.fill, 1, T.fillMs, Easing.bezier(0.45, 0, 0.25, 1)));
    // 4 · la maschera circolare si apre sulla nuova composizione; entrano il marchio, la scritta e la foglia
    at(T.reveal, tw(v.reveal, 1, T.revealMs, Easing.bezier(0.15, 0, 0.15, 1)));
    at(T.mark, tw(v.mark, 1, 360, Easing.out(Easing.back(1.7))));
    at(T.word, tw(v.word, 1, 300, Easing.out(Easing.cubic)));
    at(T.spark, tw(v.spark, 1, 280, Easing.out(Easing.back(2.2))));
    // 5 · il «palco» di Mina e Mina che esce dal basso: prima il manico, poi la borsa
    at(T.disc, tw(v.disc, 1, 340, Easing.out(Easing.back(1.4))));
    later(T.minaMount, () => setMinaOn(true));
    at(T.rise, tw(v.rise, 1, T.riseMs, Easing.out(Easing.back(1.3))));
    // 6 · la composizione vola al posto del logo e di Mina nella schermata di Benvenuto, poi si dissolve
    later(T.morph - 90, () => {
      void Promise.all([measureIntroAnchor('logo'), measureIntroAnchor('mina')]).then(([logo, mina]) => {
        if (ended.current) return;
        const box = logoBox.current;
        if (!logo || !mina || !box) {
          // nessuna schermata di Benvenuto sotto (intro rivista dalle Impostazioni): dissolvenza semplice
          later(Math.max(0, T.fade - T.morph), () => end(320));
          return;
        }
        const ease = Easing.inOut(Easing.cubic);
        const logoC = { x: box.x + box.width / 2, y: logoTop + box.y + box.height / 2 };
        const minaC = { x: W / 2, y: minaTop + MINA_H / 2 };
        const move = Animated.parallel([
          tw(v.logoX, logo.x + logo.w / 2 - logoC.x, T.morphMs, ease),
          tw(v.logoY, logo.y + logo.h / 2 - logoC.y, T.morphMs, ease),
          tw(v.logoS, logo.w / box.width, T.morphMs, ease),
          tw(v.minaX, mina.x + mina.w / 2 - minaC.x, T.morphMs, ease),
          tw(v.minaY, mina.y + mina.h / 2 - minaC.y, T.morphMs, ease),
          tw(v.minaS, mina.w / MINA, T.morphMs, ease),
        ]);
        anims.current.push(move);
        move.start();
        later(T.fade - T.morph, () => end(T.fadeMs));
      });
    });
    // se l'app va in background a metà, l'intro finisce subito (al ritorno c'è già l'app)
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' || ended.current) return;
      ended.current = true;
      onDoneRef.current();
    });
    const pendingTimers = timers.current;
    const running = anims.current;
    return () => {
      sub.remove();
      pendingTimers.forEach(clearTimeout);
      running.forEach((a) => a.stop());
    };
    // la sequenza parte una volta sola, con le misure dello schermo del primo fotogramma
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Tocco: si salta l'intro (dissolvenza breve). */
  const skip = () => {
    if (ended.current) return;
    ended.current = true;
    timers.current.forEach(clearTimeout);
    anims.current.forEach((a) => a.stop());
    Animated.timing(v.fade, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => onDoneRef.current());
  };

  // ─────────── livelli ───────────
  const k = (keys: number[], vals: number[], val: Animated.Value) => val.interpolate({ inputRange: keys, outputRange: vals });
  const dot = {
    opacity: Animated.multiply(v.bounce.interpolate({ inputRange: [0, 0.001], outputRange: [0, 1], extrapolate: 'clamp' }), v.fill.interpolate({ inputRange: [0, 0.02], outputRange: [1, 0], extrapolate: 'clamp' })),
    transform: [
      // la base resta a terra mentre si schiaccia
      { translateY: k(BOUNCE_T, BOUNCE_T.map((_, i) => BOUNCE_Y[i] + (1 - BOUNCE_SY[i]) * (DOT / 2)), v.bounce) },
      { scaleX: k(BOUNCE_T, BOUNCE_SX, v.bounce) },
      { scaleY: k(BOUNCE_T, BOUNCE_SY, v.bounce) },
    ],
  };
  const ring = (val: Animated.Value, to: number, alpha: number) => ({
    opacity: Animated.multiply(val.interpolate({ inputRange: [0, 0.001, 1], outputRange: [0, alpha, 0] }), v.fill.interpolate({ inputRange: [0, 0.2], outputRange: [1, 0], extrapolate: 'clamp' })),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, to] }) }],
  });
  const circle = (color: string, val: Animated.Value, from: number) => (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: center.x - R,
          top: center.y - R,
          width: 2 * R,
          height: 2 * R,
          borderRadius: R,
          backgroundColor: color,
          // invisibile finché non parte (prima resta solo la goccia)
          opacity: val.interpolate({ inputRange: [0, 0.001], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }],
        },
      ]}
    />
  );

  return (
    <Pressable style={styles.fill} onPress={skip} accessibilityRole="button" accessibilityLabel={t('onboarding:intro.a11y')}>
      <Animated.View style={[styles.fill, styles.bg, { opacity: v.fade }]} pointerEvents="none">
        {/* 3-4 · cerchio verde che riempie lo schermo, poi la maschera circolare che rivela la composizione */}
        {circle(colors.greenBright, v.fill, DOT / 2 / R)}
        {circle(colors.ivory, v.reveal, 0.001)}

        {/* 2 · increspature e goccia a terra */}
        <Animated.View style={[styles.abs, styles.ring, { left: center.x - DOT / 2, top: center.y - DOT / 2 }, ring(v.ripple, 5.5, 0.75)]} />
        <Animated.View style={[styles.abs, styles.ring, styles.ringThin, { left: center.x - DOT / 2, top: center.y - DOT / 2 }, ring(v.ripple2, 3.6, 0.5)]} />
        <Animated.View style={[styles.abs, styles.dot, { left: center.x - DOT / 2, top: impact.y - DOT }, dot]} />

        {/* 1 · la goccia che cade (si allunga un poco mentre accelera) */}
        <Animated.View
          style={[
            styles.abs,
            {
              left: impact.x - DROP.w / 2,
              top: impact.y - DROP.h,
              width: DROP.w,
              height: DROP.h,
              opacity: v.bounce.interpolate({ inputRange: [0, 0.001], outputRange: [1, 0], extrapolate: 'clamp' }),
              transform: [
                { translateY: v.fall.interpolate({ inputRange: [0, 1], outputRange: [-(impact.y + 40), 0] }) },
                { scaleY: v.fall.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
                { scaleX: v.fall.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) },
              ],
            },
          ]}
        >
          <Svg width={DROP.w} height={DROP.h} viewBox="0 0 20 28">
            <Path d="M10,0 C10,0 20,12 20,18 A10,10 0 0 1 0,18 C0,12 10,0 10,0 Z" fill={colors.greenBright} />
            <Path d="M5.5,17 Q5.5,13 8,10.5" stroke={colors.white} strokeOpacity={0.55} strokeWidth={1.8} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        {/* 5 · Mina: «palco» verde chiaro (lo stesso della schermata di Benvenuto) e Mina che esce dal basso */}
        <Animated.View
          style={[styles.abs, { left: W / 2 - MINA / 2, top: minaTop, width: MINA, height: MINA_H, transform: [{ translateX: v.minaX }, { translateY: v.minaY }, { scale: v.minaS }] }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.abs,
              styles.disc,
              { left: MINA / 2 - 135, top: MINA_H / 2 - 135, opacity: v.disc.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: v.disc.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
            ]}
          />
          <Animated.View
            style={[
              styles.abs,
              styles.discInner,
              { left: MINA / 2 - 100, top: MINA_H / 2 - 100, opacity: v.disc.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: v.disc.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] },
            ]}
          />
          <View style={[styles.abs, { left: -50, top: -50, width: MINA + 100, height: FEET_LINE + 50, overflow: 'hidden' }]}>
            <Animated.View style={[styles.abs, { left: 50, top: 50, width: MINA, height: MINA_H, transform: [{ translateY: v.rise.interpolate({ inputRange: [0, 1], outputRange: [FEET_LINE + 8, 0] }) }] }]}>
              {minaOn ? <MinaMascot pose="welcome" gesture="emerge" size={MINA} animated /> : null}
            </Animated.View>
          </View>
        </Animated.View>

        {/* 4 · logo: il cestino sboccia, la parola scivola fuori da dietro, i trattini scattano */}
        <View style={[styles.abs, styles.logoRowWrap, { top: logoTop }]} pointerEvents="none">
          <Animated.View
            style={[styles.logoBox, { transform: [{ translateX: v.logoX }, { translateY: v.logoY }, { scale: v.logoS }] }]}
            onLayout={(e) => {
              logoBox.current = e.nativeEvent.layout;
            }}
          >
            <Animated.View style={[styles.layer, { opacity: v.word, transform: [{ translateX: v.word.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }) }] }]}>
              <SvgXml xml={LOGO_PARTS.word} width={LOGO_W} height={LOGO_H} />
            </Animated.View>
            <Animated.View
              style={[
                styles.layer,
                {
                  opacity: v.mark.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' }),
                  transform: [{ translateX: BASKET_DX }, { scale: v.mark.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { translateX: -BASKET_DX }],
                },
              ]}
            >
              <SvgXml xml={LOGO_PARTS.basket} width={LOGO_W} height={LOGO_H} />
            </Animated.View>
            <Animated.View
              style={[
                styles.layer,
                {
                  opacity: v.spark.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }),
                  transform: [{ translateX: SPARK_DX }, { translateY: SPARK_DY }, { scale: v.spark }, { translateX: -SPARK_DX }, { translateY: -SPARK_DY }],
                },
              ]}
            >
              <SvgXml xml={LOGO_PARTS.sparkles} width={LOGO_W} height={LOGO_H} />
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bg: { backgroundColor: colors.ivory, overflow: 'hidden' },
  abs: { position: 'absolute' },
  ring: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, borderColor: colors.greenBright },
  ringThin: { borderWidth: 1.5 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.greenBright },
  disc: { width: 270, height: 270, borderRadius: 135, backgroundColor: colors.greenSoft },
  discInner: { width: 200, height: 200, borderRadius: 100, backgroundColor: colors.greenMist },
  logoRowWrap: { left: 0, right: 0, alignItems: 'center' },
  logoBox: { width: LOGO_W, height: LOGO_H },
  layer: { position: 'absolute', left: 0, top: 0 },
});
