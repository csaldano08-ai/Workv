# Revisione culinaria del catalogo

## Stato

Tutte le 500 ricette sono `needs_culinary_review`: superano la validazione strutturale (schema, ingredienti, duplicati, diciture vietate) ma **nessuna è stata provata in cucina**. Nessuna è `approved_for_release`.

## Procedura (prima della pubblicazione)

1. Revisione a campione da parte di una persona competente: almeno 50 ricette scelte su tutte le categorie, con priorità a carne, pesce, molluschi, uova (sicurezza alimentare) e preparazioni lunghe.
2. Per ogni ricetta: titolo e tradizione, ingredienti e quantità per 2 persone, tempi, passaggi comprensibili, cottura sicura, conservazione.
3. Esito nel campo `meta.review` (o in `LEGACY_META`): `culinary: 'checked'` e `status: 'approved_for_release'` solo dopo la verifica; `needs_allergen_review` per ingredienti composti dubbi.
4. Se il tempo non basta: pubblicare una versione con il sottoinsieme approvato (filtro per stato) invece di ricette non verificate.

## Punti già segnalati

- Corretti: tonno al sesamo (cottura sicura salvo pesce abbattuto), spaghetti alle vongole (spurgo), spezzatino (tempi realistici), farinata (riposo).
- Da verificare: overnight oats, pudding di chia, ghiaccioli, gazpacho e simili richiedono ore di riposo non conteggiate nel tempo totale; carbonara con pancetta e norma con pecorino (varianti non canoniche); parmigiana "leggera" al forno; tempi delle ricette in `COVERAGE.md → Tempi da verificare`.
- Quasi duplicati da valutare: crema e zuppa di piselli spezzati; merluzzo con pomodorini e capperi e pesce spada alla siciliana; crema di ceci e hummus bowl.
