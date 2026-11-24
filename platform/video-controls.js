import {state} from './account.js?v=settings-2-20261124';
export function mountVideoControls(card,area){
 const model=document.getElementById('lvg-model'),duration=document.getElementById('lvg-duration'),start=document.getElementById('lvg-image'),end=document.getElementById('lvg-end-image');
 if(!end||!start)return;
 const modes=document.createElement('div');modes.className='loox-video-modes';modes.setAttribute('role','group');modes.setAttribute('aria-label','Video creation mode');
 const text=document.createElement('button'),image=document.createElement('button');
 text.type=image.type='button';text.textContent='Text to video';image.textContent='Image to video';modes.append(text,image);area.before(modes);
 const row=document.createElement('div');row.className='studio-frame-row';
 const preview=document.createElement('img');preview.alt='End frame preview';preview.className='loox-end-preview';preview.hidden=true;
 const description=document.createElement('div');description.className='studio-frame-text';
 const title=document.createElement('strong');title.textContent='End frame';const hint=document.createElement('small');description.append(title,hint);
 const choose=document.createElement('button');choose.type='button';choose.className='studio-frame-change';choose.onclick=()=>end.click();
 const remove=document.createElement('button');remove.type='button';remove.className='studio-frame-clear';remove.textContent='×';remove.setAttribute('aria-label','Remove end frame');remove.onclick=()=>{end.value='';end.dispatchEvent(new Event('change',{bubbles:true}));};
 row.append(preview,description,choose,remove);area.append(row);
 const spec=document.createElement('p');spec.className='loox-video-capabilities';spec.setAttribute('role','status');area.after(spec);
 let objectURL=null,mode='text';
 function sync(){
  const info=state.config?.videoModels?.find(m=>m.id===model.value),cap=info?.capabilities;
  const supportsStart=Boolean(cap?.startFrame??cap?.imageReference),requires=Boolean(info?.imageRequired);
  if(requires)mode='image';if(!supportsStart)mode='text';
  text.disabled=requires;text.title=requires?'This model requires a start frame.':'';image.disabled=!supportsStart;
  text.setAttribute('aria-pressed',String(mode==='text'));image.setAttribute('aria-pressed',String(mode==='image'));
  start.dataset.videoMode=mode;start.required=requires;
  const supportsEnd=Boolean(cap?.endFrame);end.disabled=!supportsEnd||mode!=='image';
  choose.disabled=end.disabled;choose.textContent=end.files?.[0]?'Replace':'Add frame';
  hint.textContent=!supportsEnd?'End frames are not available for this model in LOOX Studio.':mode!=='image'?'Choose image-to-video to set start and end frames.':cap?.endFrameDurations&&!cap.endFrameDurations.includes(Number(duration.value))?'End-frame transitions require 8 seconds.':'Optional final frame';
  remove.hidden=!end.files?.[0];preview.hidden=!end.files?.[0];
  const resolution=cap?.resolution||(model.value==='wan21'?'832×480 / ratio preset':'Output size awaiting verification');
  spec.textContent=resolution+' · '+(cap?.audioGeneration?'Audio included in this configuration':'Audio unavailable in this configuration')+' · '+(cap?.ratioMode?'Framing follows the start image when supplied.':'Preset framing')+' Additional references and video editing are not available in this studio.';
 }
 text.onclick=()=>{mode='text';sync();};image.onclick=()=>{mode='image';sync();};
 start.addEventListener('change',()=>{if(start.files?.[0])mode='image';sync();});
 end.addEventListener('change',()=>{
  if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;
  const file=end.files?.[0];
  if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2400000)){end.value='';hint.textContent='Choose a JPG, PNG or WebP under 2.4 MB.';return;}
  if(file){objectURL=URL.createObjectURL(file);preview.src=objectURL;}else preview.removeAttribute('src');sync();
 });
 function dropzone(zone,input){zone.addEventListener('dragover',e=>{if(!input.disabled){e.preventDefault();zone.classList.add('is-dragging');}});zone.addEventListener('dragleave',()=>zone.classList.remove('is-dragging'));zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('is-dragging');if(input.disabled)return;const file=e.dataTransfer.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2400000){hint.textContent='Choose a JPG, PNG or WebP under 2.4 MB.';return;}const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));});}
 dropzone(area.querySelector('.studio-frame-row'),start);dropzone(row,end);
 model.addEventListener('change',sync);duration.addEventListener('change',sync);document.addEventListener('loox-account',sync);document.addEventListener('loox-config',sync);sync();
 window.addEventListener('pagehide',()=>{if(objectURL)URL.revokeObjectURL(objectURL);},{once:true});
}
