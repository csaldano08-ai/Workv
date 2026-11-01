# Spesora su iPhone: cosa serve, in parole semplici

Stato: l'app funziona e supera tutti i controlli tecnici (`npm run verify`). Per provarla su un iPhone e poi pubblicarla mancano passaggi che solo tu puoi fare, perché richiedono i tuoi account e i tuoi dati. Io non posso inventarli né registrarli al posto tuo.

## A. Provarla sul tuo iPhone (gratis, subito)

1. Sul computer: `cd spesora`, poi `npm install`, poi `npm start`.
2. Sull'iPhone installa l'app **Expo Go** dall'App Store e inquadra il codice QR che compare nel terminale.
3. Se computer e iPhone non sono sulla stessa rete Wi‑Fi: `npm run start:tunnel`.

Con Expo Go funzionano calendario, ricette con immagini, spesa, dispensa e promemoria. Gli acquisti no (non servono per provare).

## B. Build per TestFlight (prova con altre persone) — servono i tuoi account

| Cosa | Dove | Costo |
| --- | --- | --- |
| Account Apple Developer | developer.apple.com | 99 €/anno |
| Account Expo | expo.dev | gratis |
| Identificativo dell'app (bundle ID, es. `it.tuonome.spesora`) | App Store Connect | incluso |

Poi, sul computer:

1. `npx eas-cli login`
2. `npx eas-cli init` → scrive `extra.eas.projectId` in `app.json`
3. Scrivere in `app.json` il tuo `ios.bundleIdentifier`
4. `npx eas-cli build --platform ios --profile preview` (Expo guida la creazione dei certificati)
5. `npx eas-cli submit --platform ios` per mandarla a TestFlight

## C. Per vendere o pubblicare — mancano questi 7 dati (`npm run check:release`)

1. Account **RevenueCat** + chiave pubblica iOS + prodotti degli abbonamenti creati in App Store Connect → `extra.purchasesMode = "revenuecat"` e `extra.revenuecat.iosApiKey`. I prezzi (3,49 €/mese e 27,99 €/anno) vanno impostati da te in App Store Connect.
2. Indirizzo web della **informativa privacy** (pagina pubblicata da te)
3. Indirizzo web dei **termini d'uso**
4. Indirizzo web del **supporto**
5. **Email di supporto**
6. `ios.bundleIdentifier`
7. `extra.eas.projectId`

Nota: i testi legali devono essere scritti o rivisti da te o da un professionista. In `docs/LEGAL.md` c'è una traccia di cosa devono coprire, non un documento valido.

## D. Prima di dichiarare l'app "pronta alla vendita"

- Tutte le 500 ricette sono ancora "da rivedere" dal punto di vista culinario e degli allergeni: nessuna è approvata. Serve una persona competente (vedi `docs/REVIEW.md`).
- Controllare a mano le illustrazioni (schede in `docs/`).
- Provare l'app su un iPhone reale con promemoria e notifiche.
- Decidere cosa fare dei 559 MB di immagini originali nel repository (Git LFS o spostarli).

Appena mi dai i dati del punto C li inserisco io nella configurazione e rilancio i controlli.
