# LOOX Video Studio 2 — implementation and verification

Date: 26 November 2026. Scope: LOOX Tools frontend only; no backend, account, billing or MediaGrab changes.

This is a substantial first release of the supplied multi-phase brief, not complete CapCut feature parity. Unsupported advanced features are listed below; they have not been represented by placeholder controls.

## Architecture audit and decisions

The existing editor is a native media-element + Canvas 2D compositor. Web Audio mixes clip audio and MediaRecorder records the canvas locally. Its timeline already supported tracks, trim handles, basic splitting, crop, text and constant playback speed. It was repainting continuously while idle; undo snapshots shared nested keyframes; color filters constructed an invalid `none brightness(...)` chain; media-element volume could remain at zero after Web Audio took over. There was no persistent project format or recovery.

Preserved that working architecture and extracted pure timeline/project math into `loox-video-core.js`. The same compositor evaluates transforms, masks, effects and color for preview and export. Added explicit capture-frame requests driven by an export timer: preview requestAnimationFrame throttling no longer determines the export clock. Export still uses real-time MediaRecorder, not a deterministic offline encoder.

Consulted CapCut's public workflow documentation for import/timeline/inspector, keyframe, mask and export workflows: https://www.capcut.com/resource/how-to-use-capcut . All implementation and SVG tool icons are original; no CapCut code, assets or paid API calls were introduced.

## Implemented in this release

- Compact project toolbar with rename, new, save, save copy, recent projects, project JSON download/open and source relinking.
- IndexedDB autosave includes source File blobs. Save revision tracking avoids clearing newer dirty state after an older write. Failure/quota errors remain visible; downloaded project JSON deliberately excludes media and needs the originals. Before-unload protection covers unsaved changes. Project switching pauses/disconnects the old audio graph and releases abandoned object URLs.
- Bounded project validation (version, ids, numeric limits, clip/key counts), string escaping and reconstruction from an allowlist. Imported project URLs/media objects are not trusted or restored. No selected media is uploaded.
- Deep undo copies of crop, volume and motion keyframes. Constant-speed changes retime keyframe times. Splitting keeps source time and inserts interpolated boundary values.
- Clip-local transform/color keyframes with add/remove, previous/next, key list, linear, ease-in, ease-out and smooth interpolation. Supported properties: x/y, scale, rotation, opacity, brightness, contrast, saturation and blur. Existing volume keyframes retained.
- Ellipse/diamond masks, rounded bounds, horizontal/vertical flips and normal/multiply/screen/overlay/lighten/darken blend modes.
- Original camera shake, zoom pulse, glow and pixelation controls; preview/export share the rendering path. Existing filters and entrance animations retained.
- Real adjacent-clip overlapping dissolve, with bounded duration and explicit movement of later clips on that track. Existing transition presets remain labeled as clip entrance animations.
- Freeze a decoded video frame into a real PNG overlay asset, reusable and saved with the project.
- Audio detachment into its own track, video muting, audio fade-in/out, gain, EQ/high-pass and retained gain keyframes. Reset source element gain when Web Audio controls it, fixing silence in clips that start later.
- Frame-snapped seek and clip movement; scheduled media sync during drag; timeline markers with seek/remove; close gaps on the selected track; selected-clip cut/copy/paste shortcuts. Existing track lock/hide/solo and trim/ripple retained.
- Search and reuse imported sources; library-to-compatible-track drag/drop; asynchronous 128×72 source thumbnails and genuine decoded audio peak waveforms. Audio decode is bounded to files of 24 MB or less; unsupported/large sources remain editable without a fabricated waveform. Caches regenerate after recovery.
- Preview fullscreen, quality selector, aspect presets, export-excluded safe guides, collapsible panels, desktop viewport fitting, larger touch handles and mobile monitor/timeline/tool ordering. Educational guide moved to `video-editor-guide.html`.
- Export filename, explicit supported container/codec, video bitrate, 480p–4K presets, capture targets 24/25/30/50/60, progress/cancel/download. MP4 is offered only if native H.264/AAC MediaRecorder support is reported; WebM VP8/VP9 + Opus offered when available. No WebM-to-MP4 renaming and no CDN FFmpeg fallback. Hidden-tab export cancels rather than silently continuing under background throttling. Missing media blocks export.

## Tests and measurements

- `node --test tests/video-core.test.cjs`: 7/7 tests pass (interpolation, immutability, split timing/key boundaries, hostile project data, limits, portrait dimensions).
- Syntax checks: studio engine, core, crop controls and browser regression script. `git diff --check` passes.
- Browser regression: 23/23 checks pass in Chrome, using generated 3-second and 2-second H.264/AAC source clips. Multi-import, sequential placement, source in/trim/split, 2× duration, detach/fades, transform keys, color/undo/redo, marker, real IndexedDB recovery including media, idle work, 390px overflow, genuine recording metadata, dissolve overlap, real freeze asset and effect serialization. Recorded WebM reimport also passed with finite duration after adding bounded duration discovery for recordings that omit duration metadata. No application exceptions recorded. Browser extension metadata errors were unrelated to app code.
- Settled idle preview: 0 canvas fillRect calls over a measured one-second interval. Background thumbnail/metadata work is allowed to finish before this measurement; this is not a claim of zero work during import.
- Desktop: measured body/document/viewport height all 936 px after fixing conflicting shared studio styles. The timeline stays inside the viewport. Preview quality custom dropdown was selected through the actual UI (720p → 540p; monitor reports 960×540).
- Responsive layout: 390px iframe has no page-level horizontal overflow; timeline is moved ahead of the tool rail on mobile. This checks responsive CSS, not real touch hardware or a mobile operating system.
- Independent `ffprobe` and full `ffmpeg -f null -` decode of an actual downloaded regression export: WebM, VP8, 854×480, Opus 48 kHz, video/audio start at 0.000 seconds, no decode errors. One measured capture delivered 132 frames through timestamp 4.973 seconds: **26.34 mean fps for a 30 fps capture target** on this cloud test environment. MediaRecorder output is variable-frame-rate; its nominal `r_frame_rate` can be misleading. Constant-frame-rate 30/60 fps is not guaranteed.
- Audio decoded to PCM and inspected with RMS/FFT: 440 Hz at 0.4 s; detached 440 Hz at 1.3 s with reduced gain; silence in the intended 2.4 s gap; 880 Hz at 3.5 s. This caught and verified the later-clip mute fix. It verifies these synthetic positions, not universal lip-sync or long-project drift.

Reproduce: run `bash scripts/generate-video-samples.sh`, serve the root, open `tests/video-studio-browser.html` and click Run workflow. A top-level fixture is generated as `tests/video-studio-fixture.html`. Sample media and generated fixture are ignored, not shipped. The browser harness uses real DOM imports and the real editor recording path; only automatic anchor downloads are intercepted to inspect the resulting blobs.

## Remaining scope and practical limits

| Requested area | Remaining work |
| --- | --- |
| Timeline | Multi-selection/group editing, track reorder, robust context menus, pinch zoom, continuous multi-frame filmstrips, larger-project virtualization |
| Motion/speed | Bezier graph editor, continuous speed ramps/presets, reverse video, deterministic frame interpolation/optical flow, direct transform resize handles |
| Color | HSL, LUT import, RGB curves, color wheels, advanced highlights/shadows/clarity and independently resettable controls |
| Effects/transitions | Layered effect stacks, motion blur/chroma processing, complete transition library and draggable transition objects |
| Text | Font-file import, rich typesetting, tracking, gradient text, typewriter/bounce animation library, direct text editing in preview |
| Audio | Voiceover, beat analysis, normalization, balance controls and audio-only export |
| Masks | Feather/invert, editable polygon/linear masks and chroma key/spill controls |
| Project UX | Project thumbnails, storage management/delete, missing-file review dialog, stronger relinking identity than matching name/size |
| Performance/export | Worker/proxy pipeline, WebGL/WebCodecs muxer, deterministic constant-frame-rate/offline encoding, custom dimensions, estimated file size, verified 4K/60fps/MP4 on multiple real devices |
| Validation | Physical phone gestures/keyboard, Safari/Firefox, large-memory projects, long audio-sync tests and quantitative CPU/memory comparison |
| AI | No AI services activated; captions/cutout/denoising/tracking need separate tested integrations |

Native decoding may reject codecs even if the file extension looks valid. Large media uses browser storage quota and memory. Browser-local saves are not a cloud backup. Waveforms are channel-1 peak summaries. Preview property keyframes require explicitly setting a key; changing a property alone does not auto-key. A split inserts numeric boundary values, but an easing curve split inside a segment is not an exact Bezier sub-curve reconstruction. Undo history is clip-based; project settings and track states are saved but are not a full project-level undo system. Real-time browser export remains device-load-dependent and should be reviewed before publishing.

## Changed files

`video-editor.html`, `loox-video-studio.js`, `loox-video-core.js`, `loox-video-workspace.css`, `video-editor-guide.html`, `tests/video-core.test.cjs`, `tests/video-studio-browser.html`, `tests/video-studio-browser.js`, `scripts/generate-video-samples.sh`, `.github/workflows/editor-check.yml`, `.gitignore`, this report.

Deployment and commit identity are recorded by the pull request and GitHub Pages workflow linked in the completion response.
