/* Unified LOOX composer layout for Image, Video and Agent.
   Presentation only: original IDs, forms, controls and request handlers stay intact. */
(function(){
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 const routes=[
  ['AI Image','ai-text-to-image.html#generate','image'],
  ['AI Video','ai-video-generator.html#generate','video'],
  ['AI Assistant','ai-chat.html','agent'],

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
   // FLUX Schnell uses a native img2img latent. Multiple selected images are
   // combined visibly into one tiled reference (no unsupported multi-IP-adapter claims).
   const MAX_REFERENCES=12, selected=[];
   const tray=el('div','loox-ref-tray');tray.id='lig-reference-tray';
   tray.hidden=true;tray.setAttribute('aria-label','Selected reference images');
   const grid=el('div','loox-ref-grid');grid.id='lig-reference-grid';
   const input=el('input');input.type='file';input.id='lig-reference-image';
   input.accept='image/png,image/jpeg,image/webp';input.multiple=true;input.hidden=true;
   const add=el('button','loox-ref-add','+');add.type='button';add.id='lig-reference-add';
   add.title='Add reference images';add.setAttribute('aria-label','Add reference images');
   add.addEventListener('click',()=>input.click());
   const header=el('div','loox-ref-header');
   const count=el('span','loox-ref-count');count.id='lig-reference-count';
   // FLUX Schnell uses one image latent. Choose an editing-friendly strength
   // automatically instead of making visitors learn technical denoise settings.
   const consent=el('label','loox-uc-reference-consent');
   const checkbox=el('input');checkbox.type='checkbox';checkbox.id='lig-reference-permission';
   consent.append(checkbox,document.createTextNode('I have permission to use these images'));
   const hint=el('small','loox-ref-hint','For FLUX Schnell, multiple photos are combined into one reference image. Results may change details of the originals.');
   const footer=el('div','loox-ref-footer');footer.append(consent,hint);
   const render=()=>{
    grid.replaceChildren();
    for(const [i,entry] of selected.entries()){
     const thumb=el('div','loox-ref-thumb');
     const pic=el('img');pic.src=entry.url;pic.alt='Reference '+(i+1)+': '+entry.file.name;
     const remove=el('button','loox-ref-remove','×');remove.type='button';
     remove.title='Remove '+entry.file.name;remove.setAttribute('aria-label',remove.title);
     remove.addEventListener('click',()=>{
      URL.revokeObjectURL(entry.url);selected.splice(i,1);render();
     });
     thumb.append(pic,remove);grid.append(thumb);
    }
    grid.append(add);
    const has=selected.length>0;
    tray.hidden=!has;
    count.textContent=selected.length+' reference image'+(selected.length===1?'':'s');
    if(!has)checkbox.checked=false;
   };
   input.addEventListener('change',()=>{
    const incoming=Array.from(input.files||[]);input.value='';
    if(selected.length+incoming.length>MAX_REFERENCES){
     window.alert('You can add up to '+MAX_REFERENCES+' reference images per generation.');return;
    }
    for(const file of incoming){
     if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2400000){
      window.alert('Each reference must be a JPG, PNG or WebP under 2.4 MB.');continue;
     }
     selected.push({file,url:URL.createObjectURL(file)});
    }
    render();
   });
   header.append(count);
   tray.append(header,grid,footer,input);
   // Keep selected photos above the text input, as in the supplied example.
   card.insertBefore(tray,textarea);
   // Expose the chosen Files to the existing submit code without duplicating data.
   window.__looxFluxReferences=()=>selected.map(x=>x.file);
   // When no images are chosen, show a compact add button at bottom-left.
   const quickAdd=el('button','loox-uc-add','+');quickAdd.type='button';quickAdd.id='lig-reference-quick-add';
   quickAdd.setAttribute('aria-label','Add reference images');
   quickAdd.addEventListener('click',()=>input.click());
   left.append(quickAdd);
   render();
  }
  actions.prepend(left);
  // Keep all existing form submit buttons exactly where they were.
  wrap.prepend(links(video?'video':'image'));
  const browse=el('section','loox-start-templates');browse.setAttribute('aria-label','Start with a template');
  browse.append(el('h2','','Start with a template'));
  const library=el('div');library.id='template-library';library.dataset.generatorKind=video?'video':'image';browse.append(library);wrap.after(browse);
  const style=el('link');style.rel='stylesheet';style.href='platform/template-gallery.css?v=1';document.head.append(style);
  import('./template-library.js?v=2').catch(()=>{library.textContent='Templates are unavailable. Please try again later.'});
  document.body.classList.add('loox-has-start-templates');
  if(new URLSearchParams(location.search).has('template'))requestAnimationFrame(()=>{wrap.scrollIntoView({block:'start'});textarea.focus({preventScroll:true});});

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
  const modelMenu=document.getElementById('aiModelMenu');
  // Keep the dropdown in the same positioning context as its model trigger.
  // The old menu remained in .ai-composer-wrap after the trigger moved out.
  if(modelMenu)controls.append(model,modelMenu);
  else controls.append(model);
  toolbar.append(controls);
  // Agent uses the same external toolbar position as Image and Video.
  wrap.insertBefore(toolbar,form);
  form.classList.add('loox-uc-card');
  const send=document.getElementById('aiSend');
  if(send){
   send.textContent='Send';
   send.setAttribute('aria-label','Send message');
  }
  wrap.prepend(links('agent'));
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