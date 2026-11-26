# LOOX Photo Studio upgrade — 26 November 2026

Implemented on `codex/photo-studio-upgrade`. This change is prepared for review; it does not deploy to GitHub Pages or modify MediaGrab, AI generation, authentication, billing or backend services.

## Functionality bugs fixed

- Rotating/flipping a composition now transforms overlay centers, orientation and drawing points correctly. Four rotations and two flips restore the original pixels in the regression fixture.
- Opening Text, Elements or Draw no longer silently selects a different layer. Photo adjustments and filters refuse non-photo selections rather than changing the main photo unexpectedly.
- Retouch paints the intended selected photo; coordinates account for photo rotation and flips. Painting outside a photo overlay does not smear its edge. Clearing the main blur mask also clears its retained transformation mask.
- Switching editing tabs clears the previous drawing/retouch interaction mode.
- Photo drag cancellation no longer commits the cancelled transformation.
- Pointer coordinates remain valid beyond canvas boundaries, permitting continued resizing beyond the image edge.
- Corner photo handles preserve aspect ratio; edge handles retain freeform sizing. Selection frames follow photo/text rotation.
- Text, shape and photo previews use the shared layer renderer, preserving layer order, styling and image effects rather than approximating them with unrelated CSS filters.
- Numeric adjustment controls apply their changes, each adjustment resets to its actual default, and continuous changes retain grouped undo entries.
- Filter confirmation/cancellation and undo preserve both the chosen preset and its intensity.
- Drawing duplication offsets stroke points rather than copying a position field that has no effect on strokes.
- Image imports ignore stale asynchronous decodes; photo overlays have file-size and decoded-pixel limits.
- Canvas fit responds to inspector, filter-sheet, shared navigation and visual-viewport changes. The editor fits below the site navigation instead of extending beyond the bottom of the screen.
- Mobile trays participate in the workspace layout and cannot cover the fitted photo. Narrow, short phones receive a smaller tray and hide the redundant filename header while editing.
- Mobile status messages and errors are visible in an accessible notice, rather than being lost with the desktop status bar.
- PNG export starts with quality disabled. Invalid export dimensions show an explanation and disable downloading. Filenames use the encoder's actual MIME type if a browser falls back to another format.

## Improved and added features

- Consolidated dark Obsidian interface with a restrained purple editing accent, consistent SVG navigation/action icons, focus states and reduced-motion support.
- Collapsible desktop inspector, horizontally scrolling mobile tool strip and a side-by-side tray in short landscape viewports.
- Separate Pan view, canvas zoom/pinch, Space-to-pan, modifier-wheel zoom, composition grid and center snapping/guides. Photo pinch transformation remains separate from canvas-view pinch.
- Hold-to-compare the original image; release restores the edited composition.
- Sharpen, vignette and grain in addition to the existing exposure/highlights/shadows/temperature/tint/vibrance controls.
- Adjustable filter intensity and previews that include manual detail adjustments.
- Custom crop aspect ratios, in addition to the existing preset ratios and pixel crop fields.
- Independent solid, gradient and transparent canvas backgrounds.
- Layer renaming, desktop drag-and-drop ordering, keyboard/touch-friendly order buttons, duplication, visibility/locking, opacity, blend modes, centering and content thumbnails.
- Multiline text metrics shared by preview/export; italic, underline, letter spacing, line height, text alignment, text background and rotation. Existing fonts, bold/regular, outlines, shadows and direct editing are retained.
- Brush opacity and existing adjustable drawing/blur brush sizes and blur eraser.
- PNG, JPEG and WebP encoding, custom filenames, custom output dimensions, actual encoded size previews and export preparation feedback.
- Optional IndexedDB recovery, off by default. Original pixels, masks, layer settings and source photo are retained locally. Recovery and saved-project clearing controls are provided. Unsaved edits trigger replacement/refresh warnings.
- Ctrl/Cmd+Z, redo shortcuts, Ctrl/Cmd+S for export, Delete/Backspace for an unlocked selected layer and 0 to fit the view.

## Performance and privacy

Processed main-photo pixels are cached by source, mask revision, adjustment settings and filter intensity. Object-only updates reuse these pixels. Slider previews process a small main-photo image, then return to full quality on release. Pointer previews use requestAnimationFrame. History shares immutable photo sources, copies editable masks and prunes retained states by estimated backing-canvas memory (128 MiB target, up to 30 entries; one large undo entry may exceed the target). No speed or memory benchmark on physical phones was performed.

Image processing remains local to the browser. This change adds no remote image upload, paid API, required account, framework or external model dependency. Optional recovery uses this browser's IndexedDB and can fail if storage is unavailable or full; export remains available.

## Validation actually completed

- `node --test tests/photo-studio-core.test.cjs`: **5/5 passed**.
- `node --check` for the editor, geometry module and browser-test script: passed.
- `git diff --check`: passed.
- Chrome browser regression suite: **35/35 passed** on the final build.
- Browser tests operate the real editor in a same-origin iframe using a generated disposable image and DOM controls. Pointer tests use simulated PointerEvents, with pointer capture stubbed only inside the test fixture.
- Tested import resolution/transparency, drag cancellation, proportional resize, drawing and blur undo, isolated photo-overlay adjustments, adjustment reset/undo/redo, filter intensity/cancel/undo, multiline text controls, layer selection/rename/duplication/opacity/blend/locking/visibility, four rotations, two flips, photo crop, canvas crop, resize, gradient/transparency, tool-mode isolation, pixel comparison of PNG export against the preview, JPEG/WebP MIME types, custom output validation and full local project recovery after iframe reload.
- Responsive geometry checks verified page width, fitted canvas visibility, inspector bounds, tray separation and export-button accessibility at these actual iframe viewports:

| Width | Height |
| --- | --- |
| 320 | 568 |
| 360 | 740 |
| 375 | 812 |
| 390 | 844 |
| 414 | 896 |
| 768 | 1024 |
| 1024 | 768 |
| 1280 | 800 |
| 1440 | 900 |
| 1920 | 1080 |
| 2560 | 1440 |
| 667 | 375 |

Visual screenshots were inspected on desktop and at 390px and 320px phone widths. Native toolbar activation was checked on desktop; mobile keyboard activation was also checked.

To reproduce the browser suite, serve the repository over HTTP and open `tests/photo-studio-browser.html`, then choose **Run complete suite**. These tests do not need paid providers or account sign-in. Recovery testing writes and clears a disposable draft on the test origin, so use a dedicated local origin, not an origin containing a personal saved Photo Studio project.

## Remaining limits and unverified behavior

- Firefox, Edge, Safari, Android Chrome and iOS Safari were not available for execution. Resized Chrome iframes do not constitute physical-device, mobile-keyboard, touch-hardware, browser-engine or device-pixel-ratio certification.
- The separate native file-picker automation attempt timed out. Browser fixture import and image decoding passed; an actual OS picker-to-download workflow was not verified. The export tests validate encoded Blob contents, dimensions and MIME types, rather than an OS Downloads folder.
- Native multi-touch pinch, pointer-capture behavior, drag-and-drop layer ordering and native eyedropper permission/UI need hands-on checks. Their code is implemented; simulated single-pointer transformations and order buttons were tested.
- Automatic background removal, a general drawing eraser, additional brush engines, clarity and a separate watermark wizard were not added. Text layers can serve as watermarks using opacity. These optional expansions were deferred to keep the editor static, local and dependency-free.
- Layer thumbnails render content but do not preview blend modes against other layers. Native installed fonts and browser Canvas 2D implementations determine font availability/rasterization.
- Existing input limits remain: 80 MiB source files, up to 24 megapixels, 8000px output edges and 10 overlays per layer kind. Full-resolution effects on large images can still be expensive on low-memory devices.

## Files changed

| File | Purpose |
| --- | --- |
| `photo-editor.html` | View controls, filter intensity, recovery notice, accessible mobile status, export fields and core-module loading |
| `loox-photo-editor.css` | Consolidated responsive layout, controls, overlays, mobile/landscape trays and visual polish |
| `loox-photo-editor.js` | Rendering, editing/history fixes, improved tools, export validation and local recovery |
| `loox-photo-core.js` | Shared pure geometry, snapping, inverse hit testing and output-size validation |
| `tests/photo-studio-core.test.cjs` | Geometry and dimension regression tests |
| `tests/photo-studio-browser.html` | Local browser-test runner and viewport chooser |
| `tests/photo-studio-browser.js` | Real-editor workflow and responsive regression suite |
| `docs/photo-studio-upgrade-2026-11-26.md` | Implementation, verification and limitations report |
