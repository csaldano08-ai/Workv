import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ingredientNeed } from '../../src/core/domain/portions';
import { prepAheadOf } from '../../src/core/domain/prepAhead';
import { formatQtyWithUnit } from '../../src/core/domain/quantity';
import { catalogIndex, useApp } from '../../src/features/app/AppProvider';
import { splitStep, stepIngredients, stepKind, type StepKind } from '../../src/features/cooking/steps';
import { useMealActions } from '../../src/features/meals/useMealActions';
import { ALLERGEN_LABELS } from '../../src/i18n/labels';
import { colors, radius, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { CategoryIcon } from '../../src/ui/illustrations/CategoryIcon';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { emitMina } from '../../src/ui/mascot/director';
import { Reveal } from '../../src/ui/Reveal';
import { Screen } from '../../src/ui/Screen';
import { StepTimer, type TimerPhase } from '../../src/ui/StepTimer';
import { Text } from '../../src/ui/Text';

/** Il gesto di Mina Chef per ogni tipo di passaggio (solo reazione visiva, nessun testo). */
const KIND_POSE: Record<StepKind, string> = { prep: 'checklist', cook: 'cooking', mix: 'mixing', serve: 'serving' };

/**
 * Modalità Cucina: un passaggio alla volta. In primo piano solo ciò che serve adesso — numero del passaggio, azione,
 * tempo, «Fatto, avanti» — e, a un tocco, gli ingredienti del passaggio e l'aiuto di Mina Chef. Le istruzioni
 * complete restano sempre raggiungibili («Tutti i passaggi») e gli allergeni sono sempre visibili.
 * Tutti i testi vengono dalla ricetta: nulla è inventato.
 */
export default function CookingMode() {
  const { id, mealId } = useLocalSearchParams<{ id: string; mealId?: string }>();
  const { snapshot } = useApp();
  const actions = useMealActions();
  const recipe = catalogIndex.recipe(String(id));
  const meal = mealId ? snapshot?.meals.find((m) => m.id === mealId) : undefined;
  const [index, setIndex] = useState(0);
  const [showIng, setShowIng] = useState(false);
  const [help, setHelp] = useState(false);
  const [allSteps, setAllSteps] = useState(false);
  const [timer, setTimer] = useState<TimerPhase>('idle');

  if (!recipe || !snapshot) {
    return (
      <Screen edges={['bottom']}>
        <Text variant="heading">Ricetta non trovata</Text>
        <Button label="Torna a Oggi" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const steps = recipe.steps;
  const n = steps.length;
  const done = index >= n;
  const servings = meal?.servings ?? snapshot.profile?.servings ?? recipe.baseServings;
  const facts = catalogIndex.factsOf(recipe);
  const nameOf = (ingId: string) => catalogIndex.ingredient(ingId).name;
  const go = (to: number) => {
    setIndex(Math.max(0, Math.min(n, to)));
    setShowIng(false);
    setHelp(false);
    setTimer('idle');
    if (to >= n) emitMina({ scope: 'cooking', kind: 'cooked', key: recipe.id });
  };

  // sicurezza alimentare: sempre visibile, anche durante la cottura
  const safety =
    facts.allergens.length > 0 || facts.allergenInfoIncomplete ? (
      <View style={styles.safety} accessible accessibilityRole="alert">
        <Ionicons name="warning-outline" size={16} color={colors.peachInk} />
        <Text variant="small" color={colors.peachInk} style={styles.flex}>
          {facts.allergens.length > 0 ? `Contiene: ${facts.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}.` : ''}
          {facts.allergenInfoIncomplete ? ' Alcuni prodotti confezionati: verifica l’etichetta.' : ''}
        </Text>
      </View>
    ) : null;

  const header = (
    <View style={styles.head}>
      <View style={styles.flex}>
        <Text variant="heading" numberOfLines={2}>
          {recipe.name}
        </Text>
      </View>
      <View style={styles.metaChip}>
        <Text variant="small" color={colors.greenDark} style={styles.bold}>{`${recipe.totalMinutes} min · ${servings} ${servings === 1 ? 'persona' : 'persone'}`}</Text>
      </View>
    </View>
  );

  if (done) {
    return (
      <Screen edges={['bottom']} reveal={false}>
        <Stack.Screen options={{ title: 'Modalità Cucina' }} />
        {header}
        <Reveal from="pop">
          <View style={styles.finish} accessible accessibilityLabel={`Mina Chef: buon appetito! ${recipe.name} è pronto.`}>
            <MinaMascot pose="serving" size={150} animated />
            <Text variant="title" center>
              Buon appetito!
            </Text>
            <Text variant="body" color={colors.inkSoft} center>
              {meal && meal.status === 'planned' ? 'Conferma che hai cucinato: aggiorno io la dispensa.' : 'Tutti i passaggi sono fatti.'}
            </Text>
          </View>
        </Reveal>
        {meal && meal.status === 'planned' ? (
          <Button
            label="Ho cucinato"
            icon="checkmark"
            onPress={() => {
              void actions.cooked(meal).then(() => router.replace('/'));
            }}
          />
        ) : null}
        <Button kind="secondary" label="Rivedi l'ultimo passaggio" icon="arrow-back" onPress={() => go(n - 1)} />
        {actions.sheet}
      </Screen>
    );
  }

  const step = steps[index];
  const { action, detail } = splitStep(step.text);
  const matched = stepIngredients(recipe, step.text, nameOf);
  const ingList = matched.length > 0 ? matched : recipe.ingredients;
  const kind = stepKind(step.text);
  const minaPose = timer === 'running' && kind !== 'serve' ? 'mixing' : timer === 'done' ? 'cooking' : KIND_POSE[kind];
  const subs = (recipe.substitutions ?? []).filter((s) => ingList.some((ri) => ri.ingredientId === s.ingredientId));
  const prep = index === 0 ? prepAheadOf(recipe) : null;
  const icon = matched.length ? catalogIndex.ingredient(matched[0].ingredientId).category : null;

  return (
    <Screen
      edges={['bottom']}
      reveal={false}
      footer={
        <View style={styles.nav}>
          <Button kind="secondary" label="Indietro" icon="arrow-back" onPress={() => (index === 0 ? router.back() : go(index - 1))} style={styles.navBack} />
          <Button label={index === n - 1 ? 'Fatto, finito' : 'Fatto, avanti'} icon={index === n - 1 ? 'checkmark' : 'arrow-forward'} onPress={() => go(index + 1)} style={styles.flex} />
        </View>
      }
    >
      <Stack.Screen options={{ title: 'Modalità Cucina' }} />
      {header}
      {safety}

      {/* avanzamento: un segmento per passaggio */}
      <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: n, now: index + 1 }}>
        {steps.map((_, k) => (
          <View key={k} style={[styles.seg, k <= index && styles.segOn]} />
        ))}
      </View>
      <View style={styles.stepRow}>
        <Text variant="caption" color={colors.green} style={styles.flex}>{`PASSAGGIO ${index + 1} DI ${n}`}</Text>
        {step.timerMinutes ? (
          <View style={styles.time}>
            <Ionicons name="time-outline" size={16} color={colors.inkSoft} />
            <Text variant="small" color={colors.inkSoft}>{`${step.timerMinutes} min`}</Text>
          </View>
        ) : null}
      </View>

      {/* l'azione da compiere adesso */}
      <Reveal key={index} from="right">
        <View style={styles.card}>
          {icon ? <CategoryIcon category={icon} size={44} /> : null}
          {/* azioni brevi in grande; quelle lunghe un po' più piccole, perché restino leggibili a colpo d'occhio */}
          <Text variant={action.length > 70 ? 'heading' : 'title'} center accessibilityRole="header" style={action.length > 70 ? styles.longAction : undefined}>
            {action}
          </Text>
          {detail ? (
            <Text variant="body" color={colors.inkSoft} center>
              {detail}
            </Text>
          ) : null}
          {step.timerMinutes ? <StepTimer minutes={step.timerMinutes} label={`passaggio ${index + 1}`} onPhase={setTimer} /> : null}
        </View>
      </Reveal>

      {/* ingredienti del passaggio: a un tocco */}
      <View style={styles.panel}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showIng }} onPress={() => setShowIng((v) => !v)} style={styles.panelHead}>
          <Ionicons name="basket-outline" size={20} color={colors.green} />
          <Text variant="heading" style={styles.flex}>
            {matched.length > 0 ? 'Ingredienti di questo passaggio' : 'Ingredienti della ricetta'}
          </Text>
          <Ionicons name={showIng ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkSoft} />
        </Pressable>
        {showIng
          ? ingList.map((ri) => {
              const ing = catalogIndex.ingredient(ri.ingredientId);
              const qty = ri.qty === undefined ? null : ingredientNeed(recipe, ri, ing, servings, snapshot.profile?.portions);
              return (
                <View key={ri.ingredientId} style={styles.ingRow}>
                  <Text variant="body" style={styles.flex}>
                    {ing.name}
                    {ri.hint ? <Text variant="small" color={colors.inkSoft}>{` (${ri.hint})`}</Text> : null}
                  </Text>
                  <Text variant="heading" style={styles.qty}>
                    {qty === null ? 'q.b.' : formatQtyWithUnit(qty, ing.unit)}
                  </Text>
                </View>
              );
            })
          : null}
      </View>

      {/* Mina Chef: reagisce al passaggio con un gesto; parla solo se glielo chiedi */}
      <View style={styles.mina}>
        <MinaMascot pose={minaPose} size={64} animated replayKey={`${index}-${timer}`} accessibilityLabel="Mina Chef" />
        <View style={styles.flex}>
          <Text variant="heading" color={colors.greenDark}>
            Mina Chef
          </Text>
          <Text variant="small" color={colors.inkSoft}>
            Un piccolo aiuto, quando ti serve.
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: help }} onPress={() => setHelp((v) => !v)} style={styles.ask}>
          <Text variant="small" color={colors.ink} style={styles.bold}>
            {help ? 'Chiudi' : 'Chiedi a Mina'}
          </Text>
        </Pressable>
      </View>
      {help ? (
        <Reveal from="pop">
          <View style={styles.help}>
            {step.timerMinutes ? <Text variant="small">{`Questo passaggio dura circa ${step.timerMinutes} minuti: avvia il timer qui sopra, allo scadere te lo segnalo io.`}</Text> : null}
            {prep ? <Text variant="small">{`Da fare in anticipo: ${prep.step}`}</Text> : null}
            {subs.map((s) => (
              <Text key={s.substituteId} variant="small">{`Se non hai ${nameOf(s.ingredientId).toLowerCase()}: ${nameOf(s.substituteId).toLowerCase()}. ${s.note}`}</Text>
            ))}
            <Text variant="small" color={colors.inkSoft}>{`Le quantità sono per ${servings} ${servings === 1 ? 'persona' : 'persone'}. Quando hai finito, tocca «${index === n - 1 ? 'Fatto, finito' : 'Fatto, avanti'}».`}</Text>
          </View>
        </Reveal>
      ) : null}

      {/* la ricetta completa resta sempre a portata */}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: allSteps }} onPress={() => setAllSteps((v) => !v)} style={styles.allLink} hitSlop={6}>
        <Text variant="small" color={colors.green} style={styles.bold}>
          {allSteps ? 'Nascondi tutti i passaggi' : `Tutti i passaggi (${n})`}
        </Text>
        <Ionicons name={allSteps ? 'chevron-up' : 'chevron-down'} size={16} color={colors.green} />
      </Pressable>
      {allSteps
        ? steps.map((s, k) => (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`Vai al passaggio ${k + 1}`} onPress={() => go(k)} style={[styles.allRow, k === index && styles.allRowOn]}>
              <Text variant="small" color={k === index ? colors.green : colors.inkSoft} style={styles.bold}>{`${k + 1}.`}</Text>
              <Text variant="small" style={styles.flex}>
                {s.text}
              </Text>
            </Pressable>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  metaChip: { backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  safety: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.peachSoft, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  progress: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.tab },
  segOn: { backgroundColor: colors.green },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { alignItems: 'center', gap: space.md, padding: space.xl, borderRadius: radius.xl, backgroundColor: colors.greenMist, borderWidth: 1, borderColor: colors.sage },
  panel: { borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: space.lg },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH + 8 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36, borderTopWidth: 1, borderTopColor: colors.line },
  qty: { fontVariant: ['tabular-nums'] },
  mina: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, paddingRight: space.md, borderRadius: radius.lg, backgroundColor: colors.peachSoft },
  ask: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.peach, backgroundColor: colors.white },
  help: { gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  allLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: TOUCH },
  allRow: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md },
  allRowOn: { backgroundColor: colors.greenMist },
  nav: { flexDirection: 'row', gap: space.sm },
  navBack: { minWidth: 120 },
  finish: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  longAction: { fontSize: 19, lineHeight: 26 },
});
