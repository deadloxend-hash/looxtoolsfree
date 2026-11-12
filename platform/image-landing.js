import {config} from './account.js?v=9';
const root=document.querySelector('[data-image-showcase]');

// Onboarding belongs to the Image landing HERO only. All content below #discover
// keeps its existing layout and behavior.
function setupImageFirstCreation(){
 const form=document.getElementById('creative-landing-form');
 const prompt=document.getElementById('creative-prompt');
 const model=document.getElementById('creative-model');
 const trigger=document.getElementById('image-landing-model-trigger');
 const menu=document.getElementById('image-landing-model-options');
 const modelName=document.getElementById('image-landing-model-name');
 if(!form||!prompt||!model||!trigger||!menu||!modelName)return;
 const label=form.querySelector('label[for="creative-model"]');
 if(label)label.htmlFor=trigger.id;
 model.tabIndex=-1;
 model.setAttribute('aria-hidden','true');
 form.classList.add('image-model-ready');
 const error=document.createElement('span');
 error.id='image-landing-prompt-error';
 error.className='image-landing-prompt-error';
 error.setAttribute('role','alert');
 error.hidden=true;
 prompt.after(error);
 const count=document.createElement('span');
 count.className='image-prompt-count';
 count.setAttribute('aria-hidden','true');
 prompt.after(count);
 function promptChange(){
  const length=prompt.value.length;
  const rows=prompt.value.split('\n').length;
  prompt.style.height='auto';
  prompt.style.height=Math.min(Math.max(75,prompt.scrollHeight,rows*22),145)+'px';
  count.textContent=length>100?length+' / 1200':'';
  error.hidden=true;
  prompt.removeAttribute('aria-invalid');
 }
 prompt.addEventListener('input',promptChange);
 for(const b of form.querySelectorAll('[data-example]')){
  b.addEventListener('click',()=>{
   requestAnimationFrame(promptChange);
   for(const btn of form.querySelectorAll('[data-example]'))btn.classList.toggle('is-selected',btn===b);
  });
 }
 const ratioChoices=[...form.querySelectorAll('input[name="creative-ratio"]')];
 const ratioNote=form.querySelector('.image-format-heading>span');
 const ratioHints={'1:1':'Great for portraits and everyday creations','16:9':'Great for scenes, banners, and landscapes','9:16':'Great for phone wallpapers and vertical art'};
 const syncRatio=()=>{
  const chosen=ratioChoices.find(input=>input.checked)?.value||'1:1';
  if(ratioNote)ratioNote.textContent=ratioHints[chosen]||'Choose the frame that fits your idea';
 };
 ratioChoices.forEach(input=>input.addEventListener('change',syncRatio));syncRatio();
 let isOpen=false;
 function close(focus=false){
  isOpen=false;menu.hidden=true;
  trigger.setAttribute('aria-expanded','false');
  if(focus)trigger.focus({preventScroll:true});
 }
 function syncModel(){
  const option=model.selectedOptions[0];
  const text=(option?.textContent||'Choose in Studio').replace(/\s*· unavailable$/i,'');
  modelName.textContent=text;
  const unavailable=option?.disabled||!option;
  trigger.title=unavailable?'This model is not available yet; you can explore others in Studio.':text;
  trigger.classList.toggle('image-model-unavailable',!!unavailable);
  if(isOpen)renderOptions();
 }
 function renderOptions(){
  menu.replaceChildren();
  for(const option of model.options){
   const item=document.createElement('button');item.type='button';
   item.className='image-model-option';item.setAttribute('role','option');
   item.disabled=option.disabled;
   const selected=option.value===model.value;
   item.setAttribute('aria-selected',String(selected));
   const title=document.createElement('span');
   title.textContent=(option.textContent||'').replace(/\s*· unavailable$/i,'');
   const availability=document.createElement('small');
   availability.textContent=option.disabled?'Unavailable':'Available';
   const check=document.createElement('span');check.className='image-model-check';
   check.textContent=selected?'✓':'';
   item.append(title,availability,check);
   item.addEventListener('click',()=>{
    if(option.disabled)return;
    model.value=option.value;
    model.dispatchEvent(new Event('change',{bubbles:true}));
    close(true);
   });
   menu.append(item);
  }
  if(!menu.children.length){
   const message=document.createElement('p');
   message.className='image-model-empty';message.textContent='Models will appear when configuration loads.';
   menu.append(message);
  }
 }
 trigger.addEventListener('click',()=>{
  if(isOpen){close();return;}
  renderOptions();isOpen=true;menu.hidden=false;
  trigger.setAttribute('aria-expanded','true');
 });
 trigger.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'){
   event.preventDefault();
   if(!isOpen)trigger.click();
   menu.querySelector('button:not(:disabled)')?.focus();
  }
 });
 menu.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
  if(event.key==='Tab'){close();return;}
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  const items=[...menu.querySelectorAll('button:not(:disabled)')];
  if(!items.length)return;
  const index=items.indexOf(document.activeElement);
  const next=event.key==='Home'?0:event.key==='End'?items.length-1:
   (index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
  event.preventDefault();items[next].focus();
 });
 document.addEventListener('pointerdown',event=>{
  if(isOpen&&!event.target.closest('.image-model-control'))close();
 });
 document.addEventListener('keydown',event=>{
  if(isOpen&&event.key==='Escape'){event.preventDefault();close(true);}
 });
 model.addEventListener('change',syncModel);
 const observer=new MutationObserver(syncModel);
 observer.observe(model,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected']});
 syncModel();
 // Prevent submitting an empty prompt. The existing launch handler remains the
 // only place that stages the real prompt/model/settings and opens the studio.
 form.addEventListener('submit',event=>{
  if(prompt.value.trim())return;
  event.preventDefault();
  event.stopImmediatePropagation();
  error.textContent='Add a short description or choose one of the starter ideas above.';
  error.hidden=false;
  prompt.setAttribute('aria-invalid','true');
  prompt.focus({preventScroll:true});
 },true);
}
if(root)setupImageFirstCreation();
if(root){
 const expand=document.getElementById('models-expand');
 expand.addEventListener('click',()=>{
  const open=expand.getAttribute('aria-expanded')!=='true';
  document.querySelectorAll('[data-model-card]').forEach((card,i)=>{if(i>=6)card.hidden=!open;});
  expand.setAttribute('aria-expanded',String(open));
  expand.textContent=open?'Show fewer models −':`Explore all ${document.querySelectorAll('[data-model-card]').length} models ＋`;
 });
 document.getElementById('image-year').textContent=new Date().getFullYear();
 if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.08});
  document.querySelectorAll('.reveal').forEach(node=>{node.classList.add('reveal-ready');observer.observe(node);});
 }
 const status=document.getElementById('image-model-status');
 try{
  const cfg=await config(),models=[{id:'flux',name:'FLUX.1 Schnell',available:cfg.local?.available,status:'temporarily_unavailable'},...(cfg.models||[])];
  const ids=new Set(models.map(m=>m.id));document.querySelectorAll('[data-model-card]').forEach(card=>{if(!ids.has(card.dataset.modelCard))card.remove();});
  let ready=0;
  for(const model of models){
   let card=[...document.querySelectorAll('[data-model-card]')].find(c=>c.dataset.modelCard===model.id);
   if(!card){
    card=document.createElement('article');card.className='model-card';card.dataset.modelCard=model.id;
    for(const [tag,cls,text] of [['span','model-symbol','✧'],['span','model-state','Checking status…'],['h3','',model.name],['p','',model.description||'Explore this model in the studio.'],['small','','Text prompts · Aspect ratios'],['a','model-launch','View in workspace →']]){const node=document.createElement(tag);node.className=cls;node.textContent=text;if(tag==='a')node.href='ai-text-to-image.html#generate';card.append(node);}
    document.querySelector('.model-grid').append(card);card.hidden=expand.getAttribute('aria-expanded')!=='true';
   }
   card.querySelector('h3').textContent=model.name;
   const badge=card.querySelector('.model-state'),link=card.querySelector('.model-launch');
   badge.textContent=model.available?'Available':model.status==='coming_soon'?'Coming soon':'Temporarily unavailable';
   badge.classList.toggle('ready',Boolean(model.available));
   link.addEventListener('click',()=>{try{sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:'image',prompt:'',model:model.id}));}catch{}});
   if(model.available){ready++;link.textContent='Try Now →';}
  }
  const cards=[...document.querySelectorAll('[data-model-card]')];
  const expanded=expand.getAttribute('aria-expanded')==='true';
  cards.forEach((card,index)=>{card.hidden=!expanded&&index>=6;});
  expand.hidden=cards.length<=6;
  expand.textContent=expanded?'Show fewer models −':`Explore all ${cards.length} models ＋`;
  status.textContent=ready?`${ready} model${ready===1?'':'s'} available now · availability checked live`:'Image generation is currently unavailable. Explore the studio and prepare your ideas while models await activation.';
  const first=models.find(model=>model.available);
  if(first)document.querySelectorAll('[data-feature-model]').forEach(badge=>{badge.textContent=first.name+' · available in studio';badge.parentElement.querySelector('a').addEventListener('click',()=>{try{sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:'image',prompt:'',model:first.id}));}catch{}});});
 }catch{document.querySelectorAll('.model-state').forEach(b=>b.textContent='Status not checked');status.textContent='Live availability could not be checked. Open the workspace for the latest model status.';}
}
