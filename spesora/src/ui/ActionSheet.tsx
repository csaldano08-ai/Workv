import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, TOUCH } from '../theme/tokens';
import { Text } from './Text';

export interface SheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** Menu di azioni multipiattaforma (iOS e Android), accessibile e senza animazioni lente. */
export function useActionSheet() {
  const [state, setState] = useState<{ title: string; subtitle?: string; options: SheetOption[] } | null>(null);
  const open = useCallback((title: string, options: SheetOption[], subtitle?: string) => setState({ title, options, subtitle }), []);
  const close = () => setState(null);
  const element = (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={close} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Chiudi menu" accessibilityRole="button" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        {state ? (
          <View style={styles.inner}>
            <Text variant="heading" accessibilityRole="header">
              {state.title}
            </Text>
            {state.subtitle ? (
              <Text variant="small" color={colors.inkSoft}>
                {state.subtitle}
              </Text>
            ) : null}
            {state.options.map((o) => (
              <Pressable
                key={o.label}
                accessibilityRole="button"
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.greenSoft }]}
                onPress={() => {
                  close();
                  o.onPress();
                }}
              >
                <Text variant="body" color={o.destructive ? colors.danger : colors.ink}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" style={styles.option} onPress={close}>
              <Text variant="heading" color={colors.green}>
                Annulla
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
  return { open, element };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,51,44,0.35)' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  inner: { padding: space.lg, gap: space.xs, maxWidth: 640, width: '100%', alignSelf: 'center' },
  option: { minHeight: TOUCH + 4, justifyContent: 'center', paddingHorizontal: space.sm, borderRadius: radius.sm },
});
