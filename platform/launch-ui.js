const check="<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m5 12 4 4L19 6\"/></svg>";
const selectors='.loox-option-check,.studio-select-check,.studio-asset-check,.image-model-check,.video-model-check,.loox-ratio-tick,.theme-option-check,.note-check';
function polish(root=document){
 if(location.pathname.endsWith('/ai-video-generator.html')){const model=root.querySelector('.studio-quick button');if(model){model.disabled=true;if(model.textContent!=='Models · Coming Soon')model.textContent='Models · Coming Soon';}}
 for(const e of root.querySelectorAll('.lp-plan-features li'))if(!e.querySelector('svg')){const span=document.createElement('span');span.innerHTML=check;e.prepend(span);}
 for(const e of root.querySelectorAll('.studio-quick button,.studio-style-trigger,#lig-generate,.lig-image-pill,.lp-tier-icon,.lp-kicker-star,.loox-header-credit-icon')){
  const text=[...e.childNodes].find(n=>n.nodeType===3&&/^[\s]*[✧☷✦◇◆♛]/.test(n.textContent));
  if(text){const svg=document.createElement('span');svg.innerHTML=check.replace('<path d="m5 12 4 4L19 6"/>','<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>');if(/Settings/.test(text.textContent))svg.innerHTML=check.replace('<path d="m5 12 4 4L19 6"/>','<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>');text.textContent=text.textContent.replace(/^[\s]*[✧☷✦◇◆♛]\s*/, '');e.insertBefore(svg,text);}
 }
for(const a of root.querySelectorAll('nav a[href*="ai-video-"],.loox-mobile-app-tile[href*="ai-video-"]')){if(!a.querySelector('.loox-coming-label')){const badge=document.createElement('small');badge.className='loox-coming-label';badge.textContent='Coming Soon';a.append(badge);}}
for(const e of root.querySelectorAll(selectors)){if(/^[✓✔✅]$/.test(e.textContent.trim())&&!e.querySelector('svg'))e.innerHTML=check;}}
polish();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish();});}).observe(document.body,{childList:true,subtree:true,characterData:true});
