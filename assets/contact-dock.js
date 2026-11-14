/* MEProfileGroup contact drawer — viewport-safe, keyboard-accessible, no dependencies. */
(() => {
  'use strict';
  const dock = document.getElementById('mep-contact-dock');
  const toggle = document.getElementById('mep-contact-toggle');
  const panel = document.getElementById('mep-contact-panel');
  if (!dock || !toggle || !panel) return;

  const close = panel.querySelector('.mep-contact-close');
  const backdrop = document.createElement('div');
  backdrop.id = 'mep-contact-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  // The drawer must be a direct child of body. Otherwise site transforms and
  // floating-button positioning can clip/shift it on narrow mobile screens.
  panel.dir = dock.getAttribute('dir') || document.documentElement.dir || 'rtl';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  document.body.append(backdrop, panel);
  toggle.setAttribute('aria-controls', panel.id);

  let open = false;
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');

  function isMobile() {
    return window.matchMedia('(max-width: 760px)').matches;
  }
  function setOpen(next, restoreFocus = false) {
    if (open === next) return;
    open = next;
    dock.classList.toggle('is-open', next);
    panel.classList.toggle('is-open', next);
    backdrop.classList.toggle('is-open', next);
    document.documentElement.classList.toggle('mep-contact-active', next && isMobile());
    panel.setAttribute('aria-hidden', String(!next));
    panel.setAttribute('aria-modal', String(next && isMobile()));
    toggle.setAttribute('aria-expanded', String(next));
    toggle.setAttribute('aria-label', next ? toggle.dataset.closeLabel : toggle.dataset.openLabel);
    const hadPanelFocus = !next && panel.contains(document.activeElement);
    panel.inert = !next;
    if (next) {
      panel.scrollTop = 0;
      (close || panel.querySelector('a'))?.focus({ preventScroll: true });
    } else if (restoreFocus || hadPanelFocus) {
      toggle.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', () => setOpen(!open, true));
  close?.addEventListener('click', () => setOpen(false, true));
  backdrop.addEventListener('click', () => setOpen(false, true));
  document.addEventListener('pointerdown', event => {
    if (open && !dock.contains(event.target) && !panel.contains(event.target) && event.target !== backdrop) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
    } else if (event.key === 'Tab' && isMobile()) {
      // Keep keyboard users inside the modal sheet while it is open.
      const selectors = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const items = [...panel.querySelectorAll(selectors)].filter(el => !el.inert && el.getClientRects().length);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
  window.addEventListener('hashchange', () => setOpen(false));
  window.addEventListener('resize', () => {
    if (open) {
      document.documentElement.classList.toggle('mep-contact-active', isMobile());
      panel.setAttribute('aria-modal', String(isMobile()));
    }
  });
})();
