window.initMusicFeature = function () {
  const options = [...document.querySelectorAll('.featured-option')];
  const target = document.getElementById('featured-album');
  if (!target || !options.length) return;
  const chosen = options[Math.floor(Math.random() * options.length)];
  target.replaceChildren(chosen.content.cloneNode(true));
  const slug = target.querySelector('[data-slug]').dataset.slug;
  document.querySelectorAll('.records .record').forEach(record => {
    record.hidden = record.dataset.slug === slug;
  });
};
window.initMusicFeature();
