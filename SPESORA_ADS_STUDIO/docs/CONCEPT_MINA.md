# Mina in 3D (concept da approvare)

Fedele al design approvato (`spesora/assets/mascot/mina`, scheda `mina_reference_sheet.png`). Non è stato cambiato nulla del design.

## Parti 3D (`scripts/mina.py`)

Dorso salvia con fascia chiara sul fronte, copertina avorio con **cerniera sul dorso** (apribile), blocco pagine crema con righe,
copertina posteriore, elastico verde scuro vicino al bordo destro, linguette pesca e salvia, segnalibro pesca a due punte sotto il lato
sinistro, braccia salvia con mani a muffola (pollice incluso), due gambe corte con piedi arrotondati. Nessun naso.

## Parti 2D (`scripts/faces_mina.py`)

Faccia e illustrazioni restano 2D, applicate come decal sulla copertina e sul dorso: occhi ovali verde scuro con riflessi chiari e ciglia
esterne, sopracciglia, guance pesca, bocca. Rametto botanico salvia sulla copertina e due rametti chiari sul dorso.
11 espressioni: neutra, felice, sorpresa, ironica, soddisfatta, pensierosa, delusa, assonnata, guarda lo spettatore, guarda a destra, guarda a sinistra.

## Testato davvero

Render Cycles CPU (Blender 5.3, 48 campioni): turnaround, 11 espressioni, 4 pose (saluta, indica, apre la copertina, sbuca dal telefono)
e una scena con il protagonista, in circa 180 s. La cerniera della copertina e il telefono con la vera schermata Oggi funzionano.

## Differenze note rispetto al design ufficiale

- Il design ufficiale è una illustrazione a gouache 2D; il modello è pulito, in stile pongo/gomma opaca: texture e pennellate non ci sono.
- Le braccia a muffola sono più semplici e i rametti sono disegnati in codice (non ricalcati pixel per pixel dal master).
- Il segnalibro e le linguette sono più semplici dell'originale; nelle linguette non ci sono scritte (come nel master).
- Nessun rig con armatura: le pose sono generate da codice. Il rig riutilizzabile è il passo successivo.
- Nella scena con il protagonista la scala di Mina (circa metà altezza) è una proposta, non una regola del design.
