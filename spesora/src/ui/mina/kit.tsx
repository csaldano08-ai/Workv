import Ionicons from '@expo/vector-icons/Ionicons';
import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useT } from '../../i18n';
import { colors, radius, shadow, space, TOUCH } from '../../theme/tokens';
import { MinaLogo } from '../brand/MinaLogo';
import Svg, { Ellipse } from 'react-native-svg';
import { TextInput } from 'react-native';
import { Squish } from '../Squish';
import { Text } from '../Text';

/*
 * Mattoni comuni del restyling MINA (struttura delle schermate approvate):
 * intestazione con il logo, titolo grande, pillole di scelta, badge del giorno, elenchi in card bianche.
 * I pulsanti d'azione restano quelli dell'app (src/ui/Button.tsx).
 */

type IconName = keyof typeof Ionicons.glyphMap;

/** Altezza del logo nelle intestazioni (misurata sul riferimento: ~42 pt con i trattini, ~145 pt di larghezza). */
export const HEADER_LOGO = 41;

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
      <View style={[styles.flex, right ? styles.titleRoom : null]}>
        <Text variant="screen" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color={colors.inkSoft} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {/* la mascotte accanto al titolo non lo spinge in basso: sta in un angolo, appoggiata alla riga */}
      {right ? <View style={styles.titleSide}>{right}</View> : null}
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
export function Pills<K extends string>({
  options,
  value,
  onChange,
  style,
  fill,
  soft,
}: {
  options: PillOption<K>[];
  value: K;
  onChange: (k: K) => void;
  style?: StyleProp<ViewStyle>;
  /** Le pillole occupano tutta la riga (larghezza proporzionale al testo, niente etichette tagliate). */
  fill?: boolean;
  /** Variante leggera (selettori secondari, es. il giorno di spesa): bianca, scelta in salvia con bordo verde. */
  soft?: boolean;
}) {
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
            outerStyle={fill ? styles.grow : undefined}
            style={[styles.pill, fill && styles.pillFill, soft ? (on ? styles.softOn : styles.softOff) : on ? styles.pillOn : styles.pillOff]}
          >
            {o.icon ? <Ionicons name={o.icon} size={16} color={on && !soft ? colors.white : colors.greenDark} /> : null}
            <Text variant="small" color={on && !soft ? colors.white : colors.ink} style={styles.pillText} numberOfLines={1}>
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
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: -space.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginRight: -space.sm },
  headerIcon: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  headerBadge: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.peach, borderWidth: 1.5, borderColor: colors.desk },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginTop: space.sm },
  titleRoom: { paddingRight: 70 },
  titleSide: { position: 'absolute', right: 0, bottom: -10 },
  subtitle: { marginTop: 2, fontSize: 17, lineHeight: 23 },
  pills: { flexDirection: 'row', gap: space.sm },
  pill: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.lg, borderRadius: radius.pill },
  pillOn: { backgroundColor: colors.green, ...shadow.card },
  pillOff: { backgroundColor: colors.tab },
  pillFill: { paddingHorizontal: space.md },
  softOn: { minHeight: 38, backgroundColor: colors.greenSoft, borderWidth: 1.5, borderColor: colors.green },
  softOff: { minHeight: 38, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line },
  grow: { flexGrow: 1 },
  pillText: { fontWeight: '800', fontSize: 15 },
  dayBadge: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm },
  dayBadgeOff: { backgroundColor: colors.greenSoft },
  dayBadgeOn: { backgroundColor: colors.green, ...shadow.card },
  dayWeek: { fontWeight: '800', fontSize: 15, lineHeight: 19 },
  dayNum: { fontSize: 22, lineHeight: 27, fontWeight: '800' },
  dayDot: { position: 'absolute', top: -5, right: -5 },
  listCard: { backgroundColor: colors.card, borderRadius: radius.xl, paddingHorizontal: space.md, ...shadow.card },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: space.xs },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2 },
  pressed: { opacity: 0.7 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '800' },
  photoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.lg },
  bannerPeach: { backgroundColor: colors.peachSoft },
  bannerGreen: { backgroundColor: colors.greenSoft },
  bannerText: { flex: 1, fontWeight: '800' },
});

/** Nota breve con icona (spiegazioni di una riga al posto dei paragrafi). `tone` warning = avviso da non perdere. */
export function InfoNote({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warning' }) {
  const { t } = useT();
  const warn = tone === 'warning';
  return (
    <View style={[infoStyles.note, warn && infoStyles.noteWarn]} accessible accessibilityRole="text" accessibilityLabel={warn ? t('ui:a11y.warning', { text }) : text}>
      <Ionicons name={warn ? 'warning-outline' : 'information-circle-outline'} size={18} color={warn ? colors.peachInk : colors.inkSoft} style={infoStyles.icon} />
      <Text variant="small" color={warn ? colors.peachInk : colors.inkSoft} style={infoStyles.flex}>
        {text}
      </Text>
    </View>
  );
}

/** Spiegazione su richiesta: una riga «ⓘ Perché?» che apre il testo completo (secondo livello). */
export function InfoToggle({ label: customLabel, text }: { label?: string; text: string }) {
  const { t } = useT();
  // etichetta predefinita nella lingua corrente
  const label = customLabel ?? t('ui:infoToggle.why');
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


/**
 * «Palco» di Mina: un'ombra salvia ellittica sotto i piedi (come nel riferimento), così la mascotte appoggia su
 * qualcosa invece di galleggiare sulla pagina. `children` = la mascotte.
 */
export function MascotStage({ children, width = 240, height = 70, style }: { children: ReactNode; width?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[stageStyles.wrap, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={stageStyles.ground} pointerEvents="none">
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={colors.greenSoft} />
        <Ellipse cx={width / 2} cy={height / 2 + 4} rx={width * 0.34} ry={height * 0.28} fill={colors.sage} opacity={0.55} />
      </Svg>
      {children}
    </View>
  );
}

/** Campo di ricerca arrotondato con la lente (Ricette, Dispensa). */
export function SearchField({ value, onChangeText, placeholder, label }: { value: string; onChangeText: (v: string) => void; placeholder: string; label: string }) {
  return (
    <View style={stageStyles.search}>
      <Ionicons name="search" size={21} color={colors.ink} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.inkSoft} style={stageStyles.input} accessibilityLabel={label} autoCorrect={false} clearButtonMode="while-editing" />
    </View>
  );
}

/** Etichetta piccola (stato, «serve oggi», «TUA»). */
export function Tag({ text, tone = 'green', icon }: { text: string; tone?: 'green' | 'peach' | 'neutral'; icon?: IconName }) {
  const t = tone === 'peach' ? { bg: colors.peachSoft, fg: colors.peachInk } : tone === 'neutral' ? { bg: colors.tab, fg: colors.inkSoft } : { bg: colors.greenSoft, fg: colors.greenDark };
  return (
    <View style={[stageStyles.tag, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={t.fg} /> : null}
      <Text variant="caption" color={t.fg}>
        {text}
      </Text>
    </View>
  );
}

/** Sezione che si apre e si chiude (informazioni secondarie: costi, dettagli, note). */
export function Expandable({ title, icon = 'information-circle-outline', children, defaultOpen = false }: { title: string; icon?: IconName; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={stageStyles.exp}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} onPress={() => setOpen((o) => !o)} style={stageStyles.expHead} hitSlop={4}>
        <Ionicons name={icon} size={20} color={colors.green} />
        <Text variant="heading" color={colors.greenDark} style={stageStyles.expTitle}>
          {title}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.greenDark} />
      </Pressable>
      {open ? <View style={stageStyles.expBody}>{children}</View> : null}
    </View>
  );
}

const stageStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end' },
  ground: { position: 'absolute', bottom: -8 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 54, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow.card },
  input: { flex: 1, minHeight: 50, fontSize: 17, color: colors.ink },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
  exp: { borderRadius: radius.lg, backgroundColor: colors.greenMist, paddingHorizontal: space.md },
  expHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  expTitle: { flex: 1, fontWeight: '800', fontSize: 16 },
  expBody: { gap: space.sm, paddingBottom: space.md },
});
