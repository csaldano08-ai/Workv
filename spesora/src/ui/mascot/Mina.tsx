import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Image, Platform, View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useReducedMotion } from '../useReducedMotion';
import { MINA_LARGE_FROM, MINA_RASTER, MINA_RASTER_LARGE, MINA_WAVE } from './minaRaster';
import { MINA_VIEWBOX, minaBadgeSvg, minaSvg, resolvePose, type MinaPose } from './minaSvg';

const native = Platform.OS !== 'web';
const VECTOR_RATIO = MINA_VIEWBOX.height / MINA_VIEWBOX.width;

export type MinaMotion = 'auto' | 'none';

export interface MinaMascotProps {
  /** Posa (nomi inglesi) oppure, per compatibilità, i vecchi nomi italiani. */
  pose?: MinaPose | string;
  /** Larghezza in punti: piccola 40–56, media 64–96, grande 120–180. */
  size?: number;
  /** Se vero, entra con una breve animazione e, per alcune pose, esegue un gesto. Rispetta "Riduci movimento". */
  animated?: boolean;
  /** Se presente, Mina è esposta agli screen reader con questa etichetta; altrimenti è decorativa. */
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/** Gesto per posa: una breve sequenza, mai un ciclo infinito (nessun consumo continuo di batteria). */
function gesture(pose: MinaPose, rotate: Animated.Value, lift: Animated.Value): Animated.CompositeAnimation | null {
  const to = (v: Animated.Value, value: number, duration: number, easing = Easing.inOut(Easing.quad)) => Animated.timing(v, { toValue: value, duration, easing, useNativeDriver: native });
  switch (pose) {
    case 'welcome':
      return Animated.sequence([to(rotate, 1, 180), to(rotate, -1, 260), to(rotate, 1, 260), to(rotate, -1, 260), to(rotate, 0, 180)]);
    case 'happy':
    case 'success':
      return Animated.sequence([to(lift, -1, 170, Easing.out(Easing.quad)), to(lift, 0, 170, Easing.in(Easing.quad)), to(lift, -0.6, 140, Easing.out(Easing.quad)), to(lift, 0, 140, Easing.in(Easing.quad))]);
    case 'cooking':
      return Animated.sequence([to(rotate, 0.6, 140), to(rotate, -0.6, 220), to(rotate, 0.6, 220), to(rotate, 0, 140)]);
    case 'thinking':
    case 'recipe':
      return Animated.sequence([to(lift, -0.35, 420), to(lift, 0, 420)]);
    case 'shopping':
    case 'calendar':
    case 'pantry':
    case 'missing':
      return Animated.sequence([to(rotate, -0.5, 200), to(rotate, 0.4, 240), to(rotate, 0, 200)]);
    case 'sleepy':
      return Animated.sequence([to(lift, 0.25, 900), to(lift, 0, 900)]);
    default:
      return null;
  }
}

/**
 * Mina, la mascotte di Spesora (il ricettario vivente). Vettoriale e offline: nessuna immagine remota.
 * Con `animated` entra con dissolvenza e piccolo scatto; il gesto dipende dalla posa.
 */
export const MinaMascot = memo(function MinaMascot({ pose = 'neutral', size = 96, animated = false, accessibilityLabel, style }: MinaMascotProps) {
  const resolved = resolvePose(pose);
  const reduced = useReducedMotion();
  const raster = (size >= MINA_LARGE_FROM ? MINA_RASTER_LARGE[resolved] : undefined) ?? MINA_RASTER[resolved];
  const useWaveLayers = resolved === 'wave' && animated && !reduced && !!raster;
  const xml = useMemo(() => minaSvg(resolved), [resolved]);
  const [enter] = useState(() => new Animated.Value(animated ? 0 : 1));
  const [rotate] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animated || reduced) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    const g = resolved === 'wave' ? null : gesture(resolved, rotate, lift);
    const run = Animated.sequence([Animated.timing(enter, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: native }), ...(g ? [g] : [])]);
    run.start();
    return () => run.stop();
  }, [animated, reduced, resolved, enter, rotate, lift]);

  const height = raster ? size : size * VECTOR_RATIO;
  const a11y = accessibilityLabel ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Animated.View
      {...a11y}
      style={[
        { width: size, height },
        style,
        {
          opacity: enter,
          transform: [
            { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }), lift.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.1, size * 0.1] })) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            { rotate: rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) },
          ],
        },
      ]}
    >
      <View style={{ width: '100%', height: '100%' }}>
        {useWaveLayers ? <WaveLayers size={size} /> : raster ? <Image source={raster} style={{ width: '100%', height: '100%' }} resizeMode="contain" fadeDuration={0} /> : <SvgXml xml={xml} width="100%" height="100%" />}
      </View>
    </Animated.View>
  );
});

/** Saluto: il braccio destro (livello separato, dietro al corpo) oscilla attorno alla spalla, poi torna a riposo. */
function WaveLayers({ size }: { size: number }) {
  const [v] = useState(() => new Animated.Value(-1));
  useEffect(() => {
    const step = (to: number) => Animated.timing(v, { toValue: to, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: native });
    // fotogrammi -8°, 0°, +8°, 0° ripetuti due volte; riposo a 0°
    const run = Animated.sequence([step(0), step(1), step(0), step(-1), step(0), step(1), step(0)]);
    run.start();
    return () => run.stop();
  }, [v]);
  const k = size / MINA_WAVE.canvas;
  const dx = MINA_WAVE.pivot[0] * k - size / 2;
  const dy = MINA_WAVE.pivot[1] * k - size / 2;
  const fill = { width: size, height: size };
  return (
    <View style={fill}>
      <Animated.View style={[fill, { position: 'absolute' }, { transform: [{ translateX: dx }, { translateY: dy }, { rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) }, { translateX: -dx }, { translateY: -dy }] }]}>
        <Image source={MINA_WAVE.arm} style={fill} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
      <Image source={MINA_WAVE.body} style={[fill, { position: 'absolute' }]} resizeMode="contain" fadeDuration={0} />
    </View>
  );
}

/** Variante compatta (copertina con volto) per righe, badge e richiami piccoli. */
export const MinaBadge = memo(function MinaBadge({ size = 36, style }: { size?: number; style?: ViewStyle }) {
  const neutral = MINA_RASTER.neutral;
  const xml = useMemo(() => minaBadgeSvg(), []);
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden', backgroundColor: '#E3ECE5' }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {neutral ? (
        // ritaglio sul volto: canvas ingrandito e spostato in modo che la copertina riempia il riquadro
        <Image source={neutral} style={{ position: 'absolute', width: size * 2, height: size * 2, left: -size * 0.46, top: -size * 0.3 }} resizeMode="contain" fadeDuration={0} />
      ) : (
        <SvgXml xml={xml} width="100%" height="100%" />
      )}
    </View>
  );
});
