/* Swup replaces page content; the audio element and player stay in the document. */
(() => {
  if (!window.Swup) return;
  const swup = new Swup({ containers: ['#main', '.nav', '.identity'], animationSelector: false });
  swup.hooks.on('visit:start', visit => { visit.animation.animate = false; });
  swup.hooks.on('page:view', visit => {
    const next = visit.to.document || new DOMParser().parseFromString(visit.to.html, 'text/html');
    const playing = document.body.classList.contains('has-player');
    document.body.className = next.body.className;
    document.body.classList.toggle('has-player', playing);
    document.body.style.cssText = next.body.style.cssText;
    const metadata = 'link[rel="canonical"], meta[name="description"], meta[name="robots"], meta[name="theme-color"], meta[property^="og:"]';
    document.head.querySelectorAll(metadata).forEach(node => node.remove());
    next.head.querySelectorAll(metadata).forEach(node => document.head.append(node.cloneNode(true)));
    window.initMusicFeature();
    window.initToolsBrowser();
    document.dispatchEvent(new Event('akol:page'));
    const main = document.getElementById('main');
    if (!visit.to.hash) main.focus({ preventScroll: true });
    document.getElementById('page-status').textContent = document.title;
  });
})();
