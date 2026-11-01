# Mina, la mascotte di Spesora

Mina è il **ricettario vivente** di Spesora: un piccolo libro illustrato (copertina avorio con rametto verde, dorso verde scuro, elastico verticale, linguette laterali, segnalibro pesca, occhi scuri con ciglia, guance pesca, braccia e gambe verdi). Non è un umano, un animale o un robot. Sostituisce la mascotte precedente (Timo).

## Dove vive nel codice

- **Sorgente unica**: `src/ui/mascot/minaSvg.ts` — 12 pose vettoriali (`neutral, welcome, happy, calendar, shopping, cooking, recipe, thinking, pantry, missing, success, sleepy`) più il badge. Nitide a ogni dimensione, nessun peso in MB, offline, nessuna immagine remota.
- **Componente**: `MinaMascot` (`src/ui/mascot/Mina.tsx`) con `pose`, `size`, `animated`, `accessibilityLabel`. `MinaBadge` per il volto compatto. I vecchi nomi italiani delle pose (`saluto`, `spesa`…) sono ancora risolti.
- **Messaggi**: `AssistantBubble` (Mina + nuvoletta) e `MinaNote` (richiamo piccolo, senza nuvoletta) in `src/ui/AssistantBubble.tsx`.
- **Decorazioni**: `src/ui/Decor.tsx` (`SoftBlob`, `Sprig`, `OrnamentDivider`, `LeafMark`), tutte nascoste agli screen reader.
- **Movimento**: `Reveal` (comparsa morbida) e i gesti di Mina (saluto, saltello, dondolio, respiro). Sono brevi sequenze, mai cicli infiniti; `useReducedMotion` rispetta "Riduci movimento" di iOS e `prefers-reduced-motion` sul web. Animazioni con `useNativeDriver` su mobile.
- **PNG esportati** (sfondo trasparente reale, 1024×1024): `assets/mascot/mina/vector/mina_<posa>.png` e `mina_badge.png`; contact sheet in `docs/MINA_CONTACT_SHEET.png`. Si rigenerano con `node scripts/mascot/export-mascot.mjs`. L'app non li importa: usa il vettoriale.

## Dove compare e perché

| Schermata | Posa | Ruolo |
| --- | --- | --- |
| Benvenuto | `welcome` grande, animata | Presenta Spesora |
| Questionario | per passo; reagisce a esclusioni e non graditi | Accompagna senza rallentare |
| Oggi | `shopping` / `cooking` / `welcome` / `success` | Spesa pronta, ora di cucinare, saluto, giornata conclusa |
| Oggi (sera) | `thinking` | Ricorda cosa preparare stasera per domani |
| Settimana | `calendar` | Riepilogo: pasti da cucinare e spese |
| Spesa | `shopping` | Giorno di spesa, lista pronta |
| Ricetta | `thinking` / `missing` (piccola) | Preparazione della sera prima, ingredienti mancanti |
| Dispensa | `missing` / `thinking` / `pantry` | Scorte che non bastano, scadenze, stato vuoto |
| Anteprima settimana | `success` grande | "È pronta!", i giorni compaiono uno dopo l'altro |
| Stati vuoti | `thinking`, `sleepy`, `pantry` | Messaggi brevi e senza colpa |

Regole: Mina non copre mai le informazioni principali, non parla di continuo, non è un chatbot. Reagisce a eventi già esistenti con regole deterministiche.

## Versione illustrata con Google Flow

La versione vettoriale è quella ufficiale dell'app e funziona su iPhone e web. Se in futuro si producono illustrazioni raster con Google Flow, vanno in una cartella separata (non in `assets/mascot/mina/vector/`) e il componente può essere esteso per preferirle; fino ad allora l'identità visiva di riferimento è `docs/MINA_CONTACT_SHEET.png`.
