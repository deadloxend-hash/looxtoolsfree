import {state,api,auth,initialize,config,refresh,el,button} from './account.js?v=settings-2-20261124';
import {openSheet} from './workspace-sheet.js';
const endpoint='https://looxtoolfree-backend.vercel.app/api/loox';
const grid=document.getElementById('workflow-grid'),status=document.getElementById('workflow-status'),search=document.getElementById('workflow-search'),category=document.getElementById('workflow-category');
let catalog=[],filter='featured',busy=false,owner=null;
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}};
const key=suffix=>'loox-workflows:'+suffix+':'+(state.user?.id||'guest');
const saved=()=>read(key('saved')),recent=()=>read(key('recent')),mine=()=>read(key('mine'));
function store(suffix,value){try{localStorage.setItem(key(suffix),JSON.stringify(value));}catch{status.textContent='Could not save preferences on this device.';}}
const art={'image-creation':'assets/image-landing/hiker-landscape-480.webp','product-photo':'assets/image-landing/retro-diner-480.webp','social-content':'assets/image-landing/punk-portrait-480.webp','cinematic-video':'assets/video-showcase/car-poster.webp','animate-image':'assets/image-landing/winter-warrior-480.webp'};
function draw(){
 const query=search.value.trim().toLocaleLowerCase();grid.replaceChildren();
 const items=filter==='mine'?mine():catalog;
 for(const item of items){
  if(filter==='saved'&&!saved().includes(item.id)||filter==='recent'&&!recent().includes(item.id))continue;
  if(category.value&&category.value!==item.category)continue;
  if(query&&!(item.title+' '+item.category).toLocaleLowerCase().includes(query))continue;
  const card=el('article',null,'workflow-card'),image=el('img');image.src=art[item.base||item.id]||art['image-creation'];image.alt='';image.loading='lazy';image.width=640;image.height=360;
  const copy=el('div',null,'workflow-card-copy');copy.append(el('small',item.category),el('h2',item.title));
  const steps=el('ol',null,'workflow-mini-steps');for(const step of item.steps)steps.append(el('li',step));copy.append(steps);
  const actions=el('div',null,'workflow-card-actions');actions.append(button('Configure workflow',()=>details(item),'workflow-primary'),button(saved().includes(item.id)?'Saved':'Save',()=>{const list=saved();store('saved',list.includes(item.id)?list.filter(id=>id!==item.id):[...list,item.id]);draw();},'workflow-secondary'));copy.append(actions);card.append(image,copy);grid.append(card);
 }
 if(!grid.children.length)grid.append(el('p','No workflows match this view. Try another category or save a starter.','workflow-empty'));
}
function details(item){
 const box=el('div',null,'workflow-config'),steps=el('ol',null,'workflow-steps');
 for(const step of item.steps)steps.append(el('li',step));box.append(steps);
 const promptLabel=el('label','Your creative brief'),prompt=el('textarea');prompt.maxLength=700;prompt.rows=4;prompt.value=item.prompt||'';prompt.placeholder='Describe what you want to create…';promptLabel.append(prompt);box.append(promptLabel);
 const modelLabel=el('label','Model'),model=el('select');model.setAttribute('aria-label','Workflow model');
 const video=item.kind==='video';
 if(video){for(const m of state.config?.videoModels||[])if(m.available&&(!item.requiresImage||m.capabilities?.startFrame||m.capabilities?.imageReference))model.append(new Option(m.name,m.id));}
 else model.append(new Option('FLUX.1 Schnell','flux'));
 modelLabel.append(model);box.append(modelLabel);
 const ratioLabel=el('label','Aspect ratio'),ratio=el('select');ratio.setAttribute('aria-label','Workflow aspect ratio');ratioLabel.append(ratio);box.append(ratioLabel);
 const durationLabel=el('label','Duration'),duration=el('select');duration.setAttribute('aria-label','Workflow duration');durationLabel.append(duration);durationLabel.hidden=!video;box.append(durationLabel);
 const uploadLabel=el('label','Start frame (JPG, PNG or WebP, under 2.4 MB)'),upload=el('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';uploadLabel.append(upload);uploadLabel.hidden=!item.requiresImage;box.append(uploadLabel);
 const quoteText=el('p','Checking the generation cost…','workflow-price'),notice=el('p',null,'workflow-notice'),output=el('div',null,'workflow-output');notice.role='status';box.append(quoteText,notice);
 let quote=null,sequence=0,requestId=null,requestDigest=null,jobId=null;
 const run=button('Run workflow',()=>execute(),'workflow-primary');run.disabled=true;
 const save=button('Save as my workflow',()=>{if(!prompt.value.trim()){notice.textContent='Add a creative brief first.';return;}const custom={...item,id:'custom-'+crypto.randomUUID(),base:item.base||item.id,title:prompt.value.trim().slice(0,45),prompt:prompt.value.trim()};store('mine',[custom,...mine()].slice(0,30));notice.textContent='Saved on this device.';},'workflow-secondary');
 box.append(run,save,output);const dialog=openSheet(item.title,box);
 function sync(){
  const info=state.config?.videoModels?.find(m=>m.id===model.value),cap=info?.capabilities,old=ratio.value;
  ratio.replaceChildren(...(video?cap?.ratios||[]:['1:1','16:9','9:16','4:3','3:4']).map(r=>new Option(r,r)));if([...ratio.options].some(o=>o.value===old))ratio.value=old;
  const seconds=duration.value;duration.replaceChildren(...(info?.durationOptions||[]).map(d=>new Option(d+' seconds',d)));if([...duration.options].some(o=>o.value===seconds))duration.value=seconds;
  uploadLabel.hidden=!video||!(cap?.startFrame??cap?.imageReference);upload.required=Boolean(item.requiresImage||info?.imageRequired);void price();
 }
 async function price(){
  const seq=++sequence;quote=null;run.disabled=true;
  if(!state.user){quoteText.textContent='Sign in to view your balance and confirm cost.';run.disabled=false;return;}
  if(!model.options.length){quoteText.textContent='No compatible models are available.';return;}
  try{
   const credits=video?(quote=await api('video_quote',{model:model.value,duration:Number(duration.value),ratio:ratio.value})).credits:state.config?.operations?.find(o=>o.id==='generate')?.cost;
   if(seq!==sequence)return;
   if(!Number.isInteger(credits))throw Error('The generation price is unavailable.');
   quoteText.textContent=credits+' credits · '+(state.account?.wallet?.balance??'…')+' available. Failed jobs follow the existing refund policy.';
   run.textContent='Run workflow · '+credits+' credits';run.disabled=busy||!video&&!state.config?.local?.available;
  }catch(error){if(seq===sequence)quoteText.textContent=error.message;}
 }
 async function monitor(id){
  const user=state.user?.id;for(let count=0;count<720;count++){
   if(!dialog.open||state.user?.id!==user)return;
   const result=await api('status',null,{id});notice.textContent=result.state==='processing'?'Generating your output…':result.state==='reserved'?'Waiting to start…':result.state;
   if(result.state==='succeeded'){
    const media=el(video?'video':'img');media.src=result.url;if(video){media.controls=true;media.playsInline=true;}else media.alt=prompt.value;
    const download=el('a','Open original output','workflow-secondary');download.href=result.url;download.target='_blank';download.rel='noopener';output.replaceChildren(media,download);notice.textContent='Workflow completed. Output saved in your private account.';await refresh();return;
   }
   if(result.state==='failed'){requestId=null;throw Error('Generation failed. Reserved credits were released. You may retry after reviewing the settings.');}
   await new Promise(resolve=>setTimeout(resolve,5000));
  }
  notice.textContent='Still processing. Open your account history to check the result.';
 }
 async function execute(){
  if(busy)return;if(!state.user){auth();return;}if(!prompt.value.trim()){notice.textContent='Add your creative brief.';return;}
  busy=true;run.disabled=true;
  try{
   let image=null;if(!uploadLabel.hidden&&upload.files?.[0]){const f=upload.files[0];if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>2400000)throw Error('Choose a JPG, PNG or WebP under 2.4 MB.');image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read this image.'));reader.readAsDataURL(f);});}
   if(upload.required&&!image)throw Error('This workflow requires a start frame.');
   const body={...(!video?{expectedCredits:state.config?.operations?.find(o=>o.id==='generate')?.cost}:{}),workflow:item.base||item.id,model:model.value,prompt:prompt.value.trim(),ratio:ratio.value,...(video?{duration:Number(duration.value),image}:{} )};
   // Preserve the operation ID across ambiguous network failures; changed settings get a new request.
   const digest=JSON.stringify(body);if(digest!==requestDigest){requestId=crypto.randomUUID();requestDigest=digest;jobId=null;}
   if(video){const fresh=await api('video_quote',{model:model.value,duration:Number(duration.value),ratio:ratio.value});if(fresh.credits!==quote?.credits){quote=fresh;quoteText.textContent='Price updated to '+fresh.credits+' credits. Press Run again to confirm.';return;}body.quoteToken=fresh.token;}
   notice.textContent='Starting workflow…';
   const result=jobId?{id:jobId}:await api('workflow_run',{...body,requestId});jobId=result.id;if(!jobId)throw Error('No job was confirmed. Retry with the same settings.');
   store('recent',[item.id,...recent().filter(id=>id!==item.id)].slice(0,20));draw();await refresh();await monitor(jobId);
  }catch(error){notice.textContent=error.message;}
  finally{busy=false;run.disabled=false;}
 }
 model.onchange=sync;ratio.onchange=price;duration.onchange=price;sync();
}
search.oninput=draw;category.onchange=draw;
for(const b of document.querySelectorAll('[data-workflow-filter]'))b.onclick=()=>{filter=b.dataset.workflowFilter;for(const other of document.querySelectorAll('[data-workflow-filter]'))other.setAttribute('aria-pressed',String(other===b));draw();};
document.getElementById('workflow-builder').onclick=()=>{const item=catalog.find(w=>w.kind==='image');if(item)details({...item,title:'Build an image workflow'});};
async function start(){
 const configuration=config().catch(()=>{});
 try{
  const response=await fetch(endpoint+'?action=workflow_catalog',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Workflow service is unavailable. Please try again later.');
  const data=await response.json();await configuration;catalog=data.items;category.replaceChildren(new Option('All categories',''),...[...new Set(catalog.map(x=>x.category))].map(c=>new Option(c,c)));status.textContent='Working generation workflows · '+data.storage;draw();
 }catch(error){status.textContent=error.message;}
 await initialize().catch(()=>{});owner=state.user?.id;draw();
}
document.addEventListener('loox-user',()=>{if(owner!==state.user?.id){owner=state.user?.id;draw();}});start();
