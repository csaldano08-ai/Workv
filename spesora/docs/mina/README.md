# MINA — consegna V4: correzione del design esistente e della mascotte

V4 corregge il restyling precedente, che non era approvato. Non è ripartito da zero: logica, servizi, dati, navigazione e funzioni restano gli stessi. Lo stile dei pulsanti è quello originale dell'app: sono cambiate solo dimensioni e posizioni.

- **Branch:** `claude/bold-darwin-lfb2pr`.
- **Commit:**
  - «MINA V4 (1/3)»: mascotte;
  - «MINA V4 (2/3)»: schermate;
  - «MINA V4 (3/3)»: QC e consegna.

## Le 13 voci della consegna V4

| # | Voce | Dove |
| --- | --- | --- |
| 1 | App corretta | `app/` e `src/`: dettagli in [CHANGELOG.md](CHANGELOG.md#v4--correzione-del-design-esistente-e-della-mascotte-27-novembre-2026) |
| 2 | Mina 2.0 corretta | `src/ui/mascot/mina2/art.ts`, `poses.ts`, `Mina2.tsx` · [mascotte/pose_v4.jpg](mascotte/pose_v4.jpg) |
| 3 | Braccia, mani e pose corrette: continue, distese a riposo, saluto che torna giù | Scheletro unico `BASE_RIG` · [mascotte/gesti_v4.jpg](mascotte/gesti_v4.jpg) (inizio, apertura, mano in alto, ritorno, riposo) |
| 4 | Ingredienti e bordi della borsa corretti | Ordine dei livelli e gruppi in `art.ts`: il bordo anteriore copre la base degli ingredienti |
| 5 | Mascotte coerente ovunque | Mina Chef = Mina 2.0 + cappello e grembiule, stesso scheletro e stessa faccia. Fonte grafica unica, nessuna versione vecchia nella UI · [mascotte/trasformazione_v4.jpg](mascotte/trasformazione_v4.jpg) |
| 6 | Home molto fedele alla reference | `app/(tabs)/index.tsx` · [confronti/misurati/07_home.jpg](confronti/misurati/07_home.jpg) |
| 7 | Tutte le altre pagine aggiornate | Benvenuto, intro, questionario, anteprima, abbonamento, Settimana, Spesa, Dispensa, Ricette, ricetta, Modalità Cucina, Profilo · [CONFRONTO.md](CONFRONTO.md) |
| 8 | Pulsanti originali mantenuti | `src/ui/Button.tsx` non modificato nello stile |
| 9 | Screenshot comparativi | [confronti/misurati/](confronti/misurati/): riferimento · app · sovrapposizione 50% con linee ogni 50 pt. [confronti/](confronti/): affiancati e panoramica. [screenshot/](screenshot/): 375×667, 390×844, 430×932 e «Riduci movimento» |
| 10 | Video della navigazione aggiornata | [video/navigazione_mina.mp4](video/navigazione_mina.mp4): 63 s, app reale, percorso completo. Fotogrammi: [video/navigazione_fotogrammi.jpg](video/navigazione_fotogrammi.jpg) |
| 11 | Changelog tecnico | [CHANGELOG.md](CHANGELOG.md) |
| 12 | Test eseguiti | [TEST.md](TEST.md): tsc, lint, 165 test, `npm run verify`, percorsi Playwright in 3 formati e con «Riduci movimento», video |
| 13 | Differenze residue dalle reference, con motivazione | [CONFRONTO.md](CONFRONTO.md), tabella «Schermata per schermata» |

---

# Consegna precedente (V3, restyling non approvato)

## Le 20 voci della consegna

| # | Voce | Dove |
| --- | --- | --- |
| 1 | App aggiornata | Codice in `app/` e `src/` (vedi [CHANGELOG.md](CHANGELOG.md)) |
| 2 | Logo corretto (parola «Mina» + cestino arancione, nessun ornamento aggiunto) | `src/ui/brand/logoArt.ts`, `MinaLogo.tsx`. Confronto sovrapposto: [confronti/logo_confronto.jpg](confronti/logo_confronto.jpg) (`npx tsx scripts/brand/compare-logo.ts`) |
| 3 | Icona solo con Mina 2.0 | `assets/icon.png`, icona Android adattiva (primo piano, fondo, monocromatica), `favicon.png`, `splash-icon.png`. Generate da `scripts/brand/icons.ts`. Prova con le maschere: [confronti/icone_maschere.jpg](confronti/icone_maschere.jpg) |
| 4 | Oggi fedele al riferimento | `app/(tabs)/index.tsx` · [confronti/07_home.jpg](confronti/07_home.jpg) |
| 5 | Settimana | `app/(tabs)/settimana.tsx` · [confronti/08_settimana.jpg](confronti/08_settimana.jpg) |
| 6 | Spesa | `app/(tabs)/spesa.tsx` · [confronti/09_spesa.jpg](confronti/09_spesa.jpg) |
| 7 | Dispensa | `app/(tabs)/dispensa.tsx` · [confronti/10_dispensa.jpg](confronti/10_dispensa.jpg) |
| 8 | Ricette | `app/(tabs)/ricette.tsx` · [confronti/11_ricette.jpg](confronti/11_ricette.jpg) |
| 9 | Dettaglio ricetta | `app/ricetta/[id].tsx` · [confronti/12_ricetta.jpg](confronti/12_ricetta.jpg) |
| 10 | Intro e onboarding | `app/benvenuto.tsx`, `app/onboarding.tsx`, `src/features/intro/MinaIntro.tsx` · confronti 01–05 |
| 11 | Mina 2.0 animata | Saluto in benvenuto, Oggi e intro. Esulta nel questionario, festeggia nell'anteprima e a lista completata. Calendario in Settimana. Pensierosa negli stati vuoti. Ferma con «Riduci movimento» |
| 12 | Mina Chef nelle sezioni di cucina | Ricette (trasformazione alla prima visita), caricamento del piano (mescola, giro per giro), benvenuto pagina 2, Modalità Cucina, consigli della ricetta |
| 13 | Profilo locale senza account | `app/impostazioni.tsx` (Profilo) · [confronti/13_profilo.jpg](confronti/13_profilo.jpg) (ora aggiornato a V4) |
| 14 | Popup e messaggi ridisegnati | `src/ui/toast.tsx` (messaggi brevi), `src/ui/Notice.tsx` compatto e senza rosso, `InlineError` accanto ai campi. Le conferme restano piccoli dialoghi |
| 15 | Nuova schermata di abbonamento | `app/abbonamento.tsx` · [confronti/06_paywall.jpg](confronti/06_paywall.jpg) |
| 16 | Predisposizione tecnica degli acquisti in-app | RevenueCat iOS e Android, `mustSubscribe`, porta dell'abbonamento: [../restyling/ABBONAMENTI.md](../restyling/ABBONAMENTI.md), [../../compliance/ABBONAMENTI_SICUREZZA.md](../../compliance/ABBONAMENTI_SICUREZZA.md). **Pagamenti non attivi** |
| 17 | Screenshot reali | [screenshot/](screenshot/): 390×844 (tutte), 375×667 e 430×932 (principali), «Riduci movimento» |
| 18 | Confronti riferimento ↔ app | [CONFRONTO.md](CONFRONTO.md) e [confronti/](confronti/) (panoramica: `00_panoramica.jpg`) |
| 19 | Video di navigazione | [video/navigazione_mina.mp4](video/navigazione_mina.mp4) (63 s, app reale) |
| 20 | Changelog e risultati dei test | [CHANGELOG.md](CHANGELOG.md), [TEST.md](TEST.md) |

Altri documenti:
- analisi fatta prima del restyling: [ANALISI.md](ANALISI.md);
- audit di privacy, dati, SDK e sicurezza degli abbonamenti, dalla ricerca del 27 novembre: [../../compliance/README.md](../../compliance/README.md).

## Stato dei pagamenti

Gli acquisti sono **spenti** (`purchasesMode = "disabled"`, `paywallMode = "off"`). Dopo l'anteprima la schermata dell'abbonamento dice che gli abbonamenti non sono ancora attivi e lascia entrare: non c'è alcun acquisto simulato. Il blocco obbligatorio (`paywallMode = "required"`) è pronto, ma si attiva **solo** con acquisti reali funzionanti. Mancano account sviluppatore, prodotti negli store e chiavi RevenueCat: i passi sono in `docs/restyling/ABBONAMENTI.md`.

## Rinomina

Diventa «Mina» ciò che si vede: `app.json → name`, testi, titoli, notifiche e accessibilità.
Restano invariati:
- `slug` e `scheme` (`spesora`);
- nomi di classi e file (`SpesoraService`);
- chiavi di archivio e id delle notifiche;
- il seme del pianificatore (`spesora|data`): cambiarlo modificherebbe i menù già generati.
