# Generation image display — 26 November 2026

The completed image preview previously inherited a full-width dark stage while desktop rules capped its image height to the viewport minus the composer and another 280–390px. This produced a small image inside a broad black frame.

A stylesheet loaded only by the AI Image workspace now gives its result list up to 1120px of available width, makes completed image stages shrink to their actual image size, removes the dark media/card framing, and uses a responsive maximum image height of 74dvh (72dvh on small phones, up to 960px on larger screens). Images retain their native aspect ratio and never stretch or crop. Result actions wrap below the image. The result feed remains scrollable so larger cards and their actions stay accessible.

Loading/error placeholders retain their previous layout. Video, Assistant, image files, generation APIs, credits and account/session behavior are unchanged.

Validation: Chrome browser fixture tests loaded the production stylesheet stack and checked four image shapes (square, portrait, landscape, tall portrait) at 320×568, 390×844, 768×1024, 1024×768, 1440×900 and 1920×1080. All 6 viewport checks passed: original proportions, no letterbox gap, transparent media stage, no horizontal overflow, wrapped actions, preserved loading placeholder, and substantially larger desktop images. JavaScript syntax checks and git whitespace checks passed. The fixture uses generated local SVG samples and does not access a private session or consume generation credits. Physical phones and other browser engines were not tested.

Files: ai-text-to-image.html; platform/generation-image-display.css; tests/generation-image-{display,fixture}.{html,js}; this report.
