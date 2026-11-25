"""Rebuild launch indexing policy after reviewing public tool availability.
Edit PUBLIC or HOLD when a feature launches, then run this script from any directory.
"""
from pathlib import Path
import re,json,html
ROOT=Path(__file__).resolve().parents[1]
BASE='https://deadloxend-hash.github.io/looxtoolsfree/'
PUBLIC=set('''index.html ai-image-landing.html community.html trending.html templates.html about.html company.html help.html support.html contact.html privacy-policy.html terms.html cookie-policy.html license.html guides.html
photo-editor.html video-editor.html design-studio.html image-compressor.html cropimage.html imgformatconverter.html face-blur.html toolbox.html
youtube-thumbnail-maker.html image-resizer.html resize-1920x1080.html resize-1080x1080.html resize-512x512.html resize-youtube.html resize-instagram.html resize-website.html resize-facebook.html resize-linkedin.html resize-tiktok.html resize-twitter.html resize-pinterest.html
canvas-enlarger.html dpi-converter.html compress-20kb.html compress-50kb.html compress-100kb.html compress-200kb.html compress-500kb.html lossless-png-compressor.html batch-image-compressor.html circle-crop.html aspect-ratio-cropper.html perspective-crop.html shape-cropper.html passport-photo-maker.html png-to-jpg.html jpg-to-png.html jpg-to-webp.html webp-to-png.html webp-to-jpg.html heic-to-jpg.html heic-to-png.html avif-to-jpg.html avif-to-png.html svg-to-png.html bmp-tiff-converter.html pdf-to-jpg.html color-extractor.html image-blur.html image-pixelator.html selective-color.html color-grading.html cinematic-filters.html photo-collage.html screenshot-background.html vignette-focus.html sharpen-clarity.html add-text-to-image.html watermark-pattern.html whatsapp-dp.html photo-frame.html image-flip-rotate.html watermark.html
all-image-tools.html all-text-tools.html all-video-tools.html all-ai-tools.html image-resizing-tools.html image-compression-tools.html image-cropping-tools.html image-converter-tools.html photo-editing-tools.html watermark-branding-tools.html ai-media-tools.html video-animation-tools.html
fancy-fonts.html text-editor.html case-converter.html concat-text.html split-text.html strip-html.html remove-spaces.html remove-symbols.html remove-emojis.html unicode-normalizer.html bold-text.html italic-text.html cursive-text.html blackletter-text.html upside-down.html find-replace.html text-diff.html word-counter.html email-extractor.html url-extractor.html extract-columns.html base64-encoder.html url-encoder.html json-formatter.html random-numbers.html random-strings.html random-emails.html usernames.html strong-passwords.html pronounceable-passwords.html prompt-builder.html'''.split())
HOLD={}
result={'base':BASE,'indexable':[],'noindex':[],'held':HOLD}
for p in sorted(ROOT.rglob('*.html')):
 rel=p.relative_to(ROOT).as_posix()
 if rel.startswith(('assets/','vendor/','.openai/')):continue # HTML fragments are not pages.
 s=p.read_text()
 if '</head>' not in s:continue
 eligible=rel in PUBLIC or rel.startswith('learn/') and p.name in PUBLIC
 canonical=BASE+('' if rel=='index.html' else rel)
 s=re.sub(r'<link\b(?=[^>]*rel=["\']canonical["\'])[^>]*>','',s,flags=re.I)
 s=re.sub(r'<meta\b(?=[^>]*name=["\']robots["\'])[^>]*>','',s,flags=re.I)
 metadata='<link rel="canonical" href="'+canonical+'"><meta name="robots" content="'+('index,follow' if eligible else 'noindex,follow')+'">'
 title=re.search(r'<title>(.*?)</title>',s,re.I|re.S);desc=re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)',s,re.I)
 title=title[1] if title else 'LOOX AI';description=desc[1] if desc else ('Find help for LOOX AI accounts, image creation and creative tools. Contact support with a question or report an issue.' if rel=='support.html' else 'Creative tools and AI image creation from LOOX AI.')
 if not desc:metadata+='<meta name="description" content="'+html.escape(description,quote=True)+'">'
 for key,value in [('og:type','website'),('og:title',html.unescape(title)),('og:description',html.unescape(description)),('og:url',canonical),('og:image',BASE+'assets/tool-art/photo-editor.webp')]:
  if re.search(r'<meta[^>]*property=["\']'+key+r'["\']',s,re.I):
   if key=='og:url':s=re.sub(r'(<meta[^>]*property=["\']og:url["\'][^>]*content=)["\'][^"\']*["\']',lambda m:m[1]+'"'+canonical+'"',s,flags=re.I)
  else:metadata+='<meta property="'+key+'" content="'+html.escape(value,quote=True)+'">'
 s=s.replace('</head>',metadata+'</head>')
 p.write_text(s)
 result['indexable' if eligible else 'noindex'].append(canonical)
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('  <url><loc>'+html.escape(url)+'</loc></url>\n' for url in sorted(set(result['indexable'])))+'</urlset>\n')
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+BASE+'sitemap.xml\n')
(ROOT/'docs/launch-indexing.json').write_text(json.dumps(result,indent=2)+'\n')
print('Indexable:',len(result['indexable']),'Noindex:',len(result['noindex']))
