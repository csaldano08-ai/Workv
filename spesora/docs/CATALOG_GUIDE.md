# Guida editoriale del catalogo

Regole vincolanti per chi aggiunge ricette a Spesora (persone o strumenti automatici).

## Struttura

- Una ricetta = un oggetto `Recipe` (`src/core/domain/types.ts`) in un file di `src/data/recipes/`, collegato in `src/data/catalog.ts`.
- Usa gli helper `q(id, qty, hint?)`, `qb(id, hint?)`, `step(testo, timerMinuti?)` di `src/data/recipes/helpers.ts`.
- **ID**: snake_case, descrittivo, persistente. Mai modificare o riutilizzare un ID esistente (immagini, storico e calendari salvati dipendono dall'ID).
- **Ingredienti**: solo ID esistenti in `src/data/ingredients*.ts`. Nessun ingrediente inventato.
- Quantità nell'unità canonica dell'ingrediente (g, ml, pz) per `baseServings` (di norma 2). Peso **crudo** per pasta, riso, cereali, carne e pesce; per legumi e pesce in scatola indica `basis: 'sgocciolato'`. Ingredienti "quanto basta" (`qb`) solo per sale, pepe, olio, spezie, erbe e aglio.
- `totalMinutes` ≥ `prepMinutes + cookMinutes`, realistico per una persona poco esperta. I timer dei passaggi non devono superare il tempo di cottura dichiarato.
- `equipment`: solo ciò che serve davvero (`fornelli`, `forno`, `microonde`, `friggitrice_aria`, `mixer`, `tostapane`).
- `image: null`, `videoRef: null`.

## Metadati (`meta`, obbligatori per le nuove ricette)

```ts
meta: {
  cuisine: 'italiana_tradizionale' | 'italiana_regionale' | 'italiana_quotidiana' | 'internazionale',
  region?: 'Sicilia',                // solo per piatti regionali
  difficulty: 1 | 2 | 3,             // 1 = chiunque, 3 = richiede pratica
  taste: 'dolce' | 'salato',
  method: 'nessuna_cottura' | 'padella' | 'bollitura' | 'forno' | 'friggitrice_aria' | 'vapore' | 'stufato' | 'microonde' | 'griglia' | 'tostatura',
  family?: 'pasta_pomodoro',         // varianti molto vicine condividono la famiglia
  seasons?: ['estate'],              // solo se l'ingrediente principale è stagionale
  makeAhead?: true, batchFriendly?: true,
  storage?: 'In frigo, in contenitore chiuso, per 1 giorno.',   // prudente
  references?: ['…'],                // SOLO fonti realmente consultate
  review: { status: 'needs_culinary_review', culinary: 'pending', allergens: 'derived', rights: 'original_text' },
}
```

Nessuna ricetta scritta automaticamente può avere `status: 'approved_for_release'` o `culinary: 'checked'`: servono una prova pratica o una revisione umana.

## Originalità

Testi (descrizione e passaggi) scritti da zero. Non copiare frasi da siti, libri o riviste. Le fonti servono solo a verificare nome, ingredienti caratteristici e tecnica.

## Diciture vietate

Nei testi (titolo, descrizione, passaggi) non usare: "senza glutine", "senza zuccheri", "proteico/ricco di proteine/fonte di proteine", "bio/biologico", "light", "sano/salutare", "dimagrante", "detox", riferimenti a celiachia, diabete o altre patologie. Le indicazioni nutrizionali richiedono dati verificati (Reg. CE 1924/2006, Reg. UE 828/2014, Reg. UE 2018/848). Il controllo automatico (`claimViolations`) blocca queste parole.

## Duplicati

Una nuova ricetta deve differire davvero per ingredienti importanti, tecnica o risultato. "Penne al pomodoro" e "Fusilli al pomodoro" sono la stessa ricetta. Il validatore rifiuta titoli uguali e ricette con la stessa categoria e lo stesso insieme di ingredienti principali.

## Allergeni

Derivati automaticamente dagli ingredienti: non scriverli a mano. Se un ingrediente composto ha composizione variabile è già marcato "non verificato" nel dizionario: la ricetta verrà esclusa per chi ha esclusioni, come previsto.

## Validazione

```bash
npx vitest run src/test/catalog.test.ts
npm run verify
```
