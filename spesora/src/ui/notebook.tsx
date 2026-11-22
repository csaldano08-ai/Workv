import { StyleSheet, View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, outline, radius, space, TOUCH } from '../theme/tokens';
import { Text } from './Text';

/*
 * Linguaggio "ricettario a schede" (B + C): pagine ad anelli, bigliettini con lo scotch, linguette,
 * foto incollate. Sono solo superfici: il contenuto e le azioni restano quelli dell'app.
 */

/** Pagina del ricettario con anelli in alto e una seconda pagina sotto (profondità senza ombre sfocate). */
export function NotebookPage({ children, rings = 5, style, contentStyle }: { children: React.ReactNode; rings?: number; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pageWrap, rings > 0 && { marginTop: 14 }, style]}>
      <View style={styles.pageBack} />
      <View style={[styles.page, rings > 0 && { paddingTop: space.xl }, contentStyle]}>{children}</View>
      {rings > 0 ? (
        <View style={styles.rings} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: rings }, (_, i) => (
            <View key={i} style={styles.ring} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Striscia di scotch decorativa. */
export function Tape({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tape, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

/** Bigliettino (messaggi brevi di Mina): leggermente inclinato, con lo scotch. */
export function StickyNote({ children, tilt = -1.2, tape = true, tone = 'peach', style }: { children: React.ReactNode; tilt?: number; tape?: boolean; tone?: 'peach' | 'sage' | 'paper'; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'sage' ? colors.sage : tone === 'paper' ? colors.paper : colors.peachSoft;
  return (
    <View style={[styles.note, { backgroundColor: bg, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      {tape ? <Tape style={styles.noteTape} /> : null}
      {children}
    </View>
  );
}

/** Etichetta scritta a mano (tipo di pasto, giorno di spesa…). */
export function HandLabel({ text, bg = colors.white, color = colors.ink }: { text: string; bg?: string; color?: string }) {
  return (
    <View style={[styles.label, { backgroundColor: bg }]}>
      <Text variant="handSmall" color={color} style={styles.labelText}>
        {text}
      </Text>
    </View>
  );
}

/** Foto incollata: contorno scuro, leggera rotazione, pagina sotto. */
export function TapedPhoto({ children, tilt = -1, style }: { children: React.ReactNode; tilt?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={styles.photoBack} />
      <View style={styles.photo}>{children}</View>
    </View>
  );
}

export interface PaperTab<K extends string> {
  key: K;
  label: string;
}
/** Linguette del ricettario: quella attiva "si unisce" alla pagina sotto. */
export function PaperTabs<K extends string>({ tabs, value, onChange, style }: { tabs: PaperTab<K>[]; value: K; onChange: (k: K) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tabsRow, style]} accessibilityRole="tablist">
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
            onPress={() => onChange(t.key)}
            style={[styles.tab, on ? styles.tabOn : null]}
          >
            <Text variant="small" color={on ? colors.ink : colors.inkSoft} style={styles.tabText}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.tabsLine} />
    </View>
  );
}

/** Anello di avanzamento (es. prodotti nel carrello). */
export function ProgressRing({ done, total, size = 58 }: { done: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const k = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${done} di ${total} nel carrello`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.tab} strokeWidth={8} fill={colors.paper} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.green}
          strokeWidth={8}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - k)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} stroke={colors.ink} strokeWidth={2} fill="none" />
      </Svg>
      <Text variant="caption" color={colors.ink} style={{ fontWeight: '800', fontSize: 13 }}>{`${done}/${total}`}</Text>
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

const styles = StyleSheet.create({
  pageWrap: { marginRight: 5, marginBottom: 5 },
  pageBack: { position: 'absolute', left: 5, top: 5, right: -5, bottom: -5, borderRadius: radius.lg, backgroundColor: colors.shadowPaper, borderWidth: outline.width, borderColor: outline.color },
  page: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: outline.width, borderColor: outline.color, padding: space.lg, gap: space.md },
  rings: { position: 'absolute', top: -13, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between' },
  ring: { width: 12, height: 26, borderRadius: 7, borderWidth: 2, borderColor: outline.color, backgroundColor: '#D8B24F' },
  tape: { position: 'absolute', width: 70, height: 22, backgroundColor: colors.tape, borderWidth: 1.5, borderColor: 'rgba(36,51,44,0.35)' },
  note: { borderWidth: outline.width, borderColor: outline.color, borderRadius: 20, borderTopLeftRadius: 6, padding: space.md, gap: 4 },
  noteTape: { top: -12, left: '36%', transform: [{ rotate: '-4deg' }] },
  label: { alignSelf: 'flex-start', paddingHorizontal: 9, borderRadius: 6, borderWidth: 1.5, borderColor: outline.color },
  labelText: { lineHeight: 24 },
  photoBack: { position: 'absolute', left: 3, top: 3, right: -3, bottom: -3, borderRadius: radius.md, backgroundColor: outline.color },
  photo: { borderRadius: radius.md, borderWidth: outline.width, borderColor: outline.color, overflow: 'hidden', backgroundColor: colors.peachSoft },
  tabsRow: { flexDirection: 'row', gap: 4, paddingLeft: space.sm },
  tab: { minHeight: TOUCH - 4, paddingHorizontal: space.lg, justifyContent: 'center', borderWidth: outline.width, borderBottomWidth: 0, borderColor: outline.color, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: colors.tab, marginBottom: -2, zIndex: 1 },
  tabOn: { backgroundColor: colors.paper, zIndex: 3 },
  tabText: { fontWeight: '700' },
  tabsLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: outline.width, backgroundColor: outline.color, zIndex: 2 },
  linkRow: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
