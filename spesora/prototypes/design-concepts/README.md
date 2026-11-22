# Spesora · Design Evolution, fase 1: quattro concept

Prototipi visivi per scegliere la direzione del redesign. **Nessuna schermata dell'app è stata modificata.** Tutto è in questa cartella:

- `src/build.cjs` genera le pagine HTML dei concept;
- `scripts/render.cjs` rende le 12 anteprime PNG (780×1688, iPhone 390×844 @2x);
- `scripts/animate.cjs` registra le 8 micro-animazioni MP4.

Contenuti reali della demo: settimana 16–22 novembre; ricette, immagini e quantità dal catalogo (per 2 persone); Mina con le pose approvate di Google Flow; navigazione attuale (Oggi, Settimana, Spesa, Dispensa, Ricette). Non ho aggiunto funzioni che l'app non ha: niente scansione dei prodotti, profilo o aggiunta manuale alla lista, che compaiono nelle immagini di riferimento ma non esistono in Spesora.

| | Home | Settimana | Spesa | Animazioni |
| --- | --- | --- | --- | --- |
| **A — Editoriale Botanico** | Ricetta del prossimo pasto grande, titoli serif, rametti botanici, spesa in una riga | Barra dei 7 giorni, giorni di spesa con cestino, pasti con colore per colazione/pranzo/cena e foto grande | Due schede (da comprare / nel carrello), categorie illustrate con "Serve oggi", motivo dietro la ⓘ | Cambio giorno; espansione del "perché serve" |
| **B — Mina Interattiva** | Mina tiene la lista: "Ho preparato la spesa!"; Mina sbuca dalla card della ricetta; i 3 pasti del giorno come pastiglie | Barra dei giorni in rilievo, Mina col calendario che riassume il giorno, pasti su una linea del tempo | Anello di avanzamento, "Prima questi 6: servono oggi!", tessere con illustrazione e spunta | Mina che presenta il messaggio; spunte con anello che si riempie e Mina che festeggia |
| **C — Ricettario a Schede** | Pagina ad anelli con il pasto del giorno come foto incollata, scritte a mano, schede "Settimana" e "Ricettario" | Agenda: 7 giorni × 3 miniature (colazione, pranzo, cena) su una sola pagina, giorni di spesa con etichetta | Linguette per le spese (oggi / sabato 21), taccuino con categorie a fisarmonica | La pagina dell'agenda che gira al cambio settimana; la foto della ricetta che si solleva e si apre |
| **D — Moderno Illustrato** | Grande foto della ricetta con titolo sopra, "Apri la ricetta", due pillole (spesa e dispensa), "Più tardi" | Barra dei giorni pulita con puntino per la spesa, pasti in righe con foto e colore del tipo | Contatori (da comprare / presi), gruppi per categoria, "Serve oggi" sotto il prodotto | Indicatore del giorno che scorre e pasti sfalsati; spunta con testo barrato e contatori |

## Confronto (1 = debole, 5 = forte)

| Criterio | A | B | C | D |
| --- | --- | --- | --- | --- |
| Bellezza visiva | 5 | 4 | 4 | 4 |
| Originalità | 3 | 4 | 5 | 2 |
| Coerenza con Spesora (intro, Mina, stile a contorno) | 4 | 5 | 4 | 3 |
| Leggibilità su iPhone | 4 | 4 | 3 | 5 |
| Chiarezza del calendario | 4 | 4 | 5 | 4 |
| Semplicità della spesa | 4 | 5 | 4 | 4 |
| Uso di Mina | 2 | 5 | 3 | 2 |
| Facilità di implementazione | 4 | 3 | 3 | 5 |
| Fluidità e prestazioni | 5 | 4 | 4 | 5 |
| **Totale** | **35** | **38** | **35** | **34** |

**La mia preferenza: B.** È quella che risolve meglio i problemi che hai indicato:

- Mina fa qualcosa invece di stare accanto a un fumetto: tiene la lista, presenta il piatto, riassume il giorno, festeggia.
- I messaggi sono brevi.
- Nella spesa si vede subito cosa serve oggi.
- Continua lo stile dell'intro (contorni, forme morbide, rimbalzi).

Se ti piace, prenderei da **C** la vista "settimana intera" (7 giorni × 3 miniature) come seconda modalità del calendario. La scelta resta tua.

## Modifiche che farei (fase 2, sul concept scelto)

- **Home**:
  - messaggio di Mina di una riga più un pulsante, invece del fumetto lungo;
  - prossimo pasto come elemento principale (foto grande, tipo e ora, tempo, porzioni, cosa manca);
  - gli altri pasti del giorno in piccolo;
  - spesa e dispensa come accessi brevi;
  - i dettagli (ingredienti mancanti, perché) restano un tocco più in là.
- **Settimana**:
  - barra orizzontale dei 7 giorni, con oggi e il giorno selezionato evidenti e i giorni di spesa marcati;
  - pasti del giorno con miniatura e colore per colazione, pranzo e cena;
  - stessi menu di azioni di oggi (cambia, sposta, ho cucinato, mangio fuori…), dietro "⋯" e con la pressione lunga;
  - animazione breve al cambio giorno o settimana.
- **Spesa**:
  - in alto quale spesa, quando e quanti prodotti;
  - in evidenza "serve oggi";
  - categorie con piccola illustrazione;
  - quantità a destra;
  - il "per quale ricetta" dietro ⓘ o con l'espansione della riga;
  - spesa iniziale e spese programmate come linguette;
  - la conferma resta l'unico modo per far entrare i prodotti in dispensa, con la stessa logica di oggi.
- **Dispensa**:
  - quattro stati riconoscibili a colpo d'occhio, con colore e icona: disponibile, da verificare, potrebbe non bastare, stimato o confermato;
  - "stimato" resta sempre scritto, mai presentato come certo;
  - la spiegazione introduttiva passa in una scheda informativa.
- **Onboarding**:
  - una domanda per schermata, con Mina che reagisce (pose già esistenti);
  - avanzamento a tappe;
  - opzioni selezionate più evidenti;
  - le domande su allergeni e consenso restano complete.
- **Ricettario**:
  - card più grandi con foto protagonista;
  - sezioni (suggerimenti, categorie, risultati) distinte anche nel colore dell'intestazione;
  - filtri in un pannello.

## Rischi tecnici

- **Font personalizzati** (Fraunces, Nunito, Caveat, Manrope): vanno inclusi con `expo-font`. Sono licenze OFL e pesano 20–80 KB ciascuno. Con caratteri molto grandi (Dynamic Type) i layout compatti devono andare a capo senza tagliare: va provato su iPhone.
- **Calendario compatto (C)**: 21 miniature in una pagina sono leggere (le card sono già piccole), ma su schermi stretti richiedono attenzione al tocco: minimo 44 pt.
- **Mina in più punti (B)**: le pose PNG esistono già. Bisogna evitare che compaia ovunque e mantenere "Riduci movimento" per tutti i rimbalzi.
- **Informazioni nascoste**: allergeni, prodotti da verificare, prezzi non verificati e privacy non devono finire dietro un gesto. Le espansioni hanno sempre un'icona visibile e un'etichetta per lo screen reader.
- **Ombre su Android** (D): vanno usate con moderazione; il contorno di A, B e C è più prevedibile.
- **Tab bar**: resta quella attuale. Le immagini di riferimento proponevano "Profilo" e "Calendario": eventuali rinomine sono una scelta a parte.

## Rigenerare

Da `spesora/prototypes/design-concepts/`:

```bash
node src/build.cjs
```
```bash
node scripts/render.cjs
```
```bash
node scripts/animate.cjs
```

## Scelta dell'utente: B + C (concept E)

Il comportamento di B con lo stile di C, e più spazio in schermata. Anteprime in `out/previews/concept-E_*.png`:

- Home;
- Settimana in due viste, "Giorno" e "Settimana";
- Spesa.

Animazioni in `out/animations/concept-E_a1.mp4` e `concept-E_a2.mp4`. È la base per la fase 2.
