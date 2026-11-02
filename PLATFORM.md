# LOOX Tools accounts and AI

The existing homepage now loads platform/account.js for account controls. AI tool pages use platform/studio.js. The free local tool implementations are independent of account and credit APIs.

New pages are account.html and ai-text-to-image.html. The background remover, upscaler and object remover retain their existing URLs. Desktop and mobile information pages also expose the account controls.

The backend repository contains supabase/platform.sql, .env.example, automated tests and PLATFORM-SETUP.md. Account and checkout actions report pending setup until the backend services are configured. Never add private keys to this frontend.

The custom UI uses a locally vendored, version-pinned Supabase SDK, licensed in vendor/supabase-LICENSE.txt. Session tokens are handled by the SDK. Passwords are submitted to Supabase Auth and are not saved to browser storage.

The new account and AI pages have a CSP. If the Supabase project uses a custom domain, extend connect-src and img-src to that exact domain. If hosting moves, update the canonical URLs, API origin allowlist and Auth redirect URLs.

The Lifetime proposal grants 50 AI credits once. Change the backend plan configuration to adjust the allowance and synchronize checkout variants with the displayed prices.

Production SMTP, provider processing and payment event delivery require acceptance testing after infrastructure activation. The account display updates after operations and on tab focus. Private result links expire after five minutes.
