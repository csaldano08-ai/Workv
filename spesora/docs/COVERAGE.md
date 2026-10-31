# Copertura del catalogo

Generato da `npm run catalog:report`. Ricette: **500** · ingredienti: **296** · validazione strutturale: **superata** · diciture vietate: **0**.

## Distribuzione editoriale

| Categoria | Ricette |
| --- | ---: |
| Colazioni dolci e salate | 97 |
| Primi, riso, cereali e zuppe | 121 |
| Secondi | 95 |
| Legumi, verdure e piatti unici | 134 |
| Spuntini e merende (solo spuntino) | 53 |

Una ricetta può valere per più pasti. Cucina italiana (tradizionale, regionale, quotidiana): 390 (78%). italiana_quotidiana: 233 · italiana_regionale: 82 · italiana_tradizionale: 75 · internazionale: 110.

## Stato di revisione

- `needs_culinary_review`: 500

Nessuna ricetta è `approved_for_release`: serve una revisione culinaria umana (vedi docs/REVIEW.md).

## Ricette compatibili per profilo e pasto

Stessi vincoli rigidi del motore (dieta, allergeni esclusi, allergeni non verificati). Tutti gli strumenti disponibili. Soglia di varietà settimanale: 7.

| Profilo | colazione | pranzo | cena | spuntino |
| --- | ---: | ---: | ---: | ---: |
| Onnivoro | 97 | 350 | 350 | 110 |
| Pescetariano | 96 | 273 | 273 | 107 |
| Vegetariano | 93 | 214 | 214 | 102 |
| Vegano | 47 | 134 | 134 | 63 |
| Onnivoro · 15 min | 51 | 28 | 28 | 69 |
| Onnivoro · 30 min | 81 | 186 | 186 | 91 |
| Onnivoro · 60 min | 90 | 310 | 310 | 101 |
| Vegetariano · 20 min | 60 | 45 | 45 | 72 |
| Vegano · 20 min | 31 | 25 | 25 | 48 |
| Senza glutine (ingredienti) | 48 | 154 | 154 | 61 |
| Senza latte | 37 | 168 | 168 | 46 |
| Senza uova | 50 | 203 | 203 | 62 |
| Senza frutta a guscio | 55 | 215 | 215 | 59 |
| Senza pesce, crostacei, molluschi | 57 | 179 | 179 | 65 |
| Senza soia | 55 | 212 | 212 | 64 |
| Senza sesamo, sedano, senape | 57 | 202 | 202 | 61 |
| Senza latte, uova, frutta a guscio | 36 | 165 | 165 | 43 |
| Vegano · senza soia · 20 min | 20 | 18 | 18 | 32 |
| Vegetariano · senza glutine | 48 | 97 | 97 | 61 |
| Pescetariano · senza latte · 30 min | 35 | 79 | 79 | 41 |

## Preferenze leggere (pranzo/cena)

- Piatti vegetali (vegani): 134
- Primi: 121
- Secondi: 95
- Piatti unici: 89
- Pesce: 60
- Legumi: 106
- Colazioni salate: 36
- Colazioni dolci: 61

## Combinazioni sotto soglia

Nessuna.

Le combinazioni sotto soglia non vengono risolte ignorando i vincoli: il calendario ripete le ricette compatibili o segnala i pasti senza ricetta. Priorità per le prossime ricette.

## Tempi da verificare

Ricette in cui la somma dei timer supera il tempo totale (passaggi in parallelo o tempo sottostimato):

- pasta_pomodoro_basilico (timer 22′ / totale 20′)
- pasta_zucchine (timer 22′ / totale 20′)
- riso_piselli_carote (timer 22′ / totale 20′)
- pasta_pancetta_pomodoro_pecorino (timer 27′ / totale 25′)
- tacchino_curry_cocco (timer 26′ / totale 25′)
- chili_fagioli_neri (timer 32′ / totale 25′)
- curry_ceci_cocco (timer 26′ / totale 25′)
- penne_all_arrabbiata (timer 23′ / totale 20′)
- riso_venere_gamberetti_zucchine (timer 52′ / totale 50′)
- riso_integrale_verdure_forno (timer 65′ / totale 50′)
- farro_funghi_prezzemolo (timer 37′ / totale 35′)
- pollo_alla_paprika_con_riso (timer 31′ / totale 30′)
- insalata_polpo_patate (timer 85′ / totale 75′)
- curry_uova_sode_riso (timer 36′ / totale 35′)
- bowl_farro_lenticchie_zucca (timer 52′ / totale 45′)
- lenticchie_riso_cipolle_caramellate (timer 55′ / totale 50′)
