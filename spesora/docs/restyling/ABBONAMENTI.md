# Abbonamenti — cosa è pronto e cosa servirà

In questa fase **nessun pagamento è attivo**: `app.json → extra.purchasesMode = "disabled"` e `paywallMode = "off"`. Non ci sono prezzi nel codice, nessun acquisto simulato fuori dalla modalità sviluppo, nessuna funzione bloccata.

## Già pronto nel codice

| Cosa | Dove |
| --- | --- |
| Interfaccia unica degli acquisti (`PurchaseService`): offerte, acquisto, ripristino, gestione, stato dell'abbonamento | `src/core/purchases/types.ts`, `services.ts` |
| Implementazione RevenueCat, caricata solo con `purchasesMode = "revenuecat"` e una chiave pubblica | `src/core/purchases/revenuecat.ts` |
| Registro delle funzioni Plus e regola di accesso (`canUse`: blocca solo con `paywallMode = "hard"`) | `src/core/purchases/features.ts` |
| Schermata Spesora Plus (prezzi letti dallo store, mai scritti nel codice) | `app/plus.tsx` |
| **Nuovo**: punto di inserimento a fine onboarding, separato e configurabile | `src/features/paywall/PaywallSlot.tsx`, usato in `app/onboarding.tsx` (anteprima della settimana) |

`PaywallSlot` con `paywallMode = "off"` non mostra nulla. Con `soft` mostra un invito non bloccante che apre `/plus`. In nessun caso blocca il completamento dell'onboarding: l'utente arriva sempre alla sua settimana. Lo stato dell'utente (profilo completato, settimana generata) è già salvato da `completeOnboarding` prima di entrare nell'app, quindi il futuro paywall non interferisce con i dati.

## Decisioni da prendere prima di attivare

1. **Piano gratuito**: quali funzioni restano libere (oggi: calendario, ricette di base, lista della spesa, promemoria, preferenze).
2. **Funzioni Plus**: quali voci di `PLUS_FEATURES` bloccare davvero.
3. **Modalità**: `soft` (invito, consigliato all'inizio) o `hard` (blocco delle sole funzioni Plus).
4. **Prezzi, periodi, prova gratuita**: si decidono negli store, non nel codice.

## Apple (App Store)

1. Contratto **Paid Applications** firmato in App Store Connect, dati bancari e fiscali.
2. App Store Connect → Abbonamenti: gruppo «Spesora Plus» con un prodotto mensile e uno annuale; nomi, descrizioni e prezzi; eventuale prova gratuita come offerta introduttiva.
3. RevenueCat: progetto, app iOS con il bundle id, chiave In-App Purchase (App Store Connect API), prodotti importati, entitlement `plus`, offering `default` (`$rc_monthly`, `$rc_annual`).
4. `app.json → extra.revenuecat.iosApiKey` = chiave **pubblica** iOS (`appl_…`); `purchasesMode = "revenuecat"` solo nelle build native.
5. **Development build / TestFlight** (gli acquisti non funzionano in Expo Go) e prova in **Sandbox**.
6. Link a Termini e Privacy nella schermata Plus (già previsti in `extra.legal`), pulsante «Ripristina acquisti» (presente), testo di rinnovo automatico (linee guida 3.1.2).

## Google (Play Store)

1. Account sviluppatore Google Play con **profilo pagamenti** attivo.
2. Play Console → Monetizza → Abbonamenti: abbonamento «Spesora Plus» con piani base mensile e annuale; eventuale offerta di prova.
3. RevenueCat: app Android con il package name, **service account** Google Cloud con accesso alla Play Developer API, prodotti importati e collegati allo stesso entitlement `plus` e alla stessa offering.
4. Codice: aggiungere `extra.revenuecat.androidApiKey` (chiave pubblica `goog_…`) e sceglierla in `revenuecat.ts` in base a `Platform.OS` (oggi è letta solo la chiave iOS).
5. Build caricata almeno nel canale **test interno** (Google richiede un'app pubblicata in un canale per vendere abbonamenti) e prova con un **license tester**.

## Dopo l'attivazione

- Aggiornare le etichette privacy (identificativi e acquisti tramite RevenueCat).
- Decidere se mostrare `PaywallSlot` anche altrove: aggiungere un valore a `PaywallPlacement`, senza spargere controlli nelle schermate.
- Test: annullamento, rete assente, ripristino su un secondo dispositivo, scadenza, periodo di tolleranza (già coperti dall'implementazione, da verificare su dispositivo).
