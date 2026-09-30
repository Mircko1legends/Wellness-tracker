# Care Package

App per due persone: **lei** (Sudafrica) esprime desideri con foto e link del prodotto esatto, **tu** (Italia) vedi prezzi e budget e compri dai negozi che consegnano a casa sua.

- Lei non vede mai i prezzi. Il database glielo impedisce: la tabella `prices` è leggibile solo dal ruolo `giver`.
- L'indirizzo di lei lo vede solo lei. Tu lo vedi solo se lei attiva "Share address with my friend".
- Si installa su Android e iPhone come una normale app (PWA), senza store.

## 1. Provarla sul PC (modalità demo)

```bash
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Poi apri http://localhost:8080. Con `config.js` vuoto l'app usa dati di esempio salvati solo nel browser; il pulsante in alto passa da una vista all'altra.

## 2. Collegare il database vero (Supabase, gratis)

1. Crea un account su https://supabase.com e un nuovo progetto (regione: la più vicina, es. Frankfurt).
2. **SQL Editor → New query**: incolla `supabase/schema.sql`, **cambia le due email in fondo** (la tua come `giver`, la sua come `receiver`) e premi **Run**.
3. **Authentication → URL Configuration**: in *Site URL* e *Redirect URLs* metti l'indirizzo dove pubblichi l'app (vedi punto 3) e anche `http://localhost:8080`.
4. **Project Settings → API**: copia *Project URL* e *anon public key* dentro `config.js`.

L'accesso è con link via email: niente password.

## 3. Metterla online (GitHub Pages, gratis)

Serve un indirizzo `https://` perché i telefoni possano installarla.

1. Installa Git: https://git-scm.com/download/win (oppure `winget install Git.Git`).
2. Crea una repo **privata** su GitHub, per esempio `care-package`.
3. Dalla cartella del progetto:
   ```bash
   git init
   git add .
   git commit -m "Care Package"
   git branch -M main
   git remote add origin https://github.com/TUO-UTENTE/care-package.git
   git push -u origin main
   ```
4. Su GitHub: **Settings → Pages → Branch: main / root → Save**. Dopo un minuto l'app è su `https://TUO-UTENTE.github.io/care-package/`.
   Nota: GitHub Pages da repo privata richiede un piano a pagamento. In alternativa usa Netlify o Cloudflare Pages (gratis anche con repo privata): trascini la cartella e ottieni il link.

## 3b. Pubblicazione automatica (questa repo)

In questa repo l'app è nella cartella `care-package/` e il workflow `.github/workflows/care-package-pages.yml` la pubblica da solo su GitHub Pages a ogni push:

**https://mircko1legends.github.io/Wellness-tracker/care-package/**

Una volta sola: **Settings → Pages → Source: GitHub Actions**. Ricordati di mettere questo indirizzo anche in Supabase (*Site URL* / *Redirect URLs*).

## 4. Installarla sul telefono

- **Android (Chrome)**: apri il link → menu ⋮ → *Installa app* / *Aggiungi a schermata Home*.
- **iPhone (Safari)**: apri il link → pulsante Condividi → *Aggiungi alla schermata Home*.

## Struttura

| File | Cosa fa |
|---|---|
| `index.html`, `styles.css`, `app.js` | L'app (JavaScript semplice, nessuna build) |
| `config.js` | Chiavi Supabase (vuoto = demo) |
| `supabase/schema.sql` | Tabelle e regole di privacy |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installazione come app e funzionamento offline |
| `tools/serve.ps1` | Server locale per provarla |
| `tools/make-icons.ps1` | Rigenera le icone |

## Limiti noti

- I cataloghi dei negozi non si caricano dentro l'app: lei incolla il link e allega lo screenshot del prodotto.
- "Chi consegna prima?" apre una ricerca Google con il prodotto e la sua città: la scelta finale la fai tu.
- Gli acquisti li fai tu nell'app del negozio (Checkers Sixty60, Mr D, Takealot…), con il suo indirizzo condiviso.
