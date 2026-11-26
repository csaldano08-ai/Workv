import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { colors, font, radius, space } from '../../theme/tokens';
import { LogoMarkSvg } from '../../ui/illustrations/LogoMarkSvg';
import { illo } from '../../ui/illustrations/palette';
import { MinaMascot } from '../../ui/mascot/Mina';
import { Text } from '../../ui/Text';
import { INTRO_DURATION, INTRO_REVEAL_AT, INTRO_W, LW, MARK_SIZE, splashFrame } from './splashScene';

const WORD = 'Spesora';

/**
 * Animazione iniziale (concept B, "Splash elastico"). Disegnata in tempo reale (SVG + viste), senza video:
 * nitida su ogni schermo, leggera, uguale su iOS, Android e web. Si chiude aprendo un'onda che mostra la
 * schermata vera già pronta sotto di lei. Toccando lo schermo o "Salta" si passa subito all'apertura finale.
 */
export function SplashIntro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const k = width / INTRO_W;
  const H = height / k;
  const [t, setT] = useState(0);
  const start = useRef<number | null>(null);
  const finished = useRef(false);
  const [row, setRow] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      if (start.current === null) start.current = now;
      const tt = (now - start.current) / 1000;
      setT(tt);
      if (tt >= INTRO_DURATION) {
        if (!finished.current) {
          finished.current = true;
          onDone();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [H, onDone]);

  const skip = () => {
    if (start.current !== null && t < INTRO_REVEAL_AT) start.current = performance.now() - INTRO_REVEAL_AT * 1000;
  };

  const markDp = MARK_SIZE * k;
  const gapDp = markDp * 0.16;
  const fontSize = 150 * k;
  const target = row ? { x: (row.x + markDp / 2) / k, y: (row.y + row.h / 2) / k } : undefined;
  const f = splashFrame(t, H, target);
  const rowTop = H * 0.427 * k - fontSize * 0.65;
  const onRow = (e: LayoutChangeEvent) => {
    const { x, y, width: w, height: h } = e.nativeEvent.layout;
    if (!row || row.x !== x || row.y !== rowTop + y) setRow({ x, y: rowTop + y, w, h });
  };

  const minaSize = 430 * k; // Mina 2.0 ha un riquadro più stretto della vecchia illustrazione: stessa altezza visibile
  const pop = f.minaPop;
  const feet = { x: 540 * k, y: H * 0.8125 * k };

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityRole="button" accessibilityLabel="Animazione iniziale di Spesora. Tocca per saltarla.">
      {/* livello 1: fondo (con il foro finale), splash e marchio */}
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${INTRO_W} ${H}`} preserveAspectRatio="none" pointerEvents="none">
        <Path d={f.holeD ? `${f.bgD}${f.holeD}` : f.bgD} fill={colors.ivory} fillRule="evenodd" />
        {f.fall ? (
          <G>
            <Ellipse cx={f.fall.shadow.cx} cy={f.fall.shadow.cy} rx={f.fall.shadow.rx} ry={f.fall.shadow.rx * 0.16} fill={illo.ink} opacity={f.fall.shadow.alpha} />
            <G opacity={f.fall.linesAlpha}>
              {f.fall.lines.map((l, i) => (
                <Line key={i} {...l} stroke={illo.ink} strokeWidth={LW * 0.8} strokeLinecap="round" />
              ))}
            </G>
            <Path d={f.fall.d} fill={illo.green} stroke={illo.ink} strokeWidth={LW} />
            <Ellipse cx={f.fall.highlight.cx} cy={f.fall.highlight.cy} rx={12} ry={20} fill="#FFFFFF" opacity={0.3} />
          </G>
        ) : null}
        {f.drops.map((d, i) => (
          <Path key={i} d={d.d} fill={d.color === 'peach' ? illo.peach : illo.green} stroke={illo.ink} strokeWidth={LW * 0.75} />
        ))}
        {f.bloom ? (
          <G>
            <Path d={f.bloom.green} fill={illo.green} stroke={illo.ink} strokeWidth={LW} strokeLinejoin="round" />
            {f.bloom.peach ? <Path d={f.bloom.peach} fill={illo.peach} stroke={illo.ink} strokeWidth={LW} strokeLinejoin="round" /> : null}
            {f.bloom.core ? <Circle cx={f.bloom.core.cx} cy={f.bloom.core.cy} r={f.bloom.core.r} fill={illo.ivory} stroke={illo.ink} strokeWidth={LW} /> : null}
            {f.bloom.highlight ? <Ellipse {...f.bloom.highlight} fill="#FFFFFF" opacity={0.25} /> : null}
          </G>
        ) : null}
        <G opacity={f.contentAlpha}>
          {f.morph ? <Path d={f.morph.d} fill={illo.green} stroke={illo.ink} strokeWidth={f.morph.strokeWidth} /> : null}
          {f.mark ? (
            <G transform={`translate(${f.mark.cx} ${f.mark.cy}) scale(${f.mark.scaleX} ${f.mark.scaleY}) translate(${-f.mark.cx} ${-f.mark.cy})`}>
              <LogoMarkSvg cx={f.mark.cx} cy={f.mark.cy} size={f.mark.size} parts={f.mark.parts} />
            </G>
          ) : null}
        </G>
      </Svg>

      {/* livello 2: scritta (stessa disposizione del logo dell'app) e Mina */}
      <View pointerEvents="none" style={[styles.rowWrap, { top: rowTop, opacity: f.contentAlpha }]}>
        <View style={styles.row} onLayout={onRow}>
        <View style={{ width: markDp + gapDp }} />
        {WORD.split('').map((ch, i) => {
          const l = f.letters[i] ?? { dy: 0, sx: 1, sy: 1, a: 0 };
          return (
            <RNText
              key={i}
              allowFontScaling={false}
              style={[
                styles.letter,
                { fontSize, lineHeight: fontSize * 1.3, opacity: l.a, transform: [{ translateY: l.dy * k + (1 - l.sy) * fontSize * 0.4 }, { scaleX: l.sx }, { scaleY: l.sy }] },
              ]}
            >
              {ch}
            </RNText>
          );
        })}
        </View>
      </View>
      {pop > 0.01 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            // Mina 2.0: piedi al 50% della larghezza e a 1,07 × la larghezza dall'alto del disegno
            left: feet.x - minaSize * 0.5,
            top: feet.y - minaSize * 1.07,
            opacity: f.contentAlpha,
            transform: [{ translateY: minaSize * 0.53 * (1 - pop) }, { scaleX: Math.min(pop, 1.2) * (1 + 0.1 * (1 - Math.min(pop, 1))) }, { scaleY: pop }],
          }}
        >
          <MinaMascot pose="wave" size={minaSize} animated />
        </View>
      ) : null}

      {/* livello 3: l'onda verde che si apre sopra tutto */}
      {f.wave ? (
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${INTRO_W} ${H}`} preserveAspectRatio="none" pointerEvents="none">
          <Path d={f.wave.fillD} fill={illo.green} fillRule="evenodd" />
          <Path d={f.wave.outerD} fill="none" stroke={illo.ink} strokeWidth={LW} />
          {f.wave.innerD ? <Path d={f.wave.innerD} fill="none" stroke={illo.ink} strokeWidth={LW} /> : null}
        </Svg>
      ) : null}

      {t < INTRO_REVEAL_AT ? (
        <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Salta l'animazione" style={[styles.skip, { top: insets.top + space.md, right: space.lg + insets.right }]} hitSlop={10}>
          <Text variant="small" color={colors.ink}>
            Salta
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  letter: { color: colors.green, fontFamily: font.extrabold, letterSpacing: -1 },
  skip: {
    position: 'absolute',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
});
