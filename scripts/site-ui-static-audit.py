#!/usr/bin/env python3
"""Read-only audit of LOOX static page references and document structure."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(ROOT.glob("*.html")) + sorted(ROOT.glob("learn/*/*.html"))
ATTRIBUTES = {"src", "href", "poster", "data-src"}

class Inspect(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.references = []
        self.viewport = False
        self.basehref = None
        self.bad_buttons = []
        self.links_without_names = []

    def handle_starttag(self, tag, attrs):
        pairs = dict(attrs)
        if pairs.get("id"):
            self.ids.append(pairs["id"])
        if tag == "meta" and (pairs.get("name") or "").lower() == "viewport":
            self.viewport = True
        if tag == 'base' and pairs.get('href'):
            self.basehref = pairs['href']
        for key, value in attrs:
            if key in ATTRIBUTES and value and not (tag == 'base' and key == 'href'):
                self.references.append(value)
        if tag == "a" and pairs.get("href") in ("#", "") and not pairs.get("role"):
            self.bad_buttons.append(pairs.get("id") or pairs.get("class") or "(unnamed)")
        if tag == "button" and pairs.get("type") == "submit" and pairs.get("disabled") is not None:
            self.bad_buttons.append("disabled submit: " + str(pairs.get("id", "(unnamed)")))

def target_path(page, raw, basehref=None):
    if not raw or raw.startswith(("#", "//", "{")):
        return None
    split = urlsplit(raw.strip())
    if split.scheme or split.netloc or not split.path:
        return None
    path = unquote(split.path)
    if path.startswith("/looxtoolsfree/"):
        resolved = ROOT / path[len("/looxtoolsfree/"):]
    elif path.startswith("/"):
        return None
    else:
        # Resolve relative URLs against <base href>, if the document has one.
        base = page.parent
        if basehref and not urlsplit(basehref).scheme and not basehref.startswith('/'):
            base = (base / unquote(urlsplit(basehref).path)).resolve()
        resolved = base / path
    try:
        clean = resolved.resolve().relative_to(ROOT.resolve())
    except ValueError:
        return None
    return ROOT / clean

problems = []
totals = Counter()
for page in PAGES:
    totals["pages"] += 1
    source = page.read_text(encoding="utf-8")
    parser = Inspect()
    try:
        parser.feed(source)
    except Exception as exc:
        problems.append({"page": str(page.relative_to(ROOT)), "type": "html_parse", "detail": str(exc)})
        continue
    counts = Counter(parser.ids)
    for key, value in counts.items():
        if value > 1:
            problems.append({"page": str(page.relative_to(ROOT)), "type": "duplicate_id", "detail": key})
    if not parser.viewport:
        problems.append({"page": str(page.relative_to(ROOT)), "type": "missing_viewport", "detail": "meta viewport"})
    for raw in parser.references:
        path = target_path(page, raw, parser.basehref)
        if path is None:
            continue
        if path.is_dir():
            path = path / "index.html"
        if not path.exists():
            problems.append({"page": str(page.relative_to(ROOT)), "type": "missing_reference", "detail": raw})
    totals["refs"] += len(parser.references)
    totals["unbound_anchors"] += len(parser.bad_buttons)
totals["problems"] = len(problems)
by_type = dict(Counter(issue["type"] for issue in problems))
result = {"totals": dict(totals), "by_type": by_type, "problems": problems}
(ROOT / "site-audit-results.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print("STATIC AUDIT SUMMARY", json.dumps({"totals": dict(totals), "by_type": by_type}))
for item in problems[:120]:
    print("ISSUE", json.dumps(item))
if len(problems) > 120:
    print("... and", len(problems) - 120, "additional issues. See JSON artifact.")
