# SDK, rete e permessi (dal codice, 27 novembre 2026)

## Librerie incluse nell'app (`package.json → dependencies`)

| Libreria | A cosa serve | Rete | Dati |
| --- | --- | --- | --- |
| `expo`, `expo-router`, `react`, `react-native`, `react-native-screens`, `react-native-safe-area-context`, `@expo/metro-runtime`, `react-native-web` | Struttura dell'app e navigazione | No | — |
| `expo-sqlite` | Database locale | No | Tutti i dati dell'inventario, sul telefono |
| `expo-notifications` | Promemoria locali | No: nessun token push | Orari dei promemoria, sul telefono |
| `expo-font`, `@expo/vector-icons` | Carattere Nunito (incluso nell'app) e icone | No | — |
| `expo-constants`, `expo-linking`, `expo-status-bar` | Configurazione, link, barra di stato | No | — |
| `react-native-svg` | Disegni (Mina, logo, icone) | No | — |
| `zod` | Validazione dei dati salvati | No | — |
| `react-native-purchases` (RevenueCat) | Abbonamenti | **Solo con `purchasesMode = "revenuecat"` e una chiave**: oggi il modulo non viene nemmeno caricato | Vedi INVENTARIO_DATI.md → Abbonamento |
| `expo-device` | — | — | **Non usata da nessun file: da rimuovere** (proposta 3) |

Non ci sono SDK di analisi, crash reporting, pubblicità, attribuzione o social login.
Gli aggiornamenti OTA (`expo-updates`) non sono inclusi, quindi l'app non contatta server Expo all'avvio. Le immagini delle ricette e i font sono nel pacchetto: non vengono scaricati.

## Comunicazioni di rete

Ricerca nel codice (`app/`, `src/`) di `fetch(`, `axios`, `XMLHttpRequest`, `WebSocket` e URL `http(s)://` usati come destinazioni: nessuna. Gli unici URL presenti sono l'attributo `xmlns` degli SVG e dati di test.
L'app apre link esterni solo su richiesta dell'utente (pagine legali o di supporto configurate, gestione dell'abbonamento dello store).

## Permessi

**iOS** (`Info.plist` generato):
- nessuna chiave `NS…UsageDescription`: niente fotocamera, foto, posizione, contatti, microfono;
- il permesso per le notifiche viene chiesto solo se l'utente attiva i promemoria nel questionario;
- `ITSAppUsesNonExemptEncryption = false`.

**Android** (manifest dell'app, da `npx expo config --type introspect`):
- `INTERNET`: serve a RevenueCat quando gli abbonamenti saranno attivi;
- `VIBRATE`: notifiche;
- `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`: **ereditati dal modello Expo, non servono a Mina**. Proposta 2: `android.blockedPermissions`.

I permessi delle librerie (per esempio `POST_NOTIFICATIONS` e `RECEIVE_BOOT_COMPLETED` di `expo-notifications`) si uniscono in compilazione: da verificare sul manifest finale di una build Android.

## Privacy Manifest (iOS)

Expo SDK 58 genera `PrivacyInfo.xcprivacy` dalle dichiarazioni dei moduli e da `app.json → ios.privacyManifests`. Prima dell'invio ad App Review:
1. verificare nella build nativa le «API con motivazione obbligatoria» dichiarate (UserDefaults, date dei file, tempo di avvio, spazio su disco) da React Native ed Expo;
2. con RevenueCat attivo, controllare il suo manifest (dati di acquisto).

## Segreti

Nel pacchetto non ci sono chiavi private né credenziali di server. La chiave RevenueCat in `app.json` è la chiave **pubblica** dell'SDK (`appl_…`, `goog_…`), pensata per stare nell'app. Le chiavi segrete di RevenueCat e degli store non vanno mai nel codice.
