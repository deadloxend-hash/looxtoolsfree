# LOOX notifications and utility directories release

Date: 27 November 2026 (Pakistan)

## Delivered

- Shared compact social notification panel backed by the existing Cloudflare D1 API; no seeded production notifications.
- Real creator avatar loading, official LOOX wordmark for system events, activity icons, post previews, unread indicators, short relative dates and full date tooltips.
- Relevant activity filters and local calendar time groups; bounded older-page loading with ID deduplication; exact server unread totals; owned read, mark-all and delete operations; recoverable loading failures and empty states.
- Desktop outside-click and Escape dismissal, focus restoration, background scroll locking, and a mobile sheet with safe areas and internal scrolling.
- Shared bell in both standard and native AI/Community navigation. No duplicate visible bell. Sidebar edge handles hidden on small screens and utility pages; apps navigation retained.
- Comment links include the comment ID; visibility-checked backend focus lookup reveals older comments and parent context. Follower links target profiles and approval links target posts.
- Nine public, statically rendered utility directories, preserving existing URLs and original tool cover artwork. Five missing categories added. Main Utilities has real category View all links, and every directory links to the others.
- Unique titles, descriptions, H1s, canonical URLs, index/follow directives and CollectionPage/ItemList schema. Upcoming tools are separated; noindex leaf pages are excluded from structured item lists. Public directories are in the sitemap. No indexing submission was made.

## Public category URLs

- https://deadloxend-hash.github.io/looxtoolsfree/all-image-tools.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-video-tools.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-pdf-tools.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-audio-tools.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-ai-tools.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-file-conversion-tools.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-developer-tools.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-everyday-utilities.html
- https://deadloxend-hash.github.io/looxtoolsfree/all-text-tools.html

## Validation

- Frontend: 15 Node regression tests passed (search/catalog/covers, notification dates/routing/deduplication, directory metadata, preserved links and sitemap/schema rules).
- Backend: eight regression tests passed, including anonymous denial, owner-scoped mutations/counts, bounded stable pagination, focused comment visibility and prior like behavior.
- Browser: 296 notification/category fixture and real page checks passed with zero failures at 320, 360, 390, 430, 768, 1024, 1440 and 1920 CSS pixels; separate existing dashboard suite: 66 passed, zero failed. Notification fixtures are isolated test data and make no production writes.
- Live API health: HTTP 200, canonical Cloudflare D1/R2 service. Anonymous notification summary: HTTP 401. Backend GitHub security/platform/profile workflows passed.
- Full static audit: 646 HTML pages, 19,229 references, zero broken references or unbound anchors. Utility audit: 122 catalog tools, 141 distinct internal links, ten fragments and 498 sitemap entries passed.
- Browser category link audit: 139 destinations returned 2xx. Outside click and Escape were manually exercised.

## Limitations

Authenticated production notification delivery and private-account navigation were not exercised using a real signed-in account. Those state changes were tested with isolated browser fixtures and backend handler tests. No production notifications were created or deleted during QA. Live cloud AI processing availability is controlled by existing model/backend configuration.

The shared navigation source is updated globally. Frequently used page entry points explicitly receive new cache versions; other existing tool pages pick up the shared source on normal cache revalidation.

No MediaGrab files, payment activation, database schema or provider spending changes are included.

## Backend release

- Pull request: https://github.com/deadloxend-hash/looxtoolfree-backend/pull/6
- Merge commit: https://github.com/deadloxend-hash/looxtoolfree-backend/commit/86e25b07056ffade99966b32e450662c8984762b
- Worker deployment: 53a2fb41cba54b69a3983c3038c075d3. Existing binding types and authentication configuration retained.

## Modified frontend files

- `ai-chat.html`
- `ai-image-landing.html`
- `ai-text-to-image.html`
- `ai-video-generator.html`
- `ai-video-landing.html`
- `all-ai-tools.html`
- `all-image-tools.html`
- `all-text-tools.html`
- `all-video-tools.html`
- `community.html`
- `creator.html`
- `index.html`
- `loox-sitewide-nav.js`
- `photo-editor.html`
- `platform/community-page.js`
- `platform/community-social.js`
- `platform/community.js`
- `scripts/build-utilities.cjs`
- `sitemap.xml`
- `templates.html`
- `trending.html`
- `video-editor.html`
- `.github/workflows/social-directories-check.yml`
- `all-audio-tools.html`
- `all-developer-tools.html`
- `all-everyday-utilities.html`
- `all-file-conversion-tools.html`
- `all-pdf-tools.html`
- `platform/notifications-core.mjs`
- `platform/notifications.css`
- `platform/notifications.js`
- `platform/utility-directories-legacy.json`
- `platform/utility-directories.css`
- `platform/utility-directories.js`
- `scripts/build-utility-directories.cjs`
- `tests/notifications-browser.html`
- `tests/notifications-browser.mjs`
- `tests/notifications-core.test.mjs`
- `tests/notifications-fixture.mjs`
- `tests/notifications-panel.html`
- `tests/utility-directories.test.cjs`
- `docs/notifications-directories-release-2026-11-27.md`
