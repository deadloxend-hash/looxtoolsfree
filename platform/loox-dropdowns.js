/* LOOX accessible custom dropdowns for visible native selects.
   The original select remains the source of truth for form submission and app events. */
(()=>{
 const targets={
  'ai-image-landing.html':['creative-model'],
  'ai-video-landing.html':[],
  'ai-video-generator.html':['lvg-duration','lvg-ratio'],
  'ai-text-to-image.html':['lig-resolution','lig-quality']
 };
 const page=location.pathname.split('/').pop();
 const ids=targets[page]||[];
 const instances=[];
 function enhance(select){
  if(!select||select.dataset.looxDropdown==='true')return;
  const wrapper=document.createElement('div');wrapper.className='loox-dropdown';
  select.parentNode.insertBefore(wrapper,select);
  wrapper.append(select);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='loox-dropdown-trigger';
  trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const label=document.createElement('span');label.className='loox-dropdown-value';
  const arrow=document.createElement('span');arrow.className='loox-dropdown-chevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';
  trigger.append(label,arrow);
  const list=document.createElement('div');list.className='loox-dropdown-menu';list.hidden=true;list.setAttribute('role','listbox');
  list.id=select.id+'-loox-options';list.setAttribute('aria-label',select.getAttribute('aria-label')||document.querySelector('label[for="'+select.id+'"]')?.textContent||'Choose an option');
  trigger.setAttribute('aria-controls',list.id);
  wrapper.append(trigger,list);
  let isOpen=false;
  const close=(focus=false)=>{isOpen=false;list.hidden=true;trigger.setAttribute('aria-expanded','false');wrapper.classList.remove('is-open');if(focus)trigger.focus({preventScroll:true});};
  function render(){
   const current=select.selectedOptions[0];
   label.textContent=current?.textContent?.trim()||'Select an option';
   trigger.disabled=select.disabled;
   list.replaceChildren();
   for(const option of select.options){
    if(option.hidden)continue;
    const button=document.createElement('button');button.type='button';button.className='loox-dropdown-option';
    button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.selected));
    button.disabled=option.disabled;
    const text=document.createElement('span');text.textContent=option.textContent;
    const check=document.createElement('span');check.className='loox-dropdown-check';check.textContent=option.selected?'✓':'';
    check.setAttribute('aria-hidden','true');button.append(text,check);
    button.addEventListener('click',()=>{
     if(button.disabled)return;
     select.value=option.value;
     select.dispatchEvent(new Event('input',{bubbles:true}));
     select.dispatchEvent(new Event('change',{bubbles:true}));
     render();close(true);
    });
    list.append(button);
   }
  }
  trigger.addEventListener('click',()=>{
   if(isOpen){close();return;}
   instances.forEach(x=>x.close());
   render();isOpen=true;list.hidden=false;wrapper.classList.add('is-open');
   trigger.setAttribute('aria-expanded','true');
   const spaceBelow=innerHeight-trigger.getBoundingClientRect().bottom;
   wrapper.classList.toggle('open-up',spaceBelow<Math.min(260,list.scrollHeight+16)&&trigger.getBoundingClientRect().top>spaceBelow);
  });
  trigger.addEventListener('keydown',e=>{
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();if(!isOpen)trigger.click();
    const available=[...list.querySelectorAll('button:not(:disabled)')];
    (e.key==='ArrowUp'?available.at(-1):available[0])?.focus();
   }
  });
  list.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
   if(e.key==='Tab'){close();return;}
   if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
   const available=[...list.querySelectorAll('button:not(:disabled)')];if(!available.length)return;
   const index=available.indexOf(document.activeElement);
   const next=e.key==='Home'?0:e.key==='End'?available.length-1:
    (index+(e.key==='ArrowDown'?1:-1)+available.length)%available.length;
   e.preventDefault();available[next].focus();
  });
  select.addEventListener('change',render);
  const observer=new MutationObserver(()=>render());
  observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','selected','label']});
  select.dataset.looxDropdown='true';
  wrapper.classList.add('is-ready');
  instances.push({close,wrapper});
  render();
 }
 function init(){ids.forEach(id=>enhance(document.getElementById(id)));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 document.addEventListener('pointerdown',e=>{
  instances.forEach(item=>{if(!item.wrapper.contains(e.target))item.close();});
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')instances.forEach(item=>item.close());});
})();
