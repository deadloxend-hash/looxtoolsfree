#!/usr/bin/env python3
"""Install a common LOOX navigation on root-level site pages.
Preserves each page's existing HTML, scripts, editors and SEO metadata.
SEO guide articles under learn/* are included; assets/guides fragments are not modified.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
excluded = {"index.html", "ai-home.html", "ai-chat.html"}
css = '<link rel="stylesheet" href="loox-sitewide-nav.css?v=1">'
js = '<script defer src="loox-sitewide-nav.js?v=1"></script>'
modified = []
skipped = []
pages = list(root.glob("*.html")) + list(root.glob("learn/*/*.html"))
for path in sorted(pages):
    if path.parent == root and path.name in excluded:
        continue
    source = path.read_text(encoding="utf-8")
    result = source
    if "loox-sitewide-nav.css" not in result:
        if "</head>" in result:
            result = result.replace("</head>", css + "</head>", 1)
        else:
            skipped.append((path.name, "No closing head"))
            continue
    if "loox-sitewide-nav.js" not in result:
        if "</body>" in result:
            result = result.replace("</body>", js + "</body>", 1)
        else:
            skipped.append((path.name, "No closing body"))
            continue
    # Cache-bust the finished responsive navigation across every page.
    for version in (1, 2, 3):
        result = result.replace(f"loox-sitewide-nav.css?v={version}", "loox-sitewide-nav.css?v=4")
    for version in (1, 2):
        result = result.replace(f"loox-sitewide-nav.js?v={version}", "loox-sitewide-nav.js?v=3")
    if result != source:
        path.write_text(result, encoding="utf-8")
        modified.append(path.name)
print(f"Updated {len(modified)} pages; skipped {len(skipped)} pages")
if skipped:
    print("Skipped:", skipped)
if not modified and not skipped:
    print("All root pages already include the navigation")
