#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p tests/video-samples
ffmpeg -hide_banner -loglevel error -f lavfi -i testsrc2=size=320x180:rate=30 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 3 -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -movflags +faststart -y tests/video-samples/one.mp4
ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=blue:size=320x180:rate=30 -f lavfi -i sine=frequency=880:sample_rate=48000 -t 2 -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -movflags +faststart -y tests/video-samples/two.mp4

python3 - <<'PYTHON'
from pathlib import Path
html=Path('video-editor.html').read_text().replace('<head>','<head><base href="../">',1)
html=html.replace('</body>','<div style="position:fixed;top:66px;right:10px;z-index:9999;background:#101b2c;color:white;max-width:400px"><button id="run">Run workflow</button><button id="mobile">Mobile fixture only</button><pre id="results" style="max-height:70px;overflow:auto">Ready</pre><div id="downloads"></div></div><script src="tests/video-studio-browser.js"></script></body>')
Path('tests/video-studio-fixture.html').write_text(html)
PYTHON
