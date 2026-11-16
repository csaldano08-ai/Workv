# Spesora · concept intro (prototipi video)

Quattro intro animate **da valutare**, prima di integrarne una nell'app. Nessun file di produzione dell'app è stato modificato: questa cartella è isolata e non entra nel bundle (non è importata da `app/` né da `src/`).

| | Concept | Video | Durata |
| --- | --- | --- | --- |
| A | Mina prende vita | `out/spesora_intro_A_mina.mp4` | 7,3 s |
| B | Splash elastico | `out/spesora_intro_B_splash.mp4` | 7,2 s |
| C | Ingredienti che danzano | `out/spesora_intro_C_ingredients.mp4` | 6,9 s |
| D | Il calendario magico | `out/spesora_intro_D_calendar.mp4` | 7,1 s |
| — | Tutti e quattro in sequenza, con cartello e etichetta | `out/spesora_intro_confronto.mp4` | ~33 s |

Formato: MP4 H.264, 1080×1920 (9:16), 60 fps, senza audio e senza watermark. Anteprime in `out/previews/` (una per video più `spesora_intro_anteprime.jpg` con le quattro affiancate).

## Le differenze, in breve

- **A — Mina prende vita.** Racconta il personaggio. Una forma verde rimbalza, diventa un ricettario che si apre e sfoglia, si richiude con un colpo e *diventa* Mina. Lei apre gli occhi, saluta (braccio animato su livello separato), apre la copertina e ne escono gli ingredienti, che si ricompongono nel logo. Alla fine vola al suo posto nella Home reale, che si apre attorno a lei. È la più narrativa: fa capire subito chi è Mina.
- **B — Splash elastico.** È la più grafica e d'impatto. Una forma verde cade accelerando (si allunga), si schiaccia all'impatto e sboccia in uno splash a petali verdi e pesca, con gocce che volano e ricadono. Tutto torna al centro in una gelatina che oscilla e si trasforma nel marchio. Le lettere "atterrano" una alla volta con piccoli spruzzi. Mina sbuca a salutare e un'onda verde apre la Home.
- **C — Ingredienti che danzano.** Dice "cucina". Sei ingredienti illustrati danzano su due orbite controrotanti (si incrociano senza toccarsi). Un vortice li stringe e ognuno si gira come una carta diventando un pallino verde o pesca. I pallini costruiscono il marchio, Mina lo presenta e i rametti decorativi atterrano sulle icone della barra in basso mentre la Home sale dal fondo.
- **D — Il calendario magico.** Dice "organizzazione", cioè il valore dell'app. Una pagina cade, si taglia in sette giornate (con i giorni di spesa in pesca) e nei giorni compaiono i **piatti veri del ricettario**. La lista della spesa si spunta, Mina arriva, le giornate si raccolgono in un libro e la copertina si chiude. Il libro gira, sul retro c'è il marchio, e il marchio si allarga fino a diventare la **schermata Settimana reale**.

## Cosa è originale e cosa è riusato

- **Mina**: solo le illustrazioni approvate di Google Flow (`assets/mascot/mina/`), mai ridisegnata. Le animazioni usano trasformazioni attorno ai piedi (squash & stretch controllato, saltelli, inclinazione), il **livello separato del braccio** per il saluto (perno alla spalla, come da `animation_manifest.json`), i **livelli copertina/corpo** per l'apertura del ricettario (apertura piccola, come indicato da Codex) e palpebre disegnate nel colore della copertina per "aprire gli occhi". I passaggi tra pose diverse avvengono sempre su un'azione (impatto, saltello), mai con una dissolvenza.
- **Logo**: il marchio è ridisegnato con la **stessa geometria** di `src/ui/Logo.tsx` (viewBox 64) e costruito pezzo per pezzo. La scritta "Spesora" è in Inter Bold verde, con la disposizione orizzontale dell'app. Nessun logo nuovo.
- **Schermate finali**: `ui-reference/home.png` e `ui-reference/settimana.png` sono catture **reali** della demo web attuale (360×640 @3x = 1080×1920), non schermate ridisegnate.
- **Piatti nel concept D**: card reali del ricettario (`assets/recipes/card/`).
- Ingredienti, libro vettoriale, splash e decorazioni: disegnati nel codice, contorno scuro `#24332C`, palette ufficiale.

## Come sono fatti (sorgenti)

- `src/lib.js`: motore 2D su Canvas. Molle smorzate, easing, squash & stretch, morph di superellissi (cerchio → quadrato arrotondato), tracciati morbidi, disegno parziale delle linee, logo, Mina a livelli, ingredienti.
- `src/concept-a.js` … `concept-d.js`: una funzione `draw(ctx, t)` per concept. Ogni fotogramma è calcolato dal tempo, quindi il risultato è deterministico.
- `src/stage.html`: pagina che carica asset e concept.
- `scripts/render.cjs`: serve `spesora/` in locale, disegna ogni fotogramma in Chromium headless (Playwright) e lo passa a ffmpeg.
- `scripts/compare.cjs`: video comparativo e anteprime. `scripts/capture-app.cjs`: cattura delle schermate reali. `scripts/sheet.cjs`: tavole di controllo dei fotogrammi.

Rigenerare (da `spesora/prototypes/intro-concepts/`, servono Playwright e ffmpeg, già presenti nell'ambiente cloud):

```bash
node scripts/render.cjs A 60
```
```bash
node scripts/compare.cjs
```

Nessun pacchetto è stato aggiunto a `package.json`.

## Per l'integrazione futura (solo dopo la scelta)

L'intro scelta non andrà nell'app come MP4: verrà ricostruita con `Animated` (gli stessi asset di Mina e lo stesso logo vettoriale), così resta nitida, leggera e modificabile.

- Si vedrà al primo avvio (ed eventualmente dopo un aggiornamento), non a ogni apertura.
- Si potrà saltare con un tocco.
- Con "Riduci movimento" si passerà alla Home con una dissolvenza breve.
- La Home si caricherà mentre l'intro gira, senza bloccare l'accesso.
- Funzionerà su iOS e Android.
