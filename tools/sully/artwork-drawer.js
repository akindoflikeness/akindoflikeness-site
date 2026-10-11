'use strict';
(() => {
  const panel = document.querySelector('#sidebarNow');
  const toggle = document.querySelector('#artworkToggle');
  const close = document.querySelector('#closeArtwork');
  const rail = document.querySelector('.shell > aside');
  const main = document.querySelector('main');
  const player = document.querySelector('.player');
  const mobile = matchMedia('(max-width:720px)');
  function syncCoveredContent() {
    rail.inert = !panel.hidden;
    main.inert = !panel.hidden && mobile.matches;
  }
  function setOpen(open, restoreFocus = true) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close album artwork' : 'Open album artwork');
    toggle.title = open ? 'Close album artwork' : 'Open album artwork';
    syncCoveredContent();
    if (open) close.focus({preventScroll:true});
    else if (restoreFocus) toggle.focus({preventScroll:true});
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      setOpen(false);
    }
  });
  mobile.addEventListener('change', syncCoveredContent);
  // The overlay ends above the actual player, including wrapped phone controls.
  const size = () => panel.style.setProperty('--artwork-player-height', player.getBoundingClientRect().height + 'px');
  new ResizeObserver(size).observe(player);
  size();
})();
