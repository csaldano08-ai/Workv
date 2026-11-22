# Protagonista ricalcato dal riferimento (da approvare)

Il cliente ha fornito una scheda di riferimento: il personaggio deve essere uguale. Il modello 3D riproduce forme e proporzioni
misurate sulla scheda (testa larga = 1.0): testa leggermente più alta che larga, busto più largo della testa e più stretto in alto,
braccia grosse che si allargano verso il basso e arrivano ai fianchi, gambe tozze affiancate con fondo arrotondato, nessuna scarpa.

Differenze richieste: **maglietta nera** al posto di quella crema e **sopracciglia nere** al posto di quelle bianche.

## Faccia

- Espressioni **2D** disegnate in codice (`scripts/faces2.py`) e proiettate sulla testa 3D (restano ancorate alla curvatura).
- Occhi come nel riferimento: sclera bianca rialzata, pupille nere ovali e grandi (senza puntino bianco) spostate verso il naso, occhi vicini e
  il naso che ne sfiora gli angoli interni. Sopracciglia **nere** a pillola, con le estremità esterne più basse. Rilievo da mappa di altezza a 16 bit.
  Il naso rosso è 3D.
- 13 stati: neutro, felice, sorpreso, confuso, stanco, frustrato, imbarazzato, ironico, sguardo laterale, guarda in camera,
  occhi chiusi, occhi semichiusi, sbadiglio. Le forme della bocca per il labiale italiano NON sono ancora fatte.

## Testato davvero

- Render Cycles CPU (4 core, 48 campioni) in Blender 5.3 via `bpy`: 19 immagini (3 viste, 13 espressioni, 3 pose col telefono) in circa 160 s.
- Presa del telefono con le estremità tonde delle braccia, senza dita.

## Differenze note rispetto al riferimento

- Il riferimento è una immagine 2D: spalle e pieghe morbide sono approssimate con forme semplici.
- Il busto del modello è un po' più squadrato; i pantaloni sono un po' più saturi.
- Il colore della pelle dipende dalla luce di studio: la scheda ha una resa leggermente più terracotta.
- Nessun rig con armatura: le pose sono generate da codice (curve per le braccia).
