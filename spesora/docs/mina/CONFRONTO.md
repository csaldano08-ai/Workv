# MINA — riferimento approvato ↔ app reale (V4)

## Come è stato fatto il confronto

Questa volta il confronto è **misurato**, schermata per schermata, nell'ordine chiesto dal brief:

1. apro il riferimento;
2. faccio lo screenshot dell'app vera (demo web generata dal codice, 390×844 pt, data fissa lunedì 23 novembre, risposte reali del questionario);
3. porto le due immagini alla stessa scala;
4. confronto posizioni e proporzioni;
5. correggo;
6. ripeto.

Al punto 3, il telefono del riferimento viene ritagliato dentro la cornice e sotto la barra di stato (≈ 5,3% dell'altezza), poi portato a 390 pt di larghezza.

Le immagini sono in due cartelle:
- [`confronti/misurati/`](confronti/misurati/): riferimento · app · **sovrapposizione al 50%**, con linee guida ogni 50 pt. Gli scarti di posizione si leggono direttamente sulle linee. È lo strumento usato per le correzioni.
- [`confronti/`](confronti/) (`01…13.jpg`): riferimento e app affiancati. Panoramica in `00_panoramica.jpg`: riferimenti in alto, app in basso.

Le immagini si rigenerano con:

```
node scripts/screenshots/capture-mina.cjs <url> <cartella> 390 844
python3 scripts/screenshots/measure-mina.py <cartella> <uscita>
python3 scripts/screenshots/compare-mina.py <cartella> <uscita>
```

Due cose da sapere per leggere le sovrapposizioni:
- **L'altezza è diversa.** Il telefono del riferimento, ritagliato, è alto ≈ 770 pt; quello dell'app 844 pt (iPhone 14). Gli elementi ancorati in basso, come i pulsanti e la barra delle schede, cadono più in basso nell'app, anche quando la composizione è la stessa.
- **Non dichiaro una percentuale di fedeltà.** Il riferimento è un'immagine generata: ha fotografie al posto delle illustrazioni del catalogo e una mascotte in stile 3D, mentre Mina 2.0 approvata è un disegno 2D vettoriale. Una percentuale calcolata sui pixel non avrebbe senso. Il confronto riguarda posizioni, proporzioni, gerarchia, colori e testi.

Un esempio di lettura, sulla Home (`misurati/07_home.jpg`):

| Elemento | Riferimento | App |
| --- | --- | --- |
| Logo | y ≈ 50 | y ≈ 50 |
| Saluto | y ≈ 130 | y ≈ 125 |
| Hero | y 220–510 | y 205–495 |
| Banner pesca | y ≈ 565 | y ≈ 538 |
| «La tua settimana» | y ≈ 638 | y ≈ 611 |
| Giorni | y ≈ 715 | y ≈ 690 |

Lo scarto massimo è di circa 27 pt. La struttura e l'ordine dei blocchi sono gli stessi.

## Eccezione esplicita: i pulsanti

I pulsanti hanno lo stile già presente nell'app: pillola verde con base più scura e pressione elastica. Non hanno lo stile lucido e sfumato del riferimento. Dal riferimento ho preso solo dimensioni e posizione.

## Schermata per schermata

| # | Schermata | Allineato al riferimento | Differenze che restano e motivo |
| --- | --- | --- | --- |
| 1 | Benvenuto | Mina grande in alto, logo «Mina» con cestino, frase su due righe, 3 pallini, «Inizia →», forme salvia ai lati. Mina e logo si scalano sull'altezza dello schermo | Mina è il disegno 2D approvato, a riposo. Saluta una volta e torna giù, come chiesto. «Nessun account richiesto · Privacy» sotto il pulsante, per trasparenza |
| 2 | Intro Chef | Mina Chef grande su forma salvia, con il cucchiaio. «Benvenuto in Mina!», pallini, «Continua →» | Mina Chef è Mina 2.0 con cappello e grembiule (stesse proporzioni). Il pallino acceso è il secondo, perché è la seconda pagina. C'è una terza pagina sulla spesa |
| 3 | Pasti | Barra a segmenti, titolo 30 centrato, tessere alte con illustrazione, bordo verde e spunta, Mina in basso su piano salvia, ← e «Avanti →» | 4 pasti (c'è lo spuntino), quindi tessere 2×2 invece di 3 in fila. A 375×667 Mina non compare, perché non entrerebbe intera |
| 4 | Persone | Cerchi 1…5+ da 58 pt, scelta verde piena, nota ⓘ, Mina con la lista su piano salvia | È la prima domanda, secondo l'ordine reale del questionario |
| 5 | Anteprima | «La tua settimana», badge del giorno salvia, foto, nome e freccia, Mina che festeggia su piano salvia, «Procedi →» | Cerchio ← per correggere le risposte. I giorni mostrati sono 3, oppure 2 sugli schermi bassi, poi «Vedi tutti i 7 giorni». Le ricette sono quelle generate davvero |
| 6 | Abbonamento | Onda salvia con Mina grande, «👑 Sblocca tutto Mina», 4 vantaggi con spunte, **due card Annuale / Mensile**, pulsante subito sotto, link Ripristina · Termini · Privacy | **Niente prezzi né «-40%» inventati.** Con gli acquisti spenti le card dicono «Prezzo dallo store» e non si selezionano. Una nota dice che gli abbonamenti non sono attivi. Con lo store attivo le card mostrano prezzo e periodo letti dallo store (codice pronto, non provato con acquisti reali) |
| 7 | Oggi | Logo, campanella e ingranaggio, «Buongiorno! 👋», sottotitolo, hero orizzontale con foto, cuore, chip del pasto, ora, nome, tempi, persone e «Cucina ora →», banner pesca «Ti mancano N ingredienti ›», «La tua settimana» con i giorni a chip, barra delle schede | Data accanto alle icone, richiesta dal brief. Mina piccola a destra del saluto, voluta in Home dal brief. Sotto la piega, funzioni esistenti: «Poi, cena», accessi a Spesa e Dispensa, conferme dei pasti |
| 8 | Settimana | Logo, titolo, pillola salvia con l'intervallo, badge del giorno, card con foto, nome, pasto e ora | Più pasti nello stesso giorno stanno nella stessa card (i dati lo prevedono). Niente frecce ‹ ›: esiste una sola settimana di piano. Mina con il calendario accanto al titolo |
| 9 | Spesa | Logo, titolo, filtri «Da acquistare (N) / Acquistati (N)», reparti con fascia pesca, casella, nome e immagine a destra. **Lista subito dopo i filtri**: le spiegazioni sono in «Dettagli della spesa», in fondo | Selettore dei giorni di spesa quando sono più d'uno (funzione reale). Illustrazione del reparto al posto della foto del prodotto, perché non ci sono foto dei prodotti. Quantità sotto il nome. **Niente «+ Aggiungi prodotto»: la funzione non esiste.** «Conferma acquisti» in basso |
| 10 | Dispensa | Logo, titolo, pillole di filtro, elenco in card con immagine, nome in grassetto, quantità grigia e freccia | Avviso delle mancanze in un banner pesca compatto, sopra l'elenco. Filtro «Da controllare» al posto di «Preferiti», che per la dispensa non esiste. Ricerca solo con più di 5 prodotti |
| 11 | Ricette | Logo, titolo, ricerca con il pulsante filtro, tessere Tutte / Primi / Secondi / Veg (82×94), griglia a 2 colonne con foto, cuore, tempo e persone | Altre tessere scorrendo: sono le sezioni e i filtri già esistenti. Mina Chef accanto al titolo |
| 12 | Ricetta | Foto grande con ← e cuore, titolo, tempo e persone, linguette Ingredienti / Preparazione / Consigli, righe con casella e quantità, «Inizia a cucinare →» | Niente «Facile» (nei dati non c'è la difficoltà) e niente «condividi» (non esiste). Avviso allergeni sempre visibile. Stepper delle persone |
| 12b | Modalità Cucina | Non è nel riferimento | Passaggio attivo in primo piano, numerazione, timer, ingredienti del passaggio, avvisi alimentari, Mina Chef su richiesta, «Indietro / Fatto, avanti» |
| 13 | Profilo | Logo, titolo, righe con icone verdi e freccia, **riga «Lingua · Italiano»**, Mina su forma salvia | Righe in più per funzioni reali: Storico, Prezzi, Abbonamento, Privacy e condizioni, I tuoi dati. La lingua è solo l'italiano: toccandola, lo dice un messaggio |

## Differenze che restano nella mascotte

- **Stile.** Il riferimento mostra una mascotte in stile 3D con chiaroscuro. Mina 2.0 approvata è vettoriale 2D, a parti separate per poterla animare.
- **Fonte unica.** Tutte le schermate usano lo stesso disegno (`src/ui/mascot/mina2/art.ts`) e lo stesso scheletro. Non restano versioni vecchie nella UI.
- **Fogli di controllo.** In [`mascotte/`](mascotte/):
  - `pose_v4.jpg`: 18 pose;
  - `gesti_v4.jpg`: fasi del saluto (inizio, braccio aperto, mano in alto, ritorno, riposo), festa, pensierosa, chef a riposo, cucchiaio su, mescola.
