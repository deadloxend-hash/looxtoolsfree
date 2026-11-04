/* Shared LOOX tool-directory navigation, collection menu, and search.
   Only loaded by directory pages: tool editor pages are untouched. */
(()=>{
'use strict';
if(document.documentElement.dataset.looxDirectoryNavReady)return;
document.documentElement.dataset.looxDirectoryNavReady='1';
const collections=[
 ['Image Tools','all-image-tools.html'],['Text Tools','all-text-tools.html'],
 ['Video Tools','all-video-tools.html'],['AI Tools','all-ai-tools.html']
];
const categories=[
 ['Image Resizing & Canvas Scaling','image-resizing-tools.html'],
 ['Compression & File Optimization','image-compression-tools.html'],
 ['Image Cropping & Framing','image-cropping-tools.html'],
 ['Image Format Converters','image-converter-tools.html'],
 ['Photo Editing & Filters','photo-editing-tools.html'],
 ['Watermarking & Branding','watermark-branding-tools.html'],
 ['AI-Powered Media Suite','ai-media-tools.html']
];
function build(){
 const header=document.querySelector('body.work-page > .work-header');
 if(!header||header.querySelector('.loox-dir-nav'))return;
 document.body.classList.add('loox-dir-enhanced');
 const location=decodeURIComponent(locationName());
 const oldBrand=header.querySelector('.work-brand');
 const brand=oldBrand||document.createElement('a');
 if(!oldBrand){brand.className='work-brand';brand.href='ai-home.html';brand.innerHTML='LOOX <span>Tools</span>';}
 header.replaceChildren(brand);
 header.classList.add('loox-dir-header');
 const nav=document.createElement('nav');nav.className='loox-dir-nav';nav.setAttribute('aria-label','Tool collection navigation');
 collections.forEach(([label,url])=>{
  const a=document.createElement('a');a.href=url;a.textContent=label;
  const active=location===url||(url==='all-image-tools.html'&&categories.slice(0,6).some(([,link])=>link===location))||(url==='all-ai-tools.html'&&location==='ai-media-tools.html');
  if(active)a.setAttribute('aria-current','page');
  nav.append(a);
 });
 const group=document.createElement('details');group.className='loox-dir-menu';
 const summary=document.createElement('summary');summary.textContent='Categories';summary.setAttribute('aria-label','Browse tool categories');group.append(summary);
 const menu=document.createElement('div');menu.className='loox-dir-menu-list';
 categories.forEach(([label,url])=>{
  const a=document.createElement('a');a.href=url;a.textContent=label;
  if(location===url)a.setAttribute('aria-current','page');
  menu.append(a);
 });
 group.append(menu);nav.append(group);header.append(nav);
 const perks=document.createElement('div');perks.className='loox-dir-perks';
 ['Free to use','No installation','Clear privacy notes'].forEach(t=>{
  const span=document.createElement('span');span.textContent='✓ '+t;perks.append(span);
 });
 header.append(perks);
 document.addEventListener('click',e=>{if(!group.contains(e.target))group.open=false});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')group.open=false});
 // Move the original search control rather than replacing its working filtering code.
 const searchShell=document.createElement('div');searchShell.className='loox-dir-search-section';
 const searchBox=document.createElement('div');searchBox.className='loox-dir-searchbox';searchBox.setAttribute('role','search');
 const icon=document.createElement('span');icon.className='loox-dir-search-icon';icon.setAttribute('aria-hidden','true');icon.textContent='⌕';
 const input=document.createElement('input');input.type='search';input.className='loox-dir-global-search';input.placeholder='What would you like to do?';input.setAttribute('aria-label','Search tools in this collection');input.autocomplete='off';
 const shortcut=document.createElement('kbd');shortcut.textContent='Press /';
 const button=document.createElement('button');button.type='button';button.textContent='Find a tool';button.className='loox-dir-search-button';
 searchBox.append(icon,input,shortcut,button);searchShell.append(searchBox);
 header.insertAdjacentElement('afterend',searchShell);
 const original=document.querySelector('#directory-search');
 if(original){
  const label=original.closest('.work-directory-search');
  original.id='directory-search';
  input.replaceWith(original);
  original.classList.add('loox-dir-global-search');
  original.placeholder='What would you like to do?';
  original.setAttribute('aria-label','Search tools in this collection');
  if(label)label.remove();
  wire(original);
 }else{
  // AI directories create their search input asynchronously as an ES module.
  // Mirror to that original input so the category filtering continues to work.
  const mirror=()=>{
   const aiSearch=document.querySelector('.lx-ai-dashboard-full .lx-ai-search');
   if(!aiSearch)return false;
   input.addEventListener('input',()=>{aiSearch.value=input.value;aiSearch.dispatchEvent(new Event('input',{bubbles:true}));});
   return true;
  };
  if(!mirror()){
   const watcher=new MutationObserver(()=>{if(mirror())watcher.disconnect()});
   watcher.observe(document.body,{subtree:true,childList:true});
  }
  wire(input);
 }
 function wire(field){
  button.addEventListener('click',()=>{
   field.dispatchEvent(new Event('input',{bubbles:true}));
   const grid=document.querySelector('.work-directory-grid')||document.querySelector('.lx-ai-grid');
   if(grid)grid.scrollIntoView({behavior:'smooth',block:'start'});else field.focus();
  });
  document.addEventListener('keydown',e=>{
   if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable]')){
    e.preventDefault();field.focus();
   }
  });
 }
}
function locationName(){return window.location.pathname.split('/').pop()||'all-image-tools.html';}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
