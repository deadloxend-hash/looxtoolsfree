/* LOOX Tools: one same-site Back control for all tool workspaces. */
(()=>{
 'use strict';
 const filename=location.pathname.split('/').pop()||'index.html';
 if(['index.html','ai-home.html','upgrade.html','settings.html'].includes(filename))return;
 if(document.getElementById('loox-page-back'))return;

 const prefix=new URL('.',location.href).pathname;
 const here=location.pathname+location.search+location.hash;
 const lastKey='loox-last-visited-page';
 const destination=raw=>{
  if(!raw||raw.startsWith('//')||raw.includes('\\'))return null;
  try{
   const url=new URL(raw,location.href);
   if(url.origin!==location.origin||!url.pathname.startsWith(prefix))return null;
   if(url.pathname===location.pathname&&url.search===location.search)return null;
   if(!/\.html$/i.test(url.pathname))return null;
   return url.pathname+url.search+url.hash;
  }catch{return null;}
 };
 const referrer=destination(document.referrer);
 let stored=null;
 try{
  stored=destination(sessionStorage.getItem(lastKey));
  sessionStorage.setItem(lastKey,here);
 }catch{/* Private browsing can block storage. */}
 const fallback=new URL('index.html',location.href).pathname;
 const target=referrer||stored||fallback;

 const mount=()=>{
  if(document.getElementById('loox-page-back'))return;
  const back=document.createElement('a');
  back.id='loox-page-back';
  back.className='loox-page-back';
  back.href=target;
  back.title='Return to the previous LOOX page';
  back.setAttribute('aria-label','Back to previous page');
  back.innerHTML='<span class="loox-page-back-arrow" aria-hidden="true">‹</span><span class="loox-page-back-label">Back</span>';
  back.addEventListener('click',event=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
   if(referrer&&history.length>1){
    event.preventDefault();
    history.back();
   }
  });

  const header=document.querySelector('header.lig-header,header.lx-header,header.topbar,header.work-header,header.suite-header,header.studio-top,header.info-header,header,.topbar');
  if(header){
   const row=header.querySelector('.lig-head-start,.topbar-inner,.info-header-inner,.loox-appbar-inner,.nav-inner')||header;
   row.insertBefore(back,row.firstChild);
   return;
  }
  // Older tools without a header keep their editor layout intact.
  back.classList.add('loox-page-back-floating');
  document.body.append(back);
 };
 const start=()=>setTimeout(mount,0);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
