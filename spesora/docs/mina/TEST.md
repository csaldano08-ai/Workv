# MINA — test eseguiti e risultati (27 novembre 2026)

Sono elencati solo i test eseguiti davvero, ciascuno con il proprio esito. In fondo, quello che **non** è stato provato.

## Automatici

| Controllo | Comando | Esito |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | ✅ 0 errori |
| Lint (0 avvisi ammessi) | `npm run lint` | ✅ |
| Test unitari (motore, catalogo, persistenza, notifiche, abbonamenti, contrasto, mascotte, regia, Modalità Cucina) | `npx vitest run` | ✅ 16 file, **164 test** superati |
| Verifica completa (test, immagini 500/500, configurazione) | `npm run verify` | ✅ «Tutti i controlli superati». Avvisi attesi per la pubblicazione: URL legali, email di supporto, `bundleIdentifier`, `projectId` EAS, acquisti non attivi |

Test nuovi o aggiornati in questa iterazione (`src/test/purchases.test.ts`):
- chiave dell'SDK per piattaforma: senza la chiave Android, su Android gli acquisti restano spenti;
- `mustSubscribe`: si blocca solo con `required`, acquisti reali e stato `none` o `expired`; mai con stato `unknown` né con acquisti spenti;
- `canUse`: nessuna funzione bloccata con acquisti spenti o stato sconosciuto.

Il test di contrasto (`contrast.test.ts`) gira sulla nuova palette: tutti gli abbinamenti di testo sono almeno AA 4,5:1. Il bianco sul verde `#1F6B4A` è a 6,4:1.

## Percorsi nell'app reale (demo web, Playwright, Chromium)

Script: `scripts/screenshots/capture-mina.cjs`, data fissa lunedì 23 novembre 2026 alle 9.

| Percorso | Esito |
| --- | --- |
| Primo avvio → intro → benvenuto (3 pagine) → questionario completo (16 domande, risposte predefinite, 2 persone, prodotti in dispensa) → caricamento → anteprima del piano reale → abbonamento (acquisti spenti dichiarati) → «Continua» → Oggi | ✅ in tutti e tre i formati |
| Settimana, Spesa, Dispensa, Ricette, apertura di una ricetta dalla griglia, «Inizia a cucinare» (Modalità Cucina), Profilo dall'ingranaggio | ✅ |
| Spunta di prodotti in Spesa, filtro «Acquistati», tessera «Primi», linguette Preparazione e Consigli, gruppo «Privacy e condizioni» | ✅ (video `video/navigazione_mina.mp4`) |
| Errori JavaScript della pagina durante i percorsi | ✅ nessuno (`errori.txt` vuoto in tutte le esecuzioni) |
| «Riduci movimento» (`prefers-reduced-motion: reduce`) | ✅ niente intro, Mina ferma, stesso percorso completo senza errori |

Salvataggio delle risposte: il questionario salva a ogni modifica (`saveOnboardingStep`, già coperto da `service.test.ts`). Il percorso completo arriva all'anteprima con le risposte date.

## Layout (controllo visivo degli screenshot)

| Formato | Esito |
| --- | --- |
| 375×667 (iPhone SE) | ✅ pulsanti principali sopra la barra delle schede e mai coperti. Settimana a chip scorrevole in Oggi. Nessuna sovrapposizione |
| 390×844 (iPhone 14) | ✅ confronti con il riferimento in `confronti/` |
| 430×932 (iPhone Pro Max) | ✅ corretti dopo il controllo: «Lista della spesa» tagliata nella tessera rapida (ora «Spesa»), terza pillola della Dispensa fuori schermo (ora le pillole si distribuiscono sulla riga), «Preparazione» tagliata nella ricetta (ora le pillole hanno la larghezza del testo) |

Difetti trovati e corretti durante le verifiche:
- nelle schede precaricate la parola del logo spariva sul web (id della sfumatura ripetuto);
- frase ripetuta nella schermata dell'abbonamento;
- tessera «Spuntino» allungata su tutta la riga;
- banner «Ti mancano…» su due righe.

## Non provato (dichiarato)

- **Build native iOS e Android, su simulatore o dispositivo.** In questo ambiente ci sono solo la demo web e i test. Su telefono vanno verificati in particolare:
  - icone adattive e maschere reali;
  - splash;
  - transizioni native;
  - notifiche;
  - aspetto dell'emoji 👋 (sul web usa Noto Color Emoji).
- **Acquisti reali:** acquisto, ripristino, scadenza, rimborso e offline non sono provabili senza account sviluppatore, prodotti e chiavi. Elenco delle prove in `compliance/ABBONAMENTI_SICUREZZA.md`. Gli acquisti restano **spenti**.
- **Screen reader** (VoiceOver, TalkBack) su dispositivo. Le etichette e i ruoli ci sono, ma non sono stati ascoltati.
- **Testo di sistema ingrandito al massimo** su dispositivo. Il limite dell'app è 1,8×, ma non è stato provato su telefono.
- **Prestazioni su un telefono reale.** Sul web la navigazione è fluida, ma non è una misura.
