/* Shared LOOX home navigation: logo menu, compact tool finder and primary links. */
(()=>{
 'use strict';
 const file=location.pathname.split('/').pop()||'index.html';
 if(!['index.html','ai-home.html','ai-chat.html'].includes(file))return;
 const isTools=file==='index.html';
 const menuItems=[
  ['LOOX Tools Home','index.html','⌂'],
  ['LOOX AI Home','ai-home.html','✦'],
  ['Explore all tools','index.html#tools','▦'],
  ['Favorites','index.html#favorites','♡'],
  ['Guides','guides.html','?'],
  ['Pricing & Credits','pricing.html','◇'],
  ['My Account','account.html','◎'],
  ['Privacy','privacy.html','♧'],
  ['Settings','settings.html','⚙']
 ];
 function mount(){
  const header=document.querySelector(isTools?'.topbar-inner':'.lx-header');
  if(!header||header.querySelector('.loox-nav-logo-wrap'))return;
  document.body.classList.add('loox-new-navigation');
  const oldBrand=header.querySelector(isTools?'.brand':'.lx-brand');
  if(!oldBrand)return;
  const logoWrap=document.createElement('div');logoWrap.className='loox-nav-logo-wrap';
  const logo=document.createElement('button');logo.type='button';logo.className='loox-nav-logo';
  logo.setAttribute('aria-label','Open LOOX menu');logo.setAttribute('aria-haspopup','true');
  logo.setAttribute('aria-expanded','false');logo.setAttribute('aria-controls','loox-logo-menu');
  logo.innerHTML='<img src="assets/loox-wordmark.svg?v=1" alt="LOOX" width="132" height="35">';
  const dropdown=document.createElement('nav');dropdown.className='loox-nav-logo-menu';dropdown.id='loox-logo-menu';
  dropdown.setAttribute('aria-label','LOOX menu');dropdown.hidden=true;
  const head=document.createElement('div');head.className='loox-nav-menu-head';head.textContent='LOOX WORKSPACES';
  dropdown.append(head);
  for(const [label,href,icon] of menuItems){
   const link=document.createElement('a');link.href=href;
   link.innerHTML='<span aria-hidden="true">'+icon+'</span><span>'+label+'</span>';
   if(href===file)link.setAttribute('aria-current','page');
   dropdown.append(link);
  }
  if(isTools){
   const appearance=document.createElement('details');appearance.className='loox-logo-appearance';
   appearance.innerHTML='<summary>◐ &nbsp; Appearance <span aria-hidden="true">⌄</span></summary><div class="loox-logo-theme-options"></div>';
   const themes=appearance.querySelector('.loox-logo-theme-options');
   for(const [name,value] of [['Black','dark'],['White','white'],['Light grey','grey']]){
    const choice=document.createElement('button');choice.type='button';choice.textContent=name;
    choice.addEventListener('click',e=>{
     e.stopPropagation();
     const original=document.querySelector('#themeControl [data-theme-choice="'+value+'"]');
     if(original){original.click();appearance.open=false;}else location.assign('settings.html');
    });
    themes.append(choice);
   }
   dropdown.append(appearance);
  }
  const close=()=>{dropdown.hidden=true;logo.setAttribute('aria-expanded','false')};
  logo.addEventListener('click',e=>{e.stopPropagation();const opening=dropdown.hidden;dropdown.hidden=!opening;logo.setAttribute('aria-expanded',String(opening))});
  logoWrap.append(logo,dropdown);
  oldBrand.replaceWith(logoWrap);
  const nav=isTools?header.querySelector('#mainNav'):document.createElement('nav');
  nav.className='loox-navbar-links';nav.setAttribute('aria-label','LOOX primary navigation');
  if(!isTools)header.insertBefore(nav,header.querySelector('[data-loox-account]'));
  nav.replaceChildren();
  for(const [label,href] of [['Home','index.html'],['AI Studio','ai-home.html'],['Guides','guides.html'],['Pricing','pricing.html']]){
   const a=document.createElement('a');a.href=href;a.textContent=label;
   if(href===file||(file==='ai-chat.html'&&href==='ai-home.html'))a.setAttribute('aria-current','page');
   nav.append(a);
  }
  const search=document.createElement('button');search.type='button';search.className='loox-navbar-search';
  search.setAttribute('aria-label','Search all LOOX tools');search.setAttribute('aria-haspopup','dialog');
  search.innerHTML='<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4 4"/></svg><span>Search tools</span><kbd>/</kbd>';
  const acct=header.querySelector('[data-loox-account]');
  if(acct)header.insertBefore(search,acct);else header.append(search);
  const showSearch=()=>{
   close();
   if(typeof window.LOOXOpenAllTools==='function'){window.LOOXOpenAllTools();return;}
   location.assign('all-image-tools.html');
  };
  search.addEventListener('click',showSearch);
  dropdown.addEventListener('click',e=>{if(e.target.closest('a'))close()});
  document.addEventListener('click',e=>{if(!logoWrap.contains(e.target))close()});
  document.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&!dropdown.hidden){close();logo.focus();return;}
   const editable=e.target.closest('input,textarea,select,[contenteditable="true"]');
   if(!editable&&!e.repeat&&(e.key==='/'||(e.key.toLowerCase()==='k'&&(e.ctrlKey||e.metaKey)))){
    e.preventDefault();e.stopImmediatePropagation();showSearch();
   }
  },true);
  // Old grid-plus menu is replaced by the logo dropdown; its theme settings remain in Settings.
  const oldToggle=document.querySelector('#menuToggle');
  if(oldToggle)oldToggle.setAttribute('tabindex','-1');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();