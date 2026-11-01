# Integrazione delle immagini di Codex (Google Flow)

Codex produce le illustrazioni mancanti sul ramo `codex/spesora-flow-344`. Lo sviluppo dell'app procede in parallelo su `claude/spesora-app-integration`. Questo documento descrive chi possiede cosa e come avviene l'integrazione.

## Proprietà dei file durante la produzione

| File | Proprietario durante la produzione |
| --- | --- |
| `assets/recipes/<id>.png` | Codex |
| `assets/recipes/manifest.json` | Codex |
| `src/data/recipe-images.ts` (mappa PNG, **non importata dall'app**) | Codex |
| `docs/IMAGE_GENERATION_PROGRESS.json`, `docs/RECIPE_IMAGE_PATHS.json` | Codex |
| `assets/recipes/card/<id>.jpg` (800×600), `assets/recipes/thumb/<id>.jpg` (320×240) | ramo di integrazione |
| `src/data/recipe-image-cards.ts`, `src/data/recipe-image-thumbs.ts` (mappe usate dall'app) | ramo di integrazione |

Il comando `npm run images -- cards` **non scrive il manifest**: i percorsi di card e miniature sono deterministici (`assets/recipes/card/<id>.jpg`, `assets/recipes/thumb/<id>.jpg`). Il workflow `recipe-cards.yml` gira solo su `claude/**` e mai su `codex/**`.

> Nota: il ramo `codex/spesora-flow-344` è stato creato da un commit in cui `recipe-cards.yml` era ancora attivo su qualunque ramo. Finché Codex non incorpora questa versione, un push di PNG su quel ramo può far partire il bot che aggiunge card e (nella vecchia versione) aggiorna il manifest. Il bot fa `pull --rebase` e non sovrascrive nulla, ma Codex deve fare `git pull` prima del push successivo. In alternativa si può disattivare temporaneamente il workflow da GitHub → Actions → "Spesora · card immagini ricette" → Disable workflow.

## Uso nell'app

- Solo asset locali con `require` statici: nessuna richiesta di rete, tutto disponibile offline.
- `RecipeImage variant="thumb"` nelle liste (settimana, ricettario, sostituzioni): 320×240, decodifica leggera nelle FlatList virtualizzate.
- `RecipeImage` (card 800×600) per hero della ricetta, card della home e card grandi del ricettario.
- Ricette senza immagine validata: illustrazione vettoriale di fallback (`DishArt`) con le stesse proporzioni 4:3; nessun salto di layout.
- I PNG sorgente (1200×900, ~0,4–1,3 MB) non entrano nel bundle.

## Procedura di integrazione (checkpoint o ramo finale di Codex)

1. `git fetch origin codex/spesora-flow-344` e lettura dei commit nuovi (`git log`, `git diff --stat`).
2. Controlli sul ramo di Codex prima del merge (in un worktree, senza modificarlo):
   `npm ci && npm run images:check` — manifest ↔ catalogo, file presenti e nominati per ID, 4:3, duplicati di hash, coerenza di `recipe-images.ts`, peso.
3. Merge senza force push e senza strategie `ours`/`theirs` su file interi. In caso di conflitto su `manifest.json` vale la versione di Codex per gli stati delle immagini; i campi del catalogo (nomi, ingredienti) si riallineano con `npm run images -- sync` solo dopo la fine della produzione.
4. `npm run images -- cards` (genera card e miniature mancanti, aggiorna solo le mappe dell'app).
5. `npm run images:check -- --strict` (ogni immagine validata deve avere la card), `npm run verify`, `npm run images -- status`.
6. Export Expo iOS e web, controllo visivo in Home, Settimana, Ricettario, Ricerca, Filtri, Dettaglio.

## Controllo automatico sulle pull request

`.github/workflows/images-check.yml` si attiva sulle pull request che toccano immagini, mappe, ricette o script immagini: installa le dipendenze, esegue `images:check`, typecheck e test. Permessi in sola lettura, nessuna credenziale, nessuna generazione di immagini, nessun merge automatico.

## Scala oltre 500 ricette

Mappe e controlli sono generati dal manifest e dal catalogo, senza elenchi scritti a mano. Peso stimato a 1.000 ricette: card ~40 MB, miniature ~10 MB nel bundle; i sorgenti PNG restano solo nel repository. Oltre questa soglia conviene valutare la consegna delle card tramite aggiornamento OTA o pacchetto scaricabile, mantenendo comunque la disponibilità offline dopo il primo download.

## Stato dell'integrazione (1 novembre 2026)

- Integrato `origin/codex/spesora-flow-344` @ `25388c3` (merge senza conflitti): **500/500 ricette con illustrazione validata**, 0 pending.
- `images:check --strict`: nessun errore. Card 20,0 MB, miniature 4,0 MB (JPEG). Esportazione iOS: JS 6,7 MB, asset 27 MB; esportazione web riuscita.
- Controllo visivo nella demo web: Oggi, Settimana (miniature) e Ricettario (card) mostrano le nuove illustrazioni; nessun errore in console.
- **Peso del repository**: i 500 PNG sorgente (1200×900) pesano ~559 MB. Non entrano nell'app, ma appesantiscono clone e CI. Prima di crescere oltre 500 valutare Git LFS o la rimozione dei sorgenti dal ramo principale (conservandoli altrove), da decidere col proprietario del repository.
- Non ancora verificato a mano: la qualità culinaria di ciascuna immagine (Codex ha prodotto 24 schede di controllo in `docs/`); 500 ricette restano `needs_culinary_review`.
