/* ==========================================================================
   Réservation 100 % statique : aucun serveur, aucun service tiers.
   La demande est transformée en SMS pré-rempli (sms:), e-mail (mailto:),
   appel (tel:) ou fichier agenda (.ics) généré dans le navigateur.
   ========================================================================== */
(() => {
  'use strict';
  const C = window.FAIRY;
  const panel = document.getElementById('booking');
  if (!panel || !C) return;

  const $ = (s, c = panel) => c.querySelector(s);
  const $$ = (s, c = panel) => Array.from(c.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtTime = (t) => t.replace(':', 'h');

  /* ---------- Prestations : lues dans les cartes de la page ---------- */
  const services = Array.from(document.querySelectorAll('.card[data-sid]'))
    .filter((c) => c.dataset.booking !== 'false')
    .map((c) => ({ id: c.dataset.sid, name: c.dataset.name, price: c.dataset.price }));

  const state = { services: new Set(), date: null, time: null, name: '', tel: '', note: '', view: null, step: 1 };

  /* ---------- Jours fériés français (pour prévenir, pas pour bloquer) ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  const holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const set = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((s) => `${y}-${s}`));
    const e = easter(y);
    [1, 39, 50].forEach((n) => { const d = new Date(e); d.setDate(d.getDate() + n); set.add(keyOf(d)); });
    return (holidayCache[y] = set);
  }
  const isHoliday = (d) => holidays(d.getFullYear()).has(keyOf(d));

  /* ---------- Étapes ---------- */
  const panes = $$('.pane');
  const stepLis = $$('#steps li');
  function setStep(n, focus = true) {
    state.step = n;
    panes.forEach((p, i) => p.classList.toggle('is-on', i === n - 1));
    stepLis.forEach((li, i) => {
      li.classList.toggle('is-on', i === n - 1);
      li.classList.toggle('is-done', i < n - 1);
      if (i === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    const h = $('.pane.is-on h3');
    if (h && focus) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    const top = panel.getBoundingClientRect().top;
    if (focus && (top < 0 || top > window.innerHeight * 0.45) && window.FairyScrollTo) window.FairyScrollTo(panel, { offset: -90 });
  }

  /* ---------- Étape 1 : prestations ---------- */
  const chips = $('#chips');
  function renderChips() {
    chips.innerHTML = services.map((s) =>
      `<button type="button" class="chip" data-id="${s.id}" aria-pressed="${state.services.has(s.id)}"><span>${s.name}</span><small>${s.price}</small></button>`
    ).join('');
  }
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const id = b.dataset.id;
    if (state.services.has(id)) state.services.delete(id); else state.services.add(id);
    b.setAttribute('aria-pressed', state.services.has(id));
    $('#err1').textContent = '';
  });

  /* ---------- Étape 2 : calendrier + créneaux ---------- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  state.view = firstOfMonth(today);
  const maxView = new Date(today.getFullYear(), today.getMonth() + C.maxMonthsAhead, 1);

  function isOpenDay(d) { return (C.hours[d.getDay()] || []).length > 0; }

  function renderCal() {
    const y = state.view.getFullYear(), m = state.view.getMonth();
    const startDow = (new Date(y, m, 1).getDay() + 6) % 7;
    const nDays = new Date(y, m + 1, 0).getDate();
    const dows = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    let h = `<div class="cal__top"><h4>${fmtMonth.format(state.view)}</h4><div class="cal__nav">
      <button type="button" data-cal="-1" aria-label="Mois précédent" ${state.view <= firstOfMonth(today) ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button type="button" data-cal="1" aria-label="Mois suivant" ${state.view >= maxView ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div></div>
      <div class="cal__grid" role="group" aria-label="${fmtMonth.format(state.view)}">`;
    h += dows.map((d) => `<span class="cal__dow" aria-hidden="true">${d}</span>`).join('');
    for (let i = 0; i < startDow; i++) h += '<span></span>';
    for (let d = 1; d <= nDays; d++) {
      const date = new Date(y, m, d);
      const k = keyOf(date);
      const off = date < today || !isOpenDay(date) || !hasSlots(date);
      const cls = ['day', k === keyOf(today) ? 'is-today' : '', isHoliday(date) ? 'is-ferie' : ''].join(' ').trim();
      h += `<button type="button" class="${cls}" data-d="${k}" aria-label="${fmtLong.format(date)}${isHoliday(date) ? ' (jour férié)' : ''}" aria-pressed="${state.date === k}" ${off ? 'disabled' : ''}>${d}</button>`;
    }
    h += '</div>';
    $('#cal').innerHTML = h;
  }

  function slotsFor(date) {
    const dow = date.getDay();
    if (!(C.hours[dow] || []).length) return { morning: [], afternoon: [] };
    const now = new Date();
    const ok = (t) => {
      if (keyOf(date) !== keyOf(now)) return true;
      const [hh, mm] = t.split(':').map(Number);
      const slot = new Date(date); slot.setHours(hh, mm, 0, 0);
      return slot.getTime() - now.getTime() >= C.minLeadMinutes * 60000;
    };
    return { morning: C.slots.morning.filter(ok), afternoon: C.slots.afternoon.filter(ok) };
  }
  function hasSlots(date) { const s = slotsFor(date); return s.morning.length + s.afternoon.length > 0; }

  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

  function renderSlots() {
    const box = $('#slots'); const note = $('#dateNote');
    if (!state.date) { box.innerHTML = '<p class="pane__hint" style="margin:0">Choisis d’abord un jour dans le calendrier.</p>'; note.textContent = ''; return; }
    const date = parseKey(state.date); const s = slotsFor(date);
    const row = (label, arr) => arr.length ? `<h4>${label}</h4><div class="slots__row">${arr.map((t) => `<button type="button" class="slot" data-t="${t}" aria-pressed="${state.time === t}">${fmtTime(t)}</button>`).join('')}</div>` : '';
    box.innerHTML = row('Matin', s.morning) + row('Après-midi', s.afternoon);
    note.textContent = isHoliday(date) ? 'Jour férié : confirme avec Ana qu’elle est bien ouverte ce jour-là.' : '';
  }

  $('#cal').addEventListener('click', (e) => {
    const nav = e.target.closest('[data-cal]');
    if (nav) {
      const next = new Date(state.view.getFullYear(), state.view.getMonth() + Number(nav.dataset.cal), 1);
      if (next < firstOfMonth(today) || next > maxView) return;
      state.view = next; renderCal(); return;
    }
    const day = e.target.closest('.day'); if (!day || day.disabled) return;
    state.date = day.dataset.d; state.time = null;
    $$('.day').forEach((b) => b.setAttribute('aria-pressed', b === day));
    $('#err2').textContent = '';
    renderSlots();
  });
  $('#slots').addEventListener('click', (e) => {
    const b = e.target.closest('.slot'); if (!b) return;
    state.time = b.dataset.t;
    $$('.slot').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('#err2').textContent = '';
  });

  /* ---------- Étape 3 : coordonnées ---------- */
  const telOk = (v) => /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/.test(v.trim());

  /* ---------- Étape 4 : message et envois ---------- */
  function joinList(a) { return a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`; }
  function build() {
    const names = services.filter((s) => state.services.has(s.id)).map((s) => s.name.toLowerCase().replace('pose gel pieds', 'pose gel pour les pieds'));
    const date = parseKey(state.date);
    const lines = [
      `Bonjour Ana, c’est ${state.name}.`,
      `Je souhaiterais réserver : ${joinList(names)}, le ${fmtLong.format(date)} à ${fmtTime(state.time)}.`
    ];
    if (state.note.trim()) lines.push(`Précision : ${state.note.trim()}`);
    lines.push(`Mon numéro : ${state.tel.trim()}.`, 'Merci beaucoup ! (demande envoyée depuis le site Fairy Nails)');
    return { text: lines.join('\n'), names, date };
  }

  function showRecap() {
    const { text } = build();
    $('#recap').textContent = text;
    $('#sendSms').href = `sms:${C.phoneTel}?&body=${encodeURIComponent(text)}`;
    $('#sendMail').href = `mailto:${C.email}?subject=${encodeURIComponent('Demande de rendez-vous')}&body=${encodeURIComponent(text)}`;
  }

  function toast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('is-on'), 2800);
  }
  window.FairyToast = toast;

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (__) {} ta.remove(); return ok;
    }
  }

  function icsEscape(s) { return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); } out.push(line); return out.join('\r\n'); }
  function downloadIcs() {
    const { names, date } = build();
    const [hh, mm] = state.time.split(':').map(Number);
    const start = new Date(date); start.setHours(hh, mm, 0, 0);
    const end = new Date(start.getTime() + C.appointmentMinutes * 60000);
    const f = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const now = new Date();
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fairy Nails Onglerie//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${Date.now()}-${Math.random().toString(36).slice(2, 8)}@fairy-nails`, `DTSTAMP:${stamp}`,
      `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
      `SUMMARY:${icsEscape('Fairy Nails · ' + joinList(names) + ' (à confirmer)')}`,
      `LOCATION:${icsEscape(C.address)}`,
      `DESCRIPTION:${icsEscape('Demande de rendez-vous à confirmer par Ana : ' + C.phoneDisplay + '. Durée indicative.')}`,
      'STATUS:TENTATIVE', 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous Fairy Nails', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'
    ].map(fold).join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'rdv-fairy-nails.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------- Navigation entre étapes ---------- */
  panel.addEventListener('click', async (e) => {
    if (e.target.closest('[data-prev]')) { setStep(Math.max(1, state.step - 1)); return; }
    if (e.target.closest('[data-next]')) {
      if (state.step === 1) {
        if (!state.services.size) { $('#err1').textContent = 'Choisis au moins une prestation pour continuer.'; return; }
        renderCal(); renderSlots(); setStep(2); return;
      }
      if (state.step === 2) {
        if (!state.date || !state.time) { $('#err2').textContent = 'Choisis un jour et une heure pour continuer.'; return; }
        setStep(3); return;
      }
      if (state.step === 3) {
        const name = $('#fName'), tel = $('#fTel'); let bad = false;
        $('#errName').textContent = ''; $('#errTel').textContent = ''; name.removeAttribute('aria-invalid'); tel.removeAttribute('aria-invalid');
        if (name.value.trim().length < 2) { $('#errName').textContent = 'Dis-nous comment t’appeler.'; name.setAttribute('aria-invalid', 'true'); bad = true; }
        if (!telOk(tel.value)) { $('#errTel').textContent = 'Numéro invalide (ex. 06 12 34 56 78).'; tel.setAttribute('aria-invalid', 'true'); bad = true; }
        if (bad) { (name.getAttribute('aria-invalid') ? name : tel).focus(); return; }
        state.name = name.value.trim(); state.tel = tel.value.trim(); state.note = $('#fNote').value;
        showRecap(); setStep(4); return;
      }
    }
    if (e.target.closest('#copyMsg')) { const ok = await copyText(build().text); toast(ok ? 'Message copié, colle-le dans un SMS' : 'Copie impossible, sélectionne le texte'); return; }
    if (e.target.closest('#icsBtn')) { downloadIcs(); toast('Fichier agenda téléchargé'); return; }
    if (e.target.closest('#resetBook')) {
      state.services.clear(); state.date = null; state.time = null; ['#fName', '#fTel', '#fNote'].forEach((s) => ($(s).value = ''));
      state.view = firstOfMonth(today); renderChips(); renderCal(); renderSlots(); setStep(1);
    }
  });
  $('#sendSms').addEventListener('click', () => toast('Ouverture de ton application SMS…'));

  /* ---------- Boutons « Choisir » des cartes ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    const id = b.dataset.pick; const s = services.find((x) => x.id === id); if (!s) return;
    state.services.add(id); renderChips(); $('#err1').textContent = '';
    setStep(1, false);
    toast(`« ${s.name} » ajouté à ta demande`);
    if (window.FairyScrollTo) window.FairyScrollTo('#reservation', { offset: -40 });
  });

  renderChips(); renderCal(); renderSlots();
})();
