# Decisioni e limiti aperti

## Decisioni

1. **Expo SDK 58 + Expo Go**: tutti i moduli usati (SQLite, Notifications, Router, SVG) sono inclusi in Expo Go, quindi l'app si prova sull'iPhone senza build native né account Apple a pagamento.
2. **Cartella `app/` alla radice** (non `src/app/`) come richiesto dalla specifica.
3. **Catalogo nel codice, non in SQLite**: ricette e ingredienti sono dati versionati con l'app, validati da Zod nei test. Le tabelle `recipes`/`ingredients`/`recipe_ingredients`/`recipe_steps` sarebbero solo una copia; il database salva gli ID persistenti. Aggiornare il catalogo = aggiornare l'app.
4. **Preferenze come JSON validato** in `user_preferences` (orari pasti, tempo per giorno e giorni di spesa inclusi) anziché tabelle `meal_schedule_preferences`/`shopping_schedule` separate: un solo punto di validazione, nessuna query relazionale necessaria.
5. **Quantità intere in milli-unità** dell'unità canonica (g, ml, pz). Nessun float persistito; conversioni solo g↔kg e ml↔l. Legumi e pesce in scatola sono dosati a peso **sgocciolato**.
6. **Dispensa come registro di movimenti**: la storia spiega ogni quantità e rende atomiche e idempotenti le operazioni.
7. **Le liste della spesa sono calcolate, non salvate**: si ricalcolano da piano + dispensa confermata. Si salvano solo spunte, acquisti confermati e spese confermate. Così un cambio ricetta aggiorna tutto senza toccare gli acquisti.
8. **Spunta ≠ acquisto**: solo "Conferma acquisti" aggiunge in dispensa (quantità = confezioni suggerite o fabbisogno arrotondato; correggibile).
9. **Allergeni**: ingredienti generici "verificati"; prodotti composti (pesto, pane, dado, salumi…) "non verificati". Con almeno un'esclusione attiva, le ricette con dati non verificati sono escluse. L'app non dichiara mai una ricetta sicura.
10. **Rigenerazione**: conserva pasti non più `planned`, pasti passati e scelte manuali; quando cambiano le preferenze anche le scelte manuali future vengono ricalcolate (potrebbero violare i nuovi vincoli).
11. **Spostare un pasto = scambiarlo** con un altro dello stesso tipo: nessuno slot resta vuoto.
12. **Notifiche** con ID che includono un hash del contenuto: qualsiasi cambiamento produce un nuovo ID, il vecchio viene annullato. Limite 60 in attesa (iOS ne consente 64).
13. **Illustrazioni SVG originali** al posto delle foto: nessun problema di diritti, zero MB di immagini.
14. **Nessun prezzo**: il budget viene salvato ma non usato per affermazioni sul costo.
15. **Test in Node con `node:sqlite`**: lo stesso SQL e le stesse migrazioni dell'app, senza dipendenze native.

## Funzioni rimandate

Widget iOS, riconoscimento foto, scansione scontrini, sincronizzazione familiare, video, assistenti AI, importazione file, account, cloud, prezzi, valori nutrizionali, gating effettivo delle funzioni Plus, RevenueCat reale.

## Limiti aperti

- Catalogo di 156 ricette scritte apposta e validate dagli schemi; una revisione umana (gusto, tempi reali, allergeni) è consigliata prima del lancio. 23 ingredienti del dizionario non ancora usati.
- Dispensa iniziale da onboarding con quantità indicative scelte dall'utente.
- Confezioni "formato comune" generiche: da verificare in negozio.
- Notifiche e tocco ad app chiusa verificati solo nei test unitari e nel codice: **da provare sul dispositivo** (vedi TESTING).
- Il menù azioni su Android usa un foglio personalizzato; Android non è stato provato su dispositivo.
- Sul web (solo demo) le conferme usano le finestre del browser (`src/ui/dialog.ts`) e le notifiche non sono disponibili.
- Backup: il file `spesora.db` sta nella cartella documenti dell'app ed è incluso nei backup iCloud/computer secondo le impostazioni iOS dell'utente (comportamento standard, non escluso dall'app).

## Seconda iterazione

16. **Porzioni come abitudine, non come dieta**: sesso, stile di vita e obiettivo non entrano nei calcoli; contano solo le quantità scelte dall'utente (regole in `portions.ts`). Pasta/riso principali usano la grammatura assoluta indicata; quando sono secondari si scalano in proporzione.
17. **I gusti non escludono**: aumentano il punteggio delle ricette, le esclusioni alimentari restano gli unici vincoli rigidi.
18. **"Economica" senza prezzi**: favorisce ingredienti condivisi e semplici; l'app non afferma risparmi.
19. **Mascotte vettoriale**: una sola sorgente SVG per app e PNG, nessun peso aggiuntivo nell'app.
20. **Immagini ricette con API ufficiale**: niente automazione di Google Flow senza un browser autorizzato dall'utente, niente API non ufficiali o cookie. Immagini incerte escluse dall'app finché non approvate.
21. Il formulario ha 16 passi: una bozza salvata con la versione precedente può riprendere da un passo diverso (accettabile prima del rilascio).

## Terza iterazione

22. **Metadati separati dai fatti derivabili**: allergeni e diete restano calcolati dagli ingredienti; i metadati editoriali (`meta`) sono inline per le nuove ricette e in `recipeMeta_legacy.ts` per le prime 156, per non toccare i file originali.
23. **Catalogo in TypeScript anche a 1.500 ricette**: test di scala mostrano calendario e ricerca nell'ordine dei millisecondi; il bundle JS cresce di circa 2,4 MB per 344 ricette. Una base dati locale non è necessaria ora.
24. **Nessun prezzo di riferimento** finché una fonte con licenza e copertura verificate non è disponibile; il motore funziona con i prezzi personali e misura comunque il numero di prodotti da comprare.
25. **Budget come preferenza forte, non vincolo alimentare**: mai sopra allergie ed esclusioni, mai riduzione di pasti o porzioni.
26. **Immagini dell'app = card ottimizzate**: i PNG di Google Flow restano la fonte, l'app usa JPEG 800×600; due mappature separate per non interferire con il flusso di Codex.
27. **RevenueCat caricato in modo pigro** (solo con `purchasesMode = "revenuecat"` e chiave): Expo Go e la demo web restano invariati.
28. **Scadenze in dispensa**: solo quelle inserite dall'utente (Spesora non stima scadenze). Un ingrediente che scade entro 3 giorni (`EXPIRY_PRIORITY_DAYS`) dal pasto privilegia le ricette che lo usano prima; uno già scaduto no. La Dispensa mostra "In scadenza a breve" e propone di riorganizzare solo i pasti futuri non cucinati, conservando le scelte manuali.
29. **Preparazioni della sera prima**: riconosciute in modo deterministico dai passaggi ("la sera prima", "tutta la notte", "in frigo per 24 ore", "il giorno prima"); un ammollo di pochi minuti non conta. Promemoria locale alle 20 del giorno prima (anticipato se cade nella fascia di silenzio), anche per la colazione; avviso nella scheda ricetta e in Oggi. Il testo è il passaggio stesso, nessuna frase inventata.
30. **Miniature per le liste**: 320×240 nelle liste virtualizzate, card 800×600 per hero; percorsi deterministici, il manifest resta di Codex durante la produzione (`docs/IMAGE_INTEGRATION.md`).
31. **Mina al posto di Timo**: mascotte ufficiale, vettoriale (12 pose) per restare nitida, offline e leggera; animazioni brevi con `Animated`, nessun ciclo infinito, "Riduci movimento" rispettato. Le illustrazioni raster di Google Flow, se arriveranno, resteranno in una cartella separata.
32. **Una sola riga per ingrediente in ogni spesa**: un ingrediente "q.b." in una ricetta e quantificato in un'altra si fonde in una riga (prima nascevano due righe e la chiave React `prezzemolo` duplicata). Test di regressione su 120 piani.
33. **Intro = concept B "Splash elastico"** (scelto dall'utente tra quattro prototipi in `prototypes/intro-concepts/`). Nell'app non è un video: è ricostruita in tempo reale con SVG (`src/features/intro/`), quindi nitida e leggera. Si vede al primo avvio (o se cambia `INTRO_VERSION`), si salta con un tocco o con "Salta", si chiude aprendo un'onda che mostra la schermata vera già pronta sotto. Con "Riduci movimento" non viene mostrata. Si può rivedere dalle Impostazioni. Lo stato "già vista" è nella tabella `app_state` (migrazione 3).
34. **Caricamento = concept C "Ingredienti che danzano"**, usato quando Spesora compone le ricette: anteprima della prima settimana, "Rigenera menù", riorganizzazione per le scadenze. Gli ingredienti girano su due orbite (animazione sul thread nativo, fluida anche mentre l'app calcola), poi si riuniscono a vortice nel piatto con la spunta. Dura almeno 1,7 s perché si legga (0,7 s con "Riduci movimento").
35. **Stile illustrato in tutta l'app** (dai video): contorno scuro `#24332C` su card, pulsanti, chip, avvisi, nuvolette, immagini e campi; pulsanti con base più spessa che si schiacciano al tocco; casella della spesa con spunta che rimbalza; fiore a petali e ingredienti che fluttuano come decorazioni misurate. Struttura e logica delle schermate invariate.
36. **Redesign "B + C"** (scelto dall'utente tra i concept in `prototypes/design-concepts/`): Mina che agisce (tiene la lista, presenta il piatto, riassume il giorno, festeggia) nello stile del ricettario a schede (tavolo `#EFE7D6`, pagine ad anelli, bigliettini con lo scotch, linguette, foto incollate, scritte a mano in Caveat solo per annotazioni brevi). Più aria: un solo messaggio breve per schermata, dettagli a un tocco (ⓘ, fisarmoniche, "Come funziona"). Settimana con due viste (Giorno / Settimana 7×3). Spesa: anello di avanzamento, linguette per le spese, tessere "servono oggi", reparti a fisarmonica; la conferma resta l'unico ingresso in dispensa. Dispensa: stati disponibile / da verificare (stima) / potrebbe non bastare / esaurito. Intro e caricamento sullo stesso tavolo, con la pagina ad anelli. Funzioni e logica invariate.
37. **Restyling «Mina 2.0»** (brief dell'utente, novembre 2026): stessa app, stessa navigazione e stessa logica; cambiano mascotte, palette, tipografia e superfici. Branch dedicata `claude/spesora-restyling-mina2` (la versione precedente resta nelle branch `claude/spesora-redesign-bc` e `claude/spesora-ads-concepts`). Dettagli e prove in `docs/restyling/`.
38. **Mina 2.0 = la borsetta della spesa**, ridisegnata in vettoriale dal foglio approvato (`docs/restyling/riferimenti/`), a parti separate per animarla davvero (braccio e avambraccio con gomito, occhi, bocca, cappello). Mina Chef solo per ricette e cucina. La vecchia Mina ricettario e i suoi PNG sono rimossi da questa branch: nessun asset nuovo deve usarla.
39. **Palette a token più fresca**: verde `#2F7F57` (la tinta `#34865E` del brief, scurita del 3% per il contrasto AA del testo bianco), fondo `#FBFCFA`, card bianche, verde tenue `#EAF6EC`, pesca `#FFA873` solo per accenti. Niente contorni scuri sulle superfici (restano solo nel disegno di Mina). Un test verifica il contrasto AA di tutte le coppie testo/fondo.
40. **Nunito** (SIL OFL, quattro pesi in `assets/fonts/`) al posto del carattere di sistema e di Caveat: arrotondato e accogliente come il foglio di Mina, un file per peso (nessun grassetto sintetico).
41. **Mina viva ma parsimoniosa**: gesto una volta all'ingresso; idle (respiro, battiti di ciglia) solo sulla Mina principale di una schermata e fermo in background; Mina piccole statiche (un solo SVG); "Riduci movimento" la lascia ferma.
42. **Abbonamenti solo preparati**: `PaywallSlot` a fine onboarding, spento con `paywallMode = "off"`, mai bloccante. Passi per Apple e Google in `docs/restyling/ABBONAMENTI.md`.
43. **Mina Chef ha uno scheletro proprio** (foglio «Mina Chef — Style Reference», `docs/restyling/riferimenti/mina_chef_style_reference.png`): borsa più alta e inclinata, viso più piccolo, cappello a nuvola con fascia curva sull'apertura, grembiule sul terzo basso, braccia corte attaccate ai lati. Le quattro pose del foglio (cucchiaio e occhiolino, mescola, serve, checklist) sono ricalcate misura per misura (confronto `docs/restyling/mina2_confronto_chef.jpg`); le braccia possono avere lunghezze proprie per posa (`ArmPose.len`) e le pose con oggetti larghi si spostano dentro il riquadro (`shift`). Con un oggetto grande in mano Mina Chef non muove le braccia nel gesto (l'oggetto non vola): si piega, fa un saltello, compaiono i segni.
