// Refresh on visits, independently of website deployments. Keep a last-good
// edge copy for outages; never replace it with an upstream error response.
const SOURCE = 'https://api.github.com/repos/wraithsys/bypomono/readme';
const FRESH = 300;
const RETAIN = 604800;

async function refresh(cache, key) {
  const response = await fetch(SOURCE, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'akindoflikeness-site' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('README unavailable');
  const data = await response.json();
  if (data.encoding !== 'base64' || !data.content || !data.html_url || !data.download_url) {
    throw new Error('Invalid README response');
  }
  const payload = { content:data.content, html_url:data.html_url, download_url:data.download_url, sha:data.sha };
  const result = new Response(JSON.stringify(payload), { headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `public, max-age=${RETAIN}`,
    'X-Fetched-At': String(Date.now()),
  } });
  await cache.put(key, result.clone());
  return result;
}

function deliver(response) {
  const result = new Response(response.body, response);
  result.headers.set('Cache-Control', 'public, max-age=60');
  return result;
}

export async function onRequestGet({ request, waitUntil }) {
  const cache = caches.default;
  const key = new Request(new URL('/api/bypo-readme', request.url));
  const saved = await cache.match(key);
  if (saved) {
    if (Date.now() - Number(saved.headers.get('X-Fetched-At')) > FRESH * 1000) {
      waitUntil(refresh(cache, key).catch(() => {}));
    }
    return deliver(saved);
  }
  try { return deliver(await refresh(cache, key)); }
  catch { return new Response('{}', { status:503, headers:{'Content-Type':'application/json','Cache-Control':'no-store'} }); }
}
