# Video della settimana

Un video verticale (1080×1920, 30 fps) per ogni giorno della settimana, da guardare 7 giorni dopo.

1. Nell'app: **Resoconto settimana → File completo della settimana → Settimana scorsa**. Salva o condividi `resoconto-AAAA-Wxx.json`.
2. Qui:

```sh
npm install
node make-videos.mjs resoconto-2026-W41.json            # tutti e 7 i giorni → out/2026-W41/
node make-videos.mjs resoconto-2026-W41.json --day 1    # solo lunedì
node make-videos.mjs resoconto-2026-W41.json --draft    # anteprima veloce, qualità più bassa
```

## Cosa c'è in ogni video, in ordine

1. Giorno e riepilogo: azioni fatte, saltate, non segnate.
2. **La giornata**: ogni azione in ordine di orario, con ✅ se l'hai fatta e ❌ se no ("saltata" o "non segnata").
3. **Il bilancio**: sonno, umore, acqua, ore di allenamento, farmaci, pesata, serie in palestra, pasti registrati, missioni del primo mese, note.
4. **Avrei voluto fare** (❌, non fatte) e **Non avrei voluto fare** (✅, fatte), dal diario del giorno.
5. Chiusura.

## Sfondi

Metti le tue immagini (jpg, png, webp) in `backgrounds/`: vengono usate in ordine alfabetico e scorrono lentamente di lato.
Quella cartella non viene caricata su GitHub. Se è vuota, lo script genera paesaggi nordici originali con `make-landscapes.py`
(serve Python 3 con Pillow).

Font: Cinzel e Inter (SIL Open Font License, in `fonts/`). Per le emoji serve il font Noto Color Emoji.
Chromium: quello di Playwright (`npx playwright install chromium`) oppure indicane uno con `CHROMIUM_PATH`.
