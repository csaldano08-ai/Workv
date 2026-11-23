# 02 · Skill realmente individuate e come le uso

## Cosa ho trovato nell'ambiente

| Fonte | Contenuto reale | Blender? |
|---|---|---|
| `Workflow_01.zip` / `Workflow_02.zip` → cartella **"Ricks Claude Workflow"** | Motore video **2D** in Python + skia (`engine/`), due skill: **`/find-story`** (ricerca di storie vere) e **`/make-video`** (storia → JSON → video). `docs/STORY_TO_FILM.md` con formula narrativa, regole di varietà, layout verticale 1080×1920, voci CC0. | **No** |
| Skill installate nella sessione (`/root/.claude/skills`, plugin) | Documenti, fogli, presentazioni, PDF, browser, marketing, finanza. | **No** |
| Blender | Disponibile come modulo Python `bpy` 5.x (senza interfaccia, senza GPU: Eevee non parte, si usa Cycles su CPU). | — |

**Non esiste una skill Blender installata** e non esistono istruzioni Rick's Clips per modellazione, rig o camminata in 3D.
Non fingo di averle seguite. Il workflow 3D descritto qui è scritto da me in questo progetto, ispirato alle regole del workflow di Rick dove sono applicabili.

## Cosa riprendo dal workflow di Rick

| Regola del workflow | Come la applico in Blender |
|---|---|
| Personaggi a testa tonda definiti da parametri (`cast`: corpo, abito, capelli, extra) | `CAST` in `scripts/cs_char.py`: lo stesso telaio produce personaggi diversi (proporzioni, abiti dipinti, capelli, colori). |
| 14 facce standard (`neutral`, `shock`, `worried`, `smug`…) | `scripts/cs_face.py`: 12 espressioni richieste + 2 extra, nello stesso linguaggio a inchiostro, disegnate per fotogramma. |
| Pose standard (`point`, `shrug`, `think`, `wave`, `hold phone`…) | `scripts/cs_pose.py`: le stesse pose, ma su un rig 3D con IK e prese verificate. |
| **Controllo prima del render** (`run.py stills` + `contact.png` guardato a occhio) | Tavole di prova + **controlli geometrici automatici** (`scripts/cs_qc.py`) prima di ogni render lungo. |
| Varietà: nuova inquadratura ogni 2–4 s, mix di campi larghi e primi piani, una reazione su ogni battuta | Regole di regia per storyboard e animatic (fase 5). |
| Narratore + battute brevi, effetti su ogni parola chiave | Copione e piano audio (fase 5). Le voci CC0 del kit **non** verranno usate come voci finali (richiesta: niente voci sintetiche definitive). |

## Tecniche 3D che uso (scritte per questo progetto)

- **Rig ad armatura vera** (Blender): bacino, colonna, torace, testa, clavicole, braccio/avambraccio/mano, dita a 2 falangi, coscia/tibia/piede; IK a 2 ossa con polo per gomiti e ginocchia; rotazione della mano e del piede dai controlli.
- **Volto 2D proiettato** sulla testa (UV frontale + maschera): si disegna per fotogramma da parametri (espressione, sguardo, battito), quindi pupille, palpebre e bocca sono sempre coerenti.
- **Contorno a inchiostro** con guscio invertito (Solidify a normali capovolte), visibile solo alla camera, senza ombre.
- **Abiti dipinti** in texture sul busto: nessuna geometria sovrapposta → niente z-fighting, niente vestiti che entrano nella pelle.
- **Camminata pianificata per impronte** con foot locking, risolutore di portata e misura dello scivolamento.
- **Prese risolte con il contatto reale**: le dita si chiudono finché toccano l'oggetto senza entrarci; lo schermo del telefono resta scoperto.
- **Controlli geometrici automatici** su mesh valutate (BVH, profondità reale + conferma a raggio), non solo bounding box.
