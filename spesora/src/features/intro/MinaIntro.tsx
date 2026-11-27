import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, space } from '../../theme/tokens';
import { LogoMark } from '../../ui/Logo';
import { MinaMascot } from '../../ui/mascot/Mina';
import { Reveal } from '../../ui/Reveal';
import { Text } from '../../ui/Text';

const native = Platform.OS !== 'web';

/** Tempi dell'intro, in millisecondi: breve e non bloccante, si salta con un tocco. */
const T = { mina: 700, phrase: 1500, end: 4350 } as const;

const PHRASE = ['Ciao,', 'sono', 'Mina!'];

/**
 * Intro dell'app: appare il marchio, una piccola Mina 2.0 entra e saluta, la frase di benvenuto
 * si compone parola per parola, poi la schermata vera (Benvenuto oppure Oggi) resta sola.
 * Viene mostrata solo al primo avvio o su richiesta dalle Impostazioni (vedi IntroGate):
 * per chi è già registrato l'app si apre subito, senza attese.
 */
export function MinaIntro({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const [v] = useState(() => ({ logo: new Animated.Value(0), mina: new Animated.Value(0), fade: new Animated.Value(1) }));
  const [phase, setPhase] = useState<'logo' | 'mina' | 'phrase'>('logo');
  const ended = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    Animated.timing(v.fade, { toValue: 0, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => onDone());
  }, [onDone, v.fade]);

  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];
    const run = (a: Animated.CompositeAnimation) => {
      anims.push(a);
      a.start();
    };
    // 1 · il marchio si posa con un piccolo rimbalzo
    run(Animated.spring(v.logo, { toValue: 1, friction: 6, tension: 90, useNativeDriver: native }));
    // 2-3 · Mina entra dal basso e parte il suo saluto
    timers.current.push(
      setTimeout(() => {
        setPhase('mina');
        run(Animated.timing(v.mina, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: native }));
      }, T.mina),
    );
    // 4 · la frase si compone parola per parola
    timers.current.push(setTimeout(() => setPhase('phrase'), T.phrase));
    // 5 · si passa alla schermata vera, già pronta sotto
    timers.current.push(setTimeout(finish, T.end));
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      anims.forEach((a) => a.stop());
    };
  }, [finish, v]);

  const minaSize = Math.min(width * 0.5, 215);
  return (
    <Pressable style={styles.fill} onPress={finish} accessibilityRole="button" accessibilityLabel="Benvenuto in Spesora: Mina ti saluta. Tocca per saltare.">
      <Animated.View style={[styles.fill, styles.bg, { opacity: v.fade }]}>
        <Animated.View
          style={[
            styles.logoRow,
            { opacity: v.logo, transform: [{ scale: v.logo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }, { translateY: v.logo.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
          ]}
        >
          <LogoMark size={64} />
          <Text variant="display" color={colors.green}>
            Spesora
          </Text>
        </Animated.View>
        <Animated.View style={{ height: minaSize * 1.16, opacity: v.mina, transform: [{ translateY: v.mina.interpolate({ inputRange: [0, 1], outputRange: [46, 0] }) }] }}>
          {phase !== 'logo' ? <MinaMascot pose="welcome" size={minaSize} animated /> : null}
        </Animated.View>
        <Animated.View style={styles.phrase}>
          {phase === 'phrase'
            ? PHRASE.map((w, i) => (
                <Reveal key={w} index={i} from="pop">
                  <Text variant="hand" style={styles.word}>
                    {w}
                  </Text>
                </Reveal>
              ))
            : null}
        </Animated.View>
        {phase === 'phrase' ? (
          <Reveal index={3} from="bottom">
            <Text variant="small" color={colors.inkSoft}>
              Organizzo io la tua settimana in cucina.
            </Text>
          </Reveal>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bg: { backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  phrase: { flexDirection: 'row', gap: 8, minHeight: 34 },
  word: { fontSize: 27, lineHeight: 34 },
});
