import {openSheet,moveIntoSheet} from './workspace-sheet.js';
import {state,initialize,auth,api} from './account.js?v=9';
const $=s=>document.querySelector(s),node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,cls='studio-button')=>{const b=node('button',cls,text);b.type='button';b.onclick=fn;return b;};
function notify(text){let n=$('.studio-toast');if(!n){n=node('p','studio-toast');n.setAttribute('role','status');document.body.append(n);}n.textContent=text;clearTimeout(notify.timer);notify.timer=setTimeout(()=>n.remove(),4000);}
async function signedIn(){await initialize();if(!state.user){auth();throw Error('Sign in to save styles.');}}
let savedCache=[],savedOwner=null;
const saved=()=>savedOwner===state.user?.id?savedCache:[];
async function loadSaved(){if(!state.user){savedCache=[];savedOwner=null;return;}const {data,error}=await state.client.from('loox_user_styles').select('id,name,prompt,favorite,preview_job_id').eq('user_id',state.user.id).order('created_at',{ascending:false});if(error)throw error;savedCache=data||[];savedOwner=state.user.id;}
async function persist(styles){await signedIn();if(styles.length>20)throw Error('You can save up to 20 styles.');const ids=new Set(styles.map(x=>x.id));for(const old of saved()){if(!ids.has(old.id)){const {error}=await state.client.from('loox_user_styles').delete().eq('id',old.id).eq('user_id',state.user.id);if(error)throw error;}}
 if(styles.length){const {error}=await state.client.from('loox_user_styles').upsert(styles.map(s=>({id:s.id,user_id:state.user.id,name:s.name,prompt:s.prompt,favorite:!!s.favorite,preview_job_id:s.preview_job_id||null})));if(error)throw error;}savedCache=styles;savedOwner=state.user.id;notify('Styles saved');}
let selectedStyle=null;
function editStyle(style){
 const box=node('form','studio-stack'),name=node('input'),prompt=node('textarea'),notice=node('p');name.placeholder='Style name';name.setAttribute('aria-label','Style name');name.maxLength=60;name.required=true;name.value=style?.name||'';prompt.placeholder='Reusable style prompt';prompt.setAttribute('aria-label','Reusable style prompt');prompt.maxLength=500;prompt.required=true;prompt.value=style?.prompt||'';
 let previewId=style?.preview_job_id||null;
 const previewList=node('div','studio-assets');box.append(name,prompt,button('Choose preview from My Creations',async()=>{try{await signedIn();const {items}=await api('gallery',null,{operation:'generate'});previewList.replaceChildren();for(const item of items){if(!item.url)continue;const choose=button('',()=>{previewId=item.id;notice.textContent='Preview selected';for(const b of previewList.children)b.setAttribute('aria-pressed',String(b===choose));});const image=node('img');image.src=item.url;image.alt=item.prompt||'Your creation';image.loading='lazy';choose.append(image);previewList.append(choose);}if(!items.length)notice.textContent='Create an image first to use it as a preview.';}catch(e){notice.textContent=e.message;}}),previewList,notice);const save=node('button','studio-primary','Save style');save.type='submit';box.append(save);const d=openSheet(style?'Edit style':'Create a style',box);
 box.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await signedIn();const entry={id:style?.id||crypto.randomUUID(),name:name.value.trim(),prompt:prompt.value.trim(),favorite:style?.favorite||false,preview_job_id:previewId};if(!entry.name||!entry.prompt)throw Error('Enter a name and style prompt.');await persist([...saved().filter(s=>s.id!==entry.id),entry]);d.close();stylesSheet('saved');}catch(e){notice.textContent=e.message;}finally{save.disabled=false;}};
}
async function stylesSheet(tab='explore'){
 const box=node('div','studio-stack'),tabs=node('nav','studio-tabs'),list=node('div','studio-style-grid'),notice=node('p');
 box.append(tabs,list,notice);openSheet('Styles',box);
 for(const [label,key] of [['Explore Styles','explore'],['My Saved Styles','saved'],['Favorites','favorites']]){const b=button(label,()=>stylesSheet(key));b.setAttribute('aria-pressed',String(key===tab));tabs.append(b);}
 box.append(button('＋ Create a style',()=>editStyle()));
 try{await initialize({publicAccess:true});await loadSaved();let records=saved();if(tab==='explore'){if(!state.client){notice.textContent='Styles are unavailable. Please try again.';return;}const {data,error}=await state.client.from('loox_template_styles').select('*').order('name');if(error)throw error;records=data||[];const samples=await state.client.from('loox_template_catalog').select('id,styles,style,media_path').eq('active',true).eq('kind','image').not('media_path','is',null).limit(60);if(!samples.error)records=records.map(s=>({...s,preview_template_id:samples.data.find(t=>t.style===s.name||t.styles?.includes(s.name))?.id}));}if(tab==='favorites')records=records.filter(x=>x.favorite);
 if(!records.length)notice.textContent=tab==='explore'?'No published styles yet.':'No saved styles here yet.';
 for(const s of records){const card=node('article','studio-style-card');if(s.preview_template_id){const image=node('img');image.alt=s.name+' style preview';image.loading='lazy';image.hidden=true;card.append(image);const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();const params=new URLSearchParams({action:'public_media',type:'template',id:s.preview_template_id,variant:'preview'});fetch('https://looxtoolfree-backend.vercel.app/api/loox?'+params,{credentials:'omit'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.url&&card.isConnected){image.src=data.url;image.hidden=false;}}).catch(()=>{});});observer.observe(card);}if(s.preview_job_id){api('status',null,{id:s.preview_job_id}).then(item=>{if(!item.url||!card.isConnected)return;const image=node('img');image.src=item.url;image.alt=s.name;image.loading='lazy';card.prepend(image);}).catch(()=>{});}const apply=button(s.name,()=>{const text=s.prompt||s.style_prompt||s.description||s.name;if(!text){notify('This style has no reusable prompt. Choose a template with this style.');return;}selectedStyle={id:s.id,name:s.name,prompt:text};const clear=$('.studio-clear-style');if(clear)clear.hidden=false;notify(s.name+' selected');$('.studio-style-trigger')?.replaceChildren(document.createTextNode('✧ '+s.name));document.querySelector('dialog.loox-sheet')?.close();});card.append(apply);
 if(tab!=='explore'){card.append(button('Edit',()=>editStyle(s)),button(s.favorite?'★':'☆',async()=>{try{await persist(saved().map(x=>x.id===s.id?{...x,favorite:!x.favorite}:x));stylesSheet(tab);}catch(e){notify(e.message);}}),button('Duplicate',async()=>{try{await persist([...saved(),{...s,id:crypto.randomUUID(),name:s.name+' copy'}]);stylesSheet(tab);}catch(e){notify(e.message);}}),button('Delete',async()=>{if(!confirm('Delete “'+s.name+'”?'))return;try{await persist(saved().filter(x=>x.id!==s.id));if(selectedStyle?.id===s.id)selectedStyle=null;stylesSheet(tab);}catch(e){notify(e.message);}}));}
 list.append(card);}
 }catch(e){notice.textContent=e.message;}
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
function run(){
 document.body.classList.add('loox-studio');
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
 const toolbar=$('.loox-uc-toolbar');if(toolbar)card.prepend(toolbar);
 const quick=node('div','studio-quick');quick.append(button('Model',()=>{const trigger=$('.loox-model-trigger');if(trigger)trigger.click();else settingsSheet(prefix);},'studio-button studio-model-trigger'),button('☷ Settings',()=>settingsSheet(prefix)),button('✧ Styles',()=>stylesSheet(),'studio-button studio-style-trigger'));
 const clear=button('Clear style',()=>{selectedStyle=null;$('.studio-clear-style').hidden=true;$('.studio-style-trigger').textContent='✧ Styles';notify('Style removed');});const modelField=document.getElementById(prefix+'-model');const modelChip=quick.querySelector('.studio-model-trigger');const syncModelChip=()=>{modelChip.textContent=modelField?.selectedOptions[0]?.textContent||'Model';modelChip.title=modelChip.textContent;};modelField?.addEventListener('change',syncModelChip);syncModelChip();
 clear.classList.add('studio-clear-style');clear.hidden=!selectedStyle;quick.append(clear);card.append(quick);const cost=document.getElementById(prefix+'-credit-cost');if(cost){cost.classList.add('studio-credit-cost');card.append(cost);}
 const add=document.getElementById(video?'loox-uc-video-add':'lig-reference-quick-add');if(add)add.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();assetsSheet(prefix);},true);
 // Compose style for this request only; restore the main prompt immediately afterwards.
 const form=document.getElementById(prefix+'-compose');form.addEventListener('submit',e=>{if(!selectedStyle)return;const original=prompt.value,text=selectedStyle.prompt;const combined=original.includes(text)?original:original.trim()+', '+text;if(combined.length>prompt.maxLength){e.preventDefault();e.stopImmediatePropagation();notify('Prompt and style exceed '+prompt.maxLength+' characters.');return;}prompt.value=combined;queueMicrotask(()=>{prompt.value=original;});},true);
 if(video){
  const upload=document.getElementById('lvg-image-block');
  const file=document.getElementById('lvg-image');
  if(upload&&file){
   // One actual reference file is supported: don't advertise fake Frames/References modes.
   const area=node('section','studio-video-reference');
   const heading=node('div','studio-reference-heading');
   const title=node('strong','','Reference image');
   const hint=node('small','','Used by compatible image-to-video models.');
   heading.append(title,hint);
   const actions=node('div','studio-reference-actions');
   const add=button('＋ Add reference image',()=>assetsSheet(prefix),'studio-upload');
   const remove=button('Remove',()=>{
    file.value='';
    file.dispatchEvent(new Event('change',{bubbles:true}));
   },'studio-reference-remove');
   actions.append(add,remove);
   const preview=node('img','studio-reference-preview');
   preview.alt='Selected video reference image';preview.hidden=true;
   area.append(heading,actions,preview);
   card.before(area);
   let objectUrl=null;
   const syncReference=()=>{
    const supported=!upload.hidden&&!file.disabled;
    const selected=file.files?.[0]||null;
    area.classList.toggle('studio-reference-unavailable',!supported);
    add.disabled=!supported;
    add.textContent=!supported?'Reference unavailable for this model':selected?'Change reference image':'＋ Add reference image';
    hint.textContent=!supported?'Select an image-to-video model to enable references.':file.required?'Reference image required for the selected model.':'Reference image optional for this model.';
    remove.hidden=!selected;
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
    if(selected){objectUrl=URL.createObjectURL(selected);preview.src=objectUrl;}
    else preview.removeAttribute('src');
    preview.hidden=!selected;
   };
   file.addEventListener('change',syncReference);
   new MutationObserver(syncReference).observe(upload,{attributes:true,attributeFilter:['hidden']});
   new MutationObserver(syncReference).observe(file,{attributes:true,attributeFilter:['disabled','required']});
   window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);},{once:true});
   syncReference();
  }
 }

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);
