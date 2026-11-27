# Restyling UI e Mina 2.0

La stessa Spesora, con la stessa struttura e le stesse funzioni, ma più moderna, luminosa e accogliente, accompagnata dalla nuova mascotte **Mina 2.0** (la borsetta della spesa) e da **Mina Chef** nelle ricette.

Branch: `claude/spesora-restyling-mina2`. La versione precedente è confrontabile nelle branch `claude/spesora-redesign-bc` e `claude/spesora-ads-concepts`.

## Cosa trovi in questa cartella

| File | Contenuto |
| --- | --- |
| `riferimenti/mina2_foglio_approvato.webp` | Il foglio di Mina 2.0 e Mina Chef fornito dall'utente (riferimento principale) |
| `mina2_tavola.png` | Le 20 pose e le espressioni di Mina 2.0 e Mina Chef come sono nel codice |
| `mina2_animazioni.mp4` | Video (52 s, 30 fps) dei gesti animati, comprese le quattro pose di Mina Chef, registrato dalla demo web reale |
| `riferimenti/mina_chef_style_reference.png` | Il foglio di Mina Chef con le quattro pose (cucchiaio, mescola, serve, checklist) |
| `mina2_confronto_riferimento.jpg` | Mina 2.0 e Mina Chef dell'app accanto al foglio approvato |
| `mina2_confronto_chef.jpg` | Le quattro pose di Mina Chef: foglio sopra, app sotto |
| `v2/intro_reale.mp4` | L'intro V2 registrata dall'app reale al primo avvio (goccia → cerchio → logo con la foglia → Mina che esce e saluta → Benvenuto), più `v2/intro_fotogrammi.jpg` |
| `v2/mina_braccia.mp4` | Gli 8 gesti di prova del rig delle braccia, a velocità normale e rallentati ×3 |
| `v2/trasformazione_mina_chef.mp4` | La trasformazione in Mina Chef: normale, rallentata ×3 e nell'app alla prima apertura di Ricette |
| `v2/navigazione_completa.mp4` | Navigazione completa (79 s) dall'app reale: intro, onboarding, Home, Settimana, Spesa, Dispensa, Ricette, Preparazione, «Ho cucinato» |
| `v2/prova_spesa_completata.jpg`, `v2/prova_dispensa_aggiornata.jpg`, `v2/prova_preparazione.jpg` | Fotogrammi di prova: lista completata e confermata, dispensa corretta, modalità cucina con timer e conferma |
| `mina_alive_demo.mp4` | Video (70 s) della demo completa «Mina Alive»: avvio con l'intro, onboarding, Home, Settimana, Spesa con spunte e festa, Dispensa con la reazione e la correzione, Mina Chef, apertura ricetta, preparazione e conferma finale |
| `dispensa_risolta.png` | La scena «Ora ci siamo»: Mina sorride quando l'ultimo «potrebbe non bastare» viene risolto |
| `movimento_app.mp4` | Video (39 s) del movimento in tutta l'app, dalla demo web reale: passi del questionario, schede, giorni, ricettario, ricetta, spesa, festeggiamento, foglio delle azioni |
| `movimento_fotogrammi.jpg` | 13 fotogrammi del video, con il nome di ogni animazione |
| `home_v3_navigazione.mp4` | Video (13 s) della Home V3: saluto di Mina, card che entrano, preferito, calendario, spesa, tocco su Mina |
| `prima_dopo/home_v3.jpg` | La Home in tre versioni: originale, restyling, Home V3 (sopra e dopo lo scorrimento) |
| `prima_dopo/` | Confronto prima/dopo di 13 schermate, più `00_panoramica.jpg` |
| `screenshot/` | Schermate pulite (PNG, 780×1688) delle pagine principali, per i futuri video |
| `ABBONAMENTI.md` | Cosa è pronto e cosa servirà per collegare App Store e Google Play |
| `CHANGELOG.md` | Changelog tecnico |

I PNG trasparenti delle singole pose (1024 px) sono in `assets/mascot/mina2/`. Documentazione completa della mascotte: [`../MASCOT.md`](../MASCOT.md).

## In breve

- **Mina 2.0** ridisegnata in vettoriale dal foglio approvato, a parti separate: corpo, manico, verdure, foglia, occhi, bocca, braccia con gomito, piedi; Mina Chef con cappello, grembiule e cucchiaio.
- **Animazioni 2D**: saluto, idle, felice, pensierosa, lista completata, ricetta (Mina Chef), promemoria e reazione al tocco. Driver nativo su mobile; ferme con "Riduci movimento".
- **Palette centralizzata a token**: niente più fondo giallastro e verdi spenti; verde come colore principale, pesca solo per accenti. Contrasto AA verificato da un test.
- **Nunito** come carattere dell'app.
- **Home**: saluto con Mina che saluta, ricetta del giorno con la foto in grande, sintesi della settimana in 7 colonne, card compatta della spesa (in alto nei giorni di spesa).
- **Schermate**: Settimana (giorni più leggibili, colore per pasto), Ricette (Mina Chef nel titolo), Ricetta (consigli di Mina Chef), Spesa (Mina che festeggia la lista completata), Dispensa, Impostazioni e pagine secondarie con gli stessi componenti.
- **Intro e onboarding**: stesse domande; barra di avanzamento animata, Mina 2.0 che accompagna, festa finale, punto di inserimento (spento) per il futuro abbonamento.
- **Notifiche**: stessi avvisi e stesse impostazioni; corretto l'avviso di fine settimana, che mostrava la data in formato tecnico.

## Home V3 (seconda richiesta)

La Home non è più una pila di riquadri uguali ma un percorso: **saluto → pasto di oggi → cosa serve → settimana**.

- **Intestazione compatta**: marchio, data, avvisi (apre Notifiche) e impostazioni.
- **Saluto con Mina integrata**: titolo grande con un tratto verde sotto la domanda; Mina in piedi a destra si affaccia sopra la card del pasto (i piedi spariscono dietro la card), su una forma verde tenue di sfondo che la lega alla pagina. Un solo gesto all'apertura, contestuale: saluto, promemoria quando si cucina a breve, festa a giornata finita, pensierosa se mancano ricette. Nessun movimento continuo; toccandola fa un saltello.
- **Pasto di oggi protagonista**: foto grande 16:9 in alto senza cornici, etichette leggibili su fondo bianco (pasto e orario), cuore dei preferiti a cavallo della foto, titolo grande, durata · persone · orario d'inizio in una riga, **«Ti mancano N ingredienti»** calcolato dalla dispensa reale e collegato alla spesa giusta (oppure «Hai tutto in casa»), pulsante **«Cucina ora»** e un pulsante «…» con tutte le azioni di prima (cambia ricetta, sposta, cucinato, mangio fuori…).
- **Spesa contestuale**: la grande card della spesa in cima non c'è più; resta la riga sotto la ricetta e una tessera piccola più in basso.
- **Settimana compatta**: sette tessere con giorno, data e la foto del pasto principale; oggi in verde, i giorni passati più tenui, cestino nei giorni di spesa, spunta sui giorni completati. Accanto, «Calendario».
- **Spesa e dispensa**: due tessere di colore diverso (pesca, verde) con dati reali (prodotti per oggi, prodotti che potrebbero non bastare).
- **Microanimazioni**: card che entrano scaglionate, pulsanti e tessere che si schiacciano al tocco, cuore che rimbalza quando si aggiunge ai preferiti, saluto di Mina; tutto fermo con "Riduci movimento".
- **Stati**: scheletro della pagina mentre i dati non sono pronti, card dedicata quando non ci sono pasti, avvisi e conferme dei pasti invariati.
- **Telefoni bassi** (altezza < 720 pt, es. iPhone SE): foto e Mina più compatte. Su 375×667, 390×844 e 430×932 «Cucina ora» è interamente visibile sopra la barra delle schede senza scorrere.

Le altre schermate usano già gli stessi componenti e la stessa palette; non sono state rifatte (come richiesto). I prossimi passi naturali, con lo stesso linguaggio: intestazioni con l'icona in cerchio verde tenue come «La tua settimana», tessere colorate al posto delle liste nella Dispensa.

## Movimento (quarta richiesta)

Tutta l'app si muove come Mina: entrate morbide con un piccolo rimbalzo finale, schiacciamenti elastici, nessun movimento continuo che distrae. Con "Riduci movimento" (iOS) o `prefers-reduced-motion` (web) tutto compare subito al suo posto.

- **Comparsa a cascata in ogni pagina**: i blocchi entrano uno dopo l'altro (55 ms l'uno, al massimo 7), salgono di poco e si posano con il «back» dei gesti di Mina. È automatica in `Screen`, quindi vale per tutte le pagine e i fogli modali; Oggi, Benvenuto e il questionario hanno la loro regia.
- **Passi del questionario**: il passo nuovo scivola da destra andando avanti, da sinistra tornando indietro; la barra di avanzamento resta ferma.
- **Schede**: la pagina nuova scivola appena dal lato e si dissolve; l'icona della scheda toccata si riempie e fa un saltello.
- **Pagine nuove** (ricetta, impostazioni, prezzi…): lo scorrimento di iOS, anche su Android; la foto della ricetta si appoggia con un leggero zoom.
- **Settimana**: cambiando giorno i pasti e la nota di Mina arrivano dal lato giusto (giorno dopo da destra, prima da sinistra); Giorno ⇄ Settimana scivola dal lato della linguetta; le pastiglie dei giorni si schiacciano al tocco.
- **Ricettario**: le sezioni salgono a cascata e le prime card di ogni carosello entrano da destra; le card si schiacciano al tocco.
- **Spesa**: quando un prodotto va nel carrello la riga si disegna sopra il nome da sinistra a destra; le tessere «servono oggi» fanno un saltello.
- **Festeggiamento di Mina**: la card sboccia dal basso e, invece di sparire di colpo, scende e si dissolve.
- **Nuvoletta di Mina**: sboccia subito dopo di lei, come se fosse lei a parlare.
- **Foglio delle azioni**: il fondo si scurisce e il foglio sale dal basso.
- **Numeri** (porzioni, quantità): il numero nuovo arriva dal basso se cresce, dall'alto se cala.
- **Caricamento della Home**: i segnaposto respirano lentamente.

## Mina Alive V1 (quinta richiesta)

Mina non è un'immagine che scorre: è disegnata in SVG a parti separate (occhi, bocca, braccia con gomito, mani, gambe, corpo, manico, cappello, oggetti), ognuna con il suo perno, e recita legata agli eventi veri dell'app.

- **Intro nuova e breve** (~4,5 s, si salta con un tocco): il marchio si posa, una piccola Mina 2.0 entra e saluta, «Ciao, sono Mina!» si compone parola per parola, poi resta la schermata vera. Solo al primo avvio o da Impostazioni → «Rivedi l'animazione iniziale»: chi è già registrato apre l'app subito, senza seconde schermate di caricamento.
- **«MinaAnimated»**: componente unico per la recitazione a stati (`idle`, `hello`, `happy`, `thinking`, `concerned`, `pointing`, `cooking`, `success`, `celebrate`, `goodbye`), con variante standard/chef, espressione, dimensione, evento da rappresentare e callback di fine. Un solo gesto per evento; allo smontaggio le animazioni si interrompono.
- **Nuovi gesti**: `concerned` (si inclina, si preoccupa, indica l'avviso, si ricompone), `pointing` (indica un contenuto), `goodbye`; e l'**occhiata** (`glance`): gli occhi seguono per un momento quello che succede accanto.
- **Interazioni contestuali**: in Home, finito il saluto, Mina dà un'occhiata al pasto di oggi; in Spesa segue con lo sguardo ogni spunta e festeggia a lista completata; in Dispensa reagisce a «Potrebbe non bastare» (una sola volta per avviso, mai a ogni render) e **sorride quando l'ultimo avviso viene risolto**; in Settimana dà un'occhiata al giorno scelto; in Ricette Mina Chef rifà il suo ingresso a ogni apertura della scheda; nella ricetta di oggi incoraggia all'inizio della preparazione («Ai fornelli!»); nel questionario le reazioni alle scelte rianimano il gesto.
- **Sistema di animazione**: valutate Reanimated e Rive; scelta la `Animated` di React Native già in uso (driver nativo, zero dipendenze nuove, identica su iOS, Android e web). Il rig 2D è il disegno stesso a livelli: non servono asset esterni.
- **Mina Chef più snella**, come la prima fila del foglio: contorni più fini, braccia, gambe e piedini ridotti (confronto aggiornato in `mina2_confronto_chef.jpg`).

## Animation & UI polish V2 (sesta richiesta)

Correzioni sull'app vera, senza rifare le schermate e senza cambiare funzioni. Video e prove in `v2/`.

- **Intro «la goccia che diventa Spesora»** (~2,9 s, primo avvio o da Impostazioni): la goccia cade accelerando, tocca terra, si schiaccia e rimbalza con un'increspatura; un cerchio verde perfettamente circolare riempie lo schermo e diventa la maschera che rivela la composizione; il marchio sboccia, la scritta esce da dietro, una foglia lo completa; Mina 2.0 esce dal basso (manico, poi borsa), apre gli occhi, sorride e saluta; logo e Mina volano al loro posto nel Benvenuto e l'intro si dissolve senza tagli. Si salta con un tocco; in background finisce subito; con "Riduci movimento" o screen reader non c'è.
- **Braccia mai «smontate»**: curva unica spalla → gomito → polso, mano agganciata al polso, traiettorie esterne al viso, gomito che guida la piega. 8 gesti di prova (saluto destro e sinistro, indicare, sollevare, soddisfazione, mescolare, salto, pensierosa) controllati a velocità normale e rallentati ×3.
- **Espressioni vive**: sopracciglia (preoccupate, alzate, morbide, pensierose), occhi che cambiano dentro un battito di ciglia, sguardo che segue i gesti.
- **Trasformazione in Mina Chef** a livelli e maschere: guarda in alto, un anello verde la circonda e sale trasformandola, il cappello scende dall'alto, il grembiule si rivela dall'alto in basso, il cucchiaio arriva nella mano, posa da chef, occhiolino e sorriso. Una volta per sessione, entrando in Ricette.
- **Reazioni legate ai dati** (regia comune con priorità e senza ripetizioni): Home (ingredienti mancanti per il pasto di oggi), Settimana (pasto programmato), Spesa (festa a lista completata con elementi grafici), Dispensa (avviso, ingrediente sistemato, tutto sistemato), Preparazione (timer, «Tempo!», «Ho cucinato»).
- **Niente schermate vuote**: schede precaricate quando Home è ferma, Ricette più leggera (miniature nei caroselli). Nel video nuovo il cambio di scheda mostra subito il contenuto.
- **Pagine più leggibili**: giorno scelto evidenziato da una forma che scivola; quantità in evidenza in Spesa e Dispensa; stato della dispensa come icona (con legenda) invece dell'etichetta ripetuta; filtri rapidi in Ricette; Mina Chef della preparazione nella riga del timer, mai sopra il testo.

## Test eseguiti

| Controllo | Esito |
| --- | --- |
| `npm run verify` (tipi, linter, 157 test, catalogo, immagini, stringhe, sorgenti, configurazione), ripetuto dopo la V2 | **Tutti superati** (7 avvisi di configurazione già noti: URL legali, bundle id, progetto EAS, abbonamenti non attivi) |
| V2 — nuovi test: regia di Mina (priorità, ripetizioni, interruzioni, azzeramento) | 6/6 |
| V2 — nuovi test della mascotte: braccio collegato (parte dalla spalla, passa dal gomito, mano sul polso) in 32 configurazioni; nessun braccio davanti al viso in tutte le 27 pose; sopracciglia; grembiule come livello separato | 12/12 nel file `mina2.test.ts` |
| V2 — intro registrata dal primo avvio reale (`v2/intro_reale.mp4`, fotogrammi in `v2/intro_fotogrammi.jpg`) | Goccia, impatto, increspature, cerchio, maschera, logo con foglia, Mina che esce e saluta, arrivo esatto su logo e Mina del Benvenuto |
| V2 — gesti delle braccia a velocità normale e ×3 (`v2/mina_braccia.mp4`), esaminati fotogramma per fotogramma | Braccia sempre attaccate; corretti dopo l'esame: sopracciglia «pensierosa» (sembravano arrabbiate), braccio che indica (ora quasi disteso), pugno di soddisfazione (più lontano dal viso) |
| V2 — navigazione completa (`record-v2.cjs`, `v2/navigazione_completa.mp4`) | Tutte le reazioni compaiono al momento giusto; lista 16/16 con festa; dispensa corretta con sorriso; timer → «Tempo!» → «Ho cucinato»; cambio di scheda senza fondo vuoto |
| Nuovi test: Mina 2.0 (SVG validi, nessun colore della vecchia Mina, Chef solo in cucina, cinematica delle braccia, nessuna immagine di rete) | 6/6 |
| Nuovi test: contrasto WCAG AA della palette (11 coppie testo/fondo + etichette dei pasti) | 12/12 |
| Nuovo test: avviso di fine settimana con data in italiano | 1/1 |
| Giro completo della demo web (intro → benvenuto → 16 passi del questionario → anteprima → Oggi → Ricetta → Settimana → Ricette → Spesa → lista completata → Dispensa → Impostazioni → Notifiche → Plus, Prezzi, Storico, Aggiungi, Privacy), ripetuto dopo la Home V3 | 22 schermate, **0 errori JavaScript** |
| Home V3 su 375×667, 390×844, 430×932 | «Cucina ora» visibile sopra la barra senza scorrere; titoli su due righe senza tagli; scorrimento fino a settimana e tessere |
| Stesso giro a 375×667 (iPhone SE), 390×844 e 430×932 (iPhone Pro Max) | Nessun testo tagliato o elemento sovrapposto trovato a vista |
| Movimento: giro registrato nella demo web (`record-motion.cjs`) e giro completo delle 22 schermate a fine animazione | Animazioni come da elenco sopra; impaginazione delle 22 schermate identica a prima; 0 errori JavaScript |
| «Mina Alive»: demo completa registrata (`record-alive.cjs`, 14 passi del brief) | Intro, onboarding con reazioni, saluto + occhiata in Home, Settimana, spunte e festa in Spesa, reazione e correzione in Dispensa, ingresso di Mina Chef, apertura ricetta, «Ai fornelli!», «Ho cucinato» con festa; 0 errori JavaScript |
| Scena di risoluzione della Dispensa: script dedicato che sistema tutte le scorte scarse | Compare «Ora ci siamo» con Mina felice (`dispensa_risolta.png`) |
| "Riduci movimento" emulato nel browser | Il passo nuovo del questionario è al suo posto dopo 60 ms, senza scorrimento |
| Persistenza: dopo il questionario si ricarica la pagina (Impostazioni, Notifiche, Plus…) | Profilo e piano restano (database locale invariato) |
| Navigazione: schede, ricetta e ritorno, rotte modali e secondarie | Funzionano |
| Animazioni di Mina (fotogrammi del video e della pagina `/mina`) | Livelli allineati, braccia attaccate al corpo, espressioni cambiate dentro il battito di ciglia |
| Dati utente e logica | Nessuna modifica al database, alle migrazioni o ai motori (pianificazione, spesa, dispensa, notifiche) |

Per ripetere le prove:

```bash
npm run verify
npx expo export -p web --output-dir /tmp/spesora-web
node scripts/screenshots/capture.cjs http://localhost:PORTA/ cartella-out [larghezza] [altezza]
node scripts/screenshots/record-mina.cjs http://localhost:PORTA cartella-out/mina.mp4
```

(La cartella esportata va servita con un server statico che rimanda a `index.html` le rotte sconosciute.)

## Limiti

- **Nessuna prova su iPhone o Android reali**: in questo ambiente cloud non ci sono simulatori né Expo Go. Tutte le prove visive sono sulla demo web (Chromium). Le animazioni di Mina su iOS/Android usano il driver nativo e lo stesso codice, ma vanno guardate su un dispositivo prima del rilascio (in particolare fluidità con più Mina sullo schermo).
- **Notifiche**: sul web non esistono, quindi sono verificate solo dai test automatici (calcolo, testi, orari, fasce di silenzio). Permessi e consegna vanno provati su iPhone.
- **"Riduci movimento"** verificato nel codice (ogni animazione lo controlla) ma non attivato in un browser durante le catture.
- **Mina 2.0 e Mina Chef sono ricalcate sui loro fogli** (proporzioni, verdure, viso, mani, colori: vedi «Fedeltà al riferimento» in `docs/MASCOT.md`), ma restano disegni vettoriali: niente grana da acquerello. Mina Chef è lo stesso personaggio in tutte le pose (nel foglio le proporzioni variano un poco da una posa all'altra). La posa con il carrello del primo foglio non è stata realizzata (non serve in nessuna schermata attuale).
- Le nuove pose di Mina Chef (`mixing`, `serving`, `checklist`) sono pronte nel codice, nella vetrina `/mina` e nei PNG per i video, ma non sono ancora usate in una schermata: dove metterle è una scelta da fare.
- Restano dello stile precedente due elementi neutri: le illustrazioni degli ingredienti (caricamento, benvenuto, icone dei reparti) e l'onda verde dell'animazione iniziale. Sono coerenti con la palette ma hanno ancora il contorno scuro.
- La pagina `/mina` (vetrina delle animazioni) esiste solo nella demo web; su telefono rimanda all'app.
- **Transizioni tra pagine**: lo scorrimento di iOS tra le pagine è nativo e sul web non esiste; nel video si vedono solo comparse, schede e micro-animazioni. Va guardato su iPhone e Android.
- **Schermate vuote**: risolte per il cambio di scheda (precaricamento). Restano ~0,3–0,4 s di fondo vuoto all'apertura di una pagina nuova (ricetta, finestra della dispensa) nella demo web, che non ha l'animazione di scorrimento di iOS: su telefono la pagina entra scorrendo. Se si tocca una scheda prima che sia precaricata (entro ~2–4 s dall'avvio), il primo ingresso può ancora mostrare il montaggio.
- **Prestazioni su telefoni lenti da verificare**: le braccia di Mina sono ridisegnate in JavaScript durante i gesti (il resto del corpo è sul driver nativo); il precaricamento delle schede occupa il thread di JavaScript per qualche centinaio di millisecondi in sottofondo, a thread libero. Va misurato su un Android economico prima del rilascio.
- **Accessibilità sul web**: react-native-web ignora `accessibilityState` (es. «aperto/chiuso» dei reparti della spesa); su iOS e Android funziona. Passare alle proprietà `aria-*` è un lavoro a parte, su tutta l'app.
- La trasformazione in Mina Chef dell'intestazione di Ricette è piccola (72 punti): si legge, ma il dettaglio si vede meglio nella vetrina `/mina?posa=trasformazione`.
- I 7 avvisi di configurazione di `npm run verify` (URL legali, bundle id, EAS, RevenueCat) sono precedenti al restyling e restano da completare per la pubblicazione.
