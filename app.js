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
  }
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
    // accetta 12,50 / 12.50 / 1.200,50 / 1,200.50
    let x = String(s).replace(/[€\s]/g, '');
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
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
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
  const catName = (c) => t('cat.' + c.id);
  const catOf = (e) => { const l = CATS[e.type === 'in' ? 'in' : 'out']; return l.find((c) => c.id === e.cat) || l[l.length - 1]; };

  /* ---------------- stato ---------------- */
  const KEY = 'quota-v1';
  let state = { periods: [], current: null, entries: {}, settings: { overspend: 'riporto' } };
  try { const raw = localStorage.getItem(KEY); if (raw) state = Object.assign(state, JSON.parse(raw)); } catch (e) { /* storage non disponibile */ }
  state.settings = Object.assign({ overspend: 'riporto' }, state.settings || {});
  if (!state.settings.lang) {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'it';
    const guess = nav.slice(0, 2).toLowerCase();
    state.settings.lang = L.LANGS.some((x) => x.id === guess) ? guess : 'it';
  }
  setLang(state.settings.lang);
  const save = () => {
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

     Se spendi più della quota (Periodi → impostazione):
     - "Recupera" (riporto): la quota resta fissa; risparmi e sforamenti passano ai giorni dopo.
     - "Ricalcola": ogni giorno i soldi rimasti vengono divisi per i giorni che mancano alla fine. */
  // Un'entrata può contare "tutto subito" (es. un rimborso: si aggiunge alla quota di quel giorno)
  // oppure "divisa sui giorni" (es. lo stipendio: si spalma fino alla fine del periodo).
  // Le entrate vecchie senza scelta: i rimborsi contano subito, il resto viene diviso.
  const isOneOff = (e) => e.type === 'in' && (e.spread === false || (e.spread === undefined && e.cat === 'rimborso'));
  function sources(p) {
    const s = [{ date: p.start, amount: p.base || 0 }];
    list().forEach((e) => { if (e.type === 'in') s.push({ date: e.date < p.start ? p.start : e.date, amount: e.amount, once: isOneOff(e) }); });
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
  const outOn = (day) => list().reduce((a, e) => a + (e.type !== 'in' && e.date === day ? e.amount : 0), 0);
  const outBefore = (day) => list().reduce((a, e) => a + (e.type !== 'in' && e.date < day ? e.amount : 0), 0);
  const availableAt = (p, day) => accrued(p, day) - outBefore(day);
  const mode = () => state.settings.overspend === 'ricalcola' ? 'ricalcola' : 'riporto';
  const knownMoney = (p, day) => (p.base || 0) + list().reduce((a, e) => a + (e.type === 'in' && e.date <= day ? e.amount : 0), 0);
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
    const s = outOn(d);
    if (s === 0) return 'zero';
    return dayInfo(p, d).avail - s < -0.005 ? 'bad' : 'ok';
  }
  const totals = (p) => {
    const tin = (p.base || 0) + list().reduce((a, e) => a + (e.type === 'in' ? e.amount : 0), 0);
    const tout = list().reduce((a, e) => a + (e.type !== 'in' ? e.amount : 0), 0);
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

  function renderToday() {
    const p = cur(); if (!p) return;
    $$('.period-name').forEach((el) => { el.textContent = p.name || range(p); });

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
    return '<li class="item' + (e.type === 'in' ? ' in' : '') + '" data-id="' + e.id + '">' +
      '<span class="ico">' + svg(c.icon) + '</span>' +
      '<span class="txt"><b>' + esc(e.note || catName(c)) + '</b><span>' + esc(catName(c) + (e.type === 'in' ? ' · ' + (isOneOff(e) ? t('item.once') : t('item.spread')) : '')) + '</span></span>' +
      '<span class="amt-v num">' + (e.type === 'in' ? '+' : '−') + money(e.amount) + '</span>' +
      '<button type="button" class="del" aria-label="' + t('item.delete') + '">×</button></li>';
  }

  function renderCats() {
    $('cats').innerHTML = CATS[type].map((c) =>
      '<button type="button" class="cat" role="radio" aria-checked="' + (c.id === cat) + '" data-cat="' + c.id + '">' + svg(c.icon) + esc(catName(c)) + '</button>'
    ).join('');
  }

  /* ---------------- render: Calendario ---------------- */
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

    // giorno selezionato
    $('dayTitle').textContent = selDate === today ? t('cal.today') : long(selDate);
    const info = dayInfo(p, selDate), s = outOn(selDate), avail = info.avail;
    let line = '';
    if (inPeriod(p, selDate)) {
      line = t('cal.dayLine', { avail: money(avail), spent: money(s) });
      if (selDate <= today) {
        const ok = avail - s >= 0, amt = money(Math.abs(avail - s));
        if (mode() === 'ricalcola') line += t(ok ? 'cal.dayRecalcLeft' : 'cal.dayRecalcOver', { amt });
        else line += t(ok ? 'cal.dayCarryLeft' : 'cal.dayCarryOver', { amt });
      }
    }
    $('dayLine').textContent = line;
    const items = list().filter((e) => e.date === selDate);
    $('dayList').innerHTML = items.length ? items.map(itemHTML).join('') : '<li class="empty">' + t('cal.dayEmpty') + '</li>';
  }

  /* ---------------- render: Movimenti ---------------- */
  function renderMoves() {
    const p = cur(); if (!p) return;
    const items = list().filter((e) => filter === 'all' || (filter === 'in' ? e.type === 'in' : e.type !== 'in'));
    const groups = {};
    items.forEach((e) => {
      const c = catOf(e), k = (e.type === 'in' ? 'in:' : 'out:') + c.id;
      groups[k] = groups[k] || { c, in: e.type === 'in', v: 0 };
      groups[k].v += e.amount;
    });
    const arr = Object.values(groups).sort((a, b) => b.v - a.v);
    const max = arr.reduce((m, g) => Math.max(m, g.v), 0);
    $('catTotals').innerHTML = arr.length ? arr.map((g) =>
      '<div class="ct' + (g.in ? ' in' : '') + '"><span class="ico">' + svg(g.c.icon) + '</span><span class="n">' + esc(catName(g.c)) + '</span><span class="v num">' + money(g.v) + '</span>' +
      '<div class="bar"><span style="width:' + (g.v / max * 100) + '%"></span></div></div>'
    ).join('') : '<p class="empty">' + t('moves.empty') + '</p>';

    const byDay = {};
    items.forEach((e) => { (byDay[e.date] = byDay[e.date] || []).push(e); });
    $('movesList').innerHTML = Object.keys(byDay).sort().reverse().map((d) => {
      const net = byDay[d].reduce((a, e) => a + (e.type === 'in' ? e.amount : -e.amount), 0);
      return '<div class="group"><h3><span>' + (d === today ? t('cal.today') : long(d)) + '</span><span class="num">' + (net >= 0 ? '+' : '−') + money(Math.abs(net)) + '</span></h3>' +
        '<div class="card"><ul class="list">' + byDay[d].map(itemHTML).join('') + '</ul></div></div>';
    }).join('');
  }

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
    if (typeof renderBackup === 'function') renderBackup();
  }

  function renderAll() {
    applyStatic();
    renderCats();
    renderToday();
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
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    type = b.dataset.type; cat = CATS[type][0].id; spread = cat !== 'rimborso';
    $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('addCard').classList.toggle('in', type === 'in');
    renderCats(); renderToday();
  }));
  $('cats').addEventListener('click', (ev) => { const b = ev.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; if (type === 'in') spread = cat !== 'rimborso'; renderCats(); renderWhen(); } });
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
    addDate = selDate; go('today'); renderToday(); $('inAmt').focus();
  });

  $('week').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-day]'); if (!b) return;
    selDate = b.dataset.day; renderCalendarView(); go('calendar');
  });
  $('cal').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-day]'); if (!b) return;
    selDate = b.dataset.day; renderCalendarView();
  });

  function onListClick(ev) {
    const del = ev.target.closest('.del'); if (!del) return;
    const li = del.closest('.item'), id = li.dataset.id;
    const e = list().find((x) => x.id === id); if (!e) return;
    li.innerHTML = '<div class="confirm"><span>' + t('item.confirm', { amt: money(e.amount) }) + '</span><button type="button" class="btn danger" data-yes>' + t('item.yes') + '</button><button type="button" class="btn" data-no>' + t('item.no') + '</button></div>';
    li.querySelector('[data-yes]').addEventListener('click', () => {
      state.entries[state.current] = list().filter((x) => x.id !== id);
      save(); toast(t('item.deleted')); renderAll();
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
    $('pError').hidden = true;
    $('pCancel').hidden = !state.periods.length;
    $('pRestore').hidden = state.periods.length > 0;
    const z = $('pDeleteZone');
    z.innerHTML = p ? '<button type="button" class="btn" id="pDel">' + t('sh.delete') + '</button>' : '';
    if (p) $('pDel').addEventListener('click', () => {
      z.innerHTML = '<div class="confirm"><span>' + t('sh.deleteConfirm') + '</span><button type="button" class="btn danger" id="pDelYes">' + t('sh.deleteYes') + '</button></div>';
      $('pDelYes').addEventListener('click', () => {
        state.periods = state.periods.filter((x) => x.id !== p.id);
        delete state.entries[p.id];
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
    const s = $('pStart').value, e = $('pEnd').value, b = parseAmt($('pBase').value);
    if (!s || !e || e < s) { $('pExample').textContent = t('sh.badDates'); return; }
    const n = diff(s, e) + 1, q = (b > 0 ? b : 0) / n, days = tn('per.days', n);
    $('pExample').innerHTML = b > 0
      ? t('sh.example', { days, q: money(q), q2: money(q * 2) })
      : t('sh.exampleNoBase', { days });
  }
  ['pStart', 'pEnd', 'pBase'].forEach((id) => $(id).addEventListener('input', updateExample));
  $('pCancel').addEventListener('click', closeEditor);
  $('sheet').addEventListener('click', (ev) => { if (ev.target === $('sheet') && state.periods.length) closeEditor(); });
  $('pSave').addEventListener('click', () => {
    const s = $('pStart').value, e = $('pEnd').value, b = parseAmt($('pBase').value);
    if (!s || !e || e < s) { $('pError').textContent = t('sh.badDatesErr'); $('pError').hidden = false; return; }
    const data = { name: $('pName').value.trim(), start: s, end: e, base: b > 0 ? b : 0 };
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
  $('btnExport').addEventListener('click', () => {
    const blob = new Blob([backupText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    markBackup();
  });
  $('fileImport').addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const msg = $('backupMsg');
    try {
      const j = JSON.parse(await f.text());
      const d = j && j.data;
      if (!d || !Array.isArray(d.periods) || typeof d.entries !== 'object') throw new Error('formato');
      state = { periods: d.periods, current: d.current, entries: d.entries, settings: Object.assign({ overspend: 'riporto' }, d.settings || state.settings, { lang: state.settings.lang }) };
      if (!cur()) state.current = pickCurrent();
      save();
      selDate = cur() ? clampSel(cur()) : today;
      renderAll();
      msg.textContent = tn('bk.loaded', state.periods.length) + '.';
      if (!$('sheet').hidden && cur()) { closeEditor(); go('today'); }
      toast(tn('bk.loaded', state.periods.length));
    } catch (e) {
      msg.textContent = t('bk.bad');
    }
    msg.hidden = false;
    ev.target.value = '';
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
    let reloaded = false;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
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
