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
 let catalog=[],dictionary={},guideRequest=0;
 const rail=document.createElement('aside');rail.className='loox-rail';rail.setAttribute('aria-label','LOOX tools');document.body.append(rail);
 const localizedURL=href=>{const u=new URL(href,location.href);if(language!=='en')u.searchParams.set('lang',language);return u.pathname+u.search+u.hash};
 function current(){return catalog.find(t=>t.url===(file+(file==='toolbox.html'?(location.hash||'#image-resizer'):'')))}
 function drawRail(){
  const w=words[language],active=current();
  rail.innerHTML='<div class="loox-rail-head"><span class="loox-rail-heading">'+w.tools+'</span><button class="loox-rail-toggle" aria-label="'+(compact?w.expand:w.collapse)+'" aria-expanded="'+!compact+'">☰</button></div><nav class="loox-rail-list" aria-label="'+w.tools+'"><a class="loox-rail-link" href="'+localizedURL('index.html')+'"><span class="loox-rail-icon" aria-hidden="true">⌂</span><span class="loox-rail-label">'+w.home+'</span></a>'+catalog.map(t=>'<a class="loox-rail-link" href="'+esc(localizedURL(t.url))+'" title="'+esc(t.names[language])+'" '+(active?.slug===t.slug?'aria-current="page"':'')+'><span class="loox-rail-icon"><img src="assets/icons/'+t.slug+'.svg" alt="" width="27" height="27"></span><span class="loox-rail-label">'+esc(t.names[language])+'</span></a>').join('')+'<div class="loox-rail-group-title">'+w.learn+'</div><a class="loox-rail-link" href="'+localizedURL('guides.html')+'"><span class="loox-rail-icon" aria-hidden="true">↗</span><span class="loox-rail-label">'+w.help+'</span></a></nav><div class="loox-rail-bottom"><select class="loox-language" aria-label="Language / Idioma / Langue / Sprache">'+[['en','English'],['es','Español'],['fr','Français'],['de','Deutsch']].map(([value,name])=>'<option value="'+value+'" '+(value===language?'selected':'')+'>'+name+'</option>').join('')+'</select><a class="loox-rail-policy" href="'+localizedURL('privacy-policy.html')+'">'+w.privacy+'</a></div>';
  rail.querySelector('.loox-rail-toggle').onclick=()=>{compact=!compact;save('loox-rail-collapsed',String(compact));document.body.classList.toggle('rail-compact',compact);drawRail()};
  rail.querySelector('select').onchange=e=>{language=e.target.value;save('loox-language',language);const u=new URL(location.href);u.searchParams.set('lang',language);history.replaceState(null,'',u);drawRail();applyLanguage();brandCards();loadGuide()};
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
  if(node.nodeType!==Node.TEXT_NODE||!node.textContent.trim()||node.parentElement?.closest('script,style,textarea,pre,code,[contenteditable],.loox-story,.loox-rail,#status,.status,.studio-list,#layerList,#mediaBin,#tracks,#properties strong,#inspector strong'))return;
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
  try{const response=await fetch('assets/guides/'+language+'/'+active.slug+'.html');if(!response.ok)throw Error('Guide unavailable');const html=await response.text();if(request===guideRequest)host.innerHTML=html}catch{/* The server-rendered English guide remains readable if a request fails. */}
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
 Promise.all([fetch('assets/tool-catalog.json').then(r=>r.json()),fetch('assets/locales/interface.json').then(r=>r.json())]).then(([c,d])=>{
  catalog=c;dictionary=d;drawRail();chooseToolbox();applyLanguage();loadGuide();brandCards();
  const grid=document.querySelector('#toolGrid');if(grid)new MutationObserver(()=>brandCards(grid)).observe(grid,{childList:true});
  document.querySelectorAll('#favGrid,#recentGrid').forEach(personal=>new MutationObserver(()=>brandCards(personal)).observe(personal,{childList:true}));
 }).catch(()=>{rail.innerHTML='<a class="loox-rail-link" href="index.html">LOOX ↗</a>'});
 window.addEventListener('hashchange',()=>{drawRail();chooseToolbox();loadGuide()});
})();
