// One modal owner: native top layer, focus trapping, balanced scroll restoration.
let current;
export function openSheet(title,content,{onClose}={}){
 current?.close();
 const trigger=document.activeElement,d=document.createElement('dialog');d.className='loox-sheet';
 const handle=document.createElement('div');handle.className='loox-sheet-handle';handle.setAttribute('aria-hidden','true');
 const head=document.createElement('header'),h=document.createElement('h2'),close=document.createElement('button');h.textContent=title;h.id='loox-sheet-title';d.setAttribute('aria-labelledby',h.id);close.type='button';close.className='loox-close-control';close.textContent='×';close.setAttribute('aria-label','Close '+title);head.append(h,close);
 const body=document.createElement('div');body.className='loox-sheet-body';body.append(content);d.append(handle,head,body);document.body.append(d);
 const before={html:document.documentElement.style.overflow,body:document.body.style.overflow};
 document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
 let finished=false;
 function finish(){if(finished)return;finished=true;document.documentElement.style.overflow=before.html;document.body.style.overflow=before.body;onClose?.();d.remove();if(current===d)current=null;trigger?.focus({preventScroll:true});}
 const nativeClose=d.close.bind(d);d.close=()=>{nativeClose();finish();};close.onclick=()=>d.close();
 d.addEventListener('close',finish,{once:true});d.addEventListener('cancel',e=>{e.preventDefault();d.close();});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 let y;for(const area of [handle,head]){area.style.touchAction='none';area.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;y=e.clientY;area.setPointerCapture(e.pointerId)});area.addEventListener('pointerup',e=>{if(y!==undefined&&e.clientY-y>65)d.close();y=undefined;});}
 current=d;d.showModal();return d;
}
export function moveIntoSheet(title,node){const marker=document.createComment('sheet return');node.before(marker);return openSheet(title,node,{onClose:()=>marker.replaceWith(node)});}
