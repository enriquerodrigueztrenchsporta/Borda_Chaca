/* Borda Chaca — interacciones comunes a todas las páginas */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- cabecera ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- menú móvil ---------- */
  const burger = $('.burger');
  const drawer = $('#drawer');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    drawer.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- vídeo de portada ---------- */
  const video = $('#heroVideo');
  const toggle = $('#videoToggle');
  if (video) {
    const setToggle = playing => {
      toggle.innerHTML = `<svg aria-hidden="true"><use href="#i-${playing ? 'pause' : 'play'}"/></svg>`;
      toggle.setAttribute('aria-label', playing ? 'Pausar vídeo' : 'Reproducir vídeo');
    };
    const load = () => {
      if (video.currentSrc) return;
      $$('source', video).forEach(s => { s.src = s.dataset.src; });
      video.load();
      video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
    };
    const saveData = navigator.connection && navigator.connection.saveData;
    if (!reduceMotion && !saveData) {
      load();
      video.play().catch(() => setToggle(false));
      new IntersectionObserver(([e]) => {
        if (video.dataset.user === 'paused') return;
        e.isIntersecting ? video.play().catch(() => {}) : video.pause();
      }).observe(video);
    } else {
      setToggle(false);
    }
    toggle.addEventListener('click', () => {
      load();
      if (video.paused) { video.play(); video.dataset.user = ''; setToggle(true); }
      else { video.pause(); video.dataset.user = 'paused'; setToggle(false); }
    });
  }

  /* ---------- aparición suave ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -6% 0px' });
  $$('.fade').forEach(el => io.observe(el));

  /* ---------- horario en vivo (hora de Madrid) ---------- */
  const HOURS = { // minutos desde medianoche: [comidas, cenas]
    0: [[780, 960], [1200, 1350]], 1: [[780, 960], [1200, 1350]], 2: [[780, 960], [1200, 1350]],
    3: [[780, 960], [1200, 1350]], 4: [[780, 960], [1200, 1350]], 5: [[780, 930], [1200, 1350]], 6: [[780, 930], [1200, 1350]]
  };
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const madridNow = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: (+p.hour % 24) * 60 + +p.minute };
  };
  const updateHours = () => {
    const { day, min } = madridNow();
    const today = HOURS[day];
    $$('.hours tr[data-day]').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
    $$('[data-today-hours]').forEach(el => { el.textContent = today.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(' · '); });
    const slot = today.find(([a, b]) => min >= a && min < b);
    const next = today.find(([a]) => min < a);
    const label = slot ? (slot[0] >= 1200 ? 'Abierto · cenas con reserva' : `Abierto hasta las ${fmt(slot[1])}`)
      : next ? `Cerrado · abre a las ${fmt(next[0])}` : 'Cerrado · abre mañana a las 13:00';
    $$('[data-open-state]').forEach(el => { el.textContent = label; el.classList.toggle('is-open', !!slot); });
  };
  if ($('[data-open-state]')) { updateHours(); setInterval(updateHours, 60000); }

  /* ---------- menús: enlace activo en la barra ---------- */
  const menuLinks = $$('.menu-nav a');
  if (menuLinks.length) {
    const targets = menuLinks.map(a => $(a.getAttribute('href')));
    const mo = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) menuLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-35% 0px -55% 0px' });
    targets.forEach(t => t && mo.observe(t));
  }

  /* ---------- galería ---------- */
  const lb = $('#lightbox');
  if (lb) {
    const items = $$('#gallery button');
    let idx = 0, lastFocus;
    const show = i => {
      idx = (i + items.length) % items.length;
      const img = $('img', items[idx]);
      $('img', lb).src = img.currentSrc || img.src;
      $('img', lb).alt = img.alt;
      $('figcaption', lb).textContent = items[idx].dataset.caption;
    };
    const open = i => {
      lastFocus = document.activeElement;
      show(i); lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      $('.lb-close', lb).focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { lb.hidden = true; }, 300);
      lastFocus?.focus();
    };
    items.forEach((b, i) => b.addEventListener('click', () => open(i)));
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }
})();
