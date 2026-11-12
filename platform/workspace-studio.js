import {openSheet,moveIntoSheet} from './workspace-sheet.js';
import {state,initialize,auth,api} from './account.js?v=9';
const $=s=>document.querySelector(s),node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,cls='studio-button')=>{const b=node('button',cls,text);b.type='button';b.onclick=fn;return b;};
function notify(text){let n=$('.studio-toast');if(!n){n=node('p','studio-toast');n.setAttribute('role','status');document.body.append(n);}n.textContent=text;clearTimeout(notify.timer);notify.timer=setTimeout(()=>n.remove(),4000);}
async function signedIn(){await initialize();if(!state.user){auth();throw Error('Sign in to save styles.');}}
let savedCache=[],savedOwner=null;
const saved=()=>savedOwner===state.user?.id?savedCache:[];
let savedLoading=null;
async function loadSaved(){
 if(!state.user){savedCache=[];savedOwner=null;return;}
 const owner=state.user.id;
 if(savedOwner===owner)return;
 if(savedLoading?.owner===owner)return savedLoading.promise;
 const promise=(async()=>{
  const {data,error}=await state.client.from('loox_user_styles').select('id,name,prompt,favorite,preview_job_id').eq('user_id',owner).order('created_at',{ascending:false});
  if(error)throw error;
  if(state.user?.id!==owner)return;
  savedCache=data||[];savedOwner=owner;
 })();
 savedLoading={owner,promise};
 try{await promise;}finally{if(savedLoading?.promise===promise)savedLoading=null;}
}
async function persist(styles){await signedIn();if(styles.length>20)throw Error('You can save up to 20 styles.');const ids=new Set(styles.map(x=>x.id));for(const old of saved()){if(!ids.has(old.id)){const {error}=await state.client.from('loox_user_styles').delete().eq('id',old.id).eq('user_id',state.user.id);if(error)throw error;}}
 if(styles.length){const {error}=await state.client.from('loox_user_styles').upsert(styles.map(s=>({id:s.id,user_id:state.user.id,name:s.name,prompt:s.prompt,favorite:!!s.favorite,preview_job_id:s.preview_job_id||null})));if(error)throw error;}savedCache=styles;savedOwner=state.user.id;notify('Styles saved');}
let selectedStyle=null;
function editStyle(style){
 const box=node('form','studio-stack'),name=node('input'),prompt=node('textarea'),notice=node('p');name.placeholder='Style name';name.setAttribute('aria-label','Style name');name.maxLength=60;name.required=true;name.value=style?.name||'';prompt.placeholder='Reusable style prompt';prompt.setAttribute('aria-label','Reusable style prompt');prompt.maxLength=500;prompt.required=true;prompt.value=style?.prompt||'';
 let previewId=style?.preview_job_id||null;
 const previewList=node('div','studio-assets');box.append(name,prompt,button('Choose preview from My Creations',async()=>{try{await signedIn();const {items}=await api('gallery',null,{operation:'generate'});previewList.replaceChildren();for(const item of items){if(!item.url)continue;const choose=button('',()=>{previewId=item.id;notice.textContent='Preview selected';for(const b of previewList.children)b.setAttribute('aria-pressed',String(b===choose));});const image=node('img');image.src=item.url;image.alt=item.prompt||'Your creation';image.loading='lazy';choose.append(image);previewList.append(choose);}if(!items.length)notice.textContent='Create an image first to use it as a preview.';}catch(e){notice.textContent=e.message;}}),previewList,notice);const save=node('button','studio-primary','Save style');save.type='submit';box.append(save);const d=openSheet(style?'Edit style':'Create a style',box);
 box.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await signedIn();const entry={id:style?.id||crypto.randomUUID(),name:name.value.trim(),prompt:prompt.value.trim(),favorite:style?.favorite||false,preview_job_id:previewId};if(!entry.name||!entry.prompt)throw Error('Enter a name and style prompt.');await persist([...saved().filter(s=>s.id!==entry.id),entry]);d.close();stylesSheet('saved');}catch(e){notice.textContent=e.message;}finally{save.disabled=false;}};
}

let styleCatalog=null,styleCatalogLoading=null;
const styleMediaCache=new Map();
async function loadStyleCatalog(){
 if(styleCatalog)return styleCatalog;
 if(styleCatalogLoading)return styleCatalogLoading;
 styleCatalogLoading=(async()=>{
  if(!state.client)throw Error('Styles are temporarily unavailable.');
  const {data,error}=await state.client.from('loox_template_styles').select('*').order('name');
  if(error)throw error;
  const samples=await state.client.from('loox_template_catalog').select('id,styles,style,media_path').eq('active',true).eq('kind','image').not('media_path','is',null).limit(60);
  const records=(data||[]).map(s=>({
   ...s,preview_template_id:!samples.error?samples.data?.find(t=>t.style===s.name||t.styles?.includes(s.name))?.id:null
  }));
  styleCatalog=records;return records;
 })();
 try{return await styleCatalogLoading;}finally{styleCatalogLoading=null;}
}
function stylePreview(kind,id){
 const key=(kind==='saved'?(state.user?.id||'guest')+':':'public:')+kind+':'+id;
 const cached=styleMediaCache.get(key);
 if(cached&&cached.until>Date.now())return cached.promise;
 const promise=kind==='explore'
  ?fetch('https://looxtoolfree-backend.vercel.app/api/loox?'+new URLSearchParams({action:'public_media',type:'template',id,variant:'preview'}),{credentials:'omit'}).then(r=>r.ok?r.json():null).then(data=>data?.url||null)
  :api('status',null,{id}).then(result=>result?.url||null);
 const guarded=promise.catch(()=>null);
 styleMediaCache.set(key,{promise:guarded,until:Date.now()+180000});
 return guarded;
}
async function stylesSheet(initialTab='explore'){
 const box=node('div','studio-stack studio-style-browser');
 const tabs=node('nav','studio-tabs studio-style-tabs');
 tabs.setAttribute('aria-label','Style collections');
 const list=node('div','studio-style-grid');
 const notice=node('p','studio-style-notice');
 notice.setAttribute('role','status');
 const create=button('＋ Create style',()=>editStyle(),'studio-button studio-create-style');
 box.append(tabs,create,list,notice);
 const dialog=openSheet('Styles',box);
 let tab=initialTab,request=0;
 const choices=[['Explore Styles','explore'],['My Saved Styles','saved'],['Favorites','favorites']];
 const tabButtons=new Map();
 for(const [label,key] of choices){
  const trigger=button(label,()=>showTab(key),'studio-button');
  trigger.dataset.tab=key;trigger.setAttribute('aria-pressed','false');
  trigger.setAttribute('aria-controls','studio-style-results');
  tabs.append(trigger);tabButtons.set(key,trigger);
 }
 list.id='studio-style-results';
 const available=()=>dialog.open&&dialog.isConnected;
 function addPreview(card,style){
  const kind=style.preview_template_id?'explore':style.preview_job_id?'saved':null;
  const id=style.preview_template_id||style.preview_job_id;
  if(!kind||!id)return;
  const frame=node('div','studio-style-preview');
  frame.setAttribute('aria-label','Style preview');
  card.prepend(frame);
  const observer=new IntersectionObserver(items=>{
   if(!items.some(item=>item.isIntersecting))return;
   observer.disconnect();
   stylePreview(kind,id).then(url=>{
    if(!url||!frame.isConnected)return;
    const img=node('img');img.alt=style.name+' style example';img.loading='lazy';img.decoding='async';
    img.onerror=()=>{img.remove();};
    img.src=url;frame.append(img);
   });
  },{root:dialog.querySelector('.loox-sheet-body')||null,rootMargin:'140px'});
  observer.observe(frame);
 }
 function render(records,active){
  if(!available())return;
  list.replaceChildren();
  notice.textContent=records.length?'':active==='explore'?'No published styles yet.':'No saved styles in this collection yet.';
  for(const s of records){
   const card=node('article','studio-style-card');
   const prompt=s.prompt||s.style_prompt||s.description||s.name;
   const apply=button(s.name,()=>{
    if(!prompt){notify('This style has no reusable prompt.');return;}
    selectedStyle={id:s.id,name:s.name,prompt};
    const clear=$('.studio-clear-style');if(clear)clear.hidden=false;
    const trigger=$('.studio-style-trigger');if(trigger)trigger.textContent='✧ '+s.name;
    notify(s.name+' selected');dialog.close();
   },'studio-style-apply');
   card.append(apply);
   addPreview(card,s);
   const actions=node('div','studio-style-actions');
   if(active==='explore'){
    const savedMatch=saved().find(x=>x.name===s.name&&x.prompt===prompt);
    const save=button(savedMatch?.favorite?'★ Saved':'☆ Save',async()=>{
     try{
      const previous=saved().find(x=>x.name===s.name&&x.prompt===prompt);
      const next=previous?saved().map(x=>x.id===previous.id?{...x,favorite:!x.favorite}:x):
       [...saved(),{id:crypto.randomUUID(),name:s.name,prompt,favorite:true,preview_job_id:null}];
      await persist(next);await showTab('explore');
     }catch(error){notify(error.message);}
    },'studio-button');
    actions.append(save);
   }else{
    actions.append(
     button('Edit',()=>editStyle(s),'studio-button'),
     button(s.favorite?'★':'☆',async()=>{
      try{await persist(saved().map(x=>x.id===s.id?{...x,favorite:!x.favorite}:x));await showTab(tab);}
      catch(error){notify(error.message);}
     },'studio-button'),
     button('Duplicate',async()=>{
      try{await persist([...saved(),{...s,id:crypto.randomUUID(),name:s.name+' copy'}]);await showTab(tab);}
      catch(error){notify(error.message);}
     },'studio-button'),
     button('Delete',async()=>{
      if(!confirm('Delete “'+s.name+'”?'))return;
      try{await persist(saved().filter(x=>x.id!==s.id));if(selectedStyle?.id===s.id)selectedStyle=null;await showTab(tab);}
      catch(error){notify(error.message);}
     },'studio-button')
    );
   }
   card.append(actions);list.append(card);
  }
 }
 async function showTab(next){
  tab=next;
  const version=++request;
  for(const [key,btn] of tabButtons)btn.setAttribute('aria-pressed',String(key===next));
  // Keep the same open sheet and cached results: tab switches must not reopen dialogs.
  if(next==='explore'&&styleCatalog&&savedOwner===state.user?.id){render(styleCatalog,next);return;}
  if(next!=='explore'&&savedOwner===state.user?.id){render(next==='favorites'?saved().filter(s=>s.favorite):saved(),next);return;}
  list.replaceChildren(node('div','studio-style-loading','Loading styles…'));
  notice.textContent='';
  try{
   await initialize({publicAccess:true});
   const [_,catalog]=await Promise.all([loadSaved(),next==='explore'?loadStyleCatalog():Promise.resolve(null)]);
   if(version!==request||!available())return;
   render(next==='explore'?catalog:next==='favorites'?saved().filter(s=>s.favorite):saved(),next);
  }catch(error){if(version===request&&available()){list.replaceChildren();notice.textContent=error.message||'Styles could not load.';}}
 }
 await showTab(initialTab);
}

function settingsSheet(prefix){
 const controls=$('.loox-uc-controls');if(!controls)return;const ratio=document.getElementById(prefix+'-ratio');if(ratio)ratio.tabIndex=0;
 // Move the actual fields, preserving their values, validation and listeners.
 moveIntoSheet('Prompt settings',controls);
}
function assetsSheet(prefix){
 const input=document.getElementById(prefix==='lig'?'lig-reference-image':'lvg-image');if(!input)return;
 const box=node('div','studio-stack'),tabs=node('nav','studio-tabs'),list=node('div','studio-assets'),notice=node('p'),search=node('input');search.type='search';search.placeholder='Search assets';search.setAttribute('aria-label','Search assets');
 let selected=null,epoch=0,tab='uploads';const footer=node('div','studio-tabs'),select=button('Select image',async()=>{if(!selected)return;select.disabled=true;try{const original=await api('status',null,{id:selected.id});if(!original.url)throw Error('Original image is unavailable.');const response=await fetch(original.url,{credentials:'omit'});if(!response.ok)throw Error('Image could not be loaded.');const blob=await response.blob();if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>2400000)throw Error('Choose an image under 2.4 MB.');const transfer=new DataTransfer();transfer.items.add(new File([blob],'creation-'+selected.id,{type:blob.type}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));d.close();}catch(e){notice.textContent=e.message;}finally{select.disabled=!selected;}},'studio-primary');select.disabled=true;
 box.append(tabs,search,list,notice,footer);const d=openSheet('Add a reference',box);footer.append(button('Cancel',()=>d.close()),select);
 const filter=()=>{const query=search.value.trim().toLowerCase();for(const item of list.children)if(item.dataset.name)item.hidden=!item.dataset.name.includes(query);};search.oninput=filter;
 const updateTabs=()=>{[...tabs.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));selected=null;select.disabled=true;};
 const upload=()=>{++epoch;tab='uploads';updateTabs();list.replaceChildren(button('＋ Upload image',()=>{d.close();input.click();},'studio-upload'));notice.textContent='JPG, PNG or WebP · up to 2.4 MB. References are uploaded when you generate.';
 const files=prefix==='lig'?(window.__looxFluxReferences?.()||[]):[...input.files];for(const [index,file] of files.entries()){const item=node('div','studio-stack'),image=node('img'),url=URL.createObjectURL(file);image.src=url;image.alt=file.name;image.onload=()=>URL.revokeObjectURL(url);item.dataset.name=file.name.toLowerCase();item.append(image,node('small','',file.name),button('Remove',()=>{if(prefix==='lig')document.querySelectorAll('.loox-ref-remove')[index]?.click();else{input.value='';input.dispatchEvent(new Event('change',{bubbles:true}));}upload();}));list.append(item);}filter();};
 const creations=async()=>{const version=++epoch;tab='creations';updateTabs();list.replaceChildren();notice.textContent='Loading your creations…';try{const {items}=await api('gallery',null,{operation:'generate'});if(version!==epoch||!d.open)return;notice.textContent=items.length?'Choose an image, then tap Select image.':'No generated images yet.';for(const item of items){if(!item.url)continue;const b=button('',()=>{selected=item;select.disabled=false;for(const other of list.children)other.setAttribute('aria-pressed',String(other===b));});b.dataset.name=(item.prompt||'Your creation').toLowerCase();b.setAttribute('aria-label',item.prompt||'Your creation');b.setAttribute('aria-pressed','false');const img=node('img');img.src=item.url;img.alt=item.prompt||'Your creation';img.loading='lazy';b.append(img);list.append(b);}filter();}catch(e){notice.textContent=e.message;}};
 const uploadedButton=button('Uploaded Assets',upload);uploadedButton.dataset.tab='uploads';const creationsButton=button('My Creations',creations);creationsButton.dataset.tab='creations';tabs.append(uploadedButton,creationsButton);upload();
}
function enableCompactComposerOnScroll(){
 const composer=document.querySelector('.lig-compose-wrap, .ai-composer-wrap');
 if(!composer)return;
 const body=document.body,targets=[window,...document.querySelectorAll('.lig-content-scroll,.ai-thread')];
 const positions=new WeakMap();
 let lastWindowY=window.scrollY,travel=0,settleUntil=0;
 const setCompact=next=>{
  if(body.classList.contains('loox-uc-scroll-compact')===next)return;
  body.classList.toggle('loox-uc-scroll-compact',next);
  settleUntil=performance.now()+230;
 };
 const hasInputFocus=()=>!!document.activeElement?.matches('textarea,input:not([type=file]),select');
 const onScroll=target=>{
  if(performance.now()<settleUntil)return;
  const y=target===window?window.scrollY:target.scrollTop;
  const last=target===window?lastWindowY:(positions.get(target)??y);
  if(target===window)lastWindowY=y;else positions.set(target,y);
  if(y<65||hasInputFocus()||document.querySelector('dialog.loox-sheet[open]')){
   travel=0;setCompact(false);return;
  }
  const delta=y-last;
  if(Math.abs(delta)<1||Math.abs(delta)>180)return;
  if(Math.sign(delta)!==Math.sign(travel))travel=delta;else travel+=delta;
  if(travel>24){setCompact(true);travel=0;}
  else if(travel< -20){setCompact(false);travel=0;}
 };
 for(const target of targets)target.addEventListener('scroll',()=>onScroll(target),{passive:true});
 document.addEventListener('focusin',e=>{if(e.target.closest('.lig-compose-wrap,.ai-composer-wrap'))setCompact(false);});
 composer.addEventListener('pointerdown',()=>setCompact(false),{passive:true});
}
function run(){
 document.body.classList.add('loox-studio');
 enableCompactComposerOnScroll();
 const header=$('header.lig-header');if(header){
 const menuHost=node('div','studio-menu-host'),menu=node('div','studio-menu');menu.hidden=true;menu.setAttribute('role','menu');
 const trigger=button('•••',()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));},'studio-menu-trigger');trigger.setAttribute('aria-label','More workspace actions');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
 const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
 for(const [label,href] of [['My Creations','?view=creations#generate'],['Templates','templates.html'],['Help','help.html'],['Account','account.html']]){const a=node('a','',label);a.href=href;a.setAttribute('role','menuitem');if(label==='My Creations')a.onclick=e=>{e.preventDefault();close();const target=$('.lig-results')||$('#aiRecentPanel');target?.scrollIntoView({block:'start',behavior:'smooth'});};menu.append(a);}
 if(!document.body.classList.contains('ai-chat'))menu.prepend(button('Settings',()=>{close();settingsSheet(document.body.classList.contains('lvg-body')?'lvg':'lig');}),button('Saved Styles',()=>{close();stylesSheet('saved');}));
 menuHost.append(trigger,menu);header.insertBefore(menuHost,header.querySelector('.lig-header-user'));document.addEventListener('pointerdown',e=>{if(!menuHost.contains(e.target))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 }
 const video=document.body.classList.contains('lvg-body'),chat=document.body.classList.contains('ai-chat'),prefix=video?'lvg':'lig';
 if(chat){const thread=$('#aiThread'),welcome=node('div','studio-heading studio-assistant-welcome');welcome.append(node('span','studio-eyebrow','LOOX AI ASSISTANT'),node('h1','','A little help. A bigger idea.'),node('p','','Write, explore, and work through your next idea.'));thread?.before(welcome);if(thread){const sync=()=>welcome.hidden=!!thread.querySelector('.ai-msg');new MutationObserver(sync).observe(thread,{childList:true,subtree:true});sync();}const trigger=$('#aiModelButton'),menu=$('#aiModelMenu');if(trigger&&menu){let modelSheet;menu.addEventListener('click',e=>{if(e.target.closest('[data-model]'))modelSheet?.close();});trigger.addEventListener('click',()=>{menu.hidden=false;modelSheet=moveIntoSheet('Assistant model',menu);modelSheet.addEventListener('close',()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');});});}return;}
 const wrap=document.getElementById(prefix+'-compose-wrap'),main=$('.lig-main'),card=$('.lig-compose-card'),prompt=document.getElementById(prefix+'-prompt');if(!wrap||!card)return;
 const measure=()=>document.documentElement.style.setProperty('--studio-composer-height',wrap.getBoundingClientRect().height+'px');new ResizeObserver(measure).observe(wrap);measure();
 const viewport=window.visualViewport;const syncViewport=()=>{const focused=!!document.activeElement?.matches('textarea,input:not([type=file])');document.documentElement.style.setProperty('--studio-keyboard-inset',(focused&&viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0)+'px');if(viewport)document.documentElement.style.setProperty('--studio-viewport-height',viewport.height+'px');};viewport?.addEventListener('resize',syncViewport);viewport?.addEventListener('scroll',syncViewport);document.addEventListener('focusin',syncViewport);document.addEventListener('focusout',syncViewport);syncViewport();
 const library=$('.loox-start-templates');if(library){main.prepend(library);library.querySelector('h2').textContent='Find your next idea';}
 const nav=$('.loox-uc-links');if(nav)main.prepend(nav);
 const heading=node('div','studio-heading');heading.append(node('span','studio-eyebrow','LOOX CREATIVE STUDIO'),node('h1','',video?'Ideas in motion.':'Make room for imagination.'),node('p','',video?'Turn a scene into your next story.':'Start with an idea. Make it unmistakably yours.'));if(library)library.prepend(heading);

 // Creations and searchable templates are different views, not a long stacked page.
 const resultsView=document.getElementById(prefix+'-generate-view');
 if(library&&resultsView){
  const switcher=node('nav','studio-content-switcher');
  switcher.setAttribute('aria-label','Creative workspace');
  const createButton=button('Creations',()=>showContent('create',true),'studio-content-tab');
  const exploreButton=button('Explore templates',()=>showContent('explore',true),'studio-content-tab');
  switcher.append(createButton,exploreButton);
  if(nav)nav.after(switcher);else library.before(switcher);
  const intro=node('div','studio-generation-intro');
  intro.append(node('h2','',video?'Your videos':'Your images'),
    button('Explore templates',()=>showContent('explore',true),'studio-explore-shortcut'));
  const empty=node('div','studio-creations-empty');
  empty.append(node('strong','',video?'Your video creations appear here':'Your image creations appear here'),
   node('p','','Start with a prompt or find inspiration in templates.'),
   button('Explore templates',()=>showContent('explore',true),'studio-empty-explore'));
  const feed=document.getElementById(prefix+'-results');
  if(feed){
   feed.before(intro,empty);
   const refreshEmpty=()=>{empty.hidden=!!feed.querySelector('.lig-output,.loox-session-loading,.lig-skeleton');};
   new MutationObserver(refreshEmpty).observe(feed,{childList:true});
   refreshEmpty();
  }
  function showContent(view,scroll=false){
   const explore=view==='explore';
   if(!explore&&location.hash==='#templates')location.hash='generate';
   document.body.classList.toggle('studio-explore-view',explore);
   document.body.classList.toggle('studio-create-view',!explore);
   createButton.setAttribute('aria-pressed',String(!explore));
   exploreButton.setAttribute('aria-pressed',String(explore));
   if(scroll)switcher.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  }
  document.addEventListener('loox:session-open',()=>{showContent('create');if(matchMedia('(max-width:900px)').matches)document.body.classList.add('loox-uc-scroll-compact');});
  document.addEventListener('loox:session-new',()=>{showContent('create');document.body.classList.remove('loox-uc-scroll-compact');});
  showContent('create');
 }
 const toolbar=$('.loox-uc-toolbar');if(toolbar)card.prepend(toolbar);
 const quick=node('div','studio-quick');quick.append(button('Model',()=>{const trigger=$('.loox-model-trigger');if(trigger)trigger.click();else settingsSheet(prefix);},'studio-button studio-model-trigger'),button('☷ Settings',()=>settingsSheet(prefix)),button('✧ Styles',()=>stylesSheet(),'studio-button studio-style-trigger'));
 const clear=button('Clear style',()=>{selectedStyle=null;$('.studio-clear-style').hidden=true;$('.studio-style-trigger').textContent='✧ Styles';notify('Style removed');});const modelField=document.getElementById(prefix+'-model');const modelChip=quick.querySelector('.studio-model-trigger');const syncModelChip=()=>{modelChip.textContent=modelField?.selectedOptions[0]?.textContent||'Model';modelChip.title=modelChip.textContent;};modelField?.addEventListener('change',syncModelChip);syncModelChip();
 clear.classList.add('studio-clear-style');clear.hidden=!selectedStyle;quick.append(clear);card.append(quick);const cost=document.getElementById(prefix+'-credit-cost');if(cost){cost.classList.add('studio-credit-cost');card.append(cost);}
 const add=document.getElementById(video?'loox-uc-video-add':'lig-reference-quick-add');if(add)add.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();assetsSheet(prefix);},true);
 // Compose style for this request only; restore the main prompt immediately afterwards.
 const form=document.getElementById(prefix+'-compose');form.addEventListener('submit',e=>{if(!selectedStyle)return;const original=prompt.value,text=selectedStyle.prompt;const combined=original.includes(text)?original:original.trim()+', '+text;if(combined.length>prompt.maxLength){e.preventDefault();e.stopImmediatePropagation();notify('Prompt and style exceed '+prompt.maxLength+' characters.');return;}prompt.value=combined;queueMicrotask(()=>{prompt.value=original;});},true);

 if(video){
  const upload=document.getElementById('lvg-image-block'),file=document.getElementById('lvg-image');
  const feed=document.getElementById('lvg-results');
  if(upload&&file){
   const area=node('section','studio-frame-strip');
   area.setAttribute('aria-label','Video frames');
   const heading=node('div','studio-frame-heading');
   const title=node('strong','','Frames');
   const shots=button('Shots',()=>openShots(),'studio-shots-button');
   heading.append(title,shots);
   const row=node('div','studio-frame-row');
   const thumb=button('',()=>assetsSheet('lvg'),'studio-frame-thumb');
   thumb.setAttribute('aria-label','Choose a start frame');
   const image=node('img');image.alt='Selected start frame';image.hidden=true;
   const placeholder=node('span','studio-frame-placeholder','▧');
   thumb.append(image,placeholder);
   const description=node('div','studio-frame-text');
   const label=node('strong','','Start frame');
   const hint=node('small','','Optional on this model');
   description.append(label,hint);
   const choose=button('Add frame',()=>assetsSheet('lvg'),'studio-frame-change');
   const remove=button('×',()=>{file.value='';file.dispatchEvent(new Event('change',{bubbles:true}));},'studio-frame-clear');
   remove.setAttribute('aria-label','Remove start frame');
   row.append(thumb,description,choose,remove);
   area.append(heading,row);
   card.insertBefore(area,prompt);
   let objectUrl=null;
   const sync=()=>{
    const supported=!upload.hidden&&!file.disabled,selected=file.files?.[0]||null;
    area.classList.toggle('studio-frame-unavailable',!supported);
    thumb.disabled=choose.disabled=!supported;
    choose.textContent=!supported?'Unavailable':selected?'Replace':'Add frame';
    hint.textContent=!supported?'Use an image-to-video model':file.required?'Required by selected model':selected?'Ready for the next shot':'Optional on this model';
    label.textContent='Start frame';
    remove.hidden=!selected;
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
    if(selected){objectUrl=URL.createObjectURL(selected);image.src=objectUrl;}
    else image.removeAttribute('src');
    image.hidden=!selected;placeholder.hidden=!!selected;
   };
   file.addEventListener('change',sync);
   new MutationObserver(sync).observe(upload,{attributes:true,attributeFilter:['hidden']});
   new MutationObserver(sync).observe(file,{attributes:true,attributeFilter:['disabled','required']});
   window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);},{once:true});
   sync();
   const entries=()=>[...(feed?.querySelectorAll('.lig-output[data-entry][data-media-type="video"]')||[])];
   const durationFor=card=>{
    const meta=card.querySelector('.loox-generation-meta')?.textContent||'';
    const seconds=meta.match(/(?:^| · )(\d+) seconds(?: · |$)/);
    return seconds?Number(seconds[1]):meta.includes('33 frames')?2:0;
   };
   const filmSummary=()=>{
    const cards=entries();
    const total=cards.filter(entry=>!!entry.querySelector('video')).reduce((sum,entry)=>sum+durationFor(entry),0);
    shots.textContent='Shots '+cards.length;
    shots.setAttribute('aria-label',cards.length+' video shots in this session');
    return {cards,total};
   };
   const watcher=new MutationObserver(filmSummary);
   if(feed)watcher.observe(feed,{childList:true,subtree:true});
   filmSummary();
   function openShots(){
    const {cards,total}=filmSummary();
    const box=node('div','studio-shots-sheet');
    box.append(node('p','studio-shots-note',cards.length?
     cards.length+' shot'+(cards.length===1?'':'s')+(total?' · approximately '+total+' seconds completed':'')+' in this session. Each generation is billed separately. Clips are not automatically stitched together.':
     'Create your first video to build a sequence of shots.'));
    for(let index=0;index<cards.length;index++){
     const clip=cards[index];
     const r=node('div','studio-shot-row');
     const pic=node('div','studio-shot-number',String(index+1));
     const text=node('div','studio-shot-copy');
     const prompt=clip.querySelector('.lig-output-name')?.textContent||'Video shot';
     text.append(node('strong','',prompt.slice(0,80)),node('small','',clip.querySelector('video')?(durationFor(clip)?durationFor(clip)+'s ready':'Video ready'):'Processing / unavailable'));
     const jump=button('View',()=>{d.close();document.body.classList.remove('loox-uc-scroll-compact');clip.scrollIntoView({behavior:'smooth',block:'center'});},'studio-button');
     const continueBtn=clip.querySelector('.studio-continue-shot');
     if(continueBtn)r.append(pic,text,jump,button('Continue',()=>{d.close();continueBtn.click();},'studio-button'));
     else r.append(pic,text,jump);
     box.append(r);
    }
    const d=openSheet('Video shots',box);
   }
  }
 }
 // The true wallet and per-generation quote remain in the original account
 // elements. Mirror them in a compact, live budget row with no guessed prices.
 const balanceSource=document.getElementById(prefix+'-credits');
 const priceSource=document.getElementById(prefix+'-credit-cost');
 if(balanceSource&&priceSource){
  const bar=node('div','studio-budget');
  bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');
  const costText=node('span','studio-budget-cost');
  const balanceText=node('span','studio-budget-balance');
  const remainderText=node('span','studio-budget-after');
  const link=node('a','studio-budget-link','Credits');
  link.href='account.html#credits';
  bar.append(costText,balanceText,remainderText,link);
  card.append(bar);
  const sync=()=>{
   const costMatch=priceSource.textContent.match(/(\d+)\s+credits on success/);
   const balanceMatch=balanceSource.textContent.match(/^(\d+)\s+credits/);
   const charge=costMatch?Number(costMatch[1]):null;
   const balance=balanceMatch?Number(balanceMatch[1]):null;
   const estimated=video&&/refreshes before generation/i.test(priceSource.textContent);
   costText.textContent=charge===null?'Checking cost…':(estimated?'Est. ':'')+charge+' credit'+(charge===1?'':'s')+' / shot';
   balanceText.textContent=balance===null?'Balance: '+(state.user?'Loading…':'Sign in'):'Balance: '+balance;
   remainderText.textContent=balance===null||charge===null?'':balance>=charge?'After: '+(balance-charge):'Need '+(charge-balance)+' more';
   remainderText.hidden=balance===null||charge===null;
  };
  for(const source of [balanceSource,priceSource])new MutationObserver(sync).observe(source,{childList:true,subtree:true,characterData:true});
  document.addEventListener('loox-account',sync);document.addEventListener('loox-user',sync);
  sync();
 }

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);
