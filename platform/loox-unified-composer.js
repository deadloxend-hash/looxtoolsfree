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
  // The reference has a separate, right-aligned settings row ABOVE the prompt box.
  // Move the existing toolbar without replacing any controls or event listeners.
  wrap.insertBefore(toolbar,form);
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
   // Reference-image mode is available only for the local FLUX worker when the
   // backend confirms it is running the updated img2img graph.
   const add=el('button','loox-uc-add','+');
   add.id='lig-reference-add';add.type='button';
   add.title='Choose a reference image';add.setAttribute('aria-label','Choose reference image');
   const input=el('input');input.type='file';input.id='lig-reference-image';
   input.accept='image/png,image/jpeg,image/webp';
   input.hidden=true;input.setAttribute('aria-label','Reference image');
   const preview=el('span','loox-uc-filename');preview.id='lig-reference-name';preview.hidden=true;
   const remove=el('button','loox-uc-remove','×');remove.type='button';remove.id='lig-reference-remove';
   remove.hidden=true;remove.title='Remove reference image';
   const settings=el('div','loox-uc-reference-settings');settings.id='lig-reference-settings';settings.hidden=true;
   const strength=el('input');strength.type='range';strength.id='lig-reference-strength';strength.min='20';strength.max='80';strength.step='5';strength.value='65';
   const label=el('label',null,'Reference similarity · 65%');label.htmlFor=strength.id;
   const consent=el('label','loox-uc-reference-consent');
   const checkbox=el('input');checkbox.type='checkbox';checkbox.id='lig-reference-permission';
   consent.append(checkbox,document.createTextNode('I have permission to use this image'));
   strength.addEventListener('input',()=>label.textContent='Reference similarity · '+strength.value+'%');
   settings.append(label,strength,consent);
   add.addEventListener('click',()=>input.click());
   const clear=()=>{input.value='';preview.textContent='';preview.hidden=true;remove.hidden=true;settings.hidden=true;checkbox.checked=false;};
   remove.addEventListener('click',clear);
   input.addEventListener('change',()=>{
    const file=input.files?.[0];if(!file){clear();return;}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2400000){
     clear();window.alert('Choose a PNG, JPG or WebP reference image under 2.4 MB.');return;
    }
    preview.textContent=file.name;preview.hidden=false;remove.hidden=false;settings.hidden=false;
   });
   left.append(add,input,preview,remove,settings);
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
  // Agent uses the same external toolbar position as Image and Video.
  wrap.insertBefore(toolbar,form);
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