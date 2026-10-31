# LOOX built-in visual assets

The LOOX Photo Studio and Video Studio can already import local image files from each visitor's device. These **temporary user uploads do not belong in GitHub**.

To make a permanent built-in gallery of original AI-created images, backgrounds, textures, icons or future custom stickers, add the approved image files to this repository:

- `assets/hero/` — homepage artwork
- `assets/tool-previews/` — tool demonstration banners
- `assets/icons/` — tool icons
- `assets/editor-backgrounds/` — optional editing backgrounds
- `assets/stickers/` — future LOOX custom stickers (currently not enabled)

Prefer optimized `.webp` or `.avif` for photographs and banners; use `.png` when transparency is essential. Use descriptive lowercase filenames (for example `assets/editor-backgrounds/neon-city.webp`). Keep file sizes reasonable so GitHub Pages and mobile users load quickly.

Once an image is committed, reference it using a relative URL such as `assets/editor-backgrounds/neon-city.webp` on LOOX pages. **Do not link directly to ChatGPT conversation attachments as permanent website images**; store approved exported image files in the project or an image CDN.

Before publishing, verify the file is not copied from an existing branded artwork or photo, inspect for mistaken logos, and check any applicable generator usage terms. AI-generated visuals cannot be guaranteed legally exclusive or immune to all copyright claims.

If a generated image will be offered for others to reuse, state its permitted terms explicitly. Avoid publishing an empty gallery or advertising asset packs that are not yet available.
