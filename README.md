<p align="center"><img src="icons/icon-512.png" width="120" alt="Quota"></p>

<h1 align="center">quota</h1>
<p align="center"><i>Ogni giorno, il tuo equilibrio.</i></p>

Quota è un'app di budget giornaliero. Scegli un periodo (per esempio da uno stipendio all'altro) e quanti soldi hai: l'app li divide per i giorni e ti dice **quanto puoi spendere oggi**.

- Quello che non spendi oggi **si aggiunge a domani**.
- Se sfori, scegli tu cosa succede (in *Periodi*):
  - **Recupera**: la quota resta uguale, vai in negativo (es. −37,43 €) e l'app ti dice quanti giorni senza spese servono per tornare in pari.
  - **Ricalcola**: quello che resta viene ridiviso sui giorni che mancano, così arrivi sempre a fine periodo.
- Le **entrate** vengono divise tra i giorni che restano.
- Calendario con tre stati riconoscibili anche dalla forma: cerchio pieno (in quota), cerchio vuoto (zero spese), cerchio con punto (sforato).
- Tema chiaro e scuro automatici, funziona **offline** e si installa sulla schermata Home.

I dati restano **solo sul telefono**: nessun account, nessun server. Da *Periodi* puoi scaricare e ricaricare un backup.

## File

| File | A cosa serve |
|---|---|
| `index.html` | Struttura dell'app (Oggi, Movimenti, Calendario, Periodi) |
| `style.css` | Colori, font e layout, tema chiaro e scuro |
| `app.js` | Logica: periodi, movimenti, quota, riporto, backup |
| `manifest.webmanifest` | Nome, colori e icone per l'installazione |
| `sw.js` | Service worker per l'uso offline |
| `icons/` | Logo e icone |
| `.nojekyll` | Dice a GitHub Pages di pubblicare i file così come sono |

## Pubblicarla su GitHub Pages

**Dal sito, senza terminale**
1. Vai su [github.com/new](https://github.com/new), chiama il repository `quota`, scegli **Public** e crealo.
2. Clicca **uploading an existing file** e trascina tutto il **contenuto** della cartella `quota` (file e cartella `icons`). Clicca **Commit changes**.
3. **Settings → Pages** → *Deploy from a branch* → branch **main**, cartella **/ (root)** → **Save**.
4. Dopo 1–2 minuti l'app è su `https://TUO-NOME-UTENTE.github.io/quota/`.

**Con Claude Code o dal terminale**
```bash
cd quota
git init
git add .
git commit -m "Prima versione di Quota"
git branch -M main
git remote add origin https://github.com/TUO-NOME-UTENTE/quota.git
git push -u origin main
```
Poi attiva Pages come al punto 3.

## Installarla sul telefono
- **iPhone:** Safari → Condividi → **Aggiungi alla schermata Home**.
- **Android:** Chrome → ⋮ → **Installa app**.

## Aggiornare l'app
Dopo ogni modifica, in `sw.js` cambia `const VERSION = 'quota-v1';` in `quota-v2`, `quota-v3`… così i telefoni scaricano la nuova versione.

## Identità

| Colore | Chiaro | Scuro |
|---|---|---|
| Sfondo | Grigio nuvola `#F2F3F1` | Notte `#15171C` |
| Testo | Grafite `#242624` | Gesso `#F1F0EC` |
| Accento | Arancio vivo `#F47735` | `#F47735` |
| In quota | Menta `#35B982` | `#35B982` |
| In rosso | Corallo tenue `#E77979` | `#E77979` |

Font: **Plus Jakarta Sans** (titoli e cifre) e **Inter** (testi), da Google Fonts.
Logo: un sole che sorge sull'orizzonte, la quota come punto di equilibrio.
