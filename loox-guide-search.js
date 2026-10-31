(() => {
  'use strict';
  const input = document.querySelector('#guideSearch');
  const grid = document.querySelector('#guideGrid');
  const counter = document.querySelector('#guideCount');
  if (!input || !grid || !counter) return;

  const cards = [...grid.querySelectorAll('.loox-related-card')];
  const empty = document.createElement('p');
  empty.className = 'loox-guide-empty';
  empty.textContent = 'No guides match that search. Try a tool name, file format or workflow.';

  const filterGuides = () => {
    const query = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const match = !query || card.textContent.toLocaleLowerCase().includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });
    counter.textContent = `${visible} ${visible === 1 ? 'guide' : 'guides'}`;
    if (visible === 0 && !empty.isConnected) grid.append(empty);
    if (visible > 0 && empty.isConnected) empty.remove();
  };

  input.addEventListener('input', filterGuides);
})();
