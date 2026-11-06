/* Session rail and grouped image history. Uses existing private history cards and handlers. */
(function(){
 function ready(){
 const view=document.getElementById('lig-generate-view'),grid=document.getElementById('lig-history-grid'),section=grid?.closest('.lig-history'),main=document.querySelector('.lig-main'),prompt=document.getElementById('lig-prompt');
 if(!view||!grid||!section||!main||!prompt)return;
 const rail=document.createElement('aside');rail.className='loox-session-rail';rail.setAttribute('aria-label','Generative sessions');
 rail.innerHTML='<div class="loox-session-head"><strong>Generative sessions</strong><button type="button" class="loox-session-toggle" aria-label="Collapse sessions" aria-expanded="true">×</button></div><div class="loox-session-list"></div>';
 document.body.append(rail);main.classList.add('loox-sessions-layout');
 const list=rail.querySelector('.loox-session-list');
 const feed=document.createElement('div');feed.className='loox-session-feed';feed.setAttribute('aria-label','Generation sessions');
 section.querySelector('.lig-history-head').after(feed);
 grid.classList.add('loox-history-source');
 const groups=new Map();
 let scheduled=false;
 function titleFor(t){return t.length>46?t.slice(0,43)+'…':t;}
 function render(){
  scheduled=false;
  const cards=[...grid.querySelectorAll('.lig-history-item')];
  feed.replaceChildren();list.replaceChildren();groups.clear();
  for(const card of cards){
   const title=card.querySelector('.lig-history-name')?.textContent?.trim()||'Untitled generation';
   const key=title.toLowerCase().replace(/\\s+/g,' ').trim();
   if(!groups.has(key))groups.set(key,{title,cards:[]});
   groups.get(key).cards.push(card);
  }
  const sessions=[...groups.values()];
  for(let idx=0;idx<sessions.length;idx++){
   const session=sessions[idx],id='loox-session-'+idx;
   const entry=document.createElement('button');entry.type='button';entry.className='loox-session-entry';entry.title=session.title;
   const cover=session.cards[0].querySelector('img')?.src;
   if(cover){const thumb=document.createElement('img');thumb.src=cover;thumb.alt='';thumb.loading='lazy';entry.append(thumb);}
   else{const symbol=document.createElement('span');symbol.className='loox-session-placeholder';symbol.textContent='✧';entry.append(symbol);}
   const name=document.createElement('span');name.textContent=titleFor(session.title);entry.append(name);
   entry.addEventListener('click',()=>{list.querySelectorAll('.loox-session-entry').forEach(x=>x.classList.remove('active'));entry.classList.add('active');document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});});
   list.append(entry);
   const block=document.createElement('section');block.className='loox-session-block';block.id=id;
   const heading=document.createElement('div');heading.className='loox-session-meta';
   const label=document.createElement('strong');label.textContent=session.title;heading.append(label);
   const model=document.createElement('span');model.textContent=session.cards.length+' saved image'+(session.cards.length===1?'':'s');heading.append(model);
   const row=document.createElement('div');row.className='loox-session-images';
   for(const card of session.cards){
    const tile=document.createElement('button');tile.type='button';tile.className='loox-session-image';tile.title='Open saved image';
    const img=card.querySelector('img');
    if(img){const clone=img.cloneNode(true);clone.removeAttribute('id');tile.append(clone);}
    else{tile.textContent='✧';}
    tile.addEventListener('click',()=>card.querySelector('.lig-history-preview')?.click());
    row.append(tile);
   }
   const actions=document.createElement('div');actions.className='loox-session-actions';
   const edit=document.createElement('button');edit.type='button';edit.textContent='✎ Edit prompt';
   edit.addEventListener('click',()=>{const existing=session.cards[0].querySelector('.lig-history-tool-pencil');if(existing)existing.click();else{prompt.value=session.title;prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.focus();}});
   const regen=document.createElement('button');regen.type='button';regen.textContent='↻ Regenerate';
   regen.addEventListener('click',()=>{edit.click();prompt.focus();document.getElementById('lig-compose-wrap')?.scrollIntoView({behavior:'smooth',block:'end'});});
   actions.append(edit,regen);block.append(heading,row,actions);feed.append(block);
  }
  if(sessions.length)list.firstElementChild?.classList.add('active');
  feed.hidden=!sessions.length;
 }
 const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(render);}};
 new MutationObserver(schedule).observe(grid,{childList:true,subtree:false});
 rail.querySelector('.loox-session-toggle').addEventListener('click',()=>{const closed=rail.classList.toggle('collapsed');main.classList.toggle('loox-sessions-collapsed',closed);rail.querySelector('.loox-session-toggle').textContent=closed?'‹':'×';rail.querySelector('.loox-session-toggle').setAttribute('aria-expanded',String(!closed));});
 const observer=new MutationObserver(()=>{rail.hidden=!!document.getElementById('lig-generate-view')?.hidden;});observer.observe(view,{attributes:true,attributeFilter:['hidden']});
 rail.hidden=!!view.hidden;schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();