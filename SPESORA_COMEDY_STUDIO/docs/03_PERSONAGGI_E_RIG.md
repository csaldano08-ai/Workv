# 03 · Sistema dei personaggi e rig

Tutto è generato da codice in Blender 5 (`bpy`): ogni personaggio si ricostruisce identico da una specifica, quindi è riutilizzabile in tutti gli episodi.

## Il telaio comune (`scripts/cs_char.py`)

| Parte | Costruzione | Perché così |
|---|---|---|
| Testa | Sfera a uovo più piena in basso (`head_surface`), UV frontale e maschera "front" | Il volto 2D si proietta sulla curvatura e ruota con la testa; la stessa funzione di forma serve per i capelli (nessuna compenetrazione testa-capelli). |
| Volto | Texture disegnata per fotogramma da `cs_face.py` (espressione + sguardo + battito) | Pupille, palpebre e bocca sempre coerenti con lo sguardo; si possono animare tutti i parametri e miscelare le espressioni. |
| Busto | Rivoluzione di un profilo "a proiettile", sezione ellittica, abiti dipinti in UV | Nessun vestito sovrapposto: niente z-fighting e niente tessuto che entra nella pelle. |
| Braccia e gambe | Tubi sottili neri lungo le ossa, pelle a quaternioni doppi (volume conservato al gomito/ginocchio) | Piegano ad angolo netto come nel riferimento, senza strozzature. |
| Mani | Palmo + pollice e 3 dita a 2 falangi, ogni pezzo rigido sul suo osso | Prese vere: ogni falange si chiude separatamente. |
| Piedi | Ovali con suola piatta a 2 mm dal pavimento | Appoggio stabile, nessuna compenetrazione con il pavimento. |
| Capelli | Calotta con attaccatura parametrica liscia + spessore vero, ciocche e ciuffo per il protagonista | Bordo che sfuma nella testa senza gradini; 2 mm di distacco al bordo (niente z-fighting). |
| Contorno | Guscio invertito (Solidify, normali capovolte), nero solo per la camera, senza ombre | Il tratto nero del riferimento, stabile nel tempo (niente sfarfallio da linee calcolate). |

## Personaggi definiti

| Nome | Altezza | Specifiche |
|---|---|---|
| `protagonista` | ≈ 1,77 | Giacca blu (#2B4070) su maglietta pesca, capelli castani a ciuffo con ciocche e ciuffo ribelle, scarpe marroni. La giacca blu è il motivo dell'equivoco. |
| `protagonista_f` (preliminare) | ≈ 1,68 | Busto più svasato, abito corallo con colletto bianco e cintura, caschetto ramato, ciglia, scarpe rosse. |

Per un nuovo personaggio basta aggiungere una voce a `CAST` (proporzioni, abito, capelli, colori). Dipendente, responsabile e direttore verranno da qui, **dopo l'approvazione del personaggio base**: abiti nuovi da dipingere (grembiule, gilet, completo), accessori (cartellino, cartellina).

## Rig

```
root
└─ pelvis ─ spine ─ chest ─ head
   │                 ├─ shoulder.L ─ upperarm.L ─ forearm.L ─ hand.L ─ {index, middle, ring, thumb}_1 ─ _2
   │                 └─ shoulder.R … (speculare)
   ├─ thigh.L ─ shin.L ─ foot.L
   └─ thigh.R …
controlli (non deformano): ik_hand.L/R, pole_elbow.L/R, ik_foot.L/R, pole_knee.L/R (figlio del piede)
```

- **Braccia:** IK a 2 ossa sull'avambraccio con polo del gomito. La mano copia la rotazione del controllo, quindi si orienta indipendentemente dal braccio.
- **Gambe:** IK a 2 ossa sulla tibia con polo del ginocchio, che segue il piede (le ginocchia girano con i piedi). Il piede copia la rotazione del controllo: tallone e punta.
- **Dita:** FK, due falangi per dito. Le pose le chiudono per gradi; il risolutore di presa le chiude fino al contatto.
- **Tronco:** bacino (posizione e rotazione), colonna e torace (piega, torsione, piega laterale). Il busto è pesato in modo morbido sui tre ossi, quindi si piega come un cartone.
- **Clavicole:** alzata e abbassamento delle spalle (`shrug`).
- **Verifica:** l'IK porta polso e caviglia esattamente sul controllo (errore misurato 0,0 mm in posa di riposo e con la mano spostata).

## Socket per gli oggetti

`cs_pose.phone_socket()`: il telefono è definito nello spazio dell'osso mano. Poggia sul palmo con 1,5 mm di distacco, la larghezza lungo le dita e il bordo lontano 2 mm prima delle nocche, così le dita lo avvolgono.
Due orientamenti: "read" (schermo verso chi lo tiene) e "show" (schermo verso chi sta davanti).
L'oggetto si posiziona dalla posa attuale della mano a ogni fotogramma (`place_prop`): quando si passa da appoggiato a impugnato non salta.
Lo stesso schema servirà per carrello (due socket sul manico), cartellina e prodotti.

## Come si usa

```python
from cs_char import Character
import cs_pose as PO
ch = Character("protagonista", "/percorso/lavoro")
ch.pose(PO.idle(ch))                                  # posa
ch.rig.matrix_world = ...                              # posizione nel mondo
ch.set_face(path_png)                                  # volto (da cs_face.draw_face)
```
