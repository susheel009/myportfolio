/* Susheel Mondithoka — portfolio interactions.
   Rule: every motion orients (where am I), sequences (what came first), or demonstrates
   (what a thing does). Loops run only while visible. Reduced-motion users get a still page. */
(() => {
  'use strict';

  const root = document.documentElement;
  const motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');

  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const { gsap, ScrollTrigger, SplitText, Lenis } = window;
  if (!gsap || !ScrollTrigger) return; // Without GSAP the page is complete and static.
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);

  /* ---------- Smooth scrolling (gliding, not hijacking: native scrollbar stays) ---------- */
  let lenis = null;
  if (motionOK && Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const navHeight = () => parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64;
  const scrollToY = (y) => {
    const top = Math.max(0, y);
    if (lenis) lenis.scrollTo(top, { duration: 1.2 });
    else window.scrollTo({ top, behavior: motionOK ? 'smooth' : 'auto' });
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    const offset = id === 'top' || id === 'main' ? 0 : navHeight() - 1;
    scrollToY(target.getBoundingClientRect().top + window.scrollY - offset);
    if (id === 'main') target.focus({ preventScroll: true });
    history.replaceState(null, '', `#${id}`);
  });

  const mm = gsap.matchMedia();

  /* ---------- Hero: name rises in, the summary card settles, then yields to the page ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.hero-title .line > span', { yPercent: 108, duration: 1.25, stagger: 0.09 })
      .from(['.hero .eyebrow', '.hero-lede', '.hero-actions'], { y: 22, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.2)
      .from('.glance', { y: 48, autoAlpha: 0, duration: 1.3 }, 0.3)
      .from('.glance-list > div', { x: 16, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.6)
      .from('.scroll-cue', { autoAlpha: 0, duration: 0.8 }, 1);

    // On wide screens the hero hands off to the page with a little depth; on phones it simply scrolls.
    if (window.matchMedia('(min-width: 1024px)').matches) {
      gsap.to('.hero-copy', {
        yPercent: -10, autoAlpha: 0.25, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 15%', scrub: true },
      });
      gsap.to('.hero-side', {
        yPercent: -16, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    }

    // The summary card tilts toward the pointer, like a card in the hand.
    const glance = document.querySelector('.glance');
    const hero = document.querySelector('.hero');
    if (!glance || !hero || !finePointer) return undefined;
    const rotX = gsap.quickTo(glance, 'rotationX', { duration: 0.9, ease: 'power3' });
    const rotY = gsap.quickTo(glance, 'rotationY', { duration: 0.9, ease: 'power3' });
    const onMove = (e) => {
      const r = glance.getBoundingClientRect();
      rotY(((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 10);
      rotX(-((e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 10);
    };
    const onLeave = () => { rotX(0); rotY(0); };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  });

  /* ---------- Profile: the summary lights up word by word at reading pace ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const text = document.querySelector('.statement-text');
    if (!text || !SplitText) return undefined;
    const split = SplitText.create(text, { type: 'words' });
    gsap.fromTo(split.words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: text, start: 'top 80%', end: 'bottom 45%', scrub: 0.5 },
    });
    return () => split.revert();
  });

  /* ---------- Experience: pinned walk through each role (desktop), plain timeline elsewhere ---------- */
  mm.add({
    pin: '(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)',
    motion: '(prefers-reduced-motion: no-preference)',
    any: '(min-width: 0px)',
  }, (context) => {
    const { pin, motion } = context.conditions;
    const panels = gsap.utils.toArray('.xp-panel');

    if (!pin) {
      if (motion) {
        panels.forEach((panel) => gsap.from(panel, {
          y: 28, autoAlpha: 0, duration: 0.9, ease: 'expo.out',
          scrollTrigger: { trigger: panel, start: 'top 88%' },
        }));
      }
      return undefined;
    }

    root.classList.add('xp-pinned');
    const items = gsap.utils.toArray('.xp-index li');
    const chips = gsap.utils.toArray('.xp-toolkit li');
    const track = document.querySelector('.xp-year-track');
    const n = panels.length;

    gsap.set(panels, { autoAlpha: 0, y: 32 });
    gsap.set(panels[0], { autoAlpha: 1, y: 0 });

    let active = -1;
    const setActive = (index) => {
      if (index === active) return;
      active = index;
      items.forEach((item, k) => {
        item.classList.toggle('is-active', k === index);
        item.classList.toggle('is-done', k < index);
        const button = item.querySelector('button');
        if (k === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      chips.forEach((chip) => {
        const step = Number(chip.dataset.step);
        chip.classList.toggle('is-on', step <= index);   // skills carried forward stay
        chip.classList.toggle('is-new', step === index); // skills this role added
      });
    };

    // One unit of timeline per role. The outgoing role leaves before the next arrives (no
    // overlapping text), with a hold either side so wherever scrolling stops, one role is readable.
    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onUpdate() { setActive(Math.min(n - 1, Math.floor(this.time() + 0.38))); },
    });
    for (let i = 1; i < n; i += 1) {
      tl.to(panels[i - 1], { autoAlpha: 0, y: -28, duration: 0.24, ease: 'power2.in' }, i - 0.62)
        .fromTo(panels[i], { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', immediateRender: false }, i - 0.36)
        .to(track, { yPercent: (-100 * i) / n, duration: 0.5 }, i - 0.62);
    }
    tl.fromTo('.xp-rail-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: n - 1 }, 0);
    tl.to({}, { duration: 0.6 }); // hold on the current role before the section releases
    setActive(0);

    const trigger = ScrollTrigger.create({
      trigger: '.xp-stage',
      start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * 0.85 * tl.duration())}`,
      pin: true,
      scrub: 0.6,
      animation: tl,
      refreshPriority: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    });

    const controller = new AbortController();
    items.forEach((item, index) => {
      item.querySelector('button').addEventListener('click', () => {
        const time = index === 0 ? 0 : index + 0.05;
        scrollToY(trigger.start + (trigger.end - trigger.start) * (time / tl.duration()) + 2);
      }, { signal: controller.signal });
    });

    return () => {
      controller.abort();
      root.classList.remove('xp-pinned');
      items.forEach((item) => item.classList.remove('is-active', 'is-done'));
      chips.forEach((chip) => chip.classList.remove('is-on', 'is-new'));
    };
  });

  /* ---------- Section reveals (created after the pin so positions include its spacing) ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const reveal = (selector) => {
      const els = gsap.utils.toArray(selector);
      if (!els.length) return;
      gsap.set(els, { y: 32, autoAlpha: 0 });
      ScrollTrigger.batch(els, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true,
        }),
      });
    };
    reveal('.facts > div');
    reveal('.skills h2, .work h2, .work .section-sub, .contact h2');
    reveal('.tile');
    reveal('.card');
    reveal('.more, .contact-links, .doc-card, .qr-card');

    // The QR code is drawn by a scan line: it is something to scan.
    gsap.timeline({ scrollTrigger: { trigger: '.qr-wrap', start: 'top 85%', once: true } })
      .fromTo('.qr-wrap img', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power2.inOut' })
      .fromTo('.qr-scan', { top: '0%', autoAlpha: 1 }, { top: '100%', duration: 1.3, ease: 'power2.inOut' }, 0)
      .to('.qr-scan', { autoAlpha: 0, duration: 0.3 });
  });

  /* ---------- Demonstrations: each card shows what the build does ---------- */
  const demos = new Map();
  if (motionOK) {
    const agent = document.querySelector('.viz.agent');
    if (agent) {
      const [user, tool, bot] = agent.children;
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6, defaults: { ease: 'expo.out', duration: 0.7 } });
      tl.set([user, tool, bot], { autoAlpha: 0, y: 14 }, 0)
        .to(user, { autoAlpha: 1, y: 0 }, 0.3)
        .to(tool, { autoAlpha: 1, y: 0 }, 1.2)
        .to(bot, { autoAlpha: 1, y: 0 }, 2.2)
        .to([user, tool, bot], { autoAlpha: 0, y: -8, duration: 0.45, ease: 'power2.in', stagger: 0.06 }, 6.2);
      demos.set(agent, tl);
    }

    const rag = document.querySelector('.viz.rag');
    if (rag) {
      const parts = [rag.querySelector('.rag-q'), ...rag.querySelectorAll('.rag-docs i'), rag.querySelector('.rag-a')];
      const docs = rag.querySelectorAll('.rag-docs i');
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6, defaults: { ease: 'expo.out', duration: 0.6 } });
      tl.call(() => rag.classList.add('is-searching'), null, 0)
        .set(parts, { autoAlpha: 0, y: 10 }, 0)
        .to(parts[0], { autoAlpha: 1, y: 0 }, 0.2)
        .to(docs, { autoAlpha: 1, y: 0, stagger: 0.08 }, 0.9)
        .call(() => rag.classList.remove('is-searching'), null, 1.9)
        .to(parts[parts.length - 1], { autoAlpha: 1, y: 0 }, 2.5)
        .to(parts, { autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 6.4);
      demos.set(rag, tl);
    }

    const listen = document.querySelector('.viz.listen');
    if (listen) {
      const typed = listen.querySelector('.typed');
      const chars = typed.textContent.length;
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.8 });
      tl.fromTo(typed, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: chars * 0.045, ease: `steps(${chars})` }, 0.6)
        .to(typed, { autoAlpha: 0, duration: 0.4 }, '+=2.6')
        .set(typed, { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
      demos.set(listen, tl);
    }

    const pay = document.querySelector('.viz.pay');
    if (pay) {
      const cells = Array.from(pay.querySelectorAll('.pay-row, .pay-total'));
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.8 });
      tl.set(cells, { autoAlpha: 0 }, 0);
      for (let line = 0; line * 4 < cells.length; line += 1) {
        const at = 0.3 + line * 0.45;
        tl.to(cells.slice(line * 4, line * 4 + 4), { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, at);
        cells.slice(line * 4, line * 4 + 4).filter((c) => c.dataset.to).forEach((cell) => {
          const counter = { v: 0 };
          tl.fromTo(counter, { v: 0 }, {
            v: Number(cell.dataset.to), duration: 0.8, ease: 'power2.out',
            onUpdate: () => { cell.textContent = counter.v.toFixed(2); },
          }, at);
        });
      }
      tl.to(cells, { autoAlpha: 0, duration: 0.4 }, '+=2.6');
      demos.set(pay, tl);
    }
  }

  // Loops (CSS or GSAP) run only while their visual is on screen.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const live = motionOK && entry.isIntersecting;
        entry.target.classList.toggle('is-live', live);
        const tl = demos.get(entry.target);
        if (tl) { if (live) tl.play(); else tl.pause(); }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.viz').forEach((el) => io.observe(el));
  }

  /* ---------- Pointer light on the hero, tiles, and cards ---------- */
  if (finePointer) {
    document.querySelectorAll('.hero, .tile, .card').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- Orientation: active section indicator and reading progress ---------- */
  const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  const indicator = document.querySelector('.nav-indicator');
  const setNav = (id) => {
    let current = null;
    navLinks.forEach((link) => {
      if (id && link.hash === `#${id}`) { link.setAttribute('aria-current', 'location'); current = link; }
      else link.removeAttribute('aria-current');
    });
    if (!indicator) return;
    if (!current) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.width = `${current.offsetWidth - 24}px`;
    indicator.style.transform = `translateX(${current.offsetLeft + 12}px)`;
  };
  ['profile', 'experience', 'skills', 'work', 'contact'].forEach((id) => {
    const section = document.getElementById(id);
    if (!section) return;
    ScrollTrigger.create({
      trigger: section, start: 'top 45%', end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) setNav(id); },
    });
  });
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom 45%',
    onToggle: (self) => { if (self.isActive) setNav(null); },
  });

  const bar = document.querySelector('.progress span');
  if (bar) {
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress.toFixed(4)})`; },
    });
  }

  // Fonts change line lengths; re-measure once they arrive.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
})();
