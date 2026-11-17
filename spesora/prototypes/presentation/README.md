# Presentazione di Spesora (video)

`out/spesora_presentazione.mp4`: 1080×1920, 30 fps, circa 92 s. È un giro **reale** della demo web (nessuna schermata finta), registrato da Chromium alla risoluzione del telefono (390×844 @2x), con:

- un cartello iniziale;
- 14 capitoli con didascalia: apertura, benvenuto, questionario, caricamento, prima settimana, Oggi, ricetta, Settimana, rifare il menù, lista della spesa, spesa confermata, dispensa, "Ho cucinato", ricettario;
- un cartello finale.

Per rigenerarlo, da `spesora/prototypes/presentation/`:

1. Esporta la demo web: `npx expo export -p web`.
2. Servila in locale.
3. Registra il giro:
   ```bash
   node scripts/tour.cjs http://localhost:PORTA/ out
   ```
4. Monta il video:
   ```bash
   node scripts/compose.cjs out
   ```

Su web le notifiche non partono: il video mostra l'app, non gli avvisi del telefono.
