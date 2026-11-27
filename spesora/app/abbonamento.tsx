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

/*
 * Abbonamento (telefono 6 del riferimento). Flusso: questionario → anteprima → qui → acquisto verificato → app.
 * - Prezzi, periodi e prove gratuite arrivano SOLO dallo store (RevenueCat): nessun prezzo o sconto nel codice.
 * - Con gli acquisti spenti (oggi) la pagina lo dice chiaramente e lascia entrare: nessun acquisto simulato.
 * - Nessun account: l'abbonamento resta legato all'account Apple/Google; «Ripristina acquisti» lo ritrova.
 * - Aperta dal Profilo mostra lo stato e la gestione dell'abbonamento.
 */

/** Vantaggi: funzioni reali dell'app (nessuna promessa inventata). */
const BENEFITS = ['Piano settimanale su misura', 'Lista della spesa divisa per giorni', 'Dispensa sempre aggiornata', 'Tutte le ricette, passo passo'];

function outcomeText(o: PurchaseOutcome): { text: string; error: boolean } | null {
  switch (o.kind) {
    case 'success':
      return o.entitlement.state === 'active' ? null : { text: 'Nessun abbonamento attivo trovato su questo account dello store.', error: false };
    case 'cancelled':
      return { text: 'Acquisto annullato: non ti è stato addebitato nulla.', error: false };
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
    ? { label: fromQuiz ? 'Entra in Mina' : 'Torna all’app', onPress: fromQuiz ? enter : () => router.back() }
    : plans && live
      ? { label: 'Inizia il piano', onPress: () => selected && void act(() => service.purchase(selected)) }
      : blocked
        ? null
        : { label: fromQuiz ? 'Continua' : 'Torna all’app', onPress: fromQuiz ? enter : () => router.back() };

  return (
    <SafeAreaView style={styles.safe} edges={fromQuiz ? ['top', 'bottom'] : ['bottom']}>
      <Stack.Screen options={{ headerShown: !fromQuiz, title: 'Abbonamento', gestureEnabled: !fromQuiz }} />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={[styles.hero, { height: compact ? 190 : 236 }]}>
          <Svg width="100%" height="100%" viewBox="0 0 390 236" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Path d="M0,0 H390 V176 C320,150 250,206 180,196 C110,186 60,150 0,168 Z" fill={colors.sage} />
            <Path d="M0,0 H390 V120 C330,104 270,146 200,140 C130,134 70,98 0,116 Z" fill={colors.greenSoft} opacity={0.7} />
          </Svg>
          <MinaMascot pose="happy" size={compact ? 118 : 150} animated idle interactive accessibilityLabel="Mina ti sorride" />
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Crown />
            <Text variant="screen" accessibilityRole="header" style={styles.title}>
              Sblocca tutto Mina
            </Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefit}>
                <View style={styles.tick}>
                  <Ionicons name="checkmark" size={16} color={colors.green} />
                </View>
                <Text variant="body" style={styles.flex}>
                  {b}
                </Text>
              </View>
            ))}
          </View>

          {active ? (
            <InfoNote
              text={
                entitlement?.state === 'active' && entitlement.inGracePeriod
                  ? 'Abbonamento attivo: lo store sta verificando il pagamento, le funzioni restano attive.'
                  : entitlement?.state === 'active' && entitlement.expiresAt
                    ? `Abbonamento attivo. Rinnovo o scadenza: ${new Date(entitlement.expiresAt).toLocaleDateString('it-IT')}.`
                    : 'Abbonamento attivo.'
              }
            />
          ) : entitlement?.state === 'expired' ? (
            <InfoNote tone="warning" text="Il tuo abbonamento è scaduto. Ricette salvate, dispensa e storico restano sul telefono." />
          ) : null}

          {service.mode === 'mock' ? <InfoNote tone="warning" text="Modalità sviluppo: acquisti simulati, prezzi di esempio, nulla viene addebitato." /> : null}

          {plans && !active ? (
            <View style={styles.plans} accessibilityRole="radiogroup">
              {plans.map((p) => {
                const on = p.id === selected;
                return (
                  <Squish
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${p.period === 'annual' ? 'Annuale' : 'Mensile'}, ${p.priceString} ${p.period === 'annual' ? 'all’anno' : 'al mese'}${p.introOffer ? `, ${p.introOffer}` : ''}`}
                    onPress={() => setSelected(p.id)}
                    outerStyle={styles.flex}
                    style={[styles.plan, on ? styles.planOn : styles.planOff]}
                  >
                    <Text variant="heading" style={styles.planName}>
                      {p.period === 'annual' ? 'Annuale' : 'Mensile'}
                    </Text>
                    <Text variant="body" color={colors.ink}>{`${p.priceString}${p.period === 'annual' ? '/anno' : '/mese'}`}</Text>
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
            <View style={styles.inactive} accessible accessibilityRole="text">
              <Ionicons name="information-circle-outline" size={22} color={colors.greenDark} />
              <View style={styles.flex}>
                <Text variant="heading" color={colors.greenDark}>
                  Abbonamenti non ancora attivi
                </Text>
                <Text variant="small" color={colors.inkSoft}>
                  {service.mode !== 'disabled' && unavailable ? `${unavailable} ` : ''}In questa versione di prova Mina è gratuita. Prezzi e piani verranno letti dallo store.
                </Text>
              </View>
            </View>
          ) : null}

          {message ? message.error ? <InlineError text={message.text} /> : <InfoNote text={message.text} /> : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {main ? <Button label={main.label} iconRight="arrow-forward" size="large" onPress={main.onPress} loading={busy} disabled={busy || (!!plans && live && !active && !selected)} /> : null}
        <View style={styles.links}>
          <Pressable accessibilityRole="button" onPress={() => void act(() => service.restore())} disabled={busy} hitSlop={6}>
            <Text variant="small" color={colors.green} style={styles.bold}>
              Ripristina acquisti
            </Text>
          </Pressable>
          <Text variant="small" color={colors.inkSoft}>
            ·
          </Text>
          <Pressable accessibilityRole="link" onPress={() => (appConfig.legal.termsUrl ? void Linking.openURL(appConfig.legal.termsUrl) : router.push('/termini'))} hitSlop={6}>
            <Text variant="small" color={colors.green} style={styles.bold}>
              Termini
            </Text>
          </Pressable>
          <Text variant="small" color={colors.inkSoft}>
            ·
          </Text>
          <Pressable accessibilityRole="link" onPress={() => (appConfig.legal.privacyPolicyUrl ? void Linking.openURL(appConfig.legal.privacyPolicyUrl) : router.push('/privacy'))} hitSlop={6}>
            <Text variant="small" color={colors.green} style={styles.bold}>
              Privacy
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
                  Gestisci
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
        {plans && live && !active ? (
          <Text variant="caption" color={colors.inkSoft} center style={styles.legal}>
            {`Rinnovo automatico al prezzo indicato, salvo disdetta almeno 24 ore prima della fine del periodo, dalle impostazioni dell’account ${Platform.OS === 'android' ? 'Google Play' : 'Apple'}. Il pagamento viene addebitato alla conferma.`}
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
  tick: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  plans: { flexDirection: 'row', gap: space.md },
  plan: { minHeight: 92, borderRadius: radius.lg, padding: space.md, justifyContent: 'center', gap: 2, backgroundColor: colors.white },
  planOn: { borderWidth: 2.5, borderColor: colors.green, backgroundColor: colors.greenMist, ...shadow.card },
  planOff: { borderWidth: 1.5, borderColor: colors.line, ...shadow.card },
  planName: { fontWeight: '800' },
  inactive: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.greenSoft },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md, gap: space.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  legal: { fontWeight: '400', letterSpacing: 0 },
});
