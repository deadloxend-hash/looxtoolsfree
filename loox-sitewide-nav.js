/* One consistent LOOX navigation on EVERY page.
 * All pages use the same header, sidebar and tool finder.
 * Existing editor controls are preserved in their native toolbar.
 */
(() => {
 'use strict';
 const page=location.pathname.split('/').pop()||'index.html';
 if(document.getElementById('loox-sitewide-header'))return;
 const isHome=['index.html','ai-home.html','ai-chat.html'].includes(page);
 const root=new URL('./',document.currentScript?.src||new URL('loox-sitewide-nav.js',location.href).href);
 const url=name=>new URL(name,root).href;
 const icons={search:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4 4"/></svg>'};
 const el=(tag,cls,text)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
 };
 const nav=el('div','loox-sitewide-header');nav.id='loox-sitewide-header';nav.setAttribute('role','banner');
 const inner=el('div','loox-sitewide-inner');
 const burger=el('button','loox-sitewide-burger','☰');burger.type='button';burger.setAttribute('aria-label','Open LOOX tool navigation');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-controls','loox-sitewide-drawer');
 const logoWrap=el('div','loox-sitewide-logo-wrap');
 const logo=el('a','loox-sitewide-logo');logo.href=url('ai-home.html');logo.setAttribute('aria-label','LOOX AI Home');
 const moreWrap=el('div','loox-sitewide-more-wrap');
 const moreButton=el('button','loox-sitewide-more-button');moreButton.type='button';
 moreButton.setAttribute('aria-label','Open LOOX workspace menu');
 moreButton.setAttribute('aria-haspopup','true');moreButton.setAttribute('aria-expanded','false');
 moreButton.setAttribute('aria-controls','loox-sitewide-logo-menu');
 moreButton.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
 const image=el('img');image.src=url('assets/loox-ornamental-logo.png?v=3');image.alt='LOOX';image.width=132;image.height=35;logo.append(image);
 const logoMenu=el('nav','loox-sitewide-logo-menu');logoMenu.id='loox-sitewide-logo-menu';logoMenu.setAttribute('aria-label','LOOX workspace menu');logoMenu.hidden=true;
 [['LOOX Tools Home','index.html'],['LOOX AI Home','ai-home.html'],['All tools','index.html#tools'],['Favorites','index.html#favorites'],['Guides','guides.html'],['Pricing & Credits','pricing.html'],['My Account','account.html'],['Privacy','privacy-policy.html'],['Settings','settings.html']].forEach(([name,href])=>{
  const link=el('a','',name);link.href=url(href);logoMenu.append(link);
 });
 logoWrap.append(logo);moreWrap.append(moreButton,logoMenu);
 const links=el('nav','loox-sitewide-links');links.setAttribute('aria-label','LOOX main navigation');
 [['Home','index.html'],['AI Studio','ai-home.html'],['Guides','guides.html'],['Pricing','pricing.html']].forEach(([name,href])=>{
  const link=el('a','',name);link.href=url(href);if(href===page)link.setAttribute('aria-current','page');links.append(link);
 });
 const search=el('button','loox-sitewide-search');search.type='button';
 search.setAttribute('aria-label','Search all LOOX tools');search.title='Search tools';search.innerHTML=icons.search;
 const account=el('div','loox-sitewide-account');account.setAttribute('data-loox-account','');
 inner.append(logoWrap,links,search,account,moreWrap);nav.append(inner);
 document.body.prepend(nav);
 document.body.classList.add('loox-sitewide-active');
 // Retire the earlier navigation rail on EVERY page, including AI tools.
 // Older cached experience bundles can still create it before this script runs.
 document.querySelectorAll('aside#loox-home-rail,button.loox-home-rail-button,.ai-shared-rail-backdrop').forEach(node=>node.remove());
 document.body.classList.remove('ai-rail-open');
 if(isHome)document.body.classList.add('loox-sitewide-home');
 // Preserve tool actions (Undo, Export, Generate, editor tabs) as a second workspace bar.
 const native=document.querySelector('header');
 if(native){
  native.classList.add('loox-sitewide-native');
  if(isHome){native.classList.add('loox-sitewide-simplebar');}else{
  const buttons=[...native.querySelectorAll('button')].filter(b=>!b.matches('#loox-page-back,.loox-tool-menu,.loox-overflow-trigger,.loox-rail-toggle,#menuToggle'));
  const editor=native.matches('.studio-top,.lig-header,.studio-header,.editor-header')||
      !!native.querySelector('.lig-head-tabs,.studio-top-actions,.top-actions,.editor-toolbar,.lig-head-start')||
      buttons.some(b=>/^(undo|redo|export|save|openImage|import|render)/i.test(b.id||''));
  native.classList.add(editor?'loox-sitewide-workspacebar':'loox-sitewide-simplebar');
  }
 }
 // Clickable sidebar, matching the Home/AI grouping.
 const sidebar=el('aside','loox-sitewide-drawer');sidebar.id='loox-sitewide-drawer';sidebar.setAttribute('aria-label','LOOX tools navigation');
 const sideContent=el('nav','loox-sitewide-drawer-list');
 const svgIcons={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  ai:'<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z"/><path d="m20 17 .5 1.5L22 19l-1.5.5L20 21l-.5-1.5L18 19l1.5-.5z"/>',
  photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-3v10l-4-3z"/>',
  face:'<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M9 15c1.6 1.3 4.4 1.3 6 0"/>',
  blur:'<path d="M7 3h10M7 21h10M3 7v10M21 7v10"/><circle cx="12" cy="12" r="4"/>',
  remove:'<path d="M3 6h18M7 3v6m10-6v6M5 12l4 4m0-4-4 4m9-4 4 4m0-4-4 4"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  guide:'<path d="M4 5a2 2 0 0 1 2-2h6v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 1 2 2z"/>',
  diamond:'<path d="m6 3-4 6 10 12L22 9l-4-6zM2 9h20M9 3l-2 6 5 12 5-12-2-6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  design:'<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  audio:'<path d="M3 10v4M7 6v12M11 3v18M15 7v10M19 4v16M23 10v4"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
 };
 const iconNode=name=>{
  const wrap=el('span','loox-sitewide-drawer-icon');
  wrap.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(svgIcons[name]||svgIcons.grid)+'</svg>';
  return wrap;
 };
 // The same navigation structure is shared by every desktop and mobile page.
 // No separate promotional tiles or PDF dropdowns in the sidebar.
 const targetIsCurrent=href=>{
  const target=new URL(href,root),here=new URL(location.href);
  if(target.pathname!==here.pathname||target.search!==here.search)return false;
  if(target.hash)return target.hash===here.hash;
  return !here.hash || page!=='index.html';
 };
 const addLink=([label,href,icon])=>{
  const a=el('a','loox-sitewide-drawer-link');a.href=url(href);
  a.append(iconNode(icon),el('span','loox-sitewide-drawer-label',label));
  if(targetIsCurrent(href))a.setAttribute('aria-current','page');
  sideContent.append(a);
  return a;
 };
 const group=(name,rows)=>{
  sideContent.append(el('h2','loox-sitewide-group',name));
  rows.forEach(addLink);
 };
 group('Navigation',[
  ['Home','index.html','home'],
  ['AI Studio','ai-home.html','ai']
 ]);
 group('Editors',[
  ['Photo Editor','photo-editor.html','photo'],
  ['Video Editor','video-editor.html','video'],
  ['Design Studio','design-studio.html','design']
 ]);
 group('AI Generators',[
  ['AI Photo Generator','ai-text-to-image.html','photo'],
  ['AI Video Generator','ai-video-generator.html','video'],
  // Dedicated AI audio generation is not available yet; link to working audio utilities.
  ['AI Audio Generator','index.html?category=Audio#tools','audio'],
  ['AI Face Swap','faceswap.html','face']
 ]);
 group('Utilities',[
  ['AI Background Remover','bg-remove.html','remove'],
  ['AI Face Blur','face-blur.html','blur']
 ]);
 const explore=addLink(['Explore All Tools','index.html#tools','grid']);
 explore.classList.add('loox-sitewide-explore-link');
 group('System / User',[
  ['Guides & Tutorials','guides.html','guide'],
  ['Pricing & Credits','pricing.html','diamond'],
  ['My Account','account.html','user']
 ]);
 sidebar.append(sideContent);
 const scrim=el('button','loox-sitewide-scrim');scrim.type='button';scrim.setAttribute('aria-label','Close navigation');
 const dockToggle=el('button','loox-sitewide-dock-toggle');dockToggle.type='button';
 dockToggle.setAttribute('aria-label','Open LOOX sidebar');
 dockToggle.setAttribute('aria-controls','loox-sitewide-drawer');dockToggle.setAttribute('aria-expanded','false');
 dockToggle.innerHTML='<span class="loox-dock-bars" aria-hidden="true">|</span><span class="loox-dock-arrow" aria-hidden="true">›</span>';
 document.body.append(scrim,sidebar,dockToggle);
 const desktop=matchMedia('(min-width:901px)');
 const setDrawer=open=>{
  sidebar.classList.toggle('is-open',open);
  scrim.classList.toggle('is-open',open&&!desktop.matches);
  document.body.classList.toggle('loox-sitewide-sidebar-open',open);
  dockToggle.setAttribute('aria-expanded',String(open));
  dockToggle.setAttribute('aria-label',open?'Collapse LOOX sidebar':'Open LOOX sidebar');
  dockToggle.title=open?'Collapse sidebar':'Expand sidebar';
  dockToggle.querySelector('.loox-dock-arrow').textContent=open?'‹':'›';
 };
 const closeDrawer=()=>setDrawer(false);
 burger.addEventListener('click',()=>setDrawer(!sidebar.classList.contains('is-open')));
 dockToggle.addEventListener('click',()=>burger.click());
 desktop.addEventListener('change',()=>setDrawer(desktop.matches&&isHome));
 setDrawer(desktop.matches&&isHome);
 scrim.addEventListener('click',closeDrawer);
 const closeLogo=()=>{logoMenu.hidden=true;moreButton.setAttribute('aria-expanded','false')};
 moreButton.addEventListener('click',e=>{e.stopPropagation();const open=logoMenu.hidden;logoMenu.hidden=!open;moreButton.setAttribute('aria-expanded',String(open))});
 document.addEventListener('pointerdown',e=>{if(!moreWrap.contains(e.target))closeLogo()});
 // Unified full tool finder. Uses the existing public tool catalog and real tool links.
 const dialog=el('dialog','loox-sitewide-finder');
 dialog.innerHTML='<div class="loox-sitewide-finder-head"><div><small>LOOX WORKSPACES</small><h2>Find a tool</h2></div><button type="button" aria-label="Close tool search" class="loox-sitewide-finder-close">×</button></div><div class="loox-sitewide-finder-input">'+icons.search+'<input type="search" placeholder="Search every tool…" aria-label="Search every LOOX tool"></div><div class="loox-sitewide-finder-tabs" role="group" aria-label="Filter tools"><button type="button" data-filter="all" aria-pressed="true">All tools</button><button type="button" data-filter="image">Image</button><button type="button" data-filter="video">Video</button><button type="button" data-filter="text">Text</button><button type="button" data-filter="ai">AI</button></div><p class="loox-sitewide-finder-status" role="status"></p><div class="loox-sitewide-finder-results"></div>';
 document.body.append(dialog);
 const field=dialog.querySelector('input');const results=dialog.querySelector('.loox-sitewide-finder-results');const status=dialog.querySelector('.loox-sitewide-finder-status');
 let tools=[],loaded=false,filter='all';
 function paint(){
  const q=field.value.trim().toLocaleLowerCase();
  let list=tools.filter(t=>(filter==='all'||t.collection===filter||filter==='ai'&&t.category==='ai')&&
   (!q||(t.names?.en+' '+t.lead?.en+' '+t.slug).toLocaleLowerCase().includes(q)));
  list=list.slice(0,90);results.replaceChildren();
  status.textContent=list.length+' '+(list.length===1?'tool':'tools')+(q?' matching your search':'');
  if(!list.length){results.append(el('p','loox-sitewide-no-results','No matching tools. Try another name or category.'));return;}
  const fragment=document.createDocumentFragment();
  for(const t of list){
   const item=el('a','loox-sitewide-result');item.href=url(t.url);
   const img=el('img');img.src=url('assets/icons/'+t.slug+'.svg');img.alt='';img.loading='lazy';img.width=30;img.height=30;
   const copy=el('span','loox-sitewide-result-copy');copy.append(el('strong','',t.names?.en||t.slug),el('small','',t.lead?.en||'Open tool'));
   item.append(img,copy,el('span','loox-sitewide-result-arrow','↗'));fragment.append(item);
  }
  results.append(fragment);
 }
 async function openFinder(){
  closeLogo();closeDrawer();if(!dialog.open)dialog.showModal();
  field.focus();
  if(!loaded){status.textContent='Loading tools…';try{
   const response=await fetch(url('assets/tool-catalog.json?v=40'));if(!response.ok)throw new Error('Tool directory unavailable');
   tools=await response.json();loaded=true;paint();
  }catch(e){status.textContent='Unable to load tools. Visit All Tools instead.';results.replaceChildren();const a=el('a','loox-sitewide-result','Browse all tools');a.href=url('index.html#tools');results.append(a);}}
  else paint();
 }
 search.addEventListener('click',openFinder);
 dialog.querySelector('.loox-sitewide-finder-close').addEventListener('click',()=>dialog.close());
 field.addEventListener('input',paint);
 dialog.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  filter=b.dataset.filter;dialog.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();
 }));
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeLogo();closeDrawer();return;}
  if((e.key==='/'||(e.key.toLowerCase()==='k'&&(e.ctrlKey||e.metaKey)))&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable]')){
   e.preventDefault();e.stopImmediatePropagation();openFinder();
  }
 },true);
 // Use the real account UI for credits, upgrade, and avatar; no invented balances.
 if(![...document.querySelectorAll('link[rel="stylesheet"]')].some(l=>l.href.includes('/platform/platform.css'))){
  const style=document.createElement('link');style.rel='stylesheet';style.href=url('platform/platform.css?v=25');document.head.append(style);
 }
 import(url('platform/account.js?v=7')).then(m=>m.renderHeader()).catch(()=>{
  account.replaceChildren();
  const link=el('a','loox-sitewide-signin','Sign in');link.href=url('account.html');account.append(link);
 });
})();
