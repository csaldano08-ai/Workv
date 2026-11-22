# Concept del protagonista (da approvare)

Tre varianti, stessa palette (pelle pesca, maglietta verde salvia, pantaloni antracite, scarpe avorio, foglia Spesora sul petto)
e stesse regole: corpo di pongo opaco, **niente mani né dita**, faccia 2D, nessun naso, nessun dente realistico.

| Variante | Testa | Corpo | Note |
|---|---|---|---|
| A · Goccia | allungata a goccia, piccolo ciuffo | busto piccolo, arti molto lunghi | la più vicina alla scheda di riferimento |
| B · Testone | grande, tonda, irregolare | piccolo, gambe corte | la più leggibile in piccolo, vicina ai video di riferimento |
| C · Pillola | capsula verticale | a pera, braccia spesse, grandi palette | la più morbida e buffa |

## Cosa è stato testato davvero

- Render Cycles (CPU, 4 core, 48 campioni, denoise) in Blender 5.3 via `bpy`: tutte le immagini delle tavole sono render reali.
- Tempi misurati per variante (14 immagini, risoluzioni 480×480, 540×810, 640×960): A 114 s, B 140 s, C 128 s.
  Una singola inquadratura a figura intera 640×960 richiede circa 16 s; a 1080×1920 il costo cresce circa di 3-4 volte.
  Il tempo dell'episodio completo non è ancora stimato: serve prima la cucina.
- Proiezione della faccia 2D sulla testa curva, anche con testa inclinata/ruotata: funziona.
- Presa del telefono con le estremità a paletta: funziona nelle tre pose provate.

## Problemi noti

- Le braccia a riposo sembrano un po' rigide (arti lunghi dritti): da migliorare con il rig.
- Di profilo la faccia è quasi invisibile (il decal copre solo il fronte): in profilo servono bocca e naso/occhio dedicati se serve.
- Lo schermo del telefono è un po' slavato (emissione da calibrare).
- Il rilievo "impronte di pongo" è molto leggero: da valutare se mostrarlo di più.
