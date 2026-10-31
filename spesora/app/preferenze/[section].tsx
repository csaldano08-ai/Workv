import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../src/core/notifications/schedule';
import { useApp } from '../../src/features/app/AppProvider';
import type { OnboardingDraft } from '../../src/features/onboarding/draft';
import { STEPS } from '../../src/features/onboarding/registry';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';
import { colors } from '../../src/theme/tokens';

export default function EditPreference() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { snapshot, run } = useApp();
  const def = STEPS.find((s) => s.id === section && s.editable);
  const [draft, setDraft] = useState<OnboardingDraft | null>(() =>
    snapshot?.profile
      ? { profile: snapshot.profile, shoppingFrequency: snapshot.profile.shoppingDays.length, pantry: {}, notifications: snapshot.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!def || !draft) return <Screen edges={['bottom']}>{null}</Screen>;

  const save = async () => {
    const problem = def.validate?.(draft) ?? null;
    if (problem) return setError(problem);
    setBusy(true);
    const ok = await run(async (s, today) => {
      await s.updateProfile(draft.profile, today);
      return true;
    });
    setBusy(false);
    if (ok) router.back();
  };

  return (
    <Screen edges={['bottom']} footer={<Button label="Salva e aggiorna il calendario" onPress={() => void save()} loading={busy} />}>
      <Stack.Screen options={{ title: 'Modifica' }} />
      <Text variant="title">{def.title}</Text>
      {def.subtitle ? (
        <Text variant="body" color={colors.inkSoft}>
          {def.subtitle}
        </Text>
      ) : null}
      <def.Component
        draft={draft}
        setDraft={(fn) => {
          setError(null);
          setDraft((d) => (d ? fn(d) : d));
        }}
      />
      {error ? <Notice tone="warning" text={error} /> : null}
    </Screen>
  );
}
