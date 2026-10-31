# Checklist di rilascio (App Store)

`npm run check:release` deve terminare senza errori prima di qualsiasi build di produzione.

## 1. Account e identità (azioni umane)

- [ ] Apple Developer Program (a pagamento) e accesso ad App Store Connect
- [ ] Account Expo + `npx eas-cli@latest login` e `eas init` → `extra.eas.projectId` in app.json
- [ ] Scegliere il **bundle identifier** definitivo (es. dominio di proprietà invertito) → `ios.bundleIdentifier`
- [ ] Nome commerciale "Spesora": verificare disponibilità su App Store e marchi
- [ ] Pubblicare Privacy Policy, Termini, Supporto su URL reali → `extra.legal` (vedi docs/LEGAL.md)
- [ ] Icona e splash definitivi: quelli attuali sono provvisori (logo originale generato); le icone Android sono ancora quelle predefinite di Expo

## 2. Build

- [x] `eas.json` con profili `development`, `preview`, `production` (presente)
- [ ] `eas build --platform ios --profile preview` → installazione su iPhone di prova
- [ ] TestFlight: build `production`, test interno, poi gruppo esterno con note di test

## 3. Abbonamenti — RevenueCat + App Store Connect

1. App Store Connect → App → Abbonamenti: creare un **gruppo** "Spesora Plus" con due prodotti autorinnovabili:
   - mensile (prezzo iniziale da valutare: 3,49 €)
   - annuale (prezzo iniziale da valutare: 27,99 €), eventuale offerta introduttiva di 7 giorni gratuiti solo per utenti idonei
2. Compilare localizzazioni, screenshot di revisione, accordi "Paid Applications" e dati bancari/fiscali.
3. RevenueCat: creare progetto, app iOS con bundle id, chiave **App Store Connect API** / chiave In-App Purchase, importare i prodotti.
4. Creare l'entitlement `plus` collegato ai due prodotti e un'**offering** `default` con pacchetti `$rc_monthly` e `$rc_annual`.
5. In app: `npx expo install react-native-purchases`, implementare `RevenueCatPurchaseService` (stessa interfaccia `PurchaseService`), chiave pubblica iOS in configurazione, `extra.purchasesMode = "revenuecat"`. Richiede **development build** (non funziona in Expo Go).
6. Test in **sandbox**: acquisto mensile/annuale, annullamento, ripristino, scadenza, periodo di tolleranza, rinnovo, utente non idoneo alla prova.
7. Prima di attivare il paywall: decidere `paywallMode` (`soft` consigliato) e quali funzioni Plus bloccare; verificare che l'abbonamento offra valore continuativo (aggiornamenti del catalogo, pianificazione avanzata) come richiesto dalle linee guida Apple 3.1.2.

## 4. Scheda App Store

- [ ] Categoria: Cibi e bevande (o Stile di vita)
- [ ] Descrizione senza numeri inventati (utenti, risparmi, recensioni)
- [ ] Screenshot iPhone 6,7" e 6,5" delle schermate Oggi, Settimana, Spesa, Ricetta, Dispensa
- [ ] Etichette privacy: "Dati non raccolti" finché non ci sono servizi esterni; con RevenueCat dichiarare identificativi e acquisti
- [ ] Classificazione per età, URL supporto e privacy
- [ ] Nota per la revisione: nessun login; spiegare le notifiche locali

## 5. Contenuti (prima della pubblicazione)

- [x] Catalogo a 156 ricette (`src/data/recipes`), validato da `npm run verify`
- [ ] Revisione umana delle ricette: provarne un campione in cucina, controllare tempi, quantità e allergeni dei prodotti confezionati
- [ ] Revisione GDPR e condizioni di vendita
- [ ] Rilascio graduale (phased release) e canale per feedback volontari (email di supporto)

## 6. Contenuti organici TikTok / Reels (proposta, da non pubblicare senza autorizzazione)

Formato: video verticali 15–30 s girati sullo schermo reale dell'app, voce fuori campo, nessun dato inventato.

1. **"Non sai cosa cucinare questa settimana?"** — apertura app, schermata Oggi con il pasto già deciso, scorrimento della Settimana.
2. **"Fai la spesa tre volte? Organizza gli acquisti in anticipo."** — onboarding con mar/gio/sab, poi le tre liste separate.
3. **"La lista della spesa nasce dalle ricette."** — cambio ricetta, la lista si aggiorna da sola.
4. **"Apri la notifica e scopri cosa cucinare."** — notifica sul blocco schermo → ricetta con timer.
5. **"Cosa resta in frigo?"** — "Ho cucinato" e la dispensa che si aggiorna, con la differenza tra stima e confermato.
6. **"Mangio fuori stasera."** — un tocco, niente sprechi, ricetta riproposta.

Regole: niente promesse di risparmio, percentuali o testimonianze non reali; mostrare l'avviso sugli allergeni quando si parla di esclusioni.
