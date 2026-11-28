# Mina — UI refinement + localizzazione internazionale (consegna)

Branch `claude/bold-darwin-lfb2pr`. Dettagli tecnici in [CHANGELOG.md](CHANGELOG.md); copertura misurata in
[COPERTURA.md](COPERTURA.md); come aggiungere testi o lingue in [GUIDA_TRADUZIONE.md](GUIDA_TRADUZIONE.md).

| # | Voce | Dove |
| --- | --- | --- |
| 1 | Codice aggiornato | `app/`, `src/i18n/`, `src/ui/illustrations/`, `src/data/ingredientSymbols.ts` |
| 2 | Home migliorata (card del pasto alta quanto il contenuto, foto a colonna intera, titoli lunghi) | `app/(tabs)/index.tsx` · [confronti/6lingue_04_oggi.jpg](confronti/6lingue_04_oggi.jpg) |
| 3 | Lista della spesa migliorata (icone per ingrediente, reparti comprimibili, importo nel pannello di conferma) | `app/(tabs)/spesa.tsx` · [confronti/6lingue_06_spesa.jpg](confronti/6lingue_06_spesa.jpg) |
| 4 | Modalità Cucina riordinata (card adattiva, allergeni compatti, Mina Chef veritiero) | `app/cucina/[id].tsx` · [confronti/6lingue_10_cucina.jpg](confronti/6lingue_10_cucina.jpg) |
| 5 | Scelta lingua nell'onboarding (primo passo, lingua del telefono preselezionata) | `src/features/onboarding/registry.tsx`, `src/ui/mina/LanguagePicker.tsx` · [confronti/6lingue_02_lingua.jpg](confronti/6lingue_02_lingua.jpg) |
| 6 | Scelta lingua nelle impostazioni (Profilo → Lingua, senza perdita di dati) | `app/lingua.tsx` · [confronti/6lingue_12_lingua.jpg](confronti/6lingue_12_lingua.jpg) |
| 7 | Sistema centralizzato di localizzazione | `src/i18n/index.ts`, `languages.ts`, `content.ts`, `locales/` |
| 8 | Traduzioni disponibili e copertura effettiva | [COPERTURA.md](COPERTURA.md): interfaccia 1038/1038 chiavi in 6 lingue; ingredienti 296/296 e nomi delle ricette 500/500; procedimenti solo in italiano (dichiarato) |
| 9 | Screenshot nelle 6 lingue | [screenshot/390x844/](screenshot/390x844/) e [screenshot/375x667/](screenshot/375x667/), una cartella per lingua; tavole affiancate in [confronti/](confronti/) |
| 10 | Video di navigazione | [video/navigazione_lingue.mp4](video/navigazione_lingue.mp4) (79 s, app reale); fotogrammi in [video/navigazione_fotogrammi.jpg](video/navigazione_fotogrammi.jpg) |
| 11 | Changelog tecnico | [CHANGELOG.md](CHANGELOG.md) |
| 12 | Test eseguiti e limiti | [CHANGELOG.md § 7–8](CHANGELOG.md#7-test-eseguiti) |

Confronto con le reference approvate: [confronti/confronto_tre_schermate.jpg](confronti/confronto_tre_schermate.jpg)
(reference in alto, app reale sotto). Le reference sono in [riferimenti/](riferimenti/).

**Distribuzione per paese.** Non c'è nessuna lista di paesi nel codice. La lingua è una scelta dell'utente; i paesi di
distribuzione si configurano negli store (App Store Connect, Google Play Console) in base ai requisiti commerciali,
fiscali e normativi di ciascun mercato.
