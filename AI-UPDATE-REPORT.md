# AI platform update report

## Delivered

The homepage has a prominent AI tool section. The dedicated AI dashboard lists all 15 requested tools, with search, seven category filters, credit/upgrade controls and truthful availability labels. The homepage sidebar separates AI-powered tools and free tool categories. Mobile starts with the sidebar closed. Pricing and account links appear in navigation.

Dedicated new pages expose Image Enhancer, Object Eraser, Generative Erase and Face Restoration. Enhancer uses the existing real 2x/4x upscale operation and discloses its dimension change. Object Eraser and Generative Erase use the existing Bria eraser adapter. Face Restoration explicitly remains unavailable pending a model adapter.

Generative Fill now has a mask and prompt workspace connected to the official black-forest-labs/flux-fill-pro adapter. Apply backend/supabase/add-generative-fill.sql if the initial schema was already installed. A fresh installation includes its configurable three-credit cost and spending estimate.

OCR now has an on-device English Tesseract workspace with import, preview, recognition progress, editable text and text download. Tesseract 5.1.1 and language data download on first use. Face Blur retains its existing browser face detection and manual controls.

AI workspaces now support desktop drop uploads, a reset action and an indeterminate processing indicator. They retain private results, compare controls, download handling and server-side credit settlement.

## Activation and unfinished work

Supabase listed no projects during this update. Live signup, email verification, login, recovery, credits and cloud processing therefore cannot be activated or tested. Supply a dedicated project and complete the backend PLATFORM-SETUP.md configuration. Never paste private keys into frontend files.

Replicate still needs a rotated server token and webhook secret. Lemon Squeezy still needs approved merchant credentials. Checkout remains unavailable while these are absent.

Generative Uncrop, Old Photo Restorer, Skin Retoucher, Face Restoration and Face Swap still need validated model adapters and specialized workspaces. Their cards disclose integration pending. No real processing is claimed for them.

The requested desktop three-panel and mobile bottom-toolbar redesign has not been completed for every AI page. The current shared responsive workspace remains in use. Live OCR model downloads and automatic face detection also need network-enabled browser acceptance testing.

## Testing

The backend ledger, media validation, RLS and API boundary tests pass. The preceding release passed 360px and 1280px checks for account dialogs, image import, compressor download and mask undo/redo. The new dashboard/filter checks are recorded in the completion response. Real provider requests, email delivery and billing remain unverified.

## Files

New frontend files in this update are platform/catalog.js, platform/dashboard.js, platform/ocr.js, ai-image-enhancer.html, ai-object-eraser.html, ai-generative-erase.html, ai-face-restoration.html and this report.

Updated frontend files are index.html, all-ai-tools.html, ai-media-tools.html, ai-generative-fill.html, image-to-text.html, loox-experience.js, platform/platform.css, platform/studio.js, platform/account.js, sitemap.xml and scripts/build-master-tools.mjs. Existing pages loading the revised account layer also have their navigation script version updated.

New backend file is supabase/add-generative-fill.sql. Updated backend files are lib/jobs.js, supabase/platform.sql and test/platform.test.js.
