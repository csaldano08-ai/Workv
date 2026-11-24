# 06 · Rapporto delle fasi 4–6 · blockout, storyboard, animatic, prove critiche

Come nella fase 2, i controlli automatici lavorano sulle mesh **valutate** (dopo armatura e modificatori), con `scripts/cs_qc.py`; dove l'automatico non basta c'è una verifica visiva, e il limite è dichiarato.

## 1 · Supermercato (blockout) · `scripts/cs_market.py`

Tutto è costruito da una sola tabella (`LAYOUT`), la stessa che disegna la pianta: 3D e pianta non possono divergere.

| Zona | Contenuto |
|---|---|
| Ingresso | Vano vero nel muro da 2,6 m, architrave, ante scorrevoli, zoccolino interrotto nel vano |
| Carrelli | 4 carrelli affiancati, non incastrati: contatti tra carrelli **0** |
| Ortofrutta | 3 tavoli con cassette e frutta, espositore CIPOLLE su ruote (spostato nella gag A) ed espositore PATATE |
| Corsie | 3 gondole (Pasta e riso, Conserve, Colazione), corsie da 1,68 m, scaffale a muro, prodotti appoggiati 0,5 mm sopra i ripiani |
| Casse | 3 casse con nastro, registratore, piano del cassiere, palo con numero; luce «cassa aperta» comandabile (gag B) |
| Ufficio | Muro con vano porta, telaio, anta a battente con cerniera, maniglie sui due lati, targa DIREZIONE, scrivania e sedia |
| Insegne | Reparti appesi con tiranti al soffitto, USCITA, CASSE, insegna del negozio |

Nome del negozio: **SUPER LAMPONE**, segnaposto inventato e sostituibile.

### Prove critiche sull'ambiente (test A, D, E del prompt)

| Prova | Esito misurato |
|---|---|
| Prodotti dentro gli scaffali (3 gondole + muro) | ✅ 0 vertici, 0 mm |
| Frutta dentro le cassette, cassette dentro i tavoli | ✅ 0 mm |
| Porta: rotazione 0→88° contro telaio, muro e architrave | ✅ nessun contatto (3 mm di gioco su ogni lato, 8 mm da terra) |
| Luce libera della porta dell'ufficio | 0,784 × 2,04 m |
| Luce libera dell'ingresso | 2,44 × 2,32 m |
| Zoccolini dentro i vani (ufficio, ingresso) | ✅ 0 vertici |
| Ante scorrevoli aperte dentro i muri | ✅ 0 mm |
| Z-fighting | corretto: montanti delle gondole 5 mm più sporgenti delle testate (prima: strisce nere); ✅ verifica visiva delle 6 viste |

Viste del blockout: `environments/supermercato/BLOCKOUT_*.jpg`; pianta con percorsi e camere: `environments/supermercato/PIANTA_set_EP01.png`; dati: `qc_supermercato.json`.

## 2 · Personaggi secondari · `CAST` in `scripts/cs_char.py`

Sei personaggi dallo stesso telaio del protagonista approvato, cambiando solo la specifica:

| Personaggio | Altezza | Caratteri distintivi |
|---|---|---|
| Protagonista | 1,82 m | giacca blu, maglietta pesca, ciuffo |
| Luca, dipendente | 1,69 m | polo rossa con grembiule, cartellino LUCA, capelli rossi corti, scarpe bianche |
| Anna, dipendente | non misurata (non è nella tavola) | variante di Luca: cartellino ANNA, caschetto, ciglia |
| Responsabile | 1,62 m | gilet e cravatta, capelli ai lati, occhiali |
| Direttore | 1,82 m | completo grigio, cravatta rossa, capelli grigi, baffi, pancia |
| Cliente con felpa | 1,76 m | felpa con cappuccio, biondo |
| Signora | 1,62 m | abito, crocchia, occhiali |

Controllo in posa di riposo, con braccia, mani e piedi per tutti: **0 mm** di compenetrazioni, suole a 2 mm dal pavimento (`characters/cast_ep01/qc_cast.json`).
Tavole: `characters/cast_ep01/CAST_fronte.jpg` e `CAST_tre_quarti.jpg`.

## 3 · Storyboard · `shots/storyboard/`

24 inquadrature più il marchio finale. I fotogrammi sono presi dall'animatic stesso, a circa il 60% di ogni inquadratura, quindi sono identici al video: posizioni, luci e proporzioni vengono dal blockout 3D, non da disegni.
La tavola `STORYBOARD_EP01.jpg` riporta per ogni inquadratura il numero, i tempi, la lente, la descrizione e la narrazione corrispondente.
La pianta `environments/supermercato/PIANTA_set_EP01.png` mostra il percorso del protagonista per scena e la posizione di ogni camera fissa.

## 4 · Animatic · `renders/animatic/`

- **Durata:** 95,0 s (93,6 s di storia + 1,4 s di marchio).
- **Formato:** verticale 1080×1920, 30 fps, audio AAC.
- **Rendering:**
  - Cycles a 432×768, 6 campioni con denoise, poi ingrandito;
  - **15 immagini al secondo**, ognuna tenuta per 2 fotogrammi (prassi da animatic);
  - il rendering definitivo della fase 7 sarà a 30 fps veri.
- **Audio:**
  - narrazione clonata (16 battute) ai tempi del copione;
  - ambiente ed effetti sintetizzati nel codice;
  - le 2 battute dei personaggi sono mute, scritte in giallo con la nota «voce da registrare».
- **Due versioni:**
  - `EP01_animatic.mp4` ha etichetta d'inquadratura, tempo e sottotitoli;
  - `EP01_animatic_senza_etichette.mp4` ha solo i sottotitoli.

### Sistema degli attori · `scripts/cs_actor.py`

Ogni personaggio ha una linea temporale riutilizzabile negli altri episodi:
- **soste**, con respiro;
- **giri sul posto** a piedi bloccati, un piede alla volta, che partono sempre dalla direzione reale del corpo;
- **camminate a impronte**, precedute in automatico da un giro verso la meta quando serve;
- **pose della parte alta** con transizioni morbide, anche calcolate a ogni fotogramma (mano sulla maniglia che segue l'anta, telefono girato verso la testa di Luca);
- **volto**: espressioni, sguardo verso bersagli reali, battiti irregolari, labiale.

Se un movimento parte prima che il precedente sia finito, non si sovrappone: viene spostato e registrato. In tutto l'episodio ne resta uno, il protagonista che si gira a 44,45 s invece che a 44,3 s.

### Controlli fotogramma per fotogramma (test A–F del prompt)

La modalità `ADS_MODE=qc` di `scripts/ep01_animatic.py` ricostruisce ogni fotogramma renderizzato, senza fare il render, e misura le mesh valutate.
Copertura: **1404 fotogrammi**, cioè tutti quelli dell'animatic. Dati in `renders/animatic/qc/qc_completo_*.json`: per ogni voce e inquadratura c'è il valore massimo, e c'è l'elenco dei fotogrammi con problemi.

| Test | Cosa misura | Risultato finale |
|---|---|---|
| A · Intersezioni | braccia e mani nel busto (escluso l'attacco alla spalla), busto nell'ambiente (muri, scaffali, tavoli, casse, arredo, porta), mano nel telefono, personaggi tra loro, per ogni personaggio in scena | ✅ **0 mm** in tutti i 1404 fotogrammi |
| B · Oggetti in movimento | telefono dentro testa, busto e altra mano; le due cartelline dentro tutti i busti; carrello dentro l'ambiente e dentro gambe e busto del protagonista; espositore spinto dentro l'ambiente e dentro i busti | ✅ **0 mm** |
| C · Camminata | scivolamento del piede in appoggio, piedi sotto il pavimento, entrambi i piedi sollevati, gambe che si attraversano | ✅ scivolamento max **0,87 mm** (soglia 1 mm), suole sempre a 2 mm dal pavimento, gambe mai a contatto |
| D · Porte e passaggi | busto, braccia, mani e gambe del protagonista contro anta, telaio e muro, mentre apre e attraversa la porta | ✅ **0 mm**; luce libera 0,98 m; rotazione dell'anta 0–88° senza contatti |
| E · Rendering (geometria) | camera dentro o troppo vicina ai personaggi (piano di taglio a 5 cm) | ✅ distanza minima **80 mm**, nei dettagli del telefono |
| F · Telefono | dita davanti allo schermo; nella scena in cui mostra la lista, schermo rivolto verso Luca | ✅ **0 vertici** della mano davanti allo schermo; schermo verso Luca con scarto massimo di 29°, solo durante la rotazione di ritorno |
| G · Espressioni | — | verifica visiva (vedi sotto) |

Gomiti: 57 pose risolte in anticipo, tutte a **0 mm** di compenetrazione.

### Problemi trovati e corretti (in ordine)

I controlli su fotogrammi singoli (storyboard) non bastavano: il controllo fotogramma per fotogramma ha trovato 47 problemi che le immagini fisse non mostravano.

| # | Dove | Problema | Causa | Correzione | Verifica |
|---|---|---|---|---|---|
| 1 | Inq. 13 | Anna dentro il piano della cassa 2 (15,7 mm) | Meta sul piano laterale | Meta spostata a (5,4; 2,9) | ✅ 0 mm |
| 2 | Inq. 15–16 | Busti di Luca e del responsabile a contatto (20 mm) | Posizioni troppo vicine | Responsabile spostato | ✅ 0 mm |
| 3 | Inq. 01, 04, 21 | Dettaglio del telefono tutto nero | Camera sulla normale dello schermo finita dentro la testa china sul telefono | La camera ruota attorno al telefono del minimo angolo che la lascia a 8 cm da testa e capelli (verifica sulla mesh); rollio allineato al telefono | ✅ lista dritta e leggibile; camera ≥ 80 mm |
| 4 | Tutte | Sguardi verso telefono, cartelline e camera in ritardo di un fotogramma; scatto al primo fotogramma dopo uno stacco | Oggetti e camera posizionati dopo i personaggi | Valutazione in due passaggi per fotogramma | ✅ |
| 5 | Primi piani | Espressioni ferme, per esempio «esasperato» reso come neutro | Con i dati persistenti Cycles non ricaricava la texture del volto | Un file del volto per fotogramma | ✅ visiva |
| 6 | Inq. 13–16 | Teste bianche tinte di verde | Luce «cassa aperta» verde satura da 40 W | Tinta leggera, 14 W | ✅ visiva |
| 7 | Inq. 07, 15, 16 | Teste in primo piano che coprivano l'azione | Camere troppo vicine | Camere spostate (ricerca automatica di posizioni libere) | ✅ visiva |
| 8 | Inq. 08 | Camera a 1 cm dai prodotti | Camera dentro la testata della gondola | Camera spostata | ✅ |
| 9 | Inq. 13–14 | Il responsabile spariva per 7 s e tornava all'espositore | Una sosta non cancellava la sosta automatica di fine camminata già prevista | `hold()` cancella i movimenti successivi | ✅ |
| 10 | 5 camminate | Piedi che «saltavano» di 5–17 cm alla partenza | La camminata partiva già girata verso la meta | Giro automatico a piedi bloccati prima di partire | ✅ scivolamento ≤ 0,87 mm |
| 11 | Inq. 09 | Piede scivolato di 10 mm all'inizio di un giro | Angolo di partenza scritto a mano (72°) diverso da quello reale (77°) | I giri partono dalla direzione reale | ✅ |
| 12 | Inq. 06–07 | Dita davanti allo schermo (642 vertici) e mano nel telefono (5,5 mm) | Telefono capovolto nella mano per «mostrarlo» | Niente capovolgimento: la mano ruota, calcolata perché lo schermo punti alla testa di Luca, in due tempi | ✅ 0 vertici, 0 mm, schermo verso Luca |
| 13 | Inq. 08–09 | La cartellina di Luca attraversava il protagonista mentre Luca si girava (30 mm) | Cartellina tenuta di lato durante il giro | Luca un po' più distante, cartellina davanti a sé mentre gira | ✅ 0 mm |
| 14 | Inq. 13 | Cliente con la felpa dentro la signora (17,6 mm) | Percorso troppo vicino | Percorso più a destra, lontano anche dal banco della cassa 2 | ✅ 0 mm |
| 15 | Inq. 15–16 | La cartellina di Luca nel busto del responsabile (60 mm) | Responsabile dal lato della cartellina | Responsabile più a sinistra, poi si gira verso il protagonista | ✅ 0 mm |
| 16 | Inq. 12, 15 | Braccia del responsabile nel busto (1–2,3 mm) | Braccia della camminata troppo strette per il suo busto | Braccia più aperte; gomiti espliciti nella spinta | ✅ 0 mm |
| 17 | Inq. 17 | Mano destra nell'anta (20 mm) e mano sinistra nel telefono (17 mm) aprendo la porta | Mano a 5 mm dall'anta; la sinistra tornava alla posa di riposo | Palmo sopra la leva, a 10 cm dall'anta, dopo la fine del giro; la sinistra tiene il telefono; gomiti risolti anche per le pose calcolate | ✅ 0 mm |
| 18 | Inq. 17 | Braccio nel busto (26 mm) lasciando la maniglia | Transizione diretta dalla leva al davanti del corpo | Posa intermedia: la mano esce di lato | ✅ 0 mm |
| 19 | Inq. 18 | Braccio sinistro nell'anta aperta (20 mm) entrando nell'ufficio | Porta da 0,78 m per un personaggio largo 0,70 m con le braccia | Porta da 0,98 m; gomiti raccolti nel passaggio | ✅ 0 mm |
| 20 | Porta | Quadratini scuri agli angoli del telaio | Facce frontali di traverso e montanti complanari (z-fighting) | Traverso 2 mm più profondo per lato | ✅ visiva |

### Test G · espressioni (verifica visiva)

Nei primi piani, a partire dalla correzione 5, il volto segue la linea temporale:
- sorpresa e imbarazzo nella scena con Luca;
- «Il problema?» guardando in camera;
- panico nell'inquadratura 16;
- bocca a «o» nella 20;
- confuso mentre parla nella 22;
- esasperato nel finale.

Lo sguardo segue i bersagli reali (telefono, Luca, porta, direttore, camera) e i battiti sono irregolari.

Limite dichiarato: il labiale è generico e va rifatto sulle voci registrate.

### Test E · rendering (immagini)

_(misure dello sfarfallio sui fotogrammi renderizzati: completate a fine rendering)_
