# Spesora — completamento immagini Google Flow

344 nuove illustrazioni validate; copertura complessiva 500/500. Le 156 immagini precedenti sono preservate con verifica SHA-256. Nessuna ricetta mancante o in attesa di revisione.

| Ricettario | Precedenti | Nuove | Totale validato |
| --- | ---: | ---: | ---: |
| Colazioni | 30 | 67 | 97 |
| Primi (pasta, riso, cereali, zuppe) | 44 | 106 | 150 |
| Secondi (carne, pesce, uova) | 36 | 59 | 95 |
| Legumi, verdure e piatti unici | 33 | 72 | 105 |
| Spuntini | 13 | 40 | 53 |

Produzione esclusivamente tramite interfaccia browser di Google Flow, nello stesso progetto e stile gouache 2D già approvato. Ogni risultato è stato aperto individualmente, associato alla ricetta e controllato visivamente dall’originale esportato. La prima stracciatella in brodo è stata scartata perché sembrava pasta e rigenerata con fiocchi d’uovo.

PNG RGB 1200×900 in `assets/recipes/`; card JPEG 800×600 in `assets/recipes/card/`. La normalizzazione degli originali Flow 1200×896 usa un ritaglio minimo con proporzioni conservate, senza deformare il cibo. Mappature statiche compatibili con Metro e offline in `src/data/recipe-images.ts` e `src/data/recipe-image-cards.ts`.

Verifiche superate: decodifica e dimensioni di tutti i PNG e JPEG, hash originali protetti, assenza di duplicati esatti, nomi e riferimenti fisici delle due mappature. `npm run verify`: typecheck, lint e 110 test in 11 file superati; restano 7 avvisi di configurazione release già presenti. Non è stato eseguito un render su dispositivo iOS.

Nessuna modifica a motore alimentare, ricette, ingredienti, budget, dispensa, schermate o abbonamenti. Il registro completo è in `IMAGE_GENERATION_PROGRESS.json`; i risultati tecnici sono in `IMAGE_COVERAGE_REPORT.json` e `FLOW_PRODUCTION_COMPLETION.json`.

## Tavole di revisione

- [colazioni_01.jpg](contact-sheets-500/colazioni_01.jpg)
- [colazioni_02.jpg](contact-sheets-500/colazioni_02.jpg)
- [colazioni_03.jpg](contact-sheets-500/colazioni_03.jpg)
- [colazioni_04.jpg](contact-sheets-500/colazioni_04.jpg)
- [colazioni_05.jpg](contact-sheets-500/colazioni_05.jpg)
- [primi (pasta, riso, cereali, zuppe)_01.jpg](contact-sheets-500/primi%20%28pasta%2C%20riso%2C%20cereali%2C%20zuppe%29_01.jpg)
- [primi (pasta, riso, cereali, zuppe)_02.jpg](contact-sheets-500/primi%20%28pasta%2C%20riso%2C%20cereali%2C%20zuppe%29_02.jpg)
- [primi (pasta, riso, cereali, zuppe)_03.jpg](contact-sheets-500/primi%20%28pasta%2C%20riso%2C%20cereali%2C%20zuppe%29_03.jpg)
- [primi (pasta, riso, cereali, zuppe)_04.jpg](contact-sheets-500/primi%20%28pasta%2C%20riso%2C%20cereali%2C%20zuppe%29_04.jpg)
- [primi (pasta, riso, cereali, zuppe)_05.jpg](contact-sheets-500/primi%20%28pasta%2C%20riso%2C%20cereali%2C%20zuppe%29_05.jpg)
- [primi (pasta, riso, cereali, zuppe)_06.jpg](contact-sheets-500/primi%20%28pasta%2C%20riso%2C%20cereali%2C%20zuppe%29_06.jpg)
- [primi (pasta, riso, cereali, zuppe)_07.jpg](contact-sheets-500/primi%20%28pasta%2C%20riso%2C%20cereali%2C%20zuppe%29_07.jpg)
- [secondi (carne, pesce, uova)_01.jpg](contact-sheets-500/secondi%20%28carne%2C%20pesce%2C%20uova%29_01.jpg)
- [secondi (carne, pesce, uova)_02.jpg](contact-sheets-500/secondi%20%28carne%2C%20pesce%2C%20uova%29_02.jpg)
- [secondi (carne, pesce, uova)_03.jpg](contact-sheets-500/secondi%20%28carne%2C%20pesce%2C%20uova%29_03.jpg)
- [secondi (carne, pesce, uova)_04.jpg](contact-sheets-500/secondi%20%28carne%2C%20pesce%2C%20uova%29_04.jpg)
- [legumi, verdure e piatti unici_01.jpg](contact-sheets-500/legumi%2C%20verdure%20e%20piatti%20unici_01.jpg)
- [legumi, verdure e piatti unici_02.jpg](contact-sheets-500/legumi%2C%20verdure%20e%20piatti%20unici_02.jpg)
- [legumi, verdure e piatti unici_03.jpg](contact-sheets-500/legumi%2C%20verdure%20e%20piatti%20unici_03.jpg)
- [legumi, verdure e piatti unici_04.jpg](contact-sheets-500/legumi%2C%20verdure%20e%20piatti%20unici_04.jpg)
- [legumi, verdure e piatti unici_05.jpg](contact-sheets-500/legumi%2C%20verdure%20e%20piatti%20unici_05.jpg)
- [spuntini_01.jpg](contact-sheets-500/spuntini_01.jpg)
- [spuntini_02.jpg](contact-sheets-500/spuntini_02.jpg)
- [spuntini_03.jpg](contact-sheets-500/spuntini_03.jpg)
