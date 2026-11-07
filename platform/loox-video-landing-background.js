/* Optional cinematic trilogy asset.
   Keep the published landing video working until the user's processed MP4 is uploaded.
   Once uploaded, the 9-second eye / mist / wolf loop is selected automatically. */
(() => {
  'use strict';
  const hero = document.querySelector('body[data-creative-mode="video"] .creative-hero-art');
  if (!(hero instanceof HTMLVideoElement)) return;
  const videoPath = 'assets/ai-hero/loox-ai-video-background-loop.mp4';
  const posterPath = 'assets/ai-hero/loox-ai-video-background-poster.jpg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || navigator.connection?.saveData) return;
  const check = (path) => fetch(path, {method:'HEAD',cache:'no-store'})
    .then(response => response.ok).catch(() => false);
  check(videoPath).then(async exists => {
    if (!exists || !hero.isConnected) return; // fall back to existing video
    const allowPlay = !hero.paused || hero.autoplay;
    if (await check(posterPath)) hero.poster = posterPath;
    hero.src = videoPath;
    hero.load();
    if (allowPlay && !reduced.matches && !document.hidden)
      hero.play().catch(() => {}); // normal browser autoplay policy applies
  });
})();
