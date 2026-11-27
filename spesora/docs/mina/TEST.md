# MINA — test eseguiti e risultati (V4, 27 novembre 2026)

Sono elencati solo i test eseguiti davvero, ciascuno con il proprio esito. In fondo, quello che **non** è stato provato.

## Automatici

| Controllo | Comando | Esito |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | ✅ 0 errori |
| Lint (0 avvisi ammessi) | `npm run lint` | ✅ |
| Test unitari (motore, catalogo, persistenza, notifiche, abbonamenti, contrasto, mascotte, regia, Modalità Cucina) | `npx vitest run` | ✅ 16 file, **165 test** superati |
| Verifica completa (test, immagini 500/500, configurazione) | `npm run verify` | ✅ «Tutti i controlli superati». 7 avvisi attesi per la pubblicazione: URL legali, email di supporto, `bundleIdentifier`, `projectId` EAS, acquisti non attivi |

Test della mascotte riscritti o aggiunti in V4 (`src/test/mina2.test.ts`):
- Mina 2.0 e Mina Chef hanno **lo stesso scheletro**: spalle, lunghezze, spessore, mani. Le pose chef non hanno lunghezze speciali.
- **A riposo le braccia sono quasi distese**: gomito oltre 140°.
- Il saluto da fermo (`welcome`) sta a riposo (`armR == restR`).
- La faccia di Mina Chef ha lo stesso riquadro di Mina 2.0.
- Il grembiule usa i colori del corpo (`C.ivoryShade`). Non c'è più il fianco separato del vecchio chef.
- Due test già presenti, aggiornati sulle nuove pose:
  - nessuna posa fa passare il braccio davanti al viso;
  - le mani di Mina 2.0 non passano sopra gli ingredienti (lattuga, apertura della borsa, ciuffo della carota).

Il test di contrasto (`contrast.test.ts`) gira sui nuovi colori di fondo (avorio `#FDF8F0`, card `#FFFDF8`): tutti gli abbinamenti di testo restano almeno AA 4,5:1.

## Percorsi nell'app reale (demo web, Playwright, Chromium)

Script: `scripts/screenshots/capture-mina.cjs` (22 schermate per esecuzione), data fissa lunedì 23 novembre 2026 alle 9.

| Percorso | Esito |
| --- | --- |
| Primo avvio → intro → benvenuto (3 pagine) → questionario completo (16 domande) → caricamento con Mina Chef → anteprima del piano reale → abbonamento (acquisti spenti dichiarati) → «Continua» → Oggi | ✅ a 375×667, 390×844 e 430×932 |
| Settimana, Spesa, Dispensa, Ricette, apertura di una ricetta, «Inizia a cucinare» (Modalità Cucina), Profilo | ✅ in tutti e tre i formati |
| «Riduci movimento» (`prefers-reduced-motion: reduce`) | ✅ niente intro, Mina ferma, stesso percorso completo |
| Errori JavaScript della pagina | ✅ nessuno: `errori.txt` vuoto in tutte e 4 le esecuzioni finali |
| **Video della navigazione completa** (`record-mina.cjs`, 63 s, 30 fps): intro, benvenuto, questionario, caricamento, anteprima, abbonamento, Oggi, Settimana, Spesa (spunte e «Acquistati»), Dispensa, Ricette (trasformazione in Mina Chef, tessera «Primi»), ricetta con le linguette, Modalità Cucina, Profilo | ✅ registrato dall'app reale e controllato fotogramma per fotogramma: `video/navigazione_fotogrammi.jpg` (uno ogni 2,5 s) |

## Mascotte: fasi delle animazioni

| Controllo | Esito |
| --- | --- |
| Fasi del saluto disegnate dallo scheletro: inizio a riposo, braccio aperto, mano in alto, ritorno, riposo (`mascotte/gesti_v4.jpg`) | ✅ braccio continuo e attaccato alla spalla in ogni fase. Niente gomiti a punta, niente incroci con il corpo |
| 18 pose (`mascotte/pose_v4.jpg`) | ✅ ingredienti dentro la borsa, bordo anteriore davanti, nessuna linea sopra pomodoro o carota, stesse proporzioni tra Mina 2.0 e Mina Chef |
| Fotogrammi in movimento di saluto, successo, pensierosa, preoccupata, indica, soddisfatta, solleva, salta, promemoria, cucina, mescola, servizio | ✅ |
| Gesto «pensierosa» | ✅ il braccio passava davanti alla faccia per un errore nel codice del gesto (stato condiviso modificato). Corretto e rivisto |
| Trasformazione Mina → Mina Chef in Ricette (fotogrammi dal video, `mascotte/trasformazione_v4.jpg`) | ✅ stesso corpo: compaiono cappello, grembiule e cucchiaio. Braccia a riposo prima e dopo |

## Layout (controllo visivo degli screenshot)

| Formato | Esito |
| --- | --- |
| 390×844 | ✅ confronto **misurato** con le 13 reference (`confronti/misurati/`), vedi [CONFRONTO.md](CONFRONTO.md) |
| 375×667 | ✅ dopo le correzioni elencate sotto. Nessun pulsante coperto, nessuna Mina tagliata, nessun testo troncato |
| 430×932 | ✅ nessuna sovrapposizione |
| 390×844 con «Riduci movimento» | ✅ stesse schermate, mascotte ferma |

Difetti trovati e corretti durante questa verifica (V4):
- **375×667, questionario:** Mina in fondo alla domanda restava tagliata dai pulsanti. Ora si misura lo spazio libero: Mina si rimpicciolisce e, se non entra intera, non compare.
- **375×667, anteprima:** Mina tagliata. Ora sugli schermi bassi i giorni mostrati sono 2 e Mina è a 116 pt.
- **375×667, abbonamento:** il pulsante principale finiva sotto i link. Sugli schermi bassi ora resta fisso in basso.
- **Abbonamento:** le card dei piani senza prezzo non riempivano la riga.
- **Modalità Cucina:** sotto il passaggio attivo restava un grande vuoto. Ora il riquadro del passaggio è alto 250 pt.
- **Oggi:** il nome del piatto si spezzava a metà parola («all'amatrician-a»). Ora il testo si rimpicciolisce.
- **Pillole troncate:** «Preparazione» nella ricetta e la terza pillola in Dispensa.

## Non provato (dichiarato)

- **Build native iOS e Android, su simulatore o dispositivo.** In questo ambiente ci sono solo la demo web e i test. Su telefono vanno verificati:
  - fluidità delle animazioni della mascotte (sul web sono fluide, ma non è una misura);
  - splash;
  - transizioni native;
  - notifiche;
  - emoji 👋.
- **Acquisti reali:** acquisto, ripristino, scadenza e rimborso non sono provabili senza account sviluppatore, prodotti e chiavi. Gli acquisti restano **spenti**; le card dei piani non mostrano prezzi.
- **Screen reader** (VoiceOver, TalkBack) su dispositivo. Le etichette e i ruoli ci sono, ma non sono stati ascoltati.
- **Testo di sistema ingrandito al massimo** su dispositivo (limite dell'app 1,8×).
