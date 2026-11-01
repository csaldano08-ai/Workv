# Mina — consegna degli asset a Claude Code

La libreria contiene **16 pose definitive, master e reference sheet**, generati realmente attraverso Google Flow nel progetto [SPESORA — MINA](https://flow.google.com/project/2506d8ab-83f0-4841-b9bb-a1e65468c14f). Tutte le pose sono utilizzabili subito come immagini statiche locali. Il ramo consegna soltanto asset e documentazione; l'integrazione UI resta a Claude.

## Percorsi e formati

Radice: `assets/mascot/mina/` (rispetto a `spesora/`).

| Percorso | Contenuto | Dimensioni |
| --- | --- | --- |
| `master/mina_master.png` | Modello operativo, PNG RGBA trasparente | 1024×1024 |
| `master/mina_reference_sheet.png` | Frontale, tre quarti, profilo, espressioni e palette; tavola opaca intenzionale | 1200×896 |
| `master/sources/` | Riferimento utente e originali Flow, conservati | Dimensioni originali |
| `poses/mina_*.png` | Le 16 pose definitive trasparenti | 1024×1024 |
| `poses/sources/` | Un originale JPEG Flow per posa scelta | 1024×1024 |
| `optimized/mina_*.png` | 16 pose e master, trasparenti, per mobile | 512×512 |
| `animation-frames/` | Cinque azioni, tre keyframe ciascuna | 1024×1024 |
| `animation-frames/layers/` | Braccio/corpo saluto; copertina/corpo-pagine ricettario | 1024×1024 |
| `animation-frames/animation_manifest.json` | Ordine layer, pivot, trasformazioni e tempi | Coordinate nel canvas 1024 |
| `previews/` | Contact sheet su avorio/antracite, controlli alpha e tavola keyframe | Solo revisione |
| `asset_manifest.json` | Provenienza, prompt, selezione, hash, dimensioni e controlli | Registro di produzione |
| `MINA_STYLE_GUIDE.md` | Identità fissa e regole grafiche | Riferimento permanente |

Gli originali JPEG hanno fondale ciano, rimosso nelle consegne PNG. Non usare i JPEG o le anteprime come asset dell'app. Non rigenerare la mascotte quando serve cambiare schermata: usare la posa appropriata. I percorsi e i nomi sono stabili.

## Pose e stati

| Asset in `poses/` o `optimized/` | Stato/uso |
| --- | --- |
| `mina_neutral.png` | Presenza generale, riposo |
| `mina_welcome.png` | Primo ingresso, benvenuto |
| `mina_wave.png` | Saluto, ritorno dell'utente |
| `mina_explaining.png` | Guida e spiegazione del questionario |
| `mina_thinking.png` | Ricerca alternativa, suggerimento in corso |
| `mina_calendar.png` | Pianificazione settimanale; sette colonne senza scritte |
| `mina_shopping.png` | Checklist della spesa con pittogrammi |
| `mina_cooking.png` | Promemoria cucina, cucchiaio e gesto di accompagnamento |
| `mina_recipe.png` | Ricettario socchiuso e pagina illustrata |
| `mina_pantry.png` | Dispensa, vasetti su vassoio |
| `mina_missing.png` | Ingrediente mancante; tono gentile, nessuna colpa |
| `mina_savings.png` | Budget e risparmio, barattolo con monete |
| `mina_happy.png` | Reazione positiva |
| `mina_success.png` | Pasto/settimana completati, braccia alzate |
| `mina_sleepy.png` | Messaggio serale |
| `mina_empty.png` | Nessun elemento, ciotola vuota |

## Schermate e dimensioni suggerite

Le misure seguenti sono **lati del canvas quadrato in dp**, non altezza della sola sagoma. Il libro conserva margini interni: evitare crop automatici diversi fra pose.

| Schermata | Posa | Dimensione suggerita |
| --- | --- | --- |
| Benvenuto | `mina_welcome` | Grande, 240–280 dp |
| Onboarding | `mina_explaining` | Media, 144–192 dp |
| Home | `mina_neutral` / `mina_recipe` | Media, 144–192 dp |
| Calendario | `mina_calendar` | Piccola/media, 112–160 dp |
| Spesa | `mina_shopping` | Media, 160–192 dp |
| Ricetta | `mina_cooking` | Piccola, 96–128 dp |
| Dispensa | `mina_pantry` | Media, 160–192 dp |
| Ingredienti mancanti | `mina_missing` | Media, 160–192 dp |
| Budget | `mina_savings` | Piccola/media, 112–160 dp |
| Completamento | `mina_success` | Grande, 240–280 dp |
| Empty state | `mina_empty` | Media, 160–192 dp |

Usare `contain`, senza deformazione o specchiatura. Preferire i 512 px per canvas piccoli; usare i 1024 px per welcome grandi o display ad alta densità. Importare gli asset con percorsi statici locali compatibili con il bundler Expo: nessuna dipendenza da Flow o rete a runtime. Non sovrapporre testo sul viso o dentro la checklist. Le indicazioni importanti restano testo accessibile nella UI.

## Cinque azioni predisposte

Sono **asset per l'animazione**, non un componente Reanimated già implementato. Il manifesto fornisce geometria e tempi in millisecondi. Si può scegliere fra layer trasformati continuamente e keyframe raster; non renderizzare entrambi contemporaneamente.

| Azione | Preparazione effettiva | Tempi e uso |
| --- | --- | --- |
| `wave` | Braccio destro separato; corpo invariato; tre rotazioni −8°, 0°, +8° attorno a (797,522) | 0/160/320 ms; ciclo 0→1→2→1, una o due ripetizioni, riposo al frame 1 |
| `book_open` | Copertina e corpo/pagine separati; stessa illustrazione, piccola compressione prospettica attorno al dorso inclinato | 0/160/320 ms; parte da copertina già socchiusa e apre leggermente di più |
| `shopping` | Tre posizioni della stessa posa, checklist già visibile; traslazione Y 24→8→0 px | 0/120/240 ms; apparizione e presentazione della lista |
| `success` | Tre posizioni dello stesso disegno, Y 28→−16→28 px | 0/180/360 ms; piccolo salto, frame iniziale/finale intenzionalmente identici |
| `cooking_reminder` | Stessa posa con cucchiaio e gesto; Y 24→6→0 px | 0/140/280 ms; comparsa del promemoria in-app |

Per il saluto disegnare il braccio dietro il corpo: il corpo copre la giunzione. Tutti i layer mantengono lo stesso canvas e vanno scalati insieme, compresi pivot e traslazioni. Nel ricettario la pagina sottostante usa una texture campionata dall'illustrazione Flow: l'apertura è volutamente piccola. Non estendere questa preparazione a una rotazione di 90° o a un intero libro sfogliabile.

Shopping e cucina usano movimenti rigidi: la checklist, il cucchiaio e la mano che indica **non sono articolati separatamente**. La posa comunica già l'azione; l'animazione prepara la comparsa. Non ci sono rig facciale, fonemi o blinking. Le 16 pose generate sono stati illustrati coerenti, non fotogrammi da interpolare fra loro: evitare morph tra disegni diversi. I fotogrammi forniti derivano invece ciascuno da un'unica illustrazione, senza ridisegno degli occhi o dei dettagli fra frame.

Con riduzione movimento attiva usare la posa statica, senza loop o saltelli. Per notifiche di sistema non presumere che iOS visualizzi qualsiasi PNG animato: usare Mina nel messaggio interno o nella schermata aperta al tocco della notifica. Non sono stati implementati o verificati componenti iOS/Android.

## Controlli e limiti

Le 16 pose sono state aperte individualmente in Flow e confrontate con il master, poi controllate nelle esportazioni su fondi chiaro/scuro. Selezionata una sola variante per posa. La variante thinking con naso inventato è stata scartata; la reference sheet è stata corretta in Flow per lo stesso motivo. Sorgenti e prompt delle scelte definitive sono registrati nel manifest.

PNG verificati per integrità, dimensioni, alpha reale, margini, hash e duplicati. Bordi controllati dopo rimozione del ciano su avorio, antracite e pesca. Ricomposizione dei layer del saluto verificata contro l'originale; stabilità dei frame rigidi verificata sulle stesse sorgenti. Anteprime dei 15 keyframe controllate visivamente. Rapporto macchina: `asset_validation.json`.

La libreria conserva le leggere variazioni pittoriche delle generazioni Flow, quindi non è un modello vettoriale parametrico. Le tavole di riferimento e le anteprime sono volutamente opache. Nessuna schermata, ricetta, vecchia mascotte o manifest delle immagini alimentari è stato modificato. I test dell'app non sono stati eseguiti: questo ramo non integra codice applicativo. Asset mancanti rispetto alle 16 pose richieste: **0**.
