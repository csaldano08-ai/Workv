import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, motion, radius, shadow, space, TOUCH } from '../theme/tokens';
import { Text } from './Text';
import { useReducedMotion } from './useReducedMotion';

/*
 * Superfici dell'interfaccia (restyling Mina 2.0). I nomi restano quelli dello stile "ricettario"
 * per non toccare le schermate, ma l'aspetto è moderno: card bianche, toni tenui, nessun contorno scuro,
 * niente scotch, anelli o rotazioni. Sono solo superfici: contenuto e azioni restano quelli dell'app.
 */

/** Pannello principale di una sezione: card bianca con bordo delicato e ombra morbida. (`rings` è ignorato.) */
export function NotebookPage({ children, style, contentStyle }: { children: React.ReactNode; rings?: number; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  return <View style={[styles.page, style, contentStyle]}>{children}</View>;
}

/** Non più usato (era lo scotch decorativo): resta per compatibilità e non disegna nulla. */
export function Tape(_: { style?: StyleProp<ViewStyle> }) {
  return null;
}

/** Messaggio breve (di Mina, avvisi gentili): fondo tenue pesca o verde, angoli morbidi. */
export function StickyNote({ children, tone = 'peach', style }: { children: React.ReactNode; tilt?: number; tape?: boolean; tone?: 'peach' | 'sage' | 'paper'; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'sage' ? colors.greenSoft : tone === 'paper' ? colors.white : colors.peachSoft;
  return <View style={[styles.note, { backgroundColor: bg }, tone === 'paper' && styles.noteBorder, style]}>{children}</View>;
}

/** Etichetta a pillola (tipo di pasto, giorno di spesa…). */
export function HandLabel({ text, bg = colors.greenSoft, color = colors.ink }: { text: string; bg?: string; color?: string }) {
  return (
    <View style={[styles.label, { backgroundColor: bg === colors.white ? colors.greenSoft : bg }]}>
      <Text variant="caption" color={color} style={styles.labelText}>
        {text}
      </Text>
    </View>
  );
}

/** Foto del piatto: angoli arrotondati e ombra leggera. */
export function TapedPhoto({ children, style }: { children: React.ReactNode; tilt?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.photoWrap, style]}>
      <View style={styles.photo}>{children}</View>
    </View>
  );
}

export interface PaperTab<K extends string> {
  key: K;
  label: string;
}

const native = Platform.OS !== 'web';

/** Controllo segmentato: la selezione scivola sotto l'etichetta attiva (breve, rispetta "Riduci movimento"). */
export function PaperTabs<K extends string>({ tabs, value, onChange, style }: { tabs: PaperTab<K>[]; value: K; onChange: (k: K) => void; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const index = Math.max(0, tabs.findIndex((t) => t.key === value));
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(index));
  useEffect(() => {
    if (reduced) x.setValue(index);
    else Animated.spring(x, { toValue: index, friction: 9, tension: 120, useNativeDriver: native }).start();
  }, [index, reduced, x]);
  const seg = tabs.length > 0 ? (width - 8) / tabs.length : 0;
  return (
    <View style={[styles.tabsRow, style]} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? <Animated.View pointerEvents="none" style={[styles.thumb, { width: seg, transform: [{ translateX: Animated.multiply(x, seg) }] }]} /> : null}
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label} onPress={() => onChange(t.key)} style={styles.tab}>
            <Text variant="small" color={on ? colors.greenDark : colors.inkSoft} style={{ fontWeight: on ? '800' : '600' }} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Anello di avanzamento (es. prodotti nel carrello): si riempie con una breve animazione. */
export function ProgressRing({ done, total, size = 58 }: { done: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const k = total > 0 ? Math.min(1, done / total) : 0;
  const complete = total > 0 && done >= total;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${done} di ${total} nel carrello`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.tab} strokeWidth={7} fill={complete ? colors.greenSoft : colors.white} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={complete ? colors.green : colors.greenBright}
          strokeWidth={7}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - k)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant="caption" color={colors.greenDark} style={{ fontWeight: '800', fontSize: 13 }}>{`${done}/${total}`}</Text>
    </View>
  );
}

/** Riga tappabile minima (44 pt) per azioni secondarie, es. "Poi: …". */
export function LinkRow({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

void motion;

const styles = StyleSheet.create({
  page: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md, ...shadow.card },
  note: { borderRadius: radius.lg, padding: space.md, gap: 4 },
  noteBorder: { borderWidth: 1, borderColor: colors.line },
  label: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  labelText: { fontWeight: '800' },
  photoWrap: { borderRadius: radius.lg, ...shadow.card },
  photo: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.greenMist },
  tabsRow: { flexDirection: 'row', backgroundColor: colors.tab, borderRadius: radius.pill, padding: 4 },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow.card },
  tab: { flex: 1, minHeight: TOUCH - 6, paddingHorizontal: space.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  linkRow: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
