# Schermata dell'app per EP01

`ui_spesa_cipolla4.png` è una cattura della **vera app Spesora** (esportazione web statica `spesora/dist`, servita in locale; l'app non è stata modificata):
la scheda «Spesa» con «Prima questi 7: servono oggi!» e **«Cipolla 4 pz»** come primo prodotto.

Come si riproduce (nessun dato inventato: cambia solo l'input dell'onboarding e la data simulata):

```bash
python3 -m http.server 8123 --directory spesora/dist &
node SPESORA_COMEDY_STUDIO/scripts/capture_spesa.cjs http://localhost:8123/ 3 ui_spesa_cipolla4.png 2026-11-22T10:00:00
```

Il piano settimanale dell'app dipende dalla data; con il 22/11 e 3 persone la quantità di cipolle richiesta è 4 pz.
Con 2 persone la stessa data dà «2,5 pz», con 4 persone «5 pz».
