# Mina 2.0, la mascotte di Spesora

Mina 2.0 è **la borsetta della spesa** di Spesora. Sostituisce la vecchia Mina «ricettario vivente» (il libro), che non va più usata in nessun nuovo asset.

Riferimento approvato: `docs/restyling/riferimenti/mina2_foglio_approvato.webp`. Tavola delle pose e delle espressioni: `docs/restyling/mina2_tavola.png`.

## Com'è fatta (non cambiare)

- Borsa in 2D vista di tre quarti, **corpo avorio** compatto e arrotondato, con il fianco sinistro e la piega color sabbia.
- **Grande manico verde ad arco**.
- Dall'apertura spuntano **pane, pomodoro, carota con le foglie e lattuga**.
- Viso semplice: **occhi scuri ovali (senza riflessi), guance rosa, sorriso aperto**.
- **Braccia verdi** corte con mani a guanto (tre dita e pollice), **piccoli piedi verdi**.
- **Fogliolina** verde chiaro senza contorno, con una venatura bianca curva, sul davanti.
- Contorno verde scuro (`#1E4A34`), stile cartoon pulito.
- Personalità femminile, dolce, simpatica ed espressiva.

**Non è un libro**: niente pagine, segnalibri, dorsi o copertine.

### Mina Chef

È Mina vestita da cuoca, disegnata dal suo foglio (`docs/restyling/riferimenti/mina_chef_style_reference.png`): **cappello da chef bianco** a nuvola, **borsa più alta e inclinata** con il fianco sinistro caldo, **grembiule verde** sul terzo basso (foglia bianca al centro, fiocco sul fianco), viso più piccolo, braccia e gambe corte. Si usa **solo** per ricette, preparazione e consigli di cucina. Un test (`src/test/mina2.test.ts`) verifica che cappello e grembiule compaiano soltanto nelle pose di Mina Chef.

Le quattro pose del foglio, ricalcate misura per misura (confronto: `docs/restyling/mina2_confronto_chef.jpg`):

| Posa | Nel foglio |
| --- | --- |
| `cooking` (e `recipe` senza occhiolino) | grande cucchiaio di legno alzato, occhiolino a «<», sorriso aperto, la sinistra a pugno sul fiocco, tre tratti gialli |
| `mixing` | occhi felici ^ ^, sorriso chiuso, ciotola verde chiaro con la zuppa, frusta d'acciaio tenuta col manico in su |
| `serving` | cloche d'argento sul vassoio tenuta in alto da sotto, vapore verde che sale, sorriso aperto |
| `checklist` | cartellina verde con tre spunte, tenuta dal bordo destro, sorriso chiuso, tre tratti gialli sopra |

## Fedeltà al riferimento

Il disegno è ricalcato sul foglio approvato, misura per misura (confronto affiancato: `docs/restyling/mina2_confronto_riferimento.jpg`):

- **borsa vista di tre quarti**, più larga che alta, con il **fianco sinistro** visibile e la **piega marrone** tra fianco e fronte; leggera inclinazione di tutto il corpo (−3°, −6° e a passo nel saluto, come nel disegno principale);
- **manico** ad arco alto e stretto, tubo verde con contorno scuro;
- verdure come nel foglio: **filone di pane** inclinato a sinistra, **foglie scure** dietro al pane, **lattuga riccia** che esce dall'angolo in alto a sinistra, **pomodoro** arancio-rosso grande con il calice a stella, mezzo dentro la borsa, **carota** con il **ciuffo riccio** verde chiaro, un piccolo frutto rosso dietro al pane;
- **viso al centro del fronte** (a destra della piega): occhi ovali scuri **senza riflessi**, bocca aperta con lingua, guance rosa;
- **foglia** verde chiaro **senza contorno**, con una sola venatura bianca curva che esce come picciolo;
- **braccia e gambe corte e spesse**, **mani a guanto con tre dita e pollice** (a pugno quando tengono un oggetto), scarponcini arrotondati;
- **ombra a terra verde chiaro**;
- Mina Chef ha **uno scheletro proprio** (`RIG.chef` in `art.ts`), ricalcato sul suo foglio: borsa alta inclinata di circa −11° con il bordo superiore leggermente arcuato e il fianco sinistro giallo caldo; **cappello** a nuvola di tre lobi con l'ombra grigio-azzurra in basso e una **fascia curva** che poggia sull'apertura; sotto la fascia l'**arco verde del manico** con l'interno scuro e un **frutto arancio**, a destra un **limone**, a sinistra la **lattuga a lobi** e un pezzetto di carota; **grembiule** verde sul terzo basso con la foglia bianca e il **fiocco** sul bordo sinistro (si vede solo dove il braccio non lo copre, come nel foglio); occhi più piccoli (il destro un po' più piccolo, la borsa è di tre quarti), sorriso chiuso marrone scuro nelle pose `mixing` e `checklist`; braccia e gambe corte, mani a guanto.
- Le pose del foglio sono un po' inclinate e con le braccia di lunghezza diversa: l'inclinazione (`lean`) per Mina Chef ruota attorno al centro della borsa, le braccia possono avere lunghezze proprie (`ArmPose.len`) e le pose con oggetti larghi si spostano a sinistra per restare nel riquadro (`shift`).

Differenze che restano, volute: il foglio ha una grana da acquerello che un disegno vettoriale per l'app non riproduce (colori pieni con una leggera sfumatura sul fronte); nel foglio di Mina Chef le proporzioni cambiano un poco da una posa all'altra (per esempio il viso più largo nella posa che mescola): nell'app Mina Chef è sempre lo stesso personaggio, con la stessa borsa in tutte le pose.

## Dove vive nel codice

| File | Contenuto |
| --- | --- |
| `src/ui/mascot/mina2/art.ts` | Il disegno, in SVG puro, diviso in parti: ombra, gambe, corpo (lattuga, manico, verdure, pannello, foglia o grembiule, guance), cappello, occhi, bocca, braccio e avambraccio (contorno e riempimento separati, così il gomito non lascia giunture), oggetti in mano (cucchiaio, telefono, lista, cartellina, ciotola con frusta, cloche), segni (punto di domanda, scintille, tratti gialli, cuore). Uno scheletro per variante (`RIG`): spalle, lunghezze delle braccia, perni. |
| `src/ui/mascot/mina2/poses.ts` | Le 23 pose: aspetto finale (occhi, bocca, braccia, segno) e gesto animato. Le braccia si descrivono con la posizione della mano (cinematica inversa `armTo`); quelle di Mina Chef con il punto misurato sul suo foglio (`chefAt`). |
| `src/ui/mascot/mina2/Mina2.tsx` | Il componente: statico (un solo SVG) o animato a livelli. |
| `src/ui/mascot/Mina.tsx` | `MinaMascot` e `MinaBadge`: l'interfaccia usata dalle schermate (stessi nomi di prima). |
| `src/ui/mascot/MinaAnimated.tsx` | «MinaAnimated»: l'ingresso per la recitazione a stati (`idle`, `hello`, `happy`, `thinking`, `concerned`, `pointing`, `cooking`, `success`, `celebrate`, `goodbye`), con variante (`standard`/`chef`), espressione, dimensione, evento da rappresentare (`event`), occhiata (`glance`) e callback di fine gesto (`onDone`). La mappa stato → posa è in `mina2/states.ts` (pura, coperta dai test). |

Tutto è vettoriale e locale: niente immagini raster nell'app, niente rete.

## Pose

`neutral`, `welcome`, `wave`, `explaining`, `thinking`, `calendar` (telefono), `shopping` (lista), `cooking`, `recipe`, `mixing`, `serving` e `checklist` (Mina Chef), `pantry`, `missing`, `savings`, `happy`, `success`, `sleepy`, `empty`, `reminder`, `concerned` (vede un problema), `pointing` (indica un contenuto), `goodbye` (saluta andando via). I vecchi nomi italiani (`saluto`, `spesa`, `promemoria`…) sono ancora risolti.

## Espressioni

Occhi: `open`, `happy` (^ ^), `closed`, `wink`, `laugh` (> <), `star`, `heart`, `surprised`. Bocca: `smile`, `grin`, `small`, `o`, `hmm`.

## Animazioni

Ogni parte ruota attorno al proprio perno: spalla, gomito, base del cappello, centro degli occhi, piedi. Le braccia partono sempre dal corpo, il gomito arriva un po' dopo la spalla (sovrapposizione), gli occhi cambiano espressione **dentro un battito di ciglia** (nessun salto visibile).

| Gesto | Cosa fa |
| --- | --- |
| Saluto (`welcome`, `wave`) | Compare, sorride, alza la mano e saluta con due oscillazioni dal gomito, poi la riabbassa. |
| Idle | Respiro appena percettibile (schiacciamento dell'1,8%), battiti di ciglia a intervalli irregolari, uno sguardo di lato. |
| Felice (`happy`, `savings`) | Chiude gli occhi felici, braccia in alto, salto con anticipo, schiacciamento all'atterraggio e ritorno elastico. |
| Pensierosa (`thinking`, `empty`) | Guarda in alto, porta la mano al viso, inclina il corpo; compare il punto di domanda. |
| Lista completata (`success`) | Braccia in alto, salto più alto, pugno di vittoria, scintille. |
| Ricetta (`recipe`, `cooking`) | Mina Chef alza il cucchiaio con un piccolo svolazzo; il cappello oscilla; in `cooking` strizza l'occhio e compaiono i tratti gialli. |
| Presenta (`mixing`, `serving`, `checklist`) | Mina Chef tiene fermo l'oggetto grande (ciotola, cloche, cartellina): si piega appena, fa un saltello, il cappello ondeggia, compaiono i segni. |
| Promemoria (`reminder`) | Si sporge, alza la mano, due piccoli rimbalzi, poi torna a riposo. |
| Preoccupata (`concerned`) | Vede l'avviso: si inclina verso di lui, lo sguardo lo segue, la bocca si fa dubbiosa, lo indica con la mano, poi si ricompone. Parte solo quando l'avviso compare o cambia, mai a ogni render. |
| Indica (`pointing`) | Il braccio si distende verso il contenuto con un rimbalzo, lo sguardo lo segue, poi torna composta (il braccio resta a indicare). |
| Occhiata (`glance`) | Non è un gesto ma una reazione: quando la prop `glance` cambia (una spunta nella lista, un giorno scelto), gli occhi guardano un momento il contenuto e tornano. |
| Tocco (`interactive`) | Un saltello felice, poi torna alla posa di partenza (Mina Chef con un oggetto in mano non alza le braccia). |

Regole tecniche:

- driver nativo su iPhone e Android (thread dell'interfaccia, nessun lavoro JavaScript per fotogramma);
- con **"Riduci movimento"** (iOS) o `prefers-reduced-motion` (web) Mina resta ferma nella posa finale, disegnata come un solo SVG;
- il gesto si esegue una volta; l'idle solo dove richiesto (`idle`), e si ferma quando l'app va in background;
- le Mina piccole e quelle nelle righe sono statiche (un solo SVG): niente costo inutile.

Anteprima: nella demo web, la pagina `/mina` (non collegata dall'app, solo web) mostra tutti i gesti; `/mina?posa=welcome` ne mostra uno in grande. Video: `docs/restyling/mina2_animazioni.mp4`.

## Dove compare e perché

| Schermata | Mina | Ruolo |
| --- | --- | --- |
| Intro | `welcome` | Il marchio si posa, Mina entra, saluta e si compone «Ciao, sono Mina!»; solo al primo avvio o su richiesta |
| Benvenuto | `welcome` grande, viva, toccabile | Presenta Spesora |
| Questionario | per passo; reagisce alle scelte | Accompagna senza rallentare |
| Fine questionario | `success` grande | Festeggia «È pronta!» |
| Oggi | `welcome` (saluto) e, a gesto finito, un'occhiata al pasto di oggi; `success`, `thinking` | Saluto breve; giornata finita; ricette mancanti |
| Settimana | `calendar` / `success` | Riepilogo del giorno |
| Spesa | `shopping` con l'occhiata a ogni spunta; `success` a lista completata | Segue la spesa con lo sguardo; festeggia quando è tutto nel carrello |
| Ricette | Mina Chef nel titolo: a ogni apertura della scheda rifà l'ingresso (cucchiaio su, occhiolino) | Il mondo delle ricette |
| Ricetta | Mina Chef (`cooking`) per la preparazione della sera prima e per «Ai fornelli!» all'inizio della preparazione; `shopping` per gli ingredienti mancanti | Consigli brevi |
| Dispensa | `concerned` su «Potrebbe non bastare» (reazione una sola volta per avviso); `happy` quando l'ultimo avviso viene risolto; `thinking`, `empty` | Scorte, scadenze, stato vuoto |
| Festeggiamenti | `success` | Spesa registrata, pasto cucinato |

Regole: Mina non copre mai le informazioni principali, non parla di continuo, non è un chatbot. Reagisce a eventi già esistenti con regole deterministiche.

## Immagini per i video

`npm run mascot:export` rigenera la tavola (`docs/restyling/mina2_tavola.png`) e un PNG trasparente 1024 px per posa in `assets/mascot/mina2/` (non usati dall'app, solo per video e grafica). Sono lo stesso disegno del codice: nei video Blender va usata questa Mina, non la vecchia.
