import { StyleSheet, View } from 'react-native';
import { LIKE_LABELS, WEEK_STYLE_LABELS } from '../../core/domain/classify';
import { suggestedPortions } from '../../core/domain/portions';
import { APPETITES, GENDERS, LIFESTYLES, LIKES, MEAL_GOALS, PROTEIN_SIZES, WEEK_STYLES, type PortionProfile, type UserProfile } from '../../core/domain/types';
import { space } from '../../theme/tokens';
import { Chip, ChipGroup } from '../../ui/Chip';
import { InfoNote, InfoToggle } from '../../ui/mina/kit';
import { SectionTitle } from '../../ui/Row';
import { Stepper } from '../../ui/Stepper';
import { i18n, lazyLabels, t as translate, useT } from '../../i18n';
import type { StepProps } from './steps';

/** Nota sulle porzioni, nella lingua corrente. */
export function portionsNote(): string {
  return translate('onboarding:portions.disclaimer');
}
/**
 * Compatibilità per chi importa ancora la costante: si aggiorna al cambio di lingua (binding «live»).
 * Preferire `portionsNote()`.
 */
export let PORTIONS_NOTE = portionsNote();
i18n.on('languageChanged', () => {
  PORTIONS_NOTE = portionsNote();
});

const APPETITE_LABELS = lazyLabels(APPETITES, (k) => `onboarding:appetite.${k}`);
const LIFESTYLE_LABELS = lazyLabels(LIFESTYLES, (k) => `onboarding:lifestyle.${k}`);
const GOAL_LABELS = lazyLabels(MEAL_GOALS, (k) => `onboarding:goal.${k}`);
const GENDER_LABELS = lazyLabels(GENDERS, (k) => `onboarding:gender.${k}`);
export const PROTEIN_LABELS = lazyLabels(PROTEIN_SIZES, (k) => `onboarding:protein.${k}`);

const PASTA_OPTIONS = [70, 80, 90, 100, 110, 120];
const RICE_OPTIONS = [60, 70, 80, 90, 100];

function setPortions(setDraft: StepProps['setDraft'], fn: (p: PortionProfile) => PortionProfile) {
  setDraft((d) => ({ ...d, profile: { ...d.profile, portions: fn(d.profile.portions) } }));
}
function setTastes(setDraft: StepProps['setDraft'], fn: (t: UserProfile['tastes']) => UserProfile['tastes']) {
  setDraft((d) => ({ ...d, profile: { ...d.profile, tastes: fn(d.profile.tastes) } }));
}
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function PortionProfileStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  const p = draft.profile.portions;
  // Scegliere appetito o stile di vita aggiorna le quantità suggerite (sempre modificabili al passo successivo).
  const apply = (patch: Partial<PortionProfile>) =>
    setPortions(setDraft, (cur) => {
      const next = { ...cur, ...patch };
      return 'appetite' in patch || 'lifestyle' in patch ? { ...next, ...suggestedPortions(next.appetite, next.lifestyle) } : next;
    });
  return (
    <View style={styles.gap}>
      <SectionTitle>{t('onboarding:portions.appetite')}</SectionTitle>
      <ChipGroup>
        {APPETITES.map((a) => (
          <Chip key={a} label={APPETITE_LABELS[a]} selected={p.appetite === a} onPress={() => apply({ appetite: a })} />
        ))}
      </ChipGroup>
      <SectionTitle>{t('onboarding:portions.lifestyle')}</SectionTitle>
      <ChipGroup>
        {LIFESTYLES.map((l) => (
          <Chip key={l} label={LIFESTYLE_LABELS[l]} selected={p.lifestyle === l} onPress={() => apply({ lifestyle: l })} />
        ))}
      </ChipGroup>
      <SectionTitle>{t('onboarding:portions.goal')}</SectionTitle>
      <ChipGroup>
        {MEAL_GOALS.map((g) => (
          <Chip key={g} label={GOAL_LABELS[g]} selected={p.goal === g} onPress={() => apply({ goal: g })} />
        ))}
      </ChipGroup>
      <SectionTitle>{t('onboarding:portions.gender')}</SectionTitle>
      <ChipGroup>
        {GENDERS.map((g) => (
          <Chip key={g} label={GENDER_LABELS[g]} selected={p.gender === g} onPress={() => apply({ gender: g })} />
        ))}
      </ChipGroup>
      <InfoNote text={t('onboarding:portions.note')} />
    </View>
  );
}

export function QuantitiesStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  const p = draft.profile.portions;
  return (
    <View style={styles.gap}>
      <SectionTitle>{t('onboarding:quantities.pasta')}</SectionTitle>
      <ChipGroup>
        {PASTA_OPTIONS.map((g) => (
          <Chip key={g} label={`${g} g`} selected={p.pastaGrams === g} onPress={() => setPortions(setDraft, (c) => ({ ...c, pastaGrams: g }))} />
        ))}
      </ChipGroup>
      <Stepper label={t('onboarding:quantities.pastaCustom')} value={p.pastaGrams} min={40} max={200} step={5} format={(v) => `${v} g`} onChange={(v) => setPortions(setDraft, (c) => ({ ...c, pastaGrams: v }))} />
      <SectionTitle>{t('onboarding:quantities.rice')}</SectionTitle>
      <ChipGroup>
        {RICE_OPTIONS.map((g) => (
          <Chip key={g} label={`${g} g`} selected={p.riceGrams === g} onPress={() => setPortions(setDraft, (c) => ({ ...c, riceGrams: g }))} />
        ))}
      </ChipGroup>
      <Stepper label={t('onboarding:quantities.riceCustom')} value={p.riceGrams} min={40} max={200} step={5} format={(v) => `${v} g`} onChange={(v) => setPortions(setDraft, (c) => ({ ...c, riceGrams: v }))} />
      <SectionTitle>{t('onboarding:quantities.protein')}</SectionTitle>
      <ChipGroup>
        {PROTEIN_SIZES.map((s) => (
          <Chip key={s} label={PROTEIN_LABELS[s]} selected={p.proteinSize === s} onPress={() => setPortions(setDraft, (c) => ({ ...c, proteinSize: s }))} />
        ))}
      </ChipGroup>
      <InfoToggle label={t('onboarding:quantities.howLabel')} text={`${t('onboarding:portions.disclaimer')} ${t('onboarding:quantities.example', { grams: p.pastaGrams, total: p.pastaGrams * 2 })}`} />
    </View>
  );
}

export function TastesStep({ draft, setDraft }: StepProps) {
  const { t } = useT();
  const tastes = draft.profile.tastes;
  return (
    <View style={styles.gap}>
      <SectionTitle>{t('onboarding:tastes.likes')}</SectionTitle>
      <ChipGroup>
        {LIKES.map((l) => (
          <Chip key={l} tone="peach" label={LIKE_LABELS[l]} selected={tastes.likes.includes(l)} onPress={() => setTastes(setDraft, (c) => ({ ...c, likes: toggle(c.likes, l) }))} />
        ))}
      </ChipGroup>
      <SectionTitle>{t('onboarding:tastes.week')}</SectionTitle>
      <ChipGroup>
        {WEEK_STYLES.map((w) => (
          <Chip key={w} label={WEEK_STYLE_LABELS[w]} selected={tastes.weekStyles.includes(w)} onPress={() => setTastes(setDraft, (c) => ({ ...c, weekStyles: toggle(c.weekStyles, w) }))} />
        ))}
      </ChipGroup>
      <InfoToggle label={t('onboarding:tastes.howLabel')} text={t('onboarding:tastes.howText', { style: WEEK_STYLE_LABELS.economica })} />
    </View>
  );
}

const styles = StyleSheet.create({ gap: { gap: space.md } });
