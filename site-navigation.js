/* Swup replaces page content; the audio element and player stay in the document. */
(() => {
  if (!window.Swup) return;
  const swup = new Swup({ containers: ['#main', '.nav', '.identity'], animationSelector: false });
  swup.hooks.on('visit:start', visit => { visit.animation.animate = false; });
  // Swup keeps the head: load destination styles before showing its content.
  swup.hooks.before('content:replace', async (visit, { page }) => {
    const next = new DOMParser().parseFromString(page.html, 'text/html');
    const selector = 'link[rel="stylesheet"]';
    const current = Array.from(document.head.querySelectorAll(selector));
    const destination = Array.from(next.head.querySelectorAll(selector));
    const href = link => new URL(link.getAttribute('href'), new URL(visit.to.url, location.href)).href;
    const wanted = new Set(destination.map(href));
    await Promise.all(destination.map(link => {
      const url = href(link);
      if (current.some(existing => existing.href === url)) return;
      return new Promise(resolve => {
        const stylesheet = link.cloneNode(true);
        stylesheet.href = url;
        stylesheet.addEventListener('load', resolve, { once: true });
        stylesheet.addEventListener('error', resolve, { once: true });
        document.head.append(stylesheet);
      });
    }));
    current.filter(link => !wanted.has(link.href)).forEach(link => link.remove());
  });
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
