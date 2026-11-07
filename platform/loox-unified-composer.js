/* Unified LOOX composer layout for Image, Video and Agent.
   Presentation only: original IDs, forms, controls and request handlers stay intact. */
(function(){
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 const routes=[
  ['Image Generation','ai-text-to-image.html#generate','image'],
  ['Video Generation','ai-video-generator.html#generate','video'],
  ['AI Agent','ai-chat.html','agent'],
  ['Community','ai-text-to-image.html#templates','community']
 ];
 function links(kind){
  const bar=el('nav','loox-uc-links');
  bar.setAttribute('aria-label','LOOX creative workspaces');
  for(const [name,url,type] of routes){
   const a=el('a','loox-uc-link'+(type===kind?' is-current':''),name);
   a.href=url;
   if(type===kind)a.setAttribute('aria-current','page');
   bar.append(a);
  }
  return bar;
 }
 function heading(text){
  const h=el('h1','loox-uc-title',text);
  return h;
 }
 function markEmpty(thread){
  if(!thread)return;
  const update=()=>document.body.classList.toggle('loox-uc-empty',!thread.querySelector('.ai-msg, .lig-output, .lig-output-card, .lig-result-card'));
  update();
  new MutationObserver(update).observe(thread,{childList:true});
 }
 function generators(video){
  const prefix=video?'lvg':'lig',wrap=document.getElementById(prefix+'-compose-wrap');
  const form=document.getElementById(prefix+'-compose');
  const card=form?.querySelector('.lig-compose-card');
  const toolbar=card?.querySelector('.loox-prompt-toolbar');
  const controls=toolbar?.querySelector('.loox-prompt-controls');
  const textarea=document.getElementById(prefix+'-prompt');
  const actions=card?.querySelector('.lig-compose-actions');
  if(!wrap||!card||!toolbar||!controls||!textarea||!actions)return;
  document.body.classList.add('loox-uc','loox-uc-'+(video?'video':'image'));
  wrap.insertBefore(heading(video?'Describe your video idea to start':'Type in the prompt box to start'),form);
  // Existing model, aspect-ratio, quality and duration controls retain their real DOM nodes.
  toolbar.querySelector('.loox-prompt-modes')?.remove();
  const videoExtras=toolbar.querySelector('.loox-video-extra-controls');
  if(video&&videoExtras){
   const duration=videoExtras.querySelector('#lvg-duration-block');
   if(duration)controls.append(duration);
  }
  card.insertBefore(toolbar,textarea);
  card.classList.add('loox-uc-card');
  toolbar.classList.add('loox-uc-toolbar');
  controls.classList.add('loox-uc-controls');
  const left=el('div','loox-uc-left');
  if(video){
   const uploadBlock=document.getElementById('lvg-image-block');
   const file=document.getElementById('lvg-image');
   if(uploadBlock&&file){
    const button=el('button','loox-uc-add','+');
    button.type='button';button.title='Add a reference image';button.setAttribute('aria-label','Upload reference image');
    button.addEventListener('click',()=>{if(!uploadBlock.hidden&&!file.disabled)file.click()});
    button.id='loox-uc-video-add';
    const filename=el('span','loox-uc-filename','');
    const update=()=>{
     button.hidden=uploadBlock.hidden;
     filename.hidden=uploadBlock.hidden||!file.files?.length;
     filename.textContent=file.files?.[0]?.name||'';
     button.disabled=file.disabled;
    };
    file.addEventListener('change',update);
    const observer=new MutationObserver(update);
    observer.observe(uploadBlock,{attributes:true,attributeFilter:['hidden']});
    uploadBlock.classList.add('loox-uc-file-host');
    left.append(button,filename,uploadBlock);
    update();
   }
  }else{
   // Image generation's existing backend is text-only; do not falsely claim that
   // attached images will influence a generation.
   const add=el('button','loox-uc-add','+');
   add.type='button';add.disabled=true;add.title='Reference-image generation is not supported by the current image models';
   add.setAttribute('aria-label','Reference image input unavailable for this image model');
   left.append(add);
  }
  actions.prepend(left);
  // Keep all existing form submit buttons exactly where they were.
  wrap.append(links(video?'video':'image'));
  const results=document.getElementById(prefix+'-results');
  markEmpty(results);
 }
 function agent(){
  const wrap=document.querySelector('.ai-composer-wrap');
  const form=document.getElementById('aiForm'),textarea=document.getElementById('aiPrompt');
  const actions=form?.querySelector('.ai-actions'),model=document.getElementById('aiModelButton');
  if(!wrap||!form||!actions||!model||!textarea)return;
  document.body.classList.add('loox-uc','loox-uc-agent');
  wrap.insertBefore(heading('Ask anything to start'),wrap.firstChild);
  const toolbar=el('div','loox-uc-toolbar loox-uc-agent-toolbar');
  const controls=el('div','loox-uc-controls');
  controls.append(model);toolbar.append(controls);
  form.insertBefore(toolbar,textarea);
  form.classList.add('loox-uc-card');
  const send=document.getElementById('aiSend');
  if(send){
   send.textContent='Send';
   send.setAttribute('aria-label','Send message');
  }
  wrap.append(links('agent'));
  markEmpty(document.getElementById('aiThread'));
 }
 function run(){
  if(document.body.classList.contains('lvg-body'))generators(true);
  else if(document.body.classList.contains('lig-body'))generators(false);
  else if(document.body.classList.contains('ai-chat'))agent();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
 else run();
})();