# Restyling UI e Mina 2.0

La stessa Spesora, con la stessa struttura e le stesse funzioni, ma più moderna, luminosa e accogliente, accompagnata dalla nuova mascotte **Mina 2.0** (la borsetta della spesa) e da **Mina Chef** nelle ricette.

Branch: `claude/spesora-restyling-mina2`. La versione precedente è confrontabile nelle branch `claude/spesora-redesign-bc` e `claude/spesora-ads-concepts`.

## Cosa trovi in questa cartella

| File | Contenuto |
| --- | --- |
| `riferimenti/mina2_foglio_approvato.webp` | Il foglio di Mina 2.0 e Mina Chef fornito dall'utente (riferimento principale) |
| `mina2_tavola.png` | Le 20 pose e le espressioni di Mina 2.0 e Mina Chef come sono nel codice |
| `mina2_animazioni.mp4` | Video (52 s, 30 fps) dei gesti animati, comprese le quattro pose di Mina Chef, registrato dalla demo web reale |
| `riferimenti/mina_chef_style_reference.png` | Il foglio di Mina Chef con le quattro pose (cucchiaio, mescola, serve, checklist) |
| `mina2_confronto_riferimento.jpg` | Mina 2.0 e Mina Chef dell'app accanto al foglio approvato |
| `mina2_confronto_chef.jpg` | Le quattro pose di Mina Chef: foglio sopra, app sotto |
| `home_v3_navigazione.mp4` | Video (13 s) della Home V3: saluto di Mina, card che entrano, preferito, calendario, spesa, tocco su Mina |
| `prima_dopo/home_v3.jpg` | La Home in tre versioni: originale, restyling, Home V3 (sopra e dopo lo scorrimento) |
| `prima_dopo/` | Confronto prima/dopo di 13 schermate, più `00_panoramica.jpg` |
| `screenshot/` | Schermate pulite (PNG, 780×1688) delle pagine principali, per i futuri video |
| `ABBONAMENTI.md` | Cosa è pronto e cosa servirà per collegare App Store e Google Play |
| `CHANGELOG.md` | Changelog tecnico |

I PNG trasparenti delle singole pose (1024 px) sono in `assets/mascot/mina2/`. Documentazione completa della mascotte: [`../MASCOT.md`](../MASCOT.md).

## In breve

- **Mina 2.0** ridisegnata in vettoriale dal foglio approvato, a parti separate: corpo, manico, verdure, foglia, occhi, bocca, braccia con gomito, piedi; Mina Chef con cappello, grembiule e cucchiaio.
- **Animazioni 2D**: saluto, idle, felice, pensierosa, lista completata, ricetta (Mina Chef), promemoria e reazione al tocco. Driver nativo su mobile; ferme con "Riduci movimento".
- **Palette centralizzata a token**: niente più fondo giallastro e verdi spenti; verde come colore principale, pesca solo per accenti. Contrasto AA verificato da un test.
- **Nunito** come carattere dell'app.
- **Home**: saluto con Mina che saluta, ricetta del giorno con la foto in grande, sintesi della settimana in 7 colonne, card compatta della spesa (in alto nei giorni di spesa).
- **Schermate**: Settimana (giorni più leggibili, colore per pasto), Ricette (Mina Chef nel titolo), Ricetta (consigli di Mina Chef), Spesa (Mina che festeggia la lista completata), Dispensa, Impostazioni e pagine secondarie con gli stessi componenti.
- **Intro e onboarding**: stesse domande; barra di avanzamento animata, Mina 2.0 che accompagna, festa finale, punto di inserimento (spento) per il futuro abbonamento.
- **Notifiche**: stessi avvisi e stesse impostazioni; corretto l'avviso di fine settimana, che mostrava la data in formato tecnico.

## Home V3 (seconda richiesta)

La Home non è più una pila di riquadri uguali ma un percorso: **saluto → pasto di oggi → cosa serve → settimana**.

- **Intestazione compatta**: marchio, data, avvisi (apre Notifiche) e impostazioni.
- **Saluto con Mina integrata**: titolo grande con un tratto verde sotto la domanda; Mina in piedi a destra si affaccia sopra la card del pasto (i piedi spariscono dietro la card), su una forma verde tenue di sfondo che la lega alla pagina. Un solo gesto all'apertura, contestuale: saluto, promemoria quando si cucina a breve, festa a giornata finita, pensierosa se mancano ricette. Nessun movimento continuo; toccandola fa un saltello.
- **Pasto di oggi protagonista**: foto grande 16:9 in alto senza cornici, etichette leggibili su fondo bianco (pasto e orario), cuore dei preferiti a cavallo della foto, titolo grande, durata · persone · orario d'inizio in una riga, **«Ti mancano N ingredienti»** calcolato dalla dispensa reale e collegato alla spesa giusta (oppure «Hai tutto in casa»), pulsante **«Cucina ora»** e un pulsante «…» con tutte le azioni di prima (cambia ricetta, sposta, cucinato, mangio fuori…).
- **Spesa contestuale**: la grande card della spesa in cima non c'è più; resta la riga sotto la ricetta e una tessera piccola più in basso.
- **Settimana compatta**: sette tessere con giorno, data e la foto del pasto principale; oggi in verde, i giorni passati più tenui, cestino nei giorni di spesa, spunta sui giorni completati. Accanto, «Calendario».
- **Spesa e dispensa**: due tessere di colore diverso (pesca, verde) con dati reali (prodotti per oggi, prodotti che potrebbero non bastare).
- **Microanimazioni**: card che entrano scaglionate, pulsanti e tessere che si schiacciano al tocco, cuore che rimbalza quando si aggiunge ai preferiti, saluto di Mina; tutto fermo con "Riduci movimento".
- **Stati**: scheletro della pagina mentre i dati non sono pronti, card dedicata quando non ci sono pasti, avvisi e conferme dei pasti invariati.
- **Telefoni bassi** (altezza < 720 pt, es. iPhone SE): foto e Mina più compatte. Su 375×667, 390×844 e 430×932 «Cucina ora» è interamente visibile sopra la barra delle schede senza scorrere.

Le altre schermate usano già gli stessi componenti e la stessa palette; non sono state rifatte (come richiesto). I prossimi passi naturali, con lo stesso linguaggio: intestazioni con l'icona in cerchio verde tenue come «La tua settimana», tessere colorate al posto delle liste nella Dispensa.

## Test eseguiti

| Controllo | Esito |
| --- | --- |
| `npm run verify` (tipi, linter, 148 test, catalogo, immagini, stringhe, sorgenti, configurazione) | **Tutti superati** (7 avvisi di configurazione già noti: URL legali, bundle id, progetto EAS, abbonamenti non attivi) |
| Nuovi test: Mina 2.0 (SVG validi, nessun colore della vecchia Mina, Chef solo in cucina, cinematica delle braccia, nessuna immagine di rete) | 6/6 |
| Nuovi test: contrasto WCAG AA della palette (11 coppie testo/fondo + etichette dei pasti) | 12/12 |
| Nuovo test: avviso di fine settimana con data in italiano | 1/1 |
| Giro completo della demo web (intro → benvenuto → 16 passi del questionario → anteprima → Oggi → Ricetta → Settimana → Ricette → Spesa → lista completata → Dispensa → Impostazioni → Notifiche → Plus, Prezzi, Storico, Aggiungi, Privacy), ripetuto dopo la Home V3 | 22 schermate, **0 errori JavaScript** |
| Home V3 su 375×667, 390×844, 430×932 | «Cucina ora» visibile sopra la barra senza scorrere; titoli su due righe senza tagli; scorrimento fino a settimana e tessere |
| Stesso giro a 375×667 (iPhone SE), 390×844 e 430×932 (iPhone Pro Max) | Nessun testo tagliato o elemento sovrapposto trovato a vista |
| Persistenza: dopo il questionario si ricarica la pagina (Impostazioni, Notifiche, Plus…) | Profilo e piano restano (database locale invariato) |
| Navigazione: schede, ricetta e ritorno, rotte modali e secondarie | Funzionano |
| Animazioni di Mina (fotogrammi del video e della pagina `/mina`) | Livelli allineati, braccia attaccate al corpo, espressioni cambiate dentro il battito di ciglia |
| Dati utente e logica | Nessuna modifica al database, alle migrazioni o ai motori (pianificazione, spesa, dispensa, notifiche) |

Per ripetere le prove:

```bash
npm run verify
npx expo export -p web --output-dir /tmp/spesora-web
node scripts/screenshots/capture.cjs http://localhost:PORTA/ cartella-out [larghezza] [altezza]
node scripts/screenshots/record-mina.cjs http://localhost:PORTA cartella-out/mina.mp4
```

(La cartella esportata va servita con un server statico che rimanda a `index.html` le rotte sconosciute.)

## Limiti

- **Nessuna prova su iPhone o Android reali**: in questo ambiente cloud non ci sono simulatori né Expo Go. Tutte le prove visive sono sulla demo web (Chromium). Le animazioni di Mina su iOS/Android usano il driver nativo e lo stesso codice, ma vanno guardate su un dispositivo prima del rilascio (in particolare fluidità con più Mina sullo schermo).
- **Notifiche**: sul web non esistono, quindi sono verificate solo dai test automatici (calcolo, testi, orari, fasce di silenzio). Permessi e consegna vanno provati su iPhone.
- **"Riduci movimento"** verificato nel codice (ogni animazione lo controlla) ma non attivato in un browser durante le catture.
- **Mina 2.0 e Mina Chef sono ricalcate sui loro fogli** (proporzioni, verdure, viso, mani, colori: vedi «Fedeltà al riferimento» in `docs/MASCOT.md`), ma restano disegni vettoriali: niente grana da acquerello. Mina Chef è lo stesso personaggio in tutte le pose (nel foglio le proporzioni variano un poco da una posa all'altra). La posa con il carrello del primo foglio non è stata realizzata (non serve in nessuna schermata attuale).
- Le nuove pose di Mina Chef (`mixing`, `serving`, `checklist`) sono pronte nel codice, nella vetrina `/mina` e nei PNG per i video, ma non sono ancora usate in una schermata: dove metterle è una scelta da fare.
- Restano dello stile precedente due elementi neutri: le illustrazioni degli ingredienti (caricamento, benvenuto, icone dei reparti) e l'onda verde dell'animazione iniziale. Sono coerenti con la palette ma hanno ancora il contorno scuro.
- La pagina `/mina` (vetrina delle animazioni) esiste solo nella demo web; su telefono rimanda all'app.
- I 7 avvisi di configurazione di `npm run verify` (URL legali, bundle id, EAS, RevenueCat) sono precedenti al restyling e restano da completare per la pubblicazione.
