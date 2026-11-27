# Abbonamenti e sicurezza dell'accesso Premium

## Come funziona oggi (codice)

| Pezzo | File | Comportamento |
| --- | --- | --- |
| Modalità acquisti | `app.json → extra.purchasesMode` | `disabled` (oggi), `mock` (solo sviluppo), `revenuecat` (reale) |
| Servizio acquisti | `src/core/purchases/services.ts`, `revenuecat.ts` | `Disabled` non mostra prezzi e non attiva nulla. `Mock` lancia un errore nelle build di produzione. `RevenueCat` si attiva solo con la chiave della piattaforma |
| Stato dell'abbonamento | `src/features/paywall/subscription.ts` | Letto dall'SDK a ogni apertura e a ogni ritorno in primo piano. **Mai salvato nel database** e senza alcun flag locale «premium = true» |
| Regola di accesso | `src/core/purchases/features.ts` → `mustSubscribe()`, `canUse()` | Blocca solo con `paywallMode = "required"` (o `hard` per le singole funzioni), **acquisti reali attivi** e stato `none` o `expired`. Lo stato `unknown` (store irraggiungibile senza dati in memoria) non blocca |
| Porta | `SubscriptionGate` nel layout radice | Porta su `/abbonamento` da qualunque pagina, tranne le pagine legali e l'Aiuto |
| Schermata | `app/abbonamento.tsx` | Prezzo totale e periodo, prova solo se lo store la dichiara, rinnovo automatico, Ripristina, Termini, Privacy, Gestisci |
| Flusso | `app/onboarding.tsx` | Questionario → anteprima del piano reale → abbonamento → app. Con gli acquisti spenti la schermata lo dice e lascia entrare |

Test automatici (`src/test/purchases.test.ts`):
- mappatura dello stato da `CustomerInfo` (attivo, tolleranza, scaduto, assente);
- errori dello store;
- pacchetti letti dallo store;
- chiave per piattaforma;
- `mustSubscribe` e `canUse` con acquisti spenti, attivi e stato sconosciuto;
- nessun servizio simulato in produzione.

## Minacce e difese (riferimento: OWASP MASVS)

| Minaccia | Difesa attuale | Da fare prima della vendita |
| --- | --- | --- |
| Modificare un flag «premium» locale | Il flag non esiste: lo stato arriva dall'SDK dello store | — |
| Acquisto inventato | RevenueCat verifica la ricevuta sui server di Apple e Google (StoreKit 2, Play Billing) prima di concedere l'entitlement | Attivare le notifiche server dello store verso RevenueCat |
| Rimborso o revoca dopo lo sblocco | Lo stato viene riletto a ogni apertura e a ogni ritorno in primo piano: un entitlement revocato torna `expired` o `none` | Provare un rimborso in Sandbox e verificare il blocco |
| Abbonamento su un altro telefono | «Ripristina acquisti» (stesso account Apple o Google) | Provare il ripristino su un secondo dispositivo. iPhone e Android non si condividono senza un account comune (limite da dichiarare, già scritto in Termini e Aiuto) |
| Store irraggiungibile (offline) | Stato `unknown` → non si blocca chi ha già pagato | Decidere se tenere questa scelta «aperta per errore» (consigliata per non penalizzare chi paga) |
| App modificata (jailbreak, root, ripacchettamento) | Firma dello store. Nessuna difesa assoluta è possibile su un dispositivo controllato dall'utente | Valutare controlli d'integrità proporzionati. Se ci saranno contenuti davvero riservati, scaricarli dopo la verifica (serve un server) |
| Segreti nel pacchetto | Solo la chiave pubblica dell'SDK | — |
| Librerie vulnerabili | — | `npm audit` e aggiornamenti a ogni rilascio |

## Prove da fare prima di attivare la vendita (TestFlight / test interno Google)

1. Acquisto mensile e annuale in Sandbox: l'entitlement diventa attivo e si entra nell'app.
2. Annullamento durante l'acquisto: messaggio «nessun addebito», si resta sulla schermata.
3. Errore di rete durante l'acquisto: messaggio comprensibile, nessuno stato attivo.
4. Ripristino sullo stesso e su un secondo dispositivo.
5. Scadenza (in Sandbox gli abbonamenti scadono in pochi minuti): con `required` l'app torna alla schermata dell'abbonamento, i dati restano.
6. Rimborso o revoca: lo stato si aggiorna alla riapertura.
7. Periodo di tolleranza (problema di pagamento): l'accesso resta, con il messaggio dedicato.
8. Apertura offline con abbonamento attivo: l'accesso resta (stato dall'SDK o `unknown`).
9. Prova gratuita (se configurata): mostrata solo agli utenti idonei, con il prezzo che si pagherà dopo.
10. Link Termini, Privacy, Gestisci funzionanti. Testo del rinnovo automatico visibile prima dell'acquisto.

Solo dopo queste prove: `purchasesMode = "revenuecat"`, chiavi pubbliche iOS e Android, `paywallMode = "required"`. Il benvenuto mostrerà da solo l'avviso «L'accesso completo richiede un abbonamento».
