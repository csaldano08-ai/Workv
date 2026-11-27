import Ionicons from '@expo/vector-icons/Ionicons';
import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space, TOUCH } from '../../theme/tokens';
import { MinaLogo } from '../brand/MinaLogo';
import { Squish } from '../Squish';
import { Text } from '../Text';

/*
 * Mattoni comuni del restyling MINA (struttura delle schermate approvate):
 * intestazione con il logo, titolo grande, pillole di scelta, badge del giorno, elenchi in card bianche.
 * I pulsanti d'azione restano quelli dell'app (src/ui/Button.tsx).
 */

type IconName = keyof typeof Ionicons.glyphMap;

/** Altezza del logo nelle intestazioni (larghezza ≈ 3,5 × altezza, come nel riferimento: ~120 pt). */
export const HEADER_LOGO = 34;

/** Intestazione delle schede: logo a sinistra, eventuali icone a destra (campanella, impostazioni…). */
export function AppHeader({ right, style }: { right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.header, style]}>
      <MinaLogo height={HEADER_LOGO} />
      <View style={styles.flex} />
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

/** Icona toccabile dell'intestazione (44 pt di area di tocco). */
export function HeaderIcon({ icon, label, onPress, badge }: { icon: IconName; label: string; onPress: () => void; badge?: boolean }) {
  return (
    <Squish accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.headerIcon} hitSlop={4}>
      <Ionicons name={icon} size={26} color={colors.ink} />
      {badge ? <View style={styles.headerBadge} /> : null}
    </Squish>
  );
}

/** Titolo grande della schermata, con sottotitolo facoltativo e un elemento a destra (es. Mina piccola). */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.flex}>
        <Text variant="screen" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color={colors.inkSoft} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export interface PillOption<K extends string> {
  key: K;
  label: string;
  /** Numero mostrato tra parentesi, es. «Da acquistare (6)». */
  count?: number;
  icon?: IconName;
}

/**
 * Pillole di scelta (filtri e linguette): la scelta è verde piena con testo bianco, le altre salvia chiara.
 * Ruolo «tab» per gli screen reader, stato selezionato annunciato.
 */
export function Pills<K extends string>({ options, value, onChange, style, fill }: { options: PillOption<K>[]; value: K; onChange: (k: K) => void; style?: StyleProp<ViewStyle>; fill?: boolean }) {
  return (
    <View style={[styles.pills, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        const text = o.count === undefined ? o.label : `${o.label} (${o.count})`;
        return (
          <Squish
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={text}
            onPress={() => onChange(o.key)}
            outerStyle={fill ? styles.flex : undefined}
            style={[styles.pill, on ? styles.pillOn : styles.pillOff]}
          >
            {o.icon ? <Ionicons name={o.icon} size={16} color={on ? colors.white : colors.greenDark} /> : null}
            <Text variant="small" color={on ? colors.white : colors.ink} style={styles.pillText} numberOfLines={1}>
              {text}
            </Text>
          </Squish>
        );
      })}
    </View>
  );
}

/** Badge del giorno (salvia chiara, «Lun» sopra e il numero sotto); `active` = oggi o giorno scelto. */
export function DayBadge({ weekday, day, active, size = 64, dot }: { weekday: string; day: string; active?: boolean; size?: number; dot?: ReactNode }) {
  return (
    <View style={[styles.dayBadge, { width: size, minHeight: size }, active ? styles.dayBadgeOn : styles.dayBadgeOff]}>
      <Text variant="small" color={active ? colors.white : colors.green} style={styles.dayWeek}>
        {weekday}
      </Text>
      <Text variant="heading" color={active ? colors.white : colors.greenDark} style={styles.dayNum}>
        {day}
      </Text>
      {dot ? <View style={styles.dayDot}>{dot}</View> : null}
    </View>
  );
}

/** Card bianca che contiene un elenco di righe separate da linee sottili. */
export function ListCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = Children.toArray(children).filter((c) => isValidElement(c));
  return (
    <View style={[styles.listCard, style]}>
      {items.map((c, i) => (
        <Fragment key={isValidElement(c) && c.key != null ? c.key : i}>
          {i > 0 ? <View style={styles.sep} /> : null}
          {c}
        </Fragment>
      ))}
    </View>
  );
}

/** Riga di elenco: elemento a sinistra (immagine, icona, casella), titolo in grassetto, sottotitolo grigio, freccia. */
export function ListRow({
  left,
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
  chevron = !!onPress,
  accessibilityLabel,
  accessibilityHint,
  titleLines = 2,
  dim,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  titleLines?: number;
  dim?: boolean;
}) {
  const body = (
    <>
      {left}
      <View style={styles.rowText}>
        <Text variant="heading" numberOfLines={titleLines} color={dim ? colors.inkSoft : colors.ink} style={styles.rowTitle}>
          {title}
        </Text>
        {typeof subtitle === 'string' ? (
          <Text variant="small" color={colors.inkSoft} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={20} color={colors.ink} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** Cerchio bianco con un'icona sopra le foto (indietro, cuore, altre azioni). */
export function PhotoButton({ icon, label, onPress, color = colors.ink, selected, style }: { icon: IconName; label: string; onPress: () => void; color?: string; selected?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Squish accessibilityRole="button" accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }} onPress={onPress} style={[styles.photoBtn, style]} hitSlop={4}>
      <Ionicons name={icon} size={22} color={color} />
    </Squish>
  );
}

/** Banner compatto e toccabile (es. «Ti mancano 3 ingredienti ›»): icona, testo breve, freccia. */
export function Banner({ icon, text, tone = 'peach', onPress, accessibilityLabel }: { icon: ReactNode; text: string; tone?: 'peach' | 'green'; onPress?: () => void; accessibilityLabel?: string }) {
  const peach = tone === 'peach';
  const content = (
    <>
      {icon}
      <Text variant="heading" color={peach ? colors.peachInk : colors.greenDark} style={styles.bannerText} numberOfLines={2}>
        {text}
      </Text>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={peach ? colors.peachInk : colors.greenDark} /> : null}
    </>
  );
  const style = [styles.banner, peach ? styles.bannerPeach : styles.bannerGreen];
  if (!onPress) {
    return (
      <View style={style} accessible accessibilityLabel={accessibilityLabel ?? text}>
        {content}
      </View>
    );
  }
  return (
    <Squish accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? text} onPress={onPress} style={style}>
      {content}
    </Squish>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: space.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginRight: -space.sm },
  headerIcon: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  headerBadge: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.peach, borderWidth: 1.5, borderColor: colors.desk },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginTop: space.sm },
  subtitle: { marginTop: 2, fontSize: 17, lineHeight: 23 },
  pills: { flexDirection: 'row', gap: space.sm },
  pill: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.lg, borderRadius: radius.pill },
  pillOn: { backgroundColor: colors.green, ...shadow.card },
  pillOff: { backgroundColor: colors.tab },
  pillText: { fontWeight: '800', fontSize: 15 },
  dayBadge: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm },
  dayBadgeOff: { backgroundColor: colors.greenSoft },
  dayBadgeOn: { backgroundColor: colors.green, ...shadow.card },
  dayWeek: { fontWeight: '800', fontSize: 15, lineHeight: 19 },
  dayNum: { fontSize: 22, lineHeight: 27, fontWeight: '800' },
  dayDot: { position: 'absolute', top: -5, right: -5 },
  listCard: { backgroundColor: colors.white, borderRadius: radius.xl, paddingHorizontal: space.md, ...shadow.card },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: space.xs },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2 },
  pressed: { opacity: 0.7 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '800' },
  photoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.lg },
  bannerPeach: { backgroundColor: colors.peachSoft },
  bannerGreen: { backgroundColor: colors.greenSoft },
  bannerText: { flex: 1, fontWeight: '800' },
});

/** Nota breve con icona (spiegazioni di una riga al posto dei paragrafi). `tone` warning = avviso da non perdere. */
export function InfoNote({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warning' }) {
  const warn = tone === 'warning';
  return (
    <View style={[infoStyles.note, warn && infoStyles.noteWarn]} accessible accessibilityRole="text" accessibilityLabel={warn ? `Attenzione: ${text}` : text}>
      <Ionicons name={warn ? 'warning-outline' : 'information-circle-outline'} size={18} color={warn ? colors.peachInk : colors.inkSoft} style={infoStyles.icon} />
      <Text variant="small" color={warn ? colors.peachInk : colors.inkSoft} style={infoStyles.flex}>
        {text}
      </Text>
    </View>
  );
}

/** Spiegazione su richiesta: una riga «ⓘ Perché?» che apre il testo completo (secondo livello). */
export function InfoToggle({ label = 'Perché te lo chiedo?', text }: { label?: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={infoStyles.toggleWrap}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label} onPress={() => setOpen((o) => !o)} style={infoStyles.toggle} hitSlop={6}>
        <Ionicons name="information-circle-outline" size={18} color={colors.green} />
        <Text variant="small" color={colors.green} style={infoStyles.toggleText}>
          {label}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.green} />
      </Pressable>
      {open ? (
        <Text variant="small" color={colors.inkSoft} style={infoStyles.more}>
          {text}
        </Text>
      ) : null}
    </View>
  );
}

/** Errore recuperabile accanto all'elemento: icona + testo (mai solo il colore rosso). */
export function InlineError({ text }: { text: string }) {
  return (
    <View style={infoStyles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text variant="small" color={colors.danger} style={[infoStyles.flex, infoStyles.errorText]}>
        {text}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  noteWarn: { backgroundColor: colors.peachSoft, borderRadius: radius.md, padding: space.md },
  icon: { marginTop: 1 },
  toggleWrap: { gap: space.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
  toggleText: { fontWeight: '700' },
  more: { paddingLeft: 24 },
  error: { flexDirection: 'row', gap: space.sm, alignItems: 'center', paddingVertical: space.xs },
  errorText: { fontWeight: '700' },
});
