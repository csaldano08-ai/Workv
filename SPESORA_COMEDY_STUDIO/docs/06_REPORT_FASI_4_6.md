# 06 · Rapporto delle fasi 4–6 · blockout, storyboard, animatic, prove critiche

Come nella fase 2, i controlli automatici lavorano sulle mesh **valutate** (dopo armatura e modificatori), con `scripts/cs_qc.py`; dove l'automatico non basta c'è una verifica visiva, e il limite è dichiarato.

## 1 · Supermercato (blockout) · `scripts/cs_market.py`

Tutto è costruito da una sola tabella (`LAYOUT`), la stessa che disegna la pianta: 3D e pianta non possono divergere.

| Zona | Contenuto |
|---|---|
| Ingresso | Vano vero nel muro da 2,6 m, architrave, ante scorrevoli, zoccolino interrotto nel vano |
| Carrelli | 4 carrelli affiancati, non incastrati: contatti tra carrelli **0** |
| Ortofrutta | 3 tavoli con cassette e frutta, espositore CIPOLLE su ruote (spostato nella gag A) ed espositore PATATE |
| Corsie | 3 gondole (Pasta e riso, Conserve, Colazione), corsie da 1,68 m, scaffale a muro, prodotti appoggiati 0,5 mm sopra i ripiani |
| Casse | 3 casse con nastro, registratore, piano del cassiere, palo con numero; luce «cassa aperta» comandabile (gag B) |
| Ufficio | Muro con vano porta, telaio, anta a battente con cerniera, maniglie sui due lati, targa DIREZIONE, scrivania e sedia |
| Insegne | Reparti appesi con tiranti al soffitto, USCITA, CASSE, insegna del negozio |

Nome del negozio: **SUPER LAMPONE**, segnaposto inventato e sostituibile.

### Prove critiche sull'ambiente (test A, D, E del prompt)

| Prova | Esito misurato |
|---|---|
| Prodotti dentro gli scaffali (3 gondole + muro) | ✅ 0 vertici, 0 mm |
| Frutta dentro le cassette, cassette dentro i tavoli | ✅ 0 mm |
| Porta: rotazione 0→88° contro telaio, muro e architrave | ✅ nessun contatto (3 mm di gioco su ogni lato, 8 mm da terra) |
| Luce libera della porta dell'ufficio | 0,784 × 2,04 m |
| Luce libera dell'ingresso | 2,44 × 2,32 m |
| Zoccolini dentro i vani (ufficio, ingresso) | ✅ 0 vertici |
| Ante scorrevoli aperte dentro i muri | ✅ 0 mm |
| Z-fighting | corretto: montanti delle gondole 5 mm più sporgenti delle testate (prima: strisce nere); ✅ verifica visiva delle 6 viste |

Viste del blockout: `environments/supermercato/BLOCKOUT_*.jpg`; pianta con percorsi e camere: `environments/supermercato/PIANTA_set_EP01.png`; dati: `qc_supermercato.json`.

## 2 · Personaggi secondari · `CAST` in `scripts/cs_char.py`

Sei personaggi dallo stesso telaio del protagonista approvato, cambiando solo la specifica:

| Personaggio | Altezza | Caratteri distintivi |
|---|---|---|
| Protagonista | 1,82 m | giacca blu, maglietta pesca, ciuffo |
| Luca, dipendente | 1,69 m | polo rossa con grembiule, cartellino LUCA, capelli rossi corti, scarpe bianche |
| Anna, dipendente | non misurata (non è nella tavola) | variante di Luca: cartellino ANNA, caschetto, ciglia |
| Responsabile | 1,62 m | gilet e cravatta, capelli ai lati, occhiali |
| Direttore | 1,82 m | completo grigio, cravatta rossa, capelli grigi, baffi, pancia |
| Cliente con felpa | 1,76 m | felpa con cappuccio, biondo |
| Signora | 1,62 m | abito, crocchia, occhiali |

Controllo in posa di riposo, con braccia, mani e piedi per tutti: **0 mm** di compenetrazioni, suole a 2 mm dal pavimento (`characters/cast_ep01/qc_cast.json`).
Tavole: `characters/cast_ep01/CAST_fronte.jpg` e `CAST_tre_quarti.jpg`.

## 3 · Storyboard · `shots/storyboard/`

24 inquadrature più il marchio finale, renderizzate dal blockout 3D vero, non disegnate: posizioni, luci e proporzioni sono già quelle dell'animatic.
La tavola `STORYBOARD_EP01.jpg` riporta per ogni inquadratura il numero, i tempi, la lente, la descrizione e la narrazione corrispondente.

## 4 · Animatic · `renders/animatic/`

_(sezione completata a fine rendering)_
