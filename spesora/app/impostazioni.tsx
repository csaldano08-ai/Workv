import { router } from 'expo-router';
import { Linking, Share, View } from 'react-native';
import { Alert } from '../src/ui/dialog';
import { cancelAllOurs } from '../src/core/notifications/NotificationScheduler';
import { appConfig } from '../src/core/config';
import { useApp } from '../src/features/app/AppProvider';
import { STEPS } from '../src/features/onboarding/registry';
import { colors } from '../src/theme/tokens';
import { Card } from '../src/ui/Card';
import { Divider, Row, SectionTitle } from '../src/ui/Row';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

export default function Settings() {
  const { run, service, refresh } = useApp();
  const editable = STEPS.filter((s) => s.editable);

  const exportData = async () => {
    if (!service) return;
    try {
      const json = await service.exportJson();
      await Share.share({ title: 'Dati Spesora', message: json });
    } catch {
      Alert.alert('Esportazione non riuscita', 'Riprova. I tuoi dati non sono stati modificati.');
    }
  };

  const wipe = () =>
    Alert.alert('Cancellare tutti i dati?', 'Preferenze, calendario, dispensa, liste e storico verranno eliminati da questo iPhone. L’operazione non si può annullare.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Continua',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Conferma definitiva', 'Vuoi davvero cancellare tutto e ripartire dal questionario?', [
            { text: 'No', style: 'cancel' },
            {
              text: 'Cancella tutto',
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
    { label: 'Informativa privacy completa', url: appConfig.legal.privacyPolicyUrl },
    { label: 'Termini di servizio', url: appConfig.legal.termsUrl },
    { label: 'Supporto', url: appConfig.legal.supportUrl },
  ].filter((l) => l.url);

  return (
    <Screen edges={['bottom']}>
      <SectionTitle>Le tue preferenze</SectionTitle>
      <Card style={{ gap: 0 }}>
        {editable.map((s, i) => (
          <View key={s.id}>
            {i > 0 ? <Divider /> : null}
            <Row title={s.title} onPress={() => router.push(`/preferenze/${s.id}`)} />
          </View>
        ))}
      </Card>
      <Text variant="small" color={colors.inkSoft}>
        Quando cambi le preferenze, i pasti futuri non ancora cucinati vengono ricalcolati. Pasti completati, acquisti e dispensa restano.
      </Text>

      <SectionTitle>App</SectionTitle>
      <Card style={{ gap: 0 }}>
        <Row icon="notifications-outline" title="Notifiche" onPress={() => router.push('/notifiche')} />
        <Divider />
        <Row icon="time-outline" title="Storico dei pasti" onPress={() => router.push('/storico')} />
        <Divider />
        <Row icon="star-outline" title="Spesora Plus" onPress={() => router.push('/plus')} />
        <Divider />
        <Row icon="shield-checkmark-outline" title="Privacy e dati" onPress={() => router.push('/privacy')} />
        {legalLinks.map((l) => (
          <View key={l.label}>
            <Divider />
            <Row icon="open-outline" title={l.label} onPress={() => void Linking.openURL(l.url)} />
          </View>
        ))}
      </Card>

      <SectionTitle>Dati</SectionTitle>
      <Card style={{ gap: 0 }}>
        <Row icon="share-outline" title="Esporta i dati (JSON)" subtitle="Preferenze, calendario, dispensa e storico" onPress={() => void exportData()} />
        <Divider />
        <Row icon="trash-outline" title="Cancella tutti i dati" subtitle="Riparti dal questionario" onPress={wipe} />
      </Card>

      <Text variant="small" color={colors.inkSoft}>
        {`Spesora ${appConfig.version}. I menù sono generati sul telefono da regole e punteggi deterministici: nessuna intelligenza artificiale, nessun server.`}
      </Text>
    </Screen>
  );
}
