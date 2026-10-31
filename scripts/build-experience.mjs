/* Build readable static guides, localized pages and original LOOX assets.
   Run from the repository root: node scripts/build-experience.mjs
   This is a content build, not a browser or app test. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {topics,copy,locales} from '../content/editorial.mjs';
import {phrases} from '../content/interface.mjs';
import {extraTopics} from '../content/text-tool-topics.mjs';
import {imageTopics,imageReferences,imageTools,existingGroups} from '../content/image-tool-definitions.mjs';
import {textTools} from '../content/text-tool-definitions.mjs';
import {operationGlyphs} from '../content/image-tool-icons.mjs';
Object.assign(topics,extraTopics,imageTopics);
const require=createRequire(import.meta.url),sharp=require('sharp');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s)};
const root='https://deadloxend-hash.github.io/looxtoolsfree/';
let reference;
if(fs.existsSync('content/tool-reference.json'))reference=JSON.parse(fs.readFileSync('content/tool-reference.json','utf8'));
else{
 const source=fs.readFileSync('loox-tool-guides.js','utf8'),start=source.indexOf(' const guides='),end=source.indexOf(' function visual(');
 reference=vm.runInNewContext(source.slice(start,end)+';({guides,toolbox})');write('content/tool-reference.json',JSON.stringify(reference,null,2));
}
const utility=new Set(Object.keys(reference.toolbox));
utility.delete('image-resizer');
Object.assign(reference.guides,imageReferences);
write('content/tool-reference.json',JSON.stringify(reference,null,2));
const glyphs={
 'video-editor':'M8 9h32v24H8z M21 16l10 6-10 6z M9 39h30 M15 36v6 M30 36v6',
 'photo-editor':'M8 9h32v30H8z M10 33l10-12 7 7 5-5 7 10 M28 15h5',
 'design-studio':'M9 9h14v14H9z M27 10h13v13H27z M10 28h13v12H10z M28 28l12 12 M40 28L28 40',
 'bg-remove':'M9 10h30v28H9z M14 32l9-14 12 14 M29 9v30',
 'faceswap':'M9 14c3-8 13-8 16 0 M11 21c0 11 12 11 12 0 M27 19c3-8 13-8 16 0 M29 26c0 11 12 11 12 0 M8 36h13l-4-4 M41 11H28l4 4',
 'face-blur':'M10 9h28v30H10z M17 18h14 M15 23h18 M17 28h14 M21 12h6',
 'cropimage':'M14 6v28h28 M6 14h28v28 M23 9v5 M9 23h5',
 'image-compressor':'M7 9h34v30H7z M12 15l8 8-8 8 M36 15l-8 8 8 8 M23 12v23',
 'imgformatconverter':'M8 11h15v25H8z M29 11h12v25H29z M17 24h18 M30 19l5 5-5 5',
 'video-compressor':'M7 10h34v28H7z M11 16l8 8-8 8 M37 16l-8 8 8 8 M22 20l6 4-6 4z',
 'video-to-gif':'M8 10h32v28H8z M16 17l11 7-11 7z M32 16c8 9-2 18-10 15 M22 31l4-3',
 'video-to-mp3':'M7 10h25v20H7z M16 16l8 5-8 5z M38 20v17 M38 22l7-2v14 M31 37c0-4 7-4 7 0s-7 4-7 0 M38 34c0-4 7-4 7 0',
 'video-trimmer':'M6 12h36v23H6z M17 8v31 M31 8v31 M21 18l6 5-6 5z',
 'youtube-thumbnail-maker':'M7 10h34v28H7z M12 15h12 M18 15v17 M13 32h10 M30 19l8 5-8 5z',
 'image-resizer':'M12 14h22v20H12z M7 7h10 M7 7v10 M41 41H31 M41 41V31 M7 7l9 9 M41 41l-9-9',
 'audio-cutter':'M7 24h4l3-9 5 20 5-25 5 22 4-16 4 8h4 M16 9v30 M33 9v30',
 'pdf-merge':'M8 8h12v18H8z M28 8h12v18H28z M14 29v6h10 M34 29v6H24 M24 30v12 M19 37l5 5 5-5',
 'pdf-split':'M16 6h16v20H16z M24 28v6 M12 34h24 M12 34v8 M36 34v8 M8 39l4 4 4-4 M32 39l4 4 4-4',
 'pdf-rotate':'M17 9h18v28H17z M10 29c-8-10 0-21 10-21 M15 5l5 3-4 5 M31 20h-9 M31 25h-9',
 'images-pdf':'M6 8h23v20H6z M9 24l6-8 9 8 M20 20h20v23H20z M25 30h10 M25 35h8',
 'developer':'M16 13L6 24l10 11 M32 13l10 11-10 11 M28 8l-8 32',
 'qr':'M7 7h12v12H7z M29 7h12v12H29z M7 29h12v12H7z M28 28h6v6h7v7H28z M12 12h2 M34 12h2 M12 34h2',
 'yt-thumb':'M7 9h34v25H7z M18 15l11 7-11 7z M12 39h24 M18 34v5 M30 34v5'
};
const generated=JSON.parse(fs.readFileSync('content/generated-assets.json','utf8'));
const manifest=[];
for(const [slug,t]of Object.entries(topics)){
 const src=generated.find(a=>a.slug===slug);if(!src)throw Error('Artwork missing: '+slug);
 fs.mkdirSync('assets/tool-art',{recursive:true});
 // Encoding and resizing for website delivery; the generated composition is preserved.
 if(src.path!=='assets/tool-art/'+slug+'.webp')await sharp(src.path).resize({width:1000,withoutEnlargement:true}).webp({quality:80}).toFile('assets/tool-art/'+slug+'.webp');
 const color=t.kind==='cloud'?'#ffb5cf':t.kind==='document'?'#a9d7ff':t.kind==='audio'?'#8ae0cb':'#c0b0ff';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="13" fill="#212a40"/>'+(glyphs[slug]?'<path d="'+glyphs[slug]+'" stroke="'+color+'" fill="none" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>':'<rect x="8" y="9" width="32" height="30" rx="5" fill="none" stroke="'+color+'" stroke-width="1.5"/><text x="24" y="29" text-anchor="middle" fill="'+color+'" font-size="14" font-family="system-ui,sans-serif" font-weight="750">'+esc(t.badge||'Tx')+'</text>')+'</svg>';
 write('assets/icons/'+slug+'.svg',svg);
 const iconDefinition=imageTools.find(d=>d.slug===slug);
 if(iconDefinition){const glyph=operationGlyphs[iconDefinition.op]||operationGlyphs.resize;write('assets/icons/'+slug+'.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>'+esc(iconDefinition.name)+'</title><rect width="48" height="48" rx="13" fill="#212a40"/><path d="'+glyph+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="31" y="34" width="15" height="12" rx="4" fill="#34304f"/><text x="38.5" y="42.5" text-anchor="middle" fill="#e2d8ff" font-family="system-ui,sans-serif" font-size="7" font-weight="700">'+String(iconDefinition.index+1).padStart(2,'0')+'</text></svg>')}
 const url=utility.has(slug)?'toolbox.html#'+slug:slug+'.html';
 const old=utility.has(slug)?reference.toolbox[slug]:reference.guides[slug+'.html'];
 const fallback={title:t.names[0],intro:t.lead[0],steps:t.flows[0].map((s,i)=>[s,copy.en.stepDetail[i],String(i+1).padStart(2,'0')]),benefits:['Arrange separate video, image, title and audio layers.','Fine-tune crop, position, color and volume.','Export a composed MP4 file on your device.'],tips:t.detail,privacy:copy.en.local,faq:[]};
 const data=old||fallback;
 const def=imageTools.find(d=>d.slug===slug),category=def?.group||existingGroups[slug]||null;
 manifest.push({slug,url,kind:t.kind,category,collection:textTools.some(d=>d.slug===slug)?'text':category==='video'?'video':category==='ai'?'ai':category?'image':'other',names:Object.fromEntries(locales.map((l,i)=>[l,t.names[i]])),lead:Object.fromEntries(locales.map((l,i)=>[l,t.lead[i]]))});
 const photo=await sharp('assets/tool-art/'+slug+'.webp').resize(520).webp({quality:65}).toBuffer();
 for(let step=0;step<4;step++){
  const overlay=step===0?'<path d="M260 36v50m-17-17 17 17 17-17" stroke="#9ce4d1" stroke-width="5" fill="none"/>':step===1?'<rect x="155" y="51" width="210" height="122" rx="3" stroke="#c9b6ff" stroke-width="3" fill="none"/><path d="M155 92h210M225 51v122M295 51v122" stroke="#fff8" fill="none"/>':step===2?'<circle cx="343" cy="114" r="40" stroke="#9ce4d1" stroke-width="4" fill="#101726aa"/><path d="m370 145 28 28" stroke="#9ce4d1" stroke-width="8"/>':'<rect x="294" y="89" width="125" height="83" rx="12" fill="#192b2c" stroke="#8de0c5"/><path d="m325 130 18 16 39-38" fill="none" stroke="#8de0c5" stroke-width="7"/>';
  write('assets/guides/steps/'+slug+'-'+(step+1)+'.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 230"><rect width="520" height="230" rx="15" fill="#101726"/><image href="data:image/webp;base64,'+photo.toString('base64')+'" width="520" height="230" preserveAspectRatio="xMidYMid slice"/><rect width="520" height="230" fill="#0d142e" opacity=".25"/>'+overlay+'<rect x="16" y="16" width="40" height="30" rx="8" fill="#181c30"/><text x="36" y="37" fill="#fff" text-anchor="middle" font-family="sans-serif" font-size="17">'+(step+1)+'</text></svg>');
 }
 for(const [i,l]of locales.entries()){
  const c=copy[l],name=t.names[i],privacy=t.kind==='cloud'?c.cloud:t.kind==='remote'?c.remote:c.local;
  const steps=(l==='en'?data.steps:t.flows[i].map((s,n)=>[s,c.stepDetail[n],String(n+1).padStart(2,'0')]));
  const faq=l==='en'?[...(data.faq||[]),[c.q1,c.a1],[c.q3,c.a3]]:[[c.q1,c.a1],[c.q2,c.a2],[c.q3,c.a3]];
  const benefits=l==='en'?data.benefits:t.flows[i];
  const figure='<figure class="loox-figure"><img src="assets/tool-art/'+slug+'.webp" alt="'+esc(name+' — '+c.examples)+'" width="1000" height="625" loading="lazy"><figcaption>'+esc(c.caption)+'</figcaption></figure>';
  const story=l==='en'?t.story:t.lead[i]+' '+c.stepDetail[0]+' '+c.stepDetail[1];
  const detail=l==='en'?t.detail:c.stepDetail[2]+' '+c.stepDetail[3]+' '+privacy;
  const html='<article class="loox-story" lang="'+l+'"><section class="loox-story-row" data-reveal>'+figure+'<div><span class="loox-eyebrow">'+c.learn+'</span><h2>'+esc(name)+'</h2><p>'+esc(t.lead[i])+'</p><p>'+esc(story)+'</p><a class="loox-story-link" href="#loox-how-to">'+c.how+' '+esc(name)+' ↓</a></div></section><section id="loox-how-to"><span class="loox-eyebrow">'+c.examples+'</span><h2>'+c.how+' '+esc(name)+'</h2><div class="loox-steps">'+steps.map(([title,body],n)=>'<article class="loox-step-card" data-reveal><span class="loox-step-count">0'+(n+1)+'</span><img src="assets/guides/steps/'+slug+'-'+(n+1)+'.svg" alt="'+esc(title)+'" width="520" height="230" loading="lazy"><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p></article>').join('')+'</div></section><section class="loox-story-row reverse" data-reveal>'+figure+'<div><span class="loox-eyebrow">LOOX TOOLS</span><h2>'+esc(l==='en'?t.use:c.features)+'</h2><p>'+esc(detail)+'</p><ul class="loox-feature-list">'+benefits.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>'+(l==='en'?'<p>'+esc(data.tips)+'</p>':'')+'</div></section><aside class="loox-trust-note"><span class="loox-eyebrow">'+(t.kind==='cloud'?'CLOUD':'LOCAL / NETWORK')+'</span><h2>'+c.privacy+'</h2><p>'+esc(l==='en'?data.privacy:privacy)+'</p><h3>'+c.safety+'</h3><p>'+c.safetyText+'</p></aside><section class="loox-faq-original"><span class="loox-eyebrow">LOOX HELP</span><h2>'+c.faq+'</h2>'+faq.map(([q,a])=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('')+'</section><section><span class="loox-eyebrow">'+c.related+'</span><h2>'+c.explore+'</h2><div class="loox-related-grid">'+Object.entries(topics).filter(([s])=>s!==slug).sort((a,b)=>(b[1].kind===t.kind)-(a[1].kind===t.kind)).slice(0,3).map(([s,other])=>'<a class="loox-related-card" href="'+(utility.has(s)?'toolbox.html?lang='+l+'#'+s:s+'.html?lang='+l)+'"><img src="assets/icons/'+s+'.svg" alt="" width="40" height="40">'+esc(other.names[i])+' ↗</a>').join('')+'</div></section></article>';
  write('assets/guides/'+l+'/'+slug+'.html',html);
  const schema={'@context':'https://schema.org','@type':'Article',headline:name+' — '+c.how,description:t.lead[i],inLanguage:l,author:{'@type':'Organization',name:'LOOX Tools'},publisher:{'@type':'Organization',name:'LOOX Tools'},image:root+'assets/tool-art/'+slug+'.webp',mainEntityOfPage:root+'learn/'+l+'/'+slug+'.html'};
  const canonical=root+'learn/'+l+'/'+slug+'.html';
  write('learn/'+l+'/'+slug+'.html','<!doctype html><html lang="'+l+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../../"><title>'+esc(name)+' — '+c.how+' | LOOX Tools</title><meta name="description" content="'+esc(t.lead[i])+'"><link rel="canonical" href="'+canonical+'">'+locales.map(lang=>'<link rel="alternate" hreflang="'+lang+'" href="'+root+'learn/'+lang+'/'+slug+'.html">').join('')+'<link rel="stylesheet" href="loox-experience.css?v=40"><script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script></head><body style="margin:0;background:#0e111a"><header style="padding:20px;color:#fff;display:flex;justify-content:space-between"><a href="index.html" style="color:inherit;text-decoration:none;font:800 20px system-ui">LOOX Tools</a><a href="'+url.replace('#','?lang='+l+'#')+(url.includes('#')?'':'?lang='+l)+'" class="loox-story-link">'+c.open+' ↗</a><nav aria-label="Language">'+locales.map((lang,j)=>'<a style="color:#c0b0ff;margin:6px" href="learn/'+lang+'/'+slug+'.html" lang="'+lang+'">'+['English','Español','Français','Deutsch'][j]+'</a>').join('')+'</nav></header><main class="loox-guide-host">'+html+'</main></body></html>');
 }
}
write('assets/tool-catalog.json',JSON.stringify(manifest,null,2));
write('content/generated-assets.json',JSON.stringify(generated.map(a=>({...a,path:'assets/tool-art/'+a.slug+'.webp'})),null,2));
const interfaceDictionary=Object.fromEntries(Object.entries(phrases).map(([en,values])=>[en,{en,es:values[0],fr:values[1],de:values[2]}]));
manifest.forEach(t=>{interfaceDictionary[t.names.en]=t.names;interfaceDictionary[t.lead.en]=t.lead});
write('assets/locales/interface.json',JSON.stringify(interfaceDictionary,null,2));
// Integrate static English guides into the existing tools; the editor scripts stay intact.
for(const name of fs.readdirSync('.').filter(n=>n.endsWith('.html'))){
 let html=fs.readFileSync(name,'utf8');
 if(name==='index.html'){
  html=html.replace(/<title>[^<]*<\/title>/,'<title>LOOX Tools — Creative, Text & Developer Utilities</title>');
  html=html.replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/,'<meta name="description" content="Image, video, audio, PDF, text and developer tools. Explore Unicode styles, watermark media, clean text and create locally with LOOX Tools.">');
 }
 if(name==='index.html')html=html.split('\n').map(line=>{const tool=manifest.find(t=>line.includes("url:'"+t.url+"'"));return tool?line.replace(/tags:'([^']*)'/,(match,tags)=>"tags:'"+[...new Set((tags+' '+Object.values(tool.names).join(' ')).replace(/'/g,'').split(/\s+/))].join(' ')+"'"):line}).join('\n');
 html=html.replace(/<script[^>]+src="loox-navigation\.js[^"]*"[^>]*><\/script>/g,'').replace(/<script[^>]+src="loox-tool-guides\.js[^"]*"[^>]*><\/script>/g,'');
 html=html.replace(/<link[^>]+href="loox-experience\.css[^"]*"[^>]*>/g,'').replace(/<script[^>]+src="loox-experience\.js[^"]*"[^>]*><\/script>/g,'');
 html=html.replace('</head>','<link rel="stylesheet" href="loox-experience.css?v=40">\n</head>');
 html=html.replace(/loox-crop-controls\.js\?v=\d+/g,'loox-crop-controls.js?v=40').replace(/loox-photo-studio\.js\?v=\d+/g,'loox-photo-studio.js?v=40').replace(/loox-video-studio\.js\?v=\d+/g,'loox-video-studio.js?v=40').replace(/loox-tool-ui\.js\?v=\d+/g,'loox-tool-ui.js?v=40');
 const item=manifest.find(t=>t.url===name);
 // The marked section makes rebuilding safe and avoids duplicating article content.
 html=html.replace(/<!-- LOOX ORIGINAL GUIDE START -->[\s\S]*?<!-- LOOX ORIGINAL GUIDE END -->/g,'');
 if(item||name==='toolbox.html'){
  const slug=item?.slug||'image-resizer',fragment=fs.readFileSync('assets/guides/en/'+slug+'.html','utf8');
  html=html.replace('</body>','<!-- LOOX ORIGINAL GUIDE START --><section class="loox-guide-host">'+fragment+'</section><!-- LOOX ORIGINAL GUIDE END -->\n</body>');
  if(item){
   const description=topics[slug].lead[0]+' Learn the workflow, choose useful settings, and review privacy details with LOOX Tools.';
   if(/<meta name="description"/.test(html))html=html.replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/,'<meta name="description" content="'+esc(description)+'">');
   else html=html.replace('</head>','<meta name="description" content="'+esc(description)+'"></head>');
   if(!html.includes('rel="canonical"'))html=html.replace('</head>','<link rel="canonical" href="'+root+item.url+'"></head>');
  }
 }
 html=html.replace('</body>','<script src="loox-experience.js?v=40" defer></script>\n</body>');
 write(name,html);
}
// A permanent, searchable editorial index for every workspace.
write('guides.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Practical Image, Video, Audio & PDF Guides — LOOX Tools</title><meta name="description" content="Explore original LOOX guides for image editing, video export, audio, PDF and creator tools, with illustrated steps and clear processing information."><link rel="canonical" href="'+root+'guides.html"><link rel="stylesheet" href="loox-experience.css?v=40"></head><body style="margin:0;background:#0e111a;color:#fff"><header style="height:76px;display:flex;align-items:center;padding:24px;font:800 22px system-ui">LOOX Tools</header><main class="experience-content loox-story"><span class="loox-eyebrow">LEARN SOMETHING USEFUL</span><h1 style="font:750 clamp(30px,5vw,58px)/1.1 system-ui">Good tools. A little know-how.<br>Better things to make.</h1><p>Find the right workflow, understand the choices that matter, and keep creating with confidence.</p><div class="loox-related-grid">'+manifest.map(t=>'<article class="loox-related-card"><img src="assets/tool-art/'+t.slug+'.webp" alt="'+esc(t.names.en)+' original concept illustration" loading="lazy" width="500" height="312" style="width:100%;height:auto;aspect-ratio:1.6;object-fit:cover;border-radius:12px"><h2 style="font-size:21px">'+esc(t.names.en)+'</h2><p style="font-size:14px">'+esc(t.lead.en)+'</p><a class="loox-story-link" href="learn/en/'+t.slug+'.html">Read the guide ↗</a><p style="font-size:11px;margin-top:14px">'+locales.slice(1).map((l,i)=>'<a style="color:#b8a9f3;margin-right:10px" href="learn/'+l+'/'+t.slug+'.html">'+['Español','Français','Deutsch'][i]+'</a>').join('')+'</p></article>').join('')+'</div></main><script src="loox-experience.js?v=40" defer></script></body></html>');
const oldMap=fs.readFileSync('sitemap.xml','utf8');
const pageLinks=Object.keys(topics).flatMap(slug=>locales.map(l=>root+'learn/'+l+'/'+slug+'.html'));
const withoutGenerated=oldMap.replace(/\s*<url><loc>[^<]*\/learn\/[^<]*<\/loc><\/url>/g,'');
write('sitemap.xml',withoutGenerated.replace('</urlset>',pageLinks.map(url=>'  <url><loc>'+url+'</loc></url>').join('\n')+'\n</urlset>'));
write('assets/ASSET-NOTES.md','# LOOX original tool artwork\n\nThe tool illustrations were generated for LOOX with the built-in image generator. The icons and numbered workflow overlays are original SVG source created for this project. Competitor screenshots were used only as layout references and are not published.\n\nThese are concept illustrations, not screenshots or measured before-and-after results. No performance reduction or output-quality claim should be inferred from the artwork.\n\nOriginal prompts are retained in content/generated-assets.json. Optimized delivery images live in assets/tool-art, icons in assets/icons, and guide content in assets/guides. These materials do not grant rights to third-party logos, photographs or user uploads, and do not guarantee exclusivity, search ranking or advertising approval.\n');
console.log('Built '+manifest.length+' tool identities and '+manifest.length*locales.length+' localized guides.');
