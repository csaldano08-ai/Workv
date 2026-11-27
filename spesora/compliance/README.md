# Compliance di MINA — audit del codice reale

Cartella interna, **non distribuita con l'app**: Metro include nel pacchetto solo i file importati dal codice, e qui non ce ne sono.
Raccoglie le prove di come Mina è progettata, come suggerito dalla ricerca «Deep Research — MINA» del 27 novembre 2026.

**Data dell'audit:** 27 novembre 2026, branch `claude/bold-darwin-lfb2pr`.

> Questo audit descrive il codice, non sostituisce una verifica legale o fiscale. Le frasi su leggi e store vanno confermate da un professionista sul prodotto finale.

## Documenti

| File | Contenuto |
| --- | --- |
| [INVENTARIO_DATI.md](INVENTARIO_DATI.md) | Ogni dato salvato: tabella, contenuto, sensibilità, dove sta, come si cancella |
| [SDK_RETE_PERMESSI.md](SDK_RETE_PERMESSI.md) | Librerie incluse, comunicazioni di rete, permessi iOS e Android, backup |
| [ABBONAMENTI_SICUREZZA.md](ABBONAMENTI_SICUREZZA.md) | Logica di sblocco Premium attuale, minacce e difese, prove da fare prima della vendita |
| [REGISTRO_LICENZE.md](REGISTRO_LICENZE.md) | Font, librerie, immagini, mascotte, marchio «Mina» |

## Risultato in breve

### Cosa Mina soddisfa già (verificato nel codice)

| Requisito della ricerca | Stato | Prova |
| --- | --- | --- |
| Dati principalmente locali | ✅ | Database SQLite sul telefono (`src/core/storage`). Nell'app non c'è alcuna chiamata di rete (`fetch`, `axios` o simili) |
| Nessun account, email o telefono | ✅ | Nessuna schermata o campo di registrazione. Il profilo è locale |
| Nessun SDK di analisi, crash o pubblicità | ✅ | `package.json`: nessuna dipendenza di questo tipo |
| Nessun dato personale nei log | ✅ | Nessun `console.*` nel codice dell'app. Un test (`checks.test.ts`) blocca `console.log(profile)` e simili |
| Notifiche solo locali | ✅ | Nessun token push richiesto (`getExpoPushTokenAsync` non è usato) |
| Cancellazione completa dei dati locali | ✅ | `wipeAll()` svuota tutte le 12 tabelle (`repository.ts`), poi l'app riparte dal questionario |
| Esportazione dei dati | ✅ | Profilo → I tuoi dati → Esporta (JSON) |
| Premium non basato su una variabile locale | ✅ | Lo stato arriva solo dall'SDK dello store (RevenueCat). Non viene mai salvato nel database. Il servizio simulato rifiuta di avviarsi nelle build di produzione |
| Blocco obbligatorio sicuro | ✅ | `mustSubscribe()` blocca solo con acquisti reali (`isLive`). Uno stato non leggibile non chiude fuori nessuno. Ci sono test |
| Trasparenza prima del questionario | ✅ (pronto) | Con `paywallMode = "required"` il benvenuto dice: «L'accesso completo richiede un abbonamento» |
| Schermata di pagamento chiara | ✅ (pronto) | Prezzo totale e periodo letti dallo store. Rinnovo automatico, Ripristina, Termini e Privacy visibili. Nessuno sconto inventato |
| Pagine legali complete nell'app | ✅ (bozze) | Privacy, Termini e abbonamento, Informazioni legali, Licenze, Aiuto (Profilo → Privacy e condizioni) |
| Funzionamento offline | ✅ | Tutto funziona senza rete. Con l'abbonamento obbligatorio, uno stato sconosciuto non blocca |

### Cosa manca (prima di test con utenti o della vendita)

| Elemento | Priorità | Chi | Nota |
| --- | --- | --- | --- |
| Privacy Policy e Termini pubblicati su un URL pubblico | Alta | Tu + professionista | `app.json → extra.legal.privacyPolicyUrl`, `termsUrl`. Apple e Google li richiedono |
| Dati di chi pubblica (nome, indirizzo, email, telefono) | Alta | Tu | `extra.legal.publisher`. Lo stato di «trader» UE li rende visibili negli store |
| Contatti dell'assistenza | Alta | Tu | `extra.legal.supportEmail` / `supportUrl`. La pagina Aiuto li mostra appena ci sono |
| Prodotti di abbonamento, Paid Apps Agreement, dati fiscali | Critica (vendita) | Tu | App Store Connect / Play Console, RevenueCat ([docs/restyling/ABBONAMENTI.md](../docs/restyling/ABBONAMENTI.md)) |
| Prove reali di acquisto, ripristino, scadenza, rimborso | Critica (vendita) | Sviluppo | Sandbox e TestFlight: elenco in [ABBONAMENTI_SICUREZZA.md](ABBONAMENTI_SICUREZZA.md) |
| Privacy Manifest iOS ed etichette «App Privacy» e «Sicurezza dei dati» | Alta | Sviluppo + tu | Da verificare sulla build nativa. Con RevenueCat attivo si dichiarano gli acquisti |
| Valutazione dei dati alimentari sensibili (allergie) | Alta | Professionista | Restano sul telefono. Vedi [INVENTARIO_DATI.md](INVENTARIO_DATI.md) |
| Verifica del marchio «Mina» (EUIPO/TMview, WIPO) | Alta | Tu + professionista | Esistono altre app con questo nome |
| Diritti d'uso commerciale delle illustrazioni delle ricette | Alta | Tu | [REGISTRO_LICENZE.md](REGISTRO_LICENZE.md) |

## Modifiche proposte (NON applicate: toccano dati o configurazione nativa)

Le propongo qui senza applicarle, come chiede la ricerca stessa («prima l'audit, poi modifiche precise»). Ognuna è piccola e reversibile.

1. **Togliere la domanda facoltativa «Sesso».** Il valore viene salvato (`portions.gender`) ma non entra in nessun calcolo: lo dice anche l'app («Non usato per nessun calcolo»). Minimizzazione: rimuovere la domanda e il campo. Va mantenuta la lettura dei profili già salvati, con default `non_indicato`.
2. **Bloccare i permessi Android ereditati dal modello Expo e inutili per Mina:** `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (`app.json → android.blockedPermissions`). Restano `INTERNET`, che servirà a RevenueCat, e quelli delle notifiche. Da provare su una build Android.
3. **Rimuovere la dipendenza `expo-device`:** è dichiarata in `package.json` ma non è usata da nessun file.
4. **Decidere sui backup Android.** Oggi il Backup automatico è attivo, come da default Expo: il database può finire nel backup dell'account Google dell'utente. Senza account è l'unico modo per portare i dati su un telefono nuovo. Opzioni: lasciarlo attivo e dichiararlo (scelta attuale, già scritta nella pagina Privacy), oppure escluderlo.
5. **Cifrare il database locale** (SQLCipher di `expo-sqlite` con la chiave in SecureStore). Utile se restano le esclusioni per allergia. Richiede una build nativa e una migrazione: da valutare dopo il punto 1 dell'elenco precedente.
6. **Proteggere i contenuti Premium oltre lo sblocco nell'app.** Oggi tutte le ricette sono nel pacchetto. Se in futuro alcuni contenuti dovranno restare riservati, vanno scaricati dopo la verifica dell'abbonamento (serve un server: costi e dati tecnici in più).

## Modifiche già applicate in questa iterazione

- Avviso «L'accesso completo richiede un abbonamento» nel benvenuto, prima del questionario. Compare solo con `paywallMode = "required"`.
- Schermata dell'abbonamento:
  - prezzo totale per periodo (anno o mese), mai un «al mese» che nasconde l'addebito annuale;
  - offerta di prova solo se lo store la dichiara per l'utente;
  - rinnovo automatico e disdetta spiegati;
  - Ripristina, Termini e Privacy sempre visibili;
  - con gli acquisti spenti dice chiaramente che non sono attivi.
- Profilo → «Privacy e condizioni»: Privacy e dati, Termini e abbonamento, Informazioni legali, Licenze e attribuzioni.
- Profilo → «I tuoi dati»: Esporta e Cancella.
- Pagina «Aiuto e supporto».
- Pagina Privacy riscritta su ciò che il codice fa davvero:
  - nessuna analisi o pubblicità;
  - backup iOS e Android;
  - nel caso degli abbonamenti, cosa riceverà RevenueCat.
- Chiave RevenueCat separata per Android (`extra.revenuecat.androidApiKey`). Senza chiave, su quella piattaforma gli acquisti restano spenti.
