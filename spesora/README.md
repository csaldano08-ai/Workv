# Spesora

> La tua settimana, già in tavola.

App iPhone (compatibile Android) che pianifica automaticamente pasti, spesa e dispensa per la settimana. Tutto locale: nessun account, nessun server, nessuna AI a runtime.

## Requisiti

- Node.js **22.5 o successivo** (LTS 22 consigliato: i test usano `node:sqlite`)
- iPhone con l'app **Expo Go** (App Store), aggiornata all'ultima versione (SDK 58)
- PC e iPhone sulla stessa rete Wi-Fi (oppure modalità tunnel)

## Installazione e avvio

```bash
cd spesora
npm install
npm start
```

Poi apri la **Fotocamera** dell'iPhone, inquadra il QR code mostrato nel terminale e tocca il banner "Apri in Expo Go".

Se il telefono non raggiunge il PC (rete aziendale, firewall di Windows):

```bash
npm run start:tunnel
```

## Demo nel browser (localhost)

```bash
cd spesora
npm install
npm run web
```

Si apre http://localhost:8081 (se non si apre da solo, incollalo in Chrome o Edge). Per l'aspetto da telefono: F12 → icona dispositivi (Ctrl+Shift+M) → iPhone 12/13. I dati restano nel browser; per ripartire da zero usa Impostazioni → Cancella tutti i dati, oppure una finestra in incognito. Le notifiche non sono disponibili sul web: vanno provate su iPhone.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm start` | Server di sviluppo Expo (QR per Expo Go) |
| `npm run verify` | Typecheck, lint, tutti i test, controlli di catalogo, stringhe, sorgenti e configurazione |
| `npm test` | Solo i test automatici (Vitest) |
| `npm run typecheck` / `npm run lint` | Controlli singoli |
| `npm run images -- status` | Stato della produzione delle immagini delle ricette (vedi docs/IMAGES.md) |
| `npm run mascot:export` | Esporta le pose di Timo in PNG trasparenti |
| `npm run check:release` | Controllo di produzione: fallisce finché mancano URL legali, bundle id, progetto EAS |
| `npm run web` | Demo nel browser su http://localhost:8081 (vedi sotto) |

## Struttura

```
app/                 schermate (Expo Router)
src/core/domain/     motori puri: pianificazione, spesa, dispensa, date, quantità
src/core/storage/    SQLite, migrazioni, repository
src/core/notifications/  calcolo e programmazione degli avvisi locali
src/core/purchases/  interfaccia abbonamenti (disabilitata / mock solo sviluppo)
src/data/            catalogo: 191 ingredienti canonici, 156 ricette originali
src/features/        servizio applicativo, onboarding, azioni sui pasti
src/ui/ src/theme/ src/i18n/   componenti, design token, stringhe
src/test/            test automatici
docs/                prodotto, architettura, test, decisioni, checklist di rilascio
```

Documentazione: [PRODUCT](docs/PRODUCT.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [TESTING](docs/TESTING.md) · [DECISIONS](docs/DECISIONS.md) · [RELEASE_CHECKLIST](docs/RELEASE_CHECKLIST.md) · [LEGAL](docs/LEGAL.md) · [IMAGES](docs/IMAGES.md) · [MASCOT](docs/MASCOT.md)
