export function generationPreferences(){try{const p=JSON.parse(localStorage.getItem('loox-platform-prefs')||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{};}catch{return {};}}
export function applyGenerationPreferences(kind,{model,ratio,duration},prefs=generationPreferences()){
 const choose=(control,value)=>{if(!control||value==null)return;const option=[...control.options].find(o=>o.value===String(value)&&!o.disabled&&!o.hidden);if(!option)return;control.value=option.value;control.dispatchEvent(new Event('change',{bubbles:true}));};
 choose(model,prefs[kind+'Model']);choose(ratio,prefs[kind+'Ratio']);choose(duration,prefs.videoDuration);
}
let confirmationTask=null;
export function confirmGenerationCost(credits){
 const p=generationPreferences();if(p.confirmExpensive!==true||!Number.isFinite(credits)||credits<20)return Promise.resolve(true);
 if(confirmationTask)return confirmationTask;
 confirmationTask=new Promise(resolve=>{const d=document.createElement('dialog');d.className='lx lx-modal';const title=document.createElement('h2');title.textContent='Confirm generation';const text=document.createElement('p');text.textContent='This generation costs '+credits+' credits. Continue with these settings?';const cancel=document.createElement('button'),confirm=document.createElement('button');cancel.type=confirm.type='button';cancel.className='lx-button';confirm.className='lx-button lx-primary';cancel.textContent='Cancel';confirm.textContent='Generate · '+credits+' credits';let accepted=false;cancel.onclick=()=>d.close();confirm.onclick=()=>{accepted=true;d.close();};d.addEventListener('close',()=>{d.remove();confirmationTask=null;resolve(accepted);},{once:true});d.append(title,text,cancel,confirm);document.body.append(d);d.showModal();cancel.focus();});return confirmationTask;
}
