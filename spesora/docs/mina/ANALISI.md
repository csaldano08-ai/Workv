# MINA — Analisi prima del restyling

Branch di lavoro: `claude/bold-darwin-lfb2pr`, partito dall'ultima versione funzionante (`claude/spesora-restyling-mina2`, commit `de494c7`), che resta intatta.
Riferimento visivo: le 13 schermate approvate (immagine «Mina — Pianifica, cucina e fai la spesa in modo semplice»), ritagliate una per una e misurate.

## 1. Inventario dell'app attuale

| Area | File | Note |
| --- | --- | --- |
| Avvio e porte | `app/_layout.tsx` | Font Nunito, `OnboardingGate` (senza profilo → `/benvenuto`), `NotificationRouter`, intro animata (`IntroGate`), loader, celebrazioni |
| Schede | `app/(tabs)/_layout.tsx` | 5 schede: Oggi, Settimana, Spesa, Dispensa, Ricette; badge della spesa; precaricamento |
| Benvenuto | `app/benvenuto.tsx` | Logo Spesora, Mina che saluta, fumetto, slogan, 3 punti numerati, «Inizia», link Privacy |
| Questionario | `app/onboarding.tsx`, `src/features/onboarding/*` | 16 passi, salvataggio a ogni modifica, validazioni, reazioni di Mina, anteprima reale della settimana (`generatePlan`) |
| Abbonamento | `app/plus.tsx`, `src/core/purchases/*`, `src/features/paywall/PaywallSlot.tsx` | Servizi `disabled` / `mock` (solo sviluppo) / `revenuecat`; nessun prezzo nel codice; `purchasesMode = "disabled"`, `paywallMode = "off"` |
| Oggi | `app/(tabs)/index.tsx` | Saluto + Mina, pasto protagonista (foto, tempi, stato ingredienti, «Cucina ora», altre azioni), «poi», preparazioni della sera, conferme «Com'è andata?», settimana in riga, accessi spesa/dispensa, spesa prevista |
| Settimana | `app/(tabs)/settimana.tsx` | Vista Giorno (linguette, Mina, schede pasti con azioni) e vista Settimana (griglia); rigenera; settimana più economica |
| Spesa | `app/(tabs)/spesa.tsx` | Più giri di spesa, prodotti urgenti, categorie apribili, quantità e confezioni, costo stimato, «già in dispensa», conferma acquisti con importo, festa a lista completata |
| Dispensa | `app/(tabs)/dispensa.tsx` | Quantità disponibili/necessarie, stati (disponibile, da verificare, insufficiente, esaurito), scadenze inserite dall'utente, sempre in casa, aggiungi, «usali nei prossimi pasti» |
| Ricette | `app/(tabs)/ricette.tsx` | Ricerca (nome, ingrediente, regione), filtri, preferiti, carosello e griglia |
| Ricetta | `app/ricetta/[id].tsx` | Foto, tempi, persone (stepper), «Inizia a cucinare», allergeni, ingredienti con stato, preparazione con timer, altre informazioni, azioni del pasto (cucinato, cambia, non cucino) |
| Modalità Cucina | `app/cucina/[id].tsx` | Un passaggio alla volta, Mina Chef, timer, aiuto contestuale |
| Impostazioni | `app/impostazioni.tsx`, `preferenze/[section]`, `notifiche`, `privacy`, `storico`, `prezzi` | Preferenze, notifiche, storico, prezzi, Plus, privacy, esporta (JSON), cancella tutto |
| Componenti | `src/ui/*` | `Button` (pillola in rilievo con base più scura, si schiaccia al tocco), `Chip`, `Card`, `Notice`, `Row`, `CheckBox`, `ProgressBar`, `Screen`, `notebook` (StickyNote, PaperTabs, LinkRow…), `dialog.ts` (Alert nativo) |
| Token | `src/theme/tokens.ts` | Verde `#2F7F57`, avorio `#FBFCFA`, pesca `#FFA873`, salvia `#DCEEDF`; Nunito; test di contrasto |
| Mascotte | `src/ui/mascot/*` | Mina 2.0 e Mina Chef a parti separate (SVG), 27 pose, gesti, regia degli eventi, intro |
| Dati | `src/core/storage/*` (expo-sqlite), `SpesoraService.ts` | Tutto locale; esportazione e cancellazione disponibili |

Verifiche tecniche fatte sul codice:

- **Nessuna chiamata di rete** nel codice dell'app (nessun `fetch`, nessun SDK di analisi o pubblicità). L'unico modulo che può andare in rete è `react-native-purchases`, caricato solo con `purchasesMode = "revenuecat"` (oggi spento).
- **Notifiche solo locali**: nessun token push richiesto (`getExpoPushTokenAsync` non è usato).
- **Nessun account**: nessuna email, password, Google/Apple, telefono o registrazione su server.
- **Aggiunta manuale alla lista della spesa: non esiste.** La lista è calcolata dal piano meno la dispensa. Il pulsante «+ Aggiungi prodotto» del riferimento non verrà inventato (vedi Spesa).
- **Scadenze in dispensa: esistono solo se inserite dall'utente** (`setExpiry`). Il filtro «Scadenze» è quindi reale; «Preferiti» per la dispensa non esiste.
- **Piano di una settimana alla volta** (`PLAN_DAYS = 7`): non esistono altre settimane da sfogliare con le frecce.
- **Lingua**: l'app è solo in italiano; la riga «Lingua» del riferimento non verrà inventata.
- **Condivisione ricetta**: non esiste; l'icona «condividi» del riferimento non verrà inventata.

## 2. Marchio

| Elemento | Riferimento | Decisione |
| --- | --- | --- |
| Nome | MINA | Cambia ciò che si vede (testi, titoli, notifiche, `app.json → name`). **Restano** `slug`, `scheme`, id, chiavi di archivio, nomi di classi e il seme del pianificatore (`spesora|data`), che cambierebbe i menù già generati |
| Logo | Parola «Mina» arrotondata, verde intenso sfumato (alto `#088F3F` → basso `#03481F`), cestino arancione `#F49608` con bordo e manico verdi, griglia 2×3, tre trattini verde lime | Ridisegnato in vettoriale con le proporzioni misurate (larghezza ≈ 3,8 × altezza). Nessun arco sopra la M, nessuna foglia sulla i, nessuna sottolineatura |
| Icona | Solo Mina 2.0 su fondo avorio arrotondato, senza scritta | Icona iOS 1024, Android adattiva (primo piano nell'area sicura del 66%, fondo, monocromatica), favicon |
| Palette | Verde `#1F6B4A`, avorio `#FFF8EC`, pesca `#FFA56B`, salvia `#DCECD8` | Token centralizzati; fondo pagine bianco caldo (`#FFFCF7`, misurato `#FDFAF4` nel riferimento), card bianche; avorio per superfici calde, non per tutto |

## 3. Confronto per schermata (attuale → riferimento → decisione)

Legenda: **R** resta · **S** si sposta · **Sm** semplificato · **T** nuova tipografia · **C** componente moderno · **A** animato · **F** mantenuto per funzione o legge.

| # | Schermata | Attuale | Riferimento | Decisioni |
| --- | --- | --- | --- | --- |
| 1 | Benvenuto | Logo piccolo, Mina, fumetto, slogan, 3 punti numerati, 2 pulsanti | Mina grande che saluta su forme salvia, logo, una frase, 3 pallini, «Inizia →» | Sm: niente fumetto né elenco; C: carosello di 3 pagine con pallini; A: Mina saluta; F: piccolo link Privacy (trasparenza) |
| 2 | Intro Chef | — | Mina Chef con cucchiaio e ciotola, «Benvenuto in Mina!», «Continua →» | Nuova pagina 2 del carosello (ricette); pagina 3 sulla spesa, stessa struttura |
| 3 | Pasti | Chip di testo | Tessere con illustrazione, bordo verde e spunta sulla scelta, barra a 5 segmenti, Mina, ← e «Avanti →» | C: tessere per pasti, dieta, strumenti; C: barra a segmenti per fasi (16 domande reali in 5 fasi); S: «indietro» diventa il cerchio a sinistra; Sm: consigli lunghi dietro un'icona ⓘ |
| 4 | Persone | Chip 1–4, «5 o più» | Cerchi numerati 1…5+, Mina con lista | C: cerchi numerati (persone, frequenza della spesa); F: stepper oltre 5 |
| 5 | Anteprima | Elenco giorno per giorno di tutti i pasti | «La tua settimana», 3 righe (giorno, foto, nome, freccia), Mina, «Procedi →» | Sm: righe con badge del giorno e foto, i primi giorni; F: piano reale generato con lo stesso motore |
| 6 | Paywall | `PaywallSlot` spento | Onda salvia con Mina, «Sblocca tutto Mina», 4 vantaggi, 2 piani, «Inizia il piano →» | Nuova schermata dopo l'anteprima; prezzi solo dallo store; con acquisti spenti lo dichiara e lascia entrare (nessuna simulazione); ripristino, termini, privacy, rinnovo automatico (F) |
| 7 | Oggi | Saluto con Mina, foto grande sopra, card verticale, settimana con miniature, accessi | Logo + campanella + ingranaggio, «Buongiorno! 👋», card orizzontale (foto a sinistra con cuore, a destra pasto/ora/titolo/tempi/«Cucina ora»), banner pesca «Ti mancano N ingredienti», giorni a chip | S: banner fuori dalla card; C: card orizzontale; T: titolo grande; Mina piccola a destra del saluto (il brief la chiede in Home; nel riferimento lo spazio è vuoto); F: «altre azioni», conferme «Com'è andata?», preparazioni della sera restano sotto la settimana |
| 8 | Settimana | Linguette + Mina + schede, griglia, rigenera in alto | Pillola salvia con l'intervallo, righe: badge giorno salvia + card con foto, nome, freccia; «Modifica piano» | C: righe per giorno (più pasti nella stessa card); Sm: niente doppia vista; S: rigenera, settimana economica, preferenze e storico in «Modifica piano»; F: azioni del pasto (tenendo premuto e nella ricetta); niente frecce di settimana (il piano è di 7 giorni) |
| 9 | Spesa | Giri di spesa a linguette, tessere urgenti, categorie apribili, conferma | «Lista della spesa», segmenti «Da acquistare (N)» / «Acquistati (M)», fasce categoria pesca, righe con casella, nome, immagine | C: segmenti reali (spuntati / da spuntare); C: categorie a fascia; Sm: urgenti come etichetta «oggi» invece di tessere; F: giri di spesa, quantità, conferma acquisti al posto di «Aggiungi prodotto» (funzione inesistente) |
| 10 | Dispensa | Righe con quantità e stato, scena di Mina, sempre in casa | Filtri «Tutti / Scadenze / Preferiti», elenco con immagine, nome, quantità, freccia | C: filtri reali «Tutti / Scadenze / Da comprare» (Preferiti non esiste per la dispensa); Sm: stato come puntino colorato con testo breve; F: aggiungi, sempre in casa, avviso «potrebbe non bastare» |
| 11 | Ricette | Ricerca, filtri a chip, carosello e griglia | «Ricette», ricerca + filtro, tessere Tutte/Primi/Secondi/Veg, griglia a 2 colonne con cuore, tempo, persone | C: tessere categoria; C: griglia a 2 colonne; F: filtri esistenti nel pannello del filtro |
| 12 | Ricetta | Foto, tempi, stepper, ingredienti, preparazione, altre info | Foto a tutta larghezza con ← e cuore, titolo, «20 min · 2 persone · Facile», linguette Ingredienti/Preparazione/Consigli, righe con quantità, «Inizia a cucinare →» | C: linguette (Consigli = note, sostituzioni, preparazioni anticipate); difficoltà solo se nei dati; F: allergeni, stepper persone, azioni del pasto; niente «condividi» |
| 13 | Profilo | «Impostazioni» con sezioni | «Profilo», righe con icone verdi, Mina con il cuore | Rinominato Profilo (profilo locale, nessun account); righe reali: preferenze pasti, preferenze alimentari, notifiche, storico, prezzi, abbonamento, privacy, informazioni su Mina, esporta/cancella dati |
| — | Barra | Ionicons: sole, calendario, cestino, vassoi, libro | Casa, calendario, cestino, barattolo, cappello da chef | Icone disegnate in SVG come il riferimento, stessi 5 nomi e stessa navigazione |

## 4. Eccezioni esplicite

- **Pulsanti**: si conserva lo stile attuale (pillola, bordo, base più scura, pressione elastica, stati). Del riferimento si prendono solo posizione, larghezza, spaziature, colori e la freccia finale come contenuto. Nessun pulsante lucido, sfumato o tridimensionale.
- **Funzioni mostrate solo nel riferimento** (aggiungi prodotto, preferiti della dispensa, lingua, condividi, frecce di settimana): non inventate.

## 5. Avvisi e messaggi

Oggi: `Notice` a riquadro (anche rosso), `Alert` di sistema per conferme e per esiti dell'abbonamento. Decisioni: avviso breve → banner compatto o toast; conferma → piccolo dialogo solo se serve; errore recuperabile → riga accanto all'elemento; errore importante → dialogo con un'azione; testi legali su pagine intere; mai solo il rosso (icona + testo).

## 6. Privacy

Profilo locale senza account. Dati: SQLite sul dispositivo. Da documentare: i backup di sistema (iCloud su iOS, Backup automatico di Android) possono includere il database dell'app sull'account dell'utente; nessun server di Mina. Con gli acquisti attivi, RevenueCat e lo store ricevono i dati dell'acquisto (identificativo anonimo dell'app, ricevuta), mai le preferenze alimentari.

## 7. Rischi

- Testi lunghi e nomi di ricette lunghi nella card orizzontale di Oggi → titolo su più righe con dimensione adattiva e controllo sui 3 formati.
- 16 domande in una barra a 5 segmenti → segmenti per fasi con riempimento parziale, numero del passo letto dagli screen reader.
- Abbonamento obbligatorio senza credenziali → il blocco si attiva solo con acquisti reali funzionanti (`isLive`), mai con il servizio spento.
