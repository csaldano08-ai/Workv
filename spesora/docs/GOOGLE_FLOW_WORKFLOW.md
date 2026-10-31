# Spesora — produzione immagini con Google Flow

Generatore autorizzato: **solo Google Flow attraverso l'interfaccia browser**. Non usare i comandi di generazione della precedente pipeline Gemini API per questa produzione.

Progetto Flow: https://flow.google.com/project/99eff84c-3bfc-443a-86ca-fe29dc506bac

Branch: `claude/bold-darwin-lfb2pr`. Catalogo di riferimento: commit `b351a68`, `RICETTE_IMMAGINI.md` e `ricette_immagini.csv` (156 ricette).

## Ripresa

1. Leggere `IMAGE_GENERATION_PROGRESS.json` e `IMAGE_STYLE_REFERENCE.json`. Conservare tutte le immagini già `validated`.
2. Aprire il progetto Flow nella sessione Google autorizzata. Usare immagini statiche, Nano Banana 2.1, 4:3, una variante per ricetta. Non creare video o collage.
3. Riprendere dai record `pending`. Per i record `generating`, verificare prima se il risultato esiste già nel progetto: lo stato potrebbe riflettere una sessione interrotta.
4. Comporre il master prompt con ingredienti reali e descrizione specifica della preparazione. Se necessario, ricercare l'aspetto del piatto. Usare i campioni approvati come riferimento visivo quando supportato.
5. Aprire ogni risultato nell'editor e controllare individualmente piatto, ingredienti, colori, consistenza, prospettiva e stile. Rifiutare fotorealismo, oggetti deformati, ingredienti sbagliati, scritte e cornici. Limitare a tre tentativi, registrando il problema.
6. Scaricare l'originale dalla voce **1K — Dimensione originale**. Il download può essere JPEG anche se destinato a un PNG: decodificare e convertire realmente. L'originale nativo osservato è 1200×896; la normalizzazione a 1200×900 richiede un ritaglio minimo e ricampionamento.
7. Verificare la corrispondenza tra immagine scaricata e nome CSV prima dell'importazione. Non usare l'ordine temporale dei download senza controllarne il contenuto.
8. Importare solo dopo l'effettiva revisione individuale, usando il comando sotto. Aggiornare il numero di tentativi nel registro quando necessario.
9. Eseguire il checkpoint, controllare i file e creare il commit del lotto. Aggiornare prima il branch remoto e preservare eventuali modifiche concorrenti. Nessun force push.

```powershell
python scripts/images/flow_assets.py status
python scripts/images/flow_assets.py import --filename pasta_al_tonno.png --source C:\percorso\originale.jpg --review "Esito reale della revisione individuale" --flow-url "URL dell'asset Flow"
python scripts/images/flow_assets.py checkpoint
python scripts/images/flow_assets.py audit
```

Dipendenza locale: Python e Pillow. Questi comandi elaborano soltanto file già generati e scaricati tramite Flow. Non generano immagini e non usano API, cookie o credenziali.

`checkpoint` verifica PNG, dimensioni, hash, duplicati, copertura CSV e presenza di una revisione; aggiorna il manifesto, i percorsi e la mappatura statica Expo/Metro. La revisione visiva resta un'azione individuale: lo script non assegna un punteggio semantico automatico.

## Direzione artistica

Ricettario editoriale 2D dipinto a gouache, contorni sottili, ombre pittoriche e colori naturali. Avorio continuo fino ai bordi, stoviglie semplici con piccolo accento salvia. Solo il piatto finito: gli ingredienti del prompt vanno incorporati nella preparazione, senza esposizioni di materie prime, utensili, confezioni, tovaglioli o altri oggetti esterni. Nessuna cornice rettangolare.

I primi otto campioni hanno richiesto correzioni per eliminare cornici e ingredienti esposti intorno al piatto. Le versioni corrette sono quelle validate. Non cambiare arbitrariamente lo stile.

## Trasferimento e limiti

Git HTTPS in questo ambiente richiede `-c http.sslBackend=openssl` per lettura. Il push ha fallito perché il gestore credenziali non disponeva di credenziali utilizzabili. I checkpoint grafici sono stati caricati tramite la normale pagina GitHub **Upload files**, usando la sessione autenticata e il branch indicato; i file di testo possono essere aggiornati attraverso il connettore GitHub. Non estrarre cookie o token dalla sessione.

In caso di accesso scaduto o CAPTCHA, chiedere solo l'intervento necessario e poi riprendere. Rispettare quote e limiti; non acquistare crediti. Questo workflow è riprendibile ma **non costituisce un servizio in esecuzione dopo la fine della chat**.

## Condizioni d'uso

Verifica effettuata il 31 ottobre 2026 sulla FAQ commerciale di Flow e sui termini Google. Google rimanda ai termini e non rivendica la proprietà dei contenuti originali generati. Restano applicabili termini, policy e diritti di terzi; non sono garantite esclusività o tutela d'autore. Non sono state usate fotografie altrui. Conservare il SynthID invisibile; nessuna rimozione o aggiramento dei watermark.

Fonti: https://support.google.com/flow/answer/16353333?hl=en e https://policies.google.com/terms?hl=it

La produzione è completa solo quando `IMAGE_COVERAGE_REPORT.json` riporta **156 PNG validati, nessun mancante e nessun errore**, e tutti i file sono presenti nel branch remoto.

