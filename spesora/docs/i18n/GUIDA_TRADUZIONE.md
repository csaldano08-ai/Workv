# Mina — guida alla localizzazione (per chi aggiunge o traduce testi)

## Architettura

- Libreria: i18next + react-i18next, lingua del telefono da expo-localization. Inizializzazione in `src/i18n/index.ts`.
- Lingue attive: `it` (origine), `en`, `es`, `de`, `fr`, `pt-BR` — elenco in `src/i18n/languages.ts`.
  Lingue future (ja, ko, zh-Hans, ar, id, hi, pt-PT) sono solo elencate in `PLANNED`: nessun file, non selezionabili.
- Testi dell'interfaccia: `src/i18n/locales/<lingua>/<namespace>.json`, chiavi **piatte** con il punto
  (`"hero.cook": "Cucina ora"`). Tutte le lingue hanno le stesse chiavi (verificato da `src/test/i18n.test.ts`).
- Contenuti (nomi di ingredienti e ricette, passaggi): `src/i18n/content/<lingua>/*.json` + `src/i18n/content.ts`,
  con ritorno all'**italiano originale** quando manca la traduzione (mai traduzione automatica).
- Date e numeri: `Intl` con il locale = lingua scelta + regione del telefono (`formatLocaleFor`).
  Funzioni in `src/core/domain/dates.ts` e `quantity.ts`, già localizzate.

## Namespace

| Namespace | Aree |
| --- | --- |
| `common` | schede, pasti, azioni comuni, errori, diete, allergeni, attrezzi, reparti, categorie di piatti, unità |
| `language` | scelta della lingua |
| `onboarding` | benvenuto, intro, questionario, anteprima |
| `home` | Oggi |
| `week` | Settimana, cambia/sposta/ripeti pasto, settimana più economica |
| `shopping` | Spesa |
| `pantry` | Dispensa, aggiungi, voce di dispensa |
| `recipes` | Ricette, dettaglio ricetta, ricerca |
| `cooking` | Modalità Cucina |
| `profile` | Profilo, preferenze, notifiche, storico, prezzi, aiuto, pagina Mina |
| `paywall` | abbonamento, Mina Plus, funzioni a pagamento |
| `legal` | privacy, termini, informazioni legali, licenze |
| `mascot` | frasi di Mina, caricamento, celebrazioni |
| `services` | messaggi dei servizi, del pianificatore, notifiche di sistema, archivio |
| `ui` | componenti condivisi (kit, avvisi, dialoghi, pulsanti, accessibilità) |

## Come si scrive

```tsx
import { useT } from '../src/i18n';
export default function Screen() {
  const { t } = useT();              // OBBLIGATORIO in ogni componente che mostra testo: ridisegna al cambio lingua
  return <Text>{t('home:hero.cook')}</Text>;
}
```

- Fuori dai componenti (servizi, notifiche): `import { t } from '<percorso>/i18n'` e chiamarla **dentro** le funzioni.
- Definizioni a livello di modulo (elenchi di opzioni, passi): niente stringhe calcolate al caricamento.
  Usare getter (`get title() { return t('onboarding:people.title'); }`) o funzioni.
- Etichette condivise: `MEAL_LABELS`, `ALLERGEN_LABELS`, `CATEGORY_LABELS`… in `src/i18n/labels.ts` sono già tradotte.
- Variabili con graffe singole: `"Ciao {name}"` → `t('ns:key', { name })`. Stesse variabili in tutte le lingue.
- Plurali: `key_one`, `key_other` (in `es`, `fr`, `pt-BR` anche `key_many`, uguale a `_other`) e `t('ns:key', { count })`.
- Nomi di ingredienti e ricette: `ingredientName(id, nomeItaliano)` e `recipeName(recipe)` da `src/i18n/content.ts`.
- Il marchio non si traduce: «Mina», «Mina Chef», «Mina Plus».

## Tono

Come l'italiano: breve, caldo, mai colpevolizzante. Del tu: `en` you, `es` tú, `de` du, `fr` tu, `pt-BR` você.
Testi brevi: il tedesco e il francese sono più lunghi, quindi niente parole inutili.

## Testi delicati

- **Allergeni**: i nomi delle 14 categorie sono quelli brevi del Reg. UE 1169/2011, all. II (in `pt-BR` i termini
  brasiliani). Gli avvisi non promettono mai l'assenza di allergeni. Da far rivedere a una persona qualificata
  prima della pubblicazione in ciascun mercato.
- **Pagine legali e condizioni commerciali** (privacy, termini, abbonamento): tradotte con cura, ma vanno riviste
  da un legale per ogni mercato prima della pubblicazione. La versione italiana resta quella di riferimento.

## Aggiungere una lingua

1. Copiare `src/i18n/locales/en/` in `src/i18n/locales/<codice>/` e tradurre **tutti** i file.
2. Aggiungere la lingua a `SUPPORTED` in `src/i18n/languages.ts` (e toglierla da `PLANNED`).
3. `python3 scripts/i18n/gen-resources.py`, poi `npx vitest run src/test/i18n.test.ts`.
4. Per l'arabo (RTL): adattare e verificare il layout su telefono prima di attivarlo.
