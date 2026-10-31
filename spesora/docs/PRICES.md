# Prezzi e budget

## Stato dei dati

- **Prezzi di riferimento inclusi nell'app: 0.** `REFERENCE_PRICES` in `src/core/domain/prices.ts` è vuoto di proposito.
- Durante lo sviluppo nessuna delle fonti candidate era raggiungibile da questo ambiente (rete bloccata), quindi **non è stato possibile verificarne licenza, copertura e formato**. Nessun prezzo è stato inventato.
- I costi in euro compaiono solo per gli ingredienti di cui l'utente inserisce un prezzo (Impostazioni → Prezzi) o, in futuro, per quelli coperti da una fonte verificata.

## Fonti da valutare (non ancora verificate)

| Fonte | Cosa offre (da verificare) | Punti critici per l'uso commerciale |
| --- | --- | --- |
| Osservatorio prezzi MIMIT | Rilevazioni su alcuni prodotti e territori | Copertura alimentare limitata; licenza dei dati e riuso da verificare |
| Istat | Soprattutto **indici** (inflazione), alcuni prezzi medi | Un indice non è un prezzo al supermercato: non usarlo come tale |
| Open Prices (Open Food Facts) | Prezzi segnalati dagli utenti, per prodotto/negozio | Licenza ODbL: attribuzione e condivisione allo stesso modo del database derivato; copertura italiana da misurare |
| Dati inseriti dagli utenti | Prezzi personali | Restano sul telefono; validi solo per quell'utente |

Da escludere: scraping dei siti dei supermercati, collegamento ad account dei supermercati.

## Come funziona il motore

- `IngredientPriceEngine`: prezzo per confezione + quantità di riferimento, fonte, data, affidabilità; prezzo personale prioritario; **obsoleto** dopo 180 giorni (segnalato, non scartato); importi in centesimi interi.
- `RecipeCostEngine`: costo degli ingredienti consumati (quantità × prezzo) distinto dal **costo alla cassa** delle confezioni intere; completezza `completa` / `parziale` / `assente`.
- `BudgetMealPlanner`: con il budget attivo il calendario preferisce ricette che richiedono meno prodotti nuovi e riutilizzano quelli già previsti o in dispensa; se i prezzi sono noti pesa anche il costo marginale. Le esclusioni alimentari vengono prima; pasti e porzioni non vengono mai ridotti.
- "Rendi questa settimana più economica": proposta di sostituzioni da confermare. Mostra un risparmio in euro solo se prima e dopo hanno stime complete; altrimenti mostra la riduzione dei prodotti da comprare.
- Budget mensile → riferimento settimanale ×12/52. La stima riguarda solo i pasti organizzati in Spesora (o la parte di spesa indicata).
- La spesa reale è registrata solo se l'utente inserisce l'importo pagato alla conferma.

## Aggiornamento futuro dei riferimenti

Pipeline controllata: fonte con licenza compatibile → normalizzazione per ingrediente canonico e formato → data e area → revisione → rilascio con l'app. Nessun backend necessario.
