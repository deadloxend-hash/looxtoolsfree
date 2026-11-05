#!/usr/bin/env python3
"""Apply one consistent LOOX navigation revision to every standalone site page.

Only page shell references are updated. Tool markup, editor logic, SEO and assets
are preserved. Full guide pages in learn/*/*.html use root-relative depth.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "25"
HOME_PAGES = {"index.html", "ai-home.html", "ai-chat.html"}
ASSETS = (
    ("loox-sitewide-nav.css", "href", "head",
     lambda url: f'<link rel="stylesheet" href="{url}">'),
    ("loox-sitewide-nav.js", "src", "body",
     lambda url: f'<script defer src="{url}"></script>'),
)
changed = []
skipped = []
pages = sorted(ROOT.glob("*.html")) + sorted(ROOT.glob("learn/*/*.html"))

for page in pages:
    if page.parent == ROOT and page.name in HOME_PAGES:
        continue
    content = page.read_text(encoding="utf-8")
    result = content
    prefix = "../" * (len(page.relative_to(ROOT).parts) - 1)
    for filename, attr, section, markup in ASSETS:
        new_url = f"{prefix}{filename}?v={VERSION}"
        pattern = re.compile(
            rf'(?P<before>\b{attr}\s*=\s*["\'])(?:[^"\']*/)?{re.escape(filename)}(?:\?[^"\']*)?(?P<after>["\'])',
            re.IGNORECASE,
        )
        result, count = pattern.subn(
            lambda m: m.group("before") + new_url + m.group("after"), result
        )
        if not count:
            closing = re.compile(rf"</{section}\s*>", re.IGNORECASE)
            if not closing.search(result):
                skipped.append((page.relative_to(ROOT).as_posix(), section))
                break
            result = closing.sub(markup(new_url) + rf"</{section}>", result, count=1)
    else:
        if result != content:
            page.write_text(result, encoding="utf-8")
            changed.append(page.relative_to(ROOT).as_posix())

print(f"Updated {len(changed)} navigation pages; skipped {len(skipped)}")
if skipped:
    print("Missing closing tags:", skipped)
