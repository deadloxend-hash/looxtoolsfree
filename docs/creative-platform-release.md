# LOOX creative platform release

## New pages
- `ai-image-landing.html`: original project artwork, prompt examples, live model availability, prompt/model handoff.
- `ai-video-landing.html`: original looping camera-motion video, poster fallback, reduced-motion and pause controls, prompt handoff.
- `creator.html?id=…`: public creator profile, follower/following counts, media tabs and owner management.

Existing generator URLs remain direct workspaces. AI Home routes visitors to the new landing pages. Visiting or entering a workspace does not generate a paid job.

## Workspaces
- Consolidated Agent CSS into one layout, retaining the existing chat API, free/premium model rules, quotas and history.
- Shared compact glass composer appearance and compact left overlay session drawer.
- Actual saved image/video thumbnails, loaded on demand; no thumbnail generation or credit charge.
- Community hides the complete session drawer and its toggle, preserving its expansion state for Generate.

## Community and privacy
`platform/community.js` supplies the feed, likes, creator profiles, following, explicit publishing, profile editing and post visibility/deletion. The feed uses approved, visible posts only. Prompt sharing is opt-in for new publications. Pending and rejected posts remain absent from public feeds.

Database migration: `database/creative-community.sql` (also tracked in the backend's `supabase/creative-community.sql`).
- New tables: `loox_creator_profiles`, `loox_community_posts`, `loox_post_likes`, `loox_creator_follows`.
- Existing submissions gain caption, prompt-sharing and visibility metadata.
- Foreign keys, unique likes/follows, self-follow constraint, indexes and RLS.
- Owner-checked mutation RPCs, admin-only review RPC, read-only public feed/profile aggregates and owner-only session thumbnail lookup.
- The existing explicit submission/admin approval process synchronizes public metadata through a trigger.
- Private result bucket remains private. Public read permission covers consented approved posts; authenticated owners/admins can preview their submissions. Avatar uploads use a size/type-limited separate bucket.
- Creator records contain no emails, private conversations, wallet balances or credentials.
- The legacy Vercel public template route now enforces visibility, hides unshared prompts and supports video moderation previews.

## Tests
- 9 frontend unit tests: session grouping/fresh starts, persistence failure, scroll behavior, optimistic likes, rollback on error, logged-out gating and duplicate-click prevention.
- PostgreSQL WASM integration test using the actual migration: publishing, approval, unshared prompt privacy, duplicate likes/follows, self-follow denial, follow/unfollow counts, ownership, non-admin denial, hidden posts, deleting posts while retaining private jobs.
- Backend tests: existing ledger, refunds/budget, billing replay, RLS, API boundary and provider contracts pass. A new legacy feed route test verifies prompt privacy, visibility filtering and video type.
- Live anonymous feed returned the three existing approved posts; public signing of an approved media file succeeded. An anonymous database policy check exposed zero private result files.
- Browser checks: Image landing prompt handoff, Video landing prompt handoff and actual muted looping playback, Agent desktop/mobile viewport sizing, drawer behavior and Community sidebar removal.

## Verification limits
Production write tests requiring a confirmation expired and made no persistent test changes. The complete social write and isolation suite instead ran successfully against an isolated local PostgreSQL engine. The browser is signed out: live authenticated chat/generation/refund, likes/follows, profile uploads and owner management still require an authenticated browser acceptance pass. No test generation credits were spent.

## Assets
The landing pages reuse original artwork already supplied for LOOX. The ten-second background video is an original looping camera-motion treatment of that artwork, not generated footage or third-party footage. See `assets/ai-hero/CREATIVE-ASSETS.md`.
