(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SlopArchive = api;
}(typeof globalThis === 'undefined' ? undefined : globalThis, function () {
  'use strict';
  const quote = value => '"' + String(value).replace(/["\\]/g, ' ').slice(0, 200) + '"';
  function searchClause(value, scope) {
    const phrase = quote(value.trim());
    if (scope === 'artist') return 'creator:' + phrase;
    if (scope === 'release') return 'title:' + phrase;
    if (scope === 'tags') return 'subject:' + phrase;
    // Keep names together and rank credited creators above incidental mentions.
    return '(creator:' + phrase + '^8 OR title:' + phrase + '^5)';
  }
  // Superseded uploads remain reachable through existing listening links.
  const superseded = ['mutation-akol']; // Replaced by mutation-akol-v2, 4 Oct 2026.
  const packLabels = ['sample pack', 'sample packs', 'sample-pack', 'sample-packs', 'samplepack', 'samplepacks', 'sample library', 'sample libraries', 'loop pack', 'loop packs'];
  function musicClause() {
    const excluded = superseded.map(id => 'identifier:' + quote(id));
    for (const field of ['title', 'subject']) {
      for (const label of packLabels) excluded.push(field + ':' + quote(label));
    }
    // Apply at the source so counts and pagination reflect eligible releases.
    // Avoid broad words like samples/loops, which also describe finished music.
    return '(mediatype:audio OR mediatype:etree) AND NOT (' + excluded.join(' OR ') + ')';
  }
  return Object.freeze({searchClause, musicClause});
}));
