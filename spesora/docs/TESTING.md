# Test

## Automatici — `npm run verify`

Esegue typecheck (TypeScript strict), ESLint (0 avvisi), Vitest e controllo di configurazione. I test girano con `TZ=Europe/Rome` (impostato in `src/test/setup.ts`).

| Test richiesto | Dove | Cosa verifica |
| --- | --- | --- |
| A — pianificazione ordinaria | `engine.test.ts` | 1 persona, pranzo+cena, 20 min, spesa 2 volte: 14 pasti, tempi e strumenti compatibili; seed riproducibile; niente ripetizioni; storico considerato |
| B — esclusioni | `engine.test.ts` | Latte, uova, frutta a guscio: nessuna ricetta con quegli allergeni o con allergeni non verificati; vincoli mai rilassati; diete; non graditi e strumenti |
| C — tre giorni di spesa | `engine.test.ts` | Mar/gio/sab: ogni acquisto in una spesa ≤ giorno d'uso (colazione: giorno precedente); spesa iniziale se serve; aggregazione e sottrazione della dispensa; riuso dell'eccedenza delle confezioni |
| D — dispensa | `service.test.ts` | 500 g − 80 g = 420 g; doppio tap concorrente e ripetuto non sottraggono di nuovo; vincolo unico nel DB; correzioni |
| E — spesa non confermata | `service.test.ts` | Tonno spuntato ma non confermato non è in dispensa; dopo la conferma sì |
| F — cambio ricetta | `service.test.ts` | Tonno → pesto: fabbisogno aggiornato, acquisti confermati invariati; alternative compatibili |
| G — pasto saltato | `service.test.ts` | "Mangio fuori" non sottrae; riproposta; rigenerazione conserva completati e dispensa; nuove esclusioni rigenerano |
| H — calendario | `engine.test.ts` | Cambio mese, anno, bisestile, ora legale (29/03 e 25/10/2026) |
| I — notifiche | `notifications.test.ts` | Orario = pasto − durata − anticipo; cambio orario annulla la vecchia e crea la nuova con destinazione valida; nessun duplicato, nulla nel passato o in fascia di silenzio; limite iOS; destinazioni non valide rifiutate |
| J — persistenza | `service.test.ts` | File SQLite chiuso e riaperto: profilo, calendario, dispensa, basi, preferiti, storico identici; onboarding progressivo; nuovo calendario automatico; esportazione e cancellazione |
| L — errori | `service.test.ts` | DB vuoto, quantità nulle/negative/NaN/non intere, ingrediente inesistente, profilo malformato, JSON corrotto (nessuna perdita di dati), migrazioni idempotenti e schema futuro |
| Catalogo | `catalog.test.ts` | Schema Zod, riferimenti, duplicati, alias ambigui, minimo 150 ricette (25 colazioni, 90 pranzi/cene, 15 spuntini); errori introdotti intenzionalmente vengono rilevati |
| Personalizzazione | `personalization.test.ts` | Pasta 70 e 110 g, riso, proteine e appetito; spesa e dispensa con porzioni personalizzate (nessun doppio consumo); gusti (pesce, proteica, vegetariana, veloce) senza violare i vincoli; profili vecchi compatibili; salvataggio del nuovo formulario; registro Plus |
| Immagini e mascotte | `images.test.ts` | Manifest = ricette reali, mappatura valida, prompt dagli ingredienti reali, sincronizzazione nuove/modificate, controlli tecnici (vuote, piccole, 800×600 JPEG, duplicati), pose di Timo e PNG presenti |
| Tono dell'assistente | `notifications.test.ts` | Frasi brevi, con il nome della ricetta, senza parole colpevolizzanti |
| Qualità | `checks.test.ts` | Chiavi di traduzione, assenza di `console.log`/TODO/segnaposto/mock fuori posto/SDK vietati; i controlli rilevano errori introdotti di proposito |

## Verifiche eseguite durante lo sviluppo

- `npx expo export --platform ios`: il bundle Hermes per iOS viene generato senza errori.
- Build web + Playwright (viewport iPhone 13 390×844 e iPhone SE 375×667): onboarding completo, ripresa dopo riavvio a metà, anteprima, Oggi, Settimana, Spesa, Dispensa, Ricettario, aggiunta in dispensa, "Ho cucinato", storico dopo ricaricamento, Impostazioni, Plus, Notifiche: nessun errore di runtime in console.

## Da verificare sull'iPhone 13 (non eseguibile in questo ambiente)

1. Completa l'onboarding attivando i promemoria: compare la richiesta di permesso iOS dopo la spiegazione.
2. Impostazioni → Notifiche → "Invia una notifica di prova", poi blocca il telefono: arriva dopo ~5 s; toccala → si apre Oggi.
3. Imposta l'orario di una cena a pochi minuti da ora (Impostazioni → Orari) e attendi il promemoria; toccalo con l'app **chiusa** (swipe via dal multitasking): deve aprirsi la ricetta.
4. Nega il permesso (Impostazioni iOS): l'app deve continuare a funzionare, con l'avviso in Notifiche.
5. Modalità aereo: tutte le funzioni restano utilizzabili (nessuna funzione usa la rete).
6. Chiudi completamente l'app e riaprila: dati invariati.
7. Testo grande (Impostazioni iOS → Schermo e luminosità → Dimensioni testo) e VoiceOver sulle schermate principali.
8. Doppio tocco rapido su "Ho cucinato": la quantità in dispensa diminuisce una sola volta.

## Terza iterazione

| Area | Dove | Cosa verifica |
| --- | --- | --- |
| Catalogo a scala | `catalog-scale.test.ts` | ≥ 500 ricette, ID unici, metadati per tutte, nessuna approvata senza revisione, timer ≤ tempo totale, nessun claim, informazioni alimentari mai "verified", pescetariano, copertura per 20 profili ≥ 7 ricette per pasto, varietà vegetariana a 20 minuti, settimane successive diverse, ricerca e filtri, sezioni del ricettario, prestazioni con 500/1.000/1.500 ricette |
| Budget e prezzi | `budget.test.ts` | g↔kg, ml↔l, prezzo per quantità e per confezione, aggregazione, avanzi, prezzi mancanti e obsoleti, centesimi, porzioni, più persone, pasti selezionati, distribuzione per giorni, spesa stimata vs reale, nessun doppio conteggio, esclusioni mai superate, migrazione profili, budget impossibile |
| Abbonamenti | `purchases.test.ts` | Entitlement attivo, tolleranza, scaduto; errori (annullato, rete, pagamento in attesa); pacchetti dallo store; nessun mock in produzione |
| Migrazioni | `service.test.ts` | Schema v2 (prezzi personali, importo speso), idempotenza |

Nota: i commit intermedi dell'espansione (263 e 359 ricette) hanno un solo test in ritardo, la corrispondenza tra manifest immagini e catalogo, risincronizzato dopo l'integrazione dei commit di Codex.
