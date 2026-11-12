#!/usr/bin/env python3
"""One-time cache refresh for the shared LOOX header logo stylesheet.

Only rewrites the version in existing loox-sitewide-nav.css links.
Does not change page content, navigation structure, or JavaScript.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = "105"
PATTERN = re.compile(r'(loox-sitewide-nav\.css\?v=)\d+')
changed = []
for page in sorted(ROOT.rglob("*.html")):
    if any(part in {".git", "node_modules", ".github", "dist", "build"} for part in page.relative_to(ROOT).parts):
        continue
    original = page.read_text(encoding="utf-8")
    updated, n = PATTERN.subn(lambda m: m.group(1) + VERSION, original)
    if n and updated != original:
        page.write_text(updated, encoding="utf-8")
        changed.append(str(page.relative_to(ROOT)))
print(f"Updated {len(changed)} HTML pages to shared LOOX logo stylesheet v{VERSION}.")
for path in changed:
    print("REFRESHED", path)
