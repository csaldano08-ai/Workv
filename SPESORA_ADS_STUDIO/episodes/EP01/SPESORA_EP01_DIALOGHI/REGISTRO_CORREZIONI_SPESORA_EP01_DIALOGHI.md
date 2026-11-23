# SPESORA_EP01_DIALOGHI · registro correzioni

Versione B: il protagonista parla, con Mina. Progetto separato: la versione con narratore (`../SPESORA_EP01_NARRATORE/`) non è stata modificata.
Durata 35,2 s (32 s di scena + 3,2 s di outro), 1080×1920, 30 fps.

Base comune: tutte le correzioni della versione A valgono anche qui (palpebre, sguardi con bersaglio, sportello, schermo reale e scocca antracite,
Mina che esce da dietro il telefono e resta nel quadro, inquadrature a due, nessuna camera che attraversa i personaggi, dito che non copre l'app,
nuovo outro scuro). Vedi `../SPESORA_EP01_NARRATORE/REPORT_SPESORA_EP01_NARRATORE.md`.

## Correzioni e aggiunte specifiche della versione B

| Tempo | Battuta / momento | Correzione |
|---|---|---|
| 2,6–5,0 s | P: «Sono le otto e non so ancora cosa cucinare.» | Nuovo labiale (visemi italiani A, E, I, O, U, M/B/P, F/V), testa che accompagna la frase, sospiro finale. |
| 6,4–9,1 s | P: «Non ditemi che succede solo a me.» | Si gira verso lo spettatore e parla in camera; alza le spalle; pausa comica dopo. |
| 8,0–9,1 s | — | Ri-render con la camera che segue la testa e il ripiano della porta nascosto (prima "tagliava" la testa). |
| 13,4–17 s | M: «Se ti organizzassi prima, non saremmo qui ogni sera.» | Mina parla guardandolo, accenti con tutto il corpo; lui la guarda, ancora sorpreso. |
| 17–22,6 s | M: «Guarda! Hai già i pasti della settimana, / le ricette e la lista della spesa.» | Battuta divisa in due per stare nel ritmo della dimostrazione; Mina indica il bordo dello schermo. |
| 27,0–29,3 s | P: «Quindi domani so già cosa cucinare?» | Labiale, sguardo da Mina al telefono, mano al mento. |
| 29,5–30,6 s | M: «Anche dopodomani.» | Risposta pronta, Mina soddisfatta. |
| 30,6–32 s | — | Sguardo in camera e pausa comica sul primo piano, poi l'outro. |

## Rig del viso

- Visemi del protagonista: `m_vA`, `m_vE`, `m_vI`, `m_vO`, `m_vU`, `m_vM`, `m_vF` (in `scripts/facekit.py`), con chiusura sulle pause e sulla punteggiatura (`anim.visemes`).
- Mina ha lo stesso set di visemi, costruito sulla sua bocca originale (la mascotte non è stata modificata).
- Il labiale attuale è **provvisorio**: è generato dal testo. Quando arrivano i WAV definitivi va riallineato sulle registrazioni.

## Tracce audio

`VOICE_PROTAGONIST`, `VOICE_MINA` (vuote, da sostituire), `SFX`, `MUSIC`, `AMBIENCE`: tutte originali, sintetizzate in codice.
