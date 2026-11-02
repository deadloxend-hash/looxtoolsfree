/* LOOX AI showcases. Presentational only: processing/auth/credit logic remains owned by existing tools. */
(()=>{
'use strict';
const data={
'bg-remove.html':['Background Remover','Create clean, transparent PNG cutouts.','bg-remove','Upload a JPG, PNG or WebP','Let the background remover isolate the main subject','Preview the transparent result and download your PNG','Cloud AI'],
'ai-image-upscaler.html':['Image Upscaler','Enlarge small images at 2× or 4× resolution.','ai-image-upscaler','Upload the photo you want to enlarge','Choose 2× or 4× to select output dimensions','Compare the result and download the new image','Cloud AI'],
'ai-image-enhancer.html':['Image Enhancer','Bring out detail and clarity in your photos.','ai-image-upscaler','Upload a low-quality or soft-looking photo','Run the supported enhancement operation','Review the clarity and export the image','Cloud AI'],
'ai-object-eraser.html':['Object Eraser','Brush over distractions and edit them away.','ai-watermark-remover','Upload your image into the editing workspace','Paint a mask over the item you want removed','Run the eraser and review the filled background','Cloud AI'],
'ai-watermark-remover.html':['Watermark Remover','Edit unwanted marks on images you have permission to use.','ai-watermark-remover','Upload an image you own or are authorized to edit','Brush a precise mask over the unwanted mark','Preview the rebuilt area and save your image','Cloud AI'],
'ai-text-to-image.html':['AI Image Generator','Transform creative text prompts into imagery.','ai-generative-fill','Describe the scene, subject and look you want','Choose a supported output format or aspect ratio','Generate, review and download your artwork','Cloud AI'],
'ai-generative-fill.html':['Generative Fill','Paint a region and describe the new content.','ai-generative-fill','Upload your image and select the area to edit','Brush a mask and describe what should appear there','Generate a matching replacement and download','Cloud AI'],
'ai-generative-erase.html':['Generative Erase','Remove selected distractions using an image mask.','ai-watermark-remover','Upload an image and locate the content to remove','Paint over the object to create an accurate mask','Run the erase operation and inspect the result','Cloud AI'],
'ai-uncrop.html':['Generative Uncrop','Extend your scene beyond the original frame.','ai-uncrop','Choose an image with room to extend its scenery','Select an expanded canvas or aspect ratio','Generate matching surroundings when available','Integration pending'],
'ai-photo-restorer.html':['Old Photo Restorer','Discover ways to repair fading, scratches and damage.','ai-photo-restorer','Upload or scan your damaged photograph','Choose available restoration settings','Compare the original with the repaired image','Integration pending'],
'ai-skin-retoucher.html':['Skin Retoucher','Create subtle, natural-looking portrait improvements.','ai-skin-retoucher','Upload a portrait you have permission to edit','Review available skin and clarity adjustments','Export while preserving natural features','Integration pending'],
'ai-face-restoration.html':['Face Restoration','Improve facial clarity in older or soft images.','ai-photo-restorer','Choose a photo with blurry or aged facial details','Apply an available restoration model','Check the results carefully before sharing','Integration pending'],
'image-to-text.html':['Image to Text · OCR','Extract text from pictures on your own device.','image-to-text','Upload a clear scan or photo of printed text','Run local text recognition in your browser','Copy or download the recognized text','On-device AI'],
'face-blur.html':['Automatic Face Blur','Protect identities in photos with face blur.','face-blur','Upload a photo containing visible faces','Use automatic detection or the manual blur brush','Inspect every face and download the edited image','On-device AI'],
'faceswap.html':['Face Swap','Explore consent-based face editing.','faceswap','Provide source and target media with consent','Choose compatible faces and review privacy requirements','Run the tool if its integration is available','Integration pending']
};
const bannerFile={
'bg-remove.html':'loox_ai_background_remover_hero_banner.png',
'ai-image-upscaler.html':'loox_ai_image_upscaler_showcase.png',
'ai-image-enhancer.html':'loox_ai_image_enhancer_banner.png',
'ai-object-eraser.html':'loox_object_eraser_hero_banner.png',
'ai-watermark-remover.html':'loox_watermark_removal_workflow.png',
'ai-text-to-image.html':'neon_loox_ai_image_generator_interface.png',
'ai-generative-fill.html':'loox_generative_fill_alpine_lake_makeover.png',
'ai-generative-erase.html':'loox_ai_generative_erase_hero.png',
'ai-uncrop.html':'loox_ai_generative_uncrop_studio.png',
'ai-photo-restorer.html':'loox_old_photo_restorer.png'
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path=location.pathname.split('/').pop()||'index.html',entry=data[path];
if(!entry&&path!=='index.html')return;
const css=document.createElement('link');css.rel='stylesheet';css.href='ai-guide.css?v=1';document.head.append(css);
function assetFor(file){return 'assets/tool-art/'+data[file][2]+'.webp'}
function imageWithFallback(image,url, fallback){
 image.src=url;image.onerror=()=>{image.onerror=null;if(image.src.endsWith(fallback))return;image.src=fallback};
}
function enrichCards(){
 document.querySelectorAll('a[data-tool]').forEach(a=>{
  const file=(a.getAttribute('href')||'').split(/[?#]/)[0].split('/').pop(),entry=data[file];
  if(!entry)return;
  const prev=a.querySelector('img.loox-ai-card-art,img.loox-card-cover');
  if(prev){if(prev.dataset.looxAiBanner==='1')return;prev.dataset.looxAiBanner='1';if(bannerFile[file])imageWithFallback(prev,'assets/ai-banners/'+bannerFile[file],assetFor(file));else prev.src=assetFor(file);return;}
  const image=document.createElement('img');image.className='loox-ai-card-art';image.width=640;image.height=400;image.loading='lazy';image.alt=entry[0]+' illustrated tool preview';
  if(bannerFile[file])imageWithFallback(image,'assets/ai-banners/'+bannerFile[file],assetFor(file));else image.src=assetFor(file);
  a.prepend(image);
 });
}
function start(){
 if(path==='index.html'){
  enrichCards();
  ['toolGrid','recentGrid','favGrid'].forEach(id=>{const node=document.getElementById(id);if(node)new MutationObserver(enrichCards).observe(node,{childList:true,subtree:false})});
  return;
 }
 const main=document.querySelector('main');
 if(!main||main.querySelector('.loox-ai-showcase'))return;
 const [title,description,art,step1,step2,step3,status]=entry;
 document.body.classList.add('loox-ai-has-showcase');
 if(main.style.maxWidth&&main.style.maxWidth!=='none')main.style.maxWidth='1240px';
 if(main.style.padding)main.style.padding='0 18px';
 main.querySelectorAll(':scope > h1,:scope > .work-lead,:scope > .loox-eyebrow').forEach(n=>n.classList.add('loox-ai-original-heading'));
 const workspace=main.querySelector('[data-studio],[data-ocr],.lx-workspace,.work-upload,#editor,.editor-wrapper');
 const workspaceTarget=workspace?.closest('section')||workspace;
 if(workspaceTarget&&!workspaceTarget.id)workspaceTarget.id='workspace';
 const live=status!=='Integration pending';
 const hero=document.createElement('section');hero.className='loox-ai-showcase';hero.setAttribute('aria-label',title+' preview');
 hero.innerHTML='<div class="loox-ai-hero-copy"><span class="loox-ai-eyebrow">✦ LOOX AI · '+esc(status)+'</span><h1>'+esc(title.split(' ').slice(0,-1).join(' '))+' <strong>'+esc(title.split(' ').slice(-1))+'</strong></h1><p>'+esc(description)+'</p><div class="loox-ai-hero-actions"><a class="loox-ai-link loox-ai-link-primary" href="'+(live?'#workspace':'#loox-ai-how')+'">'+(live?'Open workspace ↗':'Explore the guide ↗')+'</a><a class="loox-ai-link" href="#loox-ai-how">How it works ↓</a></div></div><div class="loox-ai-hero-media"><img alt="'+esc(title)+' illustrated workflow preview" loading="eager" decoding="async" width="1000" height="625"><span class="loox-ai-media-label">Example workflow</span><span class="loox-ai-media-foot">✦ LOOX creative tools</span></div>';
 main.prepend(hero);
 const visual=hero.querySelector('img');const fallback='assets/tool-art/'+art+'.webp';
 if(bannerFile[path])imageWithFallback(visual,'assets/ai-banners/'+bannerFile[path],fallback);else visual.src=fallback;
 const guide=document.createElement('section');guide.id='loox-ai-how';guide.className='loox-ai-learning';guide.setAttribute('aria-labelledby','loox-ai-guide-title');
 const steps=[step1,step2,step3];
 guide.innerHTML='<div class="loox-ai-learn-head"><span class="loox-ai-kicker">Learn in three easy steps</span><h2 id="loox-ai-guide-title">How to use '+esc(title)+'</h2><p>Follow the illustrated workflow, then use the actual editor above when the processing service is available.</p></div><div class="loox-ai-steps">'+steps.map((text,i)=>'<article class="loox-ai-step"><span class="loox-ai-step-number">0'+(i+1)+'</span><h3>'+['Prepare your image','Choose your settings','Review and export'][i]+'</h3><p>'+esc(text)+'.</p></article>').join('')+'</div><div class="loox-ai-example"><img src="'+esc(fallback)+'" alt="Illustrated example for '+esc(title)+'" loading="lazy" width="1000" height="625"><div><span class="loox-ai-kicker">Visual example</span><h3>See what this tool is designed to do</h3><p>This concept artwork demonstrates a typical '+esc(title.toLowerCase())+' workflow. It is an illustration, not a result produced from your file. The appearance of an actual result depends on your image and the processing method.</p><p><a href="'+(live?'#workspace':'all-ai-tools.html')+'">'+(live?'Go to the workspace ↗':'Browse available AI tools ↗')+'</a></p></div></div><div class="loox-ai-faq"><h3>Frequently asked questions</h3><details><summary>How do I use this tool?</summary><p>Follow the three steps above. Upload a file or enter your prompt, choose supported settings, then preview your result when processing is enabled.</p></details><details><summary>Does it cost AI credits?</summary><p>Cloud AI processing requires an account and may use credits. On-device tools do not require cloud AI credits. Check the credit cost shown in the workspace before submitting.</p></details><details><summary>Are my photos private?</summary><p>On-device utilities run in your browser. Cloud AI operations send required media to the processing provider. Only upload files you have permission to process, and review the site privacy policy.</p></details><p class="loox-ai-note">Feature availability: '+esc(status)+'. This guide does not activate an unfinished model or payment integration.</p></div>';
 main.after(guide);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
