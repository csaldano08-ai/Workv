# MINA — identità e vincoli di produzione

Il riferimento principale è `master/sources/mina_user_reference.png`, fornito dall’utente. Il modello operativo per tutte le pose è `master/mina_master.png`, generato in Google Flow e verificato visivamente. La precedente mascotte Timo resta intatta.

## Dettagli permanenti

- Ricettario verticale compatto, angoli arrotondati e copertina avorio opaca.
- Dorso salvia a sinistra con due piccoli rametti chiari; blocco pagine crema visibile in alto.
- Elastico verde vicino al bordo destro della copertina.
- Due linguette sul lato destro: pesca sopra, salvia sotto. Nel master sono volutamente semplici, senza scritte.
- Segnalibro pesca a due punte che sporge sotto il lato sinistro.
- Rametto botanico salvia nella parte inferiore della copertina.
- Occhi ovali verde scuro con piccoli riflessi chiari e ciglia superiori esterne, sopracciglia piccole, guance pesca, bocca semplice. Nessun naso: la zona fra occhi e bocca resta avorio.
- Due braccia salvia morbide, mani a muffola, due gambe corte e piedi arrotondati. Mai corpo umano, capelli, vestiti o arti aggiuntivi.

## Proporzioni e inquadratura

Canvas sorgente quadrato 1024×1024. Il master ha bounding box alpha `(180, 120, 886, 906)`: il personaggio completo è alto 786 px, con margini liberi e nessun elemento tagliato. La copertina ha rapporto larghezza/altezza indicativo 0,72; il libro occupa la grande maggioranza dell’altezza del personaggio e le gambe restano corte.

La vista operativa è a tre quarti anteriore, dorso a sinistra. Le pose devono conservare il volume del libro, la posizione relativa di occhi, guance, elastico, rametto e linguette. Una variazione espressiva non deve cambiare la distanza fra gli occhi o trasformare il libro in un volto umano.

Non ritagliare ogni posa sul proprio bounding box per poi ingrandirla indipendentemente: cambierebbe la scala del libro tra stati. Le esportazioni mantengono il canvas e un ancoraggio dichiarato nei metadati. Le pose non sono automaticamente frame intercambiabili di una stessa animazione.

## Linguaggio pittorico e palette

Modern Editorial 2D Gouache Illustration: superfici opache, texture sottile, contorni morbidi, ombre leggere e colori caldi. Il riferimento allegato prevale sulle interpretazioni generiche del personaggio. Niente fotorealismo, CGI, plastica, neon o estetica infantile.

| Colore del brand | Valore | Uso |
| --- | --- | --- |
| Salvia | `#386E55` | Accenti, arti e armonizzazione dei verdi |
| Avorio | `#F6F3EA` | Copertina e superfici chiare |
| Pesca | `#E6A46D` | Guance, segnalibro e linguetta superiore |
| Antracite | `#24332C` | Occhi e dettagli scuri |

Le pennellate del master introducono variazioni naturali di tono. Non ricolorare automaticamente tutto il personaggio con quattro tinte piatte.

## Trasparenza e sorgenti

Google Flow ha prodotto il master su fondale ciano uniforme. L’originale JPEG è conservato in `master/sources/`. La consegna PNG usa alpha reale: il ciano è rimosso e i colori di bordo sono separati dal fondale per ridurre gli aloni. La copertina avorio rimane opaca. Le anteprime su avorio, antracite e pesca sono prove di controllo, non asset per l’app.

Non generare scacchiere: un fondale disegnato a scacchi non equivale a trasparenza. Controllare sempre alpha, margini, sagoma completa e leggibilità su fondi chiari e scuri.

## Ridimensionamento mobile

Le pose definitive sono PNG RGBA 1024×1024; `optimized/` contiene versioni 512×512. Usare `resizeMode="contain"`, mantenere le proporzioni e non tagliare linguette, mani o accessori. Tutti i percorsi sono locali e compatibili con utilizzo offline. Il collegamento nell’app resta a Claude Code.
