# LOOX mobile UI and Assistant repair — 25 November 2026

## Findings and fixes

- **Assistant scrolling:** shared Studio CSS expanded the conversation with `height:auto` and `overflow:visible` while the body hid document overflow. Desktop imposed fixed heights on three nested containers. Replaced these conflicting rules with one viewport-bounded flex layout, a message scroller, nonshrinking messages and a separate composer row. The existing visualViewport helper supplies the visible height. Attachment refresh preserves scroll position. Explicit submission reveals the new turn.
- **Security gaps:** a legacy ID-specific rule gave text wrappers a 220px flex basis. Mobile changed flex direction to column, applying that basis as height. Settings rows now explicitly use horizontal direction and content-sized wrappers. Narrow Security rows stack controls without artificial gaps. All 15 categories retain existing security handlers and backend-confirmed statuses.
- **Browser dialogs:** replaced production alert/confirm/prompt calls found across frontend JS and inline HTML with one async module. Covers chat/media sessions, collections, comments, Community editing/deletion, styles, reference validation, editor canvas/export warnings and unsaved-crop confirmation. Browser-owned security prompts and file pickers remain native.
- **Session actions:** custom rename/delete dialogs provide validation, async loading, errors, duplicate-submission guards, cancel-first focus, accessible labels and native dialog keyboard containment. Rename updates the visible row after persistence without reloading. Writes remain authenticated and owner-filtered.
- **Deletion semantics verified in source:** media-session deletion cascades session-entry metadata, with original jobs/media/credits stored separately. Assistant conversation deletion already removes its messages and uploaded chat attachments from R2. Its confirmation explicitly explains this difference; original generated media and credit records remain. No production records were deleted during this work.
- **Assistant behavior:** backend instructions now answer general questions directly. Site reference knowledge and automatic directory replies require explicit site context. Saved owner-checked history remains authoritative; up to 12 recent messages go to the existing provider. Provider, output allowance, pricing and fallback configuration remain unchanged.
- **Formatting:** bundled Marked 17.0.5 and license. Model HTML/image tokens are escaped or replaced; parsed output is rebuilt through an element allowlist and validated HTTP/HTTPS/mailto links. Supports headings, emphasis, lists, tables, links, inline/fenced code and copy-code buttons. Tables/code scroll horizontally inside their containers.
- **Composer:** bounded automatic textarea growth, removed resize handle, shared SVG send/attachment/add/stop icons, and Stop response display. Stop ends client presentation; an accepted backend request may still save. The status explains how to reopen its reply.
- **Shared components:** Obsidian Blue dialog surfaces, borders, rounded corners, dimmed backdrop, reduced motion, consistent buttons and status toasts. Modified asset references carry updated cache versions.

## Validation completed

| Check | Result |
|---|---|
| Frontend Node regressions | 23 passed, 0 failed |
| Backend regressions | 73 passed, 0 failed |
| Chromium responsive/Markdown/dialog fixtures | 226 passed, 0 failed |
| Mocked session-action browser fixtures | 5 passed, 0 failed |
| Static page/reference audit | 640 pages, 18,851 references, 0 problems |
| Modified JS syntax and Git whitespace checks | Passed |

Browser widths: **320, 360, 390, 412, 768, 1024, 1440px**. Checked all Settings categories, Security sizing, page horizontal bounds, Assistant scrollability, composer separation/max height, Image/Video workspace bounds, Markdown elements/XSS filtering, relative links, dialog validation/loading/errors and duplicate submissions. Additional session checks verified existing-name prefill, immediate rename update, cancel without delete, exactly one confirmed delete and dialog cleanup. All persistence fixtures use isolated mock records.

Existing regression coverage includes account switching, avatar loading, private sessions, scroll-follow thresholds, sheet-lock restoration, free-launch locks, disabled checkout/top-ups, credits, RLS and account isolation.

## Limits and remaining acceptance

- Chromium used resized iframe viewports. Physical Android/iOS keyboards, Safari and Firefox remain unverified. Existing visualViewport integration is retained and used.
- No production credentials were supplied. Signed-in production rename/delete, password/MFA changes and live model answers were not exercised. The shared media-session component was tested with mock persistence; Assistant persistence was source-reviewed with existing backend coverage.
- Generator browser checks verified workspace presence and horizontal bounds; no real image generation or locked video/paid providers were invoked.
- Confirmed shared issues were repaired; this report does not claim every control on every page received manual acceptance. Specialist editors and browser-specific interactions may need follow-up.
- Payments/subscriptions/top-ups remain Coming Soon. Video and premium image locks, free image routing, credit rules, paid fallback restrictions and SEO/indexing configuration were preserved. MediaGrab was not touched.

## Deployment

Publication is through the existing repositories and hosting configuration. Final commit and deployment identifiers are reported in the conversation after hosting verification.

## Modified files

- `ai-chat.html`
- `ai-image-workspace.html`
- `ai-text-to-image.html`
- `ai-video-generator.html`
- `collections.html`
- `community.html`
- `cropimage.html`
- `design-studio-pro-v2.js`
- `design-studio.html`
- `docs/mobile-ui-assistant-audit-20261125.md`
- `loox-photo-studio.js`
- `loox-video-studio.js`
- `platform/ai-workspace.css`
- `platform/ai-workspace.js`
- `platform/community-page.js`
- `platform/community-social.js`
- `platform/community.js`
- `platform/creator.js`
- `platform/desktop-studio.css`
- `platform/loox-image-generator.js`
- `platform/loox-image-sessions.js`
- `platform/loox-ui.css`
- `platform/loox-ui.js`
- `platform/loox-unified-composer.js`
- `platform/loox-video-generator.js`
- `platform/safe-markdown.js`
- `platform/settings-2.css`
- `platform/template-library.js`
- `platform/workspace-studio.css`
- `platform/workspace-studio.js`
- `scripts/build-experience.mjs`
- `scripts/comments-sheet-audit.mjs`
- `scripts/community-viewer-audit.mjs`
- `scripts/ui-regression.html`
- `settings.html`
- `trending.html`
- `vendor/marked-LICENSE.md`
- `vendor/marked-PROVENANCE.md`
- `vendor/marked.esm.js`
- `video-editor.html`
- `workflows.html`

Backend: `api/loox-chat.js`.
