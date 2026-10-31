# Architettura

## Livelli

```
app/ (schermate Expo Router)  →  src/features/ (AppProvider, SpesoraService, onboarding, azioni)
                                   →  src/core/domain/ (motori puri, nessuna dipendenza da React Native)
                                   →  src/core/storage/ (interfaccia Db, migrazioni, Repository)
                                   →  src/core/notifications/ (calcolo puro + adattatore Expo)
```

- Le schermate non contengono calcoli: chiamano `run((service, today) => service.azione(...))` dell'`AppProvider`, che esegue l'azione, ricarica lo snapshot e riallinea le notifiche.
- `SpesoraService` è testato in Node con lo stesso SQL dell'app (adattatore `node:sqlite`).

## Motori (src/core/domain)

| Modulo | Ruolo |
| --- | --- |
| `planner.ts` — MealPlannerEngine | Filtra con vincoli rigidi (allergeni, allergeni non verificati se ci sono esclusioni, ingredienti esclusi e non graditi, dieta, strumenti), poi assegna ogni slot con un punteggio: ripetizioni nella settimana e nello storico, varietà di categoria, preferiti (con ritorno periodico), riuso di ingredienti, uso della dispensa, deperibilità rispetto al giorno di spesa, piccola variazione casuale con **seed** (mulberry32). Restituisce motivazioni leggibili e problemi spiegati. |
| `shopping.ts` — ShoppingPlannerEngine | Scorre i pasti futuri in ordine cronologico: prima consuma la dispensa confermata, poi l'eccedenza di confezioni già previste (se conservabili), poi crea una voce nella spesa più vicina **prima** dell'uso (stesso giorno ammesso tranne colazione). Se nessuna spesa precede l'uso: spesa iniziale oggi. |
| `pantry.ts` — PantryEngine | La dispensa è un **registro di movimenti**; la quantità è la somma (mai negativa). Consumo solo a pasto confermato, correzioni assolute, stato "stima" dopo consumi calcolati. |
| `quantity.ts` | Interi in milli-unità (1 g = 1000), scalatura per porzioni, arrotondamenti per la spesa, formati comuni. |
| `dates.ts` | Date `YYYY-MM-DD` con aritmetica UTC (immune all'ora legale); conversione in istanti locali solo per le notifiche. |

## Database SQLite (migrazione v1)

| Tabella | Contenuto |
| --- | --- |
| `user_preferences` | Profilo JSON validato con Zod (include orari pasti, tempo per giorno, giorni di spesa), passo e stato dell'onboarding |
| `notification_settings` | Preferenze dei promemoria |
| `weekly_plans` | Calendari (inizio, fine, seed) |
| `planned_meals` | Pasti: data, tipo, orario, ricetta, porzioni, stato, origine, motivazioni. `UNIQUE(date, meal_type)` |
| `meal_history` | Esiti dei pasti (cucinato, saltato, fuori, altro) |
| `pantry_items` | Basi presenti (q.b.) e scadenze inserite dall'utente |
| `pantry_movements` | Registro della dispensa. Indice unico parziale `(meal_id, ingredient_id) WHERE kind='meal_consumption'` contro il doppio consumo |
| `shopping_trips` / `shopping_items` | Spese confermate, spunte e quantità acquistate |
| `favorite_recipes` | Preferiti |

Catalogo ricette e ingredienti **non** è nel database: è codice versionato con l'app (ID persistenti). Vedi DECISIONS.

- Migrazioni con `PRAGMA user_version`, ognuna in transazione; uno schema più recente viene rifiutato senza toccare i dati.
- Query sempre parametrizzate. Transazioni esclusive (`withExclusiveTransactionAsync`) per cucinare, confermare spese, correggere la dispensa.
- Errori di apertura: schermata con "Riprova", nessuna cancellazione automatica.

## Flussi principali

- **Ho cucinato**: transazione → `UPDATE planned_meals SET status='cooked' WHERE id=? AND status='planned'` (se 0 righe: già fatto) → movimenti di consumo → storico.
- **Cambio ricetta**: aggiorna solo il pasto `planned`; spesa e dispensa prevista sono ricalcolate dallo snapshot; acquisti e consumi passati restano.
- **Notifiche**: `computeNotifications` produce ID deterministici `spesora:<tipo>:<chiave>:<hash del contenuto>`; `diffNotifications` annulla gli ID non più desiderati e programma i nuovi. Il tocco viene gestito da `useLastNotificationResponse` (anche avvio a freddo) e la destinazione è validata da `routing.ts`.
- **Acquisti**: `PurchaseService` con implementazione disabilitata (predefinita) e mock (solo `__DEV__`, in memoria). Nessun entitlement salvato in SQLite.

## Porzioni, gusti, mascotte, immagini

- `src/core/domain/portions.ts`: `ingredientNeed(recipe, ingrediente, persone, porzioni)` è l'unico punto in cui si calcolano le quantità; lo usano pianificatore, spesa, dispensa, stato ingredienti e schermata ricetta.
- `src/core/domain/classify.ts`: classificazione delle ricette (pesce, proteiche, primi, secondi, piatti unici, bowl) e `tasteScore` nel pianificatore.
- Profilo: `portions` e `tastes` dentro `user_preferences` (JSON Zod con valori predefiniti: i profili salvati prima restano validi, nessuna migrazione SQL).
- `src/i18n/assistant.ts`: micro-copy dell'assistente, scelte deterministiche per chiave.
- `src/ui/mascot/`: Timo (sorgente SVG unica), `src/ui/AssistantBubble.tsx`.
- `src/ui/RecipeImage.tsx` + `src/data/recipe-images.ts` (generato): immagine reale o illustrazione di fallback, proporzioni fisse.
- `scripts/images/` + `.github/workflows/recipe-images.yml`: pipeline immagini (vedi IMAGES.md).

## Catalogo, budget, abbonamenti (terza iterazione)

- `src/core/domain/meta.ts` (metadati, ingrediente principale, stagione), `nutrition.ts` (stati delle informazioni alimentari), `prices.ts` (IngredientPriceEngine), `cost.ts` (RecipeCostEngine), `budget.ts` (BudgetMealPlanner e proposta di settimana più economica).
- Validatore del catalogo: diciture vietate, titoli duplicati, duplicati sostanziali (stessa categoria e stessi ingredienti principali).
- `src/features/recipes/search.ts` (indice di ricerca, filtri, sezioni) e `coverage.ts` (matrice di copertura); `scripts/catalog/report.ts`.
- SQLite v2: `ingredient_prices` (prezzi personali), `shopping_trips.actual_cents` (importo pagato).
- `src/core/purchases/revenuecat.ts`: SDK caricato solo se configurato.
- Immagini: `recipe-image-cards.ts` (app) e `recipe-images.ts` (sorgenti PNG, script di Codex).
