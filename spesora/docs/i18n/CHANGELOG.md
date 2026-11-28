# Mina — UI refinement + localizzazione internazionale (changelog tecnico)

28 novembre 2026. Branch `claude/bold-darwin-lfb2pr`. Logica alimentare, persistenza, navigazione, abbonamenti
e stile dei pulsanti invariati.

## 1. Home — card del pasto

`app/(tabs)/index.tsx`

- **Altezza dal contenuto.** Tolta l'altezza fissa di 286 pt e il `flex: 1` sul titolo, che creava il vuoto bianco
  tra nome e informazioni. Ora la card è alta quanto il contenuto, con un minimo di 214 pt (190 sugli schermi bassi)
  perché la foto resti protagonista.
- **Due gruppi.** Il corpo è diviso in:
  - in alto: pasto, ora e nome;
  - in basso: tempo, persone e «Cucina ora».

  Lo spazio tra i due gruppi compare solo quando la foto è più alta del testo.
- **Foto.** Riempie la sua colonna (44% della larghezza, 40% sugli schermi bassi) senza un rapporto d'aspetto fisso,
  quindi non viene tagliata più del necessario.
- **Titoli lunghi.** Il titolo può andare su 4 righe e si rimpicciolisce sulle parole lunghe (`dishFit`): nomi tedeschi
  e francesi non spezzano le parole.
- **Pulsante.** «Cucina ora» resta nello stile originale.
- **Testi.** Tutti nel namespace `home`. Data dell'intestazione e numeri seguono il formato regionale.

## 2. Lista della spesa

`app/(tabs)/spesa.tsx`, `src/ui/illustrations/*`, `src/data/ingredientSymbols.ts`

- **Bug delle icone.** Ogni prodotto mostrava l'icona del suo reparto, e per «Frutta e verdura» era una carota:
  mela, pera e uva avevano tutte una carota accanto.
  - Ora il simbolo si sceglie **per id dell'ingrediente** (`IngredientSymbol`), solo quando l'immagine è esattamente
    quell'alimento.
  - In tutti gli altri casi si usa un **simbolo neutro del reparto**. I simboli neutri sono stati ridisegnati: un rametto
    per frutta e verdura, una lattiera per latticini e uova (prima formaggio).
  - Un test verifica che ogni voce della mappa sia un ingrediente reale.
- **Righe.** Ordine: casella, simbolo, nome (fino a 2 righe), quantità sotto il nome in cifre tabellari. Altezza minima
  56 pt (era 60), spazi verticali ridotti.
- **Reparti.** Fascia con icona, nome, conteggio in un badge e freccia: ogni reparto si può comprimere.
- **Acquistati e da acquistare.** I filtri restano; i prodotti nel carrello hanno il nome barrato e il simbolo attenuato.
- **Importo pagato.** Non sta più nella barra in basso, dove copriva la lista. «Conferma acquisti» apre un pannello di
  completamento con:
  - il riepilogo;
  - l'importo facoltativo, con l'esempio nel formato locale;
  - l'errore accanto al campo;
  - Annulla e Conferma.

  Dati salvati e funzione di conferma sono quelli di prima.
- **Funzioni conservate:** scelta della lista o del giorno, filtri, reparti, caselle, quantità, stato degli acquisti,
  dettagli dei costi, «Già in dispensa».
- **Non aggiunto:** «Aggiungi ingrediente» delle reference, perché la funzione non esiste nel servizio e non è stata
  simulata.

## 3. Modalità Cucina

`app/cucina/[id].tsx`

- **Nuovo ordine:**
  1. nome della ricetta, con la foto piccola;
  2. tempo e persone;
  3. allergeni;
  4. «Passaggio N di M» con la barra;
  5. il passaggio attivo;
  6. ingredienti del passaggio (aperti di default);
  7. Indietro e Avanti, fissi in basso;
  8. Mina Chef.
- **Card del passaggio.** Tolta l'altezza minima di 250 pt: la card segue la lunghezza del testo, che resta grande
  (23/31, 21/28 per i passaggi lunghi).
- **Icona del passaggio.** I simboli degli ingredienti nominati nel passaggio, oppure un simbolo generico dell'azione
  (preparare, cuocere, mescolare, servire). Mai un ingrediente a caso.
- **Allergeni.** Una riga compatta con i nomi presi dalla classificazione dei dati; dettagli e avvertenza a richiesta
  (ⓘ). Non si aggiunge né si toglie nulla.
- **Mina Chef.** «Chiedi a Mina» è diventato **«Consigli»**: mostra solo dati veri della ricetta (tempi, preparazioni in
  anticipo, sostituzioni, persone). Un assistente che risponde a domande libere non esiste ancora: richiede un servizio
  esterno, non previsto in un'app che tiene i dati sul telefono, e non viene simulato.
- **Ricette non tradotte.** Quando il procedimento è disponibile solo in italiano, una nota lo dice.

## 4. Lingue

- **Lingue attive:** `it`, `en`, `es`, `de`, `fr`, `pt-BR`.
  - Previste ma non attive: `ja`, `ko`, `zh-Hans`, `ar` (RTL), `id`, `hi`, `pt-PT`.
- **Primo avvio** (`detectLanguage`): la prima lingua supportata tra le preferenze del telefono, altrimenti l'inglese.
  `pt-PT` non diventa `pt-BR`.
- **Scelta della lingua:**
  - primo passo del questionario («Scegli la tua lingua»), applicata subito al resto delle domande;
  - Profilo → Lingua (`app/lingua.tsx`). Il componente condiviso è `LanguagePicker`.
- **Salvataggio.** La scelta sta sul telefono (archivio chiave-valore di expo-sqlite; sul web `localStorage`), separata
  dal profilo. Cambiarla non tocca piano, ricette, spesa, dispensa, preferenze o abbonamento.
- **Formati regionali.** Date, mesi e giorni (`dates.ts`) e numeri e quantità (`quantity.ts`) usano `Intl`, con
  locale = lingua scelta + regione del telefono se la lingua coincide (`formatLocaleFor`): lingua e paese restano
  separati.
  - L'unità «pz» è tradotta con il plurale.
  - Il sistema metrico resta.
- **Fondo dell'app.** `app/+html` non serve con `output: single`; vale `public/index.html` con `lang="it"`.

## 5. Architettura delle traduzioni

- **Libreria.** i18next 27 + react-i18next 18 + expo-localization 58, inizializzati in `src/i18n/index.ts`.
- **Testi.** File JSON per namespace (`src/i18n/locales/<lingua>/<ns>.json`), indicizzati da
  `scripts/i18n/gen-resources.py`. Guida in [GUIDA_TRADUZIONE.md](GUIDA_TRADUZIONE.md).
- **Componenti.** `useT()` in ogni componente con testo, così l'interfaccia si ridisegna al cambio lingua. Getter per le
  definizioni a livello di modulo (passi del questionario, etichette): `lazyLabels`.
- **Contenuti** (`src/i18n/content.ts`): nomi degli ingredienti, nomi delle ricette e procedimenti.
  - Se manca la traduzione si mostra l'italiano originale, e per il procedimento l'app lo dichiara.
  - Una ricetta è «tradotta» solo con nome **e** tutti i passaggi.
- **Allergeni.** Nomi delle 14 categorie del Reg. UE 1169/2011, nessuna traduzione automatica degli avvisi.
- **Compatibilità.** `src/i18n/it.ts` è rimasto come ponte: `t('tabs.today')` funziona ancora.

## 6. Controlli

- **`src/test/i18n.test.ts`:**
  - stesse chiavi e stesse variabili in tutte le lingue;
  - nessuna stringa vuota né graffe doppie;
  - nessuna frase di 4 o più parole identica all'italiano;
  - nessun testo italiano scritto nei componenti;
  - rilevazione della lingua e separazione lingua/paese.
- **`scripts/checks.mjs`:** ogni `t('ns:chiave')` usato nel codice esiste nel dizionario italiano (anche con i plurali).
- **`scripts/screenshots/capture-lingue.cjs`:** screenshot nelle 6 lingue dall'app reale, con controllo di chiavi
  visibili, testi troncati ed errori di pagina.
- **`scripts/i18n/coverage.ts`:** genera [COPERTURA.md](COPERTURA.md).
