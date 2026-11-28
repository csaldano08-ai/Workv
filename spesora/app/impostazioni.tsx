import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useT } from '../src/i18n';
import { languageInfo } from '../src/i18n/languages';
import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { Alert } from '../src/ui/dialog';
import { cancelAllOurs } from '../src/core/notifications/NotificationScheduler';
import { appConfig } from '../src/core/config';
import { useApp } from '../src/features/app/AppProvider';
import { STEPS } from '../src/features/onboarding/registry';
import { colors, radius, space } from '../src/theme/tokens';
import { MinaMascot } from '../src/ui/mascot/Mina';
import { MinaLogo } from '../src/ui/brand/MinaLogo';
import { HEADER_LOGO, HeaderIcon, InfoNote, InfoToggle, ListCard, ListRow, ScreenTitle } from '../src/ui/mina/kit';
import { LIKE_LABELS } from '../src/core/domain/classify';
import { PROTEIN_LABELS } from '../src/features/onboarding/stepsPersonal';
import { replayIntro } from '../src/features/intro/introBus';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { toast } from '../src/ui/toast';

/*
 * Profilo (telefono 13 del riferimento): profilo LOCALE, nessun account. Le stesse funzioni delle vecchie
 * Impostazioni, raccolte in voci con icona: preferenze, notifiche, storico, prezzi, abbonamento, aiuto,
 * privacy e condizioni (pagine intere), i tuoi dati (esporta, cancella), informazioni su Mina.
 */
export default function Settings() {
  const { run, service, refresh, snapshot } = useApp();
  const editable = STEPS.filter((s) => s.editable);
  const [open, setOpen] = useState<string | null>(null);
  const { t, language } = useT();

  const exportData = async () => {
    if (!service) return;
    try {
      const json = await service.exportJson();
      await Share.share({ title: t('profile:export.shareTitle'), message: json });
    } catch {
      toast(t('profile:export.failed'), 'warning');
    }
  };

  const wipe = () =>
    Alert.alert(t('profile:wipe.title'), t('profile:wipe.message'), [
      { text: t('action.cancel'), style: 'cancel' },
      {
        text: t('action.continue'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('profile:wipe.confirmTitle'), t('profile:wipe.confirmMessage'), [
            { text: t('profile:wipe.no'), style: 'cancel' },
            {
              text: t('profile:wipe.confirm'),
              style: 'destructive',
              onPress: async () => {
                await cancelAllOurs().catch(() => undefined);
                await run((s) => s.wipe());
                await refresh();
                router.replace('/benvenuto');
              },
            },
          ]),
      },
    ]);

  const legalLinks = [
    { label: t('profile:link.privacy'), url: appConfig.legal.privacyPolicyUrl },
    { label: t('profile:link.terms'), url: appConfig.legal.termsUrl },
    { label: t('profile:link.support'), url: appConfig.legal.supportUrl },
  ].filter((l) => l.url);
  const p = snapshot?.profile;
  const summary = p
    ? [
        t('profile:summary.people', { count: p.servings }),
        t('profile:summary.pasta', { grams: p.portions.pastaGrams }),
        PROTEIN_LABELS[p.portions.proteinSize].toLowerCase(),
        ...p.tastes.likes.slice(0, 2).map((l) => LIKE_LABELS[l].toLowerCase()),
      ].join(' · ')
    : '';
  const meals = editable.filter((s) => MEAL_STEPS.includes(s.id));
  const food = editable.filter((s) => !MEAL_STEPS.includes(s.id));
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.top}>
        <HeaderIcon icon="arrow-back" label={t('profile:back')} onPress={back} />
        <MinaLogo height={HEADER_LOGO} />
      </View>
      <ScreenTitle title={t('profile:title')} subtitle={summary || undefined} />

      <ListCard>
        <Group icon="restaurant-outline" title={t('profile:group.meals')} open={open === 'pasti'} onToggle={() => setOpen(open === 'pasti' ? null : 'pasti')}>
          {meals.map((s) => (
            <SubRow key={s.id} title={s.title} plus={s.premium} onPress={() => router.push(`/preferenze/${s.id}`)} />
          ))}
        </Group>
        <Group icon="nutrition-outline" title={t('profile:group.food')} open={open === 'cibo'} onToggle={() => setOpen(open === 'cibo' ? null : 'cibo')}>
          {food.map((s) => (
            <SubRow key={s.id} title={s.title} plus={s.premium} onPress={() => router.push(`/preferenze/${s.id}`)} />
          ))}
        </Group>
        <ListRow
          left={<RowIcon icon="globe-outline" />}
          title={t('language:settingsTitle')}
          right={
            <Text variant="body" color={colors.inkSoft}>
              {languageInfo(language).nativeName}
            </Text>
          }
          onPress={() => router.push('/lingua')}
          accessibilityLabel={t('language:current', { name: languageInfo(language).nativeName })}
        />
        <ListRow left={<RowIcon icon="notifications-outline" />} title={t('profile:row.notifications')} onPress={() => router.push('/notifiche')} />
        <ListRow left={<RowIcon icon="time-outline" />} title={t('profile:row.history')} onPress={() => router.push('/storico')} />
        <ListRow left={<RowIcon icon="pricetag-outline" />} title={t('profile:row.prices')} subtitle={t('profile:row.pricesSub')} onPress={() => router.push('/prezzi')} />
        <ListRow left={<RowIcon icon="ribbon-outline" />} title={t('profile:row.subscription')} subtitle={t('profile:row.subscriptionSub')} onPress={() => router.push('/abbonamento')} />
        <ListRow left={<RowIcon icon="help-circle-outline" />} title={t('profile:row.help')} onPress={() => router.push('/aiuto')} />
        <Group icon="shield-checkmark-outline" title={t('profile:group.legal')} open={open === 'legale'} onToggle={() => setOpen(open === 'legale' ? null : 'legale')}>
          <SubRow title={t('profile:row.privacy')} onPress={() => router.push('/privacy')} />
          <SubRow title={t('profile:row.terms')} onPress={() => router.push('/termini')} />
          <SubRow title={t('profile:row.legal')} onPress={() => router.push('/legale')} />
          <SubRow title={t('profile:row.licenses')} onPress={() => router.push('/licenze')} />
          {legalLinks.map((l) => (
            <SubRow key={l.label} title={l.label} external onPress={() => void Linking.openURL(l.url)} />
          ))}
        </Group>
        <Group icon="folder-open-outline" title={t('profile:group.data')} open={open === 'dati'} onToggle={() => setOpen(open === 'dati' ? null : 'dati')}>
          <SubRow title={t('profile:row.export')} onPress={() => void exportData()} />
          <SubRow title={t('profile:row.wipe')} danger onPress={wipe} />
        </Group>
        <Group icon="information-circle-outline" title={t('profile:group.about')} open={open === 'info'} onToggle={() => setOpen(open === 'info' ? null : 'info')}>
          <Text variant="small" color={colors.inkSoft} style={styles.about}>
            {t('profile:about.text', { version: appConfig.version })}
          </Text>
          <SubRow title={t('profile:row.replayIntro')} onPress={replayIntro} />
        </Group>
      </ListCard>
      <InfoToggle label={t('profile:changes.label')} text={t('profile:changes.text')} />

      <InfoNote text={t('profile:localNote')} />
      <View style={styles.minaStage}>
        <View style={styles.minaBlob} />
        <MinaMascot pose="happy" eyes="heart" size={130} animated interactive accessibilityLabel={t('profile:mascot.a11y')} />
      </View>
    </Screen>
  );
}

const MEAL_STEPS = ['persone', 'pasti', 'tempo', 'orari', 'giorni-spesa', 'budget', 'strumenti'];

function RowIcon({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={24} color={colors.green} />
    </View>
  );
}

/** Voce che apre un piccolo elenco sotto di sé (le pagine restano quelle di prima). */
function Group({ icon, title, open, onToggle, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} onPress={onToggle} style={({ pressed }) => [styles.group, pressed && styles.pressed]}>
        <RowIcon icon={icon} />
        <Text variant="heading" style={[styles.flex, styles.bold]}>
          {title}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={20} color={colors.ink} />
      </Pressable>
      {open ? <View style={styles.groupBody}>{children}</View> : null}
    </View>
  );
}

function SubRow({ title, onPress, plus, danger, external }: { title: string; onPress: () => void; plus?: boolean; danger?: boolean; external?: boolean }) {
  const { t } = useT();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.sub, pressed && styles.pressed]}>
      <Text variant="body" color={danger ? colors.danger : colors.ink} style={styles.flex}>
        {title}
      </Text>
      {plus ? (
        <View style={styles.plus} accessibilityLabel={t('profile:plusBadge.a11y')}>
          <Text variant="caption" color={colors.peachInk}>
            {t('profile:plusBadge')}
          </Text>
        </View>
      ) : null}
      <Ionicons name={external ? 'open-outline' : danger ? 'trash-outline' : 'chevron-forward'} size={18} color={danger ? colors.danger : colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginLeft: -space.sm },
  rowIcon: { width: 40, alignItems: 'center' },
  group: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  groupBody: { paddingLeft: 40 + space.md, paddingBottom: space.sm, gap: 2 },
  sub: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pressed: { opacity: 0.7 },
  about: { paddingVertical: space.xs },
  plus: { backgroundColor: colors.peachSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  minaStage: { alignItems: 'center', justifyContent: 'flex-end', marginTop: space.md, minHeight: 170 },
  minaBlob: { position: 'absolute', bottom: 0, width: 260, height: 100, borderRadius: 70, backgroundColor: colors.greenSoft },
});
