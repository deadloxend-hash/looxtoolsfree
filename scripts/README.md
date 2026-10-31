# LOOX content and asset pipeline

The website remains buildless HTML, CSS and JavaScript for GitHub Pages.
All published guides and images are committed; a build step is not required
to use the website.

## Editorial sources

- `content/editorial.mjs`: original article copy, localized tool names and workflows.
- `content/interface.mjs`: English, Spanish, French and German interface labels.
- `content/tool-reference.json`: tool-specific instructions, features and processing notes.
- `content/generated-assets.json`: artwork provenance, prompts and repository asset paths.

To regenerate the static content, use Node.js with the `sharp` package available:

```sh
node scripts/build-experience.mjs
```

The script creates tool icons, illustrative step diagrams, readable HTML guides,
language-specific learning pages, the asset catalog and sitemap entries.
Re-running it retains the editor implementation and avoids duplicate guide sections.
The generated artwork uses the built-in image-generation tool; it is not derived
from the competitor screenshots supplied as layout references.

## Publishing assets

- `assets/icons/<tool>.svg`: custom vector identity.
- `assets/tool-art/<tool>.webp`: optimized original generated artwork.
- `assets/guides/steps/<tool>-<number>.svg`: numbered conceptual workflow visuals.
- `assets/guides/<language>/<tool>.html`: language-switchable guide fragments.
- `learn/<language>/<tool>.html`: standalone, indexable educational articles.

Illustrations demonstrate a concept, not a measured output or an app screenshot.
Only publish images and other source media you have permission to use. These
assets cannot guarantee search indexing, ad approval or legal exclusivity.
