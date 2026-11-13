import {openSheet} from './workspace-sheet.js';
/* Shared LOOX model picker: icon-led provider groups, credits, search and favorites.
   Native <select> stays the source of truth for generation, keyboard and form handling. */
const NS='http://www.w3.org/2000/svg';
const iconPaths={
 zimage:'<path d="M4 5h16v3L8 18h12v2H4v-3L16 7H4z"/>',
 flux:'<path d="M6 17.6 12 3l6 14.6M8 12.2h8M3 20h18" />',
 banana:'<path d="M18.3 4.3c1 8.6-4.5 15-12.3 15.2-2.2 0-3.3-1.3-3.5-2.6 5.4 1.1 12.2-3.8 13.4-11.7l2.4-.9Z"/><path d="m16.2 4.7 1-2.1 2.2.6"/>',
 ideogram:'<path d="M7 5h10v14H7z"/><path d="M11 9h2v6h-2"/>',
 stability:'<path d="M4 9c0-4 16-4 16 0s-16 4-16 8 16 4 16 0"/><path d="M8 12h8"/>',
 seedream:'<path d="M12 3c-4 3-6 5-6 9a6 6 0 0 0 12 0c0-4-2-6-6-9Z"/><path d="M8 15c2-4 5-6 8-7"/>',
 openai:'<path d="M10 3 5 6v6l-2 2 3 5 6 2 5-3 4-6-2-6-6-3-3 4-3 6 6 4 5-3"/><path d="m6 12 6-4 6 4"/>',
 qwen:'<path d="M12 3 3 12l9 9 9-9-9-9Z"/><path d="m8 12 4 4 4-4-4-4-4 4"/>',
 hidream:'<path d="M5 5v14m14-14v14M5 12h14"/><path d="M9 8h6v8H9z"/>',
 imagen:'<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m5 17 5-5 3 3 3-4 3 6"/>',
 photon:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
 wan:'<path d="m3 8 4 9 5-9 5 9 4-9"/><path d="M5 5h14"/><path d="M5 20h14"/>',
 kling:'<circle cx="12" cy="12" r="8"/><path d="m7 6 5 6-5 6M16 6l-5 6 5 6"/>',
 seedance:'<path d="M4 6v12M9 3v18M14 6v12M19 3v18"/><path d="M4 12h15"/>',
 veo:'<path d="M3 5 12 20 21 5"/><path d="m7 5 5 9 5-9"/>',
 runway:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m9 8 7 4-7 4z"/>',
 fluxvideo:'<path d="M5 4h14v16H5z"/><path d="m10 8 6 4-6 4z"/><path d="M3 8v8M21 8v8"/>'

};
const glyphs={z_image_turbo:'zimage',flux:'flux',flux2_klein_local_edit:'flux',bfl_flux2_pro:'flux',bfl_klein_4b:'flux',replicate_flux_ultra:'flux',
 google_nano_2:'banana',google_nano_pro:'banana',ideogram_p_image:'ideogram',ideogram_45:'ideogram',
 stability_sd35:'stability',stability_ultra:'stability',byteplus_45:'seedream',byteplus_50_flash:'seedream',
 openai_gpt_image:'openai',replicate_qwen2:'qwen',replicate_hidream:'hidream',replicate_imagen4:'imagen',replicate_photon:'photon',kling_40:'kling',kling_40_flash:'kling',seedance_25:'seedance',seedance_20_fast:'seedance',veo_31:'veo',veo_31_lite:'veo',grok_video:'photon',minimax_h3:'seedance',minimax_h3_lite:'seedance',luma_ray2:'photon',sora_2:'openai',kling_30:'kling',seedance_20:'seedance',veo_31_fast:'veo',runway_45:'runway',flux3_video:'fluxvideo'};
const palettes={zimage:'#b29aff',flux:'#aa8bff',banana:'#f4ca5c',ideogram:'#f78aa1',stability:'#90c4ff',
 seedream:'#9dd4fa',openai:'#a4e4bf',qwen:'#c0a3ff',hidream:'#f7a9c6',imagen:'#97dcf0',photon:'#efc3a7',wan:'#a7bfff',kling:'#80cbd7',seedance:'#8fa9ff',veo:'#f1be84',runway:'#dba3d2',fluxvideo:'#baa2fa'};
const groupsImage=[
 {name:'Z-Image Turbo',provider:'LOOX Studio',ids:['z_image_turbo']},
 {name:'FLUX',provider:'Black Forest Labs',ids:['flux','flux2_klein_local_edit','bfl_flux2_pro','bfl_klein_4b','replicate_flux_ultra']},
 {name:'Nano Banana',provider:'Google AI',ids:['google_nano_2','google_nano_pro']},
 {name:'Seedream',provider:'BytePlus',ids:['byteplus_45','byteplus_50_flash']},
 {name:'Ideogram',provider:'Ideogram',ids:['ideogram_p_image','ideogram_45']},
 {name:'Stable Diffusion',provider:'Stability AI',ids:['stability_sd35','stability_ultra']},
 {name:'GPT Image',provider:'OpenAI',ids:['openai_gpt_image']},
 {name:'Other creative models',provider:'Replicate',ids:['replicate_qwen2','replicate_hidream','replicate_imagen4','replicate_photon']}
];
const groupsVideo=[
 {name:'Wan 2.1',provider:'LOOX Studio',ids:['wan21']},
 {name:'Wan 2.2',provider:'Text & image generation',ids:['wan22_5b_fast','wan22_t2v_fast','wan22_i2v_fast']},
 {name:'Wan 2.5',provider:'Image to video',ids:['wan25_i2v']},
 {name:'Wan 2.6',provider:'Image to video',ids:['wan26_i2v_flash']},
 {name:'Kling',provider:'Kuaishou · Cinematic video',ids:['kling_40','kling_40_flash','kling_30']},
 {name:'Seedance',provider:'ByteDance · Creative video',ids:['seedance_25','seedance_20_fast','seedance_20']},
 {name:'Veo',provider:'Google · Video generation',ids:['veo_31','veo_31_fast','veo_31_lite']},
 {name:'Runway',provider:'Runway · Video production',ids:['runway_45']},
 {name:'FLUX Video',provider:'Black Forest Labs · Video generation',ids:['flux3_video']},
 {name:'Grok Imagine',provider:'xAI · Native audio',ids:['grok_video']},
 {name:'MiniMax',provider:'MiniMax · Character motion',ids:['minimax_h3','minimax_h3_lite']},
 {name:'Wan 3.0',provider:'Alibaba · Text and image to video',ids:['wan_30']},
 {name:'Luma',provider:'Luma AI · Cinematic motion',ids:['luma_ray2']},
 {name:'Sora',provider:'OpenAI · Provider unavailable',ids:['sora_2']}
];
function node(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
}
function svgIcon(type,size=21){
 const el=document.createElementNS(NS,'svg');
 el.setAttribute('viewBox','0 0 24 24');el.setAttribute('width',String(size));
 el.setAttribute('height',String(size));el.setAttribute('fill','none');
 el.setAttribute('stroke','currentColor');el.setAttribute('stroke-width','1.8');
 el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');
 el.setAttribute('aria-hidden','true');
 el.innerHTML=iconPaths[type]||iconPaths.wan;
 return el;
}
function starIcon(){
 const el=document.createElementNS(NS,'svg');el.setAttribute('viewBox','0 0 24 24');
 el.setAttribute('width','17');el.setAttribute('height','17');el.setAttribute('fill','none');
 el.setAttribute('stroke','currentColor');el.setAttribute('stroke-width','1.8');
 el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');
 el.setAttribute('aria-hidden','true');
 el.innerHTML='<path d="m12 2.8 2.85 5.75 6.35.92-4.6 4.48 1.08 6.32L12 17.29l-5.68 2.98 1.08-6.32L2.8 9.47l6.35-.92L12 2.8Z"/>';
 return el;
}
function chevron(){const el=document.createElementNS(NS,'svg');el.setAttribute('viewBox','0 0 24 24');el.setAttribute('width','15');el.setAttribute('height','15');el.setAttribute('fill','none');el.setAttribute('stroke','currentColor');el.setAttribute('stroke-width','2');el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');el.innerHTML='<path d="m6 9 6 6 6-6"/>';el.setAttribute('aria-hidden','true');return el;}
export function mountModelPicker({native,root,mode='image',getInfo=()=>({})}){
 if(!native||!root)return null;
 const storageKey='loox-favorite-'+mode+'-models-v1';
 const modelOptions=[...native.options];
 const known=new Set(modelOptions.map(o=>o.value));
 const readFavorites=()=>{try{const list=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(list)?list.filter(id=>known.has(id)):[]}catch{return []}};
 let favorites=readFavorites();
 const info=id=>getInfo(id)||{};
 root.classList.add('loox-model-picker');root.dataset.modelPicker=mode;
 const trigger=node('button','loox-model-trigger');trigger.type='button';
 trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 trigger.setAttribute('aria-label','Choose '+mode+' model');
 const face=node('span','loox-model-trigger-face'),text=node('span','loox-model-trigger-title');
 const route=node('span','loox-model-trigger-route');route.hidden=true;
 const caret=chevron();caret.classList.add('loox-model-caret');trigger.append(face,text,route,caret);
 const panel=node('div','loox-model-panel');panel.hidden=true;
 panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Choose '+mode+' model');
 const searchBox=node('div','loox-model-search-box');
 const glass=node('span','loox-model-magnifier');glass.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>';
 const search=node('input','loox-model-search');search.type='search';search.placeholder='Search models or creators';
 search.setAttribute('aria-label','Search models');searchBox.append(glass,search);
 const list=node('div','loox-model-scroll');panel.append(searchBox,list);
 root.replaceChildren(trigger,panel);
 const grouped=mode==='video'?groupsVideo:groupsImage;
 const describe=id=>info(id).name||modelOptions.find(o=>o.value===id)?.textContent.trim()||id;
 const badgeType=id=>glyphs[id]||'wan';
 function icon(id){
  const type=badgeType(id),badge=node('span','loox-model-icon');
  badge.style.setProperty('--model-accent',palettes[type]);badge.append(svgIcon(type));
  // Unique variation for individual models, including models sharing one family.
  badge.dataset.variant=id;return badge;
 }
 let sheet;
 function close(){if(sheet?.open){sheet.close();return;}panel.hidden=true;trigger.setAttribute('aria-expanded','false');root.classList.remove('is-open');}
 function sync(){
  const selected=native.value,model=info(selected);
  face.replaceChildren(icon(selected));
  text.textContent=describe(selected);
  const code=mode==='image'&&['flux','z_image_turbo'].includes(selected)&&/^(A8|B8)$/.test(model.code||'')?model.code:'';
  route.textContent=code;route.hidden=!code;route.dataset.code=code;
  trigger.disabled=native.disabled;
  trigger.title=describe(selected)+' · '+(model.cost??'—')+' credits';
  list.querySelectorAll('[data-model-value]').forEach(el=>el.classList.toggle('is-selected',el.dataset.modelValue===selected));
 }
 function makeRow(id){
  const model=info(id),row=node('div','loox-model-row');row.dataset.modelValue=id;
  const select=node('button','loox-model-choice');select.type='button';
  select.setAttribute('role','option');select.setAttribute('aria-selected',String(native.value===id));
  const main=node('span','loox-model-copy');
  const nameLine=node('span','loox-model-name-line');
  nameLine.append(node('strong','loox-model-name',describe(id)));
  const code=mode==='image'&&['flux','z_image_turbo'].includes(id)&&/^(A8|B8)$/.test(model.code||'')?model.code:'';
  if(code){const routeCode=node('small','loox-model-route-code',code);routeCode.dataset.code=code;nameLine.append(routeCode)}
  main.append(nameLine);
  const description=node('span','loox-model-description',model.description||(mode==='video'?'Creative video generation':'AI image generation'));
  main.append(description);
  if(model.status==='coming_soon'||model.status==='temporarily_unavailable'){
   const statusLabel=model.status==='coming_soon'?'Coming soon':'Temporarily unavailable';
   main.append(node('span','loox-model-status',statusLabel));
  }
  const price=node('span','loox-model-cost',(model.cost??'—')+' credits');
  const state=model.status||'';
  if(state==='coming_soon'||state==='temporarily_unavailable')price.classList.add('is-muted');
  const specs=[...(model.resolutions||[]),...(model.durationOptions||model.durations||[]).map(v=>v+'s')];
  if(specs.length)main.append(node('small','loox-model-specs',specs.join(' · ')));
  select.disabled=['coming_soon','temporarily_unavailable'].includes(model.status);
  select.append(icon(id),main,price);
  select.addEventListener('click',()=>{if(native.disabled)return;native.value=id;native.dispatchEvent(new Event('change',{bubbles:true}));sync();close();trigger.focus()});
  const favorite=node('button','loox-model-favorite');favorite.type='button';favorite.append(starIcon());
  favorite.setAttribute('aria-label',(favorites.includes(id)?'Remove ':'Add ')+describe(id)+(favorites.includes(id)?' from favorites':' to favorites'));
  favorite.setAttribute('aria-pressed',String(favorites.includes(id)));
  favorite.classList.toggle('is-favorite',favorites.includes(id));
  favorite.addEventListener('click',()=>{
   favorites=favorites.includes(id)?favorites.filter(f=>f!==id):[id,...favorites];
   try{localStorage.setItem(storageKey,JSON.stringify(favorites))}catch{}
   render();
  });
  row.append(select,favorite);return row;
 }
 function section(name,description,ids,kind=''){
  if(!ids.length)return;
  const section=node('section','loox-model-section'+(kind?' '+kind:''));
  const heading=node('div','loox-model-heading');
  heading.append(node('strong','loox-model-heading-title',name));
  if(description)heading.append(node('small','loox-model-heading-subtitle',description));
  section.append(heading);
  for(const id of ids)section.append(makeRow(id));
  list.append(section);
 }
 function render(){
  const query=search.value.trim().toLowerCase();list.replaceChildren();
  const matches=id=>{
   const m=info(id);const g=grouped.find(g=>g.ids.includes(id));
   return !query||[describe(id),m.description,g?.name,g?.provider].join(' ').toLowerCase().includes(query);
  };
  const fav=favorites.filter(matches);
  if(fav.length)section('Favorites','Your saved models',fav,'loox-model-favorites');
  for(const group of grouped){
   const ids=group.ids.filter(id=>known.has(id)&&matches(id));
   section(group.name,group.provider,ids);
  }
  const groupedIds=new Set(grouped.flatMap(g=>g.ids));
  const extra=modelOptions.map(o=>o.value).filter(id=>!groupedIds.has(id)&&matches(id));if(extra.length)section('More models','LOOX catalog',extra);
  if(!list.children.length)list.append(node('p','loox-model-empty','No matching models'));
  sync();
 }
 trigger.addEventListener('click',()=>{
  if(native.disabled)return;
  panel.hidden=false;search.value='';render();root.classList.add('is-open');trigger.setAttribute('aria-expanded','true');
  sheet=openSheet('Choose '+mode+' model',panel,{onClose:()=>{panel.hidden=true;root.append(panel);root.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');sheet=null;}});
 });
 search.addEventListener('input',render);
 panel.addEventListener('loox-model-cost-change',render);
 native.addEventListener('change',()=>{sync();list.querySelectorAll('[data-model-value] .loox-model-choice').forEach(b=>b.setAttribute('aria-selected',String(b.closest('[data-model-value]').dataset.modelValue===native.value)))});
 new MutationObserver(sync).observe(native,{attributes:true,attributeFilter:['disabled']});
 document.addEventListener('pointerdown',e=>{if(!root.contains(e.target)&&!panel.contains(e.target)&&!sheet?.contains(e.target))close()});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!panel.hidden){close();trigger.focus()}
 });
 panel.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target===search){const first=list.querySelector('.loox-model-choice');if(first)first.click()}});
 render();return {render,close,sync};
}
