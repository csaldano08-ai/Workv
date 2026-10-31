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

- Catalogo di 74 ricette (obiettivo 150 per il lancio); 18 ingredienti del dizionario non ancora usati.
- Dispensa iniziale da onboarding con quantità indicative scelte dall'utente.
- Confezioni "formato comune" generiche: da verificare in negozio.
- Notifiche e tocco ad app chiusa verificati solo nei test unitari e nel codice: **da provare sul dispositivo** (vedi TESTING).
- Il menù azioni su Android usa un foglio personalizzato; Android non è stato provato su dispositivo.
- Sul web (solo sviluppo) le finestre `Alert` di conferma non compaiono: conferma spesa, rigenera e cancella dati vanno provati su iPhone.
- Backup: il file `spesora.db` sta nella cartella documenti dell'app ed è incluso nei backup iCloud/computer secondo le impostazioni iOS dell'utente (comportamento standard, non escluso dall'app).
