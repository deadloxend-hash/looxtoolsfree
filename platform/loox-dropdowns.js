/* Custom selects retain the native field as the source of form values. */
(()=>{
 const owned=new Set(['creative-model','lvg-duration','lvg-ratio','lig-resolution','lig-quality','lvg-model','lig-model','lig-ratio']);
 let active=null,serial=0;
 function enhance(select){
  if(owned.has(select.id)||select.dataset.looxDropdown||select.multiple)return;
  if(!select.id)select.id='loox-select-'+(++serial);
  select.dataset.looxDropdown='true';select.setAttribute('aria-hidden','true');select.tabIndex=-1;
  const wrap=document.createElement('div');wrap.className='loox-dropdown is-ready';select.before(wrap);wrap.append(select);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='loox-dropdown-trigger';
  const label=select.getAttribute('aria-label')||select.labels?.[0]?.childNodes?.[0]?.textContent?.trim()||'Choose an option';
  trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');wrap.append(trigger);
  const popup=document.createElement('div');popup.className='loox-dropdown-menu loox-dropdown-portal';popup.hidden=true;
  popup.id=select.id+'-options';trigger.setAttribute('aria-controls',popup.id);
  popup.setAttribute('popover','manual');document.body.append(popup);
  const search=document.createElement('input');search.type='search';search.placeholder='Search options';search.setAttribute('aria-label','Search '+label);search.className='loox-dropdown-search';
  const list=document.createElement('div');list.setAttribute('role','listbox');list.setAttribute('aria-label',label);popup.append(search,list);
  let open=false;
  function sync(){
   trigger.textContent=(select.selectedOptions[0]?.textContent||'Choose an option')+' ⌄';
   trigger.setAttribute('aria-label',label+': '+(select.selectedOptions[0]?.textContent||''));trigger.disabled=select.disabled;
   if(open)options();
  }
  function options(){
   search.hidden=select.options.length<10;list.replaceChildren();
   for(const option of select.options){
    if(option.hidden||!option.textContent.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))continue;
    const b=document.createElement('button');b.type='button';b.className='loox-dropdown-option';b.role='option';
    b.setAttribute('aria-selected',String(option.selected));b.disabled=option.disabled;
    b.textContent=option.textContent+(option.selected?' ✓':'');
    b.onclick=e=>{e.preventDefault();select.value=option.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));close(true);sync();};list.append(b);
   }
   if(!list.children.length)list.textContent='No matching options.';
  }
  function position(){
   if(!open)return;const r=trigger.getBoundingClientRect(),v=visualViewport;
   const top=v?.offsetTop||0,bottom=top+(v?.height||innerHeight),left=v?.offsetLeft||0;
   const width=Math.min(Math.max(r.width,200),(v?.width||innerWidth)-24);
   const below=bottom-r.bottom-12,above=r.top-top-12,up=below<180&&above>below;
   popup.style.width=width+'px';popup.style.left=Math.max(left+12,Math.min(r.left,left+(v?.width||innerWidth)-width-12))+'px';
   popup.style.maxHeight=Math.max(90,Math.min(320,up?above:below))+'px';
   popup.style.top=(up?Math.max(top+8,r.top-Math.min(popup.scrollHeight,Math.min(320,above))-6):r.bottom+6)+'px';
  }
  function close(focus=false){open=false;popup.hidePopover?.();popup.hidden=true;trigger.setAttribute('aria-expanded','false');wrap.classList.remove('is-open');if(active?.close===close)active=null;if(focus)trigger.focus({preventScroll:true});}
  function show(){active?.close();open=true;search.value='';options();popup.hidden=false;popup.showPopover?.();trigger.setAttribute('aria-expanded','true');wrap.classList.add('is-open');active={close,position,popup,wrap};position();}
  trigger.onclick=e=>{e.preventDefault();open?close():show();};
  trigger.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!open)show();const items=[...list.querySelectorAll('button:not(:disabled)')];(e.key==='ArrowUp'?items.at(-1):items[0])?.focus();}};
  popup.onkeydown=e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
   if(e.key==='Tab'){close();return;}
   if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key)||e.target===search&&['Home','End'].includes(e.key))return;
   const items=[...list.querySelectorAll('button:not(:disabled)')];if(!items.length)return;
   const i=items.indexOf(document.activeElement),n=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
   e.preventDefault();items[n].focus();
  };
  search.oninput=()=>{options();position();};select.addEventListener('change',sync);
  new MutationObserver(sync).observe(select,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','selected','hidden','label']});sync();
 }
 function init(){document.querySelectorAll('select').forEach(enhance);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('select')||n.querySelector('select')))))init();}).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('pointerdown',e=>{if(active&&!active.wrap.contains(e.target)&&!active.popup.contains(e.target))active.close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')active?.close(true);});
 window.addEventListener('resize',()=>active?.position());window.addEventListener('scroll',()=>active?.position(),true);
 visualViewport?.addEventListener('resize',()=>active?.position());visualViewport?.addEventListener('scroll',()=>active?.position());
})();
