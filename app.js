/* Quota — ogni giorno, il tuo equilibrio.
   Budget per periodo con quota giornaliera e riporto. I dati restano nel browser (localStorage). */
(function () {
  'use strict';

  /* ---------------- utilità ---------------- */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const money = (v) => eur.format(v);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const toD = (s) => new Date(s + 'T00:00:00');
  const diff = (a, b) => Math.round((toD(b) - toD(a)) / 864e5);
  const addDays = (s, n) => { const d = toD(s); d.setDate(d.getDate() + n); return ymd(d); };
  const short = (s) => toD(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  const long = (s) => toD(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const range = (p) => {
    const a = toD(p.start), b = toD(p.end);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return a.getDate() + '–' + b.getDate() + ' ' + b.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return short(p.start) + ' – ' + b.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const parseAmt = (s) => {
    let t = String(s).replace(/[€\s]/g, '');
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    const v = parseFloat(t);
    return isFinite(v) ? Math.round(v * 100) / 100 : NaN;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

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
  const catOf = (e) => { const l = CATS[e.type === 'in' ? 'in' : 'out']; return l.find((c) => c.id === e.cat) || l[l.length - 1]; };

  /* ---------------- stato ---------------- */
  const KEY = 'quota-v1';
  let state = { periods: [], current: null, entries: {}, settings: { overspend: 'riporto' } };
  try { const raw = localStorage.getItem(KEY); if (raw) state = Object.assign(state, JSON.parse(raw)); } catch (e) { /* storage non disponibile */ }
  state.settings = Object.assign({ overspend: 'riporto' }, state.settings || {});
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Non riesco a salvare: la memoria del browser è piena o bloccata.'); }
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
      const t = totals(p);
      const before = today < p.start;
      $('heroLabel').textContent = before ? 'Inizia il ' + short(p.start) : 'Periodo concluso';
      $('heroAmt').textContent = (t.left < 0 ? '−' : '') + money(Math.abs(t.left));
      $('heroSub').textContent = before ? 'da dividere in ' + plural(diff(p.start, p.end) + 1, 'giorno', 'giorni') : (t.left >= 0 ? 'avanzati' : 'oltre il budget');
      setRing(before ? 1 : 0, 'idle');
      setStatus('idle', 'flag', before ? 'Il periodo non è ancora iniziato' : 'Crea il prossimo periodo', before ? 'Puoi già segnare le entrate.' : 'Tocca qui per partire da domani.');
      $('status').dataset.action = before ? '' : 'new';
    } else {
      $('status').dataset.action = '';
      const info = dayInfo(p, today);
      const spent = outOn(today);
      const recalc = mode() === 'ricalcola';
      const left = info.avail - spent;
      const restAfter = recalc ? info.rest - spent : null;

      if (recalc && restAfter < 0) {
        $('heroLabel').textContent = 'Budget superato';
        $('heroAmt').textContent = '−' + money(-restAfter);
        $('heroSub').textContent = 'su tutto il periodo';
        setRing(1, 'neg');
      } else if (left < 0) {
        $('heroLabel').textContent = recalc ? 'Oltre la quota' : 'Sei in rosso';
        $('heroAmt').textContent = '−' + money(-left);
        $('heroSub').textContent = 'quota ' + money(info.quota);
        setRing(1, 'neg');
      } else {
        $('heroLabel').textContent = 'Oggi puoi spendere';
        $('heroAmt').textContent = money(left);
        $('heroSub').textContent = 'di ' + money(info.avail);
        setRing(info.avail > 0 ? left / info.avail : 0);
      }

      // messaggio di stato
      const tm = tomorrowIfStop(p, today);
      const last = today === p.end;
      if (recalc && restAfter < 0) {
        setStatus('neg', 'down', 'Budget del periodo finito', 'Fino al ' + short(p.end) + ' non resta niente, a meno di nuove entrate.');
      } else if (left < 0 && recalc) {
        setStatus('neg', 'down', 'Quota ricalcolata', last ? 'Era l\'ultimo giorno del periodo.' : 'Da domani avrai ' + money(tm) + ' al giorno fino al ' + short(p.end) + '.');
      } else if (left < 0) {
        const r = recovery(p, today);
        if (r.days === null) setStatus('neg', 'down', 'Non recuperi entro il ' + short(p.end), 'Mancano ' + money(r.missing) + ' per chiudere il periodo in pari.');
        else if (r.days === 1) setStatus('neg', 'down', 'Domani torni in pari', 'Se oggi non spendi altro, domani avrai ' + money(r.amount) + '.');
        else setStatus('neg', 'down', 'Torni in pari in ' + r.days + ' giorni', 'Se non spendi nulla fino al ' + short(addDays(r.date, -1)) + ', il ' + short(r.date) + ' avrai di nuovo ' + money(r.amount) + '.');
      } else if (spent === 0) {
        setStatus('zero', '', 'Zero spese, per ora', last ? 'Ultimo giorno: quello che resta è tutto risparmio.' : (recalc ? 'Se resta così, da domani avrai ' + money(tm) + ' al giorno.' : 'Se resta così, domani avrai ' + money(tm) + '.'));
      } else {
        setStatus('', 'up', money(left) + ' rimanenti oggi', last ? 'Ultimo giorno del periodo.' : (recalc ? 'Da domani: ' + money(tm) + ' al giorno.' : 'Se non spendi più nulla, domani avrai ' + money(tm) + '.'));
      }
    }

    // aggiunta
    const d = addDate || today;
    $('addFor').hidden = !addDate || addDate === today;
    $('addForText').textContent = 'Stai aggiungendo a ' + long(d);
    $('addBtnText').textContent = type === 'in' ? 'Aggiungi entrata' : 'Aggiungi uscita';
    renderWhen();

    renderWeek(p);
    const items = list().filter((e) => e.date === today);
    $('todayList').innerHTML = items.length ? items.map(itemHTML).join('') : '<li class="empty">Ancora niente oggi.</li>';
  }

  function renderWeek(p) {
    const dt = toD(today);
    const monday = addDays(today, -((dt.getDay() + 6) % 7));
    const names = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
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
      '<span class="txt"><b>' + esc(e.note || c.name) + '</b><span>' + esc(c.name + (e.type === 'in' ? (isOneOff(e) ? ' · tutto subito' : ' · diviso sui giorni') : '')) + '</span></span>' +
      '<span class="amt-v num">' + (e.type === 'in' ? '+' : '−') + money(e.amount) + '</span>' +
      '<button type="button" class="del" aria-label="Elimina">×</button></li>';
  }

  function renderCats() {
    $('cats').innerHTML = CATS[type].map((c) =>
      '<button type="button" class="cat" role="radio" aria-checked="' + (c.id === cat) + '" data-cat="' + c.id + '">' + svg(c.icon) + c.name + '</button>'
    ).join('');
  }

  /* ---------------- render: Calendario ---------------- */
  function renderCalendarView() {
    const p = cur(); if (!p) return;
    const t = totals(p);
    $('pDates').textContent = range(p);
    if (inPeriod(p, today)) {
      const dl = diff(today, p.end) + 1;
      $('pLeftDays').textContent = dl === 1 ? 'Ultimo giorno' : plural(dl, 'giorno rimanente', 'giorni rimanenti');
    } else $('pLeftDays').textContent = today < p.start ? 'Non ancora iniziato' : 'Concluso';
    const bar = $('pBar');
    bar.style.width = (t.tin > 0 ? Math.min(100, t.tout / t.tin * 100) : (t.tout ? 100 : 0)) + '%';
    bar.parentElement.classList.toggle('over', t.left < 0);
    $('pSpent').textContent = money(t.tout) + ' di ' + money(t.tin);
    $('pLeft').textContent = (t.left < 0 ? 'oltre di ' + money(-t.left) : 'restano ' + money(t.left));
    $('pLeft').style.color = t.left < 0 ? 'var(--neg-ink)' : '';
    if (inPeriod(p, today) && today < p.end) {
      const tm = tomorrowIfStop(p, today);
      const avg = mode() === 'ricalcola' ? tm : (accrued(p, p.end) - outBefore(addDays(today, 1))) / diff(today, p.end);
      $('pHint').textContent = money(Math.max(0, avg)) + ' al giorno da domani' + (mode() === 'ricalcola' ? ' (ricalcolata)' : ' (in media)');
    } else $('pHint').textContent = '';

    // calendario
    let h = '';
    let d = p.start, first = true;
    while (d <= p.end) {
      const dt = toD(d);
      if (first || dt.getDate() === 1) {
        h += '<div class="mlabel">' + dt.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) + '</div>';
        ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach((x) => { h += '<div class="dow">' + x + '</div>'; });
        const lead = (dt.getDay() + 6) % 7;
        for (let i = 0; i < lead; i++) h += '<div></div>';
        first = false;
      }
      const st = dayState(p, d);
      const cls = ['dd', st];
      if (d === today) cls.push('today');
      if (d === selDate) cls.push('sel');
      h += '<button type="button" data-day="' + d + '" aria-label="' + long(d) + ', speso ' + money(outOn(d)) + '"><span class="' + cls.join(' ') + '">' + dt.getDate() + '</span></button>';
      d = addDays(d, 1);
    }
    $('cal').innerHTML = h;

    // giorno selezionato
    $('dayTitle').textContent = selDate === today ? 'Oggi' : long(selDate);
    const info = dayInfo(p, selDate), s = outOn(selDate), avail = info.avail;
    let line = '';
    if (inPeriod(p, selDate)) {
      line = 'Disponibili ' + money(avail) + ' · spesi ' + money(s);
      if (selDate <= today) {
        if (mode() === 'ricalcola') line += avail - s >= 0 ? ' · avanzano ' + money(avail - s) + ', ridivisi sui giorni dopo' : ' · ' + money(s - avail) + ' in più, tolti dai giorni dopo';
        else line += avail - s >= 0 ? ' · passano ' + money(avail - s) + ' al giorno dopo' : ' · il giorno dopo hai ' + money(s - avail) + ' in meno';
      }
    }
    $('dayLine').textContent = line;
    const items = list().filter((e) => e.date === selDate);
    $('dayList').innerHTML = items.length ? items.map(itemHTML).join('') : '<li class="empty">Niente segnato in questo giorno.</li>';
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
      '<div class="ct' + (g.in ? ' in' : '') + '"><span class="ico">' + svg(g.c.icon) + '</span><span class="n">' + g.c.name + '</span><span class="v num">' + money(g.v) + '</span>' +
      '<div class="bar"><span style="width:' + (g.v / max * 100) + '%"></span></div></div>'
    ).join('') : '<p class="empty">Ancora nessun movimento in questo periodo.</p>';

    const byDay = {};
    items.forEach((e) => { (byDay[e.date] = byDay[e.date] || []).push(e); });
    $('movesList').innerHTML = Object.keys(byDay).sort().reverse().map((d) => {
      const net = byDay[d].reduce((a, e) => a + (e.type === 'in' ? e.amount : -e.amount), 0);
      return '<div class="group"><h3><span>' + (d === today ? 'Oggi' : long(d)) + '</span><span class="num">' + (net >= 0 ? '+' : '−') + money(Math.abs(net)) + '</span></h3>' +
        '<div class="card"><ul class="list">' + byDay[d].map(itemHTML).join('') + '</ul></div></div>';
    }).join('');
  }

  /* ---------------- render: Periodi ---------------- */
  function renderPeriods() {
    const ps = state.periods.slice().sort((a, b) => b.start.localeCompare(a.start));
    $('periodList').innerHTML = ps.length ? ps.map((p) =>
      '<div class="pitem' + (p.id === state.current ? ' cur' : '') + '" data-pid="' + p.id + '" role="button" tabindex="0">' +
      '<span class="txt"><b>' + esc(p.name || range(p)) + '</b><span>' + short(p.start) + ' → ' + short(p.end) + ' · ' + plural(diff(p.start, p.end) + 1, 'giorno', 'giorni') + '</span></span>' +
      (inPeriod(p, today) ? '<span class="tag">in corso</span>' : '') +
      '<button type="button" class="link" data-edit="' + p.id + '">Modifica</button></div>'
    ).join('') : '<p class="empty">Nessun periodo. Creane uno per iniziare.</p>';
    $$('#modeOpts [data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode())));
    if (typeof renderBackup === 'function') renderBackup();
  }

  function renderAll() {
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
    const d = addDate && addDate !== today ? 'quel giorno' : 'oggi';
    $('whenHint').textContent = spread
      ? 'Si divide sui giorni che restano fino alla fine del periodo. Ideale per lo stipendio.'
      : 'Si aggiunge tutto a quello che puoi spendere ' + d + '. Ideale per un rimborso.';
  }
  $$('#when [data-spread]').forEach((x) => x.addEventListener('click', () => { spread = x.dataset.spread === '1'; renderWhen(); }));
  $('addForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!cur()) { openEditor(null); return; }
    const v = parseAmt($('inAmt').value);
    if (!(v > 0)) { $('inAmt').focus(); $('inAmt').placeholder = 'Importo?'; return; }
    const d = addDate || today;
    const entry = { id: uid(), date: d, amount: v, type, cat, note: $('inNote').value.trim() };
    if (type === 'in') entry.spread = spread;
    list().push(entry);
    save();
    $('inAmt').value = ''; $('inNote').value = ''; $('inAmt').blur();
    toast((type === 'in' ? 'Entrata aggiunta' : 'Uscita aggiunta') + (d !== today ? ' al ' + short(d) : ''));
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
    li.innerHTML = '<div class="confirm"><span>Eliminare ' + money(e.amount) + '?</span><button type="button" class="btn danger" data-yes>Elimina</button><button type="button" class="btn" data-no>No</button></div>';
    li.querySelector('[data-yes]').addEventListener('click', () => {
      state.entries[state.current] = list().filter((x) => x.id !== id);
      save(); toast('Eliminato'); renderAll();
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
    toast(b.dataset.mode === 'ricalcola' ? 'La quota ora si ricalcola ogni giorno' : 'La quota ora resta fissa e recuperi gli sforamenti');
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
    $('sheetTitle').textContent = p ? 'Modifica periodo' : 'Nuovo periodo';
    const sug = p || suggestNext();
    $('pName').value = p ? (p.name || '') : '';
    $('pStart').value = sug.start; $('pEnd').value = sug.end;
    $('pBase').value = p && p.base ? String(p.base).replace('.', ',') : '';
    $('pError').hidden = true;
    $('pCancel').hidden = !state.periods.length;
    $('pRestore').hidden = state.periods.length > 0;
    const z = $('pDeleteZone');
    z.innerHTML = p ? '<button type="button" class="btn" id="pDel">Elimina periodo</button>' : '';
    if (p) $('pDel').addEventListener('click', () => {
      z.innerHTML = '<div class="confirm"><span>Eliminare il periodo e tutti i suoi movimenti?</span><button type="button" class="btn danger" id="pDelYes">Elimina</button></div>';
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
    if (!s || !e || e < s) { $('pExample').textContent = 'La data di fine deve essere uguale o successiva all\'inizio.'; return; }
    const n = diff(s, e) + 1, q = (b > 0 ? b : 0) / n;
    $('pExample').innerHTML = b > 0
      ? plural(n, 'giorno', 'giorni') + ' → <b>' + money(q) + '</b> al giorno. Se un giorno non spendi niente, il giorno dopo hai <b>' + money(q * 2) + '</b>.'
      : plural(n, 'giorno', 'giorni') + '. Ogni entrata che segni viene divisa tra i giorni che restano fino alla fine.';
  }
  ['pStart', 'pEnd', 'pBase'].forEach((id) => $(id).addEventListener('input', updateExample));
  $('pCancel').addEventListener('click', closeEditor);
  $('sheet').addEventListener('click', (ev) => { if (ev.target === $('sheet') && state.periods.length) closeEditor(); });
  $('pSave').addEventListener('click', () => {
    const s = $('pStart').value, e = $('pEnd').value, b = parseAmt($('pBase').value);
    if (!s || !e || e < s) { $('pError').textContent = 'Controlla le date: la fine deve essere uguale o successiva all\'inizio.'; $('pError').hidden = false; return; }
    const data = { name: $('pName').value.trim(), start: s, end: e, base: b > 0 ? b : 0 };
    if (editingId) { Object.assign(state.periods.find((p) => p.id === editingId), data); state.current = editingId; }
    else { const id = uid(); state.periods.push(Object.assign({ id }, data)); state.current = id; state.entries[id] = []; }
    save(); closeEditor();
    selDate = clampSel(cur()); addDate = null;
    renderAll(); go('today');
    toast('Periodo salvato');
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
    if (!last) { el.textContent = 'Non hai ancora fatto un backup.'; el.classList.toggle('old', state.periods.length > 0); return; }
    const n = diff(last, today);
    el.textContent = 'Ultimo backup: ' + (n <= 0 ? 'oggi' : n === 1 ? 'ieri' : n + ' giorni fa') + '.';
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
      await navigator.share({ files: [file], title: 'Backup Quota', text: 'Backup di Quota del ' + short(today) });
      markBackup(); toast('Backup inviato');
    } catch (e) { if (e && e.name !== 'AbortError') toast('Non riesco a condividere: usa "Scarica backup".'); }
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
      state = { periods: d.periods, current: d.current, entries: d.entries, settings: Object.assign({ overspend: 'riporto' }, d.settings || state.settings) };
      if (!cur()) state.current = pickCurrent();
      save();
      selDate = cur() ? clampSel(cur()) : today;
      renderAll();
      msg.textContent = 'Backup caricato: ' + plural(state.periods.length, 'periodo', 'periodi') + '.';
      if (!$('sheet').hidden && cur()) { closeEditor(); go('today'); }
      toast('Backup caricato: ' + plural(state.periods.length, 'periodo', 'periodi'));
    } catch (e) {
      msg.textContent = 'Questo file non è un backup di Quota. Scegli il file .json scaricato con "Scarica backup".';
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
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
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
