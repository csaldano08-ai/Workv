import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, space, TOUCH } from '../../theme/tokens';
import { Squish } from '../Squish';
import { Text } from '../Text';
import { useReducedMotion } from '../useReducedMotion';

const native = Platform.OS !== 'web';

/*
 * Controlli del questionario nello stile del riferimento (telefoni 3 e 4): tessere con illustrazione e spunta,
 * cerchi numerati, barra di avanzamento a segmenti, pulsante «indietro» rotondo.
 */

/** Spunta verde in un cerchio, che compare con un piccolo rimbalzo (ferma con "Riduci movimento"). */
function CheckBadge({ on }: { on: boolean }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (reduced) v.setValue(on ? 1 : 0);
    else if (on) Animated.spring(v, { toValue: 1, friction: 4.5, tension: 190, useNativeDriver: native }).start();
    else Animated.timing(v, { toValue: 0, duration: 110, useNativeDriver: native }).start();
  }, [on, reduced, v]);
  return (
    <Animated.View style={[styles.check, { opacity: v, transform: [{ scale: v }] }]} pointerEvents="none">
      <Ionicons name="checkmark" size={15} color={colors.white} />
    </Animated.View>
  );
}

/**
 * Tessera di scelta: illustrazione sopra, etichetta sotto; scelta = bordo verde e spunta nell'angolo.
 * `multi` = casella (più scelte), altrimenti scelta singola (radio).
 */
export function OptionTile({ label, art, selected, onPress, multi, hint, columns = 3 }: { label: string; art: ReactNode; selected: boolean; onPress: () => void; multi?: boolean; hint?: string; columns?: 2 | 3 }) {
  return (
    <Squish
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      outerStyle={columns === 2 ? styles.tileOuter2 : styles.tileOuter}
      style={[styles.tile, selected ? styles.tileOn : styles.tileOff]}
    >
      <View style={styles.tileArt}>{art}</View>
      <Text variant="heading" center numberOfLines={2} style={styles.tileLabel}>
        {label}
      </Text>
      <CheckBadge on={selected} />
    </Squish>
  );
}

/** Griglia di tessere (2 per riga sui telefoni stretti, 3 o 4 se c'è spazio). */
export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Cerchio numerato (persone, volte a settimana): il numero scelto è verde pieno. */
export function NumberChoice({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Squish
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.num, selected ? styles.numOn : styles.numOff]}
    >
      <Text variant="heading" color={selected ? colors.white : colors.ink} style={styles.numText}>
        {label}
      </Text>
    </Squish>
  );
}

export function NumberRow({ children }: { children: ReactNode }) {
  return <View style={styles.numRow}>{children}</View>;
}

/**
 * Barra a segmenti: un segmento per fase del questionario, riempito in proporzione ai passi fatti nella fase.
 * Lo screen reader legge il numero vero del passo («Passo 3 di 16»).
 */
export function SegmentProgress({ phases, phase, within, label }: { phases: number; phase: number; within: number; label: string }) {
  return (
    <View style={styles.segs} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      {Array.from({ length: phases }, (_, i) => {
        const k = i < phase ? 1 : i > phase ? 0 : Math.max(0.15, Math.min(1, within));
        return (
          <View key={i} style={styles.seg}>
            <View style={[styles.segFill, { width: `${Math.round(k * 100)}%` }]} />
          </View>
        );
      })}
    </View>
  );
}

/** Pulsante «indietro» rotondo, bianco con bordo chiaro (a sinistra del pulsante principale). */
export function BackCircle({ onPress, label = 'Indietro' }: { onPress: () => void; label?: string }) {
  return (
    <Squish accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.back} hitSlop={4}>
      <Ionicons name="arrow-back" size={24} color={colors.ink} />
    </Squish>
  );
}

const styles = StyleSheet.create({
  tileOuter: { flexGrow: 1, flexBasis: '30%', minWidth: 96 },
  // due colonne (es. 4 scelte): tessere uguali, nessuna allungata su tutta la riga
  tileOuter2: { width: '47.5%', flexGrow: 0 },
  tile: { minHeight: 128, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.sm, backgroundColor: colors.white },
  tileOff: { borderWidth: 1.5, borderColor: colors.line, ...shadow.card },
  tileOn: { borderWidth: 2.5, borderColor: colors.green, ...shadow.card },
  tileArt: { height: 60, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontWeight: '800', fontSize: 16 },
  check: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  numRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'space-between' },
  num: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  numOff: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, ...shadow.card },
  numOn: { backgroundColor: colors.green, ...shadow.card },
  numText: { fontSize: 20, lineHeight: 25, fontWeight: '800' },
  segs: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E8E3DA', overflow: 'hidden' },
  segFill: { height: 8, borderRadius: 4, backgroundColor: colors.green },
  back: { width: TOUCH + 12, height: TOUCH + 12, borderRadius: (TOUCH + 12) / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.lineStrong, borderBottomWidth: 4 },
});
