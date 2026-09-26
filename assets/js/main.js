/* Borda Chaca — interacciones */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- vídeo de portada ---------- */
  const video = $('#heroVideo');
  const toggle = $('#videoToggle');
  const setToggle = playing => {
    toggle.innerHTML = `<svg aria-hidden="true"><use href="#i-${playing ? 'pause' : 'play'}"/></svg>`;
    toggle.setAttribute('aria-label', playing ? 'Pausar vídeo de fondo' : 'Reproducir vídeo de fondo');
  };
  const saveData = navigator.connection && navigator.connection.saveData;
  if (video && !reduceMotion && !saveData) {
    $$('source', video).forEach(s => { s.src = s.dataset.src; });
    video.load();
    video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
    video.play().catch(() => setToggle(false));
    // pausa cuando no se ve, para ahorrar batería
    new IntersectionObserver(([e]) => {
      if (video.dataset.user === 'paused') return;
      e.isIntersecting ? video.play().catch(() => {}) : video.pause();
    }).observe(video);
  } else if (toggle) {
    setToggle(false);
  }
  toggle?.addEventListener('click', () => {
    if (!video.currentSrc) { $$('source', video).forEach(s => { s.src = s.dataset.src; }); video.load(); video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true }); }
    if (video.paused) { video.play(); video.dataset.user = ''; setToggle(true); }
    else { video.pause(); video.dataset.user = 'paused'; setToggle(false); }
  });

  /* ---------- cabecera ---------- */
  const header = $('#header');
  const dock = $('#dock');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 600 && y > lastY && !document.body.classList.contains('menu-open'));
    dock?.classList.toggle('is-visible', y > innerHeight * .8);
    lastY = y;
  };
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
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- enlace activo de la navegación ---------- */
  const navLinks = $$('.nav a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const navObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navObserver.observe(s));

  /* ---------- revelado ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.reveal, .reveal-img').forEach(el => io.observe(el));

  /* ---------- parallax suave ---------- */
  const para = $$('[data-parallax]');
  if (para.length && !reduceMotion) {
    let ticking = false;
    const run = () => {
      para.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        el.style.transform = `translate3d(0, ${(p * -60).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(run); ticking = true; } }, { passive: true });
    run();
  }

  /* ---------- pestañas de menús ---------- */
  const tabs = $$('[role="tab"]');
  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });

  /* ---------- horario en vivo (hora de Madrid) ---------- */
  const HOURS = { // [comida, cena] en minutos
    0: [[780, 960], [1200, 1350]], 1: [[780, 960], [1200, 1350]], 2: [[780, 960], [1200, 1350]],
    3: [[780, 960], [1200, 1350]], 4: [[780, 960], [1200, 1350]], 5: [[780, 930], [1200, 1350]], 6: [[780, 930], [1200, 1350]]
  };
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const madrid = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(p => [p.type, p.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    return { day, min: (+parts.hour % 24) * 60 + +parts.minute };
  };
  const updateHours = () => {
    const { day, min } = madrid();
    const today = HOURS[day];
    $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
    const th = $('[data-today-hours]');
    if (th) th.textContent = today.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(' · ');
    const slot = today.find(([a, b]) => min >= a && min < b);
    const next = today.find(([a]) => min < a);
    let label;
    if (slot) label = slot[0] >= 1200 ? `Abierto · cenas con reserva` : `Abierto · hasta las ${fmt(slot[1])}`;
    else if (next) label = `Cerrado · abrimos a las ${fmt(next[0])}`;
    else label = `Cerrado · mañana a las 13:00`;
    $$('[data-open-state]').forEach(el => { el.textContent = label; el.classList.toggle('is-open', !!slot); });
  };
  updateHours();
  setInterval(updateHours, 60000);

  /* ---------- mapa (carga bajo demanda) ---------- */
  $('#loadMap')?.addEventListener('click', () => {
    const map = $('#map');
    const f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d94007.0268447278!2d-0.5401458610676682!3d42.58247395697672!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0xde1d5eaad218239f!2sRestaurante+Borda+Chaca!5e0!3m2!1ses!2ses!4v1537184765596';
    f.title = 'Mapa de situación de Borda Chaca en Ulle';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.allowFullscreen = true;
    $('.map__load', map).replaceWith(f);
  });

  /* ---------- galería / lightbox ---------- */
  const lb = $('#lightbox');
  const items = $$('#mosaic button');
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
    $('.lightbox__close', lb).focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 400);
    lastFocus?.focus();
  };
  items.forEach((b, i) => b.addEventListener('click', () => open(i)));
  $('.lightbox__close', lb).addEventListener('click', close);
  $('.lightbox__nav--prev', lb).addEventListener('click', () => show(idx - 1));
  $('.lightbox__nav--next', lb).addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });

  /* ---------- año ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
