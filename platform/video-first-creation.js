(()=>{
/* Guided first-video setup. All credits are confirmed in the real workspace. */
// Independent of account modules: custom dropdowns must work before API calls.
async function config(){
 const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox?action=config',{
  credentials:'omit',signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error('Video models are temporarily unavailable.');
 return response.json();
}
const form=document.getElementById('creative-landing-form'),prompt=document.getElementById('creative-prompt');
const model=document.getElementById('creative-model'),trigger=document.getElementById('video-landing-model-trigger');
const menu=document.getElementById('video-landing-model-options'),name=document.getElementById('video-landing-model-name');
const lengthBox=document.getElementById('video-landing-durations'),status=document.getElementById('creative-landing-status');
const ratioInputs=[...form.querySelectorAll('[name="creative-video-ratio"]:not([value="custom"])')];
const ratioNote=document.getElementById('video-ratio-hint');
const catalog=[
 ['wan21','Wan 2.1 · Local PC',[2],[],false,true],
 ['wan22_5b_fast','Wan 2.2 5B Fast',[5],[],false],
 ['wan22_t2v_fast','Wan 2.2 T2V Fast',[5],[],false],
 ['wan22_i2v_fast','Wan 2.2 I2V Fast',[5],[],true],
 ['wan25_i2v','Wan 2.5 I2V',[5,10],[],true],
 ['wan26_i2v_flash','Wan 2.6 I2V Flash',[5,10],[],true],
 ['kling_30','Kling 3.0 Standard',[5,10],['16:9','9:16','1:1'],false],
 ['seedance_20','Seedance 2.0',[5,10],[],false],
 ['veo_31_fast','Veo 3.1 Fast',[4,6,8],['16:9','9:16'],false],
 ['runway_45','Runway Gen-4.5',[5,10],[],false],
 ['flux3_video','FLUX 3 Video Draft HD',[5,10],[],false]
].map(([id,label,lengths,ratios,needsImage=false,local=false])=>({id,label,lengths,ratios,needsImage,local,available:false}));
const byId=new Map(catalog.map(x=>[x.id,x]));
const el=(tag,cls,text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
let duration=null,open=false,choice=null;
const error=el('span','video-landing-prompt-error');error.hidden=true;error.id='video-prompt-error';error.role='alert';
prompt.setAttribute('aria-describedby',error.id);
const count=el('span','video-prompt-count');count.setAttribute('aria-hidden','true');prompt.after(error,count);
function updatePrompt(){
 prompt.style.height='auto';prompt.style.height=Math.min(148,Math.max(76,prompt.scrollHeight))+'px';
 count.textContent=prompt.value.length>120?prompt.value.length+' / 800':'';
 error.hidden=true;prompt.removeAttribute('aria-invalid');
}
prompt.addEventListener('input',updatePrompt);
form.querySelectorAll('[data-example]').forEach(btn=>btn.addEventListener('click',()=>{
 form.querySelectorAll('[data-example]').forEach(b=>b.classList.toggle('is-selected',b===btn));
 requestAnimationFrame(updatePrompt);
}));
function syncRatio(){
 const selected=form.querySelector('[name="creative-video-ratio"]:checked')?.value||'16:9';
 ratioNote.textContent=({'16:9':'Wide scenes and films','9:16':'Shorts and mobile stories','1:1':'Square video posts','custom':'Choose a compatible preset below'})[selected];
}
form.addEventListener('change',e=>{if(e.target.name==='creative-video-ratio')syncRatio();});
function closeMenu(focus=false){open=false;menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true});}
function renderMenu(){
 menu.replaceChildren();
 const items=[...model.options].sort((a,b)=>Number(a.disabled)-Number(b.disabled));
 for(const opt of items){
  const candidate=byId.get(opt.value);
  const item=el('button','video-model-option');item.type='button';item.disabled=opt.disabled;
  item.setAttribute('role','option');item.setAttribute('aria-selected',String(opt.value===model.value));
  item.append(el('span','',candidate?.label||opt.textContent),
   el('small','',candidate?.local?'Preview':'Coming Soon'),
   el('span','video-model-check',opt.value===model.value?'✓':''));
  item.addEventListener('click',()=>{
   model.value=opt.value;model.dispatchEvent(new Event('change',{bubbles:true}));closeMenu(true);
  });
  menu.append(item);
 }
}
function syncModel(){
 choice=byId.get(model.value)||catalog[0];
 name.textContent=choice.label.replace(' · Local PC','')+' · Coming Soon';
 trigger.title=choice.label+(choice.needsImage?' · Add a start image in Studio':choice.local?' · Preview only':'');
 lengthBox.replaceChildren();
 if(choice.local){
  duration=null;lengthBox.append(el('span','video-duration-loading','≈2s · Preview'));
 }else{
  if(!choice.lengths.includes(duration))duration=choice.lengths[0];
  for(const seconds of choice.lengths){
   const b=el('button','video-duration-choice',seconds+'s');
   b.type='button';b.setAttribute('aria-pressed',String(seconds===duration));
   b.setAttribute('aria-label',seconds+' second clip');
   b.addEventListener('click',()=>{duration=seconds;syncModel();});
   lengthBox.append(b);
  }
 }
 const allowed=choice.ratios.length?choice.ratios:['16:9','9:16','1:1','4:3','3:4'];
 for(const input of ratioInputs){
  input.disabled=!allowed.includes(input.value);
  input.closest('label')?.setAttribute('aria-disabled',String(input.disabled));
 }
 if(!form.querySelector('[name="creative-video-ratio"][value="custom"]:checked')&&!ratioInputs.some(x=>x.checked&&!x.disabled)){
  const available=ratioInputs.find(x=>!x.disabled);if(available)available.checked=true;
 }
 syncRatio();if(open)renderMenu();
}
form.querySelector('label[for="creative-model"]').htmlFor=trigger.id;
model.tabIndex=-1;model.setAttribute('aria-hidden','true');form.classList.add('video-model-ready');
trigger.addEventListener('click',()=>{
 if(open){closeMenu();return;}
 open=true;renderMenu();menu.hidden=false;trigger.setAttribute('aria-expanded','true');
});
trigger.addEventListener('keydown',e=>{
 if(e.key!=='ArrowDown')return;
 e.preventDefault();if(!open)trigger.click();menu.querySelector('button:not(:disabled)')?.focus();
});
menu.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu(true);return;}
 if(e.key==='Tab'){closeMenu();return;}
 if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
 const items=[...menu.querySelectorAll('button:not(:disabled)')];if(!items.length)return;
 const index=items.indexOf(document.activeElement);
 const next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
 e.preventDefault();items[next].focus();
});
document.addEventListener('pointerdown',e=>{if(open&&!e.target.closest('.video-model-control'))closeMenu();});
document.addEventListener('keydown',e=>{if(open&&e.key==='Escape'){e.preventDefault();closeMenu(true);}});
model.addEventListener('change',syncModel);
window.__looxVideoLandingRatios=()=>byId.get(model.value)?.ratios?.length?byId.get(model.value).ratios:['16:9','9:16','1:1','4:3','3:4'];
window.__looxVideoLandingSettings=()=>({
 aspect_ratio:ratioInputs.find(x=>x.checked&&!x.disabled)?.value||'16:9',
 ...(choice&&!choice.local&&duration?{duration}:{})
});
syncModel();
async function hydrateVideoModels(){
try{
 const cfg=await config();
 const fetched=new Map((cfg?.videoModels||[]).map(x=>[x.id,x]));
 for(const server of cfg?.videoModels||[]){if(!byId.has(server.id)){const candidate={id:server.id,label:server.name,lengths:server.durationOptions||[],ratios:server.capabilities?.ratios||[],needsImage:Boolean(server.imageRequired),local:false,available:Boolean(server.available)};catalog.push(candidate);byId.set(candidate.id,candidate);}}
 for(const candidate of catalog){
  const server=fetched.get(candidate.id);
  candidate.available=false; // Video generation is locked during the free launch.
  candidate.needsImage=Boolean(server?.imageRequired??candidate.needsImage);
  if(server?.capabilities?.ratios)candidate.ratios=server.capabilities.ratios;
  if(Array.isArray(server?.durationOptions)&&server.durationOptions.length){
   const supported=server.durationOptions.map(Number).filter(n=>candidate.lengths.includes(n));
   if(supported.length)candidate.lengths=supported;
  }
 }
 model.replaceChildren(...catalog.map(x=>{
  const option=new Option(x.label.replace(' · Local PC','')+' · Coming Soon',x.id);
  option.disabled=!x.local&&!x.available;return option;
 }));
 model.value=catalog.find(x=>x.available&&!x.needsImage)?.id||'wan21';
 syncModel();
 status.textContent='Video generation is Coming Soon. Explore Studio and prepare your draft without using credits.';
}catch{
 model.replaceChildren(new Option('Wan 2.1 · Coming Soon','wan21'));model.value='wan21';
 syncModel();status.textContent='Video generation is Coming Soon. You can still prepare a draft and explore Studio.';
}
}
hydrateVideoModels();

})();