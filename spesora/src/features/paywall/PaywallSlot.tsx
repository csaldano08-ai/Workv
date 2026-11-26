import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { appConfig } from '../../core/config';
import type { PaywallMode } from '../../core/purchases/types';
import { colors, radius, space } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Text';

/**
 * Punto di inserimento della futura schermata di abbonamento (Spesora Plus).
 *
 * Oggi `paywallMode` è 'off' (app.json → expo.extra): il componente non mostra nulla e non blocca niente.
 * Nessun prezzo nel codice, nessun acquisto simulato: quando la monetizzazione sarà decisa,
 *  - 'soft' mostrerà un invito non bloccante che apre /plus (prezzi letti dallo store);
 *  - 'hard' resterà comunque non bloccante qui: il blocco delle singole funzioni passa da `canUse()`.
 * Vedi docs/restyling/ABBONAMENTI.md per i passi su App Store e Google Play.
 */
export type PaywallPlacement = 'onboarding_end';

export function shouldShowPaywall(mode: PaywallMode, placement: PaywallPlacement): boolean {
  void placement;
  return mode !== 'off';
}

export function PaywallSlot({ placement, mode = appConfig.paywallMode }: { placement: PaywallPlacement; mode?: PaywallMode }) {
  if (!shouldShowPaywall(mode, placement)) return null;
  return (
    <View style={styles.card}>
      <Text variant="heading">Spesora Plus</Text>
      <Text variant="small" color={colors.inkSoft}>
        Funzioni in più per organizzare la settimana. Puoi provarle quando vuoi: l’app resta utilizzabile anche senza.
      </Text>
      <Button kind="secondary" compact label="Scopri Spesora Plus" onPress={() => router.push('/plus')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.peachSoft },
});
