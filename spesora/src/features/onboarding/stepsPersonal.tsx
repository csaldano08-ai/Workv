import { StyleSheet, View } from 'react-native';
import { LIKE_LABELS, WEEK_STYLE_LABELS } from '../../core/domain/classify';
import { suggestedPortions } from '../../core/domain/portions';
import { APPETITES, GENDERS, LIFESTYLES, LIKES, MEAL_GOALS, PROTEIN_SIZES, WEEK_STYLES, type PortionProfile, type UserProfile } from '../../core/domain/types';
import { colors, space } from '../../theme/tokens';
import { Chip, ChipGroup } from '../../ui/Chip';
import { Notice } from '../../ui/Notice';
import { SectionTitle } from '../../ui/Row';
import { Stepper } from '../../ui/Stepper';
import { Text } from '../../ui/Text';
import type { StepProps } from './steps';

export const PORTIONS_NOTE = 'Le porzioni sono indicative e si basano sulle tue abitudini impostate nell’app.';

const APPETITE_LABELS = { poco: 'Mangio poco', normale: 'Mangio normale', tanto: 'Mangio tanto' } as const;
const LIFESTYLE_LABELS = { sedentario: 'Sedentario', attivo: 'Attivo', mi_alleno: 'Mi alleno' } as const;
const GOAL_LABELS = { leggeri: 'Pasti leggeri', equilibrati: 'Pasti equilibrati', sostanziosi: 'Pasti più sostanziosi', proteici: 'Ricette più proteiche' } as const;
const GENDER_LABELS = { non_indicato: 'Preferisco non dirlo', donna: 'Donna', uomo: 'Uomo', altro: 'Altro' } as const;
export const PROTEIN_LABELS = { piccola: 'Porzione piccola', media: 'Porzione media', abbondante: 'Porzione abbondante' } as const;

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
  const p = draft.profile.portions;
  // Scegliere appetito o stile di vita aggiorna le quantità suggerite (sempre modificabili al passo successivo).
  const apply = (patch: Partial<PortionProfile>) =>
    setPortions(setDraft, (cur) => {
      const next = { ...cur, ...patch };
      return 'appetite' in patch || 'lifestyle' in patch ? { ...next, ...suggestedPortions(next.appetite, next.lifestyle) } : next;
    });
  return (
    <View style={styles.gap}>
      <SectionTitle>Appetito abituale</SectionTitle>
      <ChipGroup>
        {APPETITES.map((a) => (
          <Chip key={a} label={APPETITE_LABELS[a]} selected={p.appetite === a} onPress={() => apply({ appetite: a })} />
        ))}
      </ChipGroup>
      <SectionTitle>Stile di vita</SectionTitle>
      <ChipGroup>
        {LIFESTYLES.map((l) => (
          <Chip key={l} label={LIFESTYLE_LABELS[l]} selected={p.lifestyle === l} onPress={() => apply({ lifestyle: l })} />
        ))}
      </ChipGroup>
      <SectionTitle>Che pasti preferisci?</SectionTitle>
      <ChipGroup>
        {MEAL_GOALS.map((g) => (
          <Chip key={g} label={GOAL_LABELS[g]} selected={p.goal === g} onPress={() => apply({ goal: g })} />
        ))}
      </ChipGroup>
      <SectionTitle>Sesso (facoltativo)</SectionTitle>
      <ChipGroup>
        {GENDERS.map((g) => (
          <Chip key={g} label={GENDER_LABELS[g]} selected={p.gender === g} onPress={() => apply({ gender: g })} />
        ))}
      </ChipGroup>
      <Text variant="small" color={colors.inkSoft}>
        Non usiamo il sesso per nessun calcolo: le quantità dipendono solo dalle abitudini che indichi. Spesora non è un servizio nutrizionale.
      </Text>
    </View>
  );
}

export function QuantitiesStep({ draft, setDraft }: StepProps) {
  const p = draft.profile.portions;
  return (
    <View style={styles.gap}>
      <SectionTitle>Pasta a persona</SectionTitle>
      <ChipGroup>
        {PASTA_OPTIONS.map((g) => (
          <Chip key={g} label={`${g} g`} selected={p.pastaGrams === g} onPress={() => setPortions(setDraft, (c) => ({ ...c, pastaGrams: g }))} />
        ))}
      </ChipGroup>
      <Stepper label="Pasta personalizzata in grammi" value={p.pastaGrams} min={40} max={200} step={5} format={(v) => `${v} g`} onChange={(v) => setPortions(setDraft, (c) => ({ ...c, pastaGrams: v }))} />
      <SectionTitle>Riso e cereali a persona</SectionTitle>
      <ChipGroup>
        {RICE_OPTIONS.map((g) => (
          <Chip key={g} label={`${g} g`} selected={p.riceGrams === g} onPress={() => setPortions(setDraft, (c) => ({ ...c, riceGrams: g }))} />
        ))}
      </ChipGroup>
      <Stepper label="Riso personalizzato in grammi" value={p.riceGrams} min={40} max={200} step={5} format={(v) => `${v} g`} onChange={(v) => setPortions(setDraft, (c) => ({ ...c, riceGrams: v }))} />
      <SectionTitle>Secondi: carne, pesce, uova, tofu</SectionTitle>
      <ChipGroup>
        {PROTEIN_SIZES.map((s) => (
          <Chip key={s} label={PROTEIN_LABELS[s]} selected={p.proteinSize === s} onPress={() => setPortions(setDraft, (c) => ({ ...c, proteinSize: s }))} />
        ))}
      </ChipGroup>
      <Notice text={`${PORTIONS_NOTE} Esempio: con ${p.pastaGrams} g di pasta, una pasta al tonno per 2 persone ne usa ${p.pastaGrams * 2} g e la lista della spesa si adegua.`} />
    </View>
  );
}

export function TastesStep({ draft, setDraft }: StepProps) {
  const t = draft.profile.tastes;
  return (
    <View style={styles.gap}>
      <SectionTitle>Cosa mangi più volentieri?</SectionTitle>
      <ChipGroup>
        {LIKES.map((l) => (
          <Chip key={l} tone="peach" label={LIKE_LABELS[l]} selected={t.likes.includes(l)} onPress={() => setTastes(setDraft, (c) => ({ ...c, likes: toggle(c.likes, l) }))} />
        ))}
      </ChipGroup>
      <SectionTitle>Che tipo di settimana vuoi?</SectionTitle>
      <ChipGroup>
        {WEEK_STYLES.map((w) => (
          <Chip key={w} label={WEEK_STYLE_LABELS[w]} selected={t.weekStyles.includes(w)} onPress={() => setTastes(setDraft, (c) => ({ ...c, weekStyles: toggle(c.weekStyles, w) }))} />
        ))}
      </ChipGroup>
      <Text variant="small" color={colors.inkSoft}>
        Puoi sceglierne più di uno. I gusti danno la precedenza ad alcune ricette ma non escludono le altre; le esclusioni alimentari restano sempre rispettate. “Ingredienti semplici e riutilizzati” non stima prezzi: favorisce ricette che condividono ingredienti.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ gap: { gap: space.md } });
