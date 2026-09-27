# Day carousel

Per ogni giorno, una serie di immagini verticali (1080×1920) da scorrere, con in alto "day one", "day two"…
Si postano come carosello (TikTok in modalità foto, Instagram) con la colonna sonora scelta in base ai risultati del giorno.

1. Nell'app: **Resoconto settimana → File completo della settimana → Settimana scorsa**. Salva o condividi `resoconto-AAAA-Wxx.json`.
2. Qui:

```sh
npm install
node make-carousel.mjs resoconto-2026-W41.json             # tutti e 7 i giorni → out/2026-W41/
node make-carousel.mjs resoconto-2026-W41.json --only 1    # solo lunedì
node make-carousel.mjs resoconto-2026-W41.json --pubblico  # senza umore, peso, nomi dei farmaci e note
```

Ogni giorno ha la sua cartella con `01.jpg`, `02.jpg`… e `didascalia.txt` (testo del post, hashtag e colonna sonora).

## Le immagini, in ordine

1. **day N**, data e riepilogo: azioni fatte, saltate, non segnate.
2. **La giornata**: ogni azione in ordine di orario, con ✅ se l'hai fatta e ❌ se no ("saltata" o "non segnata").
3. **Il bilancio**: sonno, umore, acqua, ore di allenamento, farmaci, pesata, serie in palestra, pasti registrati, missioni del primo mese, note.
4. **Avrei voluto fare** (❌, non fatte) e **Non avrei voluto fare** (✅, fatte), dal diario del giorno.
5. **Il volto di Thorfinn** a tutto schermo, con l'espressione che corrisponde a com'è andata la giornata.

## Com'è andata: volto e colonna sonora

Dalla percentuale di azioni fatte dipendono il volto dell'ultima immagine e la colonna sonora (sigle di Vinland Saga).
La musica si aggiunge nell'app quando posti ("Aggiungi suono"), così è quella con licenza della piattaforma.

| Azioni fatte | Giornata | File in `faces/` | Espressione | Brano | In alternativa |
| --- | --- | --- | --- | --- | --- |
| 90% e più | da guerriero | `guerriero` | sguardo deciso, da battaglia | Dark Crow — MAN WITH A MISSION | MUKANJYO — Survive Said The Prophet |
| 75–89% | forte | `forte` | sorriso sicuro | MUKANJYO — Survive Said The Prophet | Paradox — Survive Said The Prophet |
| 60–74% | costante | `costante` | sereno, guarda lontano | River — Anonymouz | Ember — haju:harmonics |
| 40–59% | a metà | `meta` | stanco, pensieroso | Torches — Aimer | Drown — milet |
| meno del 40% | di ripartenza | `ripartenza` | triste, ma ancora in piedi | Without Love — LMYK | Torches — Aimer |

## Impostazioni (`config.json`)

- `dayOne`: il giorno che diventa "day one" (poi si conta da lì).
- `credit`: la riga sulle immagini dell'anime nella prima e nell'ultima immagine.
- `hashtags`: quelli della didascalia (si aggiunge da solo `#dayN`).

## Immagini dall'anime

Tutti fotogrammi di Vinland Saga (jpg, png, webp); le due cartelle non vengono caricate su GitHub.

- `backgrounds/`: i paesaggi dietro le liste, uno diverso per ogni immagine, in ordine alfabetico.
- `faces/`: il volto di Thorfinn, un file per ogni tipo di giornata (tabella sopra), es. `forte.jpg`, `forte-2.jpg`.
  Se il volto non è al centro del fotogramma, `forte@30.jpg` vuol dire "il volto è al 30% della larghezza".

Se `backgrounds/` è vuota, lo script usa paesaggi di prova generati con `make-landscapes.py` (Python 3 con Pillow), solo per
controllare l'impaginazione; se manca il volto di quella giornata, l'ultima immagine è una chiusura senza volto.

Font: Cinzel e Inter (SIL Open Font License, in `fonts/`). Per le emoji serve il font Noto Color Emoji.
Chromium: quello di Playwright (`npx playwright install chromium`) oppure indicane uno con `CHROMIUM_PATH`.
