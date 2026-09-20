import { marked } from './vendor/marked-17.0.5.js';

const target = document.getElementById('readme');
const cacheKey = 'bypo-readme-v1';
const allowed = new Set('P H1 H2 H3 H4 H5 H6 A B I EM STRONG DEL UL OL LI BLOCKQUOTE PRE CODE HR BR TABLE THEAD TBODY TR TH TD IMG DETAILS SUMMARY KBD SUP SUB'.split(' '));
const discard = new Set('SCRIPT STYLE IFRAME VIDEO AUDIO OBJECT EMBED FORM INPUT BUTTON SVG MATH'.split(' '));

// Rebuild a Markdown document from allowed elements, never inserting upstream
// HTML or attributes into the live page. Relative URLs point back to the repo.
function render(data) {
  if (!data || typeof data.content !== 'string' || data.content.length > 1500000) throw Error('Invalid README');
  const source = new URL(data.html_url);
  const raw = new URL(data.download_url);
  if (source.origin !== 'https://github.com' || !source.pathname.startsWith('/wraithsys/bypomono/')) throw Error('Invalid source');
  if (raw.origin !== 'https://raw.githubusercontent.com' || !raw.pathname.startsWith('/wraithsys/bypomono/')) throw Error('Invalid assets');
  const markdown = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0)))
    // Preserve the README's unfenced box-drawing tables as preformatted text.
    .replace(/(^[┌╔][^\n]*\r?\n(?:^[│├└║╠╚][^\n]*(?:\r?\n|$))+)/gm, '\n```text\n$1```\n');
  const parsed = new DOMParser().parseFromString(marked.parse(markdown), 'text/html');
  // The site provides the project header and GitHub action. Keep introductory
  // prose, but omit the README's badge wall, showcase and duplicate navigation.
  const firstSection = parsed.body.querySelector('h2');
  if (firstSection) {
    for (const node of [...parsed.body.childNodes]) {
      if (node === firstSection) break;
      if (node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'P' || node.querySelector('a,img,picture') || !node.textContent.trim()) node.remove();
    }
  }
  const fragment = document.createDocumentFragment();
  const ids = new Map();
  function url(value, image = false) {
    try {
      const resolved = new URL(value, image ? raw : source);
      return (image ? ['https:'] : ['https:', 'http:', 'mailto:']).includes(resolved.protocol) ? resolved.href : null;
    } catch { return null; }
  }
  function copy(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent)); return; }
    if (node.nodeType !== Node.ELEMENT_NODE || discard.has(node.tagName)) return;
    if (!allowed.has(node.tagName)) { for (const child of node.childNodes) copy(child, parent); return; }
    if (node.tagName === 'PRE' && node.querySelector('code.language-mermaid')) {
      const link = document.createElement('a');
      link.href = data.html_url + '#algorithmic-phase-modulation';
      link.textContent = 'View diagram on GitHub';
      const paragraph = document.createElement('p'); paragraph.append(link); parent.append(paragraph); return;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    const alignment = node.getAttribute('align');
    if (['left', 'center', 'right'].includes(alignment)) element.classList.add('align-' + alignment);
    if (node.tagName === 'A' && node.id) element.id = 'readme-' + node.id.replace(/^user-content-/, '');
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      const safe = href === '#top' ? '#readme' : href.startsWith('#') ? '#readme-' + href.slice(1).replace(/^user-content-/, '') : url(href);
      if (safe) element.setAttribute('href', safe);
      element.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IMG') {
      const safe = url(node.getAttribute('src') || '', true);
      if (!safe) return;
      if (new URL(safe).hostname === 'img.shields.io') {
        const label = document.createElement('span'); label.className = 'readme-badge';
        label.textContent = node.getAttribute('alt') || ''; parent.append(label); return;
      }
      element.src = safe; element.alt = node.getAttribute('alt') || '';
      const width = node.getAttribute('width');
      if (/^\d+$/.test(width || '')) element.width = Math.min(1200, +width);
      element.loading = 'lazy'; element.referrerPolicy = 'no-referrer';
      element.addEventListener('error', () => {
        const fallback = document.createElement('span'); fallback.className = 'image-unavailable';
        fallback.textContent = element.alt; element.replaceWith(fallback);
      });
    }
    if (/^H[1-6]$/.test(node.tagName)) {
      const slug = node.textContent.toLowerCase().trim().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
      const count = ids.get(slug) || 0; ids.set(slug, count + 1);
      element.id = 'readme-' + slug + (count ? '-' + count : '');
    }
    if (node.tagName === 'OL' && /^\d+$/.test(node.getAttribute('start') || '')) element.setAttribute('start', node.getAttribute('start'));
    for (const child of node.childNodes) {
      // GFM permits Markdown paragraphs inside the README's HTML table cells.
      // Marked leaves these as text, so parse cell text before sanitizing it.
      if (['TD','TH'].includes(node.tagName) && child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
        const cell = new DOMParser().parseFromString(marked.parse(child.textContent.trim()), 'text/html');
        for (const part of cell.body.childNodes) copy(part, element);
      } else copy(child, element);
    }
    if (node.tagName === 'TABLE' && !node.querySelector('th')) {
      const cells = [...node.querySelectorAll('td')];
      if (cells.length && cells.every(cell => cell.querySelector('pre'))) element.classList.add('diagram-grid');
      else if (cells.some(cell => cell.querySelector('img[src*="img.shields.io"]'))) element.classList.add('download-table');
      else element.classList.add('layout-table');
    }
    parent.append(element);
  }
  for (const child of parsed.body.childNodes) copy(child, fragment);
  // The page already supplies the product heading.
  if (fragment.firstElementChild?.tagName === 'H1') fragment.firstElementChild.remove();
  if (!fragment.textContent.trim()) throw Error('Empty README');
  target.replaceChildren(fragment);
}

try { const saved = localStorage.getItem(cacheKey); if (saved) render(JSON.parse(saved)); } catch { /* static copy remains */ }

async function update() {
  let response = await fetch('/api/bypo-readme', { signal:AbortSignal.timeout(6500) });
  // The static development server has no Pages Functions. Read the same source
  // directly there; production always uses the shared edge cache.
  if (response.status === 404 && ['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
    response = await fetch('https://api.github.com/repos/wraithsys/bypomono/readme', { headers:{Accept:'application/vnd.github+json'}, signal:AbortSignal.timeout(6500) });
  }
  if (!response.ok) throw Error('README unavailable');
  const data = await response.json();
  render(data);
  try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* storage is optional */ }
}
update().catch(() => { /* Keep the last readable copy and the GitHub link. */ });
