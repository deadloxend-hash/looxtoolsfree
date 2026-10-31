/* Original LOOX navigation and language layer. Does not replace editing state. */
(() => {
 'use strict';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
 const save=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 const file=location.pathname.split('/').pop()||'index.html';
 let language=['en','es','fr','de'].includes(new URLSearchParams(location.search).get('lang'))?new URLSearchParams(location.search).get('lang'):read('loox-language','en');
 if(!['en','es','fr','de'].includes(language))language='en';
 const studio=document.body.classList.contains('studio-page');
 const main=document.querySelector('main')||document.querySelector('.app');
 let compact=matchMedia('(max-width:900px)').matches||read('loox-rail-collapsed','true')!=='false';
 document.body.classList.add('experience-shell');document.body.classList.toggle('rail-compact',compact);
 if(studio)document.body.classList.add('experience-studio');
 if(main)main.classList.add('experience-content');
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
 function preferences(){try{return JSON.parse(localStorage.getItem('loox-platform-prefs')||'{}')}catch{return{}}}
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
 const rail=document.createElement('aside');rail.className='loox-rail';rail.setAttribute('aria-label','LOOX tools');document.body.append(rail);
 const localizedURL=href=>{const u=new URL(href,location.href);if(language!=='en')u.searchParams.set('lang',language);return u.pathname+u.search+u.hash};
 function current(){return catalog.find(t=>t.url===(file+(file==='toolbox.html'?(location.hash||'#image-resizer'):'')))}
 function drawRail(){
  const w=words[language],active=current();
  const primary=['video-editor','photo-editor','bg-remove','faceswap','design-studio','watermark','fancy-fonts'].map(s=>catalog.find(t=>t.slug===s)).filter(Boolean),l=labels[language];
  rail.innerHTML='<div class="loox-rail-head"><span class="loox-rail-heading">'+w.tools+'</span><button class="loox-rail-toggle" aria-label="'+(compact?w.expand:w.collapse)+'" aria-expanded="'+!compact+'">☰</button></div><nav class="loox-rail-list" aria-label="'+w.tools+'"><a class="loox-rail-link" href="'+localizedURL('index.html')+'"><span class="loox-rail-icon" aria-hidden="true">⌂</span><span class="loox-rail-label">'+w.home+'</span></a>'+primary.map(t=>'<a class="loox-rail-link" href="'+esc(localizedURL(t.url))+'" title="'+esc(t.names[language])+'" '+(active?.slug===t.slug?'aria-current="page"':'')+'><span class="loox-rail-icon"><img src="assets/icons/'+t.slug+'.svg" alt="" width="27" height="27"></span><span class="loox-rail-label">'+esc(t.names[language])+'</span></a>').join('')+'<button class="loox-rail-link loox-more-trigger" aria-haspopup="dialog"><span class="loox-rail-icon" aria-hidden="true">•••</span><span class="loox-rail-label">'+l.more+'</span></button></nav><div class="loox-rail-bottom"><button class="loox-rail-link loox-settings-trigger" title="'+l.settings+'" aria-label="'+l.settings+'"><span class="loox-rail-icon" aria-hidden="true">⚙</span><span class="loox-rail-label">'+l.settings+'</span></button><a class="loox-rail-policy" href="'+localizedURL('guides.html')+'">'+w.help+'</a><a class="loox-rail-policy" href="'+localizedURL('privacy-policy.html')+'">'+w.privacy+'</a></div>';
  rail.querySelector('.loox-rail-toggle').onclick=()=>{compact=!compact;save('loox-rail-collapsed',String(compact));document.body.classList.toggle('rail-compact',compact);drawRail()};
  rail.querySelector('.loox-more-trigger').onclick=openMore;
  rail.querySelector('.loox-more-trigger').setAttribute('aria-label',l.more);
  rail.querySelector('.loox-more-trigger').title=l.more;
  rail.querySelector('.loox-rail-list>a').setAttribute('aria-label',w.home);
  rail.querySelector('.loox-settings-trigger').onclick=openSettings;
  mountHeader();
 }
 function changeLanguage(value){language=value;save('loox-language',language);const u=new URL(location.href);u.searchParams.set('lang',language);history.replaceState(null,'',u);drawRail();applyLanguage();brandCards();loadGuide()}
 function mountHeader(){
  const header=document.querySelector('.studio-top,.loox-appbar-inner,.suite-header,.topbar-inner,.nav-inner')||document.querySelector('header');
  if(!header)return;let controls=document.querySelector('.loox-top-controls');
  if(!controls){controls=document.createElement('div');controls.className='loox-top-controls';(header.querySelector('.studio-top-actions,.loox-app-actions,.suite-header-actions')||header).append(controls)}
  const l=labels[language];controls.innerHTML='<select class="loox-language" aria-label="Language / Idioma / Langue / Sprache">'+[['en','English'],['es','Español'],['fr','Français'],['de','Deutsch']].map(([value,name])=>'<option value="'+value+'" '+(value===language?'selected':'')+'>'+name+'</option>').join('')+'</select><button type="button" class="loox-header-settings" aria-label="'+l.settings+'" title="'+l.settings+'">⚙</button>';
  controls.querySelector('select').onchange=e=>changeLanguage(e.target.value);controls.querySelector('button').onclick=openSettings;
 }
 function groupFor(t){
  if(t.kind==='cloud'||t.slug==='prompt-builder')return 2;
  if(['image','design'].includes(t.kind))return 0;
  if(['video','audio','media'].includes(t.kind))return 1;
  if(t.kind==='text')return 3;
  return 4
 }
 function openMore(){
  if(!moreDialog){moreDialog=document.createElement('dialog');moreDialog.className='loox-more-dialog';document.body.append(moreDialog)}
  const l=labels[language];moreDialog.innerHTML='<div class="loox-dialog-head"><div><span class="loox-eyebrow">LOOX WORKSPACES</span><h2>'+words[language].home+'</h2></div><button class="loox-dialog-close" aria-label="'+l.close+'">✕</button></div><label class="loox-more-search"><span>'+l.search+'</span><input type="search" autocomplete="off" placeholder="'+l.search+'"></label><div class="loox-more-groups"></div>';
  const paint=()=>{const query=moreDialog.querySelector('input').value.toLowerCase();const host=moreDialog.querySelector('.loox-more-groups');host.innerHTML=l.categories.map((name,i)=>{const entries=catalog.filter(t=>groupFor(t)===i&&((t.names[language]+' '+t.names.en+' '+t.lead[language]).toLowerCase().includes(query)));return entries.length?'<section><h3>'+name+' <small>'+entries.length+'</small></h3>'+entries.map(t=>'<a href="'+esc(localizedURL(t.url))+'"><img src="assets/icons/'+t.slug+'.svg" alt="" width="34" height="34"><span><strong>'+esc(t.names[language])+'</strong><small>'+esc(t.lead[language])+'</small></span><b aria-hidden="true">↗</b></a>').join('')+'</section>':''}).join('');if(!host.childElementCount)host.textContent=['No matching tools.','No hay herramientas coincidentes.','Aucun outil correspondant.','Keine passenden Werkzeuge.'][['en','es','fr','de'].indexOf(language)]};
  moreDialog.querySelector('input').oninput=paint;moreDialog.querySelector('button').onclick=()=>moreDialog.close();paint();moreDialog.showModal();moreDialog.querySelector('input').focus();
 }
 function openSettings(){
  if(!settingsDialog){settingsDialog=document.createElement('dialog');settingsDialog.className='loox-settings-panel';document.body.append(settingsDialog)}
  const l=labels[language],p=preferences();
  settingsDialog.innerHTML='<form method="dialog"><div class="loox-dialog-head"><h2>'+l.settings+'</h2><button type="button" class="loox-dialog-close" aria-label="'+l.close+'">✕</button></div><label>'+l.theme+'<select name="theme">'+[['dark',l.dark],['light',l.light],['system',l.system]].map(([v,n])=>'<option value="'+v+'" '+((p.theme||'dark')===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label><label>'+l.accent+'<input name="accent" type="color" value="'+(/^#[0-9a-f]{6}$/i.test(p.accent||'')?p.accent:'#a791ff')+'"></label><label class="loox-pref-check"><input name="livePreview" type="checkbox" '+(p.livePreview!==false?'checked':'')+'>'+l.live+'</label><label>'+l.length+'<input name="passwordLength" type="number" min="12" max="128" step="1" value="'+Math.max(12,Math.min(128,Number(p.passwordLength)||24))+'"></label><label>'+l.format+'<select name="imageFormat">'+[['image/png','PNG'],['image/jpeg','JPEG'],['image/webp','WebP']].map(([v,n])=>'<option value="'+v+'" '+((p.imageFormat||'image/png')===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label><p>'+l.note+'</p><button class="loox-save-prefs" type="submit">'+l.save+'</button></form>';
  settingsDialog.querySelector('.loox-dialog-close').onclick=()=>settingsDialog.close();
  settingsDialog.querySelector('form').onsubmit=e=>{e.preventDefault();const f=e.target,values={theme:f.elements.theme.value,accent:f.elements.accent.value,livePreview:f.elements.livePreview.checked,passwordLength:Math.max(12,Math.min(128,Number(f.elements.passwordLength.value)||24)),imageFormat:f.elements.imageFormat.value};save('loox-platform-prefs',JSON.stringify(values));save('loox-theme-v1',values.theme==='light'?'white':values.theme==='dark'?'dark':matchMedia('(prefers-color-scheme:light)').matches?'white':'dark');applyPreferences();window.dispatchEvent(new CustomEvent('looxpreferenceschange',{detail:values}));settingsDialog.close()};
  settingsDialog.showModal();
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
 function translateNode(node){
  if(node.nodeType!==Node.TEXT_NODE||!node.textContent.trim()||node.parentElement?.closest('script,style,textarea,pre,code,[contenteditable],.loox-story,.loox-rail,.loox-top-controls,.loox-more-dialog,.loox-settings-panel,#status,.status,.suite-status,.font-grid,.suite-stats,.suite-diff,.studio-list,#layerList,#mediaBin,#tracks,#properties strong,#inspector strong'))return;
  if(!originalText.has(node))originalText.set(node,node.textContent);
  const original=originalText.get(node),key=original.trim(),value=dictionary[key]?.[language];
  if(value)node.textContent=original.replace(key,value);else if(language==='en')node.textContent=original;
 }
 function applyLanguage(){
  translationObserver?.disconnect();document.documentElement.lang=language;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode())translateNode(walker.currentNode);
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
  if(badge)badge.innerHTML='<img src="assets/icons/'+active.slug+'.svg" alt="" width="46" height="46"><span>'+words[language][active.kind==='cloud'?'cloud':active.kind==='remote'?'remote':'local']+'</span>';
  try{const response=await fetch('assets/guides/'+language+'/'+active.slug+'.html?v=31');if(!response.ok)throw Error('Guide unavailable');const html=await response.text();if(request===guideRequest)host.innerHTML=html}catch{/* The server-rendered English guide remains readable if a request fails. */}
 }
 function brandCards(root=document){
  root.querySelectorAll?.('a[data-tool],.loox-featured-card').forEach(a=>{
   const href=a.getAttribute('href'),t=catalog.find(t=>t.url===href);if(!t)return;
   const heading=a.querySelector('.tool-copy h3,.personal-copy strong');if(heading)heading.textContent=t.names[language];
   const description=a.querySelector('.tool-copy p');if(description)description.textContent=t.lead[language];
   const icon=a.querySelector('.tool-icon,.personal-icon');if(icon&&!icon.querySelector('img'))icon.innerHTML='<img class="loox-original-icon" src="assets/icons/'+t.slug+'.svg" alt="" width="32" height="32">';
   if(a.classList.contains('tool-main')&&!a.querySelector('.loox-card-cover')){const img=document.createElement('img');img.className='loox-card-cover';img.src='assets/tool-art/'+t.slug+'.webp';img.alt=t.names[language]+' — original guide illustration';img.loading='lazy';img.width=640;img.height=400;a.prepend(img)}
   if(a.classList.contains('loox-featured-card')){const art=a.querySelector('.loox-featured-art');if(art&&!art.querySelector('img')){art.textContent='';const img=document.createElement('img');img.src='assets/tool-art/'+t.slug+'.webp';img.alt=t.names[language];img.style.cssText='width:100%;height:100%;object-fit:cover';art.append(img)}}
  });
 }
 Promise.all([fetch('assets/tool-catalog.json?v=31').then(r=>r.json()),fetch('assets/locales/interface.json?v=31').then(r=>r.json())]).then(([c,d])=>{
  catalog=c;dictionary=d;drawRail();chooseToolbox();applyLanguage();loadGuide();brandCards();applyPreferences();
  const grid=document.querySelector('#toolGrid');if(grid)new MutationObserver(()=>brandCards(grid)).observe(grid,{childList:true});
  document.querySelectorAll('#favGrid,#recentGrid').forEach(personal=>new MutationObserver(()=>brandCards(personal)).observe(personal,{childList:true}));
 }).catch(()=>{rail.innerHTML='<a class="loox-rail-link" href="index.html">LOOX ↗</a>'});
 window.addEventListener('hashchange',()=>{drawRail();chooseToolbox();loadGuide()});
 matchMedia('(prefers-color-scheme:light)').addEventListener('change',()=>{if(preferences().theme==='system')applyPreferences()});
})();
