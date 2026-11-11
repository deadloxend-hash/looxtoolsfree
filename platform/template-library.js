import {state,auth,initialize} from './account.js?v=9';
import {element as e,action as a,result,rpc} from './community.js?v=4';
const root=document.getElementById('template-library'),workflow=location.pathname.endsWith('workflows.html');
let kind=root.dataset.generatorKind||'image',category='',query='',offset=0,epoch=0;const selectedStyles=new Set();
const search=e('input','loox-gallery-search');search.type='search';search.placeholder='Search Templates';search.setAttribute('aria-label','Search Templates');
const searchWrap=e('div','loox-gallery-search-wrap');
const searchIcon=e('span','loox-gallery-search-icon');searchIcon.setAttribute('aria-hidden','true');
searchIcon.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.4 4.4"/></svg>';
searchWrap.append(searchIcon,search);
const filters=e('div','loox-gallery-filters'),types=e('div','loox-gallery-types');
for(const [label,value] of [['Image','image'],['Video','video'],['Saved','saved']]){const b=a(label,()=>{kind=value;offset=0;updateTypes();load(true)},'loox-gallery-chip');b.dataset.type=value;types.append(b);}
function updateTypes(){types.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===kind)));}
updateTypes();
const cat={value:''};
const catButton=e('button','loox-gallery-chip loox-dropdown-trigger','Categories'),styleButton=e('button','loox-gallery-chip loox-dropdown-trigger','Styles');catButton.type='button';styleButton.type='button';
let categoryOptions=[],styleOptions=[];
const menu=e('div','loox-custom-menu loox-custom-menu-compact');menu.hidden=true;menu.setAttribute('role','listbox');document.body.append(menu);
let openButton=null;
function closeMenu(){menu.hidden=true;openButton?.setAttribute('aria-expanded','false');openButton=null;}
function showMenu(button,values,selected,onPick,allLabel){if(openButton===button){closeMenu();return;}closeMenu();openButton=button;button.setAttribute('aria-expanded','true');menu.replaceChildren();
for(const value of ['',...values]){const label=value||allLabel;const item=e('button','loox-custom-option',label);item.type='button';item.setAttribute('role','option');item.setAttribute('aria-selected',String(value===selected));item.append(e('span','loox-option-check',value===selected?'✓':''));item.onclick=()=>{onPick(value);button.textContent=(value||allLabel);closeMenu();load(true);};menu.append(item);}
const rect=button.getBoundingClientRect();menu.style.left=Math.max(10,Math.min(rect.left,innerWidth-250))+'px';menu.style.top=Math.min(rect.bottom+6,innerHeight-140)+'px';menu.style.maxWidth=Math.min(244,innerWidth-20)+'px';menu.style.width='max-content';menu.hidden=false;
const menuHeight=menu.getBoundingClientRect().height;
menu.style.top=(rect.bottom+6+menuHeight>innerHeight-8
 ? Math.max(8,rect.top-menuHeight-6):rect.bottom+6)+'px';}
catButton.onclick=()=>showMenu(catButton,categoryOptions,cat.value,v=>{cat.value=v;category=v;},'Categories');
function updateStyleButton(){const names=[...selectedStyles];styleButton.textContent=names.length?('Styles ('+names.length+')'):'Styles';styleButton.setAttribute('aria-pressed',String(names.length>0));}
function showStyleMenu(){
 if(openButton===styleButton){closeMenu();return;}
 closeMenu();openButton=styleButton;styleButton.setAttribute('aria-expanded','true');menu.replaceChildren();
 const clear=e('button','loox-custom-option','Clear style selections');clear.type='button';clear.onclick=()=>{selectedStyles.clear();updateStyleButton();showStyleMenuRefresh();load(true);};menu.append(clear);
 for(const value of styleOptions){
  const item=e('button','loox-custom-option'),check=e('span','loox-option-check',selectedStyles.has(value)?'✓':'');
  item.type='button';item.setAttribute('role','checkbox');item.setAttribute('aria-checked',String(selectedStyles.has(value)));
  item.append(e('span','',value),check);
  item.onclick=()=>{if(selectedStyles.has(value))selectedStyles.delete(value);else selectedStyles.add(value);updateStyleButton();showStyleMenuRefresh();load(true);};
  menu.append(item);
 }
 const rect=styleButton.getBoundingClientRect();menu.style.left=Math.max(10,Math.min(rect.left,innerWidth-250))+'px';menu.style.top=Math.min(rect.bottom+6,innerHeight-140)+'px';menu.style.maxWidth=Math.min(244,innerWidth-20)+'px';menu.style.width='max-content';menu.hidden=false;
const menuHeight=menu.getBoundingClientRect().height;
menu.style.top=(rect.bottom+6+menuHeight>innerHeight-8
 ? Math.max(8,rect.top-menuHeight-6):rect.bottom+6)+'px';
}
function showStyleMenuRefresh(){openButton=null;showStyleMenu();}
styleButton.onclick=showStyleMenu;
document.addEventListener('pointerdown',ev=>{if(!menu.hidden&&!menu.contains(ev.target)&&ev.target!==openButton)closeMenu();});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeMenu();});
// Captured scroll events also fire when the menu itself scrolls. Keep the
// dropdown open for wheel/touch scrolling inside it, close on page scrolling.
window.addEventListener('scroll',ev=>{
 if(!menu.hidden&&(ev.target===menu||menu.contains(ev.target)))return;
 closeMenu();
},true);
window.addEventListener('resize',closeMenu);
const reset=a('Clear filters',()=>{cat.value='';selectedStyles.clear();search.value='';category='';query='';catButton.textContent='Categories';updateStyleButton();closeMenu();load(true)},'loox-gallery-chip');
filters.append(types,catButton,styleButton,reset);
const section=e('div','loox-gallery-section'),grid=e('div','loox-gallery-grid'),notice=e('p','community-note'),more=a('Load more',()=>load(false),'community-more',err=>notice.textContent=err.message);section.append(grid,notice,more);
const toolbar=e('div','loox-gallery-toolbar');toolbar.append(searchWrap,filters);
root.replaceChildren(toolbar,section);
async function categories(){const rows=result(await state.client.from('loox_template_categories').select('name').order('name'));categoryOptions=rows.map(t=>t.name);if(cat.value&&!categoryOptions.includes(cat.value)){cat.value='';category='';catButton.textContent='Categories';}}
async function loadStyles(){const rows=result(await state.client.from('loox_template_styles').select('name').order('name'));styleOptions=rows.map(t=>t.name);for(const name of [...selectedStyles])if(!styleOptions.includes(name))selectedStyles.delete(name);updateStyleButton();}
let debounce;search.oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{query=search.value.trim();load(true)},220);};
function media(t,full=false){
 const box=e('div','loox-gallery-media');
 box.classList.add('loox-media-pending');
 if(!t.media_path){box.classList.remove('loox-media-pending');return box;}
 const m=document.createElement(t.kind==='video'?'video':'img');
 if(t.kind==='video'){
  m.muted=true;m.loop=true;m.playsInline=true;m.preload='metadata';
  m.onmouseenter=()=>m.play().catch(()=>{});
  m.onmouseleave=()=>m.pause();
 }else{
  // Prevent browser broken-image icons while original media is being loaded.
  m.alt=t.title;m.decoding='async';m.loading=full?'eager':'lazy';
  m.style.visibility='hidden';
 }
 const status=e('span','loox-media-loading',full?'Loading image…':'');
 if(full)box.append(status);
 box.append(m);
 async function signedUrl(variant){
  const params=new URLSearchParams({action:'public_media',type:'template',id:t.id,variant});
  // A signed URL must never be reused from the browser cache after expiration.
  params.set('request',String(Date.now()));
  const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox?'+params,{credentials:'omit',cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.url)throw Error(data.error||'Template unavailable.');
  return data.url;
 }
 async function showImage(variant){
  const url=await signedUrl(variant);
  if(!box.isConnected)return;
  if(t.kind==='video'){
   m.src=url;return;
  }
  // Decode the actual image before assigning its URL to the visible element.
  const image=new Image();image.decoding='async';
  await new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=()=>reject(Error('Image unavailable'));
   image.src=url;
  });
  if(!box.isConnected)return;
  m.src=url;m.style.visibility='visible';
  box.classList.remove('loox-media-pending');
  if(status.isConnected)status.remove();
 }
 (async()=>{
  try{
   await showImage(full?'original':'preview');
  }catch(error){
   if(full){
    try{await showImage('preview');return;}catch{}
   }
   box.classList.remove('loox-media-pending');
   if(status.isConnected)status.textContent='Image unavailable';
   if(!full&&m.isConnected)m.replaceWith(e('span','community-note','Preview unavailable'));
  }
 })();
 return box;
}
function launch(t){sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:t.kind,prompt:t.prompt,model:t.model_id,settings:t.settings,reference_path:t.kind==='image'?t.media_path:null,reference_id:t.kind==='image'?t.id:null}));if(state.user)rpc(state,'loox_launch_template',{p_template:t.id}).catch(()=>{});const target=new URL(t.kind==='video'?'ai-video-generator.html':'ai-text-to-image.html',location.href);target.searchParams.set('template',t.id);target.hash='generate';if(target.href===location.href)location.reload();else location.assign(target.href);}
function details(t){const overlay=e('div','loox-template-overlay'),panel=e('div','loox-template-detail'),back=a('← Back',()=>overlay.remove(),'loox-gallery-chip'),visual=media(t,true),info=e('div','loox-template-info'),h=e('h2','',t.title),meta=e('p','',t.category+' · '+(t.styles?.length?t.styles.join(', '):(t.style||'No style'))+' · '+t.kind),description=e('p','',t.description||''),prompt=e('p','loox-template-prompt',t.prompt),copy=a('Copy prompt',()=>navigator.clipboard.writeText(t.prompt).catch(()=>{}),'loox-gallery-chip'),recreate=a('Recreate this',()=>launch(t),'loox-recreate');info.append(h,meta,description,prompt,copy,recreate);panel.append(back,visual,info);overlay.append(panel);overlay.onclick=ev=>{if(ev.target===overlay)overlay.remove()};document.body.append(overlay);}
function card(t){
 const select=()=>root.dataset.generatorKind?launch(t):details(t);
 const card=e('article','loox-gallery-card'),art=media(t),caption=e('div','loox-gallery-caption'),
 h=e('h3','',t.title),meta=e('small','',t.category),btn=a('Recreate this',select,'loox-recreate');
 card.tabIndex=0;card.setAttribute('aria-label','View template: '+t.title);
 caption.append(h,meta);art.append(btn,caption);card.append(art);
 card.onclick=ev=>{
  if(ev.target===btn||btn.contains(ev.target))return;
  if(root.dataset.generatorKind){launch(t);return;}
  // Touch screens do not have hover: first tap reveals the overlay, next tap opens details.
  if(window.matchMedia('(hover:none)').matches&&!card.classList.contains('is-revealed')){
   grid.querySelectorAll('.loox-gallery-card.is-revealed').forEach(other=>other.classList.remove('is-revealed'));
   card.classList.add('is-revealed');return;
  }
  details(t);
 };
 card.onkeydown=ev=>{if(ev.target===card&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();select();}};
 return card;
}
// Explicit columns prevent CSS multicol balancing from leaving the right side empty.
let masonryColumns=0;
function columnCount(){return matchMedia('(max-width:700px)').matches?2:matchMedia('(max-width:1100px)').matches?3:5;}
function renderMasonry(){
 const count=columnCount();
 const cards=[...grid.querySelectorAll('.loox-gallery-card')];
 const cols=Array.from({length:count},()=>e('div','loox-gallery-masonry-column'));
 // Preserve DOM image elements and their cached image URLs across resize.
 for(const [index,item] of cards.entries())cols[index%count].append(item);
 grid.replaceChildren(...cols);masonryColumns=count;
}
window.addEventListener('resize',()=>{
 if(masonryColumns&&masonryColumns!==columnCount())renderMasonry();
});
async function load(reset){const turn=++epoch;if(reset){offset=0;grid.replaceChildren();}notice.textContent='Loading templates…';more.hidden=true;try{if(kind==='saved'&&!state.user){notice.textContent='Sign in to view saved templates.';return;}
let q=state.client.from('loox_template_catalog').select('id,title,description,prompt,kind,category,style,styles,model_id,settings,media_path').eq('active',true).not('media_path','is',null).order('created_at',{ascending:false});
if(kind!=='saved')q=q.eq('kind',kind);
if(category)q=q.eq('category',category);if(selectedStyles.size)q=q.overlaps('styles',[...selectedStyles]);if(query)q=q.ilike('title','%'+query.replace(/[\\%_]/g,'')+'%');
if(kind==='saved'){const saved=result(await state.client.from('loox_saved_templates').select('template_id').eq('user_id',state.user.id).limit(500));if(!saved.length){notice.textContent='No saved templates yet.';return;}q=q.in('id',saved.map(x=>x.template_id));}
const rows=result(await q.range(offset,offset+19));if(turn!==epoch)return;
 for(const t of rows)grid.append(card(t));
 offset+=rows.length;more.hidden=rows.length<20;
 notice.textContent=grid.querySelector('.loox-gallery-card')?'':'No templates yet. New creations will appear here soon.';
 renderMasonry();}catch(err){if(turn===epoch)notice.textContent=err.message;}}
await initialize({publicAccess:true});await Promise.all([categories(),loadStyles()]).catch(err=>notice.textContent=err.message);await load(true);document.addEventListener('loox-user',()=>load(true));
