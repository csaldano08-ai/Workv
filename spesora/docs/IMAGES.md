# Immagini delle ricette

## Stato attuale

- Ricette nel catalogo: **156**, tutte nel manifest `assets/recipes/manifest.json` (stato `pending`).
- Immagini generate e integrate: **0**. In questo ambiente non c'è una chiave dell'API Gemini e non c'è accesso a Google Flow (nessun browser collegato al tuo account; `labs.google` non raggiungibile). L'app mostra l'illustrazione vettoriale originale di ogni categoria finché l'immagine non c'è.

## Unico intervento necessario

1. Crea una chiave su Google AI Studio (account Google tuo; verifica lì tariffe e limiti attuali dei modelli immagine).
2. GitHub → repository `Workv` → **Settings → Secrets and variables → Actions → New repository secret**: nome `GEMINI_API_KEY`.
3. GitHub → **Actions → "Spesora · immagini ricette" → Run workflow** sul branch di lavoro:
   - prima esecuzione: `command = style` (crea il riferimento di stile, 1 immagine);
   - poi `command = run`, `pilot = true` (5 ricette di tipologie diverse) per valutare il risultato;
   - poi `command = run`, `limit = 20` più volte, oppure un limite più alto quando sei soddisfatto.

Ogni esecuzione genera, controlla, ottimizza, aggiorna manifest e mappatura, esegue `npm run verify` e fa commit sul branch. I sorgenti a piena risoluzione restano come artifact della Action per 30 giorni (non appesantiscono il repository).

## Come funziona

| Fase | Dettaglio |
| --- | --- |
| Manifest | Una voce per ID ricetta: nome, categoria, ingredienti principali, stato, file, hash del prompt, tentativi, modello, hash percettivo, esito controlli. Salvato dopo **ogni** immagine (scrittura atomica). |
| Prompt | Costruito dagli ingredienti reali (non "q.b."), dal tipo di piatto e dalla descrizione; direzione artistica comune; divieto di testo, loghi, mani, 3D. |
| Riferimento di stile | Generato una volta e allegato a ogni richiesta successiva per coerenza. |
| Generazione | API ufficiale `generateContent` con output immagine 4:3; modello configurabile; se il predefinito non è disponibile per la chiave, viene scelto un modello immagine disponibile. |
| Controlli tecnici | Decodifica, larghezza minima, immagine non vuota, ritaglio 4:3, **anti-duplicati** con hash percettivo. |
| Controllo di coerenza | Un modello con visione confronta immagine, nome e ingredienti e segnala testo visibile. Se fallisce si rigenera (max 3 tentativi), poi la ricetta passa a `needs_review` invece di essere dichiarata corretta. |
| Ottimizzazione | Card 800×600 JPEG progressivo (~40–90 KB): ~156 immagini ≈ 10 MB. |
| Integrazione | `src/data/recipe-images.ts` generato con `require()` statici (compatibile con Metro). Entrano nell'app solo gli stati `generated` e `validated`. |
| Limiti e costi | Tetto per esecuzione (predefinito 20, massimo 200), ripetizioni con attesa su errori temporanei; se la quota o i crediti finiscono, si ferma salvando lo stato. Nessuna esecuzione pianificata, nessun acquisto. |

## Batch API

Valutata: è adatta a grandi volumi asincroni (tempi fino a ore, in genere con sconto), ma rende più lento il ciclo genera → controlla → rigenera. Consiglio: pilota e primi lotti in modalità sincrona; se il risultato è stabile, si può aggiungere una modalità batch allo stesso manifest. Tariffe e sconti vanno verificati sulla pagina prezzi ufficiale al momento dell'uso (non consultabile da questo ambiente).

## Comandi locali

```bash
npm run images -- status
npm run images -- sync
npm run images -- run --pilot --dry-run      # mostra i prompt senza chiamare l'API
npm run images -- run --limit 20             # richiede GEMINI_API_KEY
npm run images -- import ./cartella          # immagini già pronte (es. da Flow) chiamate <id>.png
npm run images -- approve id1 id2            # approva immagini "needs_review"
npm run images -- reject id1                 # scarta e rimette in coda
npm run images -- map                        # rigenera la mappatura
```

Se in futuro userai Google Flow dal tuo browser, basta scaricare le immagini nominandole con l'ID della ricetta (vedi `manifest.json`) e usare `import`: controlli, ottimizzazione e integrazione restano automatici.

## Coordinamento con la produzione Google Flow (Codex)

- Codex genera le illustrazioni con Google Flow e le salva come PNG (1200×900) in `assets/recipes/<id>.png`, aggiornando `IMAGE_GENERATION_PROGRESS.json`, il manifest e `src/data/recipe-images.ts` con il suo script `flow_assets.py`.
- **L'app non importa i PNG**: usa `src/data/recipe-image-cards.ts`, con card 800×600 JPEG (~40 KB) in `assets/recipes/card/`, generate da `npm run images -- cards` senza toccare i sorgenti. Il bundle iOS passa così da decine di MB a pochi MB.
- La GitHub Action **"Spesora · card immagini ricette"** rigenera le card automaticamente quando arrivano nuovi PNG (nessuna API, nessun costo).
- Elenco completo con stato: `docs/RICETTE_IMMAGINI.md` / `.csv`; solo le mancanti: `docs/RICETTE_IMMAGINI_DA_CREARE.md` (`npm run catalog:export-images`). Le 344 nuove ricette sono già nel registro di avanzamento di Codex come `pending`.
