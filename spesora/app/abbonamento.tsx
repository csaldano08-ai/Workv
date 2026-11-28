import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { appConfig } from '../src/core/config';
import { mustSubscribe } from '../src/core/purchases/features';
import type { PlusPackage, PurchaseOutcome } from '../src/core/purchases/types';
import { purchaseService, refreshEntitlement, setEntitlement, useEntitlement } from '../src/features/paywall/subscription';
import { colors, radius, shadow, space } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { MinaMascot } from '../src/ui/mascot/Mina';
import { InfoNote, InlineError } from '../src/ui/mina/kit';
import { Squish } from '../src/ui/Squish';
import { Text } from '../src/ui/Text';
import { t as translate, useT } from '../src/i18n';
import { formatLocale } from '../src/core/domain/locale';

/*
 * Abbonamento (telefono 6 del riferimento). Flusso: questionario → anteprima → qui → acquisto verificato → app.
 * - Prezzi, periodi e prove gratuite arrivano SOLO dallo store (RevenueCat): nessun prezzo o sconto nel codice.
 * - Con gli acquisti spenti (oggi) la pagina lo dice chiaramente e lascia entrare: nessun acquisto simulato.
 * - Nessun account: l'abbonamento resta legato all'account Apple/Google; «Ripristina acquisti» lo ritrova.
 * - Aperta dal Profilo mostra lo stato e la gestione dell'abbonamento.
 */

/** Vantaggi: funzioni reali dell'app (nessuna promessa inventata). */
const BENEFITS = ['plan', 'shopping', 'pantry', 'recipes'] as const;

function outcomeText(o: PurchaseOutcome): { text: string; error: boolean } | null {
  switch (o.kind) {
    case 'success':
      return o.entitlement.state === 'active' ? null : { text: translate('paywall:outcome.noActive'), error: false };
    case 'cancelled':
      return { text: translate('paywall:outcome.cancelled'), error: false };
    case 'network_error':
      return { text: o.message, error: true };
    case 'not_available':
    case 'error':
      return { text: o.message, error: true };
  }
}

export default function Subscription() {
  const { da } = useLocalSearchParams<{ da?: string }>();
  const fromQuiz = da === 'questionario';
  const service = purchaseService();
  const { t } = useT();
  const entitlement = useEntitlement();
  const { height } = useWindowDimensions();
  const [packages, setPackages] = useState<PlusPackage[] | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    void service.getPackages().then((p) => {
      if (Array.isArray(p)) {
        setPackages(p);
        setSelected((p.find((x) => x.period === 'annual') ?? p[0])?.id ?? null);
      } else setUnavailable(p.unavailable);
    });
    void refreshEntitlement();
  }, [service]);

  const active = entitlement?.state === 'active';
  // con abbonamento obbligatorio e acquisti reali non si entra senza abbonamento (nessun «continua»)
  const blocked = mustSubscribe(appConfig.paywallMode, service.isLive, entitlement ?? { state: 'none' });
  const enter = () => router.replace('/');

  const act = async (fn: () => Promise<PurchaseOutcome>) => {
    setBusy(true);
    setMessage(null);
    const o = await fn();
    setBusy(false);
    if (o.kind === 'success') setEntitlement(o.entitlement);
    setMessage(outcomeText(o));
    // acquisto o ripristino verificato dallo store: si entra
    if (o.kind === 'success' && o.entitlement.state === 'active' && fromQuiz) enter();
  };

  const compact = height < 720;
  const live = service.isLive || service.mode === 'mock';
  const plans = packages && packages.length > 0 ? packages : null;
  const main = active
    ? { label: fromQuiz ? t('paywall:button.enter') : t('paywall:button.backToApp'), onPress: fromQuiz ? enter : () => router.back() }
    : plans && live
      ? { label: t('paywall:button.start'), onPress: () => selected && void act(() => service.purchase(selected)) }
      : blocked
        ? null
        : { label: fromQuiz ? t('paywall:button.continue') : t('paywall:button.backToApp'), onPress: fromQuiz ? enter : () => router.back() };

  const mainButton = main ? <Button label={main.label} iconRight="arrow-forward" size="large" onPress={main.onPress} loading={busy} disabled={busy || (!!plans && live && !active && !selected)} style={compact ? undefined : styles.mainBtn} /> : null;
  return (
    <SafeAreaView style={styles.safe} edges={fromQuiz ? ['top', 'bottom'] : ['bottom']}>
      <Stack.Screen options={{ headerShown: !fromQuiz, title: t('paywall:title'), gestureEnabled: !fromQuiz }} />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={[styles.hero, { height: compact ? 190 : 236 }]}>
          <Svg width="100%" height="100%" viewBox="0 0 390 236" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Path d="M0,0 H390 V176 C320,150 250,206 180,196 C110,186 60,150 0,168 Z" fill={colors.sage} />
            <Path d="M0,0 H390 V120 C330,104 270,146 200,140 C130,134 70,98 0,116 Z" fill={colors.greenSoft} opacity={0.7} />
          </Svg>
          <MinaMascot pose="happy" size={compact ? 130 : 172} animated idle interactive accessibilityLabel={t('paywall:mascot.a11y')} />
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Crown />
            <Text variant="screen" accessibilityRole="header" style={styles.title}>
              {t('paywall:heading')}
            </Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefit}>
                <View style={styles.tick}>
                  <Ionicons name="checkmark" size={16} color={colors.green} />
                </View>
                <Text variant="body" style={[styles.flex, styles.benefitText]}>
                  {t(`paywall:benefit.${b}`)}
                </Text>
              </View>
            ))}
          </View>

          {active ? (
            <InfoNote
              text={
                entitlement?.state === 'active' && entitlement.inGracePeriod
                  ? t('paywall:status.grace')
                  : entitlement?.state === 'active' && entitlement.expiresAt
                    ? t('paywall:status.activeUntil', { date: new Date(entitlement.expiresAt).toLocaleDateString(formatLocale()) })
                    : t('paywall:status.active')
              }
            />
          ) : entitlement?.state === 'expired' ? (
            <InfoNote tone="warning" text={t('paywall:status.expired')} />
          ) : null}

          {service.mode === 'mock' ? <InfoNote tone="warning" text={t('paywall:mockNotice')} /> : null}

          {plans && !active ? (
            <View style={styles.plans} accessibilityRole="radiogroup">
              {plans.map((p) => {
                const on = p.id === selected;
                return (
                  <Squish
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={p.introOffer ? t(`paywall:plan.a11y.${p.period}Offer`, { price: p.priceString, offer: p.introOffer }) : t(`paywall:plan.a11y.${p.period}`, { price: p.priceString })}
                    onPress={() => setSelected(p.id)}
                    outerStyle={styles.flex}
                    style={[styles.plan, on ? styles.planOn : styles.planOff]}
                  >
                    <Text variant="heading" style={styles.planName}>
                      {t(`paywall:plan.${p.period}`)}
                    </Text>
                    <Text variant="body" color={colors.ink}>{t(`paywall:plan.price.${p.period}`, { price: p.priceString })}</Text>
                    {p.introOffer ? (
                      <Text variant="small" color={colors.green} style={styles.bold}>
                        {p.introOffer}
                      </Text>
                    ) : null}
                  </Squish>
                );
              })}
            </View>
          ) : !active ? (
            <>
              {/* le due card dei piani come nel riferimento, ma senza prezzi inventati: con gli acquisti spenti il
                  prezzo non esiste ancora e le card non sono selezionabili */}
              <View style={styles.plans} accessible accessibilityLabel={t('paywall:plan.idle.a11y')}>
                {(['annual', 'monthly'] as const).map((period) => (
                  <View key={period} style={[styles.flex, styles.plan, styles.planOff, styles.planIdle]}>
                    <Text variant="heading" style={styles.planName}>
                      {t(`paywall:plan.${period}`)}
                    </Text>
                    <Text variant="small" color={colors.inkSoft}>
                      {t('paywall:plan.idle.price')}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.inactive} accessible accessibilityRole="text">
                <Ionicons name="information-circle-outline" size={20} color={colors.greenDark} />
                <Text variant="small" color={colors.greenDark} style={[styles.flex, styles.bold]}>
                  {service.mode !== 'disabled' && unavailable ? `${unavailable} ` : ''}
                  {t('paywall:inactive')}
                </Text>
              </View>
            </>
          ) : null}

          {message ? message.error ? <InlineError text={message.text} /> : <InfoNote text={message.text} /> : null}
          {/* pulsante principale subito sotto i piani, come nel riferimento (non in fondo alla pagina);
              sugli schermi bassi resta fisso in basso, così non finisce mai sotto i link */}
          {compact ? null : mainButton}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {compact ? mainButton : null}
        <View style={styles.links}>
          <Pressable accessibilityRole="button" onPress={() => void act(() => service.restore())} disabled={busy} hitSlop={6}>
            <Text variant="small" color={colors.green} style={styles.bold}>
              {t('paywall:link.restore')}
            </Text>
          </Pressable>
          <Text variant="small" color={colors.inkSoft}>
            ·
          </Text>
          <Pressable accessibilityRole="link" onPress={() => (appConfig.legal.termsUrl ? void Linking.openURL(appConfig.legal.termsUrl) : router.push('/termini'))} hitSlop={6}>
            <Text variant="small" color={colors.green} style={styles.bold}>
              {t('paywall:link.terms')}
            </Text>
          </Pressable>
          <Text variant="small" color={colors.inkSoft}>
            ·
          </Text>
          <Pressable accessibilityRole="link" onPress={() => (appConfig.legal.privacyPolicyUrl ? void Linking.openURL(appConfig.legal.privacyPolicyUrl) : router.push('/privacy'))} hitSlop={6}>
            <Text variant="small" color={colors.green} style={styles.bold}>
              {t('paywall:link.privacy')}
            </Text>
          </Pressable>
          {active && service.isLive ? (
            <>
              <Text variant="small" color={colors.inkSoft}>
                ·
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={6}
                onPress={async () => {
                  const url = await service.managementUrl();
                  if (url) void Linking.openURL(url);
                }}
              >
                <Text variant="small" color={colors.green} style={styles.bold}>
                  {t('paywall:link.manage')}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
        {plans && live && !active ? (
          <Text variant="caption" color={colors.inkSoft} center style={styles.legal}>
            {t('paywall:renewal', { store: Platform.OS === 'android' ? 'Google Play' : 'Apple' })}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** Coroncina del titolo (come nel riferimento), disegnata. */
function Crown() {
  return (
    <Svg width={30} height={26} viewBox="0 0 30 26" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M3 9 L9 15 L15 5 L21 15 L27 9 L25 22 H5 Z" fill="#F5B02E" stroke="#C9840E" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M6 22 H24" stroke="#C9840E" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.desk },
  scroll: { flexGrow: 1 },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  hero: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 },
  sheet: { marginTop: -34, backgroundColor: colors.desk, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { fontSize: 27, lineHeight: 33, flexShrink: 1 },
  benefits: { gap: space.md },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  benefitText: { fontSize: 17, fontWeight: '600' },
  tick: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  plans: { flexDirection: 'row', gap: space.md },
  plan: { minHeight: 96, borderRadius: radius.lg, padding: space.lg, justifyContent: 'center', gap: 4, backgroundColor: colors.card },
  planOn: { borderWidth: 2.5, borderColor: colors.green, backgroundColor: colors.greenMist, ...shadow.card },
  planOff: { borderWidth: 1.5, borderColor: colors.line, ...shadow.card },
  planName: { fontWeight: '800', fontSize: 19 },
  inactive: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.greenSoft },
  planIdle: { opacity: 0.75 },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md, gap: space.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  mainBtn: { marginTop: space.sm },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  legal: { fontWeight: '400', letterSpacing: 0 },
});
