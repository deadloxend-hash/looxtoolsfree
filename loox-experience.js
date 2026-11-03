/* Original LOOX navigation and language layer. Does not replace editing state. */
(() => {
 'use strict';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
 const save=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 const supportedLanguages=[["en","English"],["es","Español"],["pt-BR","Português"],["fr","Français"],["de","Deutsch"],["it","Italiano"],["pl","Polski"],["ja","日本語"],["zh-CN","简体中文"],["ko","한국어"],["tr","Türkçe"],["id","Bahasa Indonesia"],["vi","Tiếng Việt"],["hu","Magyar"],["fi","Suomi"],["cs","Čeština"],["nb","Norsk Bokmål"],["da","Dansk"],["ar","العربية"],["sk","Slovenčina"],["sl","Slovenščina"],["sv","Svenska"],["uk","Українська"],["lv","Latviešu"],["et","Eesti"],["bg","Български"]];
 const supportedCodes=new Set(supportedLanguages.map(([code])=>code));
 const file=location.pathname.split('/').pop()||'index.html';
 let language=supportedCodes.has(new URLSearchParams(location.search).get('lang'))?new URLSearchParams(location.search).get('lang'):read('loox-language','en');
 if(!supportedCodes.has(language))language='en';
 const homePage=file==='index.html';
 const aiSharedDialog=document.body.classList.contains('ai-home')||document.body.classList.contains('ai-chat')||document.body.classList.contains('lig-shared-ai-nav');
 const railPage=homePage||aiSharedDialog;
 let sidebarVisible=homePage&&!matchMedia('(max-width:900px)').matches&&read('loox-home-sidebar-visible','true')!=='false';
 if(!aiSharedDialog)document.body.classList.add(homePage?'loox-home-rail':'loox-no-rail');
 document.body.classList.toggle('rail-hidden',!sidebarVisible);
 const studio=document.body.classList.contains('studio-page');
 const main=document.querySelector('main')||document.querySelector('.app');
 let compact=homePage?false:(matchMedia('(max-width:900px)').matches||read('loox-rail-collapsed','true')!=='false');
 if(!aiSharedDialog){document.body.classList.add('experience-shell');document.body.classList.toggle('rail-compact',compact);}
 if(studio)document.body.classList.add('experience-studio');
 if(main&&!aiSharedDialog)main.classList.add('experience-content');
 const words={
  en:{tools:'TOOLS',learn:'LEARN & SUPPORT',collapse:'Hide tool names',expand:'Show tool names',privacy:'Privacy policy',help:'Help & guides',home:'All tools',local:'PROCESSED IN YOUR BROWSER',cloud:'CONNECTED CLOUD PROCESSING',remote:'PUBLIC IMAGE REQUESTS'},
  es:{tools:'HERRAMIENTAS',learn:'APRENDER Y AYUDA',collapse:'Ocultar nombres',expand:'Mostrar nombres',privacy:'Privacidad',help:'Ayuda y guías',home:'Todas las herramientas',local:'PROCESADO EN TU NAVEGADOR',cloud:'PROCESAMIENTO EN LA NUBE',remote:'SOLICITUDES DE IMÁGENES PÚBLICAS'},
  fr:{tools:'OUTILS',learn:'GUIDES ET AIDE',collapse:'Masquer les noms',expand:'Afficher les noms',privacy:'Confidentialité',help:'Aide et guides',home:'Tous les outils',local:'TRAITEMENT DANS LE NAVIGATEUR',cloud:'TRAITEMENT DANS LE CLOUD',remote:'DEMANDES D’IMAGES PUBLIQUES'},
  de:{tools:'WERKZEUGE',learn:'WISSEN UND HILFE',collapse:'Namen ausblenden',expand:'Namen anzeigen',privacy:'Datenschutz',help:'Hilfe und Anleitungen',home:'Alle Werkzeuge',local:'VERARBEITUNG IM BROWSER',cloud:'VERBUNDENER CLOUD-DIENST',remote:'ABRUF ÖFFENTLICHER BILDER'}
 };
 let catalog=[],dictionary={},guideRequest=0,moreDialog=null,settingsDialog=null;
 const labels={
 en:{more:'More',settings:'Settings',search:'Search every tool',categories:['Image','Media','AI Tools','Text Utilities','Others'],theme:'Appearance',system:'Follow device',dark:'Dark',light:'Light',accent:'Accent color',live:'Update text results while typing',length:'Default password length',format:'Default image export',save:'Save preferences',close:'Close',note:'Preferences stay on this device. Drafts, passwords and uploaded files are never saved by this panel.'},
 es:{more:'Más',settings:'Ajustes',search:'Buscar herramientas',categories:['Imagen','Multimedia','Herramientas IA','Utilidades de texto','Otras'],theme:'Apariencia',system:'Seguir dispositivo',dark:'Oscuro',light:'Claro',accent:'Color de acento',live:'Actualizar resultados al escribir',length:'Longitud de contraseña predeterminada',format:'Formato de imagen predeterminado',save:'Guardar preferencias',close:'Cerrar',note:'Las preferencias se guardan en este dispositivo. Este panel no guarda borradores, contraseñas ni archivos.'},
 fr:{more:'Plus',settings:'Paramètres',search:'Rechercher un outil',categories:['Image','Média','Outils IA','Utilitaires texte','Autres'],theme:'Apparence',system:'Suivre l’appareil',dark:'Sombre',light:'Clair',accent:'Couleur d’accent',live:'Actualiser le texte pendant la saisie',length:'Longueur de mot de passe par défaut',format:'Format d’image par défaut',save:'Enregistrer',close:'Fermer',note:'Les préférences restent sur cet appareil. Ce panneau ne conserve ni brouillons, ni mots de passe, ni fichiers.'},
 de:{more:'Mehr',settings:'Einstellungen',search:'Alle Werkzeuge durchsuchen',categories:['Bild','Medien','KI-Werkzeuge','Textwerkzeuge','Weitere'],theme:'Darstellung',system:'Geräteeinstellung',dark:'Dunkel',light:'Hell',accent:'Akzentfarbe',live:'Textergebnisse beim Tippen aktualisieren',length:'Standard-Passwortlänge',format:'Standard-Bildformat',save:'Einstellungen speichern',close:'Schließen',note:'Einstellungen bleiben auf diesem Gerät. Dieser Bereich speichert keine Entwürfe, Passwörter oder Dateien.'}
 };
 function preferences(){try{const p=JSON.parse(localStorage.getItem('loox-platform-prefs')||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{}}catch{return{}}}
 function applyPreferences(){
  const p=preferences();
  const theme=p.theme||(read('loox-theme-v1','dark')==='white'?'light':'dark');
  const light=theme==='light'||theme==='system'&&matchMedia('(prefers-color-scheme:light)').matches;
  document.documentElement.dataset.lxTheme=light?'light':'dark';
  const accent=/^#[0-9a-f]{6}$/i.test(p.accent||'')?p.accent:'#a791ff';
  document.documentElement.style.setProperty('--lx-accent',accent);
  const channels=accent.slice(1).match(/../g).map(s=>parseInt(s,16));document.documentElement.style.setProperty('--lx-on-accent',channels[0]*.299+channels[1]*.587+channels[2]*.114>160?'#141727':'#ffffff');
  if(p.theme&&window.LOOXApplyTheme)window.LOOXApplyTheme(light?'white':'dark');
  if(p.imageFormat){const select=document.querySelector('#exportFormat,#format,#watermark-format');if(select&&[...select.options].some(o=>o.value===p.imageFormat))select.value=p.imageFormat}
 }
 const rail=document.createElement('aside');rail.className='loox-rail';rail.setAttribute('aria-label','LOOX tools');rail.id='loox-home-rail';if(railPage)document.body.append(rail);
 let sidebarButton=null;
 function toggleHomeRail(force){if(!railPage)return;sidebarVisible=typeof force==='boolean'?force:!sidebarVisible;if(homePage)save('loox-home-sidebar-visible',String(sidebarVisible));document.body.classList.toggle('rail-hidden',!sidebarVisible);if(sidebarButton){sidebarButton.setAttribute('aria-expanded',String(sidebarVisible));sidebarButton.setAttribute('aria-label',sidebarVisible?'Hide tool sidebar':'Show tool sidebar');sidebarButton.title=sidebarVisible?'Hide sidebar':'Show sidebar'}if(aiSharedDialog){const button=document.getElementById('aiNavToggle');button?.setAttribute('aria-expanded',String(sidebarVisible));aiRailBackdrop.hidden=!sidebarVisible;document.body.classList.toggle('ai-rail-open',sidebarVisible)}}
 window.LOOXToggleToolRail=toggleHomeRail;
 if(aiSharedDialog){
  const aiToggle=document.getElementById('aiNavToggle');
  aiToggle?.addEventListener('click',event=>{
   event.preventDefault();event.stopImmediatePropagation();
   toggleHomeRail();
   // The AI hamburger controls the category rail, never the All tools dialog.
   if(moreDialog?.open)moreDialog.close();
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebarVisible)toggleHomeRail(false)});
 }

 const aiRailBackdrop=aiSharedDialog?document.createElement('div'):null;
 if(aiRailBackdrop){aiRailBackdrop.className='ai-shared-rail-backdrop';aiRailBackdrop.hidden=true;aiRailBackdrop.addEventListener('click',()=>toggleHomeRail(false));document.body.append(aiRailBackdrop)}

 if(homePage){sidebarButton=document.createElement('button');sidebarButton.type='button';sidebarButton.className='loox-home-rail-button';sidebarButton.textContent='☰';sidebarButton.setAttribute('aria-controls','loox-home-rail');sidebarButton.setAttribute('aria-expanded',String(sidebarVisible));sidebarButton.setAttribute('aria-label',sidebarVisible?'Hide tool sidebar':'Show tool sidebar');sidebarButton.title=sidebarVisible?'Hide sidebar':'Show sidebar';sidebarButton.addEventListener('click',toggleHomeRail);rail.id='loox-home-rail';(document.querySelector('.topbar-inner')||document.body).prepend(sidebarButton)} 
 const localizedURL=href=>{const u=new URL(href,location.href);if(language!=='en')u.searchParams.set('lang',language);return u.pathname+u.search+u.hash};
 function current(){return catalog.find(t=>t.url===(file+(file==='toolbox.html'?(location.hash||'#image-resizer'):'')))}
 function drawRail(){
  if(!railPage){mountHeader();return}
  const w=(words[language]||words.en),l=(labels[language]||labels.en),active=current();
  const activeURL=(url)=>{
   const target=new URL(url,location.href);
   const here=new URL(location.href);
   if(target.pathname!==here.pathname)return false;
   const category=target.searchParams.get('category');
   if(category)return category===here.searchParams.get('category');
   if(target.pathname.endsWith('/index.html')&&here.searchParams.has('category'))return false;
   return true;
  };
  const item=(url,name,icon)=>'<a class="loox-rail-link" href="'+esc(url)+'" '+(activeURL(url)?'aria-current="page"':'')+'><span class="loox-rail-icon">'+icon+'</span><span class="loox-rail-label">'+esc(name)+'</span></a>';
  rail.innerHTML='<div class="loox-rail-head"><span class="loox-rail-heading">LOOX TOOLS</span><button class="loox-rail-toggle" aria-label="Toggle sidebar">☰</button></div><nav class="loox-rail-list" aria-label="Tools"><h2 class="loox-rail-group-title">Navigation</h2>'+[
   ['index.html','LOOX Tools Home','⌂'],['ai-home.html','LOOX AI Home','✦']].map(t=>item(...t)).join('')+
   (aiSharedDialog?'<h2 class="loox-rail-group-title">AI-powered tools</h2>'+[
   ['all-ai-tools.html','All AI Tools','✦'],['bg-remove.html','Background Remover','✂'],['ai-image-upscaler.html','Image Upscaler','↗'],['ai-image-enhancer.html','Image Enhancer','✧'],['ai-object-eraser.html','Object Eraser','◌'],['ai-text-to-image.html','Image Generator','✦'],['ai-video-generator.html','Video Generator','▶'],['ai-photo-restorer.html','Photo Restoration','◷']].map(t=>item(...t)).join(''):'')+
   (aiSharedDialog?'':'<h2 class="loox-rail-group-title">Free tools</h2>'+[
   ['all-image-tools.html','Image Tools','▧'],['all-video-tools.html','Video Tools','▶'],['index.html?category=Audio#tools','Audio Tools','♫'],['all-text-tools.html','Text Tools','Aa'],['index.html?category=PDF#tools','PDF Tools','▤'],['index.html?category=Developer#tools','Developer Tools','⌘'],['pricing.html','Pricing & Credits','◇'],['account.html','My Account','◎']].map(t=>item(...t)).join('')+
   '<button class="loox-rail-link loox-more-trigger"><span class="loox-rail-label">More tools</span></button>')+'</nav>';
  rail.querySelector('.loox-rail-toggle').onclick=toggleHomeRail;
  const moreTrigger=rail.querySelector('.loox-more-trigger');
  if(moreTrigger){moreTrigger.onclick=openMore;moreTrigger.setAttribute('aria-label',l.more);moreTrigger.title=l.more;}
  rail.querySelector('a[href="index.html"]').setAttribute('aria-label','Open LOOX Tools Home');
  if(!aiSharedDialog)mountHeader();
 }
 // On mobile, tapping the page outside the open tools drawer closes it.
 document.addEventListener('pointerdown',event=>{
  if(!railPage||(!aiSharedDialog&&!matchMedia('(max-width:900px)').matches) || !sidebarVisible || !rail.contains || rail.contains(event.target) || event.target.closest?.('.loox-home-rail-button,#aiNavToggle'))return;
  toggleHomeRail();
 });
 function changeLanguage(value){language=value;save('loox-language',language);const u=new URL(location.href);u.searchParams.set('lang',language);history.replaceState(null,'',u);drawRail();applyLanguage();brandCards();loadGuide()}
 function mountHeader(){
  let header=document.querySelector('.studio-top,.loox-appbar-inner,.suite-header,.work-header,.topbar-inner,.nav-inner,.info-header-inner')||document.querySelector('header');
  if(!header && !document.body.classList.contains('info-page') && file!=='index.html'){
   header=document.createElement('header');header.className='loox-unified-header';
   header.innerHTML='<a class="loox-unified-brand" href="ai-home.html"><span class="loox-unified-mark">L</span><span>LOOX <b>Tools</b></span></a>';
   document.body.prepend(header);document.body.classList.add('loox-has-unified-header');
  }
  if(!header)return;
  // Give every tool the same homepage brand, hamburger and settings arrangement.
  // Only replace simple tool headers; preserve editor toolbars and their handlers.
  if(file!=='index.html' && !document.body.classList.contains('info-page') &&
     header.matches('.work-header,.suite-header,.loox-unified-header,.topbar,.topbar-inner,.nav-inner') &&
     !header.querySelector('input,select,textarea,canvas,.editor-toolbar')){
    header.classList.add('loox-standard-tool-header');
    header.innerHTML='<a class="loox-standard-brand" href="ai-home.html" aria-label="LOOX Tools home"><span class="loox-standard-mark">L</span><span class="loox-standard-name">LOOX<span>Tools</span><small>FREE ONLINE WORKSPACE</small></span></a>';
  }
  if(!document.body.classList.contains('info-page') && file!=='index.html'){
   header.classList.add('loox-tool-nav-header');
   if(file==='index.html' && !header.querySelector('.loox-tool-menu')){
    const button=document.createElement('button');button.type='button';button.className='loox-tool-menu';button.textContent='☰';button.setAttribute('aria-label','Toggle tools menu');button.onclick=event=>{event.stopPropagation();compact=!compact;save('loox-rail-collapsed',String(compact));document.body.classList.toggle('rail-compact',compact);drawRail();};header.prepend(button);
   }
  }
  let controls=document.querySelector('.loox-top-controls');
  if(!controls){controls=document.createElement('div');controls.className='loox-top-controls';(header.querySelector('.studio-top-actions,.loox-app-actions,.suite-header-actions,.work-head-actions')||header).append(controls)}
  if(false && document.body.classList.contains('info-page') && !header.querySelector('.loox-info-menu')){
   const menu=document.createElement('button');menu.type='button';menu.className='loox-info-menu';menu.textContent='☰';menu.setAttribute('aria-label','Open tool categories');menu.setAttribute('aria-expanded',String(!compact));
   menu.addEventListener('click',()=>{const toggle=rail.querySelector('.loox-rail-toggle');if(toggle)toggle.click();menu.setAttribute('aria-expanded',String(!compact));});
   header.prepend(menu);
  }
  const l=(labels[language]||labels.en);
  if(homePage){
   controls.classList.add('loox-overflow-controls');
   const retainedTheme=document.querySelector('#themeControl');if(retainedTheme)retainedTheme.remove();
   controls.innerHTML='<button type="button" class="loox-overflow-trigger" aria-label="Open navigation and settings menu" aria-expanded="false" aria-controls="loox-overflow-menu"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M17.5 13.8v7.4M13.8 17.5h7.4"/></svg></button><div class="loox-overflow-menu" id="loox-overflow-menu" hidden><nav class="loox-overflow-links" aria-label="More homepage links"><a class="loox-mobile-link" href="#tools">Explore the toolkit</a><a class="loox-mobile-link" href="#quickstart">Quick start</a><a href="#tools">Explore tools</a><a href="#favorites">Favorites</a><a href="#privacy">Privacy</a><a href="pricing.html">Pricing &amp; Credits</a><a href="account.html">My Account</a></nav><div class="loox-overflow-theme"></div><button type="button" class="loox-overflow-settings">⚙ '+l.settings+'</button></div>';
   const menu=controls.querySelector('.loox-overflow-menu'),button=controls.querySelector('.loox-overflow-trigger');
   if(retainedTheme)controls.querySelector('.loox-overflow-theme').append(retainedTheme);
   const close=()=>{menu.hidden=true;button.setAttribute('aria-expanded','false')};
   button.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden))};
   controls.querySelector('.loox-overflow-settings').onclick=()=>{close();openSettings()};controls.querySelectorAll('.loox-overflow-links a').forEach(a=>a.addEventListener('click',close));
   if(!controls.dataset.menuBound){controls.dataset.menuBound='true';document.addEventListener('click',e=>{if(!controls.contains(e.target))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})}
   }else{controls.replaceChildren();controls.hidden=true;}
 }
 function groupFor(t){
  if(t.kind==='cloud'||t.slug==='prompt-builder')return 2;
  if(['image','design'].includes(t.kind))return 0;
  if(['video','audio','media'].includes(t.kind))return 1;
  if(t.kind==='text')return 3;
  return 4
 }
 if(!aiSharedDialog)window.LOOXOpenAllTools=openMore;
 function openMore(){
  if(!moreDialog){moreDialog=document.createElement('dialog');moreDialog.className='loox-more-dialog';document.body.append(moreDialog)}
  const l=(labels[language]||labels.en),li=Math.max(0,['en','es','fr','de'].indexOf(language)),categoryNames=[['Image Resizing & Canvas Scaling','Tamaño y lienzo','Dimensions et canevas','Bildgröße und Leinwand'],['Compression & File Optimization','Compresión y optimización','Compression et optimisation','Komprimierung und Optimierung'],['Image Cropping & Framing','Recorte y encuadre','Recadrage et formes','Zuschnitt und Formen'],['Image Format Converters','Conversores de imagen','Conversion d’images','Bildformatkonverter'],['Photo Editing & Filters','Edición y filtros','Retouche et filtres','Bildbearbeitung und Filter'],['Watermarking & Branding','Marcas de agua y diseño','Filigranes et identité','Wasserzeichen und Gestaltung'],['AI-Powered Media Suite','Herramientas de IA','Outils IA','KI-Medienwerkzeuge'],['Video & Animation Utilities','Vídeo y animación','Vidéo et animation','Video und Animation']],ids=['resize','compress','crop','convert','edit','brand','ai','video'],routes=['image-resizing-tools','image-compression-tools','image-cropping-tools','image-converter-tools','photo-editing-tools','watermark-branding-tools','ai-media-tools','video-animation-tools'];
  const tabs=[['media',['Image & Media','Imagen y medios','Image et média','Bild und Medien'][li]],['text',l.categories[3]],['other',l.categories[4]],['all',(words[language]||words.en).home]];let selected='media';
  moreDialog.innerHTML='<div class="loox-dialog-head"><div><span class="loox-eyebrow">LOOX WORKSPACES</span><h2>'+(words[language]||words.en).home+'</h2></div><button type="button" class="loox-dialog-close" aria-label="'+l.close+'">✕</button></div><nav class="loox-more-tabs" aria-label="Tool groups">'+tabs.map(([v,n])=>'<button type="button" data-group="'+v+'" aria-pressed="'+(v===selected)+'">'+n+'</button>').join('')+'</nav><nav class="loox-directory-shortcuts"><a href="'+localizedURL('all-image-tools.html')+'">'+['All Image Tools','Todas las herramientas de imagen','Tous les outils image','Alle Bildwerkzeuge'][li]+' ↗</a><a href="'+localizedURL('all-text-tools.html')+'">'+['All Text Tools','Todas las herramientas de texto','Tous les outils texte','Alle Textwerkzeuge'][li]+' ↗</a></nav><label class="loox-more-search"><span>'+l.search+'</span><input type="search" autocomplete="off" placeholder="'+l.search+'"></label><div class="loox-more-groups"></div>';
  const paint=()=>{const query=moreDialog.querySelector('input').value.toLowerCase(),host=moreDialog.querySelector('.loox-more-groups'),groups=ids.map((id,i)=>({id,name:categoryNames[i][li],route:routes[i]+'.html'}));groups.push({id:'text',name:l.categories[3],route:'all-text-tools.html'},{id:'other',name:l.categories[4],route:'index.html'});host.innerHTML=groups.map(g=>{if(!query&&selected!=='all'&&((selected==='media'&&['text','other'].includes(g.id))||(selected==='text'&&g.id!=='text')||(selected==='other'&&g.id!=='other')))return '';const entries=catalog.filter(t=>(g.id==='text'?t.collection==='text':g.id==='other'?!t.category&&t.collection!=='text':t.category===g.id)&&(((t.names[language]||t.names.en)+' '+t.names.en+' '+(t.lead[language]||t.lead.en)).toLowerCase().includes(query)));return entries.length?'<section><h3><a href="'+esc(localizedURL(g.route))+'">'+g.name+' ↗</a> <small>'+entries.length+'</small></h3>'+entries.map(t=>'<a href="'+esc(localizedURL(t.url))+'"><img src="assets/icons/'+t.slug+'.svg" alt="" width="34" height="34"><span><strong>'+esc((t.names[language]||t.names.en))+'</strong><small>'+esc((t.lead[language]||t.lead.en))+'</small></span><b aria-hidden="true">↗</b></a>').join('')+'</section>':''}).join('');if(!host.childElementCount)host.textContent=['No matching tools.','No hay herramientas coincidentes.','Aucun outil correspondant.','Keine passenden Werkzeuge.'][li]};
  moreDialog.querySelector('input').oninput=paint;moreDialog.querySelector('.loox-dialog-close').onclick=()=>moreDialog.close();moreDialog.querySelectorAll('[data-group]').forEach(button=>button.onclick=()=>{selected=button.dataset.group;moreDialog.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));paint()});paint();moreDialog.showModal();moreDialog.querySelector('input').focus();
 }
 function openSettings(){
  const here=(location.pathname.split('/').pop()||'index.html')+location.search+location.hash;
  location.assign('settings.html?from='+encodeURIComponent(here));
 }
 function chooseToolbox(){
  if(file!=='toolbox.html')return;
  const id=catalog.some(t=>t.url==='toolbox.html'+location.hash)?location.hash.slice(1):'image-resizer';
  document.querySelectorAll('main>.panel[id]').forEach(p=>p.hidden=p.id!==id);
  const tool=current()||catalog.find(t=>t.slug==='image-resizer');
  if(tool){const h=document.querySelector('main>.hero h1');if(h)h.textContent=tool.names[language];document.title=tool.names[language]+' — LOOX Tools'}
 }
 const originalText=new WeakMap();
 let translationObserver;
 let lastAppliedLanguage='en';
 function translateNode(node){
  if(node.nodeType!==Node.TEXT_NODE||!node.textContent.trim()||node.parentElement?.closest('script,style,textarea,pre,code,[contenteditable],.loox-story,.loox-rail,.loox-top-controls,.loox-more-dialog,.loox-settings-panel,#status,.status,.suite-status,.font-grid,.suite-stats,.suite-diff,.studio-list,#layerList,#mediaBin,#tracks,#properties strong,#inspector strong'))return;
  if(!originalText.has(node))originalText.set(node,node.textContent);
  const original=originalText.get(node),key=original.trim(),value=dictionary[key]?.[language];
  if(value)node.textContent=original.replace(key,value);else if(language==='en')node.textContent=original;
 }
 function applyLanguage(){
  translationObserver?.disconnect();document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';
  // English is the source language. Skip a full-page text walk and observer until a translation is requested.
  if(language==='en'&&lastAppliedLanguage==='en')return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode())translateNode(walker.currentNode);
  lastAppliedLanguage=language;
  if(language==='en')return;
  translationObserver=new MutationObserver(records=>{translationObserver.disconnect();for(const r of records)for(const n of r.addedNodes){if(n.nodeType===3)translateNode(n);else if(n.nodeType===1&&!n.closest('.loox-story,.loox-rail')){const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);while(w.nextNode())translateNode(w.currentNode)}}translationObserver.observe(document.body,{childList:true,subtree:true})});
  translationObserver.observe(document.body,{childList:true,subtree:true});
 }
 async function loadGuide(){
  const active=current();if(!active)return;
  const request=++guideRequest;
  chooseToolbox();
  let host=document.querySelector('.loox-guide-host');
  if(!host){host=document.createElement('section');host.className='loox-guide-host';document.body.append(host)}
  let badge=document.querySelector('.loox-tool-banner');
  if(!badge){badge=document.createElement('div');badge.className='loox-tool-banner';const hero=document.querySelector('.hero,.studio-heading');hero?.append(badge)}
  if(badge)badge.innerHTML='<img src="assets/icons/'+active.slug+'.svg" alt="" width="46" height="46"><span>'+(words[language]||words.en)[active.kind==='cloud'?'cloud':active.kind==='remote'?'remote':'local']+'</span>';
  try{const guideLang=['en','es','fr','de'].includes(language)?language:'en';if(host.dataset.guideInline==='1'){host.__looxOriginalGuide??=host.innerHTML;if(guideLang==='en'){host.innerHTML=host.__looxOriginalGuide;return}}const response=await fetch('assets/guides/'+guideLang+'/'+active.slug+'.html?v=40');if(!response.ok)throw Error('Guide unavailable');const html=await response.text();if(request===guideRequest)host.innerHTML=html}catch{/* The server-rendered English guide remains readable if a request fails. */}
 }
 function brandCards(root=document){
  root.querySelectorAll?.('a[data-tool],.loox-featured-card').forEach(a=>{
   const href=a.getAttribute('href'),t=catalog.find(t=>t.url===href);if(!t)return;
   const heading=a.querySelector('.tool-copy h3,.personal-copy strong');const name=(t.names[language]||t.names.en);if(heading&&heading.textContent!==name)heading.textContent=name;
   const description=a.querySelector('.tool-copy p');const lead=(t.lead[language]||t.lead.en);if(description&&description.textContent!==lead)description.textContent=lead;
   const icon=a.querySelector('.tool-icon,.personal-icon');if(icon&&!icon.querySelector('img'))icon.innerHTML='<img class="loox-original-icon" src="assets/icons/'+t.slug+'.svg" alt="" width="32" height="32">';
   if(a.classList.contains('tool-main')&&!a.querySelector('.loox-card-cover,.loox-ai-card-art')){const img=document.createElement('img');img.className='loox-card-cover';img.src='assets/tool-art/'+t.slug+(t.slug==='chart-maker'?'.svg':'.webp');img.alt=(t.names[language]||t.names.en)+' — original guide illustration';img.loading='lazy';img.decoding='async';img.fetchPriority='low';img.width=640;img.height=400;a.prepend(img)}
   if(a.classList.contains('loox-featured-card')){const art=a.querySelector('.loox-featured-art');if(art&&!art.querySelector('img')){art.textContent='';const img=document.createElement('img');img.src='assets/tool-art/'+t.slug+(t.slug==='chart-maker'?'.svg':'.webp');img.alt=(t.names[language]||t.names.en);img.loading='lazy';img.decoding='async';img.style.cssText='width:100%;height:100%;object-fit:cover';art.append(img)}}
  });
 }
 // Render essential navigation immediately: a failed catalog fetch must not hide it.
 if(railPage)drawRail();else mountHeader();
 if(!aiSharedDialog)Promise.all([fetch('assets/tool-catalog.json?v=40').then(r=>r.json()),fetch('assets/locales/interface.json?v=40').then(r=>r.json())]).then(([c,d])=>{
  catalog=c;dictionary=d;drawRail();chooseToolbox();applyLanguage();loadGuide();brandCards();applyPreferences();
  const grid=document.querySelector('#toolGrid');if(grid)new MutationObserver(()=>brandCards(grid)).observe(grid,{childList:true});
  document.querySelectorAll('#favGrid,#recentGrid').forEach(personal=>new MutationObserver(()=>brandCards(personal)).observe(personal,{childList:true}));
 }).catch(error=>{console.error('LOOX optional catalog or translation setup failed:',error);if(!aiSharedDialog)applyPreferences(); /* Keep the already-rendered sidebar and Settings button visible. */});
 if(!aiSharedDialog)window.addEventListener('hashchange',()=>{drawRail();chooseToolbox();loadGuide()});
 matchMedia('(prefers-color-scheme:light)').addEventListener('change',()=>{if(preferences().theme==='system')applyPreferences()});
})();
