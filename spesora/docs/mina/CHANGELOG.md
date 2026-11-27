# MINA — changelog

## V4 — correzione del design esistente e della mascotte (27 novembre 2026)

Il restyling precedente non era approvato. V4 lo corregge senza ripartire da zero: logica, servizi, dati, navigazione e funzioni restano gli stessi. Lo stile dei pulsanti non è cambiato (solo dimensioni e posizioni).

Commit: «MINA V4 (1/3)» mascotte, «MINA V4 (2/3)» schermate, «MINA V4 (3/3)» QC e consegna.

### Mascotte (`src/ui/mascot/mina2/`)
- **Un solo scheletro per Mina 2.0 e Mina Chef** (`BASE_RIG` in `art.ts`, `RIG = { classic, chef }` identici): stesse spalle (43,123 e 157,127.5), stessa lunghezza di braccio e avambraccio (22 + 21), stesso spessore (11,2 → 7,2), stessa mano (scala 0,92). Mina Chef è Mina 2.0 con cappello e grembiule; prima aveva corpo, braccia e faccia propri.
- **Braccia continue**: il tubo del braccio è un'unica curva con raccordo morbido al gomito (`r = 0,9 · min(lu, lf)`), quindi niente gomiti a punta. La distanza massima è limitata a `a + b − 0,15`, così il braccio non si «stacca» dalla spalla.
- **Riposo disteso**: `restL` (31.5, 165.6) e `restR` (168.5, 170) lungo i fianchi. Il gomito resta oltre 140° (nuovo test).
- **Saluto non permanente**: `welcome` e `wave` stanno a riposo. Il gesto alza la mano con una curva morbida (via `liftWaveR`), saluta e torna a `rest`. L'ingresso nell'intro finisce a riposo.
- **Gesto «pensierosa»**: la mano arrivava al mento passando davanti alla faccia, perché `reach` modificava l'oggetto di partenza condiviso. Ora `reach` crea oggetti nuovi e il braccio passa dall'esterno.
- **Ingredienti dentro la borsa**:
  - ordine dei livelli: dietro → ingredienti → manico → corpo e bordo → faccia → braccia → piedi;
  - il bordo anteriore copre la base degli ingredienti;
  - pomodoro, carota, pane e lattuga riposizionati in gruppi `translate`/`rotate`, invece che con z-index;
  - nessuna linea li attraversa e niente galleggia.
- **Mina Chef**:
  - cappello a lobi con fascia;
  - grembiule verde (`APRON`) sopra lo stesso corpo;
  - faccia e sopracciglia uguali a Mina 2.0;
  - ciotola in scala 0,62;
  - pose `CHEF_ARM` sullo stesso scheletro, senza lunghezze speciali.
- `minaStaticSvg(look, { shadow, viewBox, legs })` per i fogli di prova. Tolti gli sbuffi (`puffs`) non più usati.
- Strumenti nuovi:
  - `scripts/mascot/pose-sheet.ts` (foglio delle pose);
  - `scripts/mascot/gesture-keys.ts` (fasi di un gesto: inizio, apertura, massima estensione, ritorno, riposo).

### Colori e componenti condivisi
- **Meno bianco**:
  - fondo avorio `#FDF8F0` (anche nello splash);
  - card crema `#FFFDF8` al posto del bianco puro, in 31 punti;
  - bordi caldi `#EFE6D8` e `#DED3C3`;
  - ombre brune morbide (`#5A4528`).
  - Niente sfumature né texture nuove.
- Titoli di pagina 30/36, peso 800. Logo nell'intestazione 41 pt.
- `src/ui/mina/kit.tsx`:
  - `ScreenTitle` con la mascotte a destra fuori dal flusso, così il titolo non va a capo;
  - componenti nuovi `MascotStage` (piano salvia sotto Mina), `SearchField`, `Tag`, `Expandable`;
  - `Pills` con le varianti `fill` e `soft`.
- `Screen`: più spazio in fondo, così l'ultima card non finisce sotto la barra delle schede.

### Schermate
- **Benvenuto**:
  - Mina e logo scalati sull'altezza dello schermo (Mina fino a 300 pt, logo al 27%), titolo 30;
  - Mina Chef in pagina 2 fino a 330 pt;
  - intro accorciata (mascotte a 1,0 s, dissolvenza a 2,5 s).
- **Questionario**:
  - Mina su `MascotStage` in basso, con la domanda e le risposte in alto, così non resta un vuoto sotto;
  - tessere alte 150 con illustrazione 74 ed etichetta 18; cerchi numerati 58.
  - Sugli schermi bassi Mina si rimpicciolisce, o non compare se non entra intera: mai tagliata dal pulsante.
- **Anteprima**: Mina 150 su piano salvia. Sugli schermi bassi 2 giorni invece di 3, poi «Vedi tutti i 7 giorni».
- **Abbonamento**:
  - Mina 172 su onda salvia, vantaggi 17/600 con spunte su salvia;
  - due card «Annuale / Mensile» anche con gli acquisti spenti, con «Prezzo dallo store» al posto del prezzo, opache e non selezionabili. Nessun prezzo o sconto inventato.
  - Pulsante principale subito dopo i piani; sugli schermi bassi resta fisso in basso, sopra Ripristina · Termini · Privacy.
- **Oggi**:
  - data nell'intestazione accanto a campanella e ingranaggio;
  - saluto e Mina allineati al centro;
  - hero alta 286 con ombra «float»;
  - nome del piatto che si rimpicciolisce invece di spezzare una parola (`dishFit`);
  - giorni 66×84.
- **Spesa**: la lista dei prodotti arriva subito dopo filtri e stato. Spiegazioni, costo del viaggio e riepilogo sono in «Dettagli della spesa» (espandibile), dopo i reparti.
- **Dispensa**:
  - avviso delle mancanze in un banner pesca compatto con Mina piccola; verde quando è risolto;
  - ricerca per nome quando ci sono più di 5 prodotti.
- **Ricette**: tessere categoria 82×94, foto delle card in proporzione 1,08, titoli 18.
- **Dettaglio ricetta**: foto in proporzione 1,34; righe degli ingredienti spuntabili mentre si prepara (solo in memoria); disponibilità mostrata per i pasti programmati.
- **Modalità Cucina**: il passaggio attivo è il protagonista (riquadro alto 250 con icona in un cerchio, testo più grande).
- **Profilo**: riga «Lingua · Italiano» (per ora l'unica lingua, lo dice un messaggio); la nota sul profilo locale va in fondo.

### Strumenti di verifica
- `scripts/screenshots/measure-mina.py`: confronto **misurato**. Il telefono del riferimento viene ritagliato sotto la barra di stato e portato a 390 pt. Accanto ci sono lo screenshot dell'app e la sovrapposizione al 50%, con linee ogni 50 pt.

---

## V3 — restyling (prima consegna, non approvato)

### Marchio
- Palette a token: verde `#1F6B4A`, avorio `#FFF8EC`, pesca `#FFA56B`, salvia `#DCECD8`. Fondo delle pagine bianco caldo `#FFFCF7`, card bianche, ombre calde. Colori del logo separati (`brand`).
- Logo vettoriale ricostruito sulle misure del logo approvato:
  - parola arrotondata con sfumatura verde;
  - cestino arancione inclinato con bordo e manico verdi, griglia 2×3, tre trattini lime;
  - nessun arco, foglia o sottolineatura.
- Icone con la sola Mina 2.0: iOS 1024, Android adattiva nell'area sicura, monocromatica per le icone a tema, favicon. Splash con Mina e logo.
- Nome visibile «Mina». Identificativi tecnici invariati.

### Animazioni e mascotte
- Intro: entrano nell'ordine il cestino, la parola e i trattini. Mina esce in alto e il logo sta sotto, come nel benvenuto, quindi il passaggio finale non incrocia le parti.
- Caricamento del piano: al centro Mina Chef mescola nella ciotola, con gli ingredienti che le girano intorno. Ogni giro di mescolata finisce al suo posto, quindi a lavoro finito non resta bloccata a metà gesto. Alla fine fa l'occhiolino con il cucchiaio. Nessuna percentuale finta.
- Barra delle schede con icone disegnate come nel riferimento: casa, calendario, cestino, barattolo, cappello da chef. Restano saltello al tocco e versione piena per la scheda attiva.

### Schermate
- **Benvenuto:** 3 pagine (Mina 2.0 e logo; Mina Chef «Benvenuto in Mina!»; la spesa), pallini, «Inizia →» e «Continua →», «Nessun account richiesto · Privacy». Chi ha già iniziato il questionario lo riprende. L'avviso sull'abbonamento compare solo quando sarà obbligatorio.
- **Questionario:**
  - le stesse 16 domande e la stessa logica;
  - barra a 5 segmenti per fasi, titoli grandi e centrati;
  - tessere illustrate (pasti, dieta), cerchi numerati (persone, volte di spesa);
  - Mina grande in alcuni passi, spiegazioni brevi con ⓘ, errori accanto alle scelte;
  - cerchio ← e «Avanti →».
- **Anteprima:** primi 3 giorni con badge, foto e nome; «Vedi tutti i 7 giorni»; Mina che festeggia; ← per correggere le risposte; «Procedi →» salva e apre l'abbonamento.
- **Abbonamento:**
  - onda salvia con Mina, «Sblocca tutto Mina», 4 vantaggi reali;
  - piani e prezzi solo dallo store, con il prezzo totale per periodo;
  - rinnovo automatico, Ripristina, Termini, Privacy, Gestisci;
  - con gli acquisti spenti lo dice e lascia entrare.
- **Oggi:**
  - logo, notifiche, profilo;
  - data e «Buongiorno! 👋» con Mina piccola;
  - card orizzontale del pasto, banner «Ti mancano N ingredienti»;
  - giorni a chip con spunta e cestino;
  - sotto: «poi», preparazioni della sera, «Com'è andata?», accessi a spesa e dispensa.
- **Settimana:** pillola con l'intervallo; una riga per giorno con badge salvia e card dei pasti (foto, nome, pasto e ora, stato) più la spesa del giorno; «Modifica piano» per rigenerare, rendere la settimana più economica, cambiare le preferenze e vedere lo storico. Tocco = ricetta, pressione lunga = azioni del pasto.
- **Spesa:** «Da acquistare (N)» / «Acquistati (N)»; reparti in card con fascia pesca; casella, nome, quantità e illustrazione; etichetta «serve oggi»; selettore dei giorni di spesa; «Conferma acquisti (N)» con importo facoltativo (errore accanto al campo); festa di Mina a lista completata; «Già in dispensa» richiudibile.
- **Dispensa:**
  - «+» per aggiungere;
  - filtri Tutti / Scadenze / Da controllare;
  - elenco con quantità, quanto serve, stato con icona, scadenza inserita;
  - scena «potrebbe non bastare» e «in scadenza»;
  - basi in casa, «Come funziona» su richiesta.
- **Ricette:** ricerca con il pulsante filtro (pannello completo dei filtri esistenti); tessere Tutte, Primi, Secondi, Veg, Per te, Dispensa, 15 min, Preferite, Unici, Colazioni, Spuntini; griglia a 2 colonne con cuore (preferito), tempo e persone; Mina Chef con la trasformazione.
- **Ricetta:**
  - foto a tutta larghezza con indietro, preferito e azioni del pasto;
  - tempo e persone (stepper);
  - linguette Ingredienti (allergeni sempre visibili, disponibilità), Preparazione, Consigli;
  - «Inizia a cucinare →» sempre in basso.
- **Profilo:**
  - profilo locale, preferenze pasti e alimentari;
  - notifiche, storico, prezzi, abbonamento, aiuto;
  - Privacy e condizioni (privacy, termini, informazioni legali, licenze);
  - i tuoi dati (esporta, cancella), informazioni su Mina;
  - Mina con gli occhi a cuore.
- **Pagine nuove:** `aiuto`, `termini`, `legale`, `licenze`. `abbonamento` sostituisce `plus`, e il vecchio indirizzo porta alla stessa pagina.

### Messaggi
- Toast brevi al posto dei popup informativi: notifica di prova, ricetta aggiunta, esportazione non riuscita, pasto già registrato o registrato con ingredienti mancanti.
- `Notice` compatto, mai rosso: l'avviso importante è pesca con l'icona di attenzione.
- Errori recuperabili accanto al campo: importo pagato, risposte del questionario.
- Restano piccoli dialoghi solo per le conferme: rigenera, conferma della spesa, riorganizza per le scadenze, cancella tutto, riproponi.

### Abbonamenti e privacy (dalla ricerca del 27 novembre)
- Modalità `required`, `mustSubscribe`, stato `unknown` che non blocca, chiave RevenueCat per Android, `SubscriptionGate`. Test.
- Pagina Privacy riscritta su ciò che il codice fa davvero. Audit e proposte in `compliance/`.

### Componenti nuovi
- `src/ui/mina/kit.tsx`: intestazione con logo, titolo grande, pillole, badge del giorno, elenchi in card, banner, note, ⓘ, errori in linea.
- `src/ui/mina/choices.tsx`: tessere, cerchi numerati, barra a segmenti, indietro rotondo.
- `src/ui/mina/ChoiceArt.tsx`: illustrazioni di pasti e diete.
- `src/ui/mina/NavGlyph.tsx`: icone della barra delle schede.
- `src/ui/brand/*`: logo.
- `src/ui/toast.tsx`.
- `Button`: freccia finale (`iconRight`) e taglia `large`, **stesso stile di prima**.
