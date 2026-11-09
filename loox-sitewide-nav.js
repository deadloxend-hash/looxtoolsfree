/* One consistent LOOX navigation on EVERY page.
 * All pages use the same header, sidebar and tool finder.
 * Existing editor controls are preserved in their native toolbar.
 */
(() => {
 'use strict';
 const page=location.pathname.split('/').pop()||'index.html';
 const pinnedWorkspace=['community.html','trending.html','templates.html','workflows.html','collections.html','creator.html','account.html'].includes(page);
 if(pinnedWorkspace)document.body.classList.add('loox-workspace-sidebar');
 // The AI creator tabs use Generative sessions instead of a second tool-directory sidebar.
 // AI Audio currently links to the Audio-filtered tools listing, not an audio generator.
 const hasSessionHistory=['ai-chat.html','ai-text-to-image.html','ai-video-generator.html'].includes(page);
 // Six AI navigation tabs must start with a closed sidebar on every visit,
 // whether opened by refresh, a tab switch, or a desktop breakpoint change.
 const closedByDefaultTabs=['ai-chat.html','ai-text-to-image.html','ai-video-generator.html','community.html','trending.html','templates.html'].includes(page);
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
 const burger=el('button','loox-sitewide-burger','☰');burger.type='button';burger.setAttribute('aria-label','Open LOOX tool navigation');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-controls','loox-sitewide-drawer');
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
 [['AI Agent','ai-chat.html'],['AI Image',imageTabHref],['AI Video',videoTabHref],['Community','community.html'],['Trending','trending.html'],['Templates','templates.html']].forEach(([name,href])=>{
  const link=el('a','',name);link.href=url(href);if(href.split('#')[0]===page)link.setAttribute('aria-current','page');
  if(name==='Blog'){const outbound=el('span','loox-blog-arrow','↗');outbound.setAttribute('aria-hidden','true');link.append(outbound);}
  links.append(link);
 });
 const search=el('button','loox-sitewide-search');search.type='button';
 search.setAttribute('aria-label','Search all LOOX tools');search.title='Search tools';search.innerHTML=icons.search;
 const account=el('div','loox-sitewide-account');account.setAttribute('data-loox-account','');
 inner.append(logoWrap,links,search,creditDock,account);
  // AI Image marketing page: no visible credits/upgrade in its top navigation.
  // Keep balances available in the account popover and generator workspace.
  if(page==='ai-image-landing.html'){
    creditDock.remove();
    inner.insertBefore(search,account);
  }
  nav.append(inner);
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
   ['AI Agent','ai-chat.html','agent'],
   ['AI Image','ai-text-to-image.html#generate','image'],
   ['AI Video','ai-video-generator.html#generate','video'],
   ['Community','community.html','community'],
   ['Trending','trending.html','trending'],
   ['Templates','templates.html','templates']
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
 // One canonical landing-page navigation drawer on every LOOX page.
 const sidebar=el('aside','loox-sitewide-drawer');sidebar.id='loox-sitewide-drawer';
 sidebar.setAttribute('aria-label','LOOX main navigation');
 const sideContent=el('div','loox-sitewide-drawer-list');
 // Do not reveal the drawer halfway through async navigation/session setup.
 let navigationReady=false;
 const revealWhenReady=()=>{
  if(!navigationReady)return;
  if(hasSessionHistory&&!sideContent.querySelector(page==='ai-chat.html'?'#aiRecentPanel':'#loox-media-session-rail'))return;
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
 navStyle.href=url('platform/workspace-navigation.css?v=10');
 document.head.append(navStyle);
 import(url('platform/workspace-navigation.js?v=9')).then(({mountWorkspaceNavigation})=>{
  // Keep the live session list when async navigation finishes loading.
  const existingRail=mediaWorkspace?sideContent.querySelector('#loox-media-session-rail'):chatWorkspace?sideContent.querySelector('#aiRecentPanel'):null;
  sideContent.replaceChildren();mountWorkspaceNavigation(sideContent);
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
 const scrim=el('button','loox-sitewide-scrim');scrim.type='button';scrim.setAttribute('aria-label','Close navigation');
 const dockToggle=el('button','loox-sitewide-dock-toggle');dockToggle.type='button';
 dockToggle.setAttribute('aria-label','Open LOOX sidebar');
 dockToggle.setAttribute('aria-controls','loox-sitewide-drawer');dockToggle.setAttribute('aria-expanded','false');
 dockToggle.innerHTML='<span class="loox-dock-bars" aria-hidden="true"></span><span class="loox-dock-arrow" aria-hidden="true">›</span>';
 // Do not mount the unrelated sitewide tools drawer in the focused AI workspaces.
 document.body.append(scrim,sidebar,dockToggle);
 const desktop=matchMedia('(min-width:901px)');
 const setDrawer=open=>{
  // Workspace sidebars default to open, but the edge tab always lets users hide or restore them.
  sidebar.classList.toggle('is-open',open);
  scrim.classList.toggle('is-open',open&&(!desktop.matches||hasSessionHistory));
  document.body.classList.toggle('loox-sitewide-sidebar-open',open);
  dockToggle.setAttribute('aria-expanded',String(open));
  dockToggle.setAttribute('aria-label',open?'Collapse LOOX sidebar':'Open LOOX sidebar');
  dockToggle.title=open?'Collapse sidebar':'Expand sidebar';
  dockToggle.querySelector('.loox-dock-arrow').textContent=open?'‹':'›';
  burger.setAttribute('aria-expanded',String(open));
  burger.setAttribute('aria-label',open?'Hide LOOX navigation':'Show LOOX navigation');
 };
 const closeDrawer=()=>setDrawer(false);
 burger.addEventListener('click',()=>setDrawer(!sidebar.classList.contains('is-open')));
 dockToggle.addEventListener('click',()=>burger.click());
 // Every AI tab starts collapsed; the user can always open it manually.
 // Do not automatically expand these six tabs when switching desktop/mobile.
 desktop.addEventListener('change',()=>{
  if(closedByDefaultTabs)setDrawer(false);
  else setDrawer(!hasSessionHistory&&desktop.matches&&(pinnedWorkspace||isHome));
 });
 setDrawer(!closedByDefaultTabs&&!hasSessionHistory&&desktop.matches&&(pinnedWorkspace||isHome));
 scrim.addEventListener('click',closeDrawer);

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

 // Small persistent account panel pinned to the bottom of the shared sidebar.
 // Keep it separate from the scrollable navigation; mirror the real account name.
 const sideFooter=el('div','loox-sidebar-footer');
 const sideAccount=el('a','loox-sidebar-account-row');sideAccount.href=url('creator.html');
 sideAccount.setAttribute('aria-label','Manage your LOOX account');
 const avatarMark=el('span','loox-sidebar-avatar');
 avatarMark.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="9" r="3"/><path d="M5.5 19c.8-4 12.2-4 13 0"/></svg>';
 const sideIdentity=el('span','loox-sidebar-identity');
 const sideName=el('strong','loox-sidebar-account-name','Profile');
 const sideSubtitle=el('small','','Creator & account');sideIdentity.append(sideName,sideSubtitle);
 sideAccount.append(avatarMark,sideIdentity);
 const sideOptions=el('div','loox-sidebar-utility-panel');sideOptions.hidden=true;
 sideOptions.id='loox-sidebar-utility-panel';
 const sideActions=el('div','loox-sidebar-actions');sideActions.setAttribute('role','group');
 sideActions.setAttribute('aria-label','Workspace quick settings');
 const sidebarIcons={};
 function makeSideAction(kind,label,href){
  const node=el(href?'a':'button','loox-sidebar-action');
  if(href)node.href=url(href);else node.type='button';
  node.title=label;node.setAttribute('aria-label',label);node.innerHTML=pict(kind);
  sideActions.append(node);sidebarIcons[kind]=node;return node;
 }
 function openCommunityNotifications(){
  if(typeof window.__looxOpenCommunityNotifications==='function'){
   window.__looxOpenCommunityNotifications();return;
  }
  location.assign(url('community.html?notifications=1'));
 }
 const bell=makeSideAction('notifications','Notifications');
 makeSideAction('settings','Account settings','settings.html#workspace-preferences');
 const globe=makeSideAction('language','Change language');
 const moon=makeSideAction('theme','Toggle light and dark theme');
 bell.setAttribute('aria-controls',sideOptions.id);bell.setAttribute('aria-expanded','false');
 globe.setAttribute('aria-controls',sideOptions.id);globe.setAttribute('aria-expanded','false');
 let panelKind='';
 function closeSideOptions(){
  panelKind='';sideOptions.hidden=true;
  bell.setAttribute('aria-expanded','false');globe.setAttribute('aria-expanded','false');
 }
 function showSideOptions(kind){
  if(panelKind===kind&&!sideOptions.hidden){closeSideOptions();return}
  panelKind=kind;sideOptions.replaceChildren();
  sideOptions.append(el('strong','loox-sidebar-panel-title',kind==='language'?'Language':'Notifications'));
  if(kind==='language'){
   const languages=el('div','loox-sidebar-language-grid');
   [['en','English'],['es','Español'],['fr','Français'],['de','Deutsch']].forEach(([code,label])=>{
    const option=el('button','',label);option.type='button';
    option.addEventListener('click',()=>{
     try{localStorage.setItem('loox-language',code)}catch{}
     const next=new URL(location.href);
     if(code==='en')next.searchParams.delete('lang');else next.searchParams.set('lang',code);
     location.assign(next.href);
    });
    languages.append(option);
   });
   sideOptions.append(languages);
   const more=el('a','','More language settings');more.href=url('settings.html#workspace-preferences');sideOptions.append(more);
  }else{
   const view=el('a','','Open Community notifications');view.href=url('community.html?notifications=1');sideOptions.append(view);
   const activity=el('a','','View account activity');activity.href=url('account.html#usage');sideOptions.append(activity);
  }
  sideOptions.hidden=false;
  bell.setAttribute('aria-expanded',String(kind==='notifications'));
  globe.setAttribute('aria-expanded',String(kind==='language'));
 }
 bell.addEventListener('click',openCommunityNotifications);
 globe.addEventListener('click',()=>showSideOptions('language'));
 moon.addEventListener('click',()=>{closeSideOptions();toggleSiteTheme(moon)});
 document.addEventListener('pointerdown',event=>{
  if(!sideFooter.contains(event.target))closeSideOptions();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!sideOptions.hidden)closeSideOptions();
 });
 // Do not mount a profile card or utility footer inside the shared sidebar.
 // Account controls remain in the existing header/profile menu.

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
  settings.addEventListener('click',()=>location.assign(url('settings.html#workspace-preferences')));
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
  const existingLinks=menu.querySelector('.lx-profile-links');
  const plan=looxAccountModule?.state?.account?.plan;
  const planText={free:'Free Plan',pro:'LOOX Pro',lifetime:'LOOX Lifetime'}[plan]||'Account plan';
  const avatar=el('span','loox-popover-avatar');
  avatar.setAttribute('aria-hidden','true');
  avatar.textContent=name.slice(0,1).toUpperCase();
  const identityText=el('div','loox-popover-identity-text');
  identityText.append(el('strong','loox-popover-name',name),el('small','loox-popover-plan',planText));
  identity.replaceChildren(avatar,identityText);
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
  if(existingLinks){
   existingLinks.replaceChildren();
   existingLinks.classList.add('loox-popover-links');
   const items=[
    ['Profile','profile','creator.html'],
    ['Subscriptions','subscription','account.html#subscription'],
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

 // Reuse the public creator avatar as the single account/avatar identity.
 // Fall back to the account initial if no creator image is configured.
 let avatarUser=null,avatarLoaded=false,avatarUrl=null,avatarTask=null;
 function paintCreatorAvatar(imageUrl){
  if(!imageUrl)return;
  const holders=[
   ...document.querySelectorAll('[data-loox-account] .lx-avatar'),
   ...document.querySelectorAll('[data-loox-account] .loox-popover-avatar'),
   avatarMark
  ];
  for(const holder of holders){
   if(!holder||holder.querySelector('img')?.src===imageUrl)continue;
   const img=el('img','loox-creator-avatar-img');
   img.src=imageUrl;img.alt='';img.loading='lazy';img.decoding='async';
   img.addEventListener('error',()=>{if(img.isConnected)img.remove();},{once:true});
   holder.replaceChildren(img);
  }
 }
 function syncCreatorAvatar(){
  const uid=looxAccountModule?.state?.user?.id;
  if(!uid||!looxAccountModule?.state?.client)return;
  if(avatarUser===uid&&avatarLoaded){if(avatarUrl)paintCreatorAvatar(avatarUrl);return;}
  if(avatarUser===uid&&avatarTask)return;
  avatarUser=uid;avatarLoaded=false;
  avatarTask=(async()=>{
   const {data,error}=await looxAccountModule.state.client.from('loox_creator_profiles').select('avatar_path').eq('user_id',uid).maybeSingle();
   if(error||!data?.avatar_path)return;
   const endpoint=new URL('https://looxtoolfree-backend.vercel.app/api/loox');
   endpoint.search=new URLSearchParams({action:'public_media',type:'avatar',id:uid,variant:'preview'}).toString();
   const response=await fetch(endpoint.href,{credentials:'omit',cache:'no-store'});
   const body=await response.json().catch(()=>({}));
   if(response.ok&&body.url&&looxAccountModule.state.user?.id===uid){avatarUrl=body.url;paintCreatorAvatar(avatarUrl);}
  })().catch(()=>{}).finally(()=>{avatarLoaded=true;avatarTask=null;});
 }
 document.addEventListener('loox-account',()=>{avatarLoaded=false;avatarUrl=null;});
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
  sideName.textContent=userName||'Profile';
  sideSubtitle.textContent=userName?'Creator & account':'Sign in or create account';
  syncCreatorAvatar();
 }
 const accountObserver=new MutationObserver(syncAccountHeader);
 accountObserver.observe(account,{childList:true});
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
 import(url('platform/account.js?v=9')).then(m=>{looxAccountModule=m;m.renderHeader();syncAccountHeader();}).catch(()=>{
  account.replaceChildren();
  const link=el('a','loox-sitewide-signin','Sign in');link.href=url('account.html');account.append(link);
 });
})();
