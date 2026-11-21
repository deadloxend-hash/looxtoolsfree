# LOOX AI security and privacy audit — 21 November 2026

This is a scoped engineering audit, not a penetration-test certification or legal opinion. Payment activation and destructive migrations were excluded. No production users, generations, credits, posts, or tables were deleted. Database test writes were rolled back.

## Findings and disposition

| Finding | Severity | Status | Evidence and action |
|---|---|---|---|
| Shared account module loaded with mixed version URLs | High (reliability/isolation risk) | Improved but Not Fully Tested | Canonical module URL and transitive cache versions prevent independent account state instances within a page. Real two-account browser acceptance remains outstanding. |
| Assistant in-memory transcript survives identity changes | High (shared-device privacy) | Improved but Not Fully Tested | Clear transcript/history/input on identity change; discard responses belonging to a previous user. Successful identity changes reload workspaces and remove unscoped launch/draft data. |
| Failed switch changes Remember me before credential verification | Medium | Improved but Not Fully Tested | Validate through a nonpersistent isolated auth client; install session and persistence only after success, including TOTP challenge for enrolled accounts. Failed/successful/MFA flows pass mocked regression tests. |
| Ordinary Sign out implicitly revokes all devices | Medium | Improved but Not Fully Tested | Use explicit local scope. Separate password-confirmed action revokes other sessions. Already issued access tokens can remain usable until expiry. |
| Profile menu vulnerable to ancestor clipping/stacking | Medium (UI) | Improved but Not Fully Tested | Supported browsers use native popover top layer, viewport-clamped position and bounded internal scrolling. Desktop guest popup checked visually; mobile and authenticated popup acceptance outstanding. |
| Privacy/cookie descriptions do not describe actual mixed storage | Medium | Improved | Disclose Supabase records and legacy media, Cloudflare D1 creator/social data, R2 newer media, configured processing services, browser sessions and drafts. No universal compliance or retention promises. |
| Cookie Settings has only a local preference reset | Low | Improved | Add Essential, Analytics, Functional and Marketing choices; Accept All, Reject Optional, custom save, versioned 180-day preference lifetime, same-origin persistence and cross-tab notifications. |
| Legacy storage administrator policies and review RPC lack explicit AAL2 checks | High | Needs Attention — prepared for approval | Live storage INSERT/DELETE policies check admin metadata but not MFA; legacy loox_private.loox_review_creation also lacks an MFA check. The draft SQL below adds AAL2. Isolated database tests deny AAL1 upload/delete/review and allow AAL2. Not applied because this can interrupt legacy admin workflows. |
| Leaked-password protection disabled | Medium | Needs Attention | Live Supabase advisor warning. Enable after checking plan support and auth configuration; no credential/plan setting changed. |
| Account deletion does not demonstrate complete Cloudflare/R2 cleanup | High (privacy obligation) | Needs Attention | Existing backend deletes auth/legacy results and reference assets but does not orchestrate all D1 social/profile data and R2 generations. Settings and policy no longer promise complete cleanup. Destructive cleanup requires separately reviewed design below. |
| Full personal-data export unavailable | Medium | Needs Attention | Offer verified support request, not a fake download of partial data. No invented export completion. |
| Payment/security alert email delivery unconfigured | High before payments | Needs Attention | Source requires SECURITY_ALERT_EMAIL, SECURITY_ALERT_FROM and RESEND_API_KEY; these names are absent from inspected Vercel settings. No emails sent and no secrets exposed. |
| Several Vercel secrets use readable encrypted rather than sensitive storage | Medium | Needs Attention | Worker, migration and one legacy provider credential flagged readable-secret by Vercel metadata. No values retrieved or rotated. Review sensitive-variable conversion and remove obsolete credentials with a tested rollback plan. |
| JSON request bounds not enforced by shared helper | Medium (defense in depth) | Improved | Enforce 4.5 MB bounds on declared size, encoded string bytes and parsed object bytes, matching the hosting request ceiling. Add regression tests. |

## Verified Secure — within tested scope

- All 59 live public tables have RLS enabled. This does not prove every policy safe.
- Owner SELECT policies reviewed for wallets, credits, jobs, private profiles, payments, subscriptions, chat threads, media sessions/entries and user assets. Financial tables expose owner SELECT, not client financial writes.
- A synthetic foreign authenticated identity returned zero rows for the nine tested private table groups. An existing owner could read their wallet. Attempted authenticated wallet and subscription updates were blocked (transaction rolled back).
- Thirty-two tables with RLS and no policies are default-deny for ordinary clients. Do not add broad client policies to silence these informational notices.
- Admin category/style policies use server-controlled app_metadata and AAL2. Client-executable security-definer functions were enumerated; inspected ownership helpers check auth.uid(), and privileged financial functions were not among the client-executable definer functions. The legacy review RPC MFA gap is separately flagged. Full policy and function fuzzing was not performed.
- R2 bucket managed public domain is disabled and there are no bucket custom public domains. Cloudflare profile worker binds D1 and the R2 bucket. Public posts are served through authorization/visibility checks, not unrestricted bucket access.
- Supabase results and avatars buckets are private; template bucket is intentionally public. RLS does not protect an intentionally public bucket's downloads.
- Source uses server-side storage credentials, user-prefixed R2 paths, file size/type checks, image decoding, MP4 signature checks, owned-record lookups and short-lived GET signatures. MP4 magic validation is not a full video-decoder security assessment.
- Shared API wrapper verifies bearer tokens with Supabase Auth and issuer/subject/audience/expiry checks, exact CORS origins, no wildcard credentials, no-store responses and redacted errors. Added HSTS for API responses. GitHub Pages cannot apply arbitrary response headers; existing page CSP was preserved rather than tightened without full authenticated tests.
- No configured analytics/marketing tracker signatures were found in frontend source. No automatic banner is shown for essential-only operation. This is a source audit and sampled browser check, not a network capture of every third-party library.
- Secret-pattern scans found zero matches across tracked frontend/backend text and historical blobs. Pattern scans cannot prove absence of every possible secret format.
- Production dependency npm audit found zero reported vulnerabilities at audit time; frontend vendored dependencies are outside npm audit coverage.
- Live checkout/top-up flags were false; provider/webhook credential names were absent. Payments remain disabled.

## Cookie and privacy behavior

All static HTML pages load the shared privacy controller. It exposes privacy choices without forcing a banner where no optional integration is configured. Optional integration inventory is empty and permits() remains false for those categories even if a user preselects consent. Any future tracker must be explicitly registered, loaded only after permission, stopped when permission is withdrawn, and accompanied by a consent version update. This code does not automatically intercept arbitrary future scripts or control cookies on unrelated domains.

Browser preferences are not encrypted credentials or a server-side consent ledger. Consent and UI preferences contain no session tokens. Essential auth tokens remain SDK-managed. Requested workspace preferences/drafts are documented separately from optional third-party functional integrations. No advertising or analytics integration was added.

## Account protection and feature limits

Settings displays actual email verification and verified TOTP factor status. Password reset uses Supabase recovery. A current-browser description is shown without inventing a device inventory. Other-session revocation requires password verification through an isolated client. It does not promise instantaneous access-token invalidation. No fake login history or security events are displayed.

TOTP sign-in challenges are supported for already enrolled factors; new MFA enrollment/recovery management and a complete session/device inventory are not shipped in this change. Full export and cross-service deletion need additional implementation. Support requests are the available route and must verify identity before releasing data.

## Payment readiness

Not ready for real payment activation. Source review and existing tests cover raw-body HMAC signature verification, timing-safe signature comparison, event claims/idempotency, verified payment allocation, refund/debt handling, server-side reservations, provider budget controls and failure alert templates. Tests use mocks and an isolated SQL engine. No live or provider-sandbox purchase/refund/cancellation was executed. No checkout, subscription, provider spend or payment flags were enabled. Alert delivery, provider reconciliation and commercial/legal terms require acceptance before activation.

## Testing

| Check | Result | Limit |
|---|---|---|
| Frontend Node suite | 16 passed, 0 failed | Includes failed/successful/MFA switch fixtures, avatar ownership/stale response, sessions and community tests |
| Backend Node suite | 52 passed, 0 failed | Includes SQL isolation/financial tests, provider routing and two new request-security tests |
| Live Supabase cross-account tests | Passed | Role impersonation in rolled-back transaction, not two real user browser sessions |
| Live owner balance/subscription write checks | Passed | Rolled back; no policy mutation |
| Account/wallet preservation snapshot | Unchanged | Aggregate snapshot only, concurrent use can change future values |
| Consent UI | Passed at all five automated sizes plus live desktop | Accept All, Reject Optional, custom choice, reload persistence, cross-page persistence, Essential disabled, dialog bounds |
| Settings and profile popup | Guest desktop smoke passed | Authenticated settings/actions need real-user acceptance |
| AI Image / Video / Assistant / Community / Templates | Guest loading smoke passed | No paid generations, uploads, posts or real user credential submissions performed |
| Mobile / tablet layouts | Automated guest checks passed | 110 page/viewport checks at 360, 393, 873, 768 and 1365 widths; physical devices and authenticated actions still need acceptance |
| Dependency audit | 0 reported production vulnerabilities | Audit-time registry result; vendored browser libraries not covered |
| Tracked and history secret scans | 0 pattern findings | Pattern-based only |
| Whitespace/syntax checks | Passed | Changed modules parsed; no restrictive CSP change |

During testing an initial new test-fixture syntax error and microtask scheduling assumption were corrected; final suites pass. Initial preview configuration was adjusted to a contained static directory; preview runs separately from production. No infrastructure outage was observed.

## Prepared design for deletion/export — approval before destructive rollout

1. Inventory all owned D1 tables and R2 keys, including generations, references, thumbnails, avatars, published posts and conversation attachments; distinguish shared public references from deletable private objects.
2. Add resumable, idempotent export/cleanup jobs with explicit ownership checks, rate limits, password and enrolled-MFA verification. Exports need pagination, short-lived authenticated download and expiry.
3. Produce a dry-run manifest and verify counts against disposable test accounts. Preserve legally required financial/audit data with documented retention and de-identification.
4. Export first; delete by exact owned keys only. Verify no remaining owned private objects, then remove authentication identity last. Handle retries and record redacted status.
5. Request owner approval for the concrete destructive production workflow before enabling it. No cleanup job, new table or destructive migration was executed in this audit.

## Remaining acceptance work

Real two-account browser navigation/switching, authenticated media uploads and generations, physical Android/iOS and authenticated mobile layouts, actual password recovery delivery, new MFA enrollment/recovery, full session inventory, complete personal-data export, complete deletion, login-abuse/CAPTCHA and auth-log alert thresholds, email alert delivery, exhaustive CSP/XSS review, provider sandbox billing, retention schedule and jurisdiction-specific legal review.

Prepared database change: [admin-mfa-hardening.sql](../database/review/admin-mfa-hardening.sql). It changes two legacy storage policies and the legacy review RPC only; it has not been applied. Per the requested access-interruption rule, owner approval is required before applying it.

See security-privacy-changed-files-2026-11-21.json for the exact frontend file list. Core implementation files: platform/account.js, platform/account-pages.js, platform/chat.js, platform/privacy.js, platform/privacy.css, platform/account-pages.css, settings.html, cookie-settings.html, cookie-policy.html, privacy-policy.html, terms.html, tests/account-switch-security.test.mjs. Other frontend edits load shared privacy controls and synchronize script cache versions. Backend modifications: lib/core.js and test/request-security.test.js.

Deployment and commit references are supplied in the completion message, since this report is committed with the release it describes.

## Deployment evidence and additional acceptance checks

- Main implementation: frontend commit `246909c6eda70a609ded3a156829d0275326d652`; backend commit `0ae6568144662c7b0a2c9ab266da74b6e745ff47`.
- GitHub Pages deployment succeeded; the production Cookie Settings dialog was opened and verified in the browser. No optional tracker or forced banner was added.
- Vercel production deployment `dpl_BZxAttBADeHK9qzB5uytuejiJkuU` reached READY and received the production alias. Live config returned auth enabled, R2 configured and billing false. Unauthenticated account API returned 401; both responses included the new HSTS header.
- The post-deployment account/wallet aggregate snapshot matched the pre-change baseline.
- Creator-profile responsive workflow and All Tools landing workflow passed.
- Initial broader UI audit: 108/110 viewport checks passed; the two flags involved deliberately swipeable video-editor tools. The audit now recognizes that rail using the same overflow test used for other intended editor rails. No failure was suppressed for a non-scrollable or misaligned control.
- Initial desktop test failed because it expected an obsolete dropdown ID. The corrected test follows aria-controls; the full desktop job subsequently passed.
- Follow-up QA commits: `fd12cbe78d0583c4d9c928aab5b0813810c24e6c` and `5ed1fddc75ae1e812722333be444ae8f3ebf2897`. The latter adds a five-size privacy browser test and includes privacy changes in workflow triggers.
- The corrected responsive check passed all 110 viewport checks. Consent-specific checks passed at all five screen sizes. The billing audit then exposed the same obsolete dropdown ID; it has also been corrected to follow aria-controls. Final billing workflow result is in the completion message.

These automated UI fixtures do not replace real authenticated two-account, recovery-delivery, paid-generation, or physical-device acceptance. No production password, MFA factor, checkout, database policy or data-retention setting was changed.
