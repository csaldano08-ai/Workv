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
import { useT } from '../../src/i18n';
import { ingredientName, recipeLanguageStatus, recipeName, recipeStep } from '../../src/i18n/content';
import { ALLERGEN_LABELS } from '../../src/i18n/labels';
import { colors, radius, shadow, space, TOUCH } from '../../src/theme/tokens';
import { Button } from '../../src/ui/Button';
import { IngredientSymbol } from '../../src/ui/illustrations/IngredientSymbol';
import { MinaMascot } from '../../src/ui/mascot/Mina';
import { emitMina } from '../../src/ui/mascot/director';
import { InfoNote } from '../../src/ui/mina/kit';
import { RecipeImage } from '../../src/ui/RecipeImage';
import { Reveal } from '../../src/ui/Reveal';
import { Screen } from '../../src/ui/Screen';
import { StepTimer, type TimerPhase } from '../../src/ui/StepTimer';
import { Text } from '../../src/ui/Text';

/** Il gesto di Mina Chef per ogni tipo di passaggio (solo reazione visiva, nessun testo). */
const KIND_POSE: Record<StepKind, string> = { prep: 'checklist', cook: 'cooking', mix: 'mixing', serve: 'serving' };
/** Simbolo generico dell'azione, quando il passaggio non nomina ingredienti riconosciuti (mai un ingrediente a caso). */
const KIND_ICON: Record<StepKind, keyof typeof Ionicons.glyphMap> = { prep: 'restaurant-outline', cook: 'flame-outline', mix: 'sync-outline', serve: 'restaurant' };

/**
 * Modalità Cucina, dall'alto in basso:
 *   1. nome della ricetta · 2. tempo e persone · 3. allergeni (sintesi, dettagli a richiesta) · 4. avanzamento ·
 *   5. il passaggio attivo (card alta quanto il testo, testo grande) · 6. ingredienti del passaggio ·
 *   7. Indietro / Avanti (fissi in basso) · 8. Mina Chef con i consigli presi dalla ricetta.
 * «Consigli» mostra solo dati veri della ricetta (tempi, preparazioni in anticipo, sostituzioni): non esiste
 * ancora un assistente che risponde a domande libere, e l'interfaccia non lo simula.
 */
export default function CookingMode() {
  const { id, mealId } = useLocalSearchParams<{ id: string; mealId?: string }>();
  const { snapshot } = useApp();
  const { t } = useT();
  const actions = useMealActions();
  const recipe = catalogIndex.recipe(String(id));
  const meal = mealId ? snapshot?.meals.find((m) => m.id === mealId) : undefined;
  const [index, setIndex] = useState(0);
  const [showIng, setShowIng] = useState(true);
  const [help, setHelp] = useState(false);
  const [allSteps, setAllSteps] = useState(false);
  const [allergenInfo, setAllergenInfo] = useState(false);
  const [timer, setTimer] = useState<TimerPhase>('idle');

  if (!recipe || !snapshot) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: t('cooking:title') }} />
        <Text variant="heading">{t('cooking:notFound')}</Text>
        <Button label={t('cooking:backHome')} onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const steps = recipe.steps;
  const n = steps.length;
  const done = index >= n;
  const name = recipeName(recipe);
  const servings = meal?.servings ?? snapshot.profile?.servings ?? recipe.baseServings;
  const facts = catalogIndex.factsOf(recipe);
  const italianName = (ingId: string) => catalogIndex.ingredient(ingId).name;
  const nameOf = (ingId: string) => ingredientName(ingId, italianName(ingId));
  const methodItalianOnly = ['name-only', 'not-translated'].includes(recipeLanguageStatus(recipe));
  const go = (to: number) => {
    setIndex(Math.max(0, Math.min(n, to)));
    setHelp(false);
    setTimer('idle');
    if (to >= n) emitMina({ scope: 'cooking', kind: 'cooked', key: recipe.id });
  };

  // 1–2: nome, foto piccola, tempo e persone
  const header = (
    <View style={styles.head}>
      <RecipeImage recipe={recipe} variant="thumb" rounded={radius.lg} aspectRatio={1} style={styles.thumb} />
      <View style={styles.headText}>
        <Text variant="title" accessibilityRole="header" numberOfLines={3} style={styles.recipeName}>
          {name}
        </Text>
        <View style={styles.chips} accessible accessibilityLabel={t('cooking:meta.a11y', { minutes: recipe.totalMinutes, count: servings })}>
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={15} color={colors.greenDark} />
            <Text variant="small" color={colors.greenDark} style={styles.bold}>
              {t('cooking:timer', { minutes: recipe.totalMinutes })}
            </Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="people-outline" size={15} color={colors.greenDark} />
            <Text variant="small" color={colors.greenDark} style={styles.bold}>
              {t('cooking:meta.people', { count: servings })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // 3: allergeni dai dati della ricetta (classificazione verificata degli ingredienti); dettagli a richiesta
  const hasAllergenNote = facts.allergens.length > 0 || facts.allergenInfoIncomplete;
  const safety = hasAllergenNote ? (
    <View style={styles.safety}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: allergenInfo }}
        accessibilityHint={t('cooking:allergens.details')}
        onPress={() => setAllergenInfo((v) => !v)}
        style={styles.safetyRow}
      >
        <Ionicons name="warning-outline" size={18} color={colors.peachInk} />
        <Text variant="small" color={colors.peachInk} style={styles.flex}>
          <Text variant="small" color={colors.peachInk} style={styles.bold}>
            {`${t('cooking:allergens.label')} `}
          </Text>
          {facts.allergens.length > 0 ? `${facts.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}.` : t('cooking:allergens.checkPackaged')}
        </Text>
        <Ionicons name={allergenInfo ? 'information-circle' : 'information-circle-outline'} size={20} color={colors.peachInk} />
      </Pressable>
      {allergenInfo ? (
        <Text variant="small" color={colors.peachInk}>
          {facts.allergenInfoIncomplete ? `${t('cooking:allergens.incomplete')} ` : ''}
          {t('allergen.disclaimer')}
        </Text>
      ) : null}
    </View>
  ) : null;

  if (done) {
    return (
      <Screen edges={['bottom']} reveal={false}>
        <Stack.Screen options={{ title: t('cooking:title') }} />
        {header}
        <Reveal from="pop">
          <View style={styles.finish} accessible accessibilityLabel={t('cooking:finish.a11y', { name })}>
            <MinaMascot pose="serving" size={150} animated />
            <Text variant="title" center>
              {t('cooking:finish.title')}
            </Text>
            <Text variant="body" color={colors.inkSoft} center>
              {meal && meal.status === 'planned' ? t('cooking:finish.confirm') : t('cooking:finish.allDone')}
            </Text>
          </View>
        </Reveal>
        {meal && meal.status === 'planned' ? (
          <Button
            label={t('action.cooked')}
            icon="checkmark"
            onPress={() => {
              void actions.cooked(meal).then(() => router.replace('/'));
            }}
          />
        ) : null}
        <Button kind="secondary" label={t('cooking:finish.review')} icon="arrow-back" onPress={() => go(n - 1)} />
        {actions.sheet}
      </Screen>
    );
  }

  const step = steps[index];
  const { action, detail } = splitStep(recipeStep(recipe, index));
  // gli ingredienti si riconoscono dal testo originale (italiano) della ricetta
  const matched = stepIngredients(recipe, step.text, italianName);
  const ingList = matched.length > 0 ? matched : recipe.ingredients;
  const kind = stepKind(step.text);
  const minaPose = timer === 'running' && kind !== 'serve' ? 'mixing' : timer === 'done' ? 'cooking' : KIND_POSE[kind];
  const subs = (recipe.substitutions ?? []).filter((s) => ingList.some((ri) => ri.ingredientId === s.ingredientId));
  const prep = index === 0 ? prepAheadOf(recipe) : null;
  const nextLabel = index === n - 1 ? t('cooking:nav.finish') : t('cooking:nav.next');
  const long = action.length > 90;

  return (
    <Screen
      edges={['bottom']}
      reveal={false}
      footer={
        <View style={styles.nav}>
          <Button kind="secondary" label={t('action.back')} icon="arrow-back" onPress={() => (index === 0 ? router.back() : go(index - 1))} style={styles.navBack} />
          <Button label={nextLabel} iconRight={index === n - 1 ? 'checkmark' : 'arrow-forward'} onPress={() => go(index + 1)} outerStyle={styles.flex} />
        </View>
      }
    >
      <Stack.Screen options={{ title: t('cooking:title') }} />
      {header}
      {safety}

      {/* 4: avanzamento, un segmento per passaggio */}
      <View style={styles.progressRow}>
        <Text variant="heading" color={colors.greenDark} style={styles.progressText}>
          {t('cooking:progress', { current: index + 1, total: n })}
        </Text>
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: n, now: index + 1 }}>
          {steps.map((_, k) => (
            <View key={k} style={[styles.seg, k <= index && styles.segOn]} />
          ))}
        </View>
      </View>

      {/* 5: l'azione da compiere adesso: la card segue la lunghezza del testo, il testo resta grande */}
      <Reveal key={index} from="right">
        <View style={styles.card}>
          <View style={styles.cardIcons}>
            {matched.length > 0 ? (
              matched.slice(0, 3).map((ri) => <IngredientSymbol key={ri.ingredientId} id={ri.ingredientId} category={catalogIndex.ingredient(ri.ingredientId).category} size={46} />)
            ) : (
              <View style={styles.kindIcon}>
                <Ionicons name={KIND_ICON[kind]} size={26} color={colors.green} />
              </View>
            )}
          </View>
          <Text variant="title" center accessibilityRole="header" style={long ? styles.actionLong : styles.action}>
            {action}
          </Text>
          {detail ? (
            <Text variant="body" color={colors.inkSoft} center style={styles.detail}>
              {detail}
            </Text>
          ) : null}
          {step.timerMinutes ? <StepTimer minutes={step.timerMinutes} label={t('cooking:progress', { current: index + 1, total: n })} onPhase={setTimer} /> : null}
        </View>
      </Reveal>
      {methodItalianOnly ? <InfoNote text={t('recipes:language.italianOnly')} /> : null}

      {/* 6: ingredienti del passaggio, aperti di default (si chiudono con un tocco) */}
      <View style={styles.panel}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showIng }} onPress={() => setShowIng((v) => !v)} style={styles.panelHead}>
          <Ionicons name="basket-outline" size={20} color={colors.green} />
          <Text variant="heading" style={styles.flex}>
            {matched.length > 0 ? t('cooking:ingredients.step', { count: ingList.length }) : t('cooking:ingredients.recipe', { count: ingList.length })}
          </Text>
          <Ionicons name={showIng ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkSoft} />
        </Pressable>
        {showIng
          ? ingList.map((ri) => {
              const ing = catalogIndex.ingredient(ri.ingredientId);
              const qty = ri.qty === undefined ? null : ingredientNeed(recipe, ri, ing, servings, snapshot.profile?.portions);
              return (
                <View key={ri.ingredientId} style={styles.ingRow}>
                  <IngredientSymbol id={ri.ingredientId} category={ing.category} size={34} />
                  <View style={styles.flex}>
                    <Text variant="heading" style={styles.ingName}>
                      {nameOf(ri.ingredientId)}
                    </Text>
                    <Text variant="small" color={colors.inkSoft} style={styles.qty}>
                      {qty === null ? t('cooking:toTaste') : formatQtyWithUnit(qty, ing.unit)}
                    </Text>
                  </View>
                </View>
              );
            })
          : null}
      </View>

      {/* 8: Mina Chef reagisce al passaggio con un gesto; i consigli vengono dalla ricetta e si aprono a richiesta */}
      <View style={styles.mina}>
        <MinaMascot pose={minaPose} size={64} animated replayKey={`${index}-${timer}`} accessibilityLabel="Mina Chef" />
        <View style={styles.flex}>
          <Text variant="heading" color={colors.greenDark}>
            Mina Chef
          </Text>
          <Text variant="small" color={colors.inkSoft}>
            {t('cooking:chef.sub')}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: help }} accessibilityHint={t('cooking:chef.openHint')} onPress={() => setHelp((v) => !v)} style={styles.ask}>
          <Ionicons name={help ? 'close' : 'bulb-outline'} size={16} color={colors.ink} />
          <Text variant="small" color={colors.ink} style={styles.bold}>
            {help ? t('action.close') : t('cooking:chef.open')}
          </Text>
        </Pressable>
      </View>
      {help ? (
        <Reveal from="pop">
          <View style={styles.help}>
            {step.timerMinutes ? <Text variant="small">{t('cooking:help.timer', { minutes: step.timerMinutes })}</Text> : null}
            {prep ? <Text variant="small">{t('cooking:help.prep', { step: prep.step })}</Text> : null}
            {subs.map((s) => (
              <Text key={s.substituteId} variant="small">{`${t('cooking:help.sub', { a: nameOf(s.ingredientId).toLowerCase(), b: nameOf(s.substituteId).toLowerCase() })} ${s.note}`}</Text>
            ))}
            <Text variant="small" color={colors.inkSoft}>{`${t('cooking:help.servings', { count: servings })} ${t('cooking:help.next', { label: nextLabel })}`}</Text>
          </View>
        </Reveal>
      ) : null}

      {/* la ricetta completa resta sempre a portata */}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: allSteps }} onPress={() => setAllSteps((v) => !v)} style={styles.allLink} hitSlop={6}>
        <Text variant="small" color={colors.green} style={styles.bold}>
          {allSteps ? t('cooking:all.hide') : t('cooking:all.show', { count: n })}
        </Text>
        <Ionicons name={allSteps ? 'chevron-up' : 'chevron-down'} size={16} color={colors.green} />
      </Pressable>
      {allSteps
        ? steps.map((_, k) => (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={t('cooking:all.go', { n: k + 1 })} onPress={() => go(k)} style={[styles.allRow, k === index && styles.allRowOn]}>
              <Text variant="small" color={k === index ? colors.green : colors.inkSoft} style={styles.bold}>{`${k + 1}.`}</Text>
              <Text variant="small" style={styles.flex}>
                {recipeStep(recipe, k)}
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
  thumb: { width: 84, height: 84 },
  headText: { flex: 1, gap: space.sm },
  recipeName: { fontSize: 24, lineHeight: 29 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
  // allergeni: una riga compatta (non un banner grande); il dettaglio si apre con ⓘ
  safety: { gap: space.xs, backgroundColor: colors.peachSoft, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  safetyRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 28 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  progressText: { fontSize: 16 },
  progress: { flex: 1, flexDirection: 'row', gap: 5 },
  seg: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.tab },
  segOn: { backgroundColor: colors.green },
  // il passaggio attivo: niente altezza minima fissa, spazi contenuti, testo grande da leggere mentre si cucina
  card: { alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.lg, borderRadius: radius.xl, backgroundColor: colors.greenMist, borderWidth: 1, borderColor: colors.sage },
  cardIcons: { flexDirection: 'row', gap: space.sm },
  kindIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  action: { fontSize: 23, lineHeight: 31 },
  actionLong: { fontSize: 21, lineHeight: 28 },
  detail: { fontSize: 17, lineHeight: 24 },
  panel: { borderRadius: radius.lg, backgroundColor: colors.card, paddingHorizontal: space.lg, ...shadow.card },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH + 8 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 6 },
  ingName: { fontSize: 16 },
  qty: { fontVariant: ['tabular-nums'] },
  mina: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, paddingRight: space.md, borderRadius: radius.lg, backgroundColor: colors.peachSoft },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.peach, backgroundColor: colors.card },
  help: { gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  allLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: TOUCH },
  allRow: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md },
  allRowOn: { backgroundColor: colors.greenMist },
  nav: { flexDirection: 'row', gap: space.sm },
  navBack: { minWidth: 120 },
  finish: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
});
