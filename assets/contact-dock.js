/* Accessible, interruptible contact popover. Zero network calls or dependencies. */
(() => {
  'use strict';
  const dock = document.getElementById('mep-contact-dock');
  const toggle = document.getElementById('mep-contact-toggle');
  const panel = document.getElementById('mep-contact-panel');
  const close = dock?.querySelector('.mep-contact-close');
  if (!dock || !toggle || !panel) return;
  let open = false;
  function setOpen(next, restoreFocus=false) {
    if (next === open) return;
    open = next;
    dock.classList.toggle('is-open', next);
    toggle.setAttribute('aria-expanded', String(next));
    toggle.setAttribute('aria-label', next ? toggle.dataset.closeLabel : toggle.dataset.openLabel);
    panel.setAttribute('aria-hidden', String(!next));
    const hadPanelFocus = !next && panel.contains(document.activeElement);
    panel.inert = !next;
    if (next) panel.querySelector('a')?.focus({preventScroll:true});
    else if (restoreFocus || hadPanelFocus) toggle.focus({preventScroll:true});
  }
  panel.inert = true;
  toggle.addEventListener('click', () => setOpen(!open));
  close?.addEventListener('click', () => setOpen(false, true));
  document.addEventListener('pointerdown', event => {
    if (open && !dock.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (open && event.key === 'Escape') {event.preventDefault();setOpen(false,true);}
  });
  window.addEventListener('hashchange', () => setOpen(false));
})();
