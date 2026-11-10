/* Progressive UI enhancements: all content and links work without JavaScript. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  const fa = root.lang.toLowerCase().startsWith('fa');
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.main-nav');
  const menu = document.querySelector('.mobile-menu');
  const menuToggle = document.querySelector('.menu-toggle');

  const topBtn = document.createElement('button');
  topBtn.className = 'liquid-top';
  topBtn.type = 'button';
  topBtn.textContent = '↑';
  topBtn.setAttribute('aria-label', fa ? 'بازگشت به بالای صفحه' : 'Back to top');
  topBtn.setAttribute('title', fa ? 'بالای صفحه' : 'Back to top');
  document.body.appendChild(topBtn);
  topBtn.addEventListener('click', () => window.scrollTo({ top:0, behavior: reduceMotion.matches ? 'instant' : 'smooth' }));

  let scrollPending = false;
  function refreshScroll() {
    header?.classList.toggle('header-scrolled', window.scrollY > 28);
    topBtn.classList.toggle('is-visible', window.scrollY > 600);
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(refreshScroll); }
  }, { passive:true });
  window.addEventListener('resize', refreshScroll, {passive:true});
  window.addEventListener('load', refreshScroll, {once:true});
  refreshScroll();

  // Mobile navigation keeps the original site's click + Escape behavior.
  document.addEventListener('click', (event) => {
    if (!menu?.classList.contains('is-open')) return;
    if (menu.contains(event.target) || menuToggle?.contains(event.target)) return;
    menu.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 800 || !menu?.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded','false');
  }, {passive:true});

  // Progressive reveal, never required for search crawlers or no-JS visitors.
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const targets = [...document.querySelectorAll([
      '.products-section .section-heading','.product-card','.catalog-section .section-heading',
      '.catalog-panel','.about-visual','.about-copy','.partners-intro','.partner-item',
      '.values-section .section-heading','.value','.global-copy','.global-art',
      '.team-layout > div:first-child','.leader','.faq-layout > .section-heading',
      '.faq-list details','.contact-lead','.contact-cell','.inquiry-copy','.inquiry-form',
      '.detail-visual','.detail-section .detail-layout','.detail-catalog','.hero-stat'
    ].join(','))];
    targets.forEach((element, i) => {
      element.dataset.reveal = '';
      element.style.setProperty('--reveal-delay', `${(i % 4) * 55}ms`);
    });
    root.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin:'0px 0px -3% 0px', threshold:0.06 });
    targets.forEach(el => observer.observe(el));
  }

  // A restrained responsive highlight that tracks the pointing device; zero touch overhead.
  const glowTargets = [...document.querySelectorAll('.product-card,.catalog-panel,.leader,.value')];
  if (finePointer.matches && !reduceMotion.matches) {
    glowTargets.forEach(el => {
      let pending = false, lastEvent = null;
      el.addEventListener('pointermove', event => {
        lastEvent = event;
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          if (!lastEvent) {pending=false;return;}
          const b = el.getBoundingClientRect();
          const x = lastEvent.clientX - b.left;
          const y = lastEvent.clientY - b.top;
          el.style.setProperty('--mx', `${x}px`);
          el.style.setProperty('--my', `${y}px`);
          if (el.classList.contains('product-card')) {
            const tiltX = -(y / b.height - .5) * 2.4;
            const tiltY = (x / b.width - .5) * 2.4;
            el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
            el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
          }
          pending=false;
        });
      }, {passive:true});
      el.addEventListener('pointerleave', () => {
        el.style.removeProperty('--mx');el.style.removeProperty('--my');
        el.style.setProperty('--tilt-x','0deg');el.style.setProperty('--tilt-y','0deg');
      });
    });

    // Hero visual parallax: a few pixels only, and springs back on exit.
    const hero = document.querySelector('.hero-visual');
    if (hero) {
      let request = 0, mx = 0, my = 0;
      const image = hero.querySelector('img');
      hero.addEventListener('pointermove', e => {
        const b = hero.getBoundingClientRect();
        mx = (e.clientX - b.left)/b.width-.5;
        my = (e.clientY - b.top)/b.height-.5;
        if (request) return;
        request = requestAnimationFrame(() => {
          image?.style.setProperty('--hero-x', `${(mx*8).toFixed(2)}px`);
          image?.style.setProperty('--hero-y', `${(my*6).toFixed(2)}px`);
          image?.style.setProperty('--hero-rx', `${(-my*2).toFixed(2)}deg`);
          image?.style.setProperty('--hero-ry', `${(mx*2).toFixed(2)}deg`);
          request = 0;
        });
      }, {passive:true});
      hero.addEventListener('pointerleave', () => {
        if(request){cancelAnimationFrame(request);request=0;}
        ['--hero-x','--hero-y','--hero-rx','--hero-ry'].forEach(v => image?.style.removeProperty(v));
      });
    }
  }

  // Track the visible home-page section in the navigation (without rewriting links).
  if (nav && 'IntersectionObserver' in window) {
    const links = [...nav.querySelectorAll('a[href*="#"]')];
    const mappings = links.map(a => {
      const hash = a.getAttribute('href').split('#')[1];
      return { a, section: hash ? document.getElementById(decodeURIComponent(hash)) : null };
    }).filter(v => v.section);
    if (mappings.length) {
      const visible = new Set();
      const activeObserver = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
        let candidate = null;
        for (const item of mappings) if(visible.has(item.section.id)){candidate=item.a;break;}
        links.forEach(a => a.classList.toggle('is-section-active', candidate===a));
      }, {rootMargin:'-22% 0px -58% 0px',threshold:0});
      mappings.forEach(v => activeObserver.observe(v.section));
    }
  }
})();
