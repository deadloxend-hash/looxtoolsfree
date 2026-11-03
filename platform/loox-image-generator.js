
import {state,config,api,auth,refresh,pricing,initialize} from './account.js?v=7';

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
 const form=byId('lig-compose'),promptField=byId('lig-prompt'),ratioField=byId('lig-ratio');
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
  if(!native)continue;
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
  for(const option of native.options){
   const item=document.createElement('button');item.type='button';item.className='lig-select-option';
   item.setAttribute('role','option');item.dataset.value=option.value;
   const label=document.createElement('span');label.textContent=option.textContent;
   const check=document.createElement('span');check.className='lig-select-check';check.textContent='✓';check.setAttribute('aria-hidden','true');
   item.append(label,check);menu.append(item);choices.push(item);
   item.addEventListener('click',()=>{
    native.value=option.value;native.dispatchEvent(new Event('change',{bubbles:true}));
    sync();closeCustomDropdowns();trigger.focus();
   });
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
    e.preventDefault();const index=choices.indexOf(document.activeElement);
    choices[(index+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length]?.focus();
   }
  });
  native.addEventListener('change',sync);
  new MutationObserver(sync).observe(native,{attributes:true,attributeFilter:['disabled']});
  root.append(trigger,menu);sync();
 }
 document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('[data-custom-select]'))closeCustomDropdowns();
 });
 const composeWrap=byId('lig-compose-wrap');
 const mainWorkspace=composeWrap.parentElement,historySection=byId('lig-history-grid')?.closest('.lig-history');
 // Keep the desktop composer where it is; on phones it belongs between the
 // current generated image and the recent generations.
 function positionMobileComposer(){
  if(!historySection)return;
  if(window.matchMedia('(max-width:680px)').matches){
   if(composeWrap.nextElementSibling!==historySection)historySection.before(composeWrap);
  }else if(composeWrap.parentElement!==mainWorkspace){
   mainWorkspace.append(composeWrap);
  }
 }
 positionMobileComposer();
 window.addEventListener('resize',positionMobileComposer);
 let isBusy=false,activeUser=null,historyOffset=0,historyLoading=false,autoRequest=false;
 let currentGenerationId=null;
 const params=new URLSearchParams(location.search);
 let draft='';
 try {draft=sessionStorage.getItem(storageDraft)||'';} catch {}
 autoRequest=params.get('start')==='1'&&Boolean(draft.trim());
 if(draft)promptField.value=draft;
 const templateEndpoint='https://looxtoolfree-backend.vercel.app/api/templates';
 async function templateRequest(action,body){
  const session=await state.client?.auth.getSession();
  const token=session?.data?.session?.access_token;
  if(!token)throw Error('Sign in to submit a template.');
  const response=await fetch(templateEndpoint+'?action='+encodeURIComponent(action),{
   method:body?'POST':'GET',credentials:'omit',
   headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Template request failed.');
  return data;
 }
 async function submitTemplate(id,button){
  if(!confirm('Submit this image and its prompt to LOOX for review? If approved, both become publicly visible in Templates. You must own the rights to submit this image.'))return;
  button.disabled=true;
  try{
   await templateRequest('submit',{job_id:id,consent:true});
   button.textContent='Pending review';setMessage('Submitted! Your template will appear only after admin approval.');
  }catch(error){button.disabled=false;setMessage(error.message,true);}
 }
 let templatesLoaded=false;
 async function loadPublicTemplates(){
  const grid=byId('lig-public-templates');
  if(!grid)return;
  grid.replaceChildren(create('p','lig-template-empty','Loading approved templates…'));
  try{
   const response=await fetch(templateEndpoint+'?action=public',{credentials:'omit',signal:AbortSignal.timeout(20000)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load templates.');
   grid.replaceChildren();
   if(!data.items?.length){grid.append(create('p','lig-template-empty','No approved community templates yet.'));return}
   for(const item of data.items){
    const card=create('article','lig-community-card'),image=create('img');
    image.src=item.url;image.alt='Approved community template';image.loading='lazy';
    const caption=create('p',null,item.prompt),use=create('button','lig-small-action','Use this prompt');
    use.type='button';use.addEventListener('click',()=>{
     promptField.value=item.prompt;selectView('generate');
     location.hash='generate';promptField.focus();
    });
    card.append(image,caption,use);grid.append(card);
   }
   templatesLoaded=true;
  }catch(error){grid.replaceChildren(create('p','lig-template-empty','Could not load templates. Try again later.'));}
 }
 const price=()=>state.config?.operations?.find(o=>o.id==='generate')?.cost||3;
 const quotaLabel=create('small','lig-daily-quota','Daily images: 30/day · sign in to view');
 creditCost.insertAdjacentElement('afterend',quotaLabel);
 let remainingImages=null;
 async function refreshQuota(){
  if(!state.user){remainingImages=null;quotaLabel.textContent='Daily images: 30/day · sign in to view';return;}
  try{
   const data=await api('quota');
   remainingImages=data.remaining.generate;
   quotaLabel.textContent='Images left today: '+remainingImages+' / '+data.limit+' · resets 00:00 UTC';
  }catch{quotaLabel.textContent='Daily images: 30/day · allowance temporarily unavailable';}
 }


 function updateAccount(){
  if(state.user&&state.account?.wallet){
   credits.textContent=state.account.wallet.balance+' credits';
  }else credits.textContent=state.user?'Loading credits…':'Sign in to view';
  creditCost.textContent='Image generation · '+price()+' credits on success';
 }
 function setMessage(value,isError=false){
  message.textContent=value||'';
  message.style.color=isError?'#ffb6bc':'';
 }
 function selectView(view){
  const templates=view==='templates';
  generateView.hidden=templates;templatesView.hidden=!templates;composeWrap.hidden=templates;
  if(templates)loadPublicTemplates();
  document.querySelectorAll('[data-lig-view]').forEach(el=>{
   el.classList.toggle('is-active',el.dataset.ligView===view);
   if(el.tagName==='BUTTON')el.setAttribute('aria-pressed',String(el.dataset.ligView===view));
  });
 }
 document.querySelectorAll('[data-lig-view]').forEach(el=>el.addEventListener('click',()=>{
  selectView(el.dataset.ligView);
  if(location.hash!==(el.dataset.ligView==='templates'?'#templates':'#generate'))
   history.replaceState(null,'',location.pathname+(el.dataset.ligView==='templates'?'#templates':'#generate'));
 }));
 selectView(location.hash==='#templates'?'templates':'generate');
 window.addEventListener('hashchange',()=>selectView(location.hash==='#templates'?'templates':'generate'));

 function emptyCanvas(){
  if(results.childElementCount)return;
  const empty=create('div','lig-empty');
  empty.id='lig-empty';
  empty.append(create('div','lig-empty-orb','✧'),
   create('strong',null,'Your ideas start here'),
   create('p',null,'Write a prompt below. Your generated image will appear here once it is ready.'));
  results.append(empty);
 }
 emptyCanvas();
 function outputCard(prompt,ratio){
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
  results.replaceChildren(card);
  const setStage=(label,sub)=>{
   indicator.textContent=label;
   loadingTitle.textContent=label;
   if(sub)loadingSub.textContent=sub;
  };
  return {card,stage,bottom,indicator,overlay,setStage,prompt};
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
  image.alt='Generated with FLUX Schnell: '+view.prompt;
  image.loading='eager';
  image.decoding='async';
  image.onerror=()=>{view.indicator.textContent='Preview unavailable';};
  view.stage.append(image);
  view.indicator.textContent='Completed · FLUX.1 Schnell';
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
  const submitButton=create('button','lig-small-action','Submit as Template');
  submitButton.type='button';submitButton.addEventListener('click',()=>submitTemplate(id,submitButton));
  view.bottom.append(reuse,download,submitButton);
 }
 async function poll(id,view,ratio){
  let consecutiveErrors=0;
  for(let n=0;n<175;n++){
   await pause(n===0?950:3600);
   let status;
   try{status=await api('status',null,{id});consecutiveErrors=0;}
   catch(error){
    consecutiveErrors++;
    view.setStage('Waiting for connection','Checking your generation status…');
    if(consecutiveErrors<6)continue;
    throw Error('The connection was interrupted. You can recover this image from your account history.');
   }
   if(status.state==='succeeded'){
    showReady(view,status.url,id);
    try{sessionStorage.removeItem('loox-active-image-'+state.user.id);}catch{}
    setMessage('Your FLUX image is ready. Saved privately to your LOOX account.');
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
 async function submit(text,ratio=ratioField.value,seed=null,resumeId=null){
  if(isBusy)return;
  const prompt=String(text||'').trim();
  if(!prompt){setMessage('Enter a prompt to generate an image.',true);promptField.focus();return;}
  if(prompt.length>1200){setMessage('Use a prompt under 1,200 characters.',true);return;}
  if(!state.user){
   setMessage('Sign in to use your LOOX credits.');
   auth('login');
   return;
  }
  if(!resumeId&&remainingImages===0){setMessage('You have used all 30 image generations today. Resets at 00:00 UTC.',true);return;}
  if(!resumeId&&state.account?.wallet?.balance<price()){
   pricing();setMessage('You need more AI credits to generate this image.',true);return;
  }
  selectView('generate');
  setMessage(resumeId?'Restoring your pending image…':'Preparing a new generation…');
  isBusy=true;generateButton.disabled=true;ratioField.disabled=true;
  let view=null;
  try{
   const id=resumeId||(await api('job',{
    operation:'generate',requestId:crypto.randomUUID(),prompt,ratio,...(seed==null?{}:{seed})
   })).id;
   if(!id)throw Error('The backend did not return a job ID.');
   // A newly accepted request starts a fresh preview. Completed images remain in account history.
   if(!resumeId){
    results.replaceChildren();
    if(promptField.value.trim()===prompt)promptField.value='';
    await loadHistory(true);
   }
   currentGenerationId=id;
   view=outputCard(prompt,ratio);
   if(resumeId)view.setStage('Restoring generation','Checking your in-progress image.');
   if(!resumeId){
    try{sessionStorage.setItem('loox-active-image-'+state.user.id,JSON.stringify({id,prompt,ratio}));}catch{}
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
   isBusy=false;generateButton.disabled=false;ratioField.disabled=false;
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
   actionButton('Submit as Template',()=>submitTemplate(item.id,actions.lastElementChild)));
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
 async function loadHistory(reset=false){
  if(!state.user){
   historyHeading.textContent='Sign in to view images saved to your account.';
   historyMore.hidden=true;return;
  }
  if(historyLoading)return;
  historyLoading=true;
  if(reset){
   historyOffset=0;historyBuffer=[];historyHasMore=true;
   historyGrid.replaceChildren();historyMore.hidden=true;
  }
  historyHeading.textContent='Loading your private images…';
  const count=mobileHistory()?6:12;
  try{
   let remaining=count;
   while(remaining>0){
    if(!historyBuffer.length){
     if(!historyHasMore)break;
     const response=await api('gallery',null,{offset:String(historyOffset+historyBuffer.length)});
     const items=Array.isArray(response.items)?response.items:[];
     historyBuffer.push(...items);
     historyHasMore=Boolean(response.has_more);
     if(!items.length){historyHasMore=false;break}
    }
    const batch=historyBuffer.splice(0,remaining);
    batch.forEach(item=>historyGrid.append(historyCard(item)));
    historyOffset+=batch.length;
    remaining-=batch.length;
   }
   if(!historyOffset){
    historyGrid.replaceChildren(create('p','lig-history-empty','Your completed image generations will appear here. They are private to this signed-in account.'));
   }
   updateHistoryMore();
  }catch(err){
   historyHeading.textContent='Could not load image history.';
   if(!historyOffset)historyGrid.replaceChildren(create('p','lig-history-empty','Unable to load your saved images right now. Refresh or try again.'));
  }finally{historyLoading=false}
 }
 historyMore.addEventListener('click',()=>loadHistory());

 async function refreshUser(){
  updateAccount();
  refreshQuota().catch(()=>{});
  const id=state.user?.id||null;
  if(id!==activeUser){
   activeUser=id;
   historyOffset=0;
   historyGrid.replaceChildren();
   if(state.user)await loadHistory(true);
   else{
    historyGrid.append(create('p','lig-history-empty','Sign in to view your own previous creations.'));
    historyHeading.textContent='Your private collection';
   }
  }
 }
 document.addEventListener('loox-account',updateAccount);
 document.addEventListener('loox-user',()=>{
  refreshUser();
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
  history.replaceState(null,'',location.pathname+'#generate');
  await submit(draft,ratioField.value);
 }
 try{await initialize();}catch{}
 await config().catch(()=>{});
 await refreshUser();
 updateAccount();
 if(state.user){
  const key='loox-active-image-'+state.user.id;
  try{
   const saved=JSON.parse(sessionStorage.getItem(key)||'null');
   if(saved&&saved.id&&saved.prompt&&ratios.has(saved.ratio)){
    // A reload should resume polling rather than resubmit and double-charge.
    await submit(saved.prompt,saved.ratio,null,saved.id);
   }
  }catch{}
 }
 if(autoRequest)startAuto();
}
