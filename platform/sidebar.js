// One state owner for mobile drawers and the desktop navigation rail. No auth imports.
export function mountSidebar({sidebar,content,burger,scrim,dockToggle,lock,unlock}){
 if(sidebar.dataset.controller)return;sidebar.dataset.controller='premium';
 const desktop=matchMedia('(min-width:901px)'),preference='loox-sidebar-mode-v1';
 let expanded=false;try{expanded=localStorage.getItem(preference)==='expanded';}catch{}
 let mobileOpen=false;
 const tooltip=document.createElement('div');tooltip.className='loox-sidebar-tooltip';tooltip.id='loox-sidebar-tooltip';tooltip.role='tooltip';tooltip.hidden=true;document.body.append(tooltip);
 const hideTip=()=>{tooltip.hidden=true;sidebar.querySelectorAll('[aria-describedby="loox-sidebar-tooltip"]').forEach(n=>n.removeAttribute('aria-describedby'));};
 function render(){
  const open=desktop.matches?expanded:mobileOpen;hideTip();sidebar.classList.toggle('is-open',open);sidebar.inert=!desktop.matches&&!open;
  document.body.classList.toggle('loox-sidebar-compact',desktop.matches&&!expanded);document.body.classList.toggle('loox-sitewide-sidebar-open',open);
  scrim.hidden=desktop.matches||!open;scrim.classList.toggle('is-open',!desktop.matches&&open);burger.setAttribute('aria-expanded',String(open));burger.setAttribute('aria-label',desktop.matches?(open?'Collapse navigation':'Expand navigation'):(open?'Close navigation':'Open navigation'));
  dockToggle.setAttribute('aria-expanded',String(open));
  if(!desktop.matches&&open)lock();else unlock();
  document.documentElement.style.setProperty('--loox-sidebar-width',desktop.matches?(expanded?'248px':'64px'):'0px');
  if(!open&&!desktop.matches&&sidebar.contains(document.activeElement))burger.focus({preventScroll:true});
  window.dispatchEvent(new Event('loox:sidebar-layout'));
 }
 function toggle(){if(desktop.matches){expanded=!expanded;try{localStorage.setItem(preference,expanded?'expanded':'compact');}catch{}}else mobileOpen=!mobileOpen;render();}
 const close=()=>{if(desktop.matches){expanded=false;try{localStorage.setItem(preference,'compact');}catch{}}else mobileOpen=false;render();};
 burger.addEventListener('click',toggle);dockToggle.addEventListener('click',toggle);scrim.addEventListener('click',close);
 document.addEventListener('loox:close-sidebar',close);
 document.addEventListener('loox:expand-sidebar',()=>{expanded=true;try{localStorage.setItem(preference,'expanded');}catch{}render();});
 desktop.addEventListener('change',()=>{mobileOpen=false;render();});
 window.addEventListener('storage',event=>{if(event.key===preference){expanded=event.newValue==='expanded';render();}});
 sidebar.addEventListener('click',event=>{if(event.target.closest('a[href]')&&!desktop.matches)close();});
 document.addEventListener('click',event=>{if(!desktop.matches&&mobileOpen&&!sidebar.contains(event.target)&&!burger.contains(event.target)&&!dockToggle.contains(event.target))close();},true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){hideTip();if(mobileOpen)close();return;}
  if(event.key!=='Tab'||desktop.matches||!mobileOpen)return;
  const nodes=[burger,...sidebar.querySelectorAll('a[href],button:not([disabled]),input,summary')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');
  const index=nodes.indexOf(document.activeElement);if(!event.shiftKey&&index===0){event.preventDefault();nodes[1]?.focus();}else if(event.shiftKey&&index<=0){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&index===nodes.length-1){event.preventDefault();burger.focus();}
 });
 function showTip(event){if(!desktop.matches||expanded)return;const target=event.target.closest('.loox-workspace-link,.loox-workspace-group>summary');if(!target)return;
  hideTip();tooltip.textContent=target.getAttribute('aria-label');const rect=target.getBoundingClientRect();tooltip.style.top=Math.max(70,Math.min(rect.top,innerHeight-40))+'px';tooltip.hidden=false;target.setAttribute('aria-describedby',tooltip.id);
 }
 sidebar.addEventListener('pointerover',showTip);sidebar.addEventListener('focusin',showTip);sidebar.addEventListener('pointerout',hideTip);sidebar.addEventListener('focusout',hideTip);content.addEventListener('scroll',hideTip,{passive:true});
 render();return {close};
}
