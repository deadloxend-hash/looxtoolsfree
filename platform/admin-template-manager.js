import {state,initialize,auth,api} from './account.js?v=12';
const root=document.getElementById('template-manager');
const E=(tag,cls='',txt='')=>{const x=document.createElement(tag);x.className=cls;x.textContent=txt;return x};
const note=E('p','community-note'),grid=E('div','loox-preset-grid'),form=E('form','community-admin-editor');
let editing=null,oldPath=null,items=[];
const heading=E('h2','','Image & video template manager');
const intro=E('p','community-note','Upload real image/video previews with prompts. Publish, edit, unpublish or delete templates. Only administrators can make changes.');
const fields={};
function field(label,tag='input',type='text'){const wrap=E('label','community-field',label),el=E(tag);if(tag==='input')el.type=type;wrap.append(el);form.append(wrap);return el;}
fields.title=field('Template title');fields.title.required=true;fields.title.maxLength=120;
fields.kind=field('Template type','select');for(const x of ['image','video'])fields.kind.add(new Option(x==='image'?'Image template':'Video template',x));
fields.category=field('Category','select');fields.category.required=true;
const categoryBar=E('div','community-post-actions'),newCategory=E('input'),addCategory=E('button','community-button','+ Create category'),removeCategory=E('button','community-button','Delete selected category');
newCategory.placeholder='New category name (e.g. Cyberpunk)';newCategory.maxLength=70;newCategory.setAttribute('aria-label','New category name');addCategory.type='button';removeCategory.type='button';categoryBar.append(newCategory,addCategory,removeCategory);form.append(categoryBar);
async function categories(selected=''){const {data,error}=await state.client.from('loox_template_categories').select('name').order('name');if(error)throw error;fields.category.replaceChildren(new Option('Select a category',''));for(const row of data)fields.category.add(new Option(row.name,row.name));if(selected)fields.category.value=selected;}
const styleField=E('div','community-field'),styleLabel=E('strong','','Styles (select one or more)');
const styleChoices=E('div','loox-admin-style-options'),styleHint=E('p','community-note','Select every matching style. A template can appear under Photography, Vintage, Retro and more.');
styleField.append(styleLabel,styleHint,styleChoices);form.append(styleField);
let selectedStyles=new Set();
function selectedStyleNames(){return [...selectedStyles];}
function drawStyleChoices(names){styleChoices.replaceChildren();for(const name of names){const label=E('label','loox-admin-style-choice'),box=E('input');box.type='checkbox';box.value=name;box.checked=selectedStyles.has(name);box.onchange=()=>{if(box.checked)selectedStyles.add(name);else selectedStyles.delete(name);};label.append(box,document.createTextNode(' '+name));styleChoices.append(label);}}

const styleBar=E('div','community-post-actions'),newStyle=E('input'),addStyle=E('button','community-button','+ Create style'),removeStyle=E('button','community-button','Delete selected style');
newStyle.placeholder='New style name (e.g. Film Photography)';newStyle.maxLength=70;newStyle.setAttribute('aria-label','New style name');addStyle.type='button';removeStyle.type='button';styleBar.append(newStyle,addStyle,removeStyle);form.append(styleBar);
async function styles(selected=null){const {data,error}=await state.client.from('loox_template_styles').select('name').order('name');if(error)throw error;const names=(data||[]).map(x=>x.name);if(selected!==null)selectedStyles=new Set(Array.isArray(selected)?selected:(selected?[selected]:[]));selectedStyles=new Set([...selectedStyles].filter(name=>names.includes(name)));drawStyleChoices(names);}
addStyle.onclick=async()=>{if(!isAdmin())return fail(Error('Administrator access required.'));const name=newStyle.value.trim();if(!name)return fail(Error('Enter a style name.'));addStyle.disabled=true;try{const {error}=await state.client.from('loox_template_styles').insert({name});if(error)throw error;selectedStyles.add(name);await styles();newStyle.value='';note.textContent='Style created. You can now assign it to templates.';}catch(e){fail(e);}finally{addStyle.disabled=false;}};
removeStyle.onclick=async()=>{if(!isAdmin())return fail(Error('Administrator access required.'));const names=selectedStyleNames();if(names.length!==1)return fail(Error('Select exactly one style to delete.'));const name=names[0];removeStyle.disabled=true;try{const {data,error}=await state.client.from('loox_template_catalog').select('id').contains('styles',[name]).limit(1);if(error)throw error;if(data.length)throw Error('Remove this style from templates before deleting it.');if(!confirm('Delete style '+name+'?'))return;const res=await state.client.from('loox_template_styles').delete().eq('name',name);if(res.error)throw res.error;await styles();note.textContent='Style deleted.';}catch(e){fail(e);}finally{removeStyle.disabled=false;}};
addCategory.onclick=async()=>{const name=newCategory.value.trim();if(!name)return fail(Error('Enter a category name.'));try{const {error}=await state.client.from('loox_template_categories').insert({name});if(error)throw error;await categories(name);newCategory.value='';note.textContent='Category created. You can now assign templates to it.';}catch(e){fail(e);}};
removeCategory.onclick=async()=>{const name=fields.category.value;if(!name)return;const {data,error}=await state.client.from('loox_template_catalog').select('id').eq('category',name).limit(1);if(error)return fail(error);if(data.length)return fail(Error('Move templates out of this category before deleting it.'));if(!confirm('Delete category '+name+'?'))return;const res=await state.client.from('loox_template_categories').delete().eq('name',name);if(res.error)return fail(res.error);await categories();};
fields.prompt=field('Generation prompt','textarea');fields.prompt.required=true;fields.prompt.maxLength=1200;fields.prompt.rows=4;
fields.description=field('Short description','textarea');fields.description.rows=2;
fields.model=field('Model ID (optional)');
fields.ratio=field('Aspect ratio (optional, e.g. 16:9)');
fields.media=field('Reference photo or video','input','file');fields.media.accept='image/jpeg,image/png,image/webp,video/mp4,video/webm';
fields.active=field('Published','input','checkbox');fields.active.checked=true;
const buttons=E('div','community-post-actions'),save=E('button','community-primary','Publish template'),cancel=E('button','community-button','Clear / New');
save.type='submit';cancel.type='button';buttons.append(save,cancel);form.append(buttons);
const review=E('a','community-button','Review user submissions');review.href='loox-template-admin.html';
const toolbar=E('div','community-post-actions'),refresh=E('button','community-button','Refresh templates');refresh.type='button';toolbar.append(review,refresh);
root.append(heading,intro,form,note,toolbar,grid);
const fail=e=>note.textContent=e?.message||String(e);
function clear(){editing=null;oldPath=null;form.reset();selectedStyles.clear();styleChoices.querySelectorAll('input').forEach(x=>x.checked=false);fields.active.checked=true;fields.media.required=true;save.textContent='Publish template';note.textContent='New template ready.';}
cancel.onclick=clear;
function isAdmin(){return state.user?.app_metadata?.loox_template_admin===true||state.user?.app_metadata?.loox_template_admin==='true';}
async function uploadTemplateMedia(file,kind){
 if(kind==='video'){
  if(file.type!=='video/mp4')throw Error('R2 template videos must be MP4 files.');
  if(file.size>40_000_000)throw Error('R2 template videos must be under 40 MB.');
  const prepared=await api('r2_media',{purpose:'template_video_prepare',bytes:file.size});
  if(!prepared.upload_url||!prepared.path)throw Error('Could not prepare the private video upload.');
  const stored=await fetch(prepared.upload_url,{method:'PUT',headers:{'Content-Type':'video/mp4'},
   body:file,signal:AbortSignal.timeout(120000),redirect:'error'});
  if(!stored.ok)throw Error('R2 did not accept the video. Please retry.');
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  const sha256=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  return api('r2_media',{purpose:'template_video_complete',path:prepared.path,sha256});
 }
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>16_000_000)
  throw Error('Choose a PNG, JPG or WebP image up to 16 MB.');
 const prepared=await api('r2_media',{purpose:'template_image_prepare',content_type:file.type,bytes:file.size});
 if(!prepared.upload_url||!prepared.path)throw Error('Could not prepare the original image upload.');
 const stored=await fetch(prepared.upload_url,{method:'PUT',headers:{'Content-Type':file.type},
  body:file,signal:AbortSignal.timeout(120000),redirect:'error'});
 if(!stored.ok)throw Error('R2 did not accept the original image. Please retry.');
 const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 const sha256=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 return api('r2_media',{purpose:'template_image_complete',path:prepared.path,sha256});
}
async function load(){grid.replaceChildren();if(!isAdmin()){note.textContent='Sign in with your LOOX template administrator account.';form.hidden=true;return;}form.hidden=false;note.textContent='Loading templates…';
try{const {data,error}=await state.client.from('loox_template_catalog').select('*').order('created_at',{ascending:false}).limit(500);if(error)throw error;items=data;for(const t of data){const card=E('article','loox-preset-card'),art=E('div','loox-preset-art'),body=E('div','loox-preset-body'),actions=E('div','community-post-actions');if(t.media_path){const media=document.createElement(t.kind==='video'?'video':'img');
if(t.media_provider==='r2'){
 if(t.active){
  fetch('https://looxtoolfree-backend.vercel.app/api/loox?'+new URLSearchParams({action:'public_media',type:'template',id:t.id,variant:'preview'}),{credentials:'omit'})
   .then(response=>{if(!response.ok)throw Error('Preview unavailable');return response.json()})
   .then(data=>{if(media.isConnected&&data.url)media.src=data.url})
   .catch(()=>{if(media.isConnected)media.alt='R2 preview temporarily unavailable';});
 }else media.alt='Unpublished R2 template; publish to preview';
}else media.src=state.client.storage.from('loox-templates').getPublicUrl(t.media_path).data.publicUrl;if(t.kind==='video'){media.controls=true;media.preload='metadata';}else media.loading='lazy';media.style.cssText='width:100%;aspect-ratio:4/3;object-fit:cover';art.append(media);}else art.textContent='No preview uploaded';
body.append(E('h3','',t.title),E('p','community-note',t.category+' · '+((t.styles?.length?t.styles:[t.style].filter(Boolean)).join(', ')||'No style')+' · '+t.kind+' · '+(t.active?'Published':'Unpublished')),E('p','community-note',(t.prompt||'').slice(0,130)));
const edit=E('button','community-button','Edit'),toggle=E('button','community-button',t.active?'Unpublish':'Publish'),del=E('button','community-button','Delete');for(const b of [edit,toggle,del])b.type='button';
edit.onclick=async()=>{editing=t.id;oldPath=t.media_path;fields.title.value=t.title||'';fields.kind.value=t.kind||'image';await categories(t.category||'');await styles(t.styles?.length?t.styles:(t.style||''));fields.prompt.value=t.prompt||'';fields.description.value=t.description||'';fields.model.value=t.model_id||'';fields.ratio.value=t.settings?.aspect_ratio||'';fields.active.checked=!!t.active;fields.media.value='';fields.media.required=false;save.textContent='Save changes';form.scrollIntoView({behavior:'smooth',block:'start'});};
toggle.onclick=async()=>{toggle.disabled=true;try{const {error}=await state.client.from('loox_template_catalog').update({active:!t.active,updated_at:new Date().toISOString()}).eq('id',t.id);if(error)throw error;await load();}catch(e){fail(e);toggle.disabled=false;}};
del.onclick=async()=>{if(!confirm('Delete this template? This cannot be undone.'))return;del.disabled=true;try{const {error}=await state.client.from('loox_template_catalog').delete().eq('id',t.id);if(error)throw error;await load();}catch(e){fail(e);del.disabled=false;}};
actions.append(edit,toggle,del);body.append(actions);card.append(art,body);grid.append(card);}note.textContent=data.length+' template(s) found.';}catch(e){fail(e);}}
form.onsubmit=async ev=>{ev.preventDefault();if(!isAdmin())return fail(Error('Administrator access required.'));save.disabled=true;note.textContent='Saving template…';let uploaded=null;
try{const file=fields.media.files[0],kind=fields.kind.value;if(file)uploaded=await uploadTemplateMedia(file,kind);
if(!editing&&!uploaded)throw Error('Upload a reference photo or video.');
const old=items.find(t=>t.id===editing),settings={...(old?.settings||{})};if(old&&old.kind!==kind&&!uploaded)throw Error('Upload a matching image or MP4 when changing template type.');if(fields.ratio.value.trim())settings.aspect_ratio=fields.ratio.value.trim();else delete settings.aspect_ratio;
const chosenStyles=selectedStyleNames();if(!chosenStyles.length)throw Error('Select at least one style.');const data={title:fields.title.value.trim(),kind,category:fields.category.value.trim(),style:chosenStyles[0],styles:chosenStyles,prompt:fields.prompt.value.trim(),description:fields.description.value.trim(),model_id:fields.model.value.trim()||null,settings,media_path:uploaded?.path||oldPath||null,media_provider:uploaded?'r2':old?.media_provider||null,media_key:uploaded?.path||old?.media_key||null,thumbnail_key:uploaded?(uploaded.thumbnail_key||null):(old?.thumbnail_key||null),media_type:kind,active:fields.active.checked,updated_at:new Date().toISOString()};
const result=editing?await state.client.from('loox_template_catalog').update(data).eq('id',editing):await state.client.from('loox_template_catalog').insert({...data,id:'admin-'+crypto.randomUUID(),author:'LOOX AI',license:'LOOX original'});if(result.error)throw result.error;
// Existing objects are intentionally preserved during this migration.
clear();await load();note.textContent='Template saved successfully.';}catch(e){// Do not delete existing R2 or legacy objects on a failed metadata update.
fail(e);}finally{save.disabled=false;}};
refresh.onclick=load;
await initialize({publicAccess:true}).catch(fail);if(isAdmin()){await categories().catch(fail);await styles().catch(fail);}await load();document.addEventListener('loox-user',async()=>{if(isAdmin()){await categories().catch(fail);await styles().catch(fail);}await load();});
