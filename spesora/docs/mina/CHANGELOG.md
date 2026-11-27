# MINA — changelog del restyling (27 novembre 2026)

## Marchio
- Palette a token: verde `#1F6B4A`, avorio `#FFF8EC`, pesca `#FFA56B`, salvia `#DCECD8`. Fondo delle pagine bianco caldo `#FFFCF7`, card bianche, ombre calde. Colori del logo separati (`brand`).
- Logo vettoriale ricostruito sulle misure del logo approvato:
  - parola arrotondata con sfumatura verde;
  - cestino arancione inclinato con bordo e manico verdi, griglia 2×3, tre trattini lime;
  - nessun arco, foglia o sottolineatura.
- Icone con la sola Mina 2.0: iOS 1024, Android adattiva nell'area sicura, monocromatica per le icone a tema, favicon. Splash con Mina e logo.
- Nome visibile «Mina». Identificativi tecnici invariati.

## Animazioni e mascotte
- Intro: entrano nell'ordine il cestino, la parola e i trattini. Mina esce in alto e il logo sta sotto, come nel benvenuto, quindi il passaggio finale non incrocia le parti.
- Caricamento del piano: al centro Mina Chef mescola nella ciotola, con gli ingredienti che le girano intorno. Ogni giro di mescolata finisce al suo posto, quindi a lavoro finito non resta bloccata a metà gesto. Alla fine fa l'occhiolino con il cucchiaio. Nessuna percentuale finta.
- Barra delle schede con icone disegnate come nel riferimento: casa, calendario, cestino, barattolo, cappello da chef. Restano saltello al tocco e versione piena per la scheda attiva.

## Schermate
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

## Messaggi
- Toast brevi al posto dei popup informativi: notifica di prova, ricetta aggiunta, esportazione non riuscita, pasto già registrato o registrato con ingredienti mancanti.
- `Notice` compatto, mai rosso: l'avviso importante è pesca con l'icona di attenzione.
- Errori recuperabili accanto al campo: importo pagato, risposte del questionario.
- Restano piccoli dialoghi solo per le conferme: rigenera, conferma della spesa, riorganizza per le scadenze, cancella tutto, riproponi.

## Abbonamenti e privacy (dalla ricerca del 27 novembre)
- Modalità `required`, `mustSubscribe`, stato `unknown` che non blocca, chiave RevenueCat per Android, `SubscriptionGate`. Test.
- Pagina Privacy riscritta su ciò che il codice fa davvero. Audit e proposte in `compliance/`.

## Componenti nuovi
- `src/ui/mina/kit.tsx`: intestazione con logo, titolo grande, pillole, badge del giorno, elenchi in card, banner, note, ⓘ, errori in linea.
- `src/ui/mina/choices.tsx`: tessere, cerchi numerati, barra a segmenti, indietro rotondo.
- `src/ui/mina/ChoiceArt.tsx`: illustrazioni di pasti e diete.
- `src/ui/mina/NavGlyph.tsx`: icone della barra delle schede.
- `src/ui/brand/*`: logo.
- `src/ui/toast.tsx`.
- `Button`: freccia finale (`iconRight`) e taglia `large`, **stesso stile di prima**.
