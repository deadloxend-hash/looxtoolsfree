import {Community} from './community.js?v=4';
import {mountModelPicker} from './loox-model-picker.js?v=6';
import {MediaSessions} from './loox-image-sessions.js?v=22';

import {state,config,api,auth,refresh,pricing,initialize} from './account.js?v=9';

const byId=id=>document.getElementById(id);
const create=(tag,cls,text)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mode=document.body.dataset.looxGenerator;
const storageDraft='loox-image-generator-draft-v2';
const ratios=new Set(['1:1','16:9','9:16','4:3','3:4']);

// The shared LOOX navigation drawer is owned by loox-experience.js.
// Keep its overlay aligned with the responsive generator header.
function syncSharedNavPosition(){
 const header=document.querySelector('.lig-header');
 if(header)document.documentElement.style.setProperty('--lig-ai-header-height',header.offsetHeight+'px');
}
syncSharedNavPosition();
window.addEventListener('resize',syncSharedNavPosition);
if('ResizeObserver' in window){
 const header=document.querySelector('.lig-header');
 if(header)new ResizeObserver(syncSharedNavPosition).observe(header);
}

function prepareLanding(){
 const form=byId('lig-landing-form'),prompt=byId('lig-landing-prompt');
 form?.addEventListener('submit',e=>{
  e.preventDefault();
  const text=prompt.value.trim();
  if(!text){prompt.focus();return;}
  if(text.length>1200){prompt.setCustomValidity('Prompt must be 1,200 characters or less.');prompt.reportValidity();return;}
  prompt.setCustomValidity('');
  try{sessionStorage.setItem(storageDraft,text);}catch{}
  location.assign('ai-image-workspace.html?start=1');
 });
 prompt?.addEventListener('input',()=>prompt.setCustomValidity(''));
}

if(mode==='landing')prepareLanding();
if(mode==='workspace')initWorkspace();

async function initWorkspace(){
 const form=byId('lig-compose'),promptField=byId('lig-prompt'),ratioField=byId('lig-ratio'),modelField=byId('lig-model');
 await config().catch(()=>{});
 const allModels=new Map((state.config?.models||[]).map(m=>[m.id,m]));
 const availableModels=new Map([...allModels].filter(([,m])=>m.available));
 const modelNote=document.querySelector('.lig-model-note');
 function modelStatus(id){
  if(id==='flux')return state.config?.local?.available?{label:'Available',reason:'The private LOOX GPU worker is online.'}:{label:'Temporarily Unavailable',reason:'The private GPU worker is offline. Try again when it reconnects.'};
  const m=allModels.get(id);
  return {label:m?.status==='available'?'Available':m?.status==='temporarily_unavailable'?'Temporarily Unavailable':'Coming Soon',
   reason:m?.reason||'Requires rotated credentials, provider billing and a verified generation.'};
 }
 const generateButton=byId('lig-generate'),message=byId('lig-message');
 const credits=byId('lig-credits'),creditCost=byId('lig-credit-cost');
 const results=byId('lig-results'),historyGrid=byId('lig-history-grid');
 const historyMore=byId('lig-history-more'),historyHeading=byId('lig-history-message');
 const generateView=byId('lig-generate-view'),templatesView=byId('lig-templates-view');
 // Branded, keyboard-accessible dropdowns instead of Android's full-screen select UI.
 const customDropdowns=[];
 function closeCustomDropdowns(except=null){
  for(const d of customDropdowns){
   if(d===except)continue;
   d.menu.hidden=true;d.trigger.setAttribute('aria-expanded','false');d.root.classList.remove('is-open');
  }
 }
 for(const root of document.querySelectorAll('[data-custom-select]')){
  const native=byId(root.dataset.customSelect);
  if(!native||native.id==='lig-model')continue;
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='lig-select-trigger';
  trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-label',native.id==='lig-model'?'Choose image model':'Choose aspect ratio');
  const value=document.createElement('span');value.className='lig-select-value';
  const arrow=document.createElement('span');arrow.className='lig-select-chevron';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');
  trigger.append(value,arrow);
  const menu=document.createElement('div');menu.className='lig-select-menu';menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label',trigger.getAttribute('aria-label'));menu.hidden=true;
  const dropdown={root,trigger,menu,native};
  customDropdowns.push(dropdown);
  const choices=[];
  const isModel=native.id==='lig-model';
  let search;
  if(isModel){
   search=create('input','lig-model-search');
   search.type='search';search.placeholder='Search 17 models or providers';
   search.setAttribute('aria-label','Search image models');
   menu.append(search);
  }
  for(const option of native.options){
   if(isModel&&option.parentElement?.tagName==='OPTGROUP'&&!menu.querySelector('[data-group="'+option.parentElement.label+'"]')){
    const group=create('div','lig-model-group',option.parentElement.label);
    group.dataset.group=option.parentElement.label;menu.append(group);
   }
   const item=document.createElement('button');item.type='button';item.className='lig-select-option';
   item.disabled=option.disabled;
   item.setAttribute('role','option');item.dataset.value=option.value;
   const label=document.createElement('span');label.className='lig-model-choice-name';label.textContent=option.textContent;
   const check=document.createElement('span');check.className='lig-select-check';check.textContent='✓';check.setAttribute('aria-hidden','true');
   if(isModel){
    const m=allModels.get(option.value);
    const detail=create('small','lig-model-choice-detail',m?.description||(id==='flux'?'Fast image generation on your private GPU':'Model details unavailable'));
    const status=modelStatus(option.value);
    const meta=create('small','lig-model-choice-meta',status.label+' · '+(m?.cost||3)+' credits');
    const body=create('span','lig-model-choice-body');body.append(label,detail,meta);
    item.append(body,check);
   }else item.append(label,check);
   menu.append(item);choices.push(item);
   item.addEventListener('click',()=>{
    if(option.disabled)return;
    native.value=option.value;native.dispatchEvent(new Event('change',{bubbles:true}));
    sync();closeCustomDropdowns();trigger.focus();
   });
  }
  if(search){
   search.addEventListener('input',()=>{
    const query=search.value.trim().toLocaleLowerCase();
    for(const item of choices){
     const m=allModels.get(item.dataset.value);
     item.hidden=Boolean(query)&&!(item.textContent+' '+(m?.provider||'LOOX Studio')).toLocaleLowerCase().includes(query);
    }
    for(const group of menu.querySelectorAll('.lig-model-group')){
     let next=group.nextElementSibling,shown=false;
     while(next&&!next.classList.contains('lig-model-group')){shown ||= !next.hidden;next=next.nextElementSibling;}
     group.hidden=!shown;
    }
   });
   menu.addEventListener('click',e=>{if(e.target===menu)search.focus()});
  }
  function sync(){
   value.textContent=native.selectedOptions[0]?.textContent||'Select';
   for(const item of choices)item.setAttribute('aria-selected',String(item.dataset.value===native.value));
   trigger.disabled=native.disabled;
  }
  trigger.addEventListener('click',()=>{
   if(native.disabled)return;
   const opening=menu.hidden;closeCustomDropdowns();
   menu.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));
   if(opening&&search){search.value='';search.dispatchEvent(new Event('input'));search.focus();}
   root.classList.toggle('is-open',opening);
  });
  trigger.addEventListener('keydown',e=>{
   if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){
    if(menu.hidden){e.preventDefault();trigger.click();choices.find(x=>x.dataset.value===native.value)?.focus()}
   }else if(e.key==='Escape'){closeCustomDropdowns()}
  });
  menu.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();closeCustomDropdowns();trigger.focus();return}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();const visible=choices.filter(item=>!item.disabled&&!item.hidden);
    const index=visible.indexOf(document.activeElement);
    if(visible.length)visible[(index+(e.key==='ArrowDown'?1:-1)+visible.length)%visible.length]?.focus();
   }
  });
  native.addEventListener('change',sync);
  new MutationObserver(sync).observe(native,{attributes:true,attributeFilter:['disabled']});
  root.append(trigger,menu);sync();
 }
 document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('[data-custom-select]'))closeCustomDropdowns();
 });
 const imageModelPicker=mountModelPicker({
  native:modelField,root:document.querySelector('[data-custom-select="lig-model"]'),
  mode:'image',getInfo:id=>{
   const m=allModels.get(id),status=modelStatus(id);
   return {...m,description:m?.description||(id==='flux'?'Fast image generation on your private GPU':'Model details unavailable'),
    cost:id==='flux'?(state.config?.operations?.find(op=>op.id==='generate')?.cost??3):(m?.cost??'—'),
    status:m?.status||status.label.toLowerCase().replaceAll(' ','_')};
  }
 });
 const composeWrap=byId('lig-compose-wrap');
 const mainWorkspace=composeWrap.parentElement,historySection=byId('lig-history-grid')?.closest('.lig-history');
 let isBusy=false,activeUser=null,historyOffset=0,historyLoading=false,autoRequest=false;
 let currentGenerationId=null;
 const sessions=new MediaSessions({state,api,auth,root:document.querySelector('.lig-main'),feed:results,prompt:promptField,notice:setMessage,isBusy:()=>isBusy,reuse:async entry=>{
  if(entry.media_type==='video'){location.assign('ai-video-generator.html?session='+sessions.id+'&reuse='+entry.id+'#generate');return;}
  const restoredModel=entry.model_id||(entry.model_name==='FLUX.1 Schnell'?'flux':null);
  if(restoredModel&&modelField.querySelector('option[value="'+restoredModel+'"]'))modelField.value=restoredModel;
  if(entry.ratio)ratioField.value=entry.ratio;
  modelField.dispatchEvent(new Event('change'));ratioField.dispatchEvent(new Event('change'));
  for(const [key,value] of Object.entries(entry.settings||{}))if(settingFields[key])settingFields[key].select.value=value;
  promptField.value=entry.prompt;await submit(entry.prompt,ratioField.value);
 }});
 const community=new Community({state,auth,initialize,root:byId('lig-public-templates')});
 const params=new URLSearchParams(location.search);
 let draft='';
 try {draft=sessionStorage.getItem(storageDraft)||'';} catch {}
 // Landing visits and legacy start links only stage a prompt; Generate confirms the paid request.
 autoRequest=false;
 if(draft)promptField.value=draft;
 let launch=null;try{launch=JSON.parse(sessionStorage.getItem('loox-creative-launch-v1')||'null');if(launch?.kind==='image'){promptField.value=launch.prompt||'';sessionStorage.removeItem('loox-creative-launch-v1');autoRequest=false;
  if(launch.settings?.aspect_ratio&&ratioField.querySelector('option[value="'+launch.settings.aspect_ratio+'"]')){ratioField.value=launch.settings.aspect_ratio;ratioField.dispatchEvent(new Event('change'));}
  if(launch.reference_id||launch.reference_path){(async()=>{const message=byId('lig-message');try{
   let url;
   if(launch.reference_id){
    if(!/^[a-z0-9-]{3,80}$/i.test(launch.reference_id))throw Error('Invalid template identifier.');
    const lookup=await fetch('https://looxtoolfree-backend.vercel.app/api/loox?'+new URLSearchParams({
     action:'public_media',type:'template',id:launch.reference_id,variant:'original'
    }),{credentials:'omit'});
    const resource=await lookup.json().catch(()=>({}));
    if(!lookup.ok||!resource.url)throw Error('Template reference is unavailable.');
    url=resource.url;
   }else{
    if(!/^[a-zA-Z0-9._/-]{1,250}$/.test(launch.reference_path)||launch.reference_path.includes('..'))throw Error('Invalid template image path.');
    url=state.client.storage.from('loox-templates').getPublicUrl(launch.reference_path).data.publicUrl;
   }
   const response=await fetch(url,{credentials:'omit'});if(!response.ok)throw Error('Template reference image is unavailable.');
   const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('This template does not contain an image.');
   const bitmap=await createImageBitmap(blob);const canvas=document.createElement('canvas');
   const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.84));if(!jpeg)throw Error('Could not prepare template image.');
   const file=new File([jpeg],'loox-template-reference.jpg',{type:'image/jpeg'});if(file.size>2400000)throw Error('Template image is too large to attach.');
   const input=byId('lig-reference-image');if(!input)throw Error('Reference image panel is unavailable.');
   const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   if(message)message.textContent='Template reference attached. Confirm image-use permission before generating.';
  }catch(error){if(message)message.textContent='Prompt loaded, but reference could not be attached: '+error.message;}})();}
 }}catch{}
 const templateEndpoint='https://looxtoolfree-backend.vercel.app/api/loox';
 async function templateRequest(action,body){
  const session=await state.client?.auth.getSession();
  const token=session?.data?.session?.access_token;
  if(!token)throw Error('Sign in to submit a template.');
  const response=await fetch(templateEndpoint+'?action=template_'+encodeURIComponent(action),{
   method:body?'POST':'GET',credentials:'omit',
   headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Template request failed.');
  return data;
 }
 function confirmTemplateSubmission(){
  return new Promise(resolve=>{
   const previousFocus=document.activeElement;
   const overlay=create('div','lig-template-confirm-overlay');
   const panel=create('section','lig-template-confirm-panel');
   panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
   panel.setAttribute('aria-labelledby','lig-template-confirm-title');
   panel.setAttribute('aria-describedby','lig-template-confirm-description');
   const heading=create('div','lig-template-confirm-heading');
   const mark=create('span','lig-template-confirm-mark','✦');mark.setAttribute('aria-hidden','true');
   const title=create('h2',null,'Submit as Template');title.id='lig-template-confirm-title';
   const close=create('button','lig-template-confirm-close','×');close.type='button';close.setAttribute('aria-label','Close dialog');
   heading.append(mark,title,close);
   const description=create('p','lig-template-confirm-description','Share your creation with the LOOX community. Your image and prompt will only become public after an administrator approves them.');
   description.id='lig-template-confirm-description';
   const note=create('div','lig-template-confirm-note');
   const noteIcon=create('span',null,'✓');noteIcon.setAttribute('aria-hidden','true');
   note.append(noteIcon,create('span',null,'Please submit only images and prompts you have the rights to share.'));
   const actions=create('div','lig-template-confirm-actions');
   const cancel=create('button','lig-template-confirm-cancel','Cancel');cancel.type='button';
   const submit=create('button','lig-template-confirm-submit','Submit for review');submit.type='button';
   actions.append(cancel,submit);panel.append(heading,description,note,actions);overlay.append(panel);
   const previouslyLocked=document.body.style.overflow;
   document.body.style.overflow='hidden';document.body.append(overlay);
   const finish=approved=>{
    overlay.removeEventListener('keydown',onKeydown);
    overlay.remove();document.body.style.overflow=previouslyLocked;
    if(previousFocus?.isConnected)previousFocus.focus();resolve(approved);
   };
   const onKeydown=e=>{
    if(e.key==='Escape'){e.preventDefault();finish(false)}
    if(e.key==='Tab'){
     const controls=[close,cancel,submit];const index=controls.indexOf(document.activeElement);
     if(e.shiftKey&&index<=0){e.preventDefault();submit.focus()}
     else if(!e.shiftKey&&index===controls.length-1){e.preventDefault();close.focus()}
    }
   };
   overlay.addEventListener('keydown',onKeydown);
   overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});
   close.addEventListener('click',()=>finish(false));cancel.addEventListener('click',()=>finish(false));
   submit.addEventListener('click',()=>finish(true));submit.focus();
  });
 }
 const templateStatuses=new Map();
 const templateStatusLabels={pending:'Pending review',approved:'Approved template',rejected:'Rejected'};
 function applyTemplateStatus(button,status){
  if(!button?.isConnected)return;
  const label=templateStatusLabels[status];
  button.textContent=label||'Submit as Template';
  button.disabled=Boolean(label);
  if(label)button.setAttribute('aria-label','Template status: '+label);
  else button.removeAttribute('aria-label');
 }
 async function refreshTemplateStatuses(){
  if(!state.user)return;
  try{
   const response=await templateRequest('mine');
   if(!state.user)return;
   templateStatuses.clear();
   for(const item of response.items||[])templateStatuses.set(item.job_id,item.status);
   document.querySelectorAll('[data-template-job-id]').forEach(button=>{
    applyTemplateStatus(button,templateStatuses.get(button.dataset.templateJobId));
   });
  }catch(error){console.warn('Could not refresh template submission status:',error.message);}
 }
 function templateSubmitButton(id){
  const button=create('button','lig-small-action','Submit as Template');
  button.type='button';button.dataset.templateJobId=id;
  button.addEventListener('click',()=>submitTemplate(id,button));
  applyTemplateStatus(button,templateStatuses.get(id));
  refreshTemplateStatuses();
  return button;
 }
 async function submitTemplate(id,button){
  if(!await confirmTemplateSubmission())return;
  button.disabled=true;
  try{
   await templateRequest('submit',{job_id:id,consent:true});
   templateStatuses.set(id,'pending');
   document.querySelectorAll('[data-template-job-id]').forEach(el=>{if(el.dataset.templateJobId===id)applyTemplateStatus(el,'pending');});setMessage('Submitted! Your template will appear only after admin approval.');
  }catch(error){applyTemplateStatus(button,templateStatuses.get(id));setMessage(error.message,true);}
 }
 // Reference inputs remain browser-local until the user clicks Generate.
 async function prepareFluxReference(){
  const files=window.__looxFluxReferences?.()||[];
  if(!files.length)return null;
  if(!['flux','flux2_klein_local_edit'].includes(modelField.value))throw Error('Choose FLUX.1 Schnell or FLUX.2 Klein Image Edit to use a reference image.');
  if(modelField.value==='flux'&&!state.config?.local?.referenceAvailable)throw Error('Your Windows ComfyUI worker needs the FLUX.1 reference workflow. No credits used.');
  if(modelField.value==='flux2_klein_local_edit'&&!availableModels.has('flux2_klein_local_edit'))throw Error('FLUX.2 Klein is offline. Start the updated LOOX GPU worker. No credits used.');
  if(!byId('lig-reference-permission')?.checked)throw Error('Confirm that you have permission to use all selected reference images.');
  if(files.length>12)throw Error('A maximum of 12 reference images can be processed in one generation.');
  if(modelField.value==='flux2_klein_local_edit'&&files.length!==1)throw Error('This FLUX.2 Klein Image Edit workflow accepts exactly one reference image for now.');
  if(modelField.value==='flux2_klein_local_edit'){
   const file=files[0];
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2400000)throw Error('Choose a PNG, JPG or WebP reference under 2.4 MB.');
   const bitmap=await createImageBitmap(file);
   try{
    if(bitmap.width*bitmap.height>4000000)throw Error('The reference image exceeds 4 megapixels.');
    const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(64,Math.round(bitmap.width*scale));canvas.height=Math.max(64,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Could not prepare the reference image.');
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const uri=canvas.toDataURL('image/jpeg',.86);
    if(uri.length>3200040)throw Error('Reference image is too large.');
    return {reference_image:uri,reference_strength:0.45,permission:true};
   }finally{bitmap.close();}
  }
  // Native FLUX Schnell img2img has a single VAE image input, not independent
  // reference encoders. Assemble a readable contact sheet rather than
  // pretending all files are supplied to distinct model conditioning slots.
  const columns=Math.ceil(Math.sqrt(files.length)),rows=Math.ceil(files.length/columns);
  const canvas=document.createElement('canvas');
  const size=files.length===1?1024:1024;
  canvas.width=size;canvas.height=size;
  const context=canvas.getContext('2d');
  if(!context)throw Error('Your browser could not prepare the reference images.');
  context.fillStyle='#f0f0f0';context.fillRect(0,0,size,size);
  for(let i=0;i<files.length;i++){
   const file=files[i];
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2400000)
    throw Error('Each reference image must be a JPG, PNG or WebP under 2.4 MB.');
   const bitmap=await createImageBitmap(file);
   try{
    if(bitmap.width*bitmap.height>4000000)throw Error('Reference image '+(i+1)+' exceeds 4 megapixels.');
    const col=i%columns,row=Math.floor(i/columns);
    const x=Math.round(col*size/columns),y=Math.round(row*size/rows);
    const width=Math.round((col+1)*size/columns)-x,height=Math.round((row+1)*size/rows)-y;
    const fit=Math.min(width/bitmap.width,height/bitmap.height);
    const dw=Math.round(bitmap.width*fit),dh=Math.round(bitmap.height*fit);
    context.drawImage(bitmap,x+(width-dw)/2,y+(height-dh)/2,dw,dh);
   }finally{bitmap.close();}
  }
  const uri=canvas.toDataURL('image/jpeg',0.84);
  if(uri.length>3200040)throw Error('Reference collage is too large to upload.');
  // Balanced automatic editing: 45% similarity gives prompt edits more influence
  // than the previous 65% default, without requiring a technical slider.
  return {reference_image:uri,reference_strength:0.45,permission:true};
 }
 function syncReferenceUI(){
  const isFlux=['flux','flux2_klein_local_edit'].includes(modelField.value),button=byId('lig-reference-quick-add'),tray=byId('lig-reference-tray');
  if(button){button.hidden=!isFlux;button.title=modelField.value==='flux2_klein_local_edit'?'Add one reference picture for FLUX.2 Klein Image Edit':state.config?.local?.referenceAvailable?'Add reference images':'Update PC worker for FLUX image-to-image';}
  const input=byId('lig-reference-image');if(input)input.disabled=!isFlux;
  if(tray)tray.style.display=isFlux?'':'none';
 }

 const price=()=>modelField.value==='flux'?(state.config?.operations?.find(o=>o.id==='generate')?.cost||3):(allModels.get(modelField.value)?.cost||0);
 const quotaLabel=create('small','lig-daily-quota','Daily generation limit disabled during testing');
 creditCost.insertAdjacentElement('afterend',quotaLabel);
 let remainingImages=null;
 async function refreshQuota(){
  if(!state.user){remainingImages=null;quotaLabel.textContent='Daily generation limit disabled during testing';return;}
  try{
   const data=await api('quota');
   remainingImages=data.remaining.generate;
   quotaLabel.textContent='Daily generation limit disabled during testing';
  }catch{quotaLabel.textContent='Daily generation limit disabled during testing';}
 }


 const settingFields={
  resolution:{block:byId('lig-resolution-block'),select:byId('lig-resolution')},
  quality:{block:byId('lig-quality-block'),select:byId('lig-quality')}
 };
 const qualityNames={
  low:'Quick Draft · Lower cost',
  medium:'Balanced Quality · Recommended',
  high:'Maximum Detail · Higher cost'
 };
 const qualityDescriptions={
  low:'Quick Draft: best for testing ideas. Less detail and typically lower API cost.',
  medium:'Balanced Quality: good detail for everyday images. Recommended default.',
  high:'Maximum Detail: more rendering detail for finished images. Typically costs more to generate.'
 };
 const qualityHelp=create('small','loox-quality-explanation');
 qualityHelp.id='lig-quality-explanation';
 qualityHelp.setAttribute('role','status');
 qualityHelp.setAttribute('aria-live','polite');
 settingFields.quality.block.append(qualityHelp);
 settingFields.quality.select.setAttribute('aria-describedby',qualityHelp.id);
 function updateQualityHelp(){
  const isGPT=modelField.value==='openai_gpt_image';
  qualityHelp.hidden=settingFields.quality.block.hidden;
  if(qualityHelp.hidden)return;
  if(isGPT){
   qualityHelp.textContent=qualityDescriptions[settingFields.quality.select.value]||qualityDescriptions.medium;
  }else{
   qualityHelp.textContent='Balanced Quality is suitable for most images; higher quality can take more processing.';
  }
 }
 settingFields.quality.select.addEventListener('change',updateQualityHelp);
 function updateModelSettings(){
  const id=modelField.value;
  const choices={
   resolution:id.startsWith('google_')?['1K','2K','4K']:id==='ideogram_p_image'?['1k','2k']:[],
   quality:id==='ideogram_p_image'?['medium','high']:id==='openai_gpt_image'?['low','medium','high']:[]
  };
  for(const [key,field] of Object.entries(settingFields)){
   field.block.hidden=!choices[key].length;
   field.select.replaceChildren(...choices[key].map(value=>new Option(
    key==='quality'?(id==='openai_gpt_image'?qualityNames[value]:value==='medium'?'Balanced Quality':value==='high'?'Maximum Detail':value):
    value==='1k'?'1K':value==='2k'?'2K':value,value)));
   if(key==='quality'&&choices[key].includes('medium'))field.select.value='medium';
  }
  updateQualityHelp();
 }
 if(launch?.kind==='image'&&allModels.has(launch.model))modelField.value=launch.model;
 updateModelSettings();
 function updateAccount(){
  if(state.user&&state.account?.wallet){
   credits.textContent=state.account.wallet.balance+' credits';
  }else credits.textContent=state.user?'Loading credits…':'Sign in to view';
  const selected=modelStatus(modelField.value);
  creditCost.textContent=selected.label+' · '+price()+' credits on success';
  modelNote.textContent=selected.reason;
  syncReferenceUI();
  generateButton.disabled=isBusy||(modelField.value==='flux'?!state.config?.local?.available:!availableModels.has(modelField.value));
 }
 modelField.addEventListener('change',()=>{updateModelSettings();updateAccount();const m=allModels.get(modelField.value);const label=m?m.name:'FLUX.1 Schnell';const pill=document.querySelector('.lig-compose .lig-image-pill');if(pill)pill.textContent='✧  '+label;const description=document.querySelector('#lig-generate-view .lig-main-heading p');if(description)description.textContent='Create with '+label+' and keep your generations in one place.';});
 function setMessage(value,isError=false){
  message.textContent=value||'';
  message.style.color=isError?'#ffb6bc':'';
 }
 function selectView(view){
  const templates=view==='templates';
  generateView.hidden=templates;templatesView.hidden=!templates;composeWrap.hidden=templates;
  sessions.setCommunity(templates);
  if(templates)community.show().catch(e=>setMessage(e.message,true));
  document.querySelectorAll('[data-lig-view]').forEach(el=>{
   el.classList.toggle('is-active',el.dataset.ligView===view);
   if(el.tagName==='BUTTON')el.setAttribute('aria-pressed',String(el.dataset.ligView===view));
  });
 }
 document.querySelectorAll('[data-lig-view]').forEach(el=>el.addEventListener('click',()=>{
  selectView(el.dataset.ligView);
  if(location.hash!==(el.dataset.ligView==='templates'?'#templates':'#generate'))
   history.replaceState(null,'',location.pathname+location.search+(el.dataset.ligView==='templates'?'#templates':'#generate'));
 }));
 selectView(location.hash==='#templates'?'templates':'generate');
 window.addEventListener('hashchange',()=>selectView(location.hash==='#templates'?'templates':'generate'));

 function outputCard(prompt,ratio,modelLabel='FLUX.1 Schnell'){
  byId('lig-empty')?.remove();
  const card=create('article','lig-output');
  const top=create('div','lig-output-top'),
        name=create('span','lig-output-name',prompt),
        indicator=create('span',null,'Starting…');
  top.append(name,indicator);
  const stage=create('div','lig-output-stage');
  stage.style.setProperty('--lig-ratio',(ratios.has(ratio)?ratio:'1:1').replace(':',' / '));
  const loading=create('div','lig-skeleton');
  const overlay=create('div','lig-loading-overlay');
  overlay.setAttribute('role','status');
  const spinner=create('span','lig-spinner');
  spinner.setAttribute('aria-hidden','true');
  const loadingTitle=create('strong',null,'Preparing your generation');
  const loadingSub=create('small',null,'Your image is being prepared.');
  overlay.append(spinner,loadingTitle,loadingSub);
  stage.append(loading,overlay);
  const bottom=create('div','lig-output-bottom'),
        promptLabel=create('span','lig-prompt-label',prompt);
  const promptWrap=create('div','lig-result-prompt');
  const promptToggle=create('button','lig-result-prompt-toggle','Show more');
  promptToggle.type='button';promptToggle.setAttribute('aria-expanded','false');
  promptWrap.append(promptLabel,promptToggle);
  promptToggle.addEventListener('click',()=>{
   const expanded=promptWrap.classList.toggle('is-expanded');
   promptToggle.textContent=expanded?'Show less':'Show more';
   promptToggle.setAttribute('aria-expanded',String(expanded));
  });
  bottom.append(promptWrap);
  card.append(top,stage,bottom);
  results.append(card);
  const setStage=(label,sub)=>{
   indicator.textContent=label;
   loadingTitle.textContent=label;
   if(sub)loadingSub.textContent=sub;
  };
  return {card,stage,bottom,indicator,overlay,setStage,prompt,modelLabel};
 }
 function showFailed(view,error){
  view.stage.replaceChildren();
  view.stage.style.aspectRatio='';
  view.stage.style.minHeight='230px';
  const failure=create('div','lig-template-empty');
  failure.style.border='0';
  failure.append(create('strong',null,'Image not completed'),
   create('p',null,error));
  view.stage.append(failure);
  view.indicator.textContent='Not completed';
  const retry=create('button','lig-small-action','Use this prompt again');
  retry.type='button';
  retry.addEventListener('click',()=>{promptField.value=view.prompt;promptField.focus();});
  view.bottom.append(retry);
 }
 function showReady(view,url,id){
  if(!url){showFailed(view,'Image was generated, but its private preview URL could not be retrieved. Open your LOOX account to see it.');return;}
  view.stage.replaceChildren();
  const image=create('img');
  image.src=url;
  image.alt='Generated with '+view.modelLabel+': '+view.prompt;
  image.loading='eager';
  image.decoding='async';
  let imageRetry=0;
   image.onerror=async()=>{if(imageRetry++>=2){view.indicator.textContent='Preview unavailable · Use Preview to retry';return;}
    view.indicator.textContent='Refreshing image preview…';
    try{const fresh=await api('status',null,{id});if(fresh.url&&fresh.state==='succeeded'){image.src=fresh.url+(fresh.url.includes('?')?'&':'?')+'loox_refresh='+Date.now();return;}}catch{}
    view.indicator.textContent='Preview unavailable · Use Preview to retry';
   };
  view.stage.append(image);
  view.indicator.textContent='Completed · '+view.modelLabel;
  const download=create('button','lig-small-action','Download PNG');
  download.type='button';
  download.addEventListener('click',async()=>{
   download.disabled=true;
   try{
    const info=await api('status',null,{id});
    if(!info.url)throw Error('Download unavailable. Please try again.');
    const response=await fetch(info.url,{credentials:'omit'});
    if(!response.ok)throw Error('Could not download the private image.');
    const blob=URL.createObjectURL(await response.blob());
    const anchor=create('a');
    anchor.href=blob;anchor.download='loox-flux-'+id.slice(0,8)+'.png';
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(blob),30000);
   }catch(e){setMessage(e.message,true);}finally{download.disabled=false;}
  });
  const reuse=create('button','lig-small-action','Use prompt');
  reuse.type='button';
  reuse.addEventListener('click',()=>{
   promptField.value=view.prompt;
   promptField.focus();
   selectView('generate');
  });
  const submitButton=templateSubmitButton(id);
  // Publishing is provided by the shared session actions.

  sessions.completed(view,id);
  sessions.bottom(sessions.nearBottom());
 }
 async function poll(id,view,ratio){
  let consecutiveErrors=0;
  for(let n=0;n<175;n++){
   await pause(n===0?950:3600);
   if(view.entry?.user_id!==state.user?.id)return;
   let status;
   try{status=await api('status',null,{id});consecutiveErrors=0;}
   catch(error){
    consecutiveErrors++;
    view.setStage('Waiting for connection','Checking your generation status…');
    if(consecutiveErrors<6)continue;
    throw Error('The connection was interrupted. You can recover this image from your account history.');
   }
   if(status.state==='succeeded'){
    if(view.entry?.user_id!==state.user?.id)return;
    showReady(view,status.url,id);
    try{sessionStorage.removeItem('loox-active-image-'+state.user.id);}catch{}
    setMessage('Your image is ready. Saved privately to your LOOX account.');
    await refresh().catch(()=>{});
    updateAccount();
    await loadHistory(true);
    return;
   }
   if(status.state==='failed'){
    try{sessionStorage.removeItem('loox-active-image-'+state.user.id);}catch{}
    await refresh().catch(()=>{});
    updateAccount();
    throw Error('Generation could not finish. Any reserved AI credits were returned.');
   }
   if(status.state==='processing'){
    view.setStage('Generating image','Your image is being created. Detailed images may take a few minutes.');
   }else{
    view.setStage('Waiting in the queue','Your request is queued and will begin shortly.');
   }
  }
  throw Error('Still waiting for a result. Check Recent AI jobs in your LOOX account.');
 }
 async function submit(text,ratio=ratioField.value,seed=null,resumeId=null,modelId=modelField.value){
  if(isBusy)return;
  const prompt=String(text||'').trim();
  if(!prompt){setMessage('Enter a prompt to generate an image.',true);promptField.focus();return;}
  if(prompt.length>1200){setMessage('Use a prompt under 1,200 characters.',true);return;}
  if(!state.user){
   setMessage('Sign in to use your LOOX credits.');
   auth('login');
   return;
  }
  if(!resumeId&&modelId==='flux'&&!state.config?.local?.available){setMessage(modelStatus('flux').reason,true);return;}

  const modelCost=modelId==='flux'?(state.config?.operations?.find(o=>o.id==='generate')?.cost||3):(availableModels.get(modelId)?.cost||Infinity);
  if(modelId!=='flux'&&!availableModels.has(modelId)){setMessage(modelStatus(modelId).reason,true);return;}
  if(modelId!=='flux'&&modelId!=='z_image_turbo'&&modelId!=='flux2_klein_local_edit'&&!['pro','lifetime'].includes(state.account?.plan)){pricing();setMessage('Choose a LOOX plan to use premium models.',true);return;}
  if(!resumeId&&state.account?.wallet?.balance<modelCost){
   pricing();setMessage('You need more AI credits to generate this image.',true);return;
  }
  selectView('generate');
  setMessage(resumeId?'Restoring your pending image…':'Preparing a new generation…');
  isBusy=true;generateButton.disabled=true;ratioField.disabled=true;modelField.disabled=true;
  let view=null;
  try{
   const reference=!resumeId&&['flux','flux2_klein_local_edit'].includes(modelId)?await prepareFluxReference():null;
   if(modelId==='flux2_klein_local_edit'&&!resumeId&&!reference)throw Error('Upload one reference image to use FLUX.2 Klein Image Edit.');
   const settings=['flux','flux2_klein_local_edit'].includes(modelId)?(reference?{reference:'Image-to-image',reference_similarity:Math.round(reference.reference_strength*100)+'%'}:{}):Object.fromEntries(Object.entries(settingFields).filter(([,f])=>!f.block.hidden).map(([key,f])=>[key,f.select.value]));
   const entry=await sessions.begin({prompt,ratio,model_id:modelId,model_name:modelId==='flux'?'FLUX.1 Schnell':allModels.get(modelId)?.name||'AI image',media_type:'image',settings});
   const follow=sessions.nearBottom();
   view=outputCard(prompt,ratio,entry.model_name);view.follow=follow;sessions.attach(view,entry);sessions.bottom(follow);
   const isLocal=['flux','flux2_klein_local_edit'].includes(modelId);
   const id=resumeId||(await api(isLocal?'job':'cloud_job',{
    ...(isLocal?{operation:modelId==='flux'?'generate':'generate_flux2_klein_edit'}:{model:modelId}),requestId:entry.request_id,prompt,ratio,...(isLocal?(reference||{}):{settings}),...(seed==null?{}:{seed})
   })).id;
   if(!id)throw Error('The backend did not return a job ID.');
   if(promptField.value.trim()===prompt)promptField.value='';
   currentGenerationId=id;
   if(resumeId)view.setStage('Restoring generation','Checking your in-progress image.');
   if(!resumeId){
    try{sessionStorage.setItem('loox-active-image-'+state.user.id,JSON.stringify({id,prompt,ratio,modelId}));}catch{}
    await refresh().catch(()=>{});
    updateAccount();
    await refreshQuota();
   }
   await poll(id,view,ratio);
  }catch(error){
   if(view)showFailed(view,error.message||'Unable to complete the image.');
   setMessage(error.message||'Generation could not start.',true);
   await refreshQuota();
  }finally{
   isBusy=false;ratioField.disabled=false;modelField.disabled=false;updateAccount();
  }
 }
 form?.addEventListener('submit',event=>{
  event.preventDefault();
  submit(promptField.value,ratioField.value);
 });

 // Saved images live in their own viewer; never insert them into the active generation stage.
 let historyViewer=null;
 function closeHistoryViewer(){
  if(!historyViewer)return;
  const modal=historyViewer;
  historyViewer=null;
  modal.remove();
  document.body.classList.remove('lig-viewer-open');
 }
 function openHistoryViewer(item,url){
  closeHistoryViewer();
  const modal=create('div','lig-viewer');
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-label','Saved image viewer');
  const shade=create('div','lig-viewer-shade');
  const panel=create('div','lig-viewer-panel');
  const image=create('img','lig-viewer-image');
  image.src=url;image.alt=item.prompt||'Saved FLUX image';
  const details=create('div','lig-viewer-details');
  const heading=create('strong',null,'Saved generation');
  const promptText=create('p',null,item.prompt||'No prompt saved');
  const actions=create('div','lig-viewer-actions');
  const close=create('button','lig-viewer-close','×');
  close.type='button';close.setAttribute('aria-label','Close saved image');
  close.addEventListener('click',closeHistoryViewer);
  shade.addEventListener('click',closeHistoryViewer);
  actions.append(actionButton('Copy prompt',()=>copyPrompt(item.prompt||'')),
   actionButton('Use prompt',()=>useHistoryPrompt(item.prompt||'')),
   actionButton('Download PNG',()=>downloadHistoryImage(item.id)),
   actionButton('Delete image',()=>deleteHistoryImage(item)),
   templateSubmitButton(item.id));
  details.append(heading,promptText,actions);
  panel.append(image,details,close);
  modal.append(shade,panel);
  document.body.append(modal);
  document.body.classList.add('lig-viewer-open');
  historyViewer=modal;
  close.focus();
 }
 function actionButton(label,fn){
  const b=create('button','lig-small-action',label);
  b.type='button';b.addEventListener('click',()=>fn());return b;
 }
 async function copyPrompt(prompt){
  try{
   await navigator.clipboard.writeText(prompt);
   setMessage('Prompt copied to clipboard.');
  }catch{
   promptField.value=prompt;promptField.focus();
   setMessage('Clipboard unavailable; the prompt was placed in the editor.');
  }
 }
 function useHistoryPrompt(prompt){
  promptField.value=prompt;
  closeHistoryViewer();
  selectView('generate');
  promptField.focus();
  setMessage('Saved prompt added to the editor. Your current generation is still running.');
 }
 async function downloadHistoryImage(id){
  try{
   const data=await api('status',null,{id});
   if(!data.url)throw Error('Saved image is unavailable.');
   const response=await fetch(data.url,{credentials:'omit'});
   if(!response.ok)throw Error('Download failed. Please try again.');
   const blob=URL.createObjectURL(await response.blob());
   const a=create('a');
   a.href=blob;a.download='loox-flux-'+id.slice(0,8)+'.png';
   document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(blob),30000);
   setMessage('Image download started.');
  }catch(err){setMessage(err.message||'Download unavailable.',true);}
 }
 async function deleteHistoryImage(item){
  if(!confirm('Permanently delete this generated image? This cannot be undone.'))return;
  try{
   await api('delete_image',{id:item.id});
   closeHistoryViewer();
   await loadHistory(true);
   setMessage('Saved image deleted. Your credit history is unchanged.');
  }catch(err){setMessage(err.message||'Could not delete image.',true);}
 }
 function historyCard(item){
  const card=create('div','lig-history-item');
  const preview=create('button','lig-history-preview');
  preview.type='button';preview.title='View saved image';
  const pic=item.url?create('img','lig-history-cover'):create('div','lig-history-cover lig-history-placeholder','✧');
  if(item.url){pic.src=item.url;pic.alt=item.prompt?'Image for '+item.prompt:'An earlier FLUX generation';pic.loading='lazy';}
  preview.append(pic);
  preview.addEventListener('click',async()=>{
   preview.disabled=true;
   try{
    const data=await api('status',null,{id:item.id});
    if(!data.url)throw Error('Saved image unavailable right now.');
    openHistoryViewer(item,data.url);
   }catch(err){setMessage(err.message,true);}finally{preview.disabled=false;}
  });
  const info=create('div','lig-history-info');
  info.append(create('span','lig-history-name',item.prompt||'Earlier generation'),
   create('span','lig-history-time',new Date(item.created_at).toLocaleDateString()));
  const tools=create('div','lig-history-tools');
  const actions=[
   ['eye','View',()=>preview.click()],
   ['copy','Copy prompt',()=>copyPrompt(item.prompt||'')],
   ['pencil','Use prompt',()=>useHistoryPrompt(item.prompt||'')],
   ['download','Download',()=>downloadHistoryImage(item.id)],
   ['trash','Delete',()=>deleteHistoryImage(item)]
  ];
  for(const [symbol,label,fn] of actions){
   const b=create('button','lig-history-tool lig-history-tool-'+symbol);
   const paths={
    eye:'<circle cx="11" cy="11" r="8"/><circle cx="11" cy="11" r="3"/>',
    copy:'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    pencil:'<path d="m12 19 7-7 3 3-7 7-4 1 1-4Z"/><path d="m16 15 3 3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    trash:'<path d="M4 7h16M10 7V4h4v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>'
   };
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','18');svg.setAttribute('height','18');
   svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');
   svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
   svg.innerHTML=paths[symbol];
   b.append(svg);b.type='button';b.title=label;b.setAttribute('aria-label',label);
   b.addEventListener('click',fn);tools.append(b);
  }
  card.append(preview,tools,info);
  return card;
 }
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&historyViewer)closeHistoryViewer();});

 const mobileHistory=()=>window.matchMedia('(max-width:680px)').matches;
 let historyBuffer=[],historyHasMore=false;
 function updateHistoryMore(){
  historyMore.hidden=!historyBuffer.length&&!historyHasMore;
  historyMore.textContent='Load more';
  historyHeading.textContent=historyOffset?historyOffset+' saved image'+(historyOffset===1?'':'s')+' shown':'Account-only history';
 }
 async function loadHistory(){await sessions.loadList();}
 historyMore.addEventListener('click',()=>loadHistory());

 async function refreshUser(){
  updateAccount();
  refreshQuota().catch(()=>{});
  const id=state.user?.id||null;
  if(id!==activeUser){
   activeUser=id;
   historyOffset=0;
   historyGrid.replaceChildren();
   await sessions.init();
   if(!state.user){
    historyGrid.append(create('p','lig-history-empty','Sign in to view your own previous creations.'));
    historyHeading.textContent='Your private collection';
   }
  }
 }
 document.addEventListener('loox-account',updateAccount);
 document.addEventListener('loox-user',()=>{
  refreshUser().catch(e=>setMessage(e.message,true));
  if(state.user&&autoRequest)startAuto();
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user){refresh().catch(()=>{});refreshQuota().catch(()=>{});}});
 async function startAuto(){
  if(!autoRequest||!draft||isBusy)return;
  if(!state.user){
   setMessage('Sign in to start this generation.');
   auth('login');return;
  }
  autoRequest=false;
  try{sessionStorage.removeItem(storageDraft);}catch{}
  history.replaceState(null,'',location.pathname+location.search+'#generate');
  await submit(draft,ratioField.value);
 }
 // Composer may become visible only after all synchronous model and session UI exists.
 document.body.classList.add('loox-generator-ready');
 try{await initialize();}catch{}
 await config().catch(()=>{});
 await sessions.init().catch(e=>setMessage(e.message,true));
 await refreshUser();
 updateAccount();
 if(launch?.kind==='image')modelField.dispatchEvent(new Event('change'));
 if(autoRequest)startAuto();
}
