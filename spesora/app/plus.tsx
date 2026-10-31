import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Alert } from '../src/ui/dialog';
import { appConfig } from '../src/core/config';
import { PLUS_FEATURES } from '../src/core/purchases/features';
import { Timo } from '../src/ui/mascot/Timo';
import { createPurchaseService } from '../src/core/purchases/services';
import type { EntitlementStatus, PlusPackage, PurchaseOutcome } from '../src/core/purchases/types';
import { colors, space } from '../src/theme/tokens';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Notice } from '../src/ui/Notice';
import { SectionTitle } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

const FREE = ['Calendario settimanale', 'Ricette di base', 'Lista della spesa', 'Promemoria giornaliero', 'Modifica delle preferenze'];
const PLUS = Object.values(PLUS_FEATURES).map((f) => `${f.label}: ${f.description}`);

function outcomeMessage(o: PurchaseOutcome): string {
  switch (o.kind) {
    case 'success':
      return o.entitlement.state === 'active' ? 'Spesora Plus è attivo.' : 'Nessun abbonamento attivo trovato.';
    case 'cancelled':
      return 'Acquisto annullato. Non ti è stato addebitato nulla.';
    case 'network_error':
      return `Connessione non disponibile: ${o.message}`;
    case 'not_available':
    case 'error':
      return o.message;
  }
}

export default function Plus() {
  const service = useMemo(() => createPurchaseService(appConfig.purchasesMode, __DEV__, appConfig.revenuecat), []);
  const [packages, setPackages] = useState<PlusPackage[] | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementStatus>({ state: 'none' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void service.getPackages().then((p) => (Array.isArray(p) ? setPackages(p) : setUnavailable(p.unavailable)));
    void service.getEntitlement().then(setEntitlement);
  }, [service]);

  const act = async (fn: () => Promise<PurchaseOutcome>) => {
    setBusy(true);
    const o = await fn();
    setBusy(false);
    if (o.kind === 'success') setEntitlement(o.entitlement);
    Alert.alert('Spesora Plus', outcomeMessage(o));
  };

  return (
    <Screen edges={['bottom']}>
      {service.mode === 'mock' ? (
        <Notice tone="warning" title="Modalità sviluppo" text="Acquisti simulati: nessun pagamento reale, nulla viene salvato. Prezzi indicati come ESEMPIO." />
      ) : null}
      <View style={styles.hero}>
        <Timo pose="suggerimento" size={84} />
        <Text variant="title" style={styles.flex}>
          Più tempo per te, meno decisioni
        </Text>
      </View>
      <Text variant="body" color={colors.inkSoft}>
        Durante questa fase di prova tutte le funzioni sono disponibili gratuitamente. Spesora Plus servirà a sostenere lo sviluppo e l’ampliamento del catalogo.
      </Text>

      <SectionTitle>Gratis</SectionTitle>
      <Card>
        {FREE.map((f) => (
          <Benefit key={f} text={f} />
        ))}
      </Card>
      <SectionTitle>Spesora Plus</SectionTitle>
      <Card tone="green">
        {PLUS.map((f) => (
          <Benefit key={f} text={f} />
        ))}
      </Card>

      {entitlement.state === 'active' ? (
        <Notice title="Abbonamento attivo" text={entitlement.inGracePeriod ? 'Pagamento in verifica da parte dello store: le funzioni restano attive per il periodo di tolleranza.' : entitlement.expiresAt ? `Rinnovo o scadenza: ${new Date(entitlement.expiresAt).toLocaleDateString('it-IT')}.` : 'Attivo.'} />
      ) : entitlement.state === 'expired' ? (
        <Notice tone="peach" title="Abbonamento scaduto" text="Le tue ricette, la dispensa e lo storico restano disponibili." />
      ) : null}

      {unavailable ? <Notice text={`${unavailable} Prezzi e condizioni verranno mostrati qui, letti direttamente dall’App Store.`} /> : null}
      {packages?.map((p) => (
        <Card key={p.id}>
          <View style={styles.pkg}>
            <View style={styles.flex}>
              <Text variant="heading">{p.period === 'monthly' ? 'Mensile' : 'Annuale'}</Text>
              <Text variant="small" color={colors.inkSoft}>
                {p.introOffer ?? 'Rinnovo automatico, disdici quando vuoi dalle impostazioni dell’App Store.'}
              </Text>
            </View>
            <Text variant="heading">{p.priceString}</Text>
          </View>
          <Button label={`Scegli ${p.period === 'monthly' ? 'mensile' : 'annuale'}`} loading={busy} onPress={() => void act(() => service.purchase(p.id))} />
        </Card>
      ))}

      <View style={styles.row}>
        <Button kind="secondary" compact label="Ripristina acquisti" onPress={() => void act(() => service.restore())} style={styles.flex} disabled={busy} />
        <Button
          kind="secondary"
          compact
          label="Gestisci abbonamento"
          style={styles.flex}
          disabled={busy || !service.isLive}
          onPress={async () => {
            const url = await service.managementUrl();
            if (url) void Linking.openURL(url);
          }}
        />
      </View>
      <Text variant="small" color={colors.inkSoft}>
        Il pagamento sarà addebitato sul tuo account Apple alla conferma. L’abbonamento si rinnova automaticamente salvo disdetta almeno 24 ore prima della fine del periodo. La scadenza non cancella ricette salvate, dispensa o storico.
      </Text>
    </Screen>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <View style={styles.benefit}>
      <Ionicons name="checkmark" size={18} color={colors.green} />
      <Text variant="body" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  pkg: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  benefit: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
});
