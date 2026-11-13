#!/usr/bin/env python3
"""Apply LOOX Obsidian Blue to styles without changing layout or media.

Recolors presentational CSS, inline HTML styles and browser theme colors. Does
not modify JavaScript, image/video media, or generated user content.
"""
from __future__ import annotations
import colorsys
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')
RGB = re.compile(r'\brgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*,\s*(?:0?\.\d+|1(?:\.0+)?))?\s*\)', re.I)
STYLE = re.compile(r'(<style\b[^>]*>)(.*?)(</style\s*>)', re.I | re.S)
STYLE_ATTR = re.compile(r'(\bstyle\s*=\s*)(["\'])(.*?)\2', re.I | re.S)
META = re.compile(r'<meta\b[^>]*\bname\s*=\s*(["\'])theme-color\1[^>]*>', re.I)
MARK = '/* LOOX Obsidian Blue'
CSS_ASSET = re.compile(r'(\b(?:href|data-href)\s*=\s*["\'])(?!https?://)([^"\']+?\.css)(?:\?v=[^"\']*)?(["\'])', re.I)
THEME_VERSION = 'obsidian-blue-1'


def recolor(hexcode: str) -> str:
    digits = hexcode[1:]
    if len(digits) in (3, 4):
        digits = ''.join(c * 2 for c in digits)
    if len(digits) not in (6, 8):
        return hexcode
    alpha = digits[6:]
    r, g, b = (int(digits[n:n+2], 16) for n in (0, 2, 4))
    if (r == g == b == 0) or (r == g == b == 255):
        return hexcode
    h, light, sat = colorsys.rgb_to_hls(r/255, g/255, b/255)
    hue = h * 360

    def dark() -> str:
        if light < .042: return '05080f'
        if light < .083: return '080d16'
        if light < .122: return '101a2b'
        if light < .177: return '142033'
        if light < .235: return '20314a'
        if light < .32: return '2a405c'
        return '364c68'

    color = None
    if 240 <= hue <= 357 and sat > .12:
        cyan = hue >= 305
        if light < .34: color = dark()
        elif sat < .35 and light < .65: color = '344b69' if light < .46 else '7d9bbd'
        elif light > .91: color = 'f1f5f9'
        elif light > .82: color = 'd7f2f7' if cyan else 'd9eaff'
        elif light > .68: color = '8fe6ee' if cyan else 'a6ccff'
        elif light > .52: color = '22d3ee' if cyan else '60a5fa'
        else: color = '22d3ee' if cyan else '3b82f6'
    elif light < .34 and sat < .47:
        color = dark()
    elif sat < .3 and .84 < light < .97:
        color = 'e5edf7'
    return '#' + color + alpha if color else hexcode


def css_colors(s: str) -> str:
    s = HEX.sub(lambda m: recolor(m.group()), s)
    def map_rgb(m: re.Match) -> str:
        values = [int(m.group(i)) for i in (1, 2, 3)]
        if any(x > 255 for x in values): return m.group()
        c = '#' + ''.join(f'{v:02x}' for v in values)
        mapped = recolor(c)
        if mapped == c: return m.group()
        channels = [int(mapped[j:j+2], 16) for j in (1, 3, 5)]
        typ = 'rgba' if m.group().lower().startswith('rgba') else 'rgb'
        return typ + '(' + ','.join(map(str, channels)) + (m.group(4) or (',1' if typ == 'rgba' else '')) + ')'
    return RGB.sub(map_rgb, s)


TOKENS = """
/* LOOX Obsidian Blue: sitewide semantic palette (colors only; no layout changes). */
:root{color-scheme:dark;--loox-obsidian-bg:#080d16;--loox-obsidian-card:#142033;--loox-obsidian-raised:#1b2b44;--loox-obsidian-border:#2b405e;--loox-obsidian-primary:#3b82f6;--loox-obsidian-cyan:#22d3ee;--loox-obsidian-text:#f1f5f9;--loox-obsidian-muted:#9bb3d1;--lx-bg:#080d16;--lx-card:#142033;--lx-border:#2b405e;--lx-text:#f1f5f9;--lx-muted:#9bb3d1;--lx-accent:#3b82f6;--lx-mint:#22d3ee}
html{background-color:#080d16}::selection{background:#2563eb88;color:#fff}
"""
HOME = """
/* LOOX Obsidian Blue: keep home artwork and geometry, unify dark surfaces. */
body.loox-tools-landing{--paper:#080d16;--white:#142033;--ink:#f1f5f9;--ink-soft:#bdd0e6;--muted:#9bb3d1;--line:#283d58;--line-strong:#395572;--purple:#3b82f6;--purple-dark:#2563eb;--pink:#22d3ee;--cyan:#22d3ee;--lt-purple:#60a5fa;--lt-pink:#22d3ee;--lt-muted:#9bb3d1;--lt-border:#2b405e;background:#080d16!important;color:#f1f5f9!important}
"""
NAV = """
/* LOOX Obsidian Blue: shared navigation without changing dimensions. */
#loox-sitewide-header{background:#080d16f5!important;border-bottom-color:#233750!important}
#loox-sitewide-header .loox-sitewide-links a[aria-current=page]{background:#132b4a!important;color:#eaf4ff!important}
#loox-sitewide-header .loox-sitewide-links a:focus-visible,#loox-sitewide-header button:focus-visible{outline-color:#22d3ee!important}
"""


def html_colors(s: str) -> str:
    s = STYLE.sub(lambda m: m.group(1) + css_colors(m.group(2)) + m.group(3), s)
    s = STYLE_ATTR.sub(lambda m: m.group(1) + m.group(2) + css_colors(m.group(3)) + m.group(2), s)
    s = META.sub(lambda m: re.sub(r'#[\da-fA-F]{6}\b', '#080d16', m.group()), s)
    s = CSS_ASSET.sub(lambda m: m.group(1) + m.group(2) + '?v=' + THEME_VERSION + m.group(3), s)
    return s


def main() -> None:
    edited = []
    for path in sorted(ROOT.rglob('*.css')):
        if any(p in {'.git', 'node_modules'} for p in path.parts): continue
        original = path.read_text(encoding='utf-8')
        result = css_colors(original)
        rel = path.relative_to(ROOT).as_posix()
        special = {'loox-experience.css':TOKENS,
                   'loox-tools-landing-2026.css':HOME,
                   'loox-sitewide-nav.css':NAV}.get(rel)
        if special and MARK not in result: result += special
        if result != original:
            path.write_text(result, encoding='utf-8')
            edited.append(rel)
    for path in sorted(ROOT.rglob('*.html')):
        if any(p in {'.git', 'node_modules'} for p in path.parts): continue
        original = path.read_text(encoding='utf-8')
        result = html_colors(original)
        if result != original:
            path.write_text(result, encoding='utf-8')
            edited.append(path.relative_to(ROOT).as_posix())
    print(f'Obsidian Blue: updated {len(edited)} files; {sum(p.endswith(".css") for p in edited)} CSS, {sum(p.endswith(".html") for p in edited)} HTML')
    assert len(edited) >= 35, 'Unusually few files updated; confirm repository root.'
    assert 'LOOX Obsidian Blue' in (ROOT/'loox-experience.css').read_text(encoding='utf-8')


if __name__ == '__main__': main()
