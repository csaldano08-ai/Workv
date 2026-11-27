import { Stack } from 'expo-router';
import { Children, isValidElement } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, space } from '../theme/tokens';
import { Reveal } from './Reveal';

export interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  edges?: Edge[];
  footer?: React.ReactNode;
  scroll?: boolean;
  /**
   * Comparsa a cascata dei blocchi della pagina (predefinita nelle pagine che scorrono): ogni figlio diretto entra
   * con un piccolo ritardo dopo il precedente. Le schermate con una regia propria (Oggi, questionario) la spengono.
   * I figli che sono già un `Reveal` tengono la loro comparsa.
   */
  reveal?: boolean;
}

/**
 * Ogni figlio diretto in un `Reveal`, con l'indice della cascata; le chiavi restano quelle della posizione originale.
 * Restano come sono i figli che hanno già una comparsa propria e `Stack.Screen` (non disegna nulla: avvolto,
 * aggiungerebbe uno spazio vuoto in cima).
 */
function cascade(children: React.ReactNode) {
  return Children.toArray(children).map((child, i) =>
    isValidElement(child) && (child.type === Reveal || child.type === Stack.Screen) ? (
      child
    ) : (
      <Reveal key={isValidElement(child) ? (child.key ?? i) : i} index={i} style={styles.block}>
        {child}
      </Reveal>
    ),
  );
}

/** Contenitore standard: fondo chiaro, area sicura, larghezza massima leggibile, comparsa a cascata. */
export function Screen({ children, edges = ['top'], footer, scroll = true, reveal = true, contentContainerStyle, ...rest }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          {...rest}
        >
          <View style={styles.inner}>{reveal ? cascade(children) : children}</View>
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
  safe: { flex: 1, backgroundColor: colors.desk },
  content: { padding: space.lg, paddingBottom: space.xxl },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: space.lg },
  // un blocco può essere un frammento con più elementi: dentro tiene la stessa spaziatura della pagina
  block: { gap: space.lg },
  fill: { flex: 1 },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    gap: space.sm,
  },
});
