# Decisioni e limiti aperti

## Decisioni

1. **Expo SDK 58 + Expo Go**: tutti i moduli usati (SQLite, Notifications, Router, SVG) sono inclusi in Expo Go, quindi l'app si prova sull'iPhone senza build native né account Apple a pagamento.
2. **Cartella `app/` alla radice** (non `src/app/`) come richiesto dalla specifica.
3. **Catalogo nel codice, non in SQLite**: ricette e ingredienti sono dati versionati con l'app, validati da Zod nei test. Le tabelle `recipes`/`ingredients`/`recipe_ingredients`/`recipe_steps` sarebbero solo una copia; il database salva gli ID persistenti. Aggiornare il catalogo = aggiornare l'app.
4. **Preferenze come JSON validato** in `user_preferences` (orari pasti, tempo per giorno e giorni di spesa inclusi) anziché tabelle `meal_schedule_preferences`/`shopping_schedule` separate: un solo punto di validazione, nessuna query relazionale necessaria.
5. **Quantità intere in milli-unità** dell'unità canonica (g, ml, pz). Nessun float persistito; conversioni solo g↔kg e ml↔l. Legumi e pesce in scatola sono dosati a peso **sgocciolato**.
6. **Dispensa come registro di movimenti**: la storia spiega ogni quantità e rende atomiche e idempotenti le operazioni.
7. **Le liste della spesa sono calcolate, non salvate**: si ricalcolano da piano + dispensa confermata. Si salvano solo spunte, acquisti confermati e spese confermate. Così un cambio ricetta aggiorna tutto senza toccare gli acquisti.
8. **Spunta ≠ acquisto**: solo "Conferma acquisti" aggiunge in dispensa (quantità = confezioni suggerite o fabbisogno arrotondato; correggibile).
9. **Allergeni**: ingredienti generici "verificati"; prodotti composti (pesto, pane, dado, salumi…) "non verificati". Con almeno un'esclusione attiva, le ricette con dati non verificati sono escluse. L'app non dichiara mai una ricetta sicura.
10. **Rigenerazione**: conserva pasti non più `planned`, pasti passati e scelte manuali; quando cambiano le preferenze anche le scelte manuali future vengono ricalcolate (potrebbero violare i nuovi vincoli).
11. **Spostare un pasto = scambiarlo** con un altro dello stesso tipo: nessuno slot resta vuoto.
12. **Notifiche** con ID che includono un hash del contenuto: qualsiasi cambiamento produce un nuovo ID, il vecchio viene annullato. Limite 60 in attesa (iOS ne consente 64).
13. **Illustrazioni SVG originali** al posto delle foto: nessun problema di diritti, zero MB di immagini.
14. **Nessun prezzo**: il budget viene salvato ma non usato per affermazioni sul costo.
15. **Test in Node con `node:sqlite`**: lo stesso SQL e le stesse migrazioni dell'app, senza dipendenze native.

## Funzioni rimandate

Widget iOS, riconoscimento foto, scansione scontrini, sincronizzazione familiare, video, assistenti AI, importazione file, account, cloud, prezzi, valori nutrizionali, gating effettivo delle funzioni Plus, RevenueCat reale.

## Limiti aperti

- Catalogo di 156 ricette scritte apposta e validate dagli schemi; una revisione umana (gusto, tempi reali, allergeni) è consigliata prima del lancio. 23 ingredienti del dizionario non ancora usati.
- Dispensa iniziale da onboarding con quantità indicative scelte dall'utente.
- Confezioni "formato comune" generiche: da verificare in negozio.
- Notifiche e tocco ad app chiusa verificati solo nei test unitari e nel codice: **da provare sul dispositivo** (vedi TESTING).
- Il menù azioni su Android usa un foglio personalizzato; Android non è stato provato su dispositivo.
- Sul web (solo demo) le conferme usano le finestre del browser (`src/ui/dialog.ts`) e le notifiche non sono disponibili.
- Backup: il file `spesora.db` sta nella cartella documenti dell'app ed è incluso nei backup iCloud/computer secondo le impostazioni iOS dell'utente (comportamento standard, non escluso dall'app).

## Seconda iterazione

16. **Porzioni come abitudine, non come dieta**: sesso, stile di vita e obiettivo non entrano nei calcoli; contano solo le quantità scelte dall'utente (regole in `portions.ts`). Pasta/riso principali usano la grammatura assoluta indicata; quando sono secondari si scalano in proporzione.
17. **I gusti non escludono**: aumentano il punteggio delle ricette, le esclusioni alimentari restano gli unici vincoli rigidi.
18. **"Economica" senza prezzi**: favorisce ingredienti condivisi e semplici; l'app non afferma risparmi.
19. **Mascotte vettoriale**: una sola sorgente SVG per app e PNG, nessun peso aggiuntivo nell'app.
20. **Immagini ricette con API ufficiale**: niente automazione di Google Flow senza un browser autorizzato dall'utente, niente API non ufficiali o cookie. Immagini incerte escluse dall'app finché non approvate.
21. Il formulario ha 16 passi: una bozza salvata con la versione precedente può riprendere da un passo diverso (accettabile prima del rilascio).
