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
  return Object.freeze({searchClause});
}));
