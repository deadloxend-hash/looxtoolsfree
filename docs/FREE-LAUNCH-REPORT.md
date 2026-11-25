# LOOX AI free launch — 25 November 2026

## Release policy

Payments, subscriptions, credit purchases, premium image generation and all AI video generation are disabled in `src/config/launch.js` on the backend. Existing configurations, plan prices, adapters, histories and balances are retained. No database data was changed by this release. Existing signed payment webhook reconciliation remains intact so historical refunds and subscription events are not lost. Checkout and portal APIs are blocked.

## Image availability

| Model | Provider | Cost | Launch behavior |
|---|---|---:|---|
| FLUX.1 Schnell / SchnellA8 | Local ComfyUI first; Cloudflare Workers AI fallback for text only | 3 | Cloudflare route was advertised Available during inspection; actual generation needs an authenticated smoke test |
| Z-Image Turbo | Local ComfyUI | 3 | Temporarily Offline at inspection; enables on a fresh compatible heartbeat |
| FLUX.2 Klein 4B Image Edit | Local ComfyUI | 3 | Temporarily Offline at inspection; requires reference image and compatible heartbeat |

The existing local API exposes Klein Image Edit only. No additional Klein text model was introduced. Fresh worker heartbeat means less than 90 seconds. Polling refreshes FLUX, Z-Image and Klein availability; maintenance/circuit controls and the Cloudflare allowance are reflected in the public status. No worker addresses or secret keys are returned.

## Coming Soon models

### Premium images


- Nano Banana 2
- Nano Banana Pro
- FLUX.2 Pro
- FLUX.2 Klein 4B
- Ideogram P-Image
- Ideogram 4.5
- Stable Diffusion 3.5 Large
- Stable Image Ultra
- Seedream 4.5
- Seedream 5.0 Flash
- GPT Image
- Qwen Image 2
- HiDream-I1 Fast
- Imagen 4 Fast
- Luma Photon
- FLUX 1.1 Pro Ultra

### Video

All models below and the local Wan 2.1 model are locked. Existing video histories and previews remain readable.

- Wan 2.2 I2V Fast
- Wan 2.2 5B Fast
- Wan 2.2 T2V Fast
- Wan 2.5 I2V
- Wan 2.6 I2V Flash
- Kling 3.0 Standard
- Seedance 2.0
- Veo 3.1 Fast
- Runway Gen-4.5
- FLUX 3 Video Draft HD
- Kling 4.0
- Kling 4.0 Flash
- Seedance 2.5
- Seedance 2.0 Fast
- Grok Imagine Video
- Veo 3.1
- Veo 3.1 Lite
- MiniMax H3
- MiniMax H3 Lite
- Wan 3.0
- Luma Ray 2
- Sora 2

## Cost and credit protections

- Legacy payment/provider approval environment flags cannot override the committed release locks. Payment, subscription, recharge, premium image, video and per-model policies remain independent for future server-side releases; the existing provider verification and pricing approvals remain additional gates.
- New Replicate prediction submissions are blocked at the provider transport layer as well as the engine. Historical status/cancellation is retained.
- Local video submissions fail before input processing, reservation or queue insertion. Worker claims also exclude video while the launch lock is active, so pending pre-launch video tasks cannot start through that route. GPU availability never advertises video as enabled during the lock.
- Existing SQL reservations serialize wallet access and enforce request ID uniqueness; duplicate submissions do not deduct twice. Existing tests cover concurrent failure refunds and reward claims.
- Failed Cloudflare generation releases the reservation. Unavailable local models are rejected before reservation.
- Existing Cloudflare cap: 100 attempts per UTC day, with an atomic database counter. This is a platform cap, not a live measurement of all usage elsewhere on the Cloudflare account.
- Image requests pass 25 as the daily limit. Production SQL independently applies existing membership limits (Basic 25, Creator 100, Pro 250); existing membership configuration is preserved.
- Free signup allocation and manual 5-credit return reward after 12 hours, capped at a 50-credit balance, are unchanged.

## UI and Settings

- Available Models, Temporarily Offline and Coming Soon appear in that order. Offline/premium selection is disabled, with SVG lock indicators and existing credit costs.
- Paid plan and recharge buttons are Coming Soon. Premium launch message is displayed on Upgrade.
- Video Studio retains its layout and history, with disabled generation, disabled model controls, Coming Soon navigation badges and the requested notice.
- Owned interface checkmarks, brand lightning glyphs, dropdown ticks, plan ticks and composer glyphs use consistent inline SVG. User prompts, comments and AI responses are excluded.
- Settings switches use 48×44-pixel touch targets, animated 48×26-pixel tracks, visible keyboard focus and distinct enabled/disabled states.
- Device preferences persist in existing browser storage after reload/sign-in on that device. Account privacy/notification preferences retain their existing Cloudflare save path, rollback, disabled saving state and status announcements. This release does not add cross-device synchronization for device preferences.

## SEO

`docs/launch-indexing.json` contains every exact indexable and noindex URL. `scripts/launch-seo.py` is the reviewable release allowlist; update it when held tools launch. The sitemap contains 493 selected canonical public pages and localized guides for selected tools; 147 held/private pages carry noindex. All selected URLs were checked for HTTP 200. The homepage uses the canonical trailing-slash URL. Private studios/account pages and unavailable tools/guides are noindex,follow. robots.txt permits crawling so these directives remain visible.

Priority public URLs:

- https://deadloxend-hash.github.io/looxtoolsfree/
- https://deadloxend-hash.github.io/looxtoolsfree/ai-image-landing.html
- https://deadloxend-hash.github.io/looxtoolsfree/community.html
- https://deadloxend-hash.github.io/looxtoolsfree/trending.html
- https://deadloxend-hash.github.io/looxtoolsfree/templates.html
- https://deadloxend-hash.github.io/looxtoolsfree/photo-editor.html
- https://deadloxend-hash.github.io/looxtoolsfree/video-editor.html

Examples held from indexing:

- https://deadloxend-hash.github.io/looxtoolsfree/ai-video-landing.html
- https://deadloxend-hash.github.io/looxtoolsfree/ai-video-generator.html
- https://deadloxend-hash.github.io/looxtoolsfree/upgrade.html
- https://deadloxend-hash.github.io/looxtoolsfree/settings.html
- https://deadloxend-hash.github.io/looxtoolsfree/account.html
- https://deadloxend-hash.github.io/looxtoolsfree/ai-text-to-image.html
- https://deadloxend-hash.github.io/looxtoolsfree/ai-image-workspace.html

Search Console: the connected account exposes MediaGrab only. LOOX sitemap was not submitted and no indexing requests were made. No claim of Google indexing is made.

## Verification and limits

- Backend: 80 tests passed, including direct API purchase/video rejection, legacy flag bypass prevention, heartbeat/quota/maintenance routing, credit idempotency, refund concurrency, private media and security protections.
- Frontend: 23 regression tests passed, including account/session handling and private media export.
- Browser QA: desktop Settings preference survived refresh. 390-pixel mobile iframe checks covered Settings, image model grouping/locks, Video Studio and Upgrade. Public catalog fixtures were used for local UI QA because the production backend does not allow preview origins. This does not verify an authenticated production session.
- Public feed inspection returned 9 items; database inspection found 14 active templates with media. Public content was not modified.
- Syntax checks passed for changed JavaScript; the static audit passed on all 640 pages and 18,851 references (zero broken references, duplicate IDs or unbound anchors). All 493 selected public URLs returned HTTP 200.

## Remaining launch checks

Authenticated end-to-end image generation, real worker online/offline transitions, cross-page production sign-in retention and account privacy save/reload require a signed-in acceptance session. The GPU was offline during inspection. The live browser was signed out, so no authenticated production generation was submitted. No real transaction or paid model test was performed. Browser rendering and static review do not constitute a full performance benchmark or exhaustive tool export test.

## Deployment

Backend commit `390abebc2b9bdfa71e28a56928010969724b40d8` is deployed and READY in Vercel production. Frontend application commit `857f92a76924222bc05d84eca83983a8f4de8bbc` and presentation/report commit `0cf3e448fdcda9016a989c9bedccc990a08bbd64` completed GitHub Pages deployment successfully. Production Upgrade content and noindex were fetched and verified. The live image picker shows FLUX Available, local-only models Temporarily Offline, and premium models locked.

Live POST probes for checkout, recharge_checkout, portal, cloud_video_job and video_quote each returned HTTP 503 with the intended public launch message. Production configuration reports payments/subscriptions/credit purchases/premium images/video OFF, zero available video models, and FLUX on the Cloudflare A8 route.

Desktop browser CI passed at 1280×720, 1365×900 and 1920×1080 after correcting notice placement. The first CI run caught the notice/composer regression; it was fixed and the updated run passed. Homepage and creator-profile CI passed. The full UI CI completed successfully, with 110 responsive scenarios and 89 billing/generator assertions: authenticated security/export fixtures, Settings persistence and search, responsive layouts, privacy consent, disabled billing/recharge flows, and frontend regression tests.

The final presentation adjustment keeps the video notice sticky inside the results scroll area, preserving the composer viewport. A final documentation/presentation commit follows the application commit above. The sticky notice was separately verified in a 1280×720 browser viewport; both notice and composer fit within their intended regions.

Final CI evidence: https://github.com/deadloxend-hash/looxtoolsfree/actions/runs/45657184558 (both site-audit and desktop-studio succeeded).
