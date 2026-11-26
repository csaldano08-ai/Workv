# Mina 2.0, la mascotte di Spesora

Mina 2.0 è **la borsetta della spesa** di Spesora. Sostituisce la vecchia Mina «ricettario vivente» (il libro), che non va più usata in nessun nuovo asset.

Riferimento approvato: `docs/restyling/riferimenti/mina2_foglio_approvato.webp`. Tavola delle pose e delle espressioni: `docs/restyling/mina2_tavola.png`.

## Com'è fatta (non cambiare)

- Borsa in 2D, **corpo avorio** compatto e arrotondato, con la piega laterale color sabbia.
- **Grande manico verde ad arco**.
- Dall'apertura spuntano **pane, pomodoro, carota con le foglie e lattuga**.
- Viso semplice: **occhi neri ovali con due riflessi, guance rosa, sorriso**.
- **Braccia verdi** con mani a manopola, **piccoli piedi verdi**.
- **Fogliolina** verde chiaro con nervature bianche sul davanti.
- Contorno verde scuro (`#1E4A34`), stile cartoon pulito.
- Personalità femminile, dolce, simpatica ed espressiva.

**Non è un libro**: niente pagine, segnalibri, dorsi o copertine.

### Mina Chef

È la stessa Mina con **cappello da chef bianco, grembiule verde** (con la foglia bianca e il fiocco sul fianco) e **cucchiaio di legno**. Si usa **solo** per ricette, preparazione e consigli di cucina. Un test (`src/test/mina2.test.ts`) verifica che cappello e grembiule compaiano soltanto nelle pose `cooking` e `recipe`.

## Dove vive nel codice

| File | Contenuto |
| --- | --- |
| `src/ui/mascot/mina2/art.ts` | Il disegno, in SVG puro, diviso in parti: ombra, gambe, corpo (lattuga, manico, verdure, pannello, foglia o grembiule, guance), cappello, occhi, bocca, braccio e avambraccio (contorno e riempimento separati, così il gomito non lascia giunture), oggetti in mano (cucchiaio, telefono, lista, cartellina), segni (punto di domanda, scintille, cuore). |
| `src/ui/mascot/mina2/poses.ts` | Le 17 pose: aspetto finale (occhi, bocca, braccia, segno) e gesto animato. Le braccia si descrivono con la posizione della mano (cinematica inversa `armTo`). |
| `src/ui/mascot/mina2/Mina2.tsx` | Il componente: statico (un solo SVG) o animato a livelli. |
| `src/ui/mascot/Mina.tsx` | `MinaMascot` e `MinaBadge`: l'interfaccia usata dalle schermate (stessi nomi di prima). |

Tutto è vettoriale e locale: niente immagini raster nell'app, niente rete.

## Pose

`neutral`, `welcome`, `wave`, `explaining`, `thinking`, `calendar` (telefono), `shopping` (lista), `cooking` e `recipe` (Mina Chef), `pantry`, `missing`, `savings`, `happy`, `success`, `sleepy`, `empty`, `reminder`. I vecchi nomi italiani (`saluto`, `spesa`, `promemoria`…) sono ancora risolti.

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
| Ricetta (`recipe`, `cooking`) | Mina Chef alza il cucchiaio con un piccolo svolazzo; il cappello oscilla; in `cooking` strizza l'occhio. |
| Promemoria (`reminder`) | Si sporge, alza la mano, due piccoli rimbalzi, poi torna a riposo. |
| Tocco (`interactive`) | Un saltello felice, poi torna alla posa di partenza. |

Regole tecniche:

- driver nativo su iPhone e Android (thread dell'interfaccia, nessun lavoro JavaScript per fotogramma);
- con **"Riduci movimento"** (iOS) o `prefers-reduced-motion` (web) Mina resta ferma nella posa finale, disegnata come un solo SVG;
- il gesto si esegue una volta; l'idle solo dove richiesto (`idle`), e si ferma quando l'app va in background;
- le Mina piccole e quelle nelle righe sono statiche (un solo SVG): niente costo inutile.

Anteprima: nella demo web, la pagina `/mina` (non collegata dall'app, solo web) mostra tutti i gesti; `/mina?posa=welcome` ne mostra uno in grande. Video: `docs/restyling/mina2_animazioni.mp4`.

## Dove compare e perché

| Schermata | Mina | Ruolo |
| --- | --- | --- |
| Intro | `wave` | Compare sotto il logo e saluta |
| Benvenuto | `welcome` grande, viva, toccabile | Presenta Spesora |
| Questionario | per passo; reagisce alle scelte | Accompagna senza rallentare |
| Fine questionario | `success` grande | Festeggia «È pronta!» |
| Oggi | `welcome` (saluto), `success`, `thinking` | Saluto breve; giornata finita; ricette mancanti |
| Settimana | `calendar` / `success` | Riepilogo del giorno |
| Spesa | `shopping`; `success` a lista completata | Lista pronta; festeggia quando è tutto nel carrello |
| Ricette | Mina Chef piccola nel titolo | Il mondo delle ricette |
| Ricetta | Mina Chef (`cooking`) per la preparazione della sera prima; `shopping` per gli ingredienti mancanti | Consigli brevi |
| Dispensa | `missing`, `thinking`, `empty` | Scorte, scadenze, stato vuoto |
| Festeggiamenti | `success` | Spesa registrata, pasto cucinato |

Regole: Mina non copre mai le informazioni principali, non parla di continuo, non è un chatbot. Reagisce a eventi già esistenti con regole deterministiche.

## Immagini per i video

`npm run mascot:export` rigenera la tavola (`docs/restyling/mina2_tavola.png`) e un PNG trasparente 1024 px per posa in `assets/mascot/mina2/` (non usati dall'app, solo per video e grafica). Sono lo stesso disegno del codice: nei video Blender va usata questa Mina, non la vecchia.
