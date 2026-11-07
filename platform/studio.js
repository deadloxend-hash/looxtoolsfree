import {el,button,field,msg,config,api,state,refresh,auth,pricing} from './account.js?v=7';

const host=document.querySelector('[data-studio]'), tool=host.dataset.studio;
const isText=tool==='generate'||tool==='generate_video',isMask=['erase','fill'].includes(tool),isUncrop=tool==='uncrop',isSwap=tool==='face_swap';
const form=el('form',null,'lx-stack'),notice=el('p',null,'lx-note'),result=el('section',null,'lx-result');
notice.setAttribute('role','status');const progress=el('progress');progress.setAttribute('aria-label','AI processing');progress.hidden=true;host.append(progress);host.append(form,notice,result);
let source,sourceURL,imageSize,strokes=[],redo=[],current=null,requestId=null,busy=false,generation=0,available=false;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const settings=el('div',null,'lx-fields');
let prompt,ratio,seed,file,permission,scale,canvas,scene,brushSize,eraseBrush=false,undo,redoBtn,brushToggle,swapFile,consent,expand;
function select(parent,title,options){
 const l=el('label',null,'lx-field'),s=el('select');l.append(el('span',title),s);
 for(const [v,t] of options){const o=el('option',t);o.value=v;s.append(o);}parent.append(l);return s;
}
function resetResult(){requestId=null;result.replaceChildren();}
if(isText){
 const l=el('label',tool==='generate_video'?'Describe your video':'Describe your image','lx-field');prompt=el('textarea');prompt.rows=4;prompt.required=true;prompt.maxLength=1200;prompt.placeholder='A lantern-lit street reflected in the rain…';l.append(prompt);form.append(l,settings);
 ratio=select(settings,'Aspect ratio',['1:1','16:9','9:16','4:3','3:4'].map(v=>[v,v]));
 seed=field(settings,'Seed (optional)','number',{min:'0',max:'2147483647',step:'1',placeholder:'Random'});
}else{
 file=field(form,'Choose a JPG, PNG or WebP','file',{accept:'image/jpeg,image/png,image/webp',required:true});
 scene=el('div',null,'lx-stage');scene.hidden=true;form.append(scene);const img=el('img');img.alt='Original image';scene.append(img);
 if(isMask){
  canvas=el('canvas');canvas.setAttribute('aria-label','Paint the area to erase. Use the rectangle controls for keyboard selection.');scene.append(canvas);canvas.className='lx-mask';
  const controls=el('div',null,'lx-tools');brushSize=field(controls,'Brush size','range',{min:1,max:20,value:5});
  brushToggle=button('Switch to eraser',()=>{eraseBrush=!eraseBrush;brushToggle.textContent=eraseBrush?'Switch to brush':'Switch to eraser';});
  undo=button('Undo',()=>{if(strokes.length)redo.push(strokes.pop());paint();resetResult();});
  redoBtn=button('Redo',()=>{if(redo.length)strokes.push(redo.pop());paint();resetResult();});
  controls.append(brushToggle,undo,redoBtn);form.append(controls);
  const alt=el('details');alt.append(el('summary','Select a rectangle with the keyboard'));const dims=el('div',null,'lx-fields');alt.append(dims);
  const entries=['Left %','Top %','Width %','Height %'].map((t,i)=>field(dims,t,'number',{min:0,max:100,value:[25,25,50,50][i]}));
  alt.append(button('Add rectangle',()=>{if(!imageSize)return;const [x,y,w,h]=entries.map(n=>Number(n.value)/100);
   if(!(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1))return msg(notice,'Use a rectangle within the image bounds.');
   strokes.push({rect:[x,y,w,h],erase:false});redo=[];paint();resetResult();}));form.append(alt);
  function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
  canvas.onpointerdown=e=>{if(busy||current||!imageSize||strokes.length>=200)return;canvas.setPointerCapture(e.pointerId);current={points:[point(e)],size:Number(brushSize.value)/100,erase:eraseBrush};redo=[];strokes.push(current);paint();resetResult();};
  canvas.onpointermove=e=>{if(current&&current.points.length<2500){current.points.push(point(e));paint();}};
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{current=null;};
 }
 if(tool==='upscale'){scale=select(settings,'Enlargement',[['upscale2','2×'],['upscale4','4×']]);form.append(settings);}
 if(isUncrop){expand=select(settings,'Expand canvas',[['1.25','25% wider and taller'],['1.50','50% wider and taller']]);form.append(settings);}
 if(isSwap){swapFile=field(form,'Source face image (with permission)','file',{accept:'image/jpeg,image/png,image/webp',required:true});const label=el('label',null,'lx-check');consent=el('input');consent.type='checkbox';consent.required=true;label.append(consent,'I confirm every person whose face is used has agreed to this edit.');form.append(label);}
 const consent=el('label',null,'lx-check');permission=el('input');permission.type='checkbox';permission.required=true;consent.append(permission,'I own this image or have permission to edit it.');form.append(consent);
 file.onchange=async()=>{
  const version=++generation;source=null;imageSize=null;scene.hidden=true;strokes=[];redo=[];resetResult();
  if(sourceURL)URL.revokeObjectURL(sourceURL);const f=file.files[0];if(!f)return;
  try{
   if(f.size>2400000||!['image/jpeg','image/png','image/webp'].includes(f.type))throw Error('Use a JPG, PNG or WebP up to 2.4 MB.');
   const src=URL.createObjectURL(f);sourceURL=src;img.src=src;await img.decode();if(version!==generation)return;
   if(img.naturalWidth*img.naturalHeight>4000000)throw Error('Use an image up to 4 megapixels. The 4× upscaler accepts up to 1 megapixel.');
   imageSize=[img.naturalWidth,img.naturalHeight];source=f;scene.hidden=false;
   if(canvas){[canvas.width,canvas.height]=imageSize;paint();}msg(notice,'');
  }catch(e){if(version===generation){file.value='';msg(notice,e.message);}}
 };
}
function paintMask(target,preview){
 const ctx=target.getContext('2d'),w=target.width,h=target.height;ctx.clearRect(0,0,w,h);
 if(!preview){ctx.fillStyle='black';ctx.fillRect(0,0,w,h);}
 for(const stroke of strokes){
  ctx.globalCompositeOperation=stroke.erase&&preview?'destination-out':'source-over';
  ctx.strokeStyle=ctx.fillStyle=stroke.erase?'black':preview?'#b997ff':'white';
  if(stroke.rect){const [x,y,rw,rh]=stroke.rect;ctx.fillRect(x*w,y*h,rw*w,rh*h);continue;}
  const [first,...rest]=stroke.points, size=Math.max(1,stroke.size*Math.min(w,h));ctx.lineWidth=size;ctx.lineCap=ctx.lineJoin='round';
  ctx.beginPath();ctx.arc(first[0]*w,first[1]*h,size/2,0,2*Math.PI);ctx.fill();
  ctx.beginPath();ctx.moveTo(first[0]*w,first[1]*h);for(const p of rest)ctx.lineTo(p[0]*w,p[1]*h);ctx.stroke();
 }
 ctx.globalCompositeOperation='source-over';
}
function paint(){paintMask(canvas,true);undo.disabled=!strokes.length;redoBtn.disabled=!redo.length;}
function asData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Cannot read image.'));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});}
let fillPrompt;
if(tool==='fill'||isUncrop){
 const label=el('label',isUncrop?'Describe the extended scene':'Describe the replacement','lx-field');
 fillPrompt=el('textarea');fillPrompt.required=true;fillPrompt.maxLength=1200;fillPrompt.rows=3;label.append(fillPrompt);form.append(label);
}
form.addEventListener('dragover',e=>{if(!file)return;e.preventDefault();});
form.addEventListener('drop',e=>{if(!file||busy)return;e.preventDefault();const f=e.dataTransfer.files[0];if(!f)return;const transfer=new DataTransfer();transfer.items.add(f);file.files=transfer.files;file.dispatchEvent(new Event('change'));});
form.append(button('Reset workspace',()=>{if(busy)return;form.reset();source=null;imageSize=null;strokes=[];redo=[];if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=null;if(scene)scene.hidden=true;resetResult();msg(notice,'');}));
const run=el('button',tool==='generate_video'?'Generate video':isText?'Generate image':'Process image','lx-button lx-primary');run.type='submit';
const cost=el('small','Checking service availability…');form.append(cost,run);
const operation=()=>scale?scale.value:tool;
function showCost(){const n=state.config?.operations.find(o=>o.id===operation())?.cost;cost.textContent=available&&n?n+' AI credits on success. Failed jobs release reserved credits.':isSwap?'ReActor needs a running licensed local worker. No credits will be charged until enabled.':'AI processing is awaiting service configuration. No credits will be used.';}
config().then(c=>{
 available=isSwap?Boolean(c.faceSwap?.available):c.ai;
 showCost();
 if(isSwap&&!available)msg(notice,'ReActor face swap is not active yet. Your local PC worker and a commercial InSwapper model license are required. No credits will be charged.');
}).catch(()=>{showCost();});
form.addEventListener('input',()=>{requestId=null;showCost();});
function display(url){
 const img=el(tool==='generate_video'?'video':'img');if(tool==='generate_video'){img.controls=true;img.playsInline=true;img.style.maxWidth='100%';}else img.alt='AI result';img.src=url;const frame=el('div',null,'lx-compare');frame.append(img);result.replaceChildren(el('h2','Your result'),frame);
 if(sourceURL){
  const before=el('img');before.src=sourceURL;before.alt='Original';before.className='lx-before';frame.append(before);
  const slide=field(result,'Before / after comparison','range',{min:0,max:100,value:50});
  const move=()=>before.style.clipPath='inset(0 '+(100-Number(slide.value))+'% 0 0)';slide.oninput=move;move();
 }
 result.append(button(tool==='generate_video'?'Download MP4':'Download PNG',async()=>{try{const response=await api('status',null,{id:lastJob});const r=await fetch(response.url);if(!r.ok)throw Error('Download unavailable.');const blob=URL.createObjectURL(await r.blob()),a=el('a');a.href=blob;a.download='loox-'+operation()+(tool==='generate_video'?'.mp4':'.png');a.click();setTimeout(()=>URL.revokeObjectURL(blob),30000);}catch(e){msg(notice,e.message);}}));
 if(isText)result.append(button('Regenerate',()=>form.requestSubmit()));
}
let lastJob;
function showRecentResult(){
 if(!isText||!state.account||result.childElementCount)return;
 const recent=state.account.jobs?.find(j=>j.operation===tool&&j.state==='succeeded');
 if(!recent)return;
 const open=button('View your last generated '+(tool==='generate_video'?'video':'image'),async()=>{
  open.disabled=true;
  try{
   const previous=await api('status',null,{id:recent.id});
   if(!previous.url)throw Error('The result is not available yet.');
   lastJob=recent.id;display(previous.url);msg(notice,'Previous generation recovered from your private LOOX library.');
  }catch(e){msg(notice,e.message);}finally{open.disabled=false;}
 },'lx-button');
 result.append(el('h2','Recent generation'),open);
}
document.addEventListener('loox-account',showRecentResult);
showRecentResult();
form.onsubmit=async e=>{
 e.preventDefault();if(busy)return;
 if(!state.user){auth();return;}
 if(!available)return msg(notice,isSwap?'Face Swap requires a running ReActor worker and a licensed InSwapper model. No credits used.':'AI processing setup is pending.');
 const op=operation(),price=state.config.operations.find(o=>o.id===op)?.cost;
 if(!requestId && state.account && state.account.wallet.balance<price){pricing();return;}
 busy=true;progress.hidden=false;run.disabled=true;
 const controls=[...form.querySelectorAll('input,select,textarea,button')].filter(n=>n!==run&&!n.disabled);controls.forEach(n=>n.disabled=true);
 try{
  const body={operation:op,requestId:requestId ||=crypto.randomUUID()};if(fillPrompt)body.prompt=fillPrompt.value;
  if(isText){body.prompt=prompt.value;body.ratio=ratio.value;if(seed.value!=='')body.seed=Number(seed.value);}
  else{
   if(!source)throw Error('Choose a valid image first.');
   if(op==='upscale4'&&imageSize[0]*imageSize[1]>1000000)throw Error('4× upscale accepts images up to 1 megapixel.');
   body.image=await asData(source);body.permission=permission.checked;
   if(isMask){if(!strokes.length)throw Error('Paint the object you want to remove.');const mask=el('canvas');[mask.width,mask.height]=imageSize;paintMask(mask,false);body.mask=mask.toDataURL('image/png');}
   if(isUncrop){
    const factor=Number(expand.value),w=Math.round(imageSize[0]*factor),h=Math.round(imageSize[1]*factor);
    if(w*h>4000000)throw Error('The expanded canvas must be under 4 megapixels. Use a smaller original image.');
    const x=Math.floor((w-imageSize[0])/2),y=Math.floor((h-imageSize[1])/2);
    const base=el('canvas'),mask=el('canvas');base.width=mask.width=w;base.height=mask.height=h;
    const g=base.getContext('2d');g.fillStyle='#202020';g.fillRect(0,0,w,h);g.drawImage(img,x,y,imageSize[0],imageSize[1]);
    const m=mask.getContext('2d');m.fillStyle='white';m.fillRect(0,0,w,h);m.fillStyle='black';m.fillRect(x,y,imageSize[0],imageSize[1]);
    body.image=base.toDataURL('image/png');body.mask=mask.toDataURL('image/png');
   }
   if(isSwap){
    if(!swapFile.files[0])throw Error('Choose a source face image.');
    if(swapFile.files[0].size>2400000||!['image/jpeg','image/png','image/webp'].includes(swapFile.files[0].type))throw Error('Source face must be a JPG, PNG or WebP under 2.4 MB.');
    body.swap_image=await asData(swapFile.files[0]);body.consent=consent.checked;
   }
  }
  if(JSON.stringify(body).length>4150000)throw Error('Image and mask together are too large. Use a smaller image.');
  msg(notice,'Submitting your edit…');const j=await api('job',body);lastJob=j.id;result.replaceChildren();await refresh();
  for(let n=0;n<100;n++){
   await sleep(n===0?800:3500);const job=await api('status',null,{id:j.id});
   if(job.state==='succeeded'){requestId=null;display(job.url);msg(notice,'Complete. Your result is also in My Profile.');break;}
   if(job.state==='failed'){requestId=null;const code=job.failure_code;throw Error(code==='provider_billing'?'AI processing is temporarily unavailable because the LOOX service needs additional processing balance. Your AI credits were returned. Please try again after service activation.':code==='provider_auth'?'LOOX AI service configuration needs attention. Your AI credits were returned.':code==='provider_limit'?'The LOOX AI service is busy or has reached its usage limit. Your AI credits were returned.':'AI processing could not complete. Your AI credits were returned. Please try again later.');}
   msg(notice,'Your PC is generating. This may take several minutes, especially during model loading. Keep ComfyUI and your worker running.');
  }
 }catch(err){msg(notice,err.message);if(err.status===402)pricing();if(err.status===401)auth();}
 finally{busy=false;progress.hidden=true;run.disabled=false;controls.forEach(n=>n.disabled=false);if(isMask&&imageSize)paint();refresh().catch(()=>{});}
};
