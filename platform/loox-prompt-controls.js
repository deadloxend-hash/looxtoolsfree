/* Compact AI generation controls; preserve the original selects and generation handlers. */
(function(){
 function setup(){
  const video=document.body.classList.contains('lvg-body');
  const prefix=video?'lvg':'lig';
  const card=document.querySelector('.lig-compose-card');
  const actions=card?.querySelector('.lig-compose-actions');
  const model=document.getElementById(prefix+'-model');
  const ratio=document.getElementById(prefix+'-ratio');
  if(!card||!actions||!model||!ratio)return;
  const toolbar=document.createElement('div');toolbar.className='loox-prompt-toolbar';
  const tabs=document.createElement('div');tabs.className='loox-prompt-modes';tabs.setAttribute('aria-label','Generation type');
  for(const [label,url,active] of [['AI Image','ai-text-to-image.html#generate',!video],['AI Video','ai-video-generator.html#generate',video]]){
   const a=document.createElement('a');a.href=url;a.textContent=label;a.className='loox-prompt-mode'+(active?' is-active':'');if(active)a.setAttribute('aria-current','page');tabs.append(a);
  }
  const controls=document.createElement('div');controls.className='loox-prompt-controls';
  for(const field of [model,ratio]){
   const block=field.closest('.lig-setting-block');
   if(!block)continue;
   block.classList.add('loox-prompt-setting');
   controls.append(block);
  }
  toolbar.append(tabs,controls);
  // Ratio popover uses the actual generator ratio select as its source of truth.
  const ratioBlock=ratio.closest('.lig-setting-block');
  if(ratioBlock){
   const custom=ratioBlock.querySelector('.lig-custom-select');
   if(custom)custom.style.display='none';
   ratioBlock.classList.add('loox-ratio-host');
   const button=document.createElement('button');button.type='button';button.className='loox-ratio-button';button.setAttribute('aria-haspopup','true');button.setAttribute('aria-expanded','false');
   const pop=document.createElement('div');pop.className='loox-ratio-pop';pop.hidden=true;
   const preview=document.createElement('div');preview.className='loox-ratio-preview';
   const shape=document.createElement('div');shape.className='loox-ratio-shape';preview.append(shape);
   const choices=document.createElement('div');choices.className='loox-ratio-choices';
   const labels={'1:1':'Square','16:9':'Widescreen','9:16':'Vertical','4:3':'Landscape','3:4':'Portrait'};
   function refresh(){
    const opt=ratio.selectedOptions[0];button.textContent='▣  '+ratio.value;
    shape.style.aspectRatio=ratio.value.replace(':',' / ');
    choices.querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b.dataset.ratio===ratio.value);b.setAttribute('aria-checked',String(b.dataset.ratio===ratio.value));});
   }
   ratio.querySelectorAll('option').forEach(opt=>{
    const item=document.createElement('button');item.type='button';item.dataset.ratio=opt.value;item.setAttribute('role','menuitemradio');
    item.innerHTML='<span class="loox-ratio-value"></span><span class="loox-ratio-name"></span><span class="loox-ratio-tick">✓</span>';
    item.children[0].textContent=opt.value;item.children[1].textContent=labels[opt.value]||opt.textContent;
    item.addEventListener('click',()=>{ratio.value=opt.value;ratio.dispatchEvent(new Event('change',{bubbles:true}));pop.hidden=true;button.setAttribute('aria-expanded','false');refresh();});
    choices.append(item);
   });
   pop.append(preview,choices);ratioBlock.append(button,pop);ratio.addEventListener('change',refresh);refresh();
   button.addEventListener('click',()=>{pop.hidden=!pop.hidden;button.setAttribute('aria-expanded',String(!pop.hidden));});
   document.addEventListener('pointerdown',e=>{if(!ratioBlock.contains(e.target)){pop.hidden=true;button.setAttribute('aria-expanded','false');}});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'){pop.hidden=true;button.setAttribute('aria-expanded','false');}});
  }
  // Only show real, model-supported resolution and quality settings.
  if(!video){
   const extra=document.createElement('div');extra.className='loox-quality-controls';controls.append(extra);
   for(const id of ['lig-resolution-block','lig-quality-block']){
    const block=document.getElementById(id);if(block){block.classList.add('loox-prompt-setting','loox-quality-setting');extra.append(block);}
   }
   const sync=()=>{extra.querySelectorAll('.loox-quality-setting').forEach(b=>{b.style.display=b.hidden?'none':'block';});};
   const observer=new MutationObserver(sync);extra.querySelectorAll('.loox-quality-setting').forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['hidden']}));
   sync();
  }
  card.insertBefore(toolbar,actions);
  const oldPill=actions.querySelector('.lig-image-pill');if(oldPill)oldPill.remove();
  document.body.classList.add('loox-prompt-compact');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();