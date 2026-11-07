/* One consistent LOOX navigation on EVERY page.
 * All pages use the same header, sidebar and tool finder.
 * Existing editor controls are preserved in their native toolbar.
 */
(() => {
 'use strict';
 const page=location.pathname.split('/').pop()||'index.html';
 // The AI creator tabs use Generative sessions instead of a second tool-directory sidebar.
 // AI Audio currently links to the Audio-filtered tools listing, not an audio generator.
 const aiSessionsOnly=['ai-chat.html','ai-text-to-image.html','ai-video-generator.html'].includes(page)
   || (page==='index.html'&&new URLSearchParams(location.search).get('category')?.toLowerCase()==='audio');
 if(aiSessionsOnly)document.body.classList.add('loox-ai-sessions-only');
 if(document.getElementById('loox-sitewide-header'))return;
 const isHome=['index.html','ai-home.html','ai-chat.html'].includes(page);
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
 const logo=el('a','loox-sitewide-logo');logo.href=url('ai-home.html');logo.setAttribute('aria-label','LOOX AI Home');

 const creditDock=el('div','loox-sitewide-credit-dock');
 const creditBundle=el('div','loox-sitewide-credit-bundle');
 creditDock.append(creditBundle);
 const image=el('img');image.src=url('assets/loox-infinity-white.svg?v=1');image.alt='LOOX';image.width=139;image.height=42;
 logo.append(image);
 logoWrap.append(logo);
 const links=el('nav','loox-sitewide-links');links.setAttribute('aria-label','LOOX main navigation');
 [['AI Image','ai-text-to-image.html'],['AI Videos','ai-video-generator.html'],['Guides','guides.html'],['Pricing','pricing.html'],['Blog','blog.html']].forEach(([name,href])=>{
  const link=el('a','',name);link.href=url(href);if(href===page)link.setAttribute('aria-current','page');
  if(name==='Blog'){const outbound=el('span','loox-blog-arrow','↗');outbound.setAttribute('aria-hidden','true');link.append(outbound);}
  links.append(link);
 });
 const search=el('button','loox-sitewide-search');search.type='button';
 search.setAttribute('aria-label','Search all LOOX tools');search.title='Search tools';search.innerHTML=icons.search;
 const account=el('div','loox-sitewide-account');account.setAttribute('data-loox-account','');
 inner.append(logoWrap,links,search,creditDock,account);nav.append(inner);
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
 // In focused AI workspaces replace only the mode navigation, not the
 // existing generation forms, templates controllers or account controls.
 const workspaces={
  'ai-chat.html':'agent',
  'ai-text-to-image.html':'image',
  'ai-video-generator.html':'video'
 };
 if(native&&workspaces[page]&&!native.querySelector('.loox-ai-workspace-tabs')){
  const tabs=el('nav','loox-ai-workspace-tabs');
  tabs.setAttribute('aria-label','LOOX AI workspaces');
  const rows=[
   ['AI Agent','ai-chat.html','agent','✧'],
   ['AI Image','ai-image-landing.html','image','▧'],
   ['AI Video','ai-video-generator.html#generate','video','▷'],
   ['AI Audio','index.html?category=Audio#tools','audio','♫']
  ];
  rows.forEach(([label,href,kind,symbol])=>{
   const link=el('a','loox-ai-workspace-tab');
   link.href=url(href);link.setAttribute('data-ai-tab',kind);
   const ico=el('span','loox-ai-workspace-symbol',symbol);
   ico.setAttribute('aria-hidden','true');
   link.append(ico,document.createTextNode(label));
   if(workspaces[page]===kind){link.classList.add('is-active');link.setAttribute('aria-current','page');}
   tabs.append(link);
  });
  // AI Agent has no in-page template controller: link to Image templates.
   if(page==='ai-chat.html'){
    const templatesLink=el('a','loox-ai-workspace-tab loox-ai-template-tab','Community');
    templatesLink.href=url('ai-text-to-image.html#templates');
    tabs.append(templatesLink);
   }
   const templateTabs=native.querySelector('.lig-head-tabs');
  const accountHost=native.querySelector('[data-loox-account]');
  if(templateTabs)native.insertBefore(tabs,templateTabs);
  else if(accountHost)native.insertBefore(tabs,accountHost);
  else native.append(tabs);
  // Reuse the actual Templates button so the existing image/video
  // template handlers remain attached. Do not stack a second tab bar.
  if(templateTabs){
   const templatesButton=templateTabs.querySelector('[data-lig-view="templates"],[data-lvg-view="templates"]');
   if(templatesButton){
    templatesButton.classList.remove('lig-tab');
    templatesButton.classList.add('loox-ai-workspace-tab','loox-ai-template-tab');
    templatesButton.textContent='Community';
    templatesButton.setAttribute('aria-label','Browse community');
    tabs.append(templatesButton);
    const activeTool=tabs.querySelector('[data-ai-tab="'+workspaces[page]+'"]');
    const refreshTemplateState=()=>{
     const templatesOpen=location.hash==='#templates';
     // Apply the route before the async model/account bootstrap finishes.
     document.body.classList.toggle('loox-community-route',templatesOpen);
     const generate=document.getElementById('lig-generate-view')||document.getElementById('lvg-generate-view');
     const community=document.getElementById('lig-templates-view')||document.getElementById('lvg-templates-view');
     if(generate&&community){generate.hidden=templatesOpen;community.hidden=!templatesOpen;}
     templatesButton.classList.toggle('is-active',templatesOpen);
     templatesButton.setAttribute('aria-pressed',String(templatesOpen));
     if(activeTool){
      activeTool.classList.toggle('is-active',!templatesOpen);
      if(templatesOpen)activeTool.removeAttribute('aria-current');
      else activeTool.setAttribute('aria-current','page');
     }
    };
    templatesButton.addEventListener('click',()=>queueMicrotask(refreshTemplateState));
    window.addEventListener('hashchange',refreshTemplateState);
    refreshTemplateState();
   }
   // Video editor remains available as a small contextual action.
   const editAction=templateTabs.querySelector('a[href*="video-editor.html"]');
   if(editAction){
    editAction.classList.remove('lig-tab');
    editAction.classList.add('loox-generator-edit-link');
    const headStart=native.querySelector('.lig-head-start');
    if(headStart)headStart.append(editAction);
    else native.insertBefore(editAction,tabs);
   }
   templateTabs.remove();
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
 // Do not mount the unrelated sitewide tools drawer in the focused AI workspaces.
 if(!aiSessionsOnly)document.body.append(scrim,sidebar,dockToggle);
 const desktop=matchMedia('(min-width:901px)');
 const setDrawer=open=>{
  if(aiSessionsOnly)open=false;
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
 // AI workspace tabs start with the shared sidebar collapsed, including AI Agent.
  desktop.addEventListener('change',()=>setDrawer(!aiSessionsOnly&&desktop.matches&&isHome&&page!=='ai-chat.html'));
 setDrawer(!aiSessionsOnly&&desktop.matches&&isHome&&page!=='ai-chat.html');
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
 const sideAccount=el('a','loox-sidebar-account-row');sideAccount.href=url('account.html');
 sideAccount.setAttribute('aria-label','Manage your LOOX account');
 const avatarMark=el('span','loox-sidebar-avatar');
 avatarMark.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="9" r="3"/><path d="M5.5 19c.8-4 12.2-4 13 0"/></svg>';
 const sideIdentity=el('span','loox-sidebar-identity');
 const sideName=el('strong','loox-sidebar-account-name','My Account');
 const sideSubtitle=el('small','','Manage account');sideIdentity.append(sideName,sideSubtitle);
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
   sideOptions.append(el('p','','Site notifications are not available yet.'));
   const activity=el('a','','View account activity');activity.href=url('account.html#usage');sideOptions.append(activity);
  }
  sideOptions.hidden=false;
  bell.setAttribute('aria-expanded',String(kind==='notifications'));
  globe.setAttribute('aria-expanded',String(kind==='language'));
 }
 bell.addEventListener('click',()=>showSideOptions('notifications'));
 globe.addEventListener('click',()=>showSideOptions('language'));
 moon.addEventListener('click',()=>{closeSideOptions();toggleSiteTheme(moon)});
 document.addEventListener('pointerdown',event=>{
  if(!sideFooter.contains(event.target))closeSideOptions();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!sideOptions.hidden)closeSideOptions();
 });
 sideFooter.append(sideAccount,sideOptions,sideActions);
 sidebar.append(sideFooter);

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
  notificationsPanel.append(el('strong','','Notifications'),el('p','','Site notifications are not available yet.'));
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
  notifications.addEventListener('click',()=>{
   notificationsPanel.hidden=!notificationsPanel.hidden;options.hidden=true;
   notifications.setAttribute('aria-expanded',String(!notificationsPanel.hidden));languages.setAttribute('aria-expanded','false');
  });
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
    ['Profile','profile','account.html#profile'],
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
  sideName.textContent=userName||'My Account';
  sideSubtitle.textContent=userName?'Manage account':'Sign in or create account';
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
