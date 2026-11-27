# Inventario dei dati (dal codice, 27 novembre 2026)

Tutti i dati sono salvati in un unico database SQLite nella cartella privata dell'app (`expo-sqlite`, `src/core/storage`). Le altre app non possono leggerla, salvo dispositivi con jailbreak o root. **Nessun dato viene inviato a server di Mina**: l'app non ne ha.

| Tabella | Contenuto | Origine | Sensibilità | Note |
| --- | --- | --- | --- | --- |
| `user_preferences` | Profilo in JSON:<br>• persone e pasti da organizzare;<br>• dieta (onnivoro, pescetariano, vegetariano, vegano);<br>• **allergeni ed ingredienti esclusi**, ingredienti non graditi;<br>• porzioni (appetito, stile di vita, tipo di pasti preferiti, quantità di pasta e riso, sesso facoltativo);<br>• gusti, tempi per cucinare, orari dei pasti, giorni di spesa, budget, strumenti di cucina;<br>• passo del questionario. | Questionario, Profilo | **Alta** per gli allergeni (possono rivelare una condizione di salute). Media per la dieta (in alcuni casi può rivelare convinzioni). Bassa per il resto. | Il **sesso** è salvato ma non usato in alcun calcolo: proposta di rimozione nel README. Non si chiedono peso, altezza, età, diagnosi. |
| `notification_settings` | Promemoria scelti, anticipo, fascia di silenzio, se il permesso è stato chiesto | Questionario, Notifiche | Bassa | Solo notifiche locali |
| `weekly_plans`, `planned_meals` | Piano della settimana: ricette, giorni, orari, persone, stato (cucinato, saltato, mangiato fuori) | Generato sul telefono | Bassa / media (abitudini) | |
| `meal_history` | Storico dei pasti | App | Bassa / media | |
| `pantry_items`, `pantry_movements` | Quantità in dispensa, scadenze inserite dall'utente, movimenti | Spese confermate, correzioni | Bassa | |
| `shopping_trips`, `shopping_items` | Spese confermate, **importo pagato (facoltativo)**, spunte | Spesa | Bassa / media (spesa) | |
| `favorite_recipes` | Ricette preferite | Ricette | Bassa | |
| `ingredient_prices` | Prezzi inseriti dall'utente, tipo di negozio (facoltativo) | Profilo → Prezzi | Bassa | |
| `app_state` | Bozza del questionario, intro già vista, impostazioni interne | App | Bassa | |

## Dati che NON vengono trattati

- Nessun dato di account: email, telefono, nome, password, accesso Google o Apple.
- Nessun identificativo pubblicitario.
- Nessuna analisi d'uso e nessun crash report.
- Nessuna posizione, fotocamera, contatti o foto.
- Nessun token per notifiche push.

## Abbonamento (quando sarà attivo)

Lo stato dell'abbonamento non viene salvato nel database: lo legge l'SDK RevenueCat a ogni apertura.

RevenueCat e lo store ricevono:
- un identificativo anonimo dell'app, generato dall'SDK;
- la ricevuta e le transazioni dello store;
- dati tecnici del dispositivo necessari al servizio.

Non ricevono mai preferenze alimentari, piano, dispensa o liste. Da dichiarare nella Privacy Policy, in «App Privacy» (Apple) e in «Sicurezza dei dati» (Google), insieme all'accordo sul trattamento con RevenueCat.

## Conservazione e cancellazione

- I dati restano finché l'utente non li cancella o non disinstalla l'app.
- **Profilo → I tuoi dati → Cancella tutti i dati** svuota tutte le tabelle e annulla le notifiche programmate. Poi l'app riparte dal benvenuto. Codice: `wipeAll()` in `repository.ts`, `cancelAllOurs()`.
- **Esporta** produce un JSON leggibile, condiviso con il foglio di condivisione di sistema.
- **Backup del telefono:**
  - su iOS il database è incluso nei backup iCloud o del computer, secondo le impostazioni dell'utente;
  - su Android il Backup automatico (default di Expo) lo include nel backup dell'account Google.

  È l'unico modo per portare i dati su un telefono nuovo senza account (vedi la proposta 4 nel README).
- **Disinstallazione:** il database viene rimosso con l'app. Mina non usa il Portachiavi (Keychain), quindi nulla sopravvive alla reinstallazione, salvo il ripristino di un backup.

## Basi giuridiche: punti da far valutare a un professionista

- Se i dati restano solo sul dispositivo e lo sviluppatore non vi accede, il trattamento sotto il controllo dello sviluppatore è molto ridotto. Va comunque confermato chi è titolare per i dati dell'abbonamento (RevenueCat, store).
- **Allergie ed esclusioni:** dire che si è allergici a un alimento può essere un dato relativo alla salute (art. 9 GDPR). Oggi l'utente sceglie gli allergeni «da escludere», senza dichiarare una diagnosi, e i dati non lasciano il telefono. Da valutare se serva un consenso esplicito o una formulazione diversa (per esempio «ingredienti da evitare» senza riferimento all'allergia), e se cifrare il database (proposta 5).
- **Età:** l'app è pensata per adulti che gestiscono la cucina di casa. Non è rivolta ai minori (in Italia la soglia per il consenso ai servizi digitali è 14 anni).
