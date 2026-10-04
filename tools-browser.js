(() => {
  const browser = document.querySelector('.tools-browser');
  if (!browser) return;
  const cards = [...browser.querySelectorAll('.tool-card')];
  const position = browser.querySelector('.tool-position');
  let index = 0;
  function move(direction) {
    if (cards.length < 2) return;
    cards[index].hidden = true;
    index = (index + direction + cards.length) % cards.length;
    cards[index].hidden = false;
    position.textContent = `${index + 1} / ${cards.length}`;
  }
  browser.querySelectorAll('.tool-arrow').forEach(button => {
    button.addEventListener('click', () => move(Number(button.dataset.direction)));
  });
  browser.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
})();
