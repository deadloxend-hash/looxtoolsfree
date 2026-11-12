import {Community} from './community.js?v=4';
import {mountModelPicker} from './loox-model-picker.js?v=6';
import {MediaSessions} from './loox-image-sessions.js?v=24';
import {state,config,api,auth,refresh,pricing,initialize} from './account.js?v=9';

// LOOX Wan 2.1 video workspace. All generation calls go through the authenticated
// Vercel queue; the browser never connects to ComfyUI or sees worker credentials.
const $ = id => document.getElementById(id);
const make = (tag, cls, text) => {
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const validRatios=new Set(['16:9','9:16','1:1','4:3','3:4']);
const storageKey='loox-active-wan-video-';
const promptField=$('lvg-prompt'),ratioField=$('lvg-ratio'),form=$('lvg-compose');
const modelField=$('lvg-model'),imageField=$('lvg-image'),durationField=$('lvg-duration');
const imageBlock=$('lvg-image-block'),durationBlock=$('lvg-duration-block'),modelNote=$('lvg-model-note');
const imageRequired=$('lvg-image-required');
const cloudModels=new Map([
 ['wan22_i2v_fast',{name:'Wan 2.2 I2V Fast',image:true,durations:[5]}],
 ['wan22_5b_fast',{name:'Wan 2.2 5B Fast',image:false,durations:[5]}],
 ['wan22_t2v_fast',{name:'Wan 2.2 T2V Fast',image:false,durations:[5]}],
 ['wan25_i2v',{name:'Wan 2.5 I2V',image:true,durations:[5,10]}],
 ['wan26_i2v_flash',{name:'Wan 2.6 I2V Flash',image:true,durations:[5,10]}],
 ['kling_30',{name:'Kling 3.0 Standard',image:false,durations:[5,10]}],
 ['seedance_20',{name:'Seedance 2.0',image:false,durations:[5,10]}],
 ['veo_31_fast',{name:'Veo 3.1 Fast',image:false,durations:[4,6,8]}],
 ['runway_45',{name:'Runway Gen-4.5',image:false,durations:[5,10]}],
 ['flux3_video',{name:'FLUX 3 Video Draft HD',image:false,durations:[5,10]}]
]);
const isCloud=()=>modelField.value!=='wan21';
const chosen=()=>cloudModels.get(modelField.value);
const modelInfo=()=>state.config?.videoModels?.find(m=>m.id===modelField.value);
function updateModelUI(){
 const m=chosen(),cloud=Boolean(m);
 imageBlock.hidden=!cloud||modelField.value==='wan22_t2v_fast';durationBlock.hidden=!cloud;
 imageRequired.textContent=m?.image?'(required)':'(optional)';
 imageField.required=Boolean(m?.image);
 for(const option of durationField.options){const supported=Boolean(m?.durations.includes(Number(option.value)));option.hidden=cloud&&!supported;option.disabled=cloud&&!supported;}
 if(m&&!m.durations.includes(Number(durationField.value)))durationField.value=String(m.durations[0]);
 modelNote.textContent=!cloud?'Local PC · Wan 2.1 · ~2 seconds. Requires your ComfyUI worker.':
  m.image?'Image-to-video · upload a reference image.':'Text-to-video · optionally animate a reference image.';
 const info=modelInfo();
 const supportedRatios=modelField.value==='veo_31_fast'?['16:9','9:16']:modelField.value==='kling_30'?['16:9','9:16','1:1']:['16:9','9:16','1:1','4:3','3:4'];
 for(const option of ratioField.options){option.disabled=!supportedRatios.includes(option.value);option.hidden=option.disabled;}
 if(!supportedRatios.includes(ratioField.value))ratioField.value=supportedRatios[0];
 if(info&&!info.available)modelNote.textContent+=' Cloud model is not available yet.';
 accountInfo();checkGPU().catch(()=>{});
}
modelField.addEventListener('change',updateModelUI);
durationField.addEventListener('change',()=>{accountInfo();document.querySelector('.loox-video-model-picker .loox-model-panel')?.dispatchEvent(new Event('loox-model-cost-change'));});

const message=$('lvg-message'),generateButton=$('lvg-generate');

const resultList=$('lvg-results'),historyGrid=$('lvg-history-grid');
const historyLabel=$('lvg-history-message'),historyMore=$('lvg-history-more');
const credits=$('lvg-credits'),costLabel=$('lvg-credit-cost'),gpuLabel=$('lvg-gpu-state');
const generationView=$('lvg-generate-view'),templatesView=$('lvg-templates-view');
const composer=$('lvg-compose-wrap');
let busy=false,online=false,knownUser=null,historyOffset=0,historyLoading=false,lastGpuCheck=0;
const sessions=new MediaSessions({state,api,auth,root:document.querySelector('.lig-main'),feed:resultList,prompt:promptField,notice,isBusy:()=>busy,reuse:async entry=>{
 if(entry.media_type==='image'){location.assign('ai-text-to-image.html?session='+sessions.id+'&reuse='+entry.id+'#generate');return;}
 if(entry.ratio)ratioField.value=entry.ratio;ratioField.dispatchEvent(new Event('change'));promptField.value=entry.prompt;await submit(entry.prompt,ratioField.value);
}});
const community=new Community({state,auth,initialize,root:$('lvg-public-templates')});
let serverQuote=null,quoteEpoch=0;
const quoteInputs=()=>({model:modelField.value,duration:isCloud()?Number(durationField.value):2,ratio:ratioField.value});
async function updateQuote(){const epoch=++quoteEpoch;if(!state.user){serverQuote=null;accountInfo();return null;}const input=quoteInputs();try{const q=await api('video_quote',input);if(epoch!==quoteEpoch||JSON.stringify(input)!==JSON.stringify(quoteInputs()))return null;serverQuote=q;accountInfo();refreshButton();return q;}catch(error){if(epoch===quoteEpoch){serverQuote=null;notice(error.message,true);accountInfo();}return null;}}
const cost=()=>serverQuote&&serverQuote.model===modelField.value&&serverQuote.duration===(isCloud()?Number(durationField.value):2)&&serverQuote.ratio===ratioField.value?serverQuote.credits:isCloud()?(modelInfo()?.creditCosts?.[durationField.value]??modelInfo()?.cost??99):(state.config?.operations?.find(v=>v.id==='generate_video')?.cost??8);
const quotaLabel=make('small','lvg-daily-quota','Daily videos: 30/day · sign in to view');
costLabel.insertAdjacentElement('afterend',quotaLabel);
let remainingVideos=null;
async function refreshQuota(){
  if(!state.user){remainingVideos=null;quotaLabel.textContent='Daily videos: 30/day · sign in to view';return;}
  try{
    const data=await api('quota');
    remainingVideos=data.remaining.generate_video;
    quotaLabel.textContent='Videos left today: '+remainingVideos+' / '+data.limit+' · resets 00:00 UTC';
  }catch{quotaLabel.textContent='Daily videos: 30/day · allowance temporarily unavailable';}
}

function notice(text,error=false){
  message.textContent=text||'';
  message.style.color=error?'#ffb6bc':'';
}
function accountInfo(){
  credits.textContent=state.user?(state.account?.wallet?state.account.wallet.balance+' credits':'Loading credits…'):'Sign in to view';
  costLabel.textContent=(chosen()?.name||'Wan 2.1 Local')+' · '+cost()+' credits on success'+(state.user&&!serverQuote?' · refreshes before generation':'');
}
function chooseView(name){
  const template=name==='templates';
  sessions.setCommunity(template);if(template)community.show();
  generationView.hidden=template;templatesView.hidden=!template;composer.hidden=template;
  document.querySelectorAll('[data-lvg-view]').forEach(button=>{
    const selected=button.dataset.lvgView===name;
    button.classList.toggle('is-active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
}
function updateView(){
  chooseView(location.hash==='#templates'?'templates':'generate');
}
document.querySelectorAll('[data-lvg-view]').forEach(button=>{
  button.addEventListener('click',()=>{
    location.hash=button.dataset.lvgView;
    updateView();
  });
});
window.addEventListener('hashchange',updateView);
updateView();

// Keep the shared AI navigation rail in its proper place on both mobile and PC.
function syncHeader(){
  const header=document.querySelector('.lig-header');
  if(header)document.documentElement.style.setProperty('--lig-ai-header-height',header.offsetHeight+'px');
}
window.addEventListener('resize',syncHeader);
if(window.ResizeObserver){
  const header=document.querySelector('.lig-header');
  if(header)new ResizeObserver(syncHeader).observe(header);
}
syncHeader();
function refreshButton(){
  generateButton.disabled=busy || Boolean(state.user&&!online);
  generateButton.textContent=busy?'Generating…':state.user&&!online?(isCloud()?'Cloud model unavailable':'GPU offline · Generate unavailable'):'✧ Generate video · '+cost()+' credits';
}
let gpuCheckVersion=0;
async function checkGPU(){
  // Ignore slow responses for a model that the user has already switched away from.
  const version=++gpuCheckVersion,selectedModel=modelField.value;
  if(selectedModel!=='wan21'){
    const ready=Boolean(state.config?.videoModels?.find(m=>m.id===selectedModel)?.available);
    if(version!==gpuCheckVersion)return;
    online=ready;
    gpuLabel.textContent=ready?'● Cloud video model ready':'● Cloud model unavailable · check provider billing and configuration';
    gpuLabel.dataset.online=String(ready);
    refreshButton();return;
  }
  if(!state.user){
    online=false;
    gpuLabel.textContent='Sign in to check your PC GPU availability.';
    gpuLabel.dataset.online='false';refreshButton();return;
  }
  lastGpuCheck=Date.now();
  try{
    const data=await api('gpu');
    if(version!==gpuCheckVersion||selectedModel!==modelField.value)return;
    online=Boolean(data.video);
    gpuLabel.textContent=online?'● PC GPU online · Wan 2.1 ready':'● PC GPU offline · Start ComfyUI and the LOOX Windows worker';
  }catch{
    if(version!==gpuCheckVersion||selectedModel!==modelField.value)return;
    online=false;gpuLabel.textContent='Unable to check GPU availability right now.';
  }
  gpuLabel.dataset.online=String(online);
  refreshButton();
}
function createCard(prompt,ratio){
  $('lvg-empty')?.remove();
  const card=make('article','lig-output');
  const top=make('div','lig-output-top'),name=make('span','lig-output-name',prompt);
  const indicator=make('span',null,'Starting…');
  top.append(name,indicator);
  const stage=make('div','lig-output-stage lvg-video-stage');
  stage.style.setProperty('--lig-ratio',(validRatios.has(ratio)?ratio:'16:9').replace(':',' / '));
  const loading=make('div','lig-skeleton'),overlay=make('div','lig-loading-overlay');
  overlay.setAttribute('role','status');
  const spinner=make('span','lig-spinner'),label=make('strong',null,'Preparing your video');
  const caption=make('small',null,isCloud()?'Your cloud video request is processing.':'Your PC GPU will process this request.');
  overlay.append(spinner,label,caption);stage.append(loading,overlay);
  const bottom=make('div','lig-output-bottom');
  bottom.append(make('span','lig-prompt-label',prompt));
  card.append(top,stage,bottom);resultList.append(card);

  return {card,stage,bottom,indicator,prompt,setStage:(text,detail)=>{
    indicator.textContent=text;label.textContent=text;if(detail)caption.textContent=detail;
  }};
}
function showError(view,why){
  view.stage.replaceChildren();
  view.stage.style.aspectRatio='';
  view.stage.append(make('div','lvg-error',why));
  view.indicator.textContent='Not completed';
  const reuse=make('button','lig-small-action','Use prompt again');
  reuse.type='button';reuse.addEventListener('click',()=>{
    promptField.value=view.prompt;promptField.focus();chooseView('generate');
  });
  view.bottom.append(reuse);
}
function addDownload(view,id){
  const button=make('button','lig-small-action','Download MP4');
  button.type='button';
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      const status=await api('status',null,{id});
      if(status.state!=='succeeded'||!status.url)throw Error('Your video download is unavailable right now.');
      const response=await fetch(status.url,{credentials:'omit'});
      if(!response.ok)throw Error('Could not retrieve the private video. Please retry.');
      const blob=URL.createObjectURL(await response.blob());
      const link=make('a');link.href=blob;link.download='loox-video-'+id.slice(0,8)+'.mp4';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(blob),30000);
    }catch(error){notice(error.message,true);}finally{button.disabled=false;}
  });
  return button;
}
function showVideo(view,url,id){
  if(!url){showError(view,'Video completed, but its private preview URL is temporarily unavailable. Try your account history.');return;}
  view.stage.replaceChildren();
  const video=make('video');video.controls=true;video.playsInline=true;video.preload='metadata';
  video.src=url;video.setAttribute('aria-label','LOOX generated video');
  video.addEventListener('error',()=>{view.indicator.textContent='Preview unavailable · use Download MP4';});
  view.stage.append(video);
  view.indicator.textContent='Completed · LOOX Video';
  const reuse=make('button','lig-small-action','Reuse prompt');
  reuse.type='button';reuse.addEventListener('click',()=>{promptField.value=view.prompt;promptField.focus();});
  sessions.completed(view,id);sessions.bottom(sessions.nearBottom());
}
async function poll(id,view){
  let errors=0;
  for(let n=0;n<1050;n++){
    await sleep(n===0?1250:5500);
    if(view.entry?.user_id!==state.user?.id)return;
    let status;
    try{status=await api('status',null,{id});errors=0;}
    catch(error){
      if(++errors<6){view.setStage('Checking connection','Looking for an update from the processing queue…');continue;}
      throw Error('Connection interrupted. The job can be reopened from your account history.');
    }
    if(status.state==='succeeded'){
      if(view.entry?.user_id!==state.user?.id)return;
      showVideo(view,status.url,id);
      try{sessionStorage.removeItem(storageKey+state.user.id);}catch{}
      notice('Your video is ready and saved privately in your account.');
      await refresh().catch(()=>{});accountInfo();await loadHistory(true);
      return;
    }
    if(status.state==='failed'){
      try{sessionStorage.removeItem(storageKey+state.user.id);}catch{}
      await refresh().catch(()=>{});accountInfo();
      throw Error('Video generation failed. Any reserved credits were released.');
    }
    if(status.state==='processing')
      view.setStage('Generating video',isCloud()?'Your cloud model is processing this video.':'Your PC is creating the video. You can keep this tab open.');
    else view.setStage('In the queue',isCloud()?'Waiting for the video provider to start.':'Waiting for the GPU to pick up your request.');
  }
  throw Error('Your video is still processing. Check recent AI jobs in your LOOX account.');
}
async function submit(promptText,ratio=ratioField.value,resumeId=null){
  if(busy)return;
  const prompt=String(promptText||'').trim();
  if(!prompt||prompt.length>800){notice('Write a video prompt of 1–800 characters.',true);return;}
  if(!state.user){notice('Sign in to generate videos.');auth('login');return;}
  busy=true;refreshButton();
  try{
  if(!resumeId){
    await refreshQuota();
    if(remainingVideos===0){notice('You have used all 30 video generations today. Resets at 00:00 UTC.',true);return;}
    await checkGPU();
    if(!online){notice(isCloud()?'Cloud video model is unavailable. Check server configuration and provider billing.':'Your PC GPU is offline. Run ComfyUI and the LOOX worker, then try again.',true);return;}
    const displayed=cost(),quote=await updateQuote();if(!quote)return;if(quote.credits!==displayed){notice('Price updated to '+quote.credits+' credits. Click Generate to accept the new quote.');return;}
    if(state.account?.wallet && state.account.wallet.balance<quote.credits){
      pricing();notice('Your account needs more AI credits for this video.',true);return;
    }
  }
  chooseView('generate');
  busy=true;ratioField.disabled=true;refreshButton();
  notice(resumeId?'Restoring your pending video…':'Submitting your video request…');
  let view=null;
  try{
    const follow=sessions.nearBottom();
    const m=chosen(),duration=isCloud()?Number(durationField.value):2;
    if(m?.image&&!imageField.files?.[0])throw Error('This model requires a reference image.');
    let upload=null;
    if(isCloud()&&!imageBlock.hidden&&imageField.files?.[0]){
      const file=imageField.files[0];
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2400000)throw Error('Upload a JPG, PNG or WebP under 2.4 MB.');
      upload=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(Error('Unable to read your image.'));
        reader.readAsDataURL(file);
      });
    }
    const entry=await sessions.begin({prompt,ratio,model_id:m?modelField.value:'wan21',model_name:m?.name||'Wan 2.1 Local',
      media_type:'video',settings:{duration:m?duration+' seconds':'33 frames (~2 seconds)'}});
    view=createCard(prompt,ratio);view.follow=follow;sessions.attach(view,entry);sessions.bottom(follow);
    const id=resumeId||(await api(isCloud()?'cloud_video_job':'job',isCloud()?
      {model:modelField.value,duration:Number(durationField.value),image:upload,
       requestId:entry.request_id,prompt,ratio,quoteToken:serverQuote?.token}:
      {operation:'generate_video',requestId:entry.request_id,prompt,ratio})).id;
    if(!id)throw Error('The backend did not return a video job ID.');
    promptField.value='';
    if(!resumeId){
      try{sessionStorage.setItem(storageKey+state.user.id,JSON.stringify({id,prompt,ratio,model:modelField.value}));}catch{}
      await refresh().catch(()=>{});accountInfo();await refreshQuota();
    }
    await poll(id,view);
  }catch(error){
    if(view)showError(view,error.message||'Unable to generate video.');
    notice(error.message||'Unable to generate video.',true);
    await refreshQuota();
  }finally{
    busy=false;ratioField.disabled=false;refreshButton();
  }
  }finally{busy=false;refreshButton();}
}
form.addEventListener('submit',e=>{e.preventDefault();submit(promptField.value,ratioField.value);});
function historyCard(item){
  const button=make('button','lig-history-item lvg-history-item');
  button.type='button';button.title='Open a previously generated video';
  const cover=make('div','lig-history-cover lvg-history-cover','▶');
  const name=make('span','lig-history-name',item.prompt||'Wan 2.1 video');
  const date=make('span','lig-history-time',new Date(item.created_at).toLocaleDateString());
  button.append(cover,name,date);
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      const data=await api('status',null,{id:item.id});
      if(!data.url)throw Error('Saved video is unavailable. Please retry.');
      const view=createCard(item.prompt||'Wan 2.1 video','16:9');
      showVideo(view,data.url,item.id);
      location.hash='generate';
      resultList.scrollIntoView({behavior:'smooth',block:'start'});
      notice('Opened your private video history.');
    }catch(error){notice(error.message,true);}finally{button.disabled=false;}
  });
  return button;
}
async function loadHistory(){await sessions.loadList();}
historyMore.addEventListener('click',()=>loadHistory());
async function changeUser(){
  accountInfo();
  refreshQuota().catch(()=>{});
  const id=state.user?.id||null;
  if(id!==knownUser){
    knownUser=id;historyOffset=0;historyGrid.replaceChildren();
    await sessions.init();

  }
  await checkGPU();
}
document.addEventListener('loox-account',accountInfo);
document.addEventListener('loox-user',()=>{changeUser().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&state.user){
    refresh().catch(()=>{});
    refreshQuota().catch(()=>{});
    if(Date.now()-lastGpuCheck>15000)checkGPU().catch(()=>{});
  }
});
setInterval(()=>{if(!document.hidden&&state.user&&!busy)checkGPU().catch(()=>{});},30000);
// Video composer is ready to display once the shared prompt toolbar has also mounted.
document.body.classList.add('loox-generator-ready');
(async()=>{
  try{await initialize();}catch{}
  await config().catch(()=>{});
  updateModelUI();
  // Mount after the account catalog is available. The native select stays bound
  // to all generation and history code; the custom picker mirrors its value.
  const pickerRoot=make('div','loox-video-model-picker');
  modelField.insertAdjacentElement('afterend',pickerRoot);
  modelField.classList.add('loox-hidden-native-model');
  const picker=mountModelPicker({
   native:modelField,root:pickerRoot,mode:'video',getInfo:id=>{
    if(id==='wan21')return {name:'Wan 2.1 Local',description:'Local PC · text to video · about 2 seconds',cost:state.config?.operations?.find(x=>x.id==='generate_video')?.cost??8,status:online?'available':'temporarily_unavailable'};
    const m=state.config?.videoModels?.find(x=>x.id===id);
    return {...m,name:m?.name||id,cost:m?.creditCosts?.[durationField.value]??m?.cost??'—',description:m?.imageRequired?'Image-to-video · reference image required':'Text-to-video · fast cloud generation',status:m?.status};
   }
  });
  // Keep responsive model status and its displayed price in sync.
  modelField.addEventListener('change',()=>picker?.sync());
  try{const launch=JSON.parse(sessionStorage.getItem('loox-creative-launch-v1')||'null');if(launch?.kind==='video'){promptField.value=launch.prompt||'';if(launch.model&&[...modelField.options].some(o=>o.value===launch.model)){modelField.value=launch.model;modelField.dispatchEvent(new Event('change'));}else if(launch.model)notice('The original model is unavailable. Choose a compatible model before generating.');sessionStorage.removeItem('loox-creative-launch-v1');}}catch{}
  await sessions.init().catch(e=>notice(e.message,true));
  await changeUser();accountInfo();await updateQuote();

})().catch(error=>notice(error.message||'Could not initialize video workspace.',true));

for(const control of [modelField,durationField,ratioField])control.addEventListener('change',()=>{serverQuote=null;accountInfo();updateQuote();});
document.addEventListener('loox-user',()=>{serverQuote=null;updateQuote();});
