const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- preloader (index only, once per session) ----------
const loader = document.getElementById('loader');
let loaderDone = Promise.resolve();
if (loader) {
  let seen = false;
  try { seen = sessionStorage.getItem('vh-loaded') === '1'; } catch (e) {}
  if (seen || reduceMotion) {
    loader.remove();
  } else {
    loaderDone = new Promise(resolve => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        loader.classList.add('done');
        try { sessionStorage.setItem('vh-loaded', '1'); } catch (e) {}
        setTimeout(() => { loader.remove(); resolve(); }, 520);
      };
      const t0 = performance.now();
      window.addEventListener('load', () => {
        setTimeout(finish, Math.max(0, 1250 - (performance.now() - t0)));
      });
      setTimeout(finish, 3200); // hard cap in case load stalls
    });
  }
}

// ---------- nav toggle ----------
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.addEventListener('click', e => { if (e.target.tagName === 'A') links.classList.remove('open'); });
}

// ---------- scroll reveal ----------
function initReveals() {
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
    // safety: anything already in (or above) the viewport shows immediately,
    // covering anchor jumps and background tabs where IO can lag
    const showVisible = () => reveals.forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight * 0.95) el.classList.add('in');
    });
    showVisible();
    setTimeout(showVisible, 300);
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }
}
loaderDone.then(initReveals);

// ---------- typewriter (hero) ----------
const typed = document.getElementById('typed');
if (typed && matchMedia('(min-width: 768px)').matches) {
  const words = ['checkout', 'the runway', 'the rack'];
  if (reduceMotion) {
    typed.textContent = words[0];
  } else {
    let w = 0, i = words[0].length, deleting = false;
    const tick = () => {
      const word = words[w];
      if (!deleting) {
        i++;
        typed.textContent = word.slice(0, i);
        if (i >= word.length) { deleting = true; setTimeout(tick, 2300); return; }
        setTimeout(tick, 70);
      } else {
        i--;
        typed.textContent = word.slice(0, i);
        if (i <= 0) { deleting = false; w = (w + 1) % words.length; setTimeout(tick, 380); return; }
        setTimeout(tick, 42);
      }
    };
    loaderDone.then(() => setTimeout(tick, 2400));
  }
}

// ---------- pin board dragging ----------
const board = document.querySelector('.pinboard');
if (board && matchMedia('(min-width: 768px)').matches) {
  let z = 10;
  board.querySelectorAll('.pin').forEach(pin => {
    let startX, startY, baseX, baseY, dragging = false;
    pin.addEventListener('pointerdown', e => {
      dragging = true;
      try { pin.setPointerCapture(e.pointerId); } catch (err) {}
      startX = e.clientX; startY = e.clientY;
      baseX = parseFloat(pin.dataset.x || '0');
      baseY = parseFloat(pin.dataset.y || '0');
      pin.style.zIndex = ++z;
      pin.classList.add('dragging');
    });
    pin.addEventListener('pointermove', e => {
      if (!dragging) return;
      const x = baseX + e.clientX - startX;
      const y = baseY + e.clientY - startY;
      pin.dataset.x = x; pin.dataset.y = y;
      pin.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(var(--tilt, 0deg))';
    });
    const up = () => { dragging = false; pin.classList.remove('dragging'); };
    pin.addEventListener('pointerup', up);
    pin.addEventListener('pointercancel', up);
  });
}

// ---------- character eyes follow the cursor ----------
const pupils = document.querySelectorAll('.char .pupil');
if (pupils.length && matchMedia('(pointer: fine)').matches && !reduceMotion) {
  let raf = 0;
  document.addEventListener('pointermove', e => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      pupils.forEach(p => {
        const r = p.parentElement.getBoundingClientRect();
        const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        p.style.transform = 'translate(' + (Math.cos(a) * 1.7).toFixed(2) + 'px,' + (Math.sin(a) * 1.7).toFixed(2) + 'px)';
      });
    });
  });
}

// ---------- lightbox for zoomable images ----------
const zoomables = document.querySelectorAll('[data-zoom]');
if (zoomables.length) {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = '<button class="lightbox-close" aria-label="Close image">&times;</button><img alt="">';
  document.body.appendChild(box);
  const boxImg = box.querySelector('img');
  const close = () => { box.classList.remove('open'); document.body.style.overflow = ''; };
  zoomables.forEach(el => {
    el.addEventListener('click', () => {
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      boxImg.src = img.src; boxImg.alt = img.alt;
      box.classList.add('open'); document.body.style.overflow = 'hidden';
    });
  });
  box.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ---------- freeform canvas (pin variant homepage) ----------
const vp = document.getElementById('vp');
const cvCanvas = document.getElementById('canvas');
function initCanvas() {
  const CW = 3700, CH = 2650;
  const SCALE = 0.85;            // board zoom on load
  let cx = 0, cy = 0, zTop = 20;
  cvCanvas.style.transformOrigin = '0 0';
  const clampPan = () => {
    // the canvas paints at CW*SCALE, so clamp against the scaled size
    cx = Math.min(0, Math.max(Math.min(0, innerWidth - CW * SCALE), cx));
    cy = Math.min(0, Math.max(Math.min(0, innerHeight - CH * SCALE), cy));
  };
  const apply = () => {
    cvCanvas.style.transform = 'translate(' + cx + 'px,' + cy + 'px) scale(' + SCALE + ')';
  };

  // start centered on the intro card
  const intro = document.querySelector('.card-intro');
  const centerOn = el => {
    cx = -((el.offsetLeft + el.offsetWidth / 2) * SCALE - innerWidth / 2);
    cy = -((el.offsetTop + el.offsetHeight / 2) * SCALE - innerHeight / 2);
  };
  centerOn(intro);
  clampPan(); apply();
  addEventListener('resize', () => { clampPan(); apply(); });

  // pan by dragging the background
  let panning = false, px, py, pcx, pcy;
  const hint = document.querySelector('.cv-hint');
  const fadeHint = () => { if (hint) hint.classList.add('faded'); };
  vp.addEventListener('pointerdown', e => {
    if (e.target.closest('.cv-card, a, button')) return;
    panning = true; try { vp.setPointerCapture(e.pointerId); } catch (err) {}
    px = e.clientX; py = e.clientY; pcx = cx; pcy = cy;
    vp.classList.add('panning'); fadeHint();
  });
  vp.addEventListener('pointermove', e => {
    if (!panning) return;
    cx = pcx + e.clientX - px; cy = pcy + e.clientY - py;
    clampPan(); apply();
  });
  const endPan = () => { panning = false; vp.classList.remove('panning'); };
  vp.addEventListener('pointerup', endPan);
  vp.addEventListener('pointercancel', endPan);

  // wheel / trackpad pans too
  vp.addEventListener('wheel', e => {
    e.preventDefault(); fadeHint();
    cx -= e.deltaX; cy -= e.deltaY;
    clampPan(); apply();
  }, { passive: false });

  // draggable cards; a small movement still counts as a click on link cards
  cvCanvas.querySelectorAll('.cv-card').forEach(card => {
    let sx, sy, bx, by, dragging = false, moved = 0;
    card.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button') && !card.dataset.href) return;
      dragging = true; moved = 0;
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
      sx = e.clientX; sy = e.clientY;
      bx = parseFloat(card.dataset.x || '0'); by = parseFloat(card.dataset.y || '0');
      card.style.zIndex = ++zTop; card.classList.add('dragging');
      if (card.dataset.href) e.preventDefault();
    });
    card.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = (e.clientX - sx) / SCALE, dy = (e.clientY - sy) / SCALE;
      moved = Math.max(moved, Math.hypot(e.clientX - sx, e.clientY - sy));
      card.dataset.x = bx + dx; card.dataset.y = by + dy;
      card.style.transform = 'translate(' + (bx + dx) + 'px,' + (by + dy) + 'px) rotate(var(--tilt, 0deg))';
    });
    card.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false; card.classList.remove('dragging');
      if (moved < 6 && card.dataset.href) location.href = card.dataset.href;
    });
    card.addEventListener('pointercancel', () => { dragging = false; card.classList.remove('dragging'); });
    if (card.dataset.href) card.addEventListener('click', e => e.preventDefault());
  });
}
if (vp && cvCanvas) {
  const mq = matchMedia('(min-width: 768px)');
  let canvasInited = false;
  const maybeInit = () => { if (mq.matches && !canvasInited) { canvasInited = true; initCanvas(); } };
  maybeInit();
  mq.addEventListener('change', maybeInit);
}

// ---------- scroll timeline (adapted from the Vertical timeline section) ----------
const tls = document.querySelectorAll('.tl');
if (tls.length) {
  const updateTl = () => {
    const mid = innerHeight * 0.6;
    tls.forEach(tl => {
      const rail = tl.querySelector('.tl-rail');
      const progress = tl.querySelector('.tl-progress');
      if (!rail || !progress) return;
      const r = rail.getBoundingClientRect();
      progress.style.height = Math.max(0, Math.min(mid - r.top, r.height)) + 'px';
      tl.querySelectorAll('.tl-item').forEach(item => {
        const node = item.querySelector('.tl-node');
        if (node && node.getBoundingClientRect().top < mid) item.classList.add('in');
      });
    });
  };
  let tlTicking = false;
  const onTlScroll = () => {
    if (!tlTicking) { requestAnimationFrame(() => { updateTl(); tlTicking = false; }); tlTicking = true; }
  };
  addEventListener('scroll', onTlScroll, { passive: true });
  addEventListener('resize', onTlScroll, { passive: true });
  updateTl();
  setTimeout(updateTl, 400);
}

// ---------- corner menu dropdown ----------
const menuBtn = document.querySelector('.menu-btn');
const menuDrop = document.querySelector('.menu-drop');
if (menuBtn && menuDrop) {
  const closeMenu = () => { menuDrop.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const opening = menuDrop.hidden;
    menuDrop.hidden = !opening;
    menuBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  });
  document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
}

// ---------- magnet board (adapted from the Vertical magnet board) ----------
const magBoard = document.getElementById('mag-board');
if (magBoard) {
  const magnets = Array.from(magBoard.querySelectorAll('.magnet'));
  let mz = 30;
  const mrand = (a, b) => a + Math.random() * (b - a);
  const mdraw = m => { m.style.transform = 'translate(' + m._x + 'px,' + m._y + 'px) rotate(' + m._r + 'deg)'; };
  let scattered = false;
  const scatter = () => {
    const W = magBoard.clientWidth, H = magBoard.clientHeight;
    if (!W) { requestAnimationFrame(scatter); return; }
    // shuffled cell grid keeps the scatter organic without piling up
    const n = magnets.length;
    const cols = Math.max(1, Math.round(Math.sqrt(n * W / H)));
    const rows = Math.ceil(n / cols);
    const cw = W / cols, ch = H / rows;
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    magnets.forEach((m, k) => {
      const cell = cells[k % cells.length];
      const gx = (cell % cols) * cw, gy = Math.floor(cell / cols) * ch;
      const mw = m.offsetWidth || 200, mh = m.offsetHeight || 210;
      m._x = Math.max(0, Math.min(W - mw, gx + mrand(-24, cw - mw + 24)));
      m._y = Math.max(4, Math.min(H - mh, gy + mrand(-16, ch - mh + 16)));
      m._r = mrand(-10, 10);
      m.style.zIndex = ++mz;
      m.style.transitionDelay = (k * 0.03) + 's';
      mdraw(m);
    });
    requestAnimationFrame(() => magnets.forEach(m => m.classList.add('in')));
    setTimeout(() => magnets.forEach(m => { m.style.transitionDelay = '0s'; }), n * 30 + 600);
  };
  let mActive = null, mOffX = 0, mOffY = 0;
  const mPoint = e => {
    const r = magBoard.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  magnets.forEach(m => {
    m.addEventListener('pointerdown', e => {
      mActive = m; m.classList.add('dragging'); m.style.zIndex = ++mz;
      const p = mPoint(e); mOffX = p.x - m._x; mOffY = p.y - m._y;
      try { m.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    m.addEventListener('pointermove', e => {
      if (mActive !== m) return;
      const p = mPoint(e); m._x = p.x - mOffX; m._y = p.y - mOffY; mdraw(m);
    });
    const mUp = () => { m.classList.remove('dragging'); if (mActive === m) mActive = null; };
    m.addEventListener('pointerup', mUp);
    m.addEventListener('pointercancel', mUp);
  });
  const magIo = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && !scattered) { scattered = true; scatter(); magIo.disconnect(); }
    });
  }, { threshold: 0.15 });
  magIo.observe(magBoard);
}

// ---------- carousels ----------
document.querySelectorAll('[data-carousel]').forEach(car => {
  const track = car.querySelector('.carousel-track');
  const slides = Array.from(track.children);
  const prev = car.querySelector('.prev');
  const next = car.querySelector('.next');
  const dots = car.querySelector('.carousel-dots');
  if (!track || slides.length < 2) { if (prev) prev.remove(); if (next) next.remove(); return; }

  slides.forEach((_, i) => {
    const d = document.createElement('span');
    d.addEventListener('click', () => track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' }));
    dots.appendChild(d);
  });

  const current = () => Math.round(track.scrollLeft / track.clientWidth);
  const sync = () => {
    const i = current();
    dots.querySelectorAll('span').forEach((d, n) => d.classList.toggle('on', n === i));
    prev.disabled = i <= 0;
    next.disabled = i >= slides.length - 1;
  };
  const go = step => track.scrollTo({ left: track.clientWidth * (current() + step), behavior: 'smooth' });
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  track.addEventListener('scroll', () => { clearTimeout(track._t); track._t = setTimeout(sync, 90); }, { passive: true });
  addEventListener('resize', sync);
  sync();
});
