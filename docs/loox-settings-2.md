# LOOX Settings 2.0 — implementation and verification report

Release date: 24 November 2026. Projects: `looxtoolsfree` and `looxtoolfree-backend` only. MediaGrab was not modified.

## Implemented

The shared Settings route is now an Obsidian Blue workspace with 15 searchable categories, compact outline icons, one selected panel, a close link, and independent scroll areas. At phone widths it opens a category list and individual screens with back navigation, safe-area padding and 44px action targets. The obsolete Account route forwards to Settings, preserves return/recovery parameters, and maps legacy billing/profile anchors.

Profile, security and preferences no longer wait for the account/wallet response. The account library has a load deadline, wallet reads have a bounded retry, and billing/profile/security each have recovery controls. Wallet failures have an explicit unavailable state rather than a fabricated zero. The backend preserves a valid wallet when optional history queries fail and identifies unavailable history. Shared script versions are synchronized across the application to avoid a mixture of cached authentication modules.

| Category | Working implementation |
|---|---|
| General | Dark/light/system appearance, actual English interface, restore device preferences |
| Personalization | Accent picker and swatches, Settings density |
| Profile | Cloudflare creator display name, unique username, biography, avatar upload/crop/removal, account email/date, public profile link, switch/add account, sign out |
| AI Preferences | Image/video model and ratio defaults, model-aware video duration, existing supported image-tool export preference, optional confirmation at 20+ image/video credits |
| Notifications | Existing account-wide community notification preference; explicit distinction from essential notices |
| Data Controls | Existing password-verified personal-data export and guarded account deletion; links to generation/conversation management |
| Privacy | Server-backed private creator profile and connection visibility, existing cookie controls, privacy/support links |
| Security | Password recovery, actual verified factor status, password-verified TOTP enrollment/QR/verification |
| Devices & Sessions | Server-returned sessions/activity, current session marker, password-verified other/all-session revocation, retry |
| Connected Accounts | Actual connected identities from Supabase; no invented integrations or unsafe unlink button |
| Billing & Credits | Backend balance, existing plan/allocation, credit/payment/recharge histories, negative-credit usage chart, existing 12-hour return reward and server eligibility |
| Storage & Collections | Existing owned image/video workspaces, collections and saved templates; no invented storage total |
| Accessibility | Settings text scaling, reduced motion, contrast, keyboard/focus labels and native dialog focus behavior |
| Help & Support | Existing help/support/ticket routes, recovery/troubleshooting links and a sensitive-data-free bug-report checklist |
| About | Settings version, release summary, brand and existing legal/community links |

Model defaults are applied to supported native studio options only. Disabled/hidden options cannot be selected by a saved preference. Explicit studio launches and restored sessions take precedence. No automatic generation is performed by Settings. The export-format preference applies only to image tools that already consume it; it does not promise image generation format conversion or video transcoding.

UI preferences are device-local. Creator profile, visibility and community notification choices use the existing authenticated Cloudflare API and therefore follow the account. No new account preference database or cross-device UI-preference synchronization is claimed.

## Security and architecture

Email/password sign-in now transitions to a separate six-digit screen only after the isolated Supabase sign-in determines MFA is required. Assurance/factor lookup errors fail closed. Code pasting works through the single numeric field; repeated verification submissions are guarded. Canceled isolated sign-ins are revoked without replacing the active account. Authenticator QR content is removed synchronously on successful enrollment. Session storage and Remember Me choices are committed only after successful credential/MFA verification; the existing auth storage key is preserved.

The backend now rejects password-only access when Supabase reports a verified factor. Existing administrator role plus AAL2 enforcement remains in place. Other/all-session revocation verifies the current password and enrolled MFA, rate-limits requests, and invokes Supabase's server logout. Previously issued access JWTs remain valid until their normal expiry; this is stated in the interface. Individual-session revocation and inferred location/device inventories are not presented as implemented.

The existing Cloudflare worker is the creator-profile and R2 media gateway. Its ownership/privacy rules and upload validation were inspected; Settings uses those routes, not direct bucket credentials. Client-side avatar validation accepts PNG/JPEG/WebP under 2 MB, decodes/crops images and enforces a pixel bound. Existing server enforcement remains authoritative. No worker, bucket permission, credential or production content was changed.

All 60 public PostgreSQL tables had RLS enabled in a live read-only schema check. This is not a complete policy penetration test. Existing owner/financial/media/MFA tests were run. No schema migration or production data cleanup was needed. Existing credit reservations, request IDs, refund/release logic, plan prices and credit allocations were preserved.

Real checkout remains disabled. The production config returned `billing: false` and annual billing disabled after backend deployment. No payment credentials, checkout, subscriptions or provider sandbox were activated. Unauthenticated session-revocation requests return 401 and private/no-store.

## Verification

- Frontend unit suite: 23 passed, 0 failed.
- Backend suite: 68 passed, 0 failed, including financial concurrency/replay/refund and ownership fixtures, new wallet partial-failure tests, backend MFA checks and session-revocation tests.
- Static references, duplicate IDs and JavaScript syntax checks passed for the edited source.
- Browser preview: desktop workspace/search and actual 320px iframe navigation/custom model dropdown exercised; 320px document width equaled its viewport width. These are browser viewport checks, not physical Android/iPhone tests.
- CI covers Settings categories, search, accessibility persistence and overflow at 320, 360, 393, 768 and 1365px; synthetic authenticated export, MFA enrollment, session display and deletion eligibility; broader responsive/editor/billing/consent checks. Exact final run and deployment identifiers are supplied with the release.
- Browser screenshots are captured in the Settings audit artifacts. No real account deletion, password change, MFA enrollment, credit claim, payment or paid generation was used for verification.

Early CI failures exposed misplaced security feedback and a QR removal timing issue; both were fixed. A fixture that changed deletion eligibility was updated to reload before asserting the new server state. Checks are retained rather than skipped.

## Remaining scope and configuration

This release does **not** implement every optional feature in the original 26-section request. The following still require product/backend work or configuration; they are not decorative toggles:

- Granular notification channels/events, marketing email preferences, push delivery and a public multi-service status page.
- OAuth linking/unlinking and recovery-method management beyond the existing email/password/MFA/support paths.
- Individual-session revocation, reliable parsed device inventory and location information.
- Cross-device UI/AI preference synchronization; default homepage/workspace/time-zone/date formatting; automatic sidebar behavior; tool favorites and recommendation controls.
- Assistant custom instructions/memory, archive management, new bulk history deletion, generation quantity/resolution defaults and download conversion beyond existing tool support.
- Combined accurate storage usage, reference-file inventory, archive management and a new storage/download manager.
- Separately attributable daily/bonus/purchased credit balance buckets when the existing API exposes only the total ledger balance. The existing signup allowance and 12-hour reward were not changed to a new daily credit grant.
- New standalone release-notes/community-guidelines pages and additional support workflows beyond the existing destinations.
- Acceptance on physical Android/iOS, real two-account navigation, real recovery-email delivery and authenticated live uploads/MFA/session revocation/export. Synthetic tests do not establish these real-account outcomes.

No provider secrets or private environment settings appear in the interface. MediaGrab is outside this change.
