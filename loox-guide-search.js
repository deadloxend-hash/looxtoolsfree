(() => {
  'use strict';
  const input = document.querySelector('#guideSearch');
  const grid = document.querySelector('#guideGrid');
  const counter = document.querySelector('#guideCount');
  const categories = document.querySelector('#guideCategories');
  const loadMore = document.querySelector('#guideLoadMore');
  const progress = document.querySelector('#guideProgress');
  if (!input || !grid || !counter || !categories || !loadMore || !progress) return;
  const cards = [...grid.querySelectorAll('.loox-related-card')];
  const empty = document.createElement('p');
  empty.className = 'loox-guide-empty';
  empty.textContent = 'No guides match. Try another search or category.';
  const classify = (title) => {
    const t = title.toLowerCase();
    if (/\bai\b|face swap|face enhancer|background generator|object remover|upscal|restor|generat|smart/.test(t)) return 'AI';
    if (/pdf|document|word to|excel|ppt|powerpoint/.test(t)) return 'PDF';
    if (/audio|music|mp3|sound|voice|noise|speech|wav|podcast/.test(t)) return 'Audio';
    if (/video|gif|subtitle|clip|reel|frame|movie/.test(t)) return 'Video';
    if (/image|photo|picture|face|portrait|background|crop|resize|compress|watermark|pixel|color|blur|jpg|jpeg|png|webp|heic|svg|design|thumbnail|collage/.test(t)) return 'Image';
    return 'Other';
  };
  cards.forEach(card => {
    card.dataset.category = classify(card.querySelector('h2')?.textContent || '');
  });
  let active = 'All';
  let limit = 15;
  const render = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const matched = cards.filter(card => (active === 'All' || card.dataset.category === active) && (!query || card.textContent.toLocaleLowerCase().includes(query)));
    const shown = matched.slice(0, limit);
    const shownSet = new Set(shown);
    cards.forEach(card => { card.hidden = !shownSet.has(card); });
    counter.textContent = `${matched.length} ${matched.length === 1 ? 'guide' : 'guides'}`;
    progress.textContent = matched.length ? `Showing ${shown.length} of ${matched.length} guides` : '';
    loadMore.hidden = shown.length >= matched.length;
    if (!matched.length && !empty.isConnected) grid.append(empty);
    if (matched.length && empty.isConnected) empty.remove();
    categories.querySelectorAll('[data-category]').forEach(button => {
      const selected = button.dataset.category === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };
  categories.addEventListener('click', event => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;
    active = button.dataset.category;
    limit = 15;
    render();
  });
  input.addEventListener('input', () => { limit = 15; render(); });
  loadMore.addEventListener('click', () => { limit += 15; render(); });
  render();
})();
