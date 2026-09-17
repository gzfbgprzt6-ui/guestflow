/* ==========================================================================
   Odmoria v3 — motion sustav
   Sve je opt-in preko data-atributa, ništa se ne nameće samo od sebe.
   ========================================================================== */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- 1. Otkrivanje na scroll -------------------------------- */
  const revealables = $$('[data-rv], .mask-line');
  if (reduce) {
    revealables.forEach(el => el.classList.add('rv-in'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const delay = +(el.dataset.rvDelay || 0);
        setTimeout(() => el.classList.add('rv-in'), delay);
        io.unobserve(el);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
    revealables.forEach(el => io.observe(el));

    /* skupine: djeca se otkrivaju u nizu */
    $$('[data-rv-stagger]').forEach(group => {
      const step = +(group.dataset.rvStagger || 90);
      $$('[data-rv]', group).forEach((child, i) => child.dataset.rvDelay = i * step);
    });
  } else {
    revealables.forEach(el => el.classList.add('rv-in'));
  }

  /* naslovi s maskom: uvodni redci krenu odmah po učitavanju */
  requestAnimationFrame(() => {
    $$('[data-rv-now]').forEach((el, i) => setTimeout(() => el.classList.add('rv-in'), 120 + i * 130));
  });

  /* ---------- 2. Paralaksa na scroll --------------------------------- */
  const layers = $$('[data-speed]');
  const navEl = document.querySelector('.nav');
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      if (navEl) navEl.classList.toggle('is-stuck', y > 24);
      if (!reduce) {
        for (const el of layers) {
          const speed = +el.dataset.speed;
          const host = el.closest('[data-scene]') || el.parentElement;
          const top = host.getBoundingClientRect().top + y;
          const rel = y - top;
          if (rel > -innerHeight && rel < host.offsetHeight + innerHeight) {
            el.style.transform = `translate3d(0, ${rel * speed}px, 0)`;
          }
        }
      }
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 3. Paralaksa na miš (dubina prizora) ------------------- */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    const mouseLayers = $$('[data-mouse]');
    if (mouseLayers.length) {
      let mx = 0, my = 0, cx = 0, cy = 0, raf = null;
      addEventListener('mousemove', e => {
        mx = (e.clientX / innerWidth - .5) * 2;
        my = (e.clientY / innerHeight - .5) * 2;
        if (!raf) raf = requestAnimationFrame(loop);
      }, { passive: true });
      function loop() {
        cx += (mx - cx) * .06;
        cy += (my - cy) * .06;
        for (const el of mouseLayers) {
          const d = +el.dataset.mouse;
          el.style.setProperty('--mx', (cx * d).toFixed(2) + 'px');
          el.style.setProperty('--my', (cy * d).toFixed(2) + 'px');
        }
        raf = (Math.abs(mx - cx) > .001 || Math.abs(my - cy) > .001) ? requestAnimationFrame(loop) : null;
      }
    }
  }

  /* ---------- 4. Brojači --------------------------------------------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, to = +el.dataset.count, suffix = el.dataset.countSuffix || '';
        if (reduce) { el.textContent = to + suffix; cio.unobserve(el); return; }
        const dur = 1500, t0 = performance.now();
        (function step(t) {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
        cio.unobserve(el);
      });
    }, { threshold: .6 });
    counters.forEach(el => cio.observe(el));
  }

  /* ---------- 5. Magnetni gumbi -------------------------------------- */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    $$('[data-magnetic]').forEach(btn => {
      const strength = +(btn.dataset.magnetic || 14);
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.transform = `translate(${dx * strength}px, ${dy * strength * .6}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- 6. Boja pozadine se mijenja po sekcijama ---------------- */
  const tinted = $$('[data-bg]');
  if (tinted.length && 'IntersectionObserver' in window) {
    document.body.style.transition = 'background-color 1.1s var(--ease)';
    const bio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > .5) {
          document.body.style.backgroundColor = e.target.dataset.bg;
        }
      });
    }, { threshold: [.5] });
    tinted.forEach(el => bio.observe(el));
  }

  /* ---------- 7. Vodoravni klizač: povlačenje mišem ------------------ */
  $$('.rail').forEach(rail => {
    let down = false, startX = 0, startLeft = 0;
    rail.addEventListener('pointerdown', e => {
      down = true; startX = e.clientX; startLeft = rail.scrollLeft;
      rail.classList.add('is-drag'); rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener('pointermove', e => {
      if (!down) return;
      rail.scrollLeft = startLeft - (e.clientX - startX);
    });
    const up = e => { down = false; rail.classList.remove('is-drag'); };
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointercancel', up);
  });

  /* ---------- 8. Kopiranje u međuspremnik ----------------------------- */
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); } catch (_) {}
      const label = btn.querySelector('[data-copy-label]') || btn;
      const old = label.textContent;
      label.textContent = 'Kopirano ✓';
      setTimeout(() => label.textContent = old, 1700);
    });
  });
})();
