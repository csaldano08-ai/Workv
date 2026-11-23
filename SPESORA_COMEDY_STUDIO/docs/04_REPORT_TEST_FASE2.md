# 04 · Rapporto delle prove · fase 2 (personaggio base e rig)

Tutti i risultati sono misurati sulle mesh **valutate**, cioè dopo armatura e modificatori, con controlli automatici (`scripts/cs_qc.py`) e verifica visiva delle tavole.
Dati grezzi: `renders/tests/fase2/qc_fase2.json` e `qc_walk_*.json`.

## Esito finale

| Prova | Verificato | Esito |
|---|---|---|
| Giro completo protagonista (4 viste) | silhouette, capelli, contorno, braccia vs busto, piedi sul pavimento | ✅ 0 compenetrazioni; suole a 2 mm dal pavimento |
| Giro variante femminile (4 viste) | idem | ✅ 0 compenetrazioni |
| 14 espressioni sulla testa 3D | leggibilità sulla curvatura, coerenza sguardo/sopracciglia/bocca | ✅ |
| Gomito: 37°, 47°, 87°, 132° | piega netta, nessuna strozzatura o pinna, braccio fuori dal busto | ✅ 0 mm |
| Gesti: indicare, salutare, spallucce, pensare | braccia e mani fuori dal busto; pugno sul mento | ✅ 0 mm; contatto pugno-mento **0,73 mm** senza entrarci |
| Presa del telefono "legge" e "mostra" | dita sul bordo, palmo, pollice, schermo libero | ✅ mano dentro il telefono 0 mm; 0 vertici davanti allo schermo; palmo a 1,5 mm; dita a contatto 0,2–1,1 mm; pollice 0,7 mm |
| Camminata normale (lato e tre quarti) | scivolamento del piede in appoggio, piedi nel pavimento, gambe, braccia | ✅ scivolamento max **0,004 mm**; 0 mm sotto il pavimento; gambe mai a contatto; braccia 0 mm |
| Camminata imbarazzata | idem + passi corti, spalle basse, sguardi intorno | ✅ scivolamento max 0,005 mm |
| Camminata sicura | idem + passi lunghi, petto in fuori, braccia ampie | ✅ scivolamento max 0,007 mm |

## Problemi trovati e corretti (in ordine)

| # | Prova | Problema | Causa | Correzione | Verifica |
|---|---|---|---|---|---|
| 1 | Primo render | Colori slavati, giacca celeste | Colori sRGB passati come lineari + luci troppo forti | Conversione sRGB→lineare; luci ridotte | ✅ visiva |
| 2 | Capelli | Attaccatura a gradini | Vertici tagliati da una sfera | Calotta parametrica con bordo liscio | ✅ visiva |
| 3 | Capelli | Riga bianca dietro la testa | Bordo coincidente con la testa (z-fighting) | Distacco di 2 mm al bordo | ✅ visiva |
| 4 | Capelli | Testa che "buca" i capelli in basso | Capelli a sfera, testa più piena in basso | Capelli costruiti sulla stessa forma della testa | ✅ visiva |
| 5 | Telefono | Pollice dentro il telefono di 5,35 mm | Pollice a riposo puntato verso il palmo | Pollice nel piano del palmo + risolutore di presa | ✅ 0 mm |
| 6 | Telefono | Dita piatte sotto il telefono | Telefono centrato sotto le nocche | Socket calcolato dalle ossa: bordo 2 mm prima delle nocche | ✅ dita a contatto |
| 7 | Telefono | Falsi "dentro" a 9 cm dal telefono | Normali del telefono smussato incoerenti | Normali verso l'esterno (volume firmato) + conferma a raggio | ✅ |
| 8 | Telefono | Schermo sul retro | Normali ribaltate dal ricalcolo | Controllo del volume firmato | ✅ schermo leggibile |
| 9 | Camminata | Piede che scivola 9–13 mm | Gamba troppo corta per il passo (IK al limite) | Ginocchia piegate + risolutore di portata del bacino | ✅ 0,004–0,007 mm |
| 10 | Camminata | Braccia nel busto 14–26 mm | Torace che ruota contro mani ferme | Le braccia seguono la rotazione del torace | ✅ 0 mm |
| 11 | Controllo | Radice del braccio contata come errore | Zona di attacco centrata sulla spalla a riposo | Zona centrata sulla spalla in posa | ✅ |
| 12 | Gesti | Braccio nel busto 24,7 mm (pensa), 14,2 mm (telefono) | Polo del gomito fissato a mano | Risolutore del gomito (sceglie la direzione senza compenetrazioni, max 15° dalla posa voluta) | ✅ 0 mm |
| 13 | Gesti | Pugno a 25 mm dal mento | Mano non avvicinata | Avvicinamento al contatto (≤ 2 mm) | ✅ 0,73 mm |
| 14 | Gomito 132° | Punta all'esterno del gomito | Zona di fusione larga: il tubo si piega su sé stesso | Fusione stretta + sfera di giunto | ✅ visiva |
| 15 | Pensa | Pinna nera sotto il gomito | Contorno con offset "uniforme" nelle pieghe strette | Offset semplice sugli arti | ✅ visiva |

## Problemi rimasti (dichiarati)

- **Contatto con il telefono:** il palmo sta a 1,5 mm dal retro del telefono. È un distacco voluto per evitare la compenetrazione, invisibile a distanza normale, ma in un primo piano estremo si potrebbe notare.
- **Radice di braccia e gambe:** braccia e gambe nascono dentro il busto. Gli 11 cm vicini alla spalla e i 16 cm vicini all'anca sono esclusi dal controllo, per scelta di design.
- **Gesto "indicare":** nell'inquadratura di prova la punta del dito tocca il bordo dell'immagine. È solo un problema d'inquadratura.
- **Caschetto della variante femminile:** è preliminare, la forma va rifinita dopo l'approvazione.
- **Sfarfallio temporale:** misurato solo sulle camminate in studio. Le prove su scaffali e supermercato arrivano con il blockout (fase 4).
- **Rumore di render:** con 10–32 campioni e denoise resta una grana leggera nelle zone scure.

## Tempi di render misurati

Cycles su CPU, 4 core, nessuna GPU; Eevee non è disponibile.

| Prova | Risoluzione · campioni | Tempo per immagine |
|---|---|---|
| Giro completo | 540×900 · 24 | 7,2 s |
| Espressioni 3D | 440×440 · 24 | 4,7 s |
| Braccia e gesti | 480×800 · 24 | 6,1 s |
| Telefono | 540×900 · 32 | 11,4 s |
| Camminate (139–142 fotogrammi) | 960×540 · 10 | 2,9–3,1 s per fotogramma (≈ 7 min per camminata) |

Stima per l'episodio da 90 s, 2700 fotogrammi:
- **Anteprima o animatic** a 540×960 e circa 10 campioni: 2–3 ore.
- **Finale nativo** a 1080×1920 e 32 campioni: 30–40 ore su questa CPU, molto meno con una GPU.
