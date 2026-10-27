/* Quota — ogni giorno, il tuo equilibrio.
   Budget per periodo con quota giornaliera e riporto. I dati restano nel browser (localStorage). */
(function () {
  'use strict';

  /* ---------------- utilità ---------------- */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  /* ---------------- lingua ---------------- */
  const L = window.QUOTA_I18N;
  let lang = 'it', loc = 'it-IT', eur;
  function setLang(id) {
    const def = L.LANGS.find((x) => x.id === id) || L.LANGS[0];
    lang = def.id; loc = def.locale;
    eur = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' });
    document.documentElement.lang = lang;
  }
  function t(key, vars) {
    let s = (L[lang] && L[lang][key]) != null ? L[lang][key] : (L.it[key] != null ? L.it[key] : key);
    if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  const tn = (key, n, vars) => t(key + (n === 1 ? '_one' : '_other'), Object.assign({ n }, vars || {}));
  function applyStatic() {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    renderMoreApps();
  }
  /* ---------------- condividi e altre app di Sandra ---------------- */
  const APP_URL = 'https://sandras-apps.github.io/quota-app/';
  // La stessa lista è in tutte le app di Sandra. Si vedono solo quelle con live: true:
  // quando un'app esce per tutti, metti live: true. "Gratis, senza account" solo dove è vero.
  const OTHER_APPS = [
    { id: 'inward', name: 'Inward', url: 'https://sandras-apps.github.io/inward-app/', live: true,
      it: 'Una domanda profonda al giorno, da scrivere sul tuo diario di carta. Gratis, senza account.',
      en: 'One deep question a day, to answer in your own paper journal. Free, no account.',
      es: 'Una pregunta profunda al día, para responder en tu diario de papel. Gratis, sin cuenta.' },
    { id: 'quota', name: 'Quota', url: 'https://sandras-apps.github.io/quota-app/', live: false,
      it: 'Ti dice quanto puoi spendere oggi; se un giorno risparmi, il giorno dopo hai di più. Gratis, senza account.',
      en: 'Tells you how much you can spend today; save a little and tomorrow you have more. Free, no account.',
      es: 'Te dice cuánto puedes gastar hoy; si un día ahorras, al día siguiente tienes más. Gratis, sin cuenta.' },
    { id: 'easy-recipes', name: 'Easy Recipes', url: 'https://sandras-apps.github.io/easy-recipes/', live: true,
      it: 'Ricette semplici con le dosi dentro ogni passaggio e i timer già pronti. Gratis, senza account.',
      en: 'Simple recipes with the amounts inside every step and timers ready to go. Free, no account.',
      es: 'Recetas sencillas con las cantidades dentro de cada paso y los temporizadores listos. Gratis, sin cuenta.' },
    { id: 'goatstep', name: 'Goatstep', url: '', live: false },
    { id: 'moontick', name: 'MoonTick', url: 'https://getmoontick.com/', live: false }
  ];
  function renderMoreApps() {
    const list = $('moreAppsList'); if (!list) return;
    const apps = OTHER_APPS.filter((a) => a.live && a.id !== 'quota');
    list.textContent = '';
    apps.forEach((a) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = a.url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = a.name;
      const line = document.createElement('span');
      line.textContent = a[lang] || a.en || '';
      li.append(link, line); list.appendChild(li);
    });
    $('moreAppsCard').hidden = apps.length === 0;
  }
  // Menu di condivisione del telefono: l'app non invia niente, sceglie la persona.
  // Dove non c'è (quasi tutti i computer) copiamo messaggio e link.
  function shareApp() {
    const msg = $('shareAppMsg'); msg.hidden = true;
    const say = (s) => { msg.textContent = s; msg.hidden = false; };
    if (navigator.share) { navigator.share({ title: 'Quota', text: t('share.msg'), url: APP_URL }).catch(() => {}); return; }
    const all = t('share.msg') + ' ' + APP_URL;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(all).then(() => say(t('share.copied')), () => say(t('share.failed') + ' ' + APP_URL));
    } else say(t('share.failed') + ' ' + APP_URL);
  }
  $('btnShareApp').addEventListener('click', shareApp);
  const money = (v) => eur.format(v);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const toD = (s) => new Date(s + 'T00:00:00');
  const diff = (a, b) => Math.round((toD(b) - toD(a)) / 864e5);
  const addDays = (s, n) => { const d = toD(s); d.setDate(d.getDate() + n); return ymd(d); };
  const short = (s) => toD(s).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  const long = (s) => toD(s).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const monthYear = (d) => d.toLocaleDateString(loc, { month: 'long', year: 'numeric' });
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  // nomi dei giorni da lunedì (il 1° gennaio 2024 era lunedì)
  const weekdays = (style) => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday: style }));
  const range = (p) => {
    const a = toD(p.start), b = toD(p.end);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return a.getDate() + '–' + b.getDate() + ' ' + monthYear(b);
    return short(p.start) + ' – ' + b.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const parseAmt = (s) => {
    // accetta 12,50 / 12.50 / 1.200,50 / 1,200.50 / 1.200 / 1,200 (gli euro non hanno 3 decimali,
    // quindi tre cifre dopo l'unico separatore sono migliaia: "1.200" = 1200, non 1,20)
    let x = String(s).replace(/[€\s ]/g, '');
    if (/^[1-9]\d{0,2}([.,])\d{3}(\1\d{3})*$/.test(x)) x = x.replace(/[.,]/g, '');
    const lc = x.lastIndexOf(','), ld = x.lastIndexOf('.');
    if (lc > ld) x = x.replace(/\./g, '').replace(',', '.');
    else if (ld > lc && lc !== -1) x = x.replace(/,/g, '');
    const v = parseFloat(x);
    return isFinite(v) ? Math.round(v * 100) / 100 : NaN;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- icone e categorie ---------------- */
  const I = {
    cart: '<path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19.5 8H6.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="19" r="1.4" fill="currentColor"/><circle cx="17" cy="19" r="1.4" fill="currentColor"/>',
    cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 10h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 3.5c0 1.5 1.5 1.5 1.5 3M12.5 3.5c0 1.5 1.5 1.5 1.5 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    home: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    bus: '<rect x="5" y="4" width="14" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 11h14M8 20v-3M16 20v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8.5" cy="14" r="1" fill="currentColor"/><circle cx="15.5" cy="14" r="1" fill="currentColor"/>',
    fork: '<path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2 1.5-3 4-3 7h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    dots: '<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>',
    coin: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.5 9.2A3 3 0 0 0 12 8c-1.7 0-3 .9-3 2s1.3 1.6 3 2 3 .9 3 2-1.3 2-3 2a3 3 0 0 1-2.5-1.2M12 6.5V8M12 16v1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    back: '<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6-.5 6-1.5S14 5 12 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    tag: '<path d="M4 12.6V5a1 1 0 0 1 1-1h7.6a1 1 0 0 1 .7.3l6.4 6.4a1 1 0 0 1 0 1.4l-7.6 7.6a1 1 0 0 1-1.4 0l-6.4-6.4a1 1 0 0 1-.3-.7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8v4M12 15.5v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    key: '<circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    jar: '<path d="M8 3h8M9 3v3c-2 1-4 3-4 6v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6c0-3-2-5-4-6V3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 13h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  const svg = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || I.dots) + '</svg>';
  const CATS = {
    out: [
      { id: 'alimentari', name: 'Alimentari', icon: 'cart' },
      { id: 'caffe', name: 'Caffè', icon: 'cup' },
      { id: 'ristorante', name: 'Fuori', icon: 'fork' },
      { id: 'casa', name: 'Casa', icon: 'home' },
      { id: 'trasporti', name: 'Trasporti', icon: 'bus' },
      { id: 'cura', name: 'Cura di sé', icon: 'leaf' },
      { id: 'svago', name: 'Tempo libero', icon: 'heart' },
      { id: 'altro', name: 'Altro', icon: 'dots' }
    ],
    in: [
      { id: 'stipendio', name: 'Stipendio', icon: 'coin' },
      { id: 'rimborso', name: 'Rimborso', icon: 'back' },
      { id: 'regalo', name: 'Regalo', icon: 'gift' },
      { id: 'extra', name: 'Lavoretto', icon: 'spark' },
      { id: 'altro-in', name: 'Altro', icon: 'dots' }
    ]
  };
  // categorie tue (in Impostazioni → Categorie, o col "+" accanto ad Altro): vanno prima di "Altro"
  const MAX_CATS = 8;
  const myCats = (ty) => ((state.cats && state.cats[ty]) || []).map((c) => ({ id: c.id, name: c.name, icon: 'tag', custom: true }));
  const cats = (ty) => { const base = CATS[ty]; return base.slice(0, -1).concat(myCats(ty), base.slice(-1)); };
  const catName = (c) => c.custom ? c.name : t('cat.' + c.id);
  // spese prese dai risparmi (imprevisti): non toccano la quota
  const SAV = { id: 'imprevisto', icon: 'shield' };
  const JAR = { id: 'risparmi', icon: 'jar' };
  const catOf = (e) => { if (e.fromSavings) return SAV; if (e.sav) return JAR; const l = cats(e.type === 'in' ? 'in' : 'out'); return l.find((c) => c.id === e.cat) || l[l.length - 1]; };
  function addCat(ty, raw) {
    const name = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!name) return null;
    const all = cats(ty);
    const same = all.find((c) => catName(c).toLowerCase() === name.toLowerCase());
    if (same) return same.id;
    if (myCats(ty).length >= MAX_CATS) { toast(t('cats.full', { n: MAX_CATS })); return null; }
    state.cats = state.cats || { out: [], in: [] };
    state.cats[ty] = state.cats[ty] || [];
    const id = 'c_' + uid();
    state.cats[ty].push({ id, name });
    save();
    return id;
  }

  /* ---------------- stato ---------------- */
  const KEY = 'quota-v1';
  // cats: categorie tue · fixed: spese fisse (affitto, bollette…) · paid: scadenze già viste/pagate, per periodo
  let state = { periods: [], current: null, entries: {}, settings: { overspend: 'riporto' }, cats: { out: [], in: [] }, fixed: [], paid: {} };
  try { const raw = localStorage.getItem(KEY); if (raw) state = Object.assign(state, JSON.parse(raw)); } catch (e) { /* storage non disponibile */ }
  state.settings = Object.assign({ overspend: 'riporto' }, state.settings || {});
  state.cats = Object.assign({ out: [], in: [] }, state.cats || {});
  state.fixed = Array.isArray(state.fixed) ? state.fixed : [];
  state.paid = state.paid && typeof state.paid === 'object' ? state.paid : {};
  if (!state.settings.lang) {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'it';
    const guess = nav.slice(0, 2).toLowerCase();
    state.settings.lang = L.LANGS.some((x) => x.id === guess) ? guess : 'it';
  }
  setLang(state.settings.lang);
  let memo = {};
  const save = () => {
    memo = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast(t('saveFail')); }
  };

  let today = ymd(new Date());
  let selDate = today;   // giorno selezionato nel calendario
  let addDate = null;    // giorno a cui si aggiungono i movimenti (null = oggi)
  let type = 'out';
  let cat = 'alimentari';
  let spread = true;     // entrate: divise sui giorni (true) o tutte subito (false)
  let filter = 'all';
  let editingId = null;

  const cur = () => state.periods.find((p) => p.id === state.current);
  const list = () => (state.entries[state.current] = state.entries[state.current] || []);
  const inPeriod = (p, d) => d >= p.start && d <= p.end;

  /* ---------------- calcolo ----------------
     Ogni fonte di soldi (somma iniziale ed entrate) viene divisa in parti uguali sui giorni
     che vanno dal suo arrivo alla fine del periodo.
     Disponibile all'inizio di un giorno = maturato fino a quel giorno compreso − spese dei giorni prima.

     Se spendi più della quota (Impostazioni):
     - "Recupera" (riporto): la quota resta fissa; risparmi e sforamenti passano ai giorni dopo.
     - "Ricalcola": ogni giorno i soldi rimasti vengono divisi per i giorni che mancano alla fine. */
  // Un'entrata può contare "tutto subito" (es. un rimborso: si aggiunge alla quota di quel giorno)
  // oppure "divisa sui giorni" (es. lo stipendio: si spalma fino alla fine del periodo).
  // Le entrate vecchie senza scelta: i rimborsi contano subito, il resto viene diviso.
  const isOneOff = (e) => e.type === 'in' && (e.spread === false || (e.spread === undefined && e.cat === 'rimborso'));

  /* ---------------- da parte: risparmi e spese fisse ----------------
     I risparmi del periodo e le spese fisse (affitto, bollette, abbonamenti) che scadono nel periodo
     vengono tolti subito dai soldi del periodo: la quota giornaliera è già calcolata senza di loro.
     Le spese prese dai risparmi (imprevisti) non contano nella quota. */
  // movimenti dei risparmi: sav 'add' (messi da parte, escono dal periodo), sav 'back' (tolti, tornano
  // nel periodo divisi sui giorni che restano), fromSavings (imprevisto pagato con i risparmi)
  const isSavMove = (e) => !!(e.fromSavings || e.sav === 'add' || e.sav === 'back');
  const isDeposit = (e) => e.sav === 'add';
  const counts = (e) => e.type !== 'in' && !isSavMove(e);
  const deposits = (day) => list().reduce((a, e) => a + (isDeposit(e) && (!day || e.date <= day) ? e.amount : 0), 0);
  const dim = (y, m) => new Date(y, m + 1, 0).getDate();
  // n-esimo giorno della settimana del mese (pos 1–4, -1 = l'ultimo)
  function nthWeekday(y, m, wd, pos) {
    if (pos === -1) { const last = new Date(y, m, dim(y, m)); return new Date(y, m, dim(y, m) - ((last.getDay() - wd + 7) % 7)); }
    const first = new Date(y, m, 1);
    return new Date(y, m, 1 + ((wd - first.getDay() + 7) % 7) + (pos - 1) * 7);
  }
  const posOf = (s) => { const n = Math.ceil(toD(s).getDate() / 7); return n >= 5 ? -1 : n; };
  const STEP = { month: 1, '2month': 2, year: 12 };
  // date in cui scade una spesa fissa tra from e to (comprese)
  function occurrences(f, from, to) {
    if (f.repeat === 'custom') {
      // ogni N giorni / settimane / mesi a partire da first
      const n = Math.max(1, Math.round(f.every || 1)), u = f.unit, out = [], F = toD(f.first);
      for (let k = 0; k < 2000; k++) {
        let d;
        if (u === 'month') { const mi = F.getMonth() + k * n, y = F.getFullYear() + Math.floor(mi / 12), m = ((mi % 12) + 12) % 12; d = ymd(new Date(y, m, Math.min(F.getDate(), dim(y, m)))); }
        else d = addDays(f.first, k * n * (u === 'week' ? 7 : 1));
        if (d > to) break;
        if (d >= from) out.push(d);
      }
      return out;
    }
    if (f.repeat === 'once' || !STEP[f.repeat]) return f.first >= from && f.first <= to ? [f.first] : [];
    const step = STEP[f.repeat], F = toD(f.first), out = [];
    const byWd = f.by === 'weekday' && f.repeat !== 'year';
    const pos = byWd ? posOf(f.first) : 0;
    const startK = Math.max(0, Math.floor(((toD(from).getFullYear() - F.getFullYear()) * 12 + toD(from).getMonth() - F.getMonth()) / step) - 1);
    for (let k = startK; k < startK + 400; k++) {
      const mi = F.getMonth() + k * step, y = F.getFullYear() + Math.floor(mi / 12), m = ((mi % 12) + 12) % 12;
      const dayN = f.dom || F.getDate();
      const d = byWd ? ymd(nthWeekday(y, m, F.getDay(), pos)) : ymd(new Date(y, m, Math.min(dayN, dim(y, m))));
      if (d > to) break;
      if (d >= from && d >= f.first) out.push(d);
    }
    return out;
  }
  const occKey = (f, d) => f.id + '@' + d;
  const paidOf = (p) => (state.paid[p.id] = state.paid[p.id] || {});
  // tutte le scadenze del periodo, in ordine di data
  function dues(p) {
    const k = 'dues:' + p.id + ':' + p.start + ':' + p.end;
    if (memo[k]) return memo[k];
    const done = state.paid[p.id] || {};
    const r = [];
    state.fixed.forEach((f) => occurrences(f, p.start, p.end).forEach((d) => {
      const h = done[occKey(f, d)];
      r.push({ f, date: d, key: occKey(f, d), amount: h ? h.amount : f.amount, done: !!h });
    }));
    return (memo[k] = r.sort((a, b) => a.date.localeCompare(b.date)));
  }
  const fixedTotal = (p) => dues(p).reduce((a, x) => a + x.amount, 0);
  const reserved = (p) => (p.save || 0) + fixedTotal(p);
  // risparmi accumulati con Quota: messi da parte nei periodi già iniziati − imprevisti pagati
  function savingsPot() {
    const inn = state.periods.reduce((a, p) => a + (p.start <= today ? (p.save || 0) : 0), 0);
    const moved = Object.values(state.entries).reduce((a, l) => a + (l || []).reduce((b, e) =>
      b + (isDeposit(e) ? e.amount : (e.fromSavings || e.sav === 'back') ? -e.amount : 0), 0), 0);
    return Math.round((inn + moved) * 100) / 100;
  }
  /* Se togli dei risparmi che erano già stati usati, quello che hai usato resta senza copertura.
     Dal più recente: gli imprevisti diventano uscite normali del giorno in cui li hai fatti,
     i soldi "tolti dai risparmi" escono di nuovo dalla quota. */
  const r2 = (x) => Math.round(x * 100) / 100;
  function coverPlan(deficit, skipPid) {
    const items = [];
    Object.keys(state.entries).forEach((pid) => { if (pid !== skipPid) (state.entries[pid] || []).forEach((e) => { if (e.fromSavings || e.sav === 'back') items.push({ pid, e }); }); });
    items.sort((a, b) => b.e.date.localeCompare(a.e.date));
    let left = deficit; const plan = [];
    for (const it of items) { if (left <= 0.004) break; const amt = r2(Math.min(left, it.e.amount)); plan.push({ pid: it.pid, e: it.e, amt }); left = r2(left - amt); }
    return plan;
  }
  function applyPlan(plan) {
    plan.forEach(({ pid, e, amt }) => {
      const l = state.entries[pid]; if (!l) return;
      const full = amt >= e.amount - 0.004;
      if (e.fromSavings) {
        if (full) { delete e.fromSavings; e.cat = 'altro'; e.wasEmergency = true; }
        else { e.amount = r2(e.amount - amt); l.push({ id: uid(), date: e.date, amount: amt, type: 'out', cat: 'altro', note: e.note, wasEmergency: true }); }
      } else if (full) state.entries[pid] = l.filter((x) => x !== e);
      else e.amount = r2(e.amount - amt);
    });
  }
  function planText(plan) {
    const u = plan.reduce((a, x) => a + (x.e.fromSavings ? x.amt : 0), 0), b = plan.reduce((a, x) => a + (x.e.fromSavings ? 0 : x.amt), 0);
    const parts = [];
    if (u > 0) parts.push(t('pot.uses', { amt: money(u) }));
    if (b > 0) parts.push(t('pot.backs', { amt: money(b) }));
    return t('pot.warn', { what: parts.join(t('pot.and')) });
  }

  function sources(p) {
    const s = [{ date: p.start, amount: (p.base || 0) - reserved(p) }];
    list().forEach((e) => {
      if (e.type === 'in') s.push({ date: e.date < p.start ? p.start : e.date, amount: e.amount, once: isOneOff(e) });
      // messi nei risparmi: escono tutti dal giorno in cui li sposti
      else if (isDeposit(e)) s.push({ date: e.date < p.start ? p.start : e.date, amount: -e.amount, once: true });
    });
    return s;
  }
  function accrued(p, day) {
    let t = 0;
    for (const s of sources(p)) {
      if (day < s.date) continue;
      if (s.once) { t += s.amount; continue; }
      const span = diff(s.date, p.end) + 1;
      t += s.amount * Math.min(diff(s.date, day) + 1, span) / span;
    }
    return t;
  }
  const quotaOn = (p, day) => accrued(p, day) - (day > p.start ? accrued(p, addDays(day, -1)) : 0);
  const outOn = (day) => list().reduce((a, e) => a + (counts(e) && e.date === day ? e.amount : 0), 0);
  const outBefore = (day) => list().reduce((a, e) => a + (counts(e) && e.date < day ? e.amount : 0), 0);
  const availableAt = (p, day) => accrued(p, day) - outBefore(day);
  const mode = () => state.settings.overspend === 'ricalcola' ? 'ricalcola' : 'riporto';
  const knownMoney = (p, day) => (p.base || 0) - reserved(p) - deposits(day) + list().reduce((a, e) => a + (e.type === 'in' && e.date <= day ? e.amount : 0), 0);
  function dayInfo(p, day) {
    const q0 = quotaOn(p, day);
    if (mode() === 'ricalcola') {
      const once = list().reduce((a, e) => a + (isOneOff(e) && (e.date === day || (day === p.start && e.date < p.start)) ? e.amount : 0), 0);
      const rest = knownMoney(p, day) - outBefore(day) - once;
      const total = rest + once;
      const n = diff(day, p.end) + 1;
      const avail = Math.max(0, Math.min(total, (rest > 0 ? rest / n : 0) + once));
      return { avail, quota: avail, carried: 0, rest: total, n, q0 };
    }
    const avail = availableAt(p, day);
    return { avail, quota: q0, carried: avail - q0, q0 };
  }
  // "Recupera": il primo giorno in cui torni ad avere soldi, se da ora non spendi più nulla
  function recovery(p, day) {
    const spentSoFar = outBefore(addDays(day, 1));
    for (let d = addDays(day, 1); d <= p.end; d = addDays(d, 1)) {
      const a = accrued(p, d) - spentSoFar;
      if (a > 0.005) return { days: diff(day, d), date: d, amount: a };
    }
    return { days: null, missing: spentSoFar - accrued(p, p.end) };
  }
  // quanto avrai domani se oggi non spendi più nulla
  function tomorrowIfStop(p, day) {
    const t = addDays(day, 1);
    if (t > p.end) return null;
    if (mode() === 'ricalcola') {
      const rest = knownMoney(p, day) - outBefore(t);
      return rest > 0 ? rest / (diff(t, p.end) + 1) : 0;
    }
    return accrued(p, t) - outBefore(t);
  }
  function dayState(p, d) {
    if (!inPeriod(p, d)) return 'off';
    if (d > today) return 'future';
    // pallino pieno verde = zero spese · cerchio verde = speso ma in quota
    // pallino pieno rosso = sforato · cerchio rosso = zero spese ma ancora in recupero
    const s = outOn(d), avail = dayInfo(p, d).avail;
    if (s === 0) return avail < -0.005 ? 'rec' : 'zero';
    return avail - s < -0.005 ? 'bad' : 'ok';
  }
  const totals = (p) => {
    const tin = (p.base || 0) - reserved(p) - deposits() + list().reduce((a, e) => a + (e.type === 'in' ? e.amount : 0), 0);
    const tout = list().reduce((a, e) => a + (counts(e) ? e.amount : 0), 0);
    return { tin, tout, left: tin - tout };
  };
  const clampSel = (p) => inPeriod(p, today) ? today : (today < p.start ? p.start : p.end);

  /* ---------------- render: Oggi ---------------- */
  function setRing(frac, cls) {
    const w = $('ringWrap');
    w.classList.remove('neg', 'idle');
    if (cls) w.classList.add(cls);
    const f = Math.max(0, Math.min(1, frac));
    $('ringArc').setAttribute('stroke-dasharray', (f * 100).toFixed(2) + ' 100');
    $('ringArc').style.opacity = f > 0.001 ? '1' : '0';
  }
  function setStatus(kind, icon, title, sub) {
    const s = $('status');
    s.className = 'status' + (kind ? ' ' + kind : '');
    $('statusIco').innerHTML = icon ? svg(icon) : '';
    $('statusTitle').textContent = title;
    $('statusSub').textContent = sub;
  }

  /* ---------------- banner delle scadenze (dentro l'app, niente notifiche) ---------------- */
  const KIND_ICON = { rent: 'home', bill: 'bolt', sub: 'repeat', other: 'flag' };
  let dueEditing = null;
  function renderDues(p) {
    const box = $('dueBanners');
    const pend = inPeriod(p, today) ? dues(p).filter((x) => !x.done && x.date <= today) : [];
    box.innerHTML = pend.map((x) => {
      const f = x.f, isRent = f.kind === 'rent';
      const when = x.date === today ? t('due.today') : t('due.was', { date: short(x.date) });
      let act;
      if (dueEditing === x.key) {
        act = '<div class="due-edit"><input class="num" inputmode="decimal" data-due-input value="' + String(x.amount).replace('.', ',') + '" aria-label="' + esc(t('fx.amount')) + '">' +
          '<button type="button" class="btn accent" data-due-save>' + esc(t('due.save')) + '</button></div>';
      } else if (isRent) {
        act = '<div class="due-act"><button type="button" class="btn" data-due-ok>' + esc(t('due.ok')) + '</button></div>';
      } else {
        act = '<div class="due-act"><button type="button" class="btn" data-due-ok>' + esc(t('due.confirm')) + '</button>' +
          '<button type="button" class="link" data-due-change>' + esc(t('due.change')) + '</button></div>';
      }
      return '<div class="due" data-key="' + esc(x.key) + '" role="status">' +
        '<span class="due-ico">' + svg(KIND_ICON[f.kind] || 'flag') + '</span>' +
        '<div class="due-txt"><span class="due-when">' + esc(when) + '</span>' +
        '<b><span>' + esc(f.name) + '</span> <span class="num">' + money(x.amount) + '</span></b>' +
        '<span class="due-sub">' + esc(t('due.calc')) + '</span>' + act + '</div>' +
        '<button type="button" class="due-x" data-due-ok aria-label="' + esc(t('due.close')) + '">×</button></div>';
    }).join('');
    box.hidden = !pend.length;
  }
  function markPaid(key, amount) {
    const p = cur(); if (!p) return;
    paidOf(p)[key] = { amount: Math.round(amount * 100) / 100, at: today };
    dueEditing = null;
    save(); renderAll();
  }
  $('dueBanners').addEventListener('click', (ev) => {
    const box = ev.target.closest('.due'); if (!box) return;
    const p = cur(); if (!p) return;
    const x = dues(p).find((d) => d.key === box.dataset.key); if (!x) return;
    if (ev.target.closest('[data-due-change]')) { dueEditing = x.key; renderDues(p); const i = $('dueBanners').querySelector('[data-due-input]'); if (i) { i.focus(); i.select(); } return; }
    if (ev.target.closest('[data-due-save]')) {
      const v = parseAmt(box.querySelector('[data-due-input]').value);
      if (!(v >= 0)) { box.querySelector('[data-due-input]').focus(); return; }
      const d = Math.round((v - x.amount) * 100) / 100;
      markPaid(x.key, v);
      toast(d > 0 ? t('due.more', { amt: money(d) }) : d < 0 ? t('due.less', { amt: money(-d) }) : t('due.done'));
      return;
    }
    if (ev.target.closest('[data-due-ok]')) { markPaid(x.key, x.amount); toast(t('due.done')); }
  });
  $('dueBanners').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.matches('[data-due-input]')) { ev.preventDefault(); ev.target.closest('.due').querySelector('[data-due-save]').click(); }
  });

  function renderToday() {
    const p = cur(); if (!p) return;
    $$('.period-name').forEach((el) => { el.textContent = p.name || range(p); });
    renderDues(p);

    if (!inPeriod(p, today)) {
      const tot = totals(p);
      const before = today < p.start;
      $('heroLabel').textContent = before ? t('hero.startsOn', { date: short(p.start) }) : t('hero.ended');
      $('heroAmt').textContent = (tot.left < 0 ? '−' : '') + money(Math.abs(tot.left));
      $('heroSub').textContent = before ? tn('hero.toSplit', diff(p.start, p.end) + 1) : (tot.left >= 0 ? t('hero.saved') : t('hero.overBudget'));
      setRing(before ? 1 : 0, 'idle');
      setStatus('idle', 'flag', before ? t('st.notStarted') : t('st.next'), before ? t('st.notStartedSub') : t('st.nextSub'));
      $('status').dataset.action = before ? '' : 'new';
    } else {
      $('status').dataset.action = '';
      const info = dayInfo(p, today);
      const spent = outOn(today);
      const recalc = mode() === 'ricalcola';
      const left = info.avail - spent;
      const restAfter = recalc ? info.rest - spent : null;

      if (recalc && restAfter < 0) {
        $('heroLabel').textContent = t('hero.budgetOver');
        $('heroAmt').textContent = '−' + money(-restAfter);
        $('heroSub').textContent = t('hero.wholePeriod');
        setRing(1, 'neg');
      } else if (left < 0) {
        $('heroLabel').textContent = recalc ? t('hero.overQuota') : t('hero.inRed');
        $('heroAmt').textContent = '−' + money(-left);
        $('heroSub').textContent = t('hero.quota', { amt: money(info.quota) });
        setRing(1, 'neg');
      } else {
        $('heroLabel').textContent = t('hero.canSpend');
        $('heroAmt').textContent = money(left);
        $('heroSub').textContent = t('hero.of', { amt: money(info.avail) });
        setRing(info.avail > 0 ? left / info.avail : 0);
      }

      // messaggio di stato
      const tm = tomorrowIfStop(p, today);
      const last = today === p.end;
      if (recalc && restAfter < 0) {
        setStatus('neg', 'down', t('st.budgetDone'), t('st.budgetDoneSub', { date: short(p.end) }));
      } else if (left < 0 && recalc) {
        setStatus('neg', 'down', t('st.recalc'), last ? t('st.recalcLast') : t('st.recalcSub', { amt: money(tm), date: short(p.end) }));
      } else if (left < 0) {
        const r = recovery(p, today);
        if (r.days === null) setStatus('neg', 'down', t('st.noRecover', { date: short(p.end) }), t('st.noRecoverSub', { amt: money(r.missing) }));
        else if (r.days === 1) setStatus('neg', 'down', t('st.tomorrowEven'), t('st.tomorrowEvenSub', { amt: money(r.amount) }));
        else setStatus('neg', 'down', t('st.evenIn', { n: r.days }), t('st.evenInSub', { until: short(addDays(r.date, -1)), date: short(r.date), amt: money(r.amount) }));
      } else if (spent === 0) {
        setStatus('zero', '', t('st.zero'), last ? t('st.zeroLast') : t(recalc ? 'st.zeroRecalc' : 'st.zeroCarry', { amt: money(tm) }));
      } else {
        setStatus('', 'up', t('st.left', { amt: money(left) }), last ? t('st.lastDay') : t(recalc ? 'st.leftRecalc' : 'st.leftCarry', { amt: money(tm) }));
      }
    }

    // aggiunta
    const d = addDate || today;
    $('addFor').hidden = !addDate || addDate === today;
    $('addForText').textContent = t('add.addingTo', { date: long(d) });
    $('addBtnText').textContent = type === 'in' ? t('add.btnIn') : t('add.btnOut');
    renderWhen();

    renderWeek(p);
    const items = list().filter((e) => e.date === today);
    $('todayList').innerHTML = items.length ? items.map(itemHTML).join('') : '<li class="empty">' + t('today.empty') + '</li>';
  }

  function renderWeek(p) {
    const dt = toD(today);
    const monday = addDays(today, -((dt.getDay() + 6) % 7));
    const names = weekdays('short').map((x) => cap(x.replace('.', '')));
    let h = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const st = dayState(p, d);
      h += '<button type="button" class="wd" data-day="' + d + '" aria-label="' + long(d) + '">' +
        '<span class="lbl' + (d === today ? ' today' : '') + '">' + names[i] + '</span>' +
        '<span class="dd ' + st + (d === today ? ' today' : '') + '">' + toD(d).getDate() + '</span></button>';
    }
    $('week').innerHTML = h;
  }

  function itemHTML(e) {
    const c = catOf(e);
    if (e.sav === 'add' || e.sav === 'back') {
      const add = e.sav === 'add';
      return '<li class="item sav" data-id="' + e.id + '">' +
        '<span class="ico">' + svg('jar') + '</span>' +
        '<span class="txt"><b>' + esc(e.note || t(add ? 'sav.added' : 'sav.back')) + '</b><span class="sav-tag">' + esc(t(add ? 'sav.addedTag' : 'sav.backTag')) + '</span></span>' +
        '<span class="amt-v num">' + (add ? '→ ' : '+') + money(e.amount) + '</span>' +
        '<button type="button" class="del" aria-label="' + t('item.delete') + '">×</button></li>';
    }
    if (e.fromSavings) {
      return '<li class="item sav" data-id="' + e.id + '">' +
        '<span class="ico">' + svg(c.icon) + '</span>' +
        '<span class="txt"><b>' + esc(e.note || t('sav.emergency')) + '</b><span class="sav-tag">' + esc(t('sav.tag')) + '</span></span>' +
        '<span class="amt-v num">−' + money(e.amount) + '</span>' +
        '<button type="button" class="del" aria-label="' + t('item.delete') + '">×</button></li>';
    }
    return '<li class="item' + (e.type === 'in' ? ' in' : '') + '" data-id="' + e.id + '">' +
      '<span class="ico">' + svg(c.icon) + '</span>' +
      '<span class="txt"><b>' + esc(e.note || catName(c)) + '</b><span>' + esc(catName(c) + (e.wasEmergency ? ' · ' + t('pot.was') : '') + (e.type === 'in' ? ' · ' + (isOneOff(e) ? t('item.once') : t('item.spread')) : '')) + '</span></span>' +
      '<span class="amt-v num">' + (e.type === 'in' ? '+' : '−') + money(e.amount) + '</span>' +
      '<button type="button" class="del" aria-label="' + t('item.delete') + '">×</button></li>';
  }

  let newCatOpen = false;
  function renderCats() {
    const l = cats(type);
    if (!l.some((c) => c.id === cat)) cat = l[0].id;
    let h = l.map((c) =>
      '<button type="button" class="cat" role="radio" aria-checked="' + (c.id === cat) + '" data-cat="' + c.id + '">' + svg(c.icon) + esc(catName(c)) + '</button>'
    ).join('');
    if (newCatOpen) {
      h += '<span class="cat-new"><input id="newCat" maxlength="20" autocomplete="off" placeholder="' + esc(t('cats.newPh')) + '" aria-label="' + esc(t('cats.new')) + '">' +
        '<button type="button" class="btn accent" data-newcat-ok>' + esc(t('cats.ok')) + '</button>' +
        '<button type="button" class="cat-x" data-newcat-no aria-label="' + esc(t('sh.cancel')) + '">×</button></span>';
    } else if (myCats(type).length < MAX_CATS) {
      h += '<button type="button" class="cat cat-plus" data-newcat aria-label="' + esc(t('cats.new')) + '">' + svg('plus') + '</button>';
    }
    $('cats').innerHTML = h;
    if (newCatOpen) {
      const inp = $('newCat');
      inp.focus();
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); confirmNewCat(); }
        if (ev.key === 'Escape') { newCatOpen = false; renderCats(); }
      });
    }
  }
  function confirmNewCat() {
    const v = $('newCat') ? $('newCat').value : '';
    if (!v.trim()) { newCatOpen = false; renderCats(); return; }
    const id = addCat(type, v);
    if (!id) return;
    cat = id; newCatOpen = false;
    renderCats(); renderPeriods();
    toast(t('cats.added'));
  }

  /* ---------------- render: Calendario ---------------- */
  // riepilogo del giorno selezionato (finestra che si apre toccando un giorno)
  function renderDay() {
    const p = cur(); if (!p) return;
    const d = selDate, inP = inPeriod(p, d), future = d > today;
    $('dayTitle').textContent = d === today ? t('cal.today') : cap(long(d));
    const st = dayState(p, d);
    const badge = $('dayBadge');
    const bmap = { ok: 'cal.legendOk', bad: 'cal.legendBad', zero: 'cal.legendZero', rec: 'cal.legendRec', future: 'cal.badgeFuture' };
    badge.className = 'day-badge ' + (st === 'future' ? '' : st);
    badge.textContent = bmap[st] ? t(bmap[st]) : '';
    badge.hidden = !bmap[st];
    const info = dayInfo(p, d), s = outOn(d), avail = info.avail, rest = avail - s;
    $('dsAvailL').textContent = future ? t('cal.stQuota') : t('cal.stAvail');
    $('dsAvail').textContent = money(Math.max(0, future ? info.quota : avail));
    $('dsSpent').parentElement.hidden = future; $('dsRest').parentElement.hidden = future;
    $('dsAvail').parentElement.parentElement.classList.toggle('one', future);
    $('dsSpentL').textContent = t('cal.stSpent');
    $('dsSpent').textContent = money(s);
    $('dsRestL').textContent = rest >= 0 ? t('cal.stLeft') : t('cal.stOver');
    const rb = $('dsRest'); rb.textContent = (rest < 0 ? '−' : '') + money(Math.abs(rest)); rb.className = rest < 0 ? 'neg' : (s > 0 || !future ? 'pos' : '');
    $('dsSpent').parentElement.parentElement.hidden = !inP;
    let line = '';
    if (inP && !future) {
      const ok = rest >= 0, amt = money(Math.abs(rest));
      line = mode() === 'ricalcola' ? t(ok ? 'cal.dayRecalcLeft' : 'cal.dayRecalcOver', { amt }) : t(ok ? 'cal.dayCarryLeft' : 'cal.dayCarryOver', { amt });
      line = cap(line.replace(/^\s*·\s*/, ''));
    } else if (future) line = t('cal.futureHint');
    $('dayLine').textContent = line;
    // scadenze delle spese fisse in quel giorno
    const ds = dues(p).filter((x) => x.date === d);
    $('dayDuesWrap').hidden = !ds.length;
    $('dayDues').innerHTML = ds.map((x) => '<li class="item fx"><span class="ico">' + svg(KIND_ICON[x.f.kind] || 'flag') + '</span>' +
      '<span class="txt"><b>' + esc(x.f.name) + '</b>' + (x.done ? '<span class="fx-st ok">' + svg('check') + esc(t('fx.paidOn', { date: short(x.date) })) + '</span>'
        : '<span class="fx-st' + (x.date < today ? ' late' : '') + '">' + esc(x.date < today ? t('fx.toConfirm', { date: short(x.date) }) : x.date === today ? t('fx.dueToday') : t('fx.dueOn', { date: short(x.date) })) + '</span>') + '</span>' +
      '<span class="amt-v num">' + money(x.amount) + '</span></li>').join('');
    const items = list().filter((e) => e.date === d);
    $('dayList').innerHTML = items.length ? items.map(itemHTML).join('') : '<li class="empty">' + t('cal.dayEmpty') + '</li>';
  }
  function openDay(d) { selDate = d; renderCalendarView(); openSheet('dsheet'); }

  function renderCalendarView() {
    const p = cur(); if (!p) return;
    const tot = totals(p);
    $('pDates').textContent = range(p);
    if (inPeriod(p, today)) {
      const dl = diff(today, p.end) + 1;
      $('pLeftDays').textContent = dl === 1 ? t('cal.lastDay') : tn('cal.daysLeft', dl);
    } else $('pLeftDays').textContent = today < p.start ? t('cal.notStarted') : t('cal.ended');
    const bar = $('pBar');
    bar.style.width = (tot.tin > 0 ? Math.min(100, tot.tout / tot.tin * 100) : (tot.tout ? 100 : 0)) + '%';
    bar.parentElement.classList.toggle('over', tot.left < 0);
    $('pSpent').textContent = t('cal.spentOf', { a: money(tot.tout), b: money(tot.tin) });
    $('pLeft').textContent = tot.left < 0 ? t('cal.over', { amt: money(-tot.left) }) : t('cal.left', { amt: money(tot.left) });
    $('pLeft').style.color = tot.left < 0 ? 'var(--neg-ink)' : '';
    if (inPeriod(p, today) && today < p.end) {
      const tm = tomorrowIfStop(p, today);
      const avg = mode() === 'ricalcola' ? tm : (accrued(p, p.end) - outBefore(addDays(today, 1))) / diff(today, p.end);
      $('pHint').textContent = t(mode() === 'ricalcola' ? 'cal.perDayRecalc' : 'cal.perDayAvg', { amt: money(Math.max(0, avg)) });
    } else $('pHint').textContent = '';

    // calendario
    let h = '';
    const initials = weekdays('narrow');
    let d = p.start, first = true;
    while (d <= p.end) {
      const dt = toD(d);
      if (first || dt.getDate() === 1) {
        h += '<div class="mlabel">' + cap(monthYear(dt)) + '</div>';
        initials.forEach((x) => { h += '<div class="dow">' + x + '</div>'; });
        const lead = (dt.getDay() + 6) % 7;
        for (let i = 0; i < lead; i++) h += '<div></div>';
        first = false;
      }
      const st = dayState(p, d);
      const cls = ['dd', st];
      if (d === today) cls.push('today');
      if (d === selDate) cls.push('sel');
      h += '<button type="button" data-day="' + d + '" aria-label="' + t('cal.dayAria', { date: long(d), amt: money(outOn(d)) }) + '"><span class="' + cls.join(' ') + '">' + dt.getDate() + '</span></button>';
      d = addDays(d, 1);
    }
    $('cal').innerHTML = h;

    renderDay();
  }

  /* ---------------- render: Movimenti ---------------- */
  function renderMoves() {
    const p = cur(); if (!p) return;
    const items = list().filter((e) => filter === 'all' || (filter === 'in' ? e.type === 'in' : e.type !== 'in'));
    const groups = {};
    items.forEach((e) => {
      const sk = e.fromSavings ? 'use' : e.sav || '';
      const c = catOf(e), k = (sk ? 'sav:' + sk + ':' : e.type === 'in' ? 'in:' : 'out:') + c.id;
      groups[k] = groups[k] || { c, in: e.type === 'in', sav: sk, v: 0 };
      groups[k].v += e.amount;
    });
    const arr = Object.values(groups).sort((a, b) => (!!a.sav - !!b.sav) || (b.v - a.v));
    const max = arr.reduce((m, g) => Math.max(m, g.v), 0);
    $('catTotals').innerHTML = arr.length ? arr.map((g) =>
      '<div class="ct' + (g.in ? ' in' : '') + (g.sav ? ' sav' : '') + '"><span class="ico">' + svg(g.c.icon) + '</span><span class="n">' + esc(g.sav ? t({ use: 'sav.groupName', add: 'sav.groupAdd', back: 'sav.groupBack' }[g.sav]) : catName(g.c)) + '</span><span class="v num">' + money(g.v) + '</span>' +
      '<div class="bar"><span style="width:' + (g.v / max * 100) + '%"></span></div></div>'
    ).join('') : '<p class="empty">' + t('moves.empty') + '</p>';

    const byDay = {};
    items.forEach((e) => { (byDay[e.date] = byDay[e.date] || []).push(e); });
    $('movesList').innerHTML = Object.keys(byDay).sort().reverse().map((d) => {
      // gli imprevisti presi dai risparmi non contano nel saldo del giorno
      const net = byDay[d].reduce((a, e) => a + (isSavMove(e) ? 0 : e.type === 'in' ? e.amount : -e.amount), 0);
      return '<div class="group"><h3><span>' + (d === today ? t('cal.today') : long(d)) + '</span><span class="num">' + (net >= 0 ? '+' : '−') + money(Math.abs(net)) + '</span></h3>' +
        '<div class="card"><ul class="list">' + byDay[d].map(itemHTML).join('') + '</ul></div></div>';
    }).join('');
  }

  /* ---------------- render: Da parte ---------------- */
  const POS_KEYS = { 1: '1', 2: '2', 3: '3', 4: '4', '-1': 'last' };
  function wdText(first) {
    const d = toD(first), wd = d.getDay();
    const name = weekdays('long')[(wd + 6) % 7];
    // in italiano "domenica" è femminile: "la prima domenica"
    return t('fx.pos' + POS_KEYS[posOf(first)] + (wd === 0 ? '_f' : ''), { wd: name });
  }
  const everyText = (n, u) => (n || 1) === 1 ? t('fx.every1.' + u) : t('fx.everyN', { n, u: t('fx.u.' + u) });
  // prossima data con quel giorno del mese, da oggi in poi
  function nextDom(dom) {
    const d = toD(today);
    for (let k = 0; k < 3; k++) {
      const y = d.getFullYear(), m = d.getMonth() + k, x = ymd(new Date(y, m, Math.min(dom, dim(new Date(y, m, 1).getFullYear(), new Date(y, m, 1).getMonth()))));
      if (x >= today) return x;
    }
    return today;
  }
  function ruleText(f) {
    if (f.repeat === 'once') return t('fx.ruleOnce', { date: short(f.first) });
    if (f.repeat === 'year') return t('fx.ruleYear', { date: short(f.first) });
    if (f.repeat === 'custom') return t('fx.ruleCustom', { every: everyText(f.every, f.unit), date: short(f.first) });
    const when = f.by === 'weekday' ? wdText(f.first) : t('fx.whenDay', { d: f.dom || toD(f.first).getDate() });
    return t(f.repeat === '2month' ? 'fx.rule2Month' : 'fx.ruleMonth', { when });
  }
  function renderSet() {
    const p = cur(); if (!p) return;
    // risparmi del periodo: quelli impostati all'inizio + aggiunti − tolti (gli imprevisti si vedono a parte)
    const net = list().reduce((x, e) => x + (isDeposit(e) ? e.amount : e.sav === 'back' ? -e.amount : 0), 0);
    const ft = fixedTotal(p), sv = Math.max(0, (p.save || 0) + net), pot = savingsPot();
    $('setTotal').textContent = money(sv + ft);
    $('setSplit').textContent = t('set.split', { a: money(sv), b: money(ft) });
    $('savPeriod').textContent = money(sv);
    $('savPot').textContent = money(Math.max(0, pot));
    const live = inPeriod(p, today);
    $('savAdd').disabled = !live;
    $('savBack').disabled = pot <= 0 || !live;
    $('savUse').disabled = pot <= 0;
    $('savNote').textContent = pot > 0 ? t('sav.useHint') : t('sav.empty');
    const moves = list().filter(isSavMove).sort((a, b) => b.date.localeCompare(a.date));
    $('savHistory').hidden = !moves.length;
    if (moves.length) {
      const used = moves.filter((e) => e.fromSavings);
      $('savCount').textContent = used.length ? tn('sav.used', used.length, { amt: money(used.reduce((a, e) => a + e.amount, 0)) }) : t('sav.history');
      // nella lista dei risparmi, al posto dell'etichetta mostra il giorno
      $('savList').innerHTML = moves.map((e) => itemHTML(e).replace(/<span class="sav-tag">[^<]*<\/span>/, '<span class="sav-tag">' + esc(cap(long(e.date))) + '</span>')).join('');
    }
    const ds = dues(p);
    const fx = state.fixed.slice().sort((a, b) => b.amount - a.amount);
    $('fxList').innerHTML = fx.length ? fx.map((f) => {
      const mine = ds.filter((x) => x.f.id === f.id);
      const st = mine.length ? mine.map((x) => {
        if (x.done) return '<span class="fx-st ok">' + svg('check') + esc(t('fx.paidOn', { date: short(x.date) })) + '</span>';
        if (x.date < today) return '<span class="fx-st late">' + esc(t('fx.toConfirm', { date: short(x.date) })) + '</span>';
        return '<span class="fx-st">' + esc(x.date === today ? t('fx.dueToday') : t('fx.dueOn', { date: short(x.date) })) + '</span>';
      }).join('') : '<span class="fx-st off">' + esc(t('fx.notThis')) + '</span>';
      return '<li class="item fx" data-fx="' + f.id + '" role="button" tabindex="0">' +
        '<span class="ico">' + svg(KIND_ICON[f.kind] || 'flag') + '</span>' +
        '<span class="txt"><b>' + esc(f.name) + '</b><span>' + esc(ruleText(f)) + '</span>' + st + '</span>' +
        '<span class="amt-v num">' + money(f.amount) + '</span></li>';
    }).join('') : '<li class="empty">' + esc(t('fx.empty')) + '</li>';
  }
  $('fxList').addEventListener('click', (ev) => { const li = ev.target.closest('[data-fx]'); if (li) openFixed(state.fixed.find((f) => f.id === li.dataset.fx)); });
  $('fxList').addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[data-fx]')) { ev.preventDefault(); ev.target.click(); } });
  $('fxAdd').addEventListener('click', () => openFixed(null));
  $('savList').addEventListener('click', onListClick);

  /* ---------------- scheda spesa fissa ---------------- */
  const KINDS = ['rent', 'bill', 'sub', 'other'];
  let fx = null; // bozza in modifica
  function openFixed(f) {
    fx = f ? Object.assign({}, f) : { id: null, kind: 'rent', name: '', amount: 0, first: '', repeat: 'month', dom: 1, every: 2, unit: 'week' };
    // le spese salvate con "ogni 2 mesi" diventano "Altro: ogni 2 mesi"
    if (fx.repeat === '2month') { fx.repeat = 'custom'; fx.every = 2; fx.unit = 'month'; }
    if (fx.repeat === 'month' && !fx.dom) fx.dom = toD(fx.first).getDate();
    if (!fx.every) fx.every = 2;
    if (!fx.unit) fx.unit = 'week';
    if (!f) fx.first = today;
    fx.origDom = fx.dom;
    $('fTitle').textContent = f ? t('fx.editTitle') : t('fx.newTitle');
    $('fName').value = fx.name;
    $('fAmt').value = fx.amount ? String(fx.amount).replace('.', ',') : '';
    $('fFirst').value = fx.first;
    $('fDom').value = fx.dom || '';
    $('fEvery').value = fx.every;
    $('fError').hidden = true;
    const z = $('fDelZone');
    z.innerHTML = f ? '<button type="button" class="btn" id="fDel">' + esc(t('fx.delete')) + '</button>' : '';
    if (f) $('fDel').addEventListener('click', () => {
      z.innerHTML = '<div class="confirm"><span>' + esc(t('fx.deleteConfirm')) + '</span><button type="button" class="btn danger" id="fDelYes">' + esc(t('sh.deleteYes')) + '</button></div>';
      $('fDelYes').addEventListener('click', () => {
        state.fixed = state.fixed.filter((x) => x.id !== f.id);
        save(); closeSheet('fsheet'); renderAll(); toast(t('fx.deleted'));
      });
    });
    renderFixedForm();
    openSheet('fsheet');
  }
  function renderFixedForm() {
    $('fKinds').innerHTML = KINDS.map((k) =>
      '<button type="button" class="cat" role="radio" aria-checked="' + (fx.kind === k) + '" data-kind="' + k + '">' + svg(KIND_ICON[k]) + esc(t('fx.k.' + k)) + '</button>').join('');
    $('fName').placeholder = t('fx.k.' + fx.kind + 'Ph');
    $$('#fRepeat [data-repeat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.repeat === fx.repeat)));
    $$('#fUnit [data-unit]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.unit === fx.unit)));
    const r = fx.repeat;
    $('fDomWrap').hidden = r !== 'month';
    $('fEveryWrap').hidden = r !== 'custom';
    $('fDateWrap').hidden = r === 'month';
    $('fDateLabel').textContent = r === 'custom' ? t('fx.from') : t('fx.date');
    // anteprima delle prossime scadenze
    const draft = draftFixed();
    let next = [];
    if (draft) next = occurrences(draft, today, addDays(today, 800)).slice(0, r === 'once' ? 1 : 3);
    let txt = next.length ? t(next.length === 1 ? 'fx.next1' : 'fx.next', { list: next.map(short).join(' · ') }) : '';
    if (r === 'month' && draft && draft.dom > 28) txt += (txt ? ' ' : '') + t('fx.domShort');
    $('fNext').textContent = txt;
    $('fNext').hidden = !txt;
  }
  // la spesa fissa come verrebbe salvata (null se mancano dati)
  function draftFixed() {
    const r = fx.repeat;
    if (r === 'month') {
      const dom = Math.round(Number($('fDom').value));
      if (!(dom >= 1 && dom <= 31)) return null;
      // se il giorno non cambia, tieni la data di partenza (così le scadenze già passate restano)
      const first = fx.id && fx.first && dom === fx.origDom ? fx.first : nextDom(dom);
      return { repeat: 'month', dom, first, by: 'day' };
    }
    const first = $('fFirst').value;
    if (!isDay(first)) return null;
    if (r === 'custom') {
      const n = Math.round(Number($('fEvery').value));
      if (!(n >= 1 && n <= 365)) return null;
      return { repeat: 'custom', every: n, unit: fx.unit, first };
    }
    return { repeat: r, first };
  }
  $('fKinds').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-kind]'); if (!b) return;
    const prevPh = t('fx.k.' + fx.kind + 'Ph');
    fx.kind = b.dataset.kind;
    // se il nome era vuoto o il nome proposto, usa quello del nuovo tipo
    if (!$('fName').value.trim() || $('fName').value === prevPh) $('fName').value = '';
    renderFixedForm();
  });
  $('fRepeat').addEventListener('click', (ev) => { const b = ev.target.closest('[data-repeat]'); if (b) { fx.repeat = b.dataset.repeat; renderFixedForm(); } });
  $('fUnit').addEventListener('click', (ev) => { const b = ev.target.closest('[data-unit]'); if (b) { fx.unit = b.dataset.unit; renderFixedForm(); } });
  ['fFirst', 'fDom', 'fEvery'].forEach((id) => $(id).addEventListener('input', renderFixedForm));
  $('fCancel').addEventListener('click', () => closeSheet('fsheet'));
  $('fsheet').addEventListener('click', (ev) => { if (ev.target === $('fsheet')) closeSheet('fsheet'); });
  $('fSave').addEventListener('click', () => {
    const err = (k) => { $('fError').textContent = t(k); $('fError').hidden = false; };
    const name = $('fName').value.trim() || t('fx.k.' + fx.kind + 'Ph');
    const amount = parseAmt($('fAmt').value);
    if (!(amount > 0)) { err('fx.badAmt'); $('fAmt').focus(); return; }
    const draft = draftFixed();
    if (!draft) {
      if (fx.repeat === 'month') { err('fx.badDom'); $('fDom').focus(); }
      else if (fx.repeat === 'custom' && !(Math.round(Number($('fEvery').value)) >= 1)) { err('fx.badEvery'); $('fEvery').focus(); }
      else err('fx.badDate');
      return;
    }
    const data = Object.assign({ kind: fx.kind, name: name.slice(0, 40), amount }, draft);
    if (fx.id) {
      const old = state.fixed.find((x) => x.id === fx.id);
      ['dom', 'every', 'unit', 'by'].forEach((k) => delete old[k]);
      Object.assign(old, data);
    }
    else state.fixed.push(Object.assign({ id: 'f_' + uid() }, data));
    save(); closeSheet('fsheet'); renderAll();
    toast(t('fx.saved'));
  });

  /* ---------------- risparmi: aggiungi, togli, imprevisto ----------------
     add  → soldi che ti avanzano: escono subito dal periodo ed entrano nei risparmi
     back → tolti dai risparmi: tornano nel periodo, divisi sui giorni che restano (non tutti oggi)
     use  → imprevisto: paga una spesa precisa, la quota non cambia
     "back" e "use" chiedono conferma: i risparmi non devono diventare una scorciatoia. */
  let emMode = 'use', emDraft = null;
  const EM = {
    add: { title: 'em.addTitle', desc: 'em.addDesc', note: 'em.noteOpt', ph: 'em.addPh' },
    back: { title: 'em.backTitle', desc: 'em.backDesc', note: 'em.noteOpt', ph: 'em.backPh' },
    use: { title: 'em.title', desc: 'em.desc', note: 'em.note', ph: 'em.notePh' }
  };
  function openSavings(m) {
    emMode = m; emDraft = null;
    const c = EM[m];
    $('eTitle').textContent = t(c.title);
    $('eDesc').textContent = t(c.desc);
    $('eNoteLabel').textContent = t(c.note);
    $('eNote').placeholder = t(c.ph);
    $('eNext').textContent = m === 'add' ? t('em.addBtn') : t('em.next');
    $('eNext').className = 'btn ' + (m === 'add' ? 'accent' : 'btn-sav-solid');
    $('eAmt').value = ''; $('eNote').value = ''; $('eError').hidden = true;
    $('eStep1').hidden = false; $('eStep2').hidden = true;
    openSheet('esheet');
    setTimeout(() => $('eAmt').focus(), 50);
  }
  $('savAdd').addEventListener('click', () => openSavings('add'));
  $('savBack').addEventListener('click', () => openSavings('back'));
  $('savUse').addEventListener('click', () => openSavings('use'));
  $('eCancel').addEventListener('click', () => closeSheet('esheet'));
  $('esheet').addEventListener('click', (ev) => { if (ev.target === $('esheet')) closeSheet('esheet'); });
  function saveSavings() {
    const p = cur(); if (!p || !emDraft) return;
    const d = emDraft, base = { id: uid(), date: today, amount: d.amount, note: d.note };
    if (emMode === 'add') list().push(Object.assign(base, { type: 'out', cat: 'risparmi', sav: 'add' }));
    else if (emMode === 'back') list().push(Object.assign(base, { type: 'in', cat: 'risparmi', sav: 'back', spread: true }));
    else list().push(Object.assign(base, { type: 'out', cat: 'imprevisto', fromSavings: true }));
    emDraft = null;
    save(); closeSheet('esheet'); renderAll();
    toast(t({ add: 'em.addDone', back: 'em.backDone', use: 'em.done' }[emMode]));
  }
  $('eNext').addEventListener('click', () => {
    const err = (s) => { $('eError').textContent = s; $('eError').hidden = false; };
    const p = cur(); if (!p) return;
    const v = parseAmt($('eAmt').value), note = $('eNote').value.trim(), pot = savingsPot();
    if (!(v > 0)) { err(t('em.badAmt')); $('eAmt').focus(); return; }
    if (emMode === 'add') {
      // con "Recupera" i soldi escono tutti oggi: puoi spostare al massimo quello che oggi ti resta.
      // con "Ricalcola" vengono tolti da quello che resta del periodo.
      const recalc = mode() === 'ricalcola';
      const left = Math.round((recalc ? totals(p).left : dayInfo(p, today).avail - outOn(today)) * 100) / 100;
      if (v > left + 0.004) { err(left > 0 ? t(recalc ? 'em.addTooMuch' : 'em.addTooMuchToday', { amt: money(left) }) : t('em.addNone')); $('eAmt').focus(); return; }
      emDraft = { amount: v, note };
      saveSavings();
      return;
    }
    if (v > pot + 0.004) { err(t('em.tooMuch', { amt: money(Math.max(0, pot)) })); $('eAmt').focus(); return; }
    if (emMode === 'use' && !note) { err(t('em.badNote')); $('eNote').focus(); return; }
    emDraft = { amount: v, note };
    if (emMode === 'back') {
      const n = diff(today, p.end) + 1;
      $('eSure').textContent = t('em.backSure');
      $('eSureSub').textContent = t('em.backSureSub', { amt: money(v), n: tn('per.days', n), day: money(v / n), left: money(pot - v) });
      $('eYes').textContent = t('em.backYes');
    } else {
      $('eSure').textContent = t('em.sure');
      $('eSureSub').textContent = t('em.sureSub', { amt: money(v), note, left: money(pot - v) });
      $('eYes').textContent = t('em.yes');
    }
    $('eStep1').hidden = true; $('eStep2').hidden = false;
  });
  $('eAmt').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('eNote').focus(); } });
  $('eNote').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('eNext').click(); } });
  $('eBack').addEventListener('click', () => { $('eStep1').hidden = false; $('eStep2').hidden = true; });
  $('eYes').addEventListener('click', saveSavings);

  function openSheet(id) { $(id).hidden = false; document.body.style.overflow = 'hidden'; }
  function closeSheet(id) { $(id).hidden = true; if ($('sheet').hidden && $('fsheet').hidden && $('esheet').hidden && $('dsheet').hidden) document.body.style.overflow = ''; }

  /* ---------------- categorie (in Impostazioni) ---------------- */
  let catsType = 'out';
  function renderMyCats() {
    $('catsDesc').textContent = t('cats.desc', { n: MAX_CATS });
    $$('[data-cats-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.catsType === catsType)));
    const mine = myCats(catsType);
    $('myCats').innerHTML = mine.length ? mine.map((c) =>
      '<span class="my-cat">' + svg('tag') + '<span>' + esc(c.name) + '</span><button type="button" data-rmcat="' + c.id + '" aria-label="' + esc(t('cats.remove', { name: c.name })) + '">×</button></span>'
    ).join('') : '<p class="empty">' + esc(t('cats.none')) + '</p>';
    $('catForm').hidden = mine.length >= MAX_CATS;
  }
  $$('[data-cats-type]').forEach((b) => b.addEventListener('click', () => { catsType = b.dataset.catsType; renderMyCats(); }));
  $('catForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = $('catName').value;
    if (!v.trim()) { $('catName').focus(); return; }
    if (addCat(catsType, v)) { $('catName').value = ''; renderMyCats(); renderCats(); toast(t('cats.added')); }
  });
  $('myCats').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-rmcat]'); if (!b) return;
    state.cats[catsType] = (state.cats[catsType] || []).filter((c) => c.id !== b.dataset.rmcat);
    save(); renderAll(); toast(t('cats.removed'));
  });

  /* ---------------- render: Periodi ---------------- */
  function renderPeriods() {
    const ps = state.periods.slice().sort((a, b) => b.start.localeCompare(a.start));
    $('periodList').innerHTML = ps.length ? ps.map((p) =>
      '<div class="pitem' + (p.id === state.current ? ' cur' : '') + '" data-pid="' + p.id + '" role="button" tabindex="0">' +
      '<span class="txt"><b>' + esc(p.name || range(p)) + '</b><span>' + short(p.start) + ' → ' + short(p.end) + ' · ' + tn('per.days', diff(p.start, p.end) + 1) + '</span></span>' +
      (inPeriod(p, today) ? '<span class="tag">' + t('per.live') + '</span>' : '') +
      '<button type="button" class="link" data-edit="' + p.id + '">' + t('per.edit') + '</button></div>'
    ).join('') : '<p class="empty">' + t('per.empty') + '</p>';
    $('langOpts').innerHTML = L.LANGS.map((x) => '<button type="button" role="radio" lang="' + x.id + '" data-lang="' + x.id + '" aria-checked="' + (x.id === lang) + '">' + x.name + '</button>').join('');
    $$('#modeOpts [data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode())));
    renderMyCats();
    if (typeof renderBackup === 'function') renderBackup();
  }

  function renderAll() {
    applyStatic();
    renderCats();
    renderToday();
    renderSet();
    renderCalendarView();
    renderMoves();
    renderPeriods();
  }

  /* ---------------- navigazione ---------------- */
  function go(view) {
    $$('.view').forEach((v) => { v.hidden = v.dataset.view !== view; });
    $$('.nav button').forEach((b) => { if (b.dataset.nav === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    window.scrollTo(0, 0);
  }
  $$('.nav button').forEach((b) => b.addEventListener('click', () => go(b.dataset.nav)));
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
    if (b.id === 'status' && b.dataset.action === 'new') { openEditor(null); return; }
    if (b.dataset.go === 'calendar') { selDate = cur() ? clampSel(cur()) : today; renderCalendarView(); }
    go(b.dataset.go);
  }));
  $$('[data-open-periods]').forEach((b) => b.addEventListener('click', () => go('periods')));

  let toastT;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------------- movimenti ---------------- */
  $$('.seg [data-type]').forEach((b) => b.addEventListener('click', () => {
    type = b.dataset.type; cat = cats(type)[0].id; spread = cat !== 'rimborso'; newCatOpen = false;
    $$('.seg [data-type]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('addCard').classList.toggle('in', type === 'in');
    renderCats(); renderToday();
  }));
  $('cats').addEventListener('click', (ev) => {
    if (ev.target.closest('[data-newcat]')) { newCatOpen = true; renderCats(); return; }
    if (ev.target.closest('[data-newcat-ok]')) { confirmNewCat(); return; }
    if (ev.target.closest('[data-newcat-no]')) { newCatOpen = false; renderCats(); return; }
    const b = ev.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; newCatOpen = false; if (type === 'in') spread = cat !== 'rimborso'; renderCats(); renderWhen(); }
  });
  function renderWhen() {
    $('when').hidden = type !== 'in';
    $$('#when [data-spread]').forEach((x) => x.setAttribute('aria-pressed', String((x.dataset.spread === '1') === spread)));
    $('whenHint').textContent = spread
      ? t('add.spreadHint')
      : t(addDate && addDate !== today ? 'add.onceHintDay' : 'add.onceHintToday');
  }
  $$('#when [data-spread]').forEach((x) => x.addEventListener('click', () => { spread = x.dataset.spread === '1'; renderWhen(); }));
  $('addForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!cur()) { openEditor(null); return; }
    const v = parseAmt($('inAmt').value);
    if (!(v > 0)) { $('inAmt').focus(); $('inAmt').placeholder = t('add.amountMissing'); return; }
    const d = addDate || today;
    const entry = { id: uid(), date: d, amount: v, type, cat, note: $('inNote').value.trim() };
    if (type === 'in') entry.spread = spread;
    list().push(entry);
    save();
    $('inAmt').value = ''; $('inNote').value = ''; $('inAmt').blur();
    toast(d !== today ? t(type === 'in' ? 'add.doneInOn' : 'add.doneOutOn', { date: short(d) }) : t(type === 'in' ? 'add.doneIn' : 'add.doneOut'));
    if (addDate) { selDate = addDate; addDate = null; }
    renderAll();
  });
  $('addForReset').addEventListener('click', () => { addDate = null; renderToday(); });
  $('addToDay').addEventListener('click', () => {
    closeSheet('dsheet'); addDate = selDate; go('today'); renderToday(); $('inAmt').focus();
  });
  $('dClose').addEventListener('click', () => closeSheet('dsheet'));
  $('dsheet').addEventListener('click', (ev) => { if (ev.target === $('dsheet')) closeSheet('dsheet'); });

  $('week').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-day]'); if (!b) return;
    const p = cur(); if (!p) return;
    // un giorno fuori dal periodo non è nel calendario: apri il giorno più vicino del periodo
    const d = b.dataset.day;
    go('calendar');
    openDay(inPeriod(p, d) ? d : (d < p.start ? p.start : p.end));
  });
  $('cal').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-day]'); if (!b) return;
    openDay(b.dataset.day);
  });

  function onListClick(ev) {
    const del = ev.target.closest('.del'); if (!del) return;
    const li = del.closest('.item'), id = li.dataset.id;
    const e = list().find((x) => x.id === id); if (!e) return;
    // eliminare dei risparmi già usati: avvisa prima cosa succede a "togli" e imprevisti
    const deficit = isDeposit(e) ? r2(e.amount - savingsPot()) : 0;
    const plan = deficit > 0.004 ? coverPlan(deficit) : [];
    if (plan.length) {
      li.innerHTML = '<div class="confirm warn"><span class="warn-txt"><b>' + esc(t('pot.title')) + '</b>' + esc(planText(plan)) + '</span>' +
        '<button type="button" class="btn danger" data-yes>' + esc(t('pot.anyway')) + '</button><button type="button" class="btn" data-no>' + esc(t('item.no')) + '</button></div>';
    } else {
      li.innerHTML = '<div class="confirm"><span>' + t('item.confirm', { amt: money(e.amount) }) + '</span><button type="button" class="btn danger" data-yes>' + t('item.yes') + '</button><button type="button" class="btn" data-no>' + t('item.no') + '</button></div>';
    }
    li.querySelector('[data-yes]').addEventListener('click', () => {
      state.entries[state.current] = list().filter((x) => x.id !== id);
      if (plan.length) applyPlan(coverPlan(deficit));
      save(); toast(plan.length ? t('pot.done') : t('item.deleted')); renderAll();
    });
    li.querySelector('[data-no]').addEventListener('click', renderAll);
  }
  ['todayList', 'dayList', 'movesList'].forEach((id) => $(id).addEventListener('click', onListClick));

  $$('.tabs button').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    $$('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    renderMoves();
  }));

  /* ---------------- impostazione sforamento ---------------- */
  $('modeOpts').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-mode]'); if (!b) return;
    state.settings.overspend = b.dataset.mode; save(); renderAll();
    toast(b.dataset.mode === 'ricalcola' ? t('mode.toastRecalc') : t('mode.toastRecover'));
  });
  $('langOpts').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-lang]'); if (!b) return;
    state.settings.lang = b.dataset.lang; save(); setLang(b.dataset.lang); renderAll();
  });

  /* ---------------- periodi ---------------- */
  $('periodList').addEventListener('click', (ev) => {
    const ed = ev.target.closest('[data-edit]');
    if (ed) { openEditor(state.periods.find((p) => p.id === ed.dataset.edit)); return; }
    const it = ev.target.closest('[data-pid]'); if (!it) return;
    state.current = it.dataset.pid; save();
    selDate = clampSel(cur()); addDate = null;
    renderAll(); go('today');
  });
  $('periodList').addEventListener('keydown', (ev) => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[data-pid]')) { ev.preventDefault(); ev.target.click(); }
  });
  $('btnNewPeriod').addEventListener('click', () => openEditor(null));
  $('editCurrent').addEventListener('click', () => openEditor(cur()));

  function suggestNext() {
    const last = state.periods.slice().sort((a, b) => b.end.localeCompare(a.end))[0];
    if (last && last.end >= addDays(today, -1)) {
      const len = diff(last.start, last.end), s = addDays(last.end, 1);
      return { start: s, end: addDays(s, len) };
    }
    return { start: today, end: addDays(today, 29) };
  }
  function openEditor(p) {
    editingId = p ? p.id : null;
    $('sheetTitle').textContent = p ? t('sh.edit') : t('sh.new');
    const sug = p || suggestNext();
    $('pName').value = p ? (p.name || '') : '';
    $('pStart').value = sug.start; $('pEnd').value = sug.end;
    $('pBase').value = p && p.base ? String(p.base).replace('.', ',') : '';
    $('pSaveAmt').value = p && p.save ? String(p.save).replace('.', ',') : '';
    $('pError').hidden = true;
    saveWarned = false; $('pSave').textContent = t('sh.save');
    $('pCancel').hidden = !state.periods.length;
    $('pRestore').hidden = state.periods.length > 0;
    const z = $('pDeleteZone');
    z.innerHTML = p ? '<button type="button" class="btn" id="pDel">' + t('sh.delete') + '</button>' : '';
    if (p) $('pDel').addEventListener('click', () => {
      // i risparmi di questo periodo spariscono con lui: se erano già stati usati altrove, avvisa
      const own = (state.entries[p.id] || []).reduce((a, e) => a + (isDeposit(e) ? e.amount : (e.fromSavings || e.sav === 'back') ? -e.amount : 0), 0);
      const deficit = r2((p.start <= today ? (p.save || 0) : 0) + own - savingsPot());
      const plan = deficit > 0.004 ? coverPlan(deficit, p.id) : [];
      z.innerHTML = '<div class="confirm' + (plan.length ? ' warn' : '') + '"><span' + (plan.length ? ' class="warn-txt"' : '') + '>' + esc(t('sh.deleteConfirm')) + (plan.length ? ' ' + esc(planText(plan)) : '') + '</span><button type="button" class="btn danger" id="pDelYes">' + t('sh.deleteYes') + '</button></div>';
      $('pDelYes').addEventListener('click', () => {
        if (plan.length) applyPlan(coverPlan(deficit, p.id));
        state.periods = state.periods.filter((x) => x.id !== p.id);
        delete state.entries[p.id];
        delete state.paid[p.id];
        if (state.current === p.id) state.current = pickCurrent();
        save(); closeEditor();
        if (cur()) { selDate = clampSel(cur()); renderAll(); } else openEditor(null);
      });
    });
    updateExample();
    $('sheet').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeEditor() { $('sheet').hidden = true; document.body.style.overflow = ''; }
  function updateExample() {
    const s = $('pStart').value, e = $('pEnd').value, b = parseAmt($('pBase').value), sv = parseAmt($('pSaveAmt').value);
    if (!s || !e || e < s) { $('pExample').textContent = t('sh.badDates'); return; }
    // risparmi e spese fisse che cadono in queste date vengono tolti prima di dividere
    const svv = sv > 0 ? sv : 0;
    const ft = fixedTotal({ id: editingId || '_new', start: s, end: e });
    const free = (b > 0 ? b : 0) - svv - ft;
    const n = diff(s, e) + 1, q = free / n, days = tn('per.days', n);
    const pre = svv + ft > 0 ? t('sh.exampleReserved', { r: money(svv + ft), s: money(svv), f: money(ft) }) + '<br>' : '';
    $('pExample').innerHTML = pre + (b > 0
      ? (free > 0 ? t('sh.example', { days, q: money(q), q2: money(q * 2) }) : t('sh.exampleNone'))
      : t('sh.exampleNoBase', { days }));
  }
  let saveWarned = false;
  ['pStart', 'pEnd', 'pBase', 'pSaveAmt'].forEach((id) => $(id).addEventListener('input', () => {
    updateExample();
    if (saveWarned) { saveWarned = false; $('pError').hidden = true; $('pSave').textContent = t('sh.save'); }
  }));
  $('pCancel').addEventListener('click', closeEditor);
  $('sheet').addEventListener('click', (ev) => { if (ev.target === $('sheet') && state.periods.length) closeEditor(); });
  $('pSave').addEventListener('click', () => {
    const s = $('pStart').value, e = $('pEnd').value, b = parseAmt($('pBase').value);
    if (!s || !e || e < s) { $('pError').textContent = t('sh.badDatesErr'); $('pError').hidden = false; return; }
    const sv = parseAmt($('pSaveAmt').value);
    const data = { name: $('pName').value.trim(), start: s, end: e, base: b > 0 ? b : 0, save: sv > 0 ? sv : 0 };
    // meno risparmi di quelli già usati: avvisa una volta, al secondo "Salva" applica
    let plan = [], deficit = 0;
    if (editingId) {
      const old = state.periods.find((x) => x.id === editingId);
      deficit = r2((old.start <= today ? (old.save || 0) : 0) - (s <= today ? data.save : 0) - savingsPot());
      if (deficit > 0.004) plan = coverPlan(deficit);
    }
    if (plan.length && !saveWarned) {
      saveWarned = true;
      $('pError').innerHTML = '<b>' + esc(t('pot.title')) + '</b><br>' + esc(planText(plan));
      $('pError').hidden = false;
      $('pSave').textContent = t('pot.saveAnyway');
      return;
    }
    if (plan.length) applyPlan(plan);
    if (editingId) { Object.assign(state.periods.find((p) => p.id === editingId), data); state.current = editingId; }
    else { const id = uid(); state.periods.push(Object.assign({ id }, data)); state.current = id; state.entries[id] = []; }
    save(); closeEditor();
    selDate = clampSel(cur()); addDate = null;
    renderAll(); go('today');
    toast(t('sh.saved'));
  });
  function pickCurrent() {
    const live = state.periods.find((p) => inPeriod(p, today));
    if (live) return live.id;
    const s = state.periods.slice().sort((a, b) => b.start.localeCompare(a.start));
    return s.length ? s[0].id : null;
  }

  /* ---------------- backup ---------------- */
  const backupName = () => 'quota-backup-' + today + '.json';
  const backupText = () => JSON.stringify({ app: 'quota', version: 1, exported: new Date().toISOString(), data: state }, null, 2);
  function markBackup() { state.settings.lastBackup = today; save(); renderBackup(); }
  function renderBackup() {
    const last = state.settings.lastBackup, el = $('backupLast');
    if (!last) { el.textContent = t('bk.never'); el.classList.toggle('old', state.periods.length > 0); return; }
    const n = diff(last, today);
    el.textContent = t('bk.last', { when: n <= 0 ? t('bk.today') : n === 1 ? t('bk.yesterday') : t('bk.daysAgo', { n }) });
    el.classList.toggle('old', n > 14);
  }
  // Invia backup: usa il menu di condivisione del telefono (WhatsApp, email, Drive…)
  try {
    const probe = new File(['{}'], 'quota.json', { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [probe] })) $('btnShare').hidden = false;
  } catch (e) { /* condivisione file non supportata */ }
  $('btnShare').addEventListener('click', async () => {
    try {
      const file = new File([backupText()], backupName(), { type: 'application/json' });
      await navigator.share({ files: [file], title: t('bk.shareTitle'), text: t('bk.shareText', { date: short(today) }) });
      markBackup(); toast(t('bk.sent'));
    } catch (e) { if (e && e.name !== 'AbortError') toast(t('bk.shareFail')); }
  });
  $('importToggle').addEventListener('click', () => { $('importBox').hidden = !$('importBox').hidden; });
  $('btnExport').addEventListener('click', () => {
    const blob = new Blob([backupText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    markBackup();
  });
  // Controlla che il file sia davvero un backup di Quota prima di toccare i dati
  const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(toD(x));
  const posNum = (x) => typeof x === 'number' && isFinite(x) && x > 0 ? x : 0;
  function readBackup(j) {
    const d = j && j.data;
    if (!d || !Array.isArray(d.periods) || !d.entries || typeof d.entries !== 'object' || Array.isArray(d.entries)) return null;
    const periods = d.periods.filter((p) => p && typeof p.id === 'string' && isDay(p.start) && isDay(p.end) && p.end >= p.start)
      .map((p) => ({ id: p.id, name: typeof p.name === 'string' ? p.name : '', start: p.start, end: p.end, base: posNum(p.base), save: posNum(p.save) }));
    if (periods.length !== d.periods.length) return null;
    const entries = {};
    for (const p of periods) {
      const raw = d.entries[p.id] || [];
      if (!Array.isArray(raw)) return null;
      const ok = raw.filter((e) => e && typeof e.id === 'string' && isDay(e.date) && typeof e.amount === 'number' && isFinite(e.amount) && e.amount > 0);
      if (ok.length !== raw.length) return null;
      entries[p.id] = ok.map((e) => {
        const x = { id: e.id, date: e.date, amount: e.amount, type: e.type === 'in' ? 'in' : 'out', cat: typeof e.cat === 'string' ? e.cat : '', note: typeof e.note === 'string' ? e.note : '' };
        if (x.type === 'in' && typeof e.spread === 'boolean') x.spread = e.spread;
        if (x.type === 'out' && e.fromSavings === true) x.fromSavings = true;
        else if ((e.sav === 'add' && x.type === 'out') || (e.sav === 'back' && x.type === 'in')) x.sav = e.sav;
        if (x.type === 'out' && e.wasEmergency === true && !x.fromSavings) x.wasEmergency = true;
        return x;
      });
    }
    // categorie tue, spese fisse e scadenze pagate (i backup vecchi non le hanno: si parte vuoti)
    const cin = d.cats && typeof d.cats === 'object' ? d.cats : {};
    const cleanCats = (l) => (Array.isArray(l) ? l : []).filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim())
      .slice(0, MAX_CATS).map((c) => ({ id: c.id, name: c.name.trim().slice(0, 20) }));
    const fixed = (Array.isArray(d.fixed) ? d.fixed : []).filter((f) => f && typeof f.id === 'string' && isDay(f.first) && posNum(f.amount) > 0)
      .map((f) => ({ id: f.id, kind: KINDS.indexOf(f.kind) >= 0 ? f.kind : 'other', name: typeof f.name === 'string' ? f.name.slice(0, 40) : '', amount: posNum(f.amount),
        first: f.first, repeat: ['month', '2month', 'year', 'once', 'custom'].indexOf(f.repeat) >= 0 ? f.repeat : 'month', by: f.by === 'weekday' ? 'weekday' : 'day',
        dom: f.dom >= 1 && f.dom <= 31 ? Math.round(f.dom) : undefined, every: f.every >= 1 && f.every <= 365 ? Math.round(f.every) : undefined,
        unit: ['day', 'week', 'month'].indexOf(f.unit) >= 0 ? f.unit : undefined }))
      .filter((f) => f.repeat !== 'custom' || (f.every && f.unit));
    const paid = {};
    if (d.paid && typeof d.paid === 'object') periods.forEach((p) => {
      const src = d.paid[p.id]; if (!src || typeof src !== 'object') return;
      Object.keys(src).forEach((k) => { const h = src[k]; if (h && typeof h.amount === 'number' && isFinite(h.amount) && h.amount >= 0) (paid[p.id] = paid[p.id] || {})[k] = { amount: h.amount, at: isDay(h.at) ? h.at : p.start }; });
    });
    const st = d.settings && typeof d.settings === 'object' ? d.settings : {};
    return {
      periods, entries, cats: { out: cleanCats(cin.out), in: cleanCats(cin.in) }, fixed, paid,
      current: periods.some((p) => p.id === d.current) ? d.current : null,
      settings: { overspend: st.overspend === 'ricalcola' ? 'ricalcola' : 'riporto', lang: state.settings.lang, lastBackup: isDay(st.lastBackup) ? st.lastBackup : undefined }
    };
  }
  function applyBackup(next) {
    state = next;
    if (!cur()) state.current = pickCurrent();
    save();
    selDate = cur() ? clampSel(cur()) : today;
    renderAll();
    const msg = $('backupMsg');
    msg.textContent = tn('bk.loaded', state.periods.length) + '.'; msg.hidden = false;
    if (!$('sheet').hidden && cur()) { closeEditor(); go('today'); }
    toast(tn('bk.loaded', state.periods.length));
  }
  $('fileImport').addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    ev.target.value = '';
    const msg = $('backupMsg');
    let next = null;
    try { next = readBackup(JSON.parse(await f.text())); } catch (e) { next = null; }
    if (!next) {
      msg.textContent = t('bk.bad'); msg.hidden = false;
      if (!$('sheet').hidden) toast(t('bk.bad'));
      return;
    }
    // se ci sono già dati, chiedi prima di sostituirli
    if (state.periods.length) {
      go('periods');
      msg.innerHTML = '<span class="confirm"><span>' + esc(t('bk.replace')) + '</span><button type="button" class="btn danger" data-yes>' + esc(t('bk.replaceYes')) + '</button><button type="button" class="btn" data-no>' + esc(t('item.no')) + '</button></span>';
      msg.hidden = false;
      msg.querySelector('[data-yes]').addEventListener('click', () => applyBackup(next));
      msg.querySelector('[data-no]').addEventListener('click', () => { msg.hidden = true; msg.textContent = ''; });
      msg.scrollIntoView({ block: 'center' });
      return;
    }
    applyBackup(next);
  });

  /* ---------------- installazione e offline ---------------- */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
  $('btnInstall').addEventListener('click', async () => {
    if (!installEvt) return;
    installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('btnInstall').hidden = true;
  });
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) $('installCard').hidden = true;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // quando arriva una versione nuova dell'app, ricarica una volta da sola
    // ...ma non mentre stai scrivendo: in quel caso aspetta che chiudi o lasci l'app
    let reloaded = false, pending = false;
    const busy = () => !$('sheet').hidden || !$('fsheet').hidden || !$('esheet').hidden || !$('dsheet').hidden || $('inAmt').value !== '' || $('inNote').value !== '' ||
      (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) ||
      !!document.querySelector('.confirm');
    const reload = () => { if (!reloaded) { reloaded = true; location.reload(); } };
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (busy()) pending = true; else reload(); });
      document.addEventListener('visibilitychange', () => { if (pending && document.hidden) reload(); });
    }
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {}));
  }

  /* ---------------- cambio giorno ---------------- */
  function checkDay() {
    const t = ymd(new Date());
    if (t === today) return;
    const was = selDate === today;
    today = t;
    if (addDate && addDate === today) addDate = null;
    const live = state.periods.find((p) => inPeriod(p, today));
    if (live && live.id !== state.current) { state.current = live.id; save(); }
    if (was && cur()) selDate = clampSel(cur());
    renderAll();
  }
  setInterval(checkDay, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });

  /* ---------------- avvio ---------------- */
  if (!cur()) state.current = pickCurrent();
  const live = state.periods.find((p) => inPeriod(p, today));
  if (live) state.current = live.id;
  if (cur()) { selDate = clampSel(cur()); renderAll(); }
  else { renderAll(); openEditor(null); }
})();
