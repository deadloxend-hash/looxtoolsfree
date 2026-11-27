/* One consistent LOOX navigation on EVERY page.
 * All pages use the same header, sidebar and tool finder.
 * Existing editor controls are preserved in their native toolbar.
 */
(() => {
 'use strict';
 if(location.pathname.endsWith('/settings.html')&&window.parent!==window&&typeof window.parent.__looxCloseSettings==='function')return;
 // Keep Settings in a dismissible overlay so the workspace stays mounted.
 if(!window.__looxOpenSettings&&!location.pathname.endsWith('/settings.html')){
  window.__looxOpenSettings=(target='settings.html')=>{
   if(document.getElementById('loox-settings-overlay'))return;
   const destination=new URL(target,location.href),settingsURL=new URL('settings.html',location.href);
   if(destination.origin!==settingsURL.origin||destination.pathname!==settingsURL.pathname||destination.username||destination.password)return;
   const trigger=document.activeElement,dialog=document.createElement('dialog'),frame=document.createElement('iframe');
   dialog.id='loox-settings-overlay';dialog.setAttribute('aria-label','Settings');
   Object.assign(dialog.style,{position:'fixed',inset:'0',margin:'auto',padding:'0',border:'0',background:'#0c111b',width:'min(1120px, 100vw)',height:'100dvh',maxWidth:'100vw',maxHeight:'100dvh',overflow:'hidden',borderRadius:'14px'});
   const loading=document.createElement('p'),close=document.createElement('button');
   loading.textContent='Loading Settings…';loading.setAttribute('role','status');
   Object.assign(loading.style,{position:'absolute',inset:'40% 20px auto',textAlign:'center',color:'#e6edf7'});
   close.type='button';close.textContent='Close settings';close.setAttribute('aria-label','Close settings');
   Object.assign(close.style,{position:'absolute',right:'16px',top:'16px',zIndex:'1',padding:'12px',background:'#172337',color:'#e6edf7',border:'1px solid #2d3d54',borderRadius:'8px'});
   close.onclick=()=>dialog.close();
   frame.title='LOOX Settings';frame.src=destination.href;frame.style.visibility='hidden';
   frame.addEventListener('load',()=>{loading.remove();close.remove();frame.style.visibility='visible';},{once:true});
   const timeout=setTimeout(()=>{loading.textContent='Settings are taking longer to load. Close and try again.';},15000);
   frame.addEventListener('load',()=>clearTimeout(timeout),{once:true});
   dialog.addEventListener('close',()=>clearTimeout(timeout),{once:true});
   Object.assign(frame.style,{width:'100%',height:'100%',border:'0',display:'block'});
   dialog.append(loading,close,frame);document.body.append(dialog);
   const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
   dialog.addEventListener('close',()=>{dialog.remove();document.body.style.overflow=overflow;delete window.__looxCloseSettings;trigger?.focus?.({preventScroll:true})},{once:true});
   window.__looxCloseSettings=()=>dialog.close();dialog.showModal();
  };
  document.addEventListener('click',event=>{
   const a=event.target.closest?.('a[href]');if(!a||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
   const target=new URL(a.href,location.href);
   if(target.origin===location.origin&&target.pathname.endsWith('/settings.html')&&a.dataset.navigationLabel!=='Recent Activity'){event.preventDefault();event.stopImmediatePropagation();if(matchMedia('(max-width:900px)').matches)document.dispatchEvent(new Event('loox:close-sidebar'));window.__looxOpenSettings(target.href);}
  },true);
 }

 // Keep standard selects consistent with the LOOX Obsidian Blue design on every
 // page using the shared navigation. Already enhanced pages retain one instance.
 if(!document.querySelector('script[src*="loox-dropdowns.js"]')){
   const css=document.createElement('link');
   css.rel='stylesheet';
   css.href=new URL('platform/loox-dropdowns.css?v=sitewide-20261120-1',document.currentScript?.src||location.href).href;
   if(!document.querySelector('link[href*="loox-dropdowns.css"]'))document.head.append(css);
   const script=document.createElement('script');
   script.src=new URL('platform/loox-dropdowns.js?v=settings-2-20261124',document.currentScript?.src||location.href).href;
   script.defer=true;
   document.head.append(script);
 }

 let savedSidebarMode='compact';try{savedSidebarMode=localStorage.getItem('loox-sidebar-mode-v1')||'compact';}catch{}
 const initialDesktopSidebar=matchMedia('(min-width:901px)').matches;
 document.documentElement.style.setProperty('--loox-sidebar-width',initialDesktopSidebar?(savedSidebarMode==='expanded'?'248px':'64px'):'0px');
 document.body.classList.toggle('loox-sidebar-compact',initialDesktopSidebar&&savedSidebarMode!=='expanded');
 document.body.classList.add('loox-sidebar-premium');
 const page=location.pathname.split('/').pop()||'index.html';
 const pinnedWorkspace=['community.html','trending.html','templates.html','workflows.html','collections.html','creator.html','account.html'].includes(page);
 if(pinnedWorkspace)document.body.classList.add('loox-workspace-sidebar');
 // The AI creator tabs use Generative sessions instead of a second tool-directory sidebar.
 // AI Audio currently links to the Audio-filtered tools listing, not an audio generator.
 const hasSessionHistory=['ai-chat.html','ai-text-to-image.html','ai-video-generator.html'].includes(page);
 if(hasSessionHistory)document.body.classList.add('loox-ai-sessions-only');
 if(document.getElementById('loox-sitewide-header'))return;
 const isHome=['index.html','ai-home.html','ai-chat.html'].includes(page);
 const inMediaGenerator=['ai-chat.html','ai-text-to-image.html','ai-video-generator.html'].includes(page);
 // Within a generator, switch modes directly without returning to the marketing landing pages.
 const imageTabHref=inMediaGenerator?'ai-text-to-image.html#generate':'ai-image-landing.html';
 const videoTabHref=inMediaGenerator?'ai-video-generator.html#generate':'ai-video-landing.html';
 const root=new URL('./',document.currentScript?.src||new URL('loox-sitewide-nav.js',location.href).href);
 const url=name=>new URL(page==='ai-home.html'&&name.split('#')[0]==='ai-text-to-image.html'?'ai-image-landing.html':page==='ai-home.html'&&name.split('#')[0]==='ai-video-generator.html'?'ai-video-landing.html':name,root).href;
 const icons={search:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4 4"/></svg>'};
 const el=(tag,cls,text)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
 };
 const nav=el('div','loox-sitewide-header');nav.id='loox-sitewide-header';nav.setAttribute('role','banner');
 const inner=el('div','loox-sitewide-inner');
 const burger=el('button','loox-sitewide-burger');burger.type='button';burger.setAttribute('aria-label','Open LOOX tool navigation');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-controls','loox-sitewide-drawer');
 burger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m4-11h4m-4 6h4"/></svg>';
 const logoWrap=el('div','loox-sitewide-logo-wrap');
 const logo=el('a','loox-sitewide-logo');logo.href=url('ai-image-landing.html');logo.setAttribute('aria-label','LOOX home');

 const creditDock=el('div','loox-sitewide-credit-dock');
 const creditBundle=el('div','loox-sitewide-credit-bundle');
 creditDock.append(creditBundle);
 const wordmark=el('span','loox-sitewide-wordmark loox-workspace-wordmark');
 wordmark.append(document.createTextNode('LOO'),el('span','loox-workspace-x','X'));
 logo.append(wordmark);
 logoWrap.append(logo);
 const links=el('nav','loox-sitewide-links');links.setAttribute('aria-label','LOOX main navigation');
 [['AI Assistant','ai-chat.html'],['AI Image',imageTabHref],['AI Video',videoTabHref],['Community','community.html'],['Trending','trending.html'],['Templates','templates.html']].forEach(([name,href])=>{
  const link=el('a','',name);link.href=url(href);if(href.split('#')[0]===page)link.setAttribute('aria-current','page');
  if(name==='Blog'){const outbound=el('span','loox-blog-arrow','↗');outbound.setAttribute('aria-hidden','true');link.append(outbound);}
  links.append(link);
 });
 const search=el('button','loox-sitewide-search');search.type='button';
 search.setAttribute('aria-label','Search all LOOX tools');search.title='Search tools';search.innerHTML=icons.search;
 const account=el('div','loox-sitewide-account');account.setAttribute('data-loox-account','');
 inner.append(burger,logoWrap,links,search,creditDock,account);
  // AI Image marketing page: no visible credits/upgrade in its top navigation.
  // Keep balances available in the account popover and generator workspace.
  if(page==='ai-image-landing.html'||page==='ai-video-landing.html'){
    creditDock.remove();
    inner.insertBefore(search,account);
  }
  nav.append(inner);
 document.body.prepend(nav);
 nav.toggleAttribute('data-loox-sidebar-header-flow',getComputedStyle(nav).position!=='fixed');
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
  if(page==='ai-chat.html'){native.classList.add('loox-sitewide-chatbar');}
  else if(isHome){native.classList.add('loox-sitewide-simplebar');}else{
  const buttons=[...native.querySelectorAll('button')].filter(b=>!b.matches('#loox-page-back,.loox-tool-menu,.loox-overflow-trigger,.loox-rail-toggle,#menuToggle'));
  const editor=native.matches('.studio-top,.lig-header,.studio-header,.editor-header')||
      !!native.querySelector('.lig-head-tabs,.studio-top-actions,.top-actions,.editor-toolbar,.lig-head-start')||
      buttons.some(b=>/^(undo|redo|export|save|openImage|import|render)/i.test(b.id||''));
  native.classList.add(editor?'loox-sitewide-workspacebar':'loox-sitewide-simplebar');
  }
 }
 // Identical workspace destinations are used across Agent, Image, Video and Community.
 const workspaceKind={'ai-chat.html':'agent','ai-text-to-image.html':'image','ai-video-generator.html':'video','community.html':'community','trending.html':'trending','templates.html':'templates'};
 if(native&&workspaceKind[page]&&!native.querySelector('.loox-ai-workspace-tabs')){
  const tabs=el('nav','loox-ai-workspace-tabs');tabs.setAttribute('aria-label','LOOX AI workspaces');
  const icons={
   agent:'<path d="M12 20h9M16.5 3.5l4 4L10 18l-5 1 1-5L16.5 3.5z"/>',
   image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5-5L5 21"/>',
   video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 10 5-5m4 5 5-5"/>',
   community:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-4.5 4.7-4.5 13.3 0 18m0-18c4.5 4.7 4.5 13.3 0 18"/>',
   trending:'<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
   templates:'<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>'
  };
  [
   ['AI Assistant','ai-chat.html','agent'],
   ['AI Image','ai-text-to-image.html#generate','image'],
   ['AI Video','ai-video-generator.html#generate','video'],
   ['Community','community.html','community'],
   ['Trending','trending.html','trending'],
   ['Templates','templates.html','templates'],
  ['Photo Editor','photo-editor.html','image'],
  ['Video Editor','video-editor.html','video'],
  ['Design Studio','design-studio.html','templates']
  ].forEach(([label,href,kind])=>{
   const a=el('a','loox-ai-workspace-tab');a.href=url(href);
   a.dataset.aiTab=kind;
   const icon=el('span','loox-ai-workspace-symbol');
   icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[kind]+'</svg>';
   a.append(icon,document.createTextNode(label));
   if(workspaceKind[page]===kind){a.classList.add('is-active');a.setAttribute('aria-current','page');}
   tabs.append(a);
  });
  const nativeTabs=native.querySelector('.lig-head-tabs');
  const accountHost=native.querySelector('[data-loox-account]');
  if(nativeTabs)native.insertBefore(tabs,nativeTabs);
  else if(accountHost)native.insertBefore(tabs,accountHost);
  else native.append(tabs);
  if(nativeTabs)nativeTabs.classList.add('loox-internal-templates-tabs');
 }

 // Shared LOOX mobile app launcher for every home, landing and creator workspace.
 // Native generator headers get their own trigger because the sitewide bar is hidden there.
 const appDestinations=[
  ['AI Assistant','ai-chat.html','agent'],
  ['AI Image',imageTabHref,'image'],
  ['AI Video',videoTabHref,'video'],
  ['Community','community.html','community'],
  ['Trending','trending.html','trending'],
  ['Templates','templates.html','templates'],
  ['Photo Editor','photo-editor.html','image'],
  ['Video Editor','video-editor.html','video'],
  ['Design Studio','design-studio.html','templates']
 ];
 const appIcons={
  agent:'<path d="M7 8h10M7 12h7"/><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3z"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="1.5"/><path d="m5 18 5-5 3 3 3-4 3 4"/>',
  video:'<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3z"/>',
  community:'<circle cx="9" cy="9" r="3"/><circle cx="17.5" cy="10" r="2.3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 15a4 4 0 0 1 5 4"/>',
  trending:'<path d="m3 17 6-6 4 4 8-9M15 6h6v6"/>',
  templates:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 5v14M5 12h14M7 7h2m6 10h2"/>'
 };
 const appLayer=el('dialog','loox-mobile-app-layer');appLayer.hidden=true;
 appLayer.innerHTML='<div class="loox-mobile-app-scrim" data-close-apps></div><section class="loox-mobile-app-sheet" role="dialog" aria-modal="true" aria-label="LOOX apps"><div class="loox-mobile-app-handle"></div><div class="loox-mobile-app-heading"><div><small>LOOX CREATIVE STUDIO</small><h2>Web apps</h2></div><button type="button" class="loox-mobile-app-close" aria-label="Close apps">×</button></div><div class="loox-mobile-app-grid"></div></section>';
 const appGrid=appLayer.querySelector('.loox-mobile-app-grid');
 appDestinations.forEach(([label,href,kind])=>{
  const a=el('a','loox-mobile-app-tile');a.href=url(href);
  if(page===href.split('#')[0]||(kind==='image'&&page==='ai-image-landing.html')||(kind==='video'&&page==='ai-video-landing.html'))a.setAttribute('aria-current','page');
  const visual=el('span','loox-mobile-app-icon loox-mobile-app-icon-'+kind);
  visual.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+appIcons[kind]+'</svg>';
  a.append(visual,el('span','loox-mobile-app-label',label));appGrid.append(a);
 });
 const appFooter=el('a','loox-apps-all','Explore all tools');appFooter.href=url('index.html#tools');appLayer.querySelector('.loox-mobile-app-sheet').append(appFooter);
 document.body.append(appLayer);
 // Native modal top layer prevents transformed ancestors and competing page CSS from clipping the launcher.
 appLayer.style.setProperty('position','fixed','important');
 appLayer.style.setProperty('inset','0','important');
 appLayer.style.setProperty('width','100vw','important');
 appLayer.style.setProperty('height','100dvh','important');
 appLayer.style.setProperty('max-width','none','important');
 appLayer.style.setProperty('max-height','none','important');
 appLayer.style.setProperty('margin','0','important');
 appLayer.style.setProperty('padding','0','important');
 appLayer.style.setProperty('border','0','important');
 appLayer.style.setProperty('background','transparent','important');
 appLayer.style.setProperty('overflow','hidden','important');
 const appTriggers=[];
 const buildAppTrigger=()=>{
  const button=el('button','loox-mobile-app-trigger');button.type='button';
  button.setAttribute('aria-label','Open LOOX apps');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
  button.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>';
  appTriggers.push(button);
  return button;
 };
 const navAppTrigger=buildAppTrigger();inner.insertBefore(navAppTrigger,account);
 // Each page has one navigation action group. Move the same controls into
 // focused workspace headers rather than mounting a second set.
 const actions=el('div','loox-header-actions');actions.id='loox-header-actions';
 const notificationPlaceholder=el('span','loox-notification-placeholder');notificationPlaceholder.setAttribute('aria-hidden','true');
 actions.append(search,navAppTrigger,notificationPlaceholder,account);inner.append(actions);
 const focusedHeader=document.body.classList.contains('loox-generator-no-topnav')&&native;
 if(focusedHeader){
  native.querySelector('[data-loox-account]')?.remove();
  native.querySelectorAll('.loox-chat-header-search,.loox-mobile-app-native-trigger,.loox-community-notification,.loox-community-mobile-menu').forEach(n=>n.remove());
  native.classList.add('loox-navigation-header');native.id='loox-navigation-bar';
  native.toggleAttribute('data-loox-sidebar-header-flow',getComputedStyle(native).position!=='fixed');
  native.prepend(burger);
  native.append(creditDock,actions);
 }else{inner.classList.add('loox-navigation-header');inner.id='loox-navigation-bar';}
 if(!document.querySelector('link[href*="navigation-layout.css"]')){
  const layoutStyle=el('link');layoutStyle.rel='stylesheet';
  layoutStyle.href=url('platform/navigation-layout.css?v=nav-20261127-1');document.head.append(layoutStyle);
 }
 // Lock the DOCUMENT scroll root as well as body. On mobile, setting only
 // body overflow:hidden allows scroll chaining and visual viewport drift.
 // Preserve exact pre-existing inline styles and the page's scroll position.
 let appsScrollLock=null;
 const lockAppsScroll=()=>{
  if(appsScrollLock)return;
  const html=document.documentElement,body=document.body;
  const props=['position','top','left','right','width','overflow','overscroll-behavior'];
  const save=(element,keys)=>keys.map(name=>({
   name,value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)
  }));
  const y=window.scrollY||html.scrollTop||body.scrollTop||0;
  const x=window.scrollX||html.scrollLeft||body.scrollLeft||0;
  appsScrollLock={
   x,y,
   htmlStyles:save(html,['overflow','overscroll-behavior']),
   bodyStyles:save(body,props)
  };
  // A fixed body prevents Android Chrome and iOS Safari from dragging the
  // background while the top-layer modal is shown. The sheet still scrolls.
  html.style.setProperty('overflow','hidden','important');
  html.style.setProperty('overscroll-behavior','none','important');
  body.style.setProperty('position','fixed','important');
  body.style.setProperty('top',(-y)+'px','important');
  body.style.setProperty('left',(-x)+'px','important');
  body.style.setProperty('right','0','important');
  body.style.setProperty('width','100%','important');
  body.style.setProperty('overflow','hidden','important');
  body.style.setProperty('overscroll-behavior','none','important');
  html.classList.add('loox-apps-scroll-locked');
 };
 const unlockAppsScroll=()=>{
  if(!appsScrollLock)return;
  const {x,y,htmlStyles,bodyStyles}=appsScrollLock;
  appsScrollLock=null;
  const restore=(element,styles)=>{
   for(const {name,value,priority} of styles){
    if(value)element.style.setProperty(name,value,priority);
    else element.style.removeProperty(name);
   }
  };
  restore(document.body,bodyStyles);
  restore(document.documentElement,htmlStyles);
  document.documentElement.classList.remove('loox-apps-scroll-locked');
  // Restore the exact spot, even after an animated close or a swipe-dismiss.
  const root=document.documentElement;
  const scrollBehavior=root.style.getPropertyValue('scroll-behavior');
  const scrollPriority=root.style.getPropertyPriority('scroll-behavior');
  root.style.setProperty('scroll-behavior','auto','important');
  window.scrollTo(x,y);
  if(scrollBehavior)root.style.setProperty('scroll-behavior',scrollBehavior,scrollPriority);
  else root.style.removeProperty('scroll-behavior');
 };
 let appLastFocus=null;
 const appSheet=appLayer.querySelector('.loox-mobile-app-sheet');
 const appScrim=appLayer.querySelector('[data-close-apps]');
 let appClosing=false;
 let closeTimer=null;
 const closeApps=()=>{
  if(appLayer.hidden||appClosing)return;
  appClosing=true;
  appLayer.classList.add('is-closing');
  appTriggers.forEach(b=>b.setAttribute('aria-expanded','false'));
  const finish=()=>{
   clearTimeout(closeTimer);if(appLayer.open)appLayer.close();appLayer.hidden=true;appClosing=false;
   appLayer.classList.remove('is-closing','is-dragging');
   appSheet.style.removeProperty('--loox-sheet-drag');
   appScrim.style.removeProperty('opacity');
   document.body.classList.remove('loox-apps-open');
   unlockAppsScroll();
   if(appLastFocus?.isConnected)appLastFocus.focus({preventScroll:true});
  };
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)finish();
  else closeTimer=setTimeout(finish,320);
 };
 const openApps=trigger=>{
  closeDrawer();
  if(closeTimer)clearTimeout(closeTimer);
  appClosing=false;appLayer.classList.remove('is-closing','is-dragging');
  appLayer.classList.add('is-opening');
  appSheet.style.removeProperty('--loox-sheet-drag');
  appScrim.style.removeProperty('opacity');
  appLastFocus=trigger;appLayer.hidden=false;if(!appLayer.open)appLayer.showModal();document.body.classList.add('loox-apps-open');
  lockAppsScroll();
  // Measure the offscreen starting position before animating upward.
  void appSheet.offsetHeight;
  requestAnimationFrame(()=>appLayer.classList.remove('is-opening'));
  appTriggers.forEach(b=>b.setAttribute('aria-expanded','true'));
  appLayer.querySelector('.loox-mobile-app-close').focus();
 };
 appTriggers.forEach(button=>button.addEventListener('click',()=>appLayer.hidden?openApps(button):closeApps()));
 appLayer.querySelector('.loox-mobile-app-close').addEventListener('click',closeApps);
 appScrim.addEventListener('click',closeApps);
 appLayer.addEventListener('cancel',event=>{event.preventDefault();closeApps();});
 // Covers unexpected native dialog closure, page navigation and history changes.
 appLayer.addEventListener('close',()=>{
  if(appLayer.open||appClosing)return;
  appLayer.hidden=true;
  document.body.classList.remove('loox-apps-open');
  unlockAppsScroll();
 });
 window.addEventListener('pagehide',unlockAppsScroll);
 // Background swipes must not bubble through the modal to the page.
 appScrim.addEventListener('touchmove',event=>{
  if(!appLayer.hidden&&event.cancelable)event.preventDefault();
 },{passive:false});
 // Native touch dragging: swipe the sheet downward to dismiss, without
 // blocking taps on links or normal scrolling through its content.
 let swipeStart=null,swipeDistance=0;
 appSheet.addEventListener('touchstart',event=>{
  if(appLayer.hidden||appClosing||event.touches.length!==1||appSheet.scrollTop>0)return;
  if(event.target.closest('a,button,input,textarea,select'))return;
  swipeStart={y:event.touches[0].clientY,x:event.touches[0].clientX};
  swipeDistance=0;
 },{passive:true});
 appSheet.addEventListener('touchmove',event=>{
  if(!swipeStart||event.touches.length!==1)return;
  const dy=event.touches[0].clientY-swipeStart.y;
  const dx=Math.abs(event.touches[0].clientX-swipeStart.x);
  if(dy<0||dx>Math.max(30,dy))return;
  if(dy>6){
   event.preventDefault();
   swipeDistance=Math.min(dy,appSheet.getBoundingClientRect().height);
   appLayer.classList.add('is-dragging');
   appSheet.style.setProperty('--loox-sheet-drag',swipeDistance+'px');
   appScrim.style.opacity=String(Math.max(.15,1-swipeDistance/350));
  }
 },{passive:false});
 const finishSwipe=()=>{
  if(!swipeStart)return;
  swipeStart=null;
  const shouldClose=swipeDistance>85;
  swipeDistance=0;appLayer.classList.remove('is-dragging');
  appSheet.style.removeProperty('--loox-sheet-drag');
  appScrim.style.removeProperty('opacity');
  if(shouldClose)closeApps();
 };
 appSheet.addEventListener('touchend',finishSwipe,{passive:true});
 appSheet.addEventListener('touchcancel',finishSwipe,{passive:true});
 document.addEventListener('keydown',event=>{
  if(appLayer.hidden)return;
  if(event.key==='Escape'){event.preventDefault();closeApps();}
  if(event.key==='Tab'){
   const links=[appLayer.querySelector('.loox-mobile-app-close'),...appLayer.querySelectorAll('.loox-mobile-app-tile')];
   const current=links.indexOf(document.activeElement);
   if(event.shiftKey&&current<=0){event.preventDefault();links[links.length-1].focus();}
   else if(!event.shiftKey&&current===links.length-1){event.preventDefault();links[0].focus();}
  }
 });
 // One canonical landing-page navigation drawer on every LOOX page.
 const sidebar=el('aside','loox-sitewide-drawer');sidebar.id='loox-sitewide-drawer';
 sidebar.setAttribute('aria-label','LOOX main navigation');
 const sideContent=el('div','loox-sitewide-drawer-list');
 // Do not reveal the drawer halfway through async navigation/session setup.
 let navigationReady=false;
 const revealWhenReady=()=>{
  if(!navigationReady)return;
  // Navigation remains usable while independent private history initializes.
  sideContent.classList.add('loox-sidebar-ready');
 };
 // Reuse the real MediaSessions DOM only in image/video generation workspaces.
 // Marketing landing pages must never display private session history.
 const mediaWorkspace=['ai-text-to-image.html','ai-video-generator.html'].includes(page);
 const chatWorkspace=page==='ai-chat.html';
 if(chatWorkspace){
  const chatSessions=document.getElementById('aiRecentPanel');
  if(chatSessions){
   sideContent.append(chatSessions);
   document.body.classList.add('loox-chat-sessions-in-drawer');
   revealWhenReady();
  }
 }
 if(mediaWorkspace){
  const dockSessions=()=>{
   const rail=document.getElementById('loox-media-session-rail');
   if(!rail||!rail.querySelector('#loox-media-sessions'))return false;
   if(rail.parentElement!==sideContent)sideContent.append(rail);
   document.body.classList.add('loox-media-sessions-in-drawer');
   revealWhenReady();
   return true;
  };
  if(!dockSessions()){
   const observer=new MutationObserver(()=>{
    if(dockSessions())observer.disconnect();
   });
   observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['id']});
   window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
 }
 const fallback=el('a','loox-sitewide-drawer-link','Home');
 fallback.href=url('ai-image-landing.html');sideContent.append(fallback);
 sidebar.append(sideContent);
 const navStyle=el('link');navStyle.rel='stylesheet';
 navStyle.href=url('platform/workspace-navigation.css?v=sidebar-20261127');
 document.head.append(navStyle);

 import(url('platform/workspace-navigation.js?v=sidebar-activity-20261127')).then(({mountWorkspaceNavigation})=>{
  // Keep the live session list when async navigation finishes loading.
  const existingRail=mediaWorkspace?sideContent.querySelector('#loox-media-session-rail'):chatWorkspace?sideContent.querySelector('#aiRecentPanel'):null;
  sideContent.replaceChildren();mountWorkspaceNavigation(sideContent);
  const footer=sideContent.querySelector('.loox-workspace-footer');if(footer)sidebar.append(footer);
  if(existingRail)sideContent.append(existingRail);
  navigationReady=true;
  revealWhenReady();
 }).catch(error=>{
  console.warn('LOOX main navigation failed:',error);
  navigationReady=true;
  revealWhenReady();
 });
 // If history cannot initialize, show a usable navigation instead of a blank drawer.
 // Normally history mounts long before this fallback fires.
 if(hasSessionHistory)setTimeout(()=>{
  if(!sideContent.classList.contains('loox-sidebar-ready')){
   if(!sideContent.querySelector('.loox-workspace-navigation'))return;
   sideContent.classList.add('loox-sidebar-ready');
  }
 },4500);
 const scrim=el('button','loox-sitewide-scrim');scrim.hidden=true;scrim.type='button';scrim.setAttribute('aria-label','Close navigation');
 const dockToggle=el('button','loox-sitewide-dock-toggle');dockToggle.type='button';dockToggle.id='loox-sidebar-edge-handle';
 dockToggle.setAttribute('aria-label','Open LOOX sidebar');
 dockToggle.setAttribute('aria-controls','loox-sitewide-drawer');dockToggle.setAttribute('aria-expanded','false');
 dockToggle.innerHTML='<span class="loox-dock-bars" aria-hidden="true"></span><span class="loox-dock-arrow" aria-hidden="true">›</span>';
 // Do not mount the unrelated sitewide tools drawer in the focused AI workspaces.
 document.body.append(scrim,sidebar,dockToggle);
 import(url('platform/sidebar.js?v=sidebar-20261127')).then(({mountSidebar})=>mountSidebar({sidebar,content:sideContent,burger,scrim,dockToggle,lock:lockAppsScroll,unlock:()=>{if(appLayer.hidden)unlockAppsScroll();}}));
 const closeDrawer=()=>document.dispatchEvent(new Event('loox:close-sidebar'));

 // Keep real account data and existing sign-in/sign-out actions. Rehome only
 // the rendered credits and Upgrade controls to the small bundle beside LOOX.
 const profileIcon={
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l-1.6 1.6a2 2 0 0 0-2.2-.4L15 21h-6l-1-2.6a2 2 0 0 0-2.2.4l-1.6-1.6A2 2 0 0 0 4.6 15L2 14v-4l2.6-1a2 2 0 0 0-.4-2.2l1.6-1.6A2 2 0 0 0 8 5.6L9 3h6l1 2.6a2 2 0 0 0 2.2-.4l1.6 1.6a2 2 0 0 0-.4 2.2L22 10v4z"/>',
  language:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 4-5 14 0 18M12 3c5 4 5 14 0 18M5 7h14M5 17h14"/>',
  notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  theme:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'
 };
 const pict=kind=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+profileIcon[kind]+'</svg>';
 function toggleSiteTheme(trigger){
  let pref={};try{pref=JSON.parse(localStorage.getItem('loox-platform-prefs')||'{}')||{}}catch{}
  const themeIsLight=pref.theme==='light'||(!pref.theme&&document.documentElement.dataset.lxTheme==='light');
  const mode=themeIsLight?'dark':'light';
  pref.theme=mode;
  try{
   localStorage.setItem('loox-platform-prefs',JSON.stringify(pref));
   localStorage.setItem('loox-theme-v1',mode==='light'?'white':'dark');
  }catch{}
  document.documentElement.dataset.lxTheme=mode;
  if(typeof window.LOOXApplyTheme==='function')window.LOOXApplyTheme(mode==='light'?'white':'dark');
  window.dispatchEvent(new CustomEvent('looxpreferenceschange',{detail:pref}));
  if(trigger)trigger.title=mode==='light'?'Switch to dark theme':'Switch to light theme';
 }

 const closeLogo=()=>{const details=account.querySelector('.lx-profile-details');if(details)details.open=false;};

 function openCommunityNotifications(){import(url('platform/notifications.js?v=nav-20261127-1')).then(m=>m.openNotifications());}

 function enableProfileShortcuts(menu){
  if(menu.querySelector('.loox-profile-actions'))return;
  const actions=el('div','loox-profile-actions');
  actions.setAttribute('role','group');actions.setAttribute('aria-label','Account quick settings');
  function action(kind,label){
   const b=el('button','loox-profile-action');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=pict(kind);
   actions.append(b);return b;
  }
  const settings=action('settings','Account settings');
  const notifications=action('notifications','Notifications');
  const languages=action('language','Change language');
  const theme=action('theme','Toggle light and dark theme');
  const options=el('div','loox-profile-panel');
  options.hidden=true;options.setAttribute('aria-label','Choose site language');
  const optionsTitle=el('strong','','Language');options.append(optionsTitle);
  const optionsGrid=el('div','loox-profile-languages');
  [['en','English'],['es','Español'],['fr','Français'],['de','Deutsch']].forEach(([code,label])=>{
   const b=el('button','',label);b.type='button';b.dataset.code=code;
   b.addEventListener('click',()=>{
    try{localStorage.setItem('loox-language',code);}catch{}
    const next=new URL(location.href);if(code==='en')next.searchParams.delete('lang');else next.searchParams.set('lang',code);
    location.assign(next.href);
   });
   optionsGrid.append(b);
  });
  options.append(optionsGrid);
  const moreLanguages=el('a','','More language settings');moreLanguages.href=url('settings.html#workspace-preferences');options.append(moreLanguages);
  const notificationsPanel=el('div','loox-profile-panel');
  notificationsPanel.hidden=true;notificationsPanel.setAttribute('aria-label','Notifications');
  notificationsPanel.append(el('strong','','Notifications'),el('p','','Open your Community activity to see likes, comments, replies and follows.'));
  const openNotifications=el('a','','Open notifications');openNotifications.href=url('community.html?notifications=1');notificationsPanel.append(openNotifications);
  const activity=el('a','','View account activity');activity.href=url('account.html#usage');notificationsPanel.append(activity);
  const identity=menu.querySelector('.lx-profile-identity');
  const logout=menu.querySelector('.lx-profile-signout');
  if(logout)logout.before(actions);
  else if(identity)identity.after(actions);
  else menu.prepend(actions);
  actions.after(options,notificationsPanel);
  settings.addEventListener('click',()=>window.__looxOpenSettings?window.__looxOpenSettings(url('settings.html#workspace-preferences')):location.assign(url('settings.html#workspace-preferences')));
  languages.addEventListener('click',()=>{
   options.hidden=!options.hidden;notificationsPanel.hidden=true;
   languages.setAttribute('aria-expanded',String(!options.hidden));notifications.setAttribute('aria-expanded','false');
  });
  notifications.addEventListener('click',openCommunityNotifications);
  theme.addEventListener('click',()=>toggleSiteTheme(theme));
 }

 // One real account menu on every page, including the native image/video/chat headers.
 // The existing account module still owns authentication, balances and sign-out.
 let looxAccountModule=null;
 const accountGlyphs={
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  subscription:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  usage:'<path d="M4.9 17a8 8 0 1 1 14.2 0"/><path d="m12 13 3-4"/><circle cx="12" cy="13" r="1"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M19.1 4.9 17 7m-10 10-2.1 2.1"/>',
  mcp:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m8 10-2 2 2 2m8-4 2 2-2 2m-5-3-2 6"/>',
  faq:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-1.1 1-1.9 1.4-1.9 2.7M12 17h.01"/>',
  bug:'<path d="M8 4 7 2m9 2 1-2M5 12H2m20 0h-3M6 8 3.8 6m14.4 0L20 8M6 17l-2.2 2m14.4-2 1.8 2"/><rect x="6" y="5" width="12" height="16" rx="6"/><path d="M6 12h12M12 12v9"/>',
  logout:'<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m15 7 5 5-5 5M20 12H9"/>',
  switch:'<path d="M7 7h14m-4-4 4 4-4 4M17 17H3m4-4-4 4 4 4"/>',
  crown:'<path d="M2 7 7 11 12 4 17 11 22 7l-2 12H4L2 7z"/>',
  account:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5.5 19c.8-4 12.2-4 13 0"/>'
 };
 const accountGlyph=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+accountGlyphs[name]+'</svg>';
 function enhancePopover(menu){
  if(menu.dataset.looxAccountEnhanced==='yes')return;
  menu.dataset.looxAccountEnhanced='yes';
  menu.classList.add('loox-account-popover');
  const details=menu.closest('.lx-profile-details');
  if(details){
   let timer;
   details.addEventListener('toggle',()=>{if(details.open){menu.scrollTop=0;requestAnimationFrame(()=>{if(details.open)menu.scrollTop=0;});}});
   details.addEventListener('pointerenter',event=>{
    if(event.pointerType!=='mouse')return;
    clearTimeout(timer);
    details.open=true;
   });
   details.addEventListener('pointerleave',event=>{
    if(event.pointerType!=='mouse')return;
    clearTimeout(timer);
    timer=setTimeout(()=>{if(!details.matches(':focus-within'))details.open=false;},170);
   });
   details.addEventListener('focusout',()=>{
    requestAnimationFrame(()=>{
     if(!details.contains(document.activeElement)&&!details.matches(':hover'))details.open=false;
    });
   });
  }
  // For signed-out users retain the original functional sign-in and register buttons.
  const identity=menu.querySelector('.lx-profile-identity');
  const name=identity?.querySelector('.lx-profile-name')?.textContent?.trim();
  if(!name)return;
  const originalSignout=menu.querySelector('.lx-profile-signout');
  const originalSwitch=menu.querySelector('.lx-profile-switch-account');
  const existingLinks=menu.querySelector('.lx-profile-links');
  const plan=looxAccountModule?.state?.account?.plan;
  const planText={basic:'LOOX Basic',free:'LOOX Basic',creator:'LOOX Creator',pro:'LOOX Pro',business:'LOOX Business',lifetime:'LOOX Lifetime'}[plan]||'Account plan';
  const avatar=el('span','loox-popover-avatar');
  avatar.setAttribute('aria-hidden','true');
  avatar.textContent=name.slice(0,1).toUpperCase();
  const identityText=el('div','loox-popover-identity-text');
  identityText.append(el('strong','loox-popover-name',name),el('small','loox-popover-plan',planText));
  const reward=identity.querySelector('[data-loox-reward]');
  identity.replaceChildren(avatar,identityText);
  if(reward)identity.after(reward);
  identity.classList.add('loox-popover-identity');
  const creditBox=el('section','loox-popover-credits');
  creditBox.setAttribute('aria-label','Your AI credits');
  const balanceRow=el('div','loox-popover-credit-top');
  balanceRow.append(el('strong','','Credits'));
  const available=looxAccountModule?.state?.account?.wallet?.balance;
  const count=Number.isFinite(Number(available))&&available!=null?String(available):'…';
  balanceRow.append(el('span','',count+' available'));
  const accent=el('div','loox-popover-accent');accent.setAttribute('aria-hidden','true');
  const premium=el('div','loox-popover-premium');
  premium.append(el('span','loox-popover-crown'),el('strong','','Go Premium'));
  premium.querySelector('.loox-popover-crown').innerHTML=accountGlyph('crown');
  const upgrade=el('a','loox-popover-upgrade','Upgrade');
  upgrade.href=url('upgrade.html');
  premium.append(upgrade);
  creditBox.append(balanceRow,accent,premium);
  identity.after(creditBox);
  if(originalSwitch){
   creditBox.after(originalSwitch);
   originalSwitch.classList.add('loox-popover-switch');
   originalSwitch.textContent='Switch account';
   originalSwitch.insertAdjacentHTML('afterbegin',accountGlyph('switch'));
  }
  if(existingLinks){
   existingLinks.replaceChildren();
   existingLinks.classList.add('loox-popover-links');
   const items=[
    ['Profile','profile','creator.html'],
    ['Subscriptions','subscription','settings.html#billing'],
    ['Usage','usage','account.html#usage'],
    ['Settings','settings','settings.html#workspace-preferences'],
    ['FAQs','faq','help.html'],
    ['Report a bug','bug','contact.html']
   ];
   const makeRow=(label,icon,href)=>{
    const row=el('a','loox-popover-link');
    row.href=url(href);row.innerHTML=accountGlyph(icon);
    row.append(el('span','',label));
    existingLinks.append(row);
   };
   items.forEach(([label,icon,href],i)=>{
    makeRow(label,icon,href);
    if(i===3){
     const soon=el('span','loox-popover-link loox-popover-disabled');
     soon.innerHTML=accountGlyph('mcp');
     soon.append(el('span','','Connect MCP & CLI'),el('small','','Soon'));
     soon.setAttribute('title','MCP and CLI connections are not available in LOOX yet');
     existingLinks.append(soon);
    }
   });
  }
  if(originalSignout){
   originalSignout.classList.add('loox-popover-logout');
   originalSignout.textContent='Logout';
   originalSignout.insertAdjacentHTML('afterbegin',accountGlyph('logout'));
  }
 }

 // The shared account module owns avatar loading and authentication timing.
 let sharedAvatar=null;
 import(url('platform/account-avatar.js?v=settings-2-20261124')).then(module=>{sharedAvatar=module;syncAccountHeader();});
 function syncCreatorAvatar(){if(looxAccountModule){sharedAvatar?.syncAccountAvatar(looxAccountModule.state);sharedAvatar?.paintAccountAvatar();}}
 function syncAccountHeader(){
  const credit=account.querySelector('.lx-credit-chip');
  const upgrade=account.querySelector('.lx-upgrade');
  if(credit&&upgrade)creditBundle.replaceChildren(credit,upgrade);
  // The same real account component appears in tool headers and in the sitewide header.
  document.querySelectorAll('[data-loox-account] .lx-profile-menu').forEach(menu=>{
   enhancePopover(menu);
   if(menu.querySelector('.lx-profile-name')||menu.querySelector('.loox-popover-name'))
    enableProfileShortcuts(menu);
  });
  const userName=account.querySelector('.loox-popover-name,.lx-profile-name')?.textContent?.trim();

  syncCreatorAvatar();
 }
 document.addEventListener('loox-header',syncAccountHeader);
 const accountObserver=new MutationObserver(syncAccountHeader);
 accountObserver.observe(account,{childList:true});
 // Unified full tool finder. Uses the existing public tool catalog and real tool links.
 const dialog=el('dialog','loox-sitewide-finder');
 dialog.innerHTML='<div class="loox-sitewide-finder-head"><div><small>LOOX WORKSPACES</small><h2>Find a tool</h2></div><button type="button" aria-label="Close tool search" class="loox-sitewide-finder-close">×</button></div><div class="loox-sitewide-finder-input">'+icons.search+'<input type="search" placeholder="Search every tool…" aria-label="Search every LOOX tool"></div><div class="loox-sitewide-finder-tabs" role="group" aria-label="Filter tools"><button type="button" data-filter="all" aria-pressed="true">All tools</button><button type="button" data-filter="image">Image</button><button type="button" data-filter="video">Video</button><button type="button" data-filter="text">Text</button><button type="button" data-filter="ai">AI</button></div><p class="loox-sitewide-finder-status" role="status"></p><div class="loox-sitewide-finder-results"></div>';
 document.body.append(dialog);
 const mobileFix=document.createElement('link');mobileFix.rel='stylesheet';mobileFix.href=url('platform/loox-mobile-refinements.css?v=2');document.head.append(mobileFix);
 const fitFinder=()=>{const v=window.visualViewport;dialog.style.setProperty('--finder-height',(v?.height||innerHeight)+'px');dialog.style.setProperty('--finder-top',(v?.offsetTop||0)+'px');};
 window.visualViewport?.addEventListener('resize',fitFinder);window.visualViewport?.addEventListener('scroll',fitFinder);fitFinder();
 dialog.addEventListener('close',()=>document.body.classList.remove('loox-finder-open'));

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
  document.body.classList.add('loox-finder-open');fitFinder();field.focus({preventScroll:true});
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
  if(e.key==='Escape'){closeLogo();if(!document.querySelector('dialog[open]'))closeDrawer();return;}
  if((e.key==='/'||(e.key.toLowerCase()==='k'&&(e.ctrlKey||e.metaKey)))&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable]')){
   e.preventDefault();e.stopImmediatePropagation();openFinder();
  }
 },true);
 // Use the real account UI for credits, upgrade, and avatar; no invented balances.
 if(![...document.querySelectorAll('link[rel="stylesheet"]')].some(l=>l.href.includes('/platform/platform.css'))){
  const style=document.createElement('link');style.rel='stylesheet';style.href=url('platform/platform.css?v=upgrade-20261119-1');document.head.append(style);
 }
 import(url('platform/notifications.js?v=nav-20261127-1')).then(m=>m.mountNotifications()).catch(()=>{});
 import(url('platform/mobile-viewport.js?v=settings-2-20261124'));
 import(url('platform/account.js?v=auth-20261127')).then(m=>{looxAccountModule=m;m.renderHeader();syncAccountHeader();}).catch(()=>{
  account.replaceChildren();
  const link=el('a','loox-sitewide-signin','Sign in');link.href=url('account.html');account.append(link);
 });
})();
