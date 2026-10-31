import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, space } from '../theme/tokens';

export interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  edges?: Edge[];
  footer?: React.ReactNode;
  scroll?: boolean;
}

/** Contenitore standard: fondo avorio, area sicura, larghezza massima leggibile. */
export function Screen({ children, edges = ['top'], footer, scroll = true, contentContainerStyle, ...rest }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          {...rest}
        >
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>
          <View style={[styles.inner, styles.fill]}>{children}</View>
        </View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: space.lg, paddingBottom: space.xxl },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: space.lg },
  fill: { flex: 1 },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ivory,
    gap: space.sm,
  },
});
