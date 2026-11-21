/* Optional integrations must be declared here and loaded only after permits(category).
 * The audited release has no analytics, marketing, or optional functional integrations.
 * Changing this inventory requires a consent version change and regression testing. */
(()=>{
 'use strict';
 const VERSION=1,KEY='loox-consent-v1',TTL=180*86400000;
 const inventory=Object.freeze({analytics:false,functional:false,marketing:false});
 const optional=Object.keys(inventory);
 function read(){try{const v=JSON.parse(localStorage.getItem(KEY));
  if(v?.version!==VERSION||!Number.isFinite(v.savedAt)||v.savedAt>Date.now()||Date.now()-v.savedAt>TTL||!optional.every(k=>typeof v[k]==='boolean'))return null;
  return {...v,essential:true};
 }catch{return null;}}
 let choice=read();
 const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 function save(values){const v={version:VERSION,savedAt:Date.now(),essential:true};for(const k of optional)v[k]=values[k]===true;
  localStorage.setItem(KEY,JSON.stringify(v));choice=v;window.dispatchEvent(new CustomEvent('looxconsentchange',{detail:{...v}}));return v;
 }
 function settings(){
  document.getElementById('loox-privacy-dialog')?.remove();
  const d=node('dialog');d.id='loox-privacy-dialog';d.className='loox-privacy';d.setAttribute('aria-labelledby','loox-privacy-title');
  const h=node('h2','Privacy & storage preferences');h.id='loox-privacy-title';d.append(h,node('p','Sign-in and security storage keep your account working. Requested workspace preferences are saved on this device. No analytics or advertising trackers are configured in this release.'));
  const fields={};
  for(const [key,title,description] of [['essential','Essential','Authentication, security and choices you request. Always enabled.'],['analytics','Analytics','Optional audience measurement. None configured.'],['functional','Functional','Optional third-party enhancements. None configured.'],['marketing','Marketing','Optional advertising and marketing. None configured.']]){
   const label=node('label'),input=node('input');input.type='checkbox';input.checked=key==='essential'||choice?.[key]===true;input.disabled=key==='essential';fields[key]=input;
   const copy=node('span');copy.append(node('strong',title),node('small',description));label.append(input,copy);d.append(label);
  }
  const status=node('p');status.setAttribute('role','status');
  const actions=node('div');actions.className='loox-privacy-actions';
  function commit(values){try{save(values);d.close();document.querySelector('[data-loox-consent-banner]')?.remove();}catch{status.textContent='Preferences could not be saved in this browser. Optional integrations remain disabled.';}}
  for(const [title,fn] of [['Accept All',()=>commit(Object.fromEntries(optional.map(k=>[k,true])))],['Reject Optional',()=>commit({})],['Save preferences',()=>commit(Object.fromEntries(optional.map(k=>[k,fields[k].checked])))],['Close',()=>d.close()]]){
   const b=node('button',title);b.type='button';b.onclick=fn;actions.append(b);
  }
  const policy=node('a','Read the Cookie Policy');policy.href=new URL('../cookie-policy.html',document.currentScript?.src||scriptURL).href;
  d.append(actions,status,policy);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();
 }
 const scriptURL=document.currentScript.src;
 const css=node('link');css.rel='stylesheet';css.href=new URL('privacy.css?v=1',scriptURL).href;document.head.append(css);
 window.LOOXPrivacy=Object.freeze({open:settings,preferences:()=>choice?{...choice}:null,permits:category=>category==='essential'||inventory[category]===true&&choice?.[category]===true});
 window.addEventListener('storage',event=>{if(event.key===KEY){choice=read();window.dispatchEvent(new CustomEvent('looxconsentchange',{detail:choice}));}});
 function start(){
  document.querySelectorAll('[data-loox-privacy-open]').forEach(b=>b.addEventListener('click',settings));
  // Show a consent banner only when optional integrations actually require a choice.
  if(!choice&&Object.values(inventory).some(Boolean)){
   const banner=node('aside');banner.className='loox-privacy loox-consent-banner';banner.dataset.looxConsentBanner='';banner.setAttribute('aria-label','Cookie choices');banner.append(node('p','Choose whether LOOX may use optional storage. Essential storage stays enabled.'));
   for(const [title,fn] of [['Accept All',()=>{try{save(Object.fromEntries(optional.map(k=>[k,true])));banner.remove();}catch{settings();}}],['Reject Optional',()=>{try{save({});banner.remove();}catch{settings();}}],['Customize',settings]]){const b=node('button',title);b.type='button';b.onclick=fn;banner.append(b);}document.body.append(banner);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
