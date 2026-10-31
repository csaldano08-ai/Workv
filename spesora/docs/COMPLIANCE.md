# Checklist di conformità prima del rilascio

Questo documento elenca cosa è stato fatto nel codice e cosa richiede una **valutazione professionale**. Il fatto che i test passino non rende l'app legalmente conforme.

| Area | Fatto nel prodotto | Da verificare con un professionista |
| --- | --- | --- |
| GDPR e dati sulla salute | Dati solo sul dispositivo; nessun account, analytics o server; esclusioni alimentari mai inviate a terzi; esportazione e cancellazione | Le esclusioni per allergie possono essere dati relativi alla salute (art. 9): base giuridica, informativa, valutazione d'impatto se servono servizi esterni |
| Informativa privacy, Termini, Supporto | Bozza dei contenuti in `docs/LEGAL.md` | Redazione definitiva, titolare, contatti, URL pubblici (nessun dato inventato) |
| Allergeni (Reg. UE 1169/2011) | Allergeni derivati dagli ingredienti; prodotti composti "non verificati" esclusi per chi ha esclusioni; avviso a controllare etichette e contaminazioni | Revisione del dizionario ingredienti; formulazione delle avvertenze |
| "Senza glutine" (Reg. UE 828/2014) | Nessun claim; solo "nessun ingrediente con glutine per sua natura", con invito a verificare etichette e contaminazioni | Ogni futuro claim richiede ≤ 20 mg/kg verificati sul prodotto finito |
| Zuccheri e proteine (Reg. CE 1924/2006) | Nessun claim; "nessun ingrediente aggiunto per dolcificare" distinto dagli zuccheri naturali; proteine "non valutate"; validatore che blocca le diciture | Claim futuri solo con valori nutrizionali verificati (es. tabelle CREA, verificandone le condizioni d'uso) |
| Biologico (Reg. UE 2018/848) | Nessun riferimento "bio" | — |
| App non medica | Nessuna diagnosi, dieta o indicazione per patologie; porzioni come abitudine | Revisione dei testi di store e onboarding |
| Originalità del catalogo | Testi scritti da zero; fonti solo per verifica; stato `rights: original_text` | Verifica a campione di somiglianze con ricettari protetti |
| Immagini | Illustrazioni generate con Google Flow da Codex; condizioni d'uso verificate da Codex il 31/10/2026 (`GOOGLE_FLOW_WORKFLOW.md`) | Conferma dei diritti d'uso commerciale e assenza di elementi di terzi |
| Prezzi | Nessun prezzo inventato; fonti e licenze in `PRICES.md` | Licenza dei dati se si includono riferimenti (es. ODbL) |
| Abbonamenti | Prezzi e prove letti dallo store; ripristino; gestione; scadenza non blocca i dati personali; mock vietato in produzione | Condizioni di vendita, informazioni precontrattuali, recesso, linee guida App Store 3.1.2 (valore continuativo) |
| Informazioni commerciali | — | Titolare, P. IVA, contatti nello store e nelle pagine legali |
