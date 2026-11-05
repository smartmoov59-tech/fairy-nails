/* ==========================================================================
   Fairy Nails — mise en scène (GSAP + ScrollTrigger + Lenis)
   Règles : courbes douces (expo / power3), uniquement transform + opacity pour
   les animations continues, prefers-reduced-motion respecté, version allégée sur mobile.
   ========================================================================== */
(() => {
  'use strict';
  const C = window.FAIRY || {};
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const rand = (a, b) => a + Math.random() * (b - a);

  let lenis = null;

  /* ------------------------------------------------------------------ */
  /* Défilement : Lenis si dispo, sinon natif                            */
  /* ------------------------------------------------------------------ */
  function scrollToTarget(target, opts = {}) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const offset = opts.offset ?? -70;
    if (lenis) {
      lenis.scrollTo(el, { offset, duration: 1.7, easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
    } else {
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  window.FairyScrollTo = scrollToTarget;

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id);
      if (!t) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(t, { offset: id === '#top' ? 0 : id === '#reservation' ? -40 : -70 });
      history.replaceState(null, '', id);
      t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Navigation + menu mobile                                            */
  /* ------------------------------------------------------------------ */
  const nav = $('#nav'); const burger = $('#burger'); const menu = $('#menu');
  function openMenu() { document.body.classList.add('is-menu'); burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu'); nav.classList.remove('is-hidden'); if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden'; }
  function closeMenu() { if (!document.body.classList.contains('is-menu')) return; document.body.classList.remove('is-menu'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu'); if (lenis) lenis.start(); else document.body.style.overflow = ''; }
  function initNav() {
    burger.addEventListener('click', () => (document.body.classList.contains('is-menu') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('is-solid', y > 60);
      if (document.body.classList.contains('is-menu')) { lastY = y; return; }
      if (y > 500 && y > lastY + 6) nav.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 500) nav.classList.remove('is-hidden');
      lastY = y;
    }, { passive: true });
    nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  }

  /* ------------------------------------------------------------------ */
  /* Horaires : « ouvert / fermé » en direct                             */
  /* ------------------------------------------------------------------ */
  function initStatus() {
    const el = $('#status'); if (!el) return;
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hm = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
    function paint() {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: C.tz || 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t).value;
      const dow = map[get('weekday')]; const min = Number(get('hour')) * 60 + Number(get('minute'));
      $$('#hours li').forEach((li) => li.classList.toggle('is-today', Number(li.dataset.dow) === dow));
      const today = (C.hours || {})[dow] || [];
      const cur = today.find((r) => min >= r[0] && min < r[1]);
      let msg; let open = false;
      if (cur) { open = true; msg = `Ouvert · ferme à ${hm(cur[1])}`; }
      else {
        let found = null;
        for (let d = 0; d < 8 && !found; d++) {
          const dd = (dow + d) % 7; const rs = (C.hours || {})[dd] || [];
          for (const r of rs) { if (d > 0 || r[0] > min) { found = { d, start: r[0], dd }; break; } }
        }
        msg = found ? `Fermé · rouvre ${found.d === 0 ? 'aujourd’hui' : found.d === 1 ? 'demain' : dayNames[found.dd]} à ${hm(found.start)}` : 'Fermé';
      }
      el.classList.toggle('is-open', open);
      el.querySelector('span').textContent = msg;
    }
    paint(); setInterval(paint, 60000);
  }

  /* ------------------------------------------------------------------ */
  /* Vidéo d'entrée                                                      */
  /* ------------------------------------------------------------------ */
  function initVideo() {
    const v = $('#heroVideo'); const ctrl = $('#heroCtrl'); if (!v) return;
    const conn = navigator.connection || {};
    const lite = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    v.src = window.innerWidth >= 900 && !lite ? v.dataset.hd : v.dataset.sd;
    const setPaused = (p) => { ctrl.classList.toggle('is-paused', p); ctrl.setAttribute('aria-label', p ? 'Relancer la vidéo' : 'Mettre la vidéo en pause'); };
    if (reduce || lite) { v.removeAttribute('autoplay'); v.pause(); setPaused(true); }
    else { const pr = v.play(); if (pr && pr.catch) pr.catch(() => setPaused(true)); }
    ctrl.addEventListener('click', () => { if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else if (!ctrl.classList.contains('is-paused')) v.play().catch(() => {}); });
  }

  /* ------------------------------------------------------------------ */
  /* Galerie : lightbox                                                  */
  /* ------------------------------------------------------------------ */
  function initLightbox() {
    const lb = $('#lightbox'); if (!lb) return;
    const figs = $$('#galleryGrid .g'); const img = $('.lightbox__img', lb); const cap = $('.lightbox__cap', lb);
    let idx = 0; let last = null;
    const show = (i) => { idx = (i + figs.length) % figs.length; const f = figs[idx]; const im = $('img', f); img.src = im.currentSrc || im.src; img.alt = im.alt; cap.textContent = $('figcaption', f).textContent; };
    const open = (i, trigger) => { last = trigger; show(i); lb.classList.add('is-open'); if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden'; $('.lightbox__b--x', lb).focus(); };
    const close = () => { lb.classList.remove('is-open'); if (lenis) lenis.start(); else document.body.style.overflow = ''; if (last) last.focus(); };
    figs.forEach((f, i) => $('button', f).addEventListener('click', (e) => open(i, e.currentTarget)));
    $('.lightbox__b--x', lb).addEventListener('click', close);
    $('.lightbox__b--p', lb).addEventListener('click', () => show(idx - 1));
    $('.lightbox__b--n', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Avis : carrousel (flèches, barre, lecture auto)                     */
  /* ------------------------------------------------------------------ */
  function initReviews() {
    const track = $('#revTrack'); if (!track) return;
    track.setAttribute('data-lenis-prevent', '');
    const bar = $('#revBar'); const cards = $$('.rev', track);
    const step = () => (cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 16));
    const update = () => { const max = track.scrollWidth - track.clientWidth; const p = max > 0 ? track.scrollLeft / max : 1; bar.style.transform = `scaleX(${Math.max(0.1, p)})`; };
    track.addEventListener('scroll', update, { passive: true }); update();
    let userTouched = false; let hover = false; let inView = false;
    const go = (dir) => { const max = track.scrollWidth - track.clientWidth; let x = track.scrollLeft + dir * step(); if (dir > 0 && track.scrollLeft >= max - 4) x = 0; if (dir < 0 && track.scrollLeft <= 4) x = max; track.scrollTo({ left: x, behavior: reduce ? 'auto' : 'smooth' }); };
    $('#revPrev').addEventListener('click', () => { userTouched = true; go(-1); });
    $('#revNext').addEventListener('click', () => { userTouched = true; go(1); });
    ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((ev) => track.addEventListener(ev, () => { userTouched = true; }, { passive: true }));
    track.addEventListener('pointerenter', () => { hover = true; }); track.addEventListener('pointerleave', () => { hover = false; });
    new IntersectionObserver((en) => { inView = en[0].isIntersecting; }, { threshold: 0.35 }).observe(track);
    if (!reduce) setInterval(() => { if (!userTouched && !hover && inView && !document.hidden) go(1); }, 5200);
    // glisser à la souris
    let down = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = track.scrollLeft; track.style.scrollSnapType = 'none'; track.style.cursor = 'grabbing'; });
    window.addEventListener('pointermove', (e) => { if (down) track.scrollLeft = sl - (e.clientX - sx); });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; track.style.scrollSnapType = ''; track.style.cursor = ''; });
  }

  /* ------------------------------------------------------------------ */
  /* Découpage du texte (mots / lettres masqués)                         */
  /* ------------------------------------------------------------------ */
  function split(el, mode) {
    if (el.dataset.splitDone) return [];
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const out = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            const make = (txt) => { const c = document.createElement('span'); c.className = 'c'; c.textContent = txt; w.appendChild(c); out.push(c); };
            if (mode === 'chars') Array.from(p).forEach(make); else make(p);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.setAttribute('aria-label', label); el.dataset.splitDone = '1';
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Mouvement : tout ce qui dépend de GSAP                              */
  /* ------------------------------------------------------------------ */
  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);
    const ease = 'expo.out';

    /* --- Lenis --- */
    if (!reduce && window.Lenis) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    } else if (!reduce) document.body.style.overflow = 'hidden';

    /* --- Découpage des titres --- */
    const splits = new Map();
    if (!reduce) $$('[data-split]').forEach((el) => splits.set(el, split(el, el.dataset.split)));
    else $$('[data-split]').forEach((el) => el.classList.add('is-split'));

    /* --- Loader puis intro du hero --- */
    if (!reduce) heroPrep(splits);
    runLoader(() => heroIntro(splits));

    /* --- Barre de lecture --- */
    gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    /* --- Curseur + poussière de fée (souris uniquement) --- */
    if (fine && !reduce) initCursor();

    /* --- Boutons magnétiques / cartes inclinables --- */
    if (fine && !reduce) { initMagnetic(); initTilt(); }

    /* --- Bandeaux défilants --- */
    initMarquees();

    /* --- Compteurs --- */
    initCounters();

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* titres : apparition mot à mot / lettre à lettre */
      splits.forEach((chars, el) => {
        if (el.closest('.hero')) return;
        gsap.from(chars, { yPercent: 118, duration: 1.15, ease, stagger: 0.04, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        el.classList.add('is-split');
      });

      /* éléments qui montent en douceur */
      ScrollTrigger.batch('[data-fade]', { start: 'top 90%', once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, ease, stagger: 0.12, overwrite: true }) });

      /* révélations par rideau */
      $$('[data-rv]').forEach((el) => {
        const cover = document.createElement('i'); cover.className = 'rv__c'; el.prepend(cover);
        const inner = $('img', el) || $('iframe', el);
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
        tl.to(cover, { scaleY: 0, duration: 1.3, ease: 'expo.inOut' });
        if (inner && inner.tagName === 'IMG') tl.from(inner, { scale: 1.35, duration: 1.9, ease }, 0);
      });

      /* parallaxe des images dans leur cadre */
      $$('img[data-speed]').forEach((img) => {
        const s = Number(img.dataset.speed) || 5;
        gsap.fromTo(img, { yPercent: -s }, { yPercent: s, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      /* salon : cercle qui s'agrandit */
      const circ = $('[data-circle]');
      if (circ) gsap.fromTo(circ, { clipPath: 'circle(0% at 50% 62%)' }, { clipPath: 'circle(80% at 50% 50%)', ease: 'none', scrollTrigger: { trigger: circ, start: 'top 90%', end: 'top 20%', scrub: true } });

      /* hero : parallaxe multicouche */
      const heroTrig = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
      const m = window.innerWidth < 900 ? 0.5 : 1;
      gsap.to('[data-hero-media]', { yPercent: 7, ease: 'none', scrollTrigger: heroTrig });
      gsap.to('[data-hero-sparkles]', { yPercent: -22 * m, ease: 'none', scrollTrigger: heroTrig });
      gsap.to('[data-hero-content]', { yPercent: -10 * m, opacity: 0.1, ease: 'none', scrollTrigger: heroTrig });
      gsap.to('.hero__arch--a', { y: -140 * m, ease: 'none', scrollTrigger: heroTrig });
      gsap.to('.hero__arch--b', { y: -260 * m, ease: 'none', scrollTrigger: heroTrig });
      gsap.to('[data-arch]', { rotation: (i) => (i ? 2 : -1.6), duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });

      /* pied de page : le grand nom se lève */
      gsap.fromTo('[data-foot-giant]', { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top 95%', end: 'bottom bottom', scrub: true } });

      /* savoir-faire : section pinnée, histoire étape par étape */
      initStory();

      /* bouton flottant mobile */
      const fab = $('#fab');
      if (fab) {
        let afterHero = false, inBook = false;
        const upd = () => fab.classList.toggle('is-on', afterHero && !inBook);
        ScrollTrigger.create({ trigger: '.marquees', start: 'top 70%', onToggle: (s) => { afterHero = s.isActive || s.progress > 0; upd(); } });
        ScrollTrigger.create({ trigger: '#reservation', start: 'top 75%', end: 'bottom 25%', onToggle: (s) => { inBook = s.isActive; upd(); } });
      }
    });

    /* prestations : défilement horizontal piloté par le scroll (bureau) */
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => initPrest());

    mm.add('(prefers-reduced-motion: reduce)', () => {
      $('.prest').classList.add('prest--static');
      $$('[data-fade]').forEach((e) => { e.style.opacity = 1; e.style.transform = 'none'; });
      const fab = $('#fab'); if (fab) fab.classList.add('is-on');
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------------ */
  /* Loader                                                              */
  /* ------------------------------------------------------------------ */
  function runLoader(startHero) {
    const loader = $('#loader');
    let started = false;
    const go = () => { if (started) return; started = true; startHero(); };
    const finish = () => { loader.remove(); document.body.style.overflow = ''; if (lenis) lenis.start(); go(); };
    if (reduce) { gsap.to(loader, { opacity: 0, duration: 0.4, onComplete: () => { loader.remove(); go(); } }); return; }

    const num = $('#loadNum'); const fill = $('.ln-fill'); const line = $('.ln-line');
    const len = line.getTotalLength();
    gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(fill, { yPercent: 100 });
    gsap.set('.loader__word, .loader__sub, .loader__count', { opacity: 0, y: 14 });

    const prog = { v: 0 };
    const paint = () => { num.textContent = Math.round(prog.v); gsap.set(fill, { yPercent: 100 - prog.v }); };
    // On n'attend que l'essentiel (polices + image d'accueil), jamais toute la page : plafond 3,5 s
    const loaded = new Promise((res) => {
      let n = 0; const tick = () => { if (++n === 2) res(); };
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(tick, tick);
      const poster = new Image(); poster.onload = tick; poster.onerror = tick; poster.src = $('#heroVideo').getAttribute('poster');
      setTimeout(res, 3500);
    });

    const intro = gsap.timeline();
    intro.to(line, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
      .to('.loader__word, .loader__sub, .loader__count', { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12 }, 0.25)
      .to(prog, { v: 88, duration: 1.7, ease: 'power2.out', onUpdate: paint }, 0);

    Promise.all([loaded, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      gsap.to(prog, { v: 100, duration: 0.5, ease: 'power1.inOut', onUpdate: paint, onComplete: () => {
        const out = gsap.timeline({ onComplete: finish });
        out.to('.loader__inner', { y: -30, opacity: 0, duration: 0.6, ease: 'power3.in' })
          .to('.loader__panel--l', { xPercent: -102, duration: 1.3, ease: 'expo.inOut' }, 0.35)
          .to('.loader__panel--r', { xPercent: 102, duration: 1.3, ease: 'expo.inOut' }, 0.35)
          .call(go, null, 0.75);
      } });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Intro du hero                                                       */
  /* ------------------------------------------------------------------ */
  function heroPrep(splits) {
    // états de départ posés avant la fin du loader : aucun flash
    const l1 = splits.get($('.l1')) || []; const l2 = splits.get($('.l2')) || [];
    gsap.set([l1, l2], { yPercent: 125 });
    $$('.hero [data-split]').forEach((e) => e.classList.add('is-split'));
    gsap.set('[data-hero-in]', { opacity: 0, y: 30 });
    gsap.set('[data-arch]', { opacity: 0, scale: 0.7, yPercent: 14 });
    gsap.set('.hero__ctrl', { opacity: 0, scale: 0.6 });
    gsap.set('#heroVideo', { scale: 1.2 });
    nav.classList.add('is-hidden');
  }
  function heroIntro(splits) {
    if (heroIntro.ran) return; heroIntro.ran = true;
    if (reduce) { $$('[data-split]').forEach((e) => e.classList.add('is-split')); return; }
    const l1 = splits.get($('.l1')) || []; const l2 = splits.get($('.l2')) || [];
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('#heroVideo', { scale: 1, duration: 2.6 }, 0)
      .to(l1, { yPercent: 0, duration: 1.5, stagger: 0.07 }, 0.05)
      .to(l2, { yPercent: 0, duration: 1.6, stagger: 0.06 }, 0.35)
      .to('[data-hero-in]', { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.65)
      .to('[data-arch]', { scale: 1, opacity: 1, yPercent: 0, duration: 1.8, stagger: 0.2 }, 0.5)
      .to('.hero__ctrl', { opacity: 1, scale: 1, duration: 1 }, 1.2)
      .call(() => nav.classList.remove('is-hidden'), null, 0.9);
  }

  /* ------------------------------------------------------------------ */
  /* Section pinnée « savoir-faire »                                     */
  /* ------------------------------------------------------------------ */
  function initStory() {
    const sec = $('.story'); if (!sec) return;
    const steps = $$('.story__step', sec); const imgs = $$('.story__frame img', sec); const bar = $('.story__bar i', sec);
    sec.classList.add('story--pinned');
    gsap.set(steps.slice(1), { autoAlpha: 0, yPercent: 14 });
    gsap.set(imgs.slice(1), { yPercent: 100 });
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top top', end: '+=330%', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true } });
    tl.to({}, { duration: 0.45 });
    steps.forEach((s, i) => {
      if (!i) return;
      const t = '>';
      tl.to(steps[i - 1], { autoAlpha: 0, yPercent: -14, duration: 0.5, ease: 'power2.in' }, t)
        .fromTo(steps[i], { autoAlpha: 0, yPercent: 14 }, { autoAlpha: 1, yPercent: 0, duration: 0.6, ease: 'power2.out' }, '>-0.15')
        .fromTo(imgs[i], { yPercent: 100 }, { yPercent: 0, duration: 0.95, ease: 'power2.inOut' }, '<-0.35')
        .to(imgs[i - 1], { scale: 1.2, duration: 0.95 }, '<')
        .to({}, { duration: 0.55 });
    });
    tl.to(bar, { scaleY: 1, duration: tl.duration(), ease: 'none' }, 0);
  }

  /* ------------------------------------------------------------------ */
  /* Prestations : défilement horizontal                                 */
  /* ------------------------------------------------------------------ */
  function initPrest() {
    const pin = $('.prest__pin'); const track = $('[data-track]'); if (!pin || !track) return;
    const cards = $$('.card', track);
    const setSkew = gsap.quickSetter(cards, 'skewX', 'deg');
    const proxy = { skew: 0 };
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const s = gsap.utils.clamp(-9, 9, self.getVelocity() / -380);
          if (Math.abs(s) > Math.abs(proxy.skew)) { proxy.skew = s; gsap.to(proxy, { skew: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: () => setSkew(proxy.skew) }); }
        }
      }
    });
    gsap.from(cards, { opacity: 0, y: 60, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: pin, start: 'top 75%', once: true } });
  }

  /* ------------------------------------------------------------------ */
  /* Bandeaux défilants (vitesse + sens liés au scroll)                  */
  /* ------------------------------------------------------------------ */
  function initMarquees() {
    if (reduce) return;
    const items = $$('[data-marquee]').map((m) => {
      const track = $('.marquee__track', m); const unit = track.firstElementChild;
      const w = unit.getBoundingClientRect().width || 1;
      const need = Math.ceil((window.innerWidth * 1.3) / w) + 1;
      for (let i = 0; i < need; i++) track.appendChild(unit.cloneNode(true));
      return { m, track, w, x: 0, dir: Number(m.dataset.dir) || -1, speed: Number(m.dataset.speed) || 1, vis: true };
    });
    items.forEach((it) => new IntersectionObserver((e) => { it.vis = e[0].isIntersecting; }).observe(it.m));
    let lastY = window.scrollY, vel = 0, df = 1;
    window.addEventListener('resize', () => items.forEach((it) => { it.w = it.track.firstElementChild.getBoundingClientRect().width || it.w; }));
    gsap.ticker.add((t, dt) => {
      const y = window.scrollY; vel += ((y - lastY) - vel) * 0.18; lastY = y;
      const target = vel < -1.5 ? -1 : 1; df += (target - df) * 0.06;
      const boost = Math.min(Math.abs(vel), 40) * 0.45;
      const k = (dt || 16.7) / 16.7;
      items.forEach((it) => {
        if (!it.vis) return;
        it.x += it.dir * (it.speed * 1.2 + boost) * df * k;
        while (it.x <= -it.w) it.x += it.w;
        while (it.x > 0) it.x -= it.w;
        it.track.style.transform = `translate3d(${it.x}px,0,0)`;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Compteurs                                                           */
  /* ------------------------------------------------------------------ */
  function initCounters() {
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count); const dec = Number(el.dataset.dec || 0); const sep = el.dataset.sep;
      const fmt = (v) => { let s = v.toFixed(dec).replace('.', ','); if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return s; };
      if (reduce) return;
      el.textContent = fmt(0);
      const o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }) });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Curseur + poussière de fée                                          */
  /* ------------------------------------------------------------------ */
  function initCursor() {
    const cur = $('.cursor'); if (!cur) return;
    root.classList.add('has-cursor');
    const ring = $('.cursor__ring'); const dot = $('.cursor__dot');
    const xr = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }); const yr = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    const xd = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' }); const yd = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    gsap.set(cur, { opacity: 0 });
    const dust = $('.dust'); dust.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24"><use href="#i-star"/></svg>'.repeat(18));
    const pool = $$('svg', dust); let pi = 0, lastT = 0, shown = false;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) { shown = true; gsap.set([ring, dot], { x: e.clientX, y: e.clientY }); gsap.to(cur, { opacity: 1, duration: 0.4 }); }
      xr(e.clientX); yr(e.clientY); xd(e.clientX); yd(e.clientY);
      const now = performance.now();
      if (now - lastT > 55) {
        lastT = now; const p = pool[pi++ % pool.length];
        gsap.killTweensOf(p);
        gsap.fromTo(p, { x: e.clientX - 7, y: e.clientY - 7, scale: rand(0.4, 1.1), opacity: 0.95, rotation: rand(0, 90) },
          { x: e.clientX - 7 + rand(-28, 28), y: e.clientY - 7 + rand(16, 56), opacity: 0, scale: 0, rotation: '+=90', duration: rand(0.8, 1.4), ease: 'power2.out' });
      }
    }, { passive: true });
    document.addEventListener('pointerover', (e) => { cur.classList.toggle('is-hover', !!e.target.closest('a,button,summary,input,textarea,[data-cursor]')); });
    document.addEventListener('pointerleave', () => gsap.to(cur, { opacity: 0, duration: 0.3 }));
  }

  /* ------------------------------------------------------------------ */
  /* Boutons magnétiques                                                 */
  /* ------------------------------------------------------------------ */
  function initMagnetic() {
    $$('.btn--magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--x', e.clientX - r.left + 'px'); b.style.setProperty('--y', e.clientY - r.top + 'px');
        gsap.to(b, { x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.4, duration: 0.5, ease: 'power3.out' });
      });
      b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,0.4)' }));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Inclinaison 3D + reflet qui suit la souris                          */
  /* ------------------------------------------------------------------ */
  function initTilt() {
    const tilt = (el, target, max) => {
      const g = document.createElement('span'); g.className = 'glare'; g.innerHTML = '<i></i>'; el.appendChild(g);
      const gi = g.firstChild;
      const rx = gsap.quickTo(target, 'rotationX', { duration: 0.6, ease: 'power3' }); const ry = gsap.quickTo(target, 'rotationY', { duration: 0.6, ease: 'power3' });
      gsap.set(target, { transformPerspective: 900 });
      const gx = gsap.quickTo(gi, 'x', { duration: 0.35, ease: 'power3' }); const gy = gsap.quickTo(gi, 'y', { duration: 0.35, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
        rx((py - 0.5) * -max); ry((px - 0.5) * max); gx(px * r.width); gy(py * r.height); el.classList.add('is-tilting');
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); el.classList.remove('is-tilting'); });
    };
    $$('.card.tilt, .gift__flyer.tilt').forEach((el) => tilt(el, el, 9));
    $$('#galleryGrid .g').forEach((el) => tilt(el, $('.g__in', el), 6));
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                           */
  /* ------------------------------------------------------------------ */
  initAnchors(); initNav(); initStatus(); initLightbox(); initReviews(); initVideo();
  if (hasGsap) initMotion();
  else { root.classList.remove('js'); $('#loader') && $('#loader').remove(); }
})();
