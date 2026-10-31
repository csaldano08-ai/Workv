# Mascotte

## Tre concept valutati

| Concept | Idea | Pro | Contro |
| --- | --- | --- | --- |
| 1. **Timo**, piccolo assistente di cucina | Un rametto di timo stilizzato, corpo a foglia, grembiulino pesca | Legato al cibo vero e alle erbe aromatiche italiane; semplice da riconoscere anche piccolo; il grembiule comunica "cucina" senza cliché da chef | Va disegnato con cura per non sembrare un ortaggio generico |
| 2. Agenda/ricettario animato | Un quadernino con segnalibro che si apre come una bocca | Richiama il calendario | Freddo, poco "cibo"; rischio di sembrare un'app di produttività |
| 3. Utensile con personalità | Un cucchiaio di legno con volto | Immediato | Molto diffuso, poco distintivo; meno adatto alle reazioni emotive |

**Scelto: Timo.** Unisce cucina, ingredienti e italianità, e resta elegante. Non deriva da mascotte esistenti.

## Identità

- Corpo a forma di foglia verde salvia `#386E55` con nervatura chiara, ciuffo di foglioline in cima.
- Grembiulino pesca `#E6A46D` con taschina; guance pesca; occhi antracite `#24332C`.
- Nessun testo nell'illustrazione, nessun gradiente vistoso, nessun effetto 3D.

## Pose

`neutra`, `saluto`, `cucinare` (cucchiaio di legno), `spesa` (cestino), `completata` (braccia in alto), `mancanti` (lista e sopracciglia pensierose, mai colpevolizzante), `suggerimento` (lampadina), `vuoto` (braccia aperte e piatto vuoto) + **badge** compatto (solo volto).

## File

- Sorgente unica: `src/ui/mascot/timoSvg.ts` (usata dall'app e dall'esportazione).
- Componenti: `Timo` e `TimoBadge` in `src/ui/mascot/Timo.tsx`; `AssistantBubble` per i messaggi.
- PNG con canale alfa reale (480×560, badge 256 e 96 px): `assets/mascot/`, rigenerabili con `npm run mascot:export` (Node ≥ 22.18).

## Dove appare

Benvenuto, ogni passo del formulario (con un consiglio), anteprima della prima settimana, Oggi (messaggio contestuale: spesa, cucina imminente, saluto, giornata conclusa), Spesa, Dispensa (avviso "potrebbe non bastare" e stato vuoto), Ricettario e Storico vuoti, Impostazioni (badge nel profilo), Spesora Plus.
