import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, space } from '../../theme/tokens';
import { INGREDIENT_KINDS, Ingredient } from '../illustrations/Ingredient';
import { illo } from '../illustrations/palette';
import { Text } from '../Text';
import { useReducedMotion } from '../useReducedMotion';
import { minLoaderMs, setLoaderHandler, type LoaderText } from './loaderBus';

const native = Platform.OS !== 'web';
const STAGE = 280;
const RINGS = [112, 56]; // orbita esterna (pari, oraria) e interna (dispari, antioraria)
const SIZES = [64, 50];
const STEPS = 24;

/** Valori per un'orbita circolare (interpolazione a tratti, eseguibile sul thread nativo). */
function orbit(i: number) {
  const ring = i % 2;
  const r = RINGS[ring];
  const dir = ring ? -1 : 1;
  const a0 = -Math.PI / 2 + (i * Math.PI) / 3;
  const input = Array.from({ length: STEPS + 1 }, (_, s) => s / STEPS);
  return {
    input,
    x: input.map((p) => r * Math.cos(a0 + dir * p * Math.PI * 2)),
    y: input.map((p) => r * 0.92 * Math.sin(a0 + dir * p * Math.PI * 2)),
  };
}
const ORBITS = INGREDIENT_KINDS.map((_, i) => orbit(i));

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Monta una sola volta nel layout radice: mostra il caricamento quando qualcuno chiama withLoader. */
export function LoaderHost() {
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  const [text, setText] = useState<LoaderText | null>(null);
  const [gathering, setGathering] = useState(false);
  const [v] = useState(() => ({
    spin: new Animated.Value(0),
    bob: new Animated.Value(0),
    gather: new Animated.Value(0),
    plate: new Animated.Value(0),
    fade: new Animated.Value(0),
  }));

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    setLoaderHandler(async (t, task) => {
      const started = Date.now();
      const r = reducedRef.current;
      v.gather.setValue(0);
      v.plate.setValue(0);
      v.spin.setValue(0);
      v.bob.setValue(0);
      setGathering(false);
      setText(t);
      Animated.timing(v.fade, { toValue: 1, duration: 160, useNativeDriver: native }).start();
      if (!r) {
        loops.push(Animated.loop(Animated.timing(v.spin, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: native })));
        loops.push(Animated.loop(Animated.timing(v.bob, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: native })));
        loops.forEach((l) => l.start());
      }
      await wait(60); // lascia disegnare il primo fotogramma prima del lavoro
      try {
        const result = await task();
        const left = minLoaderMs(r) - (Date.now() - started);
        if (left > 0) await wait(left);
        // gli ingredienti si stringono a vortice e si riuniscono; compare il piatto con la spunta
        setGathering(true);
        await new Promise<void>((res) =>
          Animated.sequence([
            Animated.timing(v.gather, { toValue: 1, duration: r ? 1 : 650, easing: Easing.in(Easing.cubic), useNativeDriver: native }),
            Animated.spring(v.plate, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }),
            Animated.delay(r ? 150 : 380),
          ]).start(() => res()),
        );
        return result;
      } finally {
        await new Promise<void>((res) => Animated.timing(v.fade, { toValue: 0, duration: 200, useNativeDriver: native }).start(() => res()));
        loops.splice(0).forEach((l) => l.stop());
        setText(null);
      }
    });
    return () => setLoaderHandler(null);
  }, [v]);

  if (!text) return null;
  const shrink = v.gather.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: v.fade }]} accessibilityViewIsModal accessibilityLiveRegion="polite" accessible accessibilityLabel={`${gathering && text.done ? text.done : text.title}${text.subtitle ? `. ${text.subtitle}` : ''}`}>
      <View style={styles.stage}>
        {/* scie del vortice durante la riunione */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              opacity: v.gather.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.7, 0.5, 0] }),
              transform: [{ rotate: v.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) }],
            },
          ]}
        >
          <Svg width={STAGE} height={STAGE} viewBox={`0 0 ${STAGE} ${STAGE}`}>
            <Path d="M 40 140 A 100 100 0 0 1 110 44" stroke={illo.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M 240 140 A 100 100 0 0 1 170 236" stroke={illo.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M 90 150 A 52 52 0 0 1 150 88" stroke={illo.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </Svg>
        </Animated.View>
        {INGREDIENT_KINDS.map((kind, i) => {
          const o = ORBITS[i];
          const size = SIZES[i % 2];
          const tx = Animated.multiply(v.spin.interpolate({ inputRange: o.input, outputRange: o.x }), shrink);
          const ty = Animated.multiply(v.spin.interpolate({ inputRange: o.input, outputRange: o.y }), shrink);
          const bobY = v.bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: i % 2 ? [-5, 5, -5] : [5, -5, 5] });
          const rot = v.bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: i % 2 ? ['-14deg', '12deg', '-14deg'] : ['10deg', '-12deg', '10deg'] });
          return (
            <Animated.View
              key={kind}
              pointerEvents="none"
              style={[
                styles.item,
                { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
                {
                  transform: [
                    { translateX: tx },
                    { translateY: Animated.add(ty, bobY) },
                    { rotate: rot },
                    { scale: v.gather.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.5, 0] }) },
                  ],
                },
              ]}
            >
              <Ingredient kind={kind} size={size} />
            </Animated.View>
          );
        })}
        {/* il piatto con la spunta (lo stesso del marchio Spesora) */}
        <Animated.View pointerEvents="none" style={[styles.plate, { transform: [{ scale: v.plate }] }]}>
          <Svg width={96} height={96} viewBox="0 0 96 96">
            <Circle cx={48} cy={48} r={42} fill={illo.ivory} stroke={illo.ink} strokeWidth={4} />
            <Circle cx={48} cy={48} r={28} fill="none" stroke={illo.peach} strokeWidth={7} />
            <Path d="M37 49 l8 8 l15 -17" stroke={illo.green} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </View>
      <Text variant="title" center>
        {gathering && text.done ? text.done : text.title}
      </Text>
      {text.subtitle && !gathering ? (
        <Text variant="body" color={colors.inkSoft} center>
          {text.subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl, zIndex: 50 },
  stage: { width: STAGE, height: STAGE, marginBottom: space.lg },
  fill: { position: 'absolute', left: 0, top: 0, width: STAGE, height: STAGE },
  item: { position: 'absolute', left: STAGE / 2, top: STAGE / 2 },
  plate: { position: 'absolute', left: STAGE / 2 - 48, top: STAGE / 2 - 48 },
});
