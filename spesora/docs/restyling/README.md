# Restyling UI e Mina 2.0

La stessa Spesora, con la stessa struttura e le stesse funzioni, ma più moderna, luminosa e accogliente, accompagnata dalla nuova mascotte **Mina 2.0** (la borsetta della spesa) e da **Mina Chef** nelle ricette.

Branch: `claude/spesora-restyling-mina2`. La versione precedente è confrontabile nelle branch `claude/spesora-redesign-bc` e `claude/spesora-ads-concepts`.

## Cosa trovi in questa cartella

| File | Contenuto |
| --- | --- |
| `riferimenti/mina2_foglio_approvato.webp` | Il foglio di Mina 2.0 e Mina Chef fornito dall'utente (riferimento principale) |
| `mina2_tavola.png` | Le 17 pose e le espressioni di Mina 2.0 come sono nel codice |
| `mina2_animazioni.mp4` | Video (40 s, 30 fps) dei gesti animati, registrato dalla demo web reale |
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

## Test eseguiti

| Controllo | Esito |
| --- | --- |
| `npm run verify` (tipi, linter, 148 test, catalogo, immagini, stringhe, sorgenti, configurazione) | **Tutti superati** (7 avvisi di configurazione già noti: URL legali, bundle id, progetto EAS, abbonamenti non attivi) |
| Nuovi test: Mina 2.0 (SVG validi, nessun colore della vecchia Mina, Chef solo in cucina, cinematica delle braccia, nessuna immagine di rete) | 6/6 |
| Nuovi test: contrasto WCAG AA della palette (11 coppie testo/fondo + etichette dei pasti) | 12/12 |
| Nuovo test: avviso di fine settimana con data in italiano | 1/1 |
| Giro completo della demo web (intro → benvenuto → 16 passi del questionario → anteprima → Oggi → Ricetta → Settimana → Ricette → Spesa → lista completata → Dispensa → Impostazioni → Notifiche → Plus, Prezzi, Storico, Aggiungi, Privacy) | 22 schermate, **0 errori JavaScript** |
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
- **Mina 2.0 è un nuovo disegno vettoriale** fedele al foglio approvato (forme, colori, proporzioni, varianti), non una copia pixel per pixel: è ciò che permette di animarla a parti separate. Le pose con il carrello del foglio non sono state realizzate (non servono in nessuna schermata attuale).
- Restano dello stile precedente due elementi neutri: le illustrazioni degli ingredienti (caricamento, benvenuto, icone dei reparti) e l'onda verde dell'animazione iniziale. Sono coerenti con la palette ma hanno ancora il contorno scuro.
- La pagina `/mina` (vetrina delle animazioni) esiste solo nella demo web; su telefono rimanda all'app.
- I 7 avvisi di configurazione di `npm run verify` (URL legali, bundle id, EAS, RevenueCat) sono precedenti al restyling e restano da completare per la pubblicazione.
