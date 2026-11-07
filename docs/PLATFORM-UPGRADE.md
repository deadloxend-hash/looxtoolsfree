# LOOX platform upgrade — 7 November 2026

## Phase 1: verified audit

- Frontend baseline: a9dbb29b (GitHub Pages, existing static HTML/modules).
- Backend: deadloxend-hash/looxtoolfree-backend; Vercel project looxtoolfree-backend, production READY at inspection.
- Supabase: qpusifrpyetydnqetbom, ACTIVE_HEALTHY, PostgreSQL 17. Existing accounts, wallets, ledger, subscriptions, jobs, chat/media sessions and submission approval are retained.
- Existing social entities: creator profiles, community posts, likes and follows, all RLS enabled. Existing privileged RPCs check ownership/admin metadata; advisor warnings require review, not blindly revoking the public feed.
- R2 bucket looxai exists. Managed public URL disabled; no custom domains. No R2 credentials configured in the LOOX backend. No storage migration attempted; existing files remain in place.
- Existing community supports explicit private-to-pending publication, admin review, username/avatar editing, likes, follows and basic media viewing.
- Missing: persistent saves, collections, comments, reports, notifications, following feed, discovery/search, richer viewer/admin tools and storage quotas.
- Bugs: cloud video operations are classified as images by the submission mirror and legacy template API. Feed can return a stale post after its private original is deleted. Existing report AI-UPDATE-REPORT.md is historical and its Supabase-unavailable section is obsolete.
- Video costs are backend operation prices, with per-duration operations for some models. Availability currently means keys/operation configuration, not verified provider schema/balance. No paid calls made. Provider-price verification is required before enabling additional settings.
- Supabase advisor: leaked password protection disabled; no-policy notices on backend-only tables are intentionally deny-by-default. Do not add permissive policies merely to clear notices.

## Preservation and release rules

No account, ledger, subscription, job or existing object deletion/migration. Additive schema changes only. New social tables use RLS; private saved references never confer access to source media. Tests use synthetic users inside rolled-back transactions. Do not spend provider credits or change billing plans. MediaGrab is excluded.

## Acceptance still requiring external services/user sessions

Email delivery/verification/reset, signed-in browser acceptance, paid provider generation/refunds, provider commercial terms/pricing and R2 credentials/delivery remain separately tracked. Passing local tests does not establish these as working in production.

## Phase 2–4: community foundation release

Applied migrations: community_platform_foundation, community_admin_audited_actions, community_rpc_private_implementations, video_duration_credit_quotes.

Implemented private saves, public/private collections, comments with deletion and creator moderation, reports, batched notifications, username URLs, profile privacy, avatar crop/replace/remove with server image decoding, following/saved/liked feeds, bounded search, time-decayed engagement ranking and a richer media viewer. Sharing remains explicit and pending administrator approval. Existing private generation/session/credit systems are retained.

Public RPC signatures are preserved while privileged implementations now live in a non-exposed schema. Verified zero executable SECURITY DEFINER functions in the public schema for anon/authenticated. RLS remains enabled on every relevant table. Backend-only tables intentionally have no client policies.

## Phase 5: administrative release

New admin.html dashboard: aggregate counts, paginated account listing (admin-only emails), report resolution/removal, existing submission-review dashboard link, configured operation prices, and credit adjustments with a transaction, idempotency key and audit trail. Backend validates administrator app_metadata, database adjustment function checks the administrator record again, browser roles cannot execute admin RPCs. No browsing of private generations was added.

Backend community commit: 44fb37fba402b69236f8f469f19e673a9f8cbcc1; Vercel production deployment dpl_FRPkGEThfHAmvH7UB19CY4ZeWDso reached READY.

## Phase 6: workspace integration

Same navigation component is mounted inside the existing Image, Video and Agent session rails. Existing history, pinning, rename/delete and model controls remain. Desktop generation content reserves the expanded rail's width; mobile retains its drawer. New standalone Community, Trending, Collections and Admin pages use the existing sitewide header/drawer.

Video quotes bind account, model, duration, ratio, backend price and expiry with a server signature. Generation recomputes the charge from the backend operation. Existing 5-second prices are preserved; 10-second Wan 2.5/2.6 charges are proportional. Unsupported custom resolution/audio settings are rejected. Existing operation IDs remain available to reconcile old jobs. This preserves configured pricing rather than inventing a new currency conversion/profit policy.

## Validation

Frontend: nine existing interaction/session tests pass. Backend: nine test groups pass, including PostgreSQL community/RLS isolation, audited admin idempotency, quote tampering/account binding/expiry and existing credit refund/reservation tests. Provider adapter mocks pass; no paid provider calls made.

Live PostgreSQL synthetic social tests passed and rolled back all writes. Before/after preservation checks matched: 1 existing account profile, 25 jobs, 52 ledger rows, 437 wallet credits, 4 community posts, 0 subscriptions, 20 storage objects. New schema/operation rows are additive.

## Remaining work — do not mark the entire brief complete

R2 delivery/migration and quotas need server credentials or another explicitly configured storage binding. No existing media was migrated or deleted. True reels/watch-view accounting, server-validated five-minute video uploads, avatar-object garbage collection, cover images, follower-list browsing, private-generation collection items, collection covers/reordering, comment replies/pinning, full notification pagination, granular account suspensions, model enable/disable management, invoice-level spend, pricing conversion/margin policy, and the large original template library/workflow catalog remain outstanding.

Paid providers, real email delivery/reset, authenticated browser flows and all requested mobile widths still require acceptance testing. No 2K/4K or longer-duration capabilities were invented. An existing disabled leaked-password-protection advisor remains; no billing plan was changed to enable it.
