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
  card.insertBefore(toolbar,actions);
  const oldPill=actions.querySelector('.lig-image-pill');if(oldPill)oldPill.remove();
  document.body.classList.add('loox-prompt-compact');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();