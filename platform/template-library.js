import {state,auth,initialize} from './account.js?v=9';
import {element as e,action as a,result,rpc} from './community.js?v=4';
const root=document.getElementById('template-library'),workflow=location.pathname.endsWith('workflows.html');
let kind='image',category='',query='',offset=0,epoch=0,style='';
const heading=e('div','loox-gallery-heading'),title=e('h1','',workflow?'Workflow starters':'Explore Templates'),subtitle=e('p','','Explore original LOOX creations. Choose a template to reuse its prompt in the AI generator.');
heading.append(title,subtitle);
const search=e('input','loox-gallery-search');search.type='search';search.placeholder='Search templates...';search.setAttribute('aria-label','Search templates');
const filters=e('div','loox-gallery-filters'),types=e('div','loox-gallery-types');
for(const [label,value] of [['Image','image'],['Video','video'],['Saved','saved']]){const b=a(label,()=>{kind=value;offset=0;updateTypes();load(true)},'loox-gallery-chip');b.dataset.type=value;types.append(b);}
function updateTypes(){types.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===kind)));}
updateTypes();
const cat={value:''},styles={value:''};
const catButton=e('button','loox-gallery-chip loox-dropdown-trigger','All categories⌄'),styleButton=e('button','loox-gallery-chip loox-dropdown-trigger','All styles⌄');catButton.type='button';styleButton.type='button';
let categoryOptions=[],styleOptions=['Anime','Cinematic','Realistic','Retro','Fantasy','Surrealism','3D'];
const menu=e('div','loox-custom-menu');menu.hidden=true;menu.setAttribute('role','listbox');document.body.append(menu);
let openButton=null;
function closeMenu(){menu.hidden=true;openButton?.setAttribute('aria-expanded','false');openButton=null;}
function showMenu(button,values,selected,onPick,allLabel){if(openButton===button){closeMenu();return;}closeMenu();openButton=button;button.setAttribute('aria-expanded','true');menu.replaceChildren();
for(const value of ['',...values]){const label=value||allLabel;const item=e('button','loox-custom-option',label);item.type='button';item.setAttribute('role','option');item.setAttribute('aria-selected',String(value===selected));item.append(e('span','loox-option-check',value===selected?'✓':''));item.onclick=()=>{onPick(value);button.textContent=(value||allLabel)+'⌄';closeMenu();load(true);};menu.append(item);}
const rect=button.getBoundingClientRect();menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-280))+'px';menu.style.top=Math.min(rect.bottom+8,innerHeight-120)+'px';menu.style.width=Math.min(320,innerWidth-24)+'px';menu.hidden=false;}
catButton.onclick=()=>showMenu(catButton,categoryOptions,cat.value,v=>{cat.value=v;category=v;},'All categories');
styleButton.onclick=()=>showMenu(styleButton,styleOptions,styles.value,v=>{styles.value=v;style=v;},'All styles');
document.addEventListener('pointerdown',ev=>{if(!menu.hidden&&!menu.contains(ev.target)&&ev.target!==openButton)closeMenu();});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeMenu();});
window.addEventListener('scroll',closeMenu,true);window.addEventListener('resize',closeMenu);
const reset=a('Clear filters',()=>{cat.value='';styles.value='';search.value='';category='';style='';query='';catButton.textContent='All categories⌄';styleButton.textContent='All styles⌄';closeMenu();load(true)},'loox-gallery-chip');
filters.append(types,catButton,styleButton,reset);
const section=e('div','loox-gallery-section'),label=e('h2','','Discover creations'),grid=e('div','loox-gallery-grid'),notice=e('p','community-note'),more=a('Load more',()=>load(false),'community-more',err=>notice.textContent=err.message);section.append(label,grid,notice,more);
root.replaceChildren(search,filters,heading,section);
async function categories(){const rows=result(await state.client.from('loox_template_categories').select('name').order('name'));categoryOptions=rows.map(t=>t.name);if(cat.value&&!categoryOptions.includes(cat.value)){cat.value='';category='';catButton.textContent='All categories⌄';}}
let debounce;search.oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{query=search.value.trim();load(true)},220);};
function media(t){const box=e('div','loox-gallery-media');if(t.media_path){const url=state.client.storage.from('loox-templates').getPublicUrl(t.media_path).data.publicUrl;const m=document.createElement(t.kind==='video'?'video':'img');m.src=url;if(t.kind==='video'){m.muted=true;m.loop=true;m.playsInline=true;m.preload='metadata';m.onmouseenter=()=>m.play().catch(()=>{});m.onmouseleave=()=>m.pause();}else{m.loading='lazy';m.alt=t.title;}box.append(m);}return box;}
function launch(t){sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:t.kind,prompt:t.prompt,model:t.model_id,settings:t.settings}));if(state.user)rpc(state,'loox_launch_template',{p_template:t.id}).catch(()=>{});location.assign(t.kind==='video'?'ai-video-generator.html#generate':'ai-text-to-image.html#generate');}
function details(t){const overlay=e('div','loox-template-overlay'),panel=e('div','loox-template-detail'),back=a('← Back',()=>overlay.remove(),'loox-gallery-chip'),visual=media(t),info=e('div','loox-template-info'),h=e('h2','',t.title),meta=e('p','',t.category+' · '+t.kind),description=e('p','',t.description||''),prompt=e('p','loox-template-prompt',t.prompt),copy=a('Copy prompt',()=>navigator.clipboard.writeText(t.prompt).catch(()=>{}),'loox-gallery-chip'),recreate=a('Recreate this',()=>launch(t),'loox-recreate');info.append(h,meta,description,prompt,copy,recreate);panel.append(back,visual,info);overlay.append(panel);overlay.onclick=ev=>{if(ev.target===overlay)overlay.remove()};document.body.append(overlay);}
function card(t){const card=e('article','loox-gallery-card'),art=media(t),caption=e('div','loox-gallery-caption'),h=e('h3','',t.title),meta=e('small','',t.category),btn=a('Recreate this',()=>details(t),'loox-recreate');caption.append(h,meta);art.append(btn);card.append(art,caption);card.onclick=ev=>{if(ev.target!==btn)details(t)};return card;}
async function load(reset){const turn=++epoch;if(reset){offset=0;grid.replaceChildren();}notice.textContent='Loading templates…';more.hidden=true;try{if(kind==='saved'&&!state.user){notice.textContent='Sign in to view saved templates.';return;}
let q=state.client.from('loox_template_catalog').select('id,title,description,prompt,kind,category,model_id,settings,media_path').eq('active',true).not('media_path','is',null).order('created_at',{ascending:false});
if(kind!=='saved')q=q.eq('kind',kind);
if(category)q=q.eq('category',category);if(style)q=q.ilike('category','%'+style+'%');if(query)q=q.ilike('title','%'+query.replace(/[\\%_]/g,'')+'%');
if(kind==='saved'){const saved=result(await state.client.from('loox_saved_templates').select('template_id').eq('user_id',state.user.id).limit(500));if(!saved.length){notice.textContent='No saved templates yet.';return;}q=q.in('id',saved.map(x=>x.template_id));}
const rows=result(await q.range(offset,offset+19));if(turn!==epoch)return;for(const t of rows)grid.append(card(t));offset+=rows.length;more.hidden=rows.length<20;notice.textContent=grid.children.length?'':'No templates yet. New creations will appear here soon.';}catch(err){if(turn===epoch)notice.textContent=err.message;}}
await initialize({publicAccess:true});await categories().catch(err=>notice.textContent=err.message);await load(true);document.addEventListener('loox-user',()=>load(true));
