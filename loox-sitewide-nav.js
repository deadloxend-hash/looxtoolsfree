/* One consistent LOOX navigation on non-home pages.
 * The home/AI headers remain powered by loox-home-nav.js.
 * Existing editor controls are preserved in their native toolbar.
 */
(() => {
 'use strict';
 const page=location.pathname.split('/').pop()||'index.html';
 if(['index.html','ai-home.html','ai-chat.html'].includes(page)||document.getElementById('loox-sitewide-header'))return;
 const root=new URL('./',location.href);
 const url=name=>new URL(name,root).href;
 const icons={search:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4 4"/></svg>'};
 const el=(tag,cls,text)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
 };
 const nav=el('div','loox-sitewide-header');nav.id='loox-sitewide-header';nav.setAttribute('role','banner');
 const inner=el('div','loox-sitewide-inner');
 const burger=el('button','loox-sitewide-burger','☰');burger.type='button';burger.setAttribute('aria-label','Open LOOX tool navigation');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-controls','loox-sitewide-drawer');
 const logoWrap=el('div','loox-sitewide-logo-wrap');
 const logo=el('button','loox-sitewide-logo');logo.type='button';logo.setAttribute('aria-expanded','false');logo.setAttribute('aria-label','Open LOOX menu');
 const image=el('img');image.src=url('assets/loox-wordmark.svg?v=1');image.alt='LOOX';image.width=132;image.height=35;logo.append(image);
 const logoMenu=el('nav','loox-sitewide-logo-menu');logoMenu.setAttribute('aria-label','LOOX site menu');logoMenu.hidden=true;
 [['LOOX Tools Home','index.html'],['LOOX AI Home','ai-home.html'],['All tools','index.html#tools'],['Favorites','index.html#favorites'],['Guides','guides.html'],['Pricing & Credits','pricing.html'],['My Account','account.html'],['Privacy','privacy-policy.html'],['Settings','settings.html']].forEach(([name,href])=>{
  const link=el('a','',name);link.href=url(href);logoMenu.append(link);
 });
 logoWrap.append(logo,logoMenu);
 const links=el('nav','loox-sitewide-links');links.setAttribute('aria-label','LOOX main navigation');
 [['Home','index.html'],['AI Studio','ai-home.html'],['Guides','guides.html'],['Pricing','pricing.html']].forEach(([name,href])=>{
  const link=el('a','',name);link.href=url(href);if(href===page)link.setAttribute('aria-current','page');links.append(link);
 });
 const search=el('button','loox-sitewide-search');search.type='button';
 search.setAttribute('aria-label','Search all LOOX tools');search.innerHTML=icons.search+'<span>Search tools</span><kbd>/</kbd>';
 const account=el('div','loox-sitewide-account');account.setAttribute('data-loox-account','');
 inner.append(burger,logoWrap,links,search,account);nav.append(inner);
 document.body.prepend(nav);
 document.body.classList.add('loox-sitewide-active');
 // Preserve tool actions (Undo, Export, Generate, editor tabs) as a second workspace bar.
 const native=document.querySelector('body > header,body > .topbar,body > .info-header');
 if(native){
  native.classList.add('loox-sitewide-native');
  const buttons=[...native.querySelectorAll('button')].filter(b=>!b.matches('#loox-page-back,.loox-tool-menu,.loox-overflow-trigger,.loox-rail-toggle,#menuToggle'));
  const editor=native.matches('.studio-top,.lig-header,.studio-header,.editor-header')||
      !!native.querySelector('.lig-head-tabs,.studio-top-actions,.top-actions,.editor-toolbar,.lig-head-start')||
      buttons.some(b=>/^(undo|redo|export|save|openImage|import|render)/i.test(b.id||''));
  native.classList.add(editor?'loox-sitewide-workspacebar':'loox-sitewide-simplebar');
 }
 // Clickable sidebar, matching the Home/AI grouping.
 const sidebar=el('aside','loox-sitewide-drawer');sidebar.id='loox-sitewide-drawer';sidebar.setAttribute('aria-label','LOOX tools navigation');
 const sideContent=el('nav','loox-sitewide-drawer-list');
 const group=(name,rows)=>{
  const head=el('h2','loox-sitewide-group',name);sideContent.append(head);
  rows.forEach(([label,href,icon])=>{
   const a=el('a','loox-sitewide-drawer-link');
   a.href=url(href);a.append(el('span','loox-sitewide-drawer-icon',icon),el('span','',label));if(page===href)a.setAttribute('aria-current','page');sideContent.append(a);
  });
 };
 group('Navigation',[['LOOX Tools Home','index.html','⌂'],['LOOX AI Home','ai-home.html','✦']]);
 group('Editors',[['Photo Editor','photo-editor.html','▧'],['Video Editor','video-editor.html','▶']]);
 group('Featured',[['Background Remover','bg-remove.html','✂'],['Face Blur','face-blur.html','◌'],['Face Swap','faceswap.html','✦'],['Photo Generator','ai-text-to-image.html','▧'],['Video Generator','ai-video-generator.html','▶']]);
 const more=el('details','loox-sitewide-more');const summary=el('summary','','More Tools  ⌄');
 more.append(summary);const moreLinks=el('div','loox-sitewide-more-links');
 [['Image Tools','all-image-tools.html'],['Text Tools','all-text-tools.html'],['Video Tools','all-video-tools.html'],['AI Tools','all-ai-tools.html'],['All tools','index.html#tools'],['Image','index.html?category=Image#tools'],['Video','index.html?category=Video#tools'],['Audio','index.html?category=Audio#tools'],['YouTube','index.html?category=YouTube#tools'],['PDF','index.html?category=PDF#tools'],['AI','index.html?category=AI#tools'],['Text','index.html?category=Text#tools']].forEach(([label,href])=>{
  const a=el('a','',label);a.href=url(href);moreLinks.append(a);
 });more.append(moreLinks);sideContent.append(more);
 group('Account',[['Guides','guides.html','?'],['Pricing & Credits','pricing.html','◇'],['My Account','account.html','◎']]);
 sidebar.append(sideContent);
 const scrim=el('button','loox-sitewide-scrim');scrim.type='button';scrim.setAttribute('aria-label','Close navigation');
 document.body.append(scrim,sidebar);
 const closeDrawer=()=>{sidebar.classList.remove('is-open');scrim.classList.remove('is-open');burger.setAttribute('aria-expanded','false')};
 burger.addEventListener('click',()=>{const open=!sidebar.classList.contains('is-open');sidebar.classList.toggle('is-open',open);scrim.classList.toggle('is-open',open);burger.setAttribute('aria-expanded',String(open))});
 scrim.addEventListener('click',closeDrawer);
 const closeLogo=()=>{logoMenu.hidden=true;logo.setAttribute('aria-expanded','false')};
 logo.addEventListener('click',e=>{e.stopPropagation();const open=logoMenu.hidden;logoMenu.hidden=!open;logo.setAttribute('aria-expanded',String(open))});
 document.addEventListener('pointerdown',e=>{if(!logoWrap.contains(e.target))closeLogo()});
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
