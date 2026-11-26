# Changelog tecnico — restyling Mina 2.0

## Seconda iterazione: Mina fedele al riferimento e Home V3

- `src/ui/mascot/mina2/art.ts` ridisegnato sulle misure del foglio: scatola di tre quarti con fianco e piega, manico alto, verdure ricce (`frilly`), viso sul fronte senza riflessi, foglia senza contorno, mani a guanto con dita (aperte o a pugno), braccia e gambe corte e spesse, ombra verde, gambe ferme o a passo (`legs`), inclinazione del corpo (`lean`), cappello da chef grande, cucchiaio grande con bordo marrone; colori campionati dal foglio. `poses.ts`: nuove posizioni delle mani, saluto a passo e inclinato. `Mina2.tsx`: perno del corpo tra i piedi, gambe e inclinazione per posa.
- `app/(tabs)/index.tsx` riscritto (Home V3): `Header`, `Greeting` (Mina che si affaccia sulla card, forma di sfondo), `TodayHero` (foto 16:9, «Ti mancano N ingredienti», «Cucina ora» + menu azioni, `FavoriteButton`), `EmptyHero`, `WeekSection` (tessere con foto del pasto), `QuickTiles` (spesa e dispensa), `HomeSkeleton`; modalità compatta per telefoni bassi. Stessi dati, servizi e azioni.
- **Nuovi** `scripts/screenshots/record-home.cjs` (video della Home); `capture.cjs` riconosce «Cucina ora».
- Test di Mina aggiornati (posizioni delle mani, riconoscimento del cappello).


## Mascotte

- **Nuovo** `src/ui/mascot/mina2/art.ts`: disegno di Mina 2.0 e Mina Chef in SVG puro, diviso in parti (ombra, gambe, corpo, cappello, occhi, bocca, braccio, avambraccio, oggetti, segni). 8 espressioni degli occhi, 5 della bocca, 4 oggetti in mano. Cinematica inversa a due segmenti (`armTo`) per descrivere le braccia con la posizione della mano.
- **Nuovo** `src/ui/mascot/mina2/poses.ts`: 17 pose (le 16 precedenti + `reminder`), ciascuna con aspetto finale e gesto; i vecchi nomi italiani restano validi.
- **Nuovo** `src/ui/mascot/mina2/Mina2.tsx`: componente statico (un solo SVG) o animato a livelli con perni propri; gesti con easing, sovrapposizione spalla/gomito, salto con anticipo e schiacciamento, cambio d'espressione dentro il battito di ciglia, idle nativo fermo in background, reazione al tocco; `MinaBadge` ritagliato sul viso.
- `src/ui/mascot/Mina.tsx`: stessa interfaccia (`MinaMascot`, `MinaBadge`) con le nuove opzioni `idle`, `interactive`, `replayKey`.
- **Rimossi**: `minaSvg.ts`, `minaRaster.ts`, `scripts/mascot/export-mascot.mjs`, `assets/mascot/mina/` (illustrazioni del ricettario), `docs/MINA_CONTACT_SHEET.png`, `docs/MINA_ASSET_HANDOFF.md`.
- **Nuovo** `scripts/mascot/sheet-mina2.ts` (`npm run mascot:export`): tavola e PNG trasparenti 1024 px in `assets/mascot/mina2/` per i video.

## Design system

- `src/theme/tokens.ts`: nuova palette (stessi nomi storici + `greenBright`, `greenDeep`, `greenMist`, `lineStrong`), `outline` chiaro, ombre `shadow.card` e `shadow.float`, raggi più morbidi, famiglie `font` Nunito, `mealInk` per le etichette dei pasti, durate `motion`.
- `assets/fonts/`: Nunito 400/600/700/800 (+ licenza OFL); rimosso Caveat. Caricamento in `app/_layout.tsx`.
- `src/ui/Text.tsx`: sceglie la famiglia Nunito dal peso (niente grassetti sintetici su iOS, Android e web).
- `src/ui/Button.tsx`, `Card.tsx`, `Chip.tsx`, `CheckBox.tsx`, `Notice.tsx`, `Stepper.tsx`, `Screen.tsx`, `RecipeImage.tsx`: superfici chiare, bordi delicati, pulsanti in leggero rilievo.
- `src/ui/notebook.tsx`: stessi componenti (`NotebookPage`, `StickyNote`, `HandLabel`, `TapedPhoto`, `PaperTabs`, `ProgressRing`) con aspetto moderno; `PaperTabs` diventa un controllo segmentato con selezione che scivola.
- **Nuovo** `src/ui/ProgressBar.tsx`: barra di avanzamento con molla.
- `src/ui/AssistantBubble.tsx`, `CelebrationHost.tsx`: nuvoletta verde tenue, festeggiamento su card bianca.
- Barra delle schede e intestazioni con Nunito, fondo bianco, bordo chiaro.

## Schermate

- `app/(tabs)/index.tsx` (Oggi): saluto con Mina che saluta (viva, toccabile), ricetta del giorno con foto 16:11 ed etichetta, `WeekStrip` (7 giorni, pallini per pasto, cestino nei giorni di spesa), `ShoppingCard` (in alto nei giorni di spesa). Stessi dati e stesse azioni di prima.
- `app/(tabs)/settimana.tsx`: giorni senza contorno scuro, oggi cerchiato, barra colorata per tipo di pasto.
- `app/(tabs)/spesa.tsx`: tessere chiare, reparti su card; Mina festeggia quando tutto è nel carrello; festeggiamento della conferma con la posa `success`.
- `app/(tabs)/ricette.tsx`: Mina Chef nel titolo.
- `app/ricetta/[id].tsx`: Mina Chef per la preparazione della sera prima, Mina 2.0 con la lista per gli ingredienti mancanti.
- `app/(tabs)/dispensa.tsx`, `app/aggiungi.tsx`, `app/voce/[ingredientId].tsx`, `app/prezzi.tsx`: campi e pillole chiare.
- `app/benvenuto.tsx`: Mina 2.0 grande su cerchi verdi tenui, punti di forza su card.
- `src/features/intro/SplashIntro.tsx`: Mina 2.0 posizionata sui suoi piedi, scritta in Nunito.
- `app/onboarding.tsx`: `ProgressBar`, Mina che festeggia nell'anteprima, `PaywallSlot`.
- `src/features/onboarding/steps.tsx`: etichette degli interruttori non più in Maiuscole Iniziali (difetto precedente), colori degli interruttori.
- **Nuovo** `app/mina.tsx`: vetrina delle animazioni, solo web.

## Abbonamenti

- **Nuovo** `src/features/paywall/PaywallSlot.tsx`: punto di inserimento a fine onboarding, spento con `paywallMode = "off"`. Nessun SDK nuovo, nessun prezzo, nessun acquisto.

## Notifiche

- `src/core/notifications/schedule.ts`: l'avviso «La settimana è quasi finita» mostra la data in italiano (prima: `2026-11-30`).

## Test e strumenti

- **Nuovi** `src/test/mina2.test.ts`, `src/test/contrast.test.ts`; nuovo caso in `notifications.test.ts`; rimossi i test della vecchia Mina da `images.test.ts`.
- **Nuovi** `scripts/screenshots/capture.cjs` (giro reale con data fissa, qualsiasi misura di schermo) e `record-mina.cjs` (video delle animazioni).

## Invariato

Database, migrazioni, repository, motori di pianificazione/spesa/dispensa/prezzi, calcolo delle notifiche (a parte il testo corretto), navigazione, domande del questionario, catalogo e immagini delle ricette.
