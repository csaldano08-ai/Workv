# Prodotto — prima versione (MVP)

Spesora è un calendario che decide cosa cucinare, quando fare la spesa e cosa comprare. Non è un ricettario, un conta-calorie o un chatbot.

## Funzioni realizzate

- **Onboarding in 13 passi brevi** con salvataggio progressivo, ritorno indietro e ripresa dopo il riavvio: persone, pasti, dieta (onnivoro, pescetariano, vegetariano, vegano), esclusioni per i 14 allergeni UE e ingredienti specifici, non graditi, tempo (feriali/weekend/per giorno), orari (feriali/weekend/per giorno), frequenza e giorni di spesa (con proposta da confermare), budget facoltativo, strumenti, dispensa iniziale, promemoria. Termina con l'**anteprima reale** del calendario generato.
- **Calendario di 7 giorni** generato dal `MealPlannerEngine` deterministico; rigenerato automaticamente all'apertura quando il precedente è finito. Nel giorno di creazione non vengono proposti pasti il cui orario è già passato.
- **Oggi**: prossimo pasto con illustrazione, tempo, persone, stato stimato degli ingredienti, apertura della preparazione, avviso del giorno di spesa, conferma dei pasti passati.
- **Settimana**: vista a 7 giorni con oggi evidenziato e giorni di spesa riconoscibili; per ogni pasto: ricetta, cambia, sposta (scambio con un altro giorno), cucinato / non cucinato / mangio fuori / cucinato altro. Rigenerazione del menù.
- **Ricetta**: porzioni modificabili per il singolo pasto, ingredienti scalati con disponibilità, allergeni con stato "non verificato", passaggi numerati con timer, sostituzioni, preferiti, "aggiungi a un altro giorno".
- **Spesa**: liste per ciascun giorno di spesa (più eventuale spesa iniziale), raggruppate per reparto, con quantità nette, formati comuni indicativi, ricette di destinazione, avvisi di conservazione, voci già coperte dalla dispensa. Spunta = "nel carrello"; solo la **conferma** (anche parziale) porta i prodotti in dispensa.
- **Dispensa**: quantità confermate e stimate distinte, quantità previste dai prossimi pasti, avviso "potrebbe non bastare", correzione, consumo fuori app, scadenze inserite dall'utente, basi "quanto basta".
- **Ricettario**: ricerca per nome/ingrediente/strumento, filtri per pasto, durata, preferite, compatibilità.
- **Notifiche locali**: inizio preparazione (orario pasto − durata ricetta − anticipo), giorno di spesa, fine calendario; fasce di silenzio; scelta dei pasti; notifica di prova; apertura diretta della ricetta o della lista anche ad app chiusa.
- **Impostazioni**: modifica di ogni preferenza (ricalcola i pasti futuri), notifiche, storico, Plus, privacy, esportazione JSON, cancellazione totale con doppia conferma.
- **Spesora Plus**: schermata trasparente; acquisti disabilitati finché lo store non è configurato, nessun prezzo inventato.

## Confini della prima versione

- Catalogo incluso nell'app: 156 ricette originali (30 colazioni, 113 pranzi/cene, 25 spuntini; alcune valgono per più pasti), 117 pronte in 25 minuti o meno, 48 piatti principali vegani.
- Nessun prezzo dei supermercati: il budget è solo memorizzato, non viene mai dichiarato rispettato.
- Nessuna foto: ogni ricetta usa un'illustrazione vettoriale originale generata dall'app.
- Nessun backend, account, sincronizzazione, importazione file, widget, scansione, video, AI.
- Gli abbonamenti non bloccano alcuna funzione (`paywallMode: off`).
- Spesora non è un dispositivo medico e non certifica l'assenza di allergeni.

## Personalizzazione (seconda iterazione)

- **Profilo porzioni**: appetito (poco/normale/tanto), stile di vita, tipo di pasti (leggeri, equilibrati, sostanziosi, più proteici), sesso facoltativo e mai usato nei calcoli.
- **Quantità abituali**: pasta (70–120 g o personalizzata), riso e cereali (60–100 g o personalizzata), secondi (piccola/media/abbondante). Ricette, spesa e dispensa usano questi valori; nella ricetta le quantità adattate sono segnate "TUA". Dicitura: "Le porzioni sono indicative e si basano sulle tue abitudini impostate nell'app."
- **Gusti combinabili**: pesce, ricette proteiche, primi, secondi, piatti unici, insalatone/bowl, cene veloci, colazioni dolci o salate. **Tipo di settimana**: pratica, varia, ingredienti semplici e riutilizzati, proteica, più vegetariana, veloce. Spostano le preferenze del motore senza mai superare le esclusioni.
- **Timo**, la mascotte, accompagna onboarding, Oggi, Spesa, Dispensa, stati vuoti e Plus; le notifiche usano un tono amichevole, breve e mai colpevolizzante.
- **Immagini delle ricette**: struttura pronta (vedi IMAGES.md); finché mancano, illustrazioni originali.
- **Plus**: registro delle funzioni premium (`src/core/purchases/features.ts`), etichette PLUS nelle impostazioni, nessun blocco attivo (`paywallMode: off`).

Spesora resta un organizzatore di cucina e spesa: nessuna caloria, nessun piano dietetico, nessuna indicazione medica.

## Catalogo da 500 ricette e budget (terza iterazione)

- **500 ricette** (156 + 344 nuove), 297 ingredienti canonici, metadati editoriali (cucina italiana o internazionale, regione, difficoltà, tecnica, famiglia di varianti, stagioni, conservazione, stato di revisione). Copertura per profili in `COVERAGE.md`.
- **Ricettario**: ricerca per titolo, ingrediente o regione; filtri per portata, pasto, dieta, tempo, preferite ed esclusioni; sezioni "Idee per questa settimana", "Con ciò che hai in dispensa", "Pronto in 15 minuti", "Pochi ingredienti", "Piatti italiani", "Piatti unici", "Colazioni salate".
- **Nuove preferenze**: legumi, preparazioni vegetali; etichette senza claim nutrizionali.
- **Budget**: questionario (meno possibile, equilibrato, limite preciso, solo gusti; settimanale o mensile; ambito; tipo di negozio facoltativo), prezzi personali, costo indicativo di ricette e uscite, budget residuo, importo pagato, "Rendi questa settimana più economica". Vedi `PRICES.md`.
- **Informazioni alimentari** con stati espliciti: nessun claim "senza glutine", "senza zuccheri", "proteico" o "bio".
- **Abbonamenti**: integrazione RevenueCat pronta, attiva solo con chiave e prodotti reali.
