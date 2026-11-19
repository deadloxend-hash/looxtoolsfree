# LOOX website upgrade and verification report

Date: 2026-11-19. Payments remain disabled. Existing accounts, media, prices, entitlements and ledger records are preserved.

## Implemented and tested

- Video landing: five editorial sections, four actual playable showcases, explicit playback buttons, muted looping, lazy source assignment, viewport pausing, hidden-tab pausing, reduced-motion/save-data behavior, fixed media dimensions and local posters. One original MiniMax H3 car scene was generated for 60 vidIQ credits. The other three clips are licensed, credited Pexels demonstrations, downloaded and compressed to silent six-second 720p MP4 files. Sources and licensing are recorded in assets/video-showcase/sources.json.
- Rewards: preserved the check-in slot when the shared navigation replaces the profile identity. Mobile keeps the reward in the profile menu. The existing backend reward is unchanged: five credits per 12 hours while the balance is below 50.
- Avatars: one shared authenticated loader, in-flight deduplication, user-bound reference caching, loading skeletons, cached image repaint after header replacement, cross-tab invalidation, stale-user request protection and ordinary initial-based fallback. Private media remains behind its existing authenticated endpoint. All account-module imports now use the same version, eliminating separate auth state instances.
- Settings: accessible custom select popovers, searchable language menu, selected checkmarks, keyboard movement, Escape, restored trigger focus, native field synchronization, visual-viewport positioning and unclipped top-layer menus. Preferences persist and apply on supported pages. Fixed an initialization exception when no account-note element exists. The 320px shared header now stays inside the viewport.
- Landing navigation: image and video accept empty prompts, carry selected models and supported ratios, and stage drafts without generating. Custom ratio panels offer width/height, presets, preview, reset and explicit compatible alternatives. Exact arbitrary pixel dimensions are unavailable through the present adapters; requested dimensions remain a draft only, and the interface requires an explicit supported ratio selection.
- Video Studio: capabilities come from the backend registry; text/image modes, required start frames, optional supported end frames, duration restrictions, upload preview/remove/replace and drag/drop are connected to actual request fields. Veo end-frame transitions require eight seconds. Configured output size and audio inclusion are shown truthfully. Extra reference sets, video editing, arbitrary dimensions and cancellation are not implemented and are not presented as working controls. Existing costs and priced durations are retained.
- Reuse: image and video actions restore settings for review instead of immediately submitting another charged request.
- Workflows: five working server-mapped starters (image creation, product photography, social content, video creation, animate a still), with search, categories, saved/recent/my views, a configurable step interface, estimated cost, private results and progress. Saved starter preferences live on the device, keyed by account. Runnable workflows contain one generation step followed by manual review/export. Automatic multi-generation chains, enhancement and consistency pipelines remain visibly unavailable.
- Assistant: free-only selector and backend requests, no visible quotas or paid upgrade prompts, accurate longer-reset wording and preserved historical conversations. Legacy paid conversations remain readable and require a new free chat to continue. Abuse limits remain active.
- Shared keyboard handling: visible viewport sizing and limited occlusion correction, readable mobile input text, responsive dialogs and reduced interference from fixed landing controls.

## Root causes

| Symptom | Root cause |
|---|---|
| Mobile reward missing | CSS hid the desktop slot; profile-menu transformation discarded the backup slot. |
| Avatar vanished between pages | Multiple versioned account modules held separate state, while a second avatar loader cached failed loads and discarded useful state on account refresh. |
| Android native Settings lists | Settings selects were omitted from the existing dropdown enhancer. |
| Empty prompt blocked | Both landing scripts explicitly intercepted blank submissions and focused the textarea. |
| Reuse incurred a new generation | The session reuse callback called submit directly. |
| Video feature mismatch | Broad inferred model flags were not sufficient to describe individual configured adapters. |
| Narrow header overflow | Fixed navigation actions exceeded the available width at the smallest breakpoint. |
| Settings startup exception | Account error rendering assumed an optional note element always existed. |

## Credit and security audit

Backend commits: f1ec1ef176828915a9921423dd27373db38ecf62 and 443bfa28dc4543cdafb94bd40ed1d88ad5484836.
An additive service-only quoted reservation function was deployed to prevent a price-change race between quote verification and deduction. Existing wallet/operation locks, operation IDs, atomic reservations and exactly-once refunds remain in use. The video finalization size cap was aligned with the existing database cap. Image errors use generic service wording.

Production read-only queries confirmed Basic 25 starting credits, Creator $12/500, Pro $29/1500, Business $69/4000, zero negative wallets and zero duplicate ledger references. Authenticated browser roles cannot update wallets, insert ledger credits or execute the new reservation function. Only service_role can call it. No real payments or customer generations were created for this audit.

The security advisor still reports leaked-password protection disabled. Review https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Server-only tables with RLS and no client policies remain deny-by-default; no public policies were added.

## Verification

- Backend: 50 tests passed, including isolated PostgreSQL tests for current plan allocations, rewards/cooldown/replay, duplicate request IDs, digest conflicts, successful generations, failed-job refunds, negative-balance prevention, concurrent requests, billing replay/refunds, quote tampering, permissions and workflow dispatch. Five relevant follow-up tests also passed after generic error/audio metadata updates.
- Frontend: 13 tests passed, including avatar request deduplication, header replacement, user isolation, session persistence and sheet behavior. JavaScript syntax and diff checks completed.
- Browser: 96 layout checks across Home, both landing pages, both studios, Assistant, Settings, Workflows, Community, Trending, Templates and Creator at 320, 360, 375, 390, 414, 768, 1280 and 1920px; no horizontal document overflow after the narrow-header correction. Desktop scrollbars reduce usable client width in the test harness.
- Browser interactions: searchable custom Settings menu, Escape, selection/save/reload persistence, empty image Studio navigation with a 4:3 compatible custom draft and no generated output; four playable video sources decoded at 1280px width; muted playback and offscreen pause observed.
- Production backend: ready deployment and public workflow/config responses verified; billing remains false.

## Remaining limits and required verification

1. Only the car showcase is an original AI generation. Five additional requested scene ideas still need generation; the connected video account lacked the 60 credits required per additional clip. Three clearly credited licensed demonstrations are temporary substitutes. Fantasy dragon and character-animation footage were not generated.
2. Exact custom output dimensions, additional reference sets, broader resolution/audio choices, video editing, cancellation and multi-generation workflow orchestration remain unsupported by the integrated/priced subset. No prices or entitlements were changed to add them.
3. Schema inspection and configured availability do not prove a successful paid render for every provider. A paid production model matrix was not run.
4. Signed-in avatar navigation and real reward claims were not exercised against a customer account. They were verified through shared-component and isolated database tests, plus production read-only configuration/permission checks.
5. Layout tests emulate viewport widths in a browser. Physical Android/iOS software keyboard behavior, mobile touch interactions and orientation still need device-level verification. No claim of complete real-device verification is made.
6. The local preview origin is deliberately rejected by production API CORS. Availability errors in local screenshots do not indicate a production outage. Production checks use the authorized website origin.

## Files changed

Core files and versioned page references are listed in changed-files-2026-11-19.json. The Git commit provides the exact diff. Local QA harness and uncompressed intermediate videos are excluded from publication.
