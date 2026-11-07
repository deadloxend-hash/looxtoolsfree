# AI image landing release — 2026-11-07

Scope: ai-image-landing.html only, plus a shared landing motion-controller improvement. Existing navigation, animated placeholders, account/credit/subscription behavior and generator APIs are retained. No backend or MediaGrab changes.

## Files
- ai-image-landing.html: cinematic hero; seven alternating feature rows; catalog; real-interface tutorial; ten native accessible FAQ disclosures; closing CTA; footer; social metadata and WebPage JSON-LD.
- platform/image-landing.css: page-scoped responsive presentation and reduced-motion animations.
- platform/image-landing.js: live catalog status from existing public configuration, model preselection via existing launch handoff, progressive model expansion, intersection reveals.
- platform/creative-landing.js: managed video loading, pause/play, reduced motion/save-data fallback, pause when offscreen or tab hidden. The existing video landing remains supported.
- assets/image-landing/: supplied StockCake imagery as 480/960 WebP variants, silent H.264 loop/poster and three real UI captures.

## Asset order
1. Vintage racing car
2. Painted woman portrait
3. Retro diner bear
4. Blue eye
5. Punk portrait
6. Winter warrior
7. Hiker landscape

Hero footage is the supplied StockCake starry mountain clip. Audio removed; 0.4s circular crossfade softens the join. Final duration 9.625s, 2,555,802 bytes versus 16,463,365 source bytes (about 84% smaller). MP4 faststart and yuv420p. Below-fold WebP images have explicit dimensions, responsive srcsets, lazy loading and async decode. No new dependencies or third-party scripts.

## Verification
- JavaScript syntax and git diff whitespace checks passed.
- HTML audit: one H1, seven features, ten FAQs, one footer, valid JSON-LD, all local asset and link destinations exist.
- Existing frontend session/community suite: 9/9 passed.
- Browser desktop: autoplay is muted/looping, pause/play works, poster fallback; alternating image/text coordinates; full-width main after overriding shared tool gutter.
- Browser 390px iframe viewport: no horizontal overflow, all seven images loaded, stacked image/text layout, FAQ click/Enter toggle.
- Browser handoff: typed prompt reaches real generator unchanged; catalog expands to all 17 models; model card stages the actual catalog model ID. Visiting does not submit a paid request.

## Current limits
The live backend reported all cloud models coming soon and local FLUX.1 Schnell temporarily unavailable during release. The page accurately reports those statuses; it does not enable generation or make unverified model-output claims. No credits were spent and paid generation was not tested.

Tutorial images are real UI captures. The final tutorial visual shows approved public Community results, explicitly identified on the page, because private completed-session screenshots require an authenticated account. Reference-photo generation is not connected to the current image flow, and the FAQ says so. No universal commercial rights or universal 4K promise is made.

Real iOS/Android hardware, browser data-saver autoplay policy and OS reduced-motion settings were not directly exercised; their code paths retain the static poster until explicit play. Browser playback may still depend on browser policy.

## Recovery and finalization
Recovered the previous session's uncommitted files from the existing checkout at main ee9ea016. All remote branches were inspected; no image-landing redesign branch was present. The original implementation and supplied assets were retained. Final follow-up fixes recompute model-card visibility/counts after live catalog changes and correct the FAQ's showcase location. Rechecked 9 existing tests, JavaScript syntax, whitespace, 69 local references, desktop alternation, mobile width/stacking, catalog expansion, native FAQ click/Enter, and exact prompt handoff into lig-prompt.
