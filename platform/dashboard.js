import {aiTools} from './catalog.js?v=4';
import {el,button,config,state,pricing,auth} from './account.js?v=7';
const aiBannerFiles={
'bg-remove':'loox_ai_background_remover_hero_banner.jpg',
'ai-image-upscaler':'loox_ai_image_upscaler_showcase.jpg',
'ai-image-enhancer':'loox_ai_image_enhancer_banner.jpg',
'ai-object-eraser':'loox_object_eraser_hero_banner.jpg',
'ai-watermark-remover':'loox_watermark_removal_workflow.jpg',
'ai-text-to-image':'neon_loox_ai_image_generator_interface.jpg',
'ai-generative-fill':'loox_generative_fill_alpine_lake_makeover.jpg',
'ai-generative-erase':'loox_ai_generative_erase_hero.jpg',
'ai-uncrop':'loox_ai_generative_uncrop_studio.jpg',
'ai-photo-restorer':'loox_old_photo_restorer.jpg'
};
const aiFallbacks={'ai-chat':'ai-generative-fill','ai-skin-retoucher':'ai-skin-retoucher','ai-face-restoration':'ai-photo-restorer','image-to-text':'image-to-text','face-blur':'face-blur','faceswap':'faceswap'};
const host=document.querySelector('[data-ai-dashboard]');
if(host){
 const full=host.dataset.aiDashboard==='full';
 host.className='lx lx-ai-dashboard '+(full?'lx-ai-dashboard-full':'lx-ai-dashboard-home');
 const top=el('div',null,'lx-row'),copy=el('div');
 copy.append(el('p','CREATE WITH LOOX','lx-eyebrow'),el(full?'h1':'h2','AI tools for your next idea'));
 if(full){
  copy.append(el('p','Edit, enhance and generate images in one workspace.'));
  const credits=button('Sign in for AI credits',()=>state.user?pricing():auth(),'lx-button lx-primary');
  function balance(){credits.textContent=state.user?(state.account?.wallet.balance??'…')+' credits · Upgrade':'Sign in for AI credits';}
  document.addEventListener('loox-account',balance);document.addEventListener('loox-user',balance);balance();
  top.append(copy,credits);
 }else top.append(copy);
 host.append(top);
 let cfg=null;
 if(full){
  const note=el('p','Checking cloud AI availability…','lx-note');note.setAttribute('role','status');host.append(note);
  config().then(c=>{cfg=c;note.textContent=c.ai?'Cloud jobs require an account and AI credits.':'Cloud AI activation is pending. Browse workspaces and settings below. Automatic face blur runs on your device.';draw();}).catch(()=>{note.textContent='Cloud service is unavailable. Local tools are available.';draw();});
 }
 const imageFor=t=>aiBannerFiles[t.slug]?'assets/ai-banners/'+aiBannerFiles[t.slug]:'assets/tool-art/'+(aiFallbacks[t.slug]||t.slug)+'.webp';
 const fallbackFor=t=>'assets/tool-art/'+(aiFallbacks[t.slug]||t.slug)+'.webp';
 function picture(t,cls){
  const img=el('img',null,cls);img.alt=t.name+' preview';img.loading='lazy';img.decoding='async';
  img.src=imageFor(t);img.onerror=()=>{if(img.src.endsWith(fallbackFor(t))){img.onerror=null;return;}img.onerror=null;img.src=fallbackFor(t);};
  return img;
 }
 let draw=()=>{};
 if(!full){
  const featured=aiTools.filter(t=>aiBannerFiles[t.slug]);
  // Use only image-backed, existing AI tools for a polished slideshow.
  const stage=el('div',null,'lx-feature-stage');
  const slide=el('a',null,'lx-feature-slide');slide.setAttribute('aria-label','Try featured AI tool');
  const image=el('img',null,'lx-feature-image');image.alt='Featured AI tool';image.decoding='async';
  const shade=el('div',null,'lx-feature-shade'),content=el('div',null,'lx-feature-copy');
  const eyebrow=el('span','FEATURED AI TOOL','lx-feature-kicker');
  const heading=el('h3');const description=el('p');const tryNow=el('span','Try Now →','lx-feature-cta');
  content.append(eyebrow,heading,description,tryNow);
  slide.append(image,shade,content);stage.append(slide);
  const controls=el('div',null,'lx-feature-controls');
  const previous=button('‹',()=>activate(active-1),'lx-feature-arrow');previous.setAttribute('aria-label','Previous featured tool');
  const dots=el('div',null,'lx-feature-dots');
  const next=button('›',()=>activate(active+1),'lx-feature-arrow');next.setAttribute('aria-label','Next featured tool');
  controls.append(previous,dots,next);stage.append(controls);
  host.append(stage);
  const browse=el('a','All AI Tools →','lx-feature-browse');browse.href='all-ai-tools.html';host.append(browse);
  let active=0;
  const markers=featured.map((t,i)=>{
   const marker=button('',()=>activate(i),'lx-feature-dot');marker.setAttribute('aria-label','Show '+t.name);dots.append(marker);return marker;
  });
  function activate(n){
   if(!featured.length)return;
   active=(n+featured.length)%featured.length;
   const t=featured[active];slide.href=t.slug+'.html';
   // Reuse the original banner. Size the card to its natural aspect ratio
   // so no photo is stretched, letterboxed, or cropped.
   image.onload=()=>{
    if(image.naturalWidth&&image.naturalHeight){
     stage.style.setProperty('--feature-image-ratio',image.naturalWidth+' / '+image.naturalHeight);
    }
   };
   image.onerror=()=>{image.onerror=null;image.src=fallbackFor(t);};
   image.src=imageFor(t);
   image.alt=t.name+' preview';heading.textContent=t.name;description.textContent=t.description;
   markers.forEach((m,i)=>{m.setAttribute('aria-current',i===active?'true':'false');});
  }
  activate(0);
  let paused=false;
  stage.addEventListener('mouseenter',()=>{paused=true;});
  stage.addEventListener('mouseleave',()=>{paused=false;});
  stage.addEventListener('focusin',()=>{paused=true;});
  stage.addEventListener('focusout',e=>{if(!stage.contains(e.relatedTarget))paused=false;});
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   window.setInterval(()=>{if(!paused&&!document.hidden)activate(active+1);},5500);
  }
 }else{
  const search=el('input');search.type='search';search.placeholder='Search AI tools';search.setAttribute('aria-label','Search AI tools');search.className='lx-ai-search';host.append(search);
  const tabs=el('nav',null,'lx-tabs');tabs.setAttribute('aria-label','AI tool categories');host.append(tabs);
  let category='All';const buttons=[];
  for(const name of ['All','Editing','Enhancement','Generation','Restoration','Privacy','Utilities']){
   const b=button(name,()=>{category=name;draw();});buttons.push([name,b]);tabs.append(b);
  }
  const grid=el('div',null,'lx-ai-grid');host.append(grid);
  const count=el('p',null,'lx-note');count.setAttribute('role','status');host.append(count);
  draw=function(){
   grid.replaceChildren();for(const [name,b] of buttons)b.setAttribute('aria-pressed',String(category===name));
   const selected=aiTools.filter(t=>(category==='All'||category===t.category)&&(t.name+' '+t.description).toLowerCase().includes(search.value.trim().toLowerCase()));
   for(const t of selected){
    const a=el('a',null,'lx-ai-card');a.href=t.slug+'.html';
    const status=t.operation==='local'?'On-device AI':t.operation?(cfg?.ai?'Uses AI credits':'Cloud setup pending'):'Integration pending';
    const preview=picture(t,'lx-ai-card-image');preview.width=800;preview.height=500;
    a.append(preview,el('span',t.icon,'lx-ai-icon'),el('small',t.category),el('h3',t.name),el('p',t.description),el('small',status,'lx-status'),el('strong','Open workspace ↗'));
    grid.append(a);
   }count.textContent=selected.length+' tools';if(!selected.length)grid.append(el('p','No tools match your search.'));
  };
  search.oninput=draw;draw();
 }
}
