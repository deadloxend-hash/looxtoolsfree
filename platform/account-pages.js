import {state,config,api,auth,refresh,signOut} from './account.js';

const byId=id=>document.getElementById(id);
const elem=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
};
const proposedPlans=[
 {id:'free',price_cents:0,credits:10},
 {id:'pro',price_cents:999,credits:100},
 {id:'lifetime',price_cents:4900,credits:50}
];
const presentation={
 free:{
  name:'Free',eyebrow:'GET STARTED',description:'Create with the essentials and explore LOOX at your own pace.',
  features:credit=>['Free browser-based creative tools',credit+' signup credits after email verification','Your own account and credit balance','No recurring subscription']
 },
 pro:{
  name:'LOOX Pro',eyebrow:'FOR MORE CREATING',description:'A recurring plan for creators using eligible AI tools regularly.',
  features:credit=>[credit+' AI credits per paid billing cycle','Access to eligible paid AI features','Account and credit history','Recurring credit refill with active billing']
 },
 lifetime:{
  name:'LOOX Lifetime',eyebrow:'ONE-TIME OPTION',description:'A one-time purchase for eligible premium access without a recurring charge.',
  features:credit=>[credit+' AI credits granted once','Ongoing access to eligible premium features','No monthly subscription','No automatic recurring credit refill']
 }
};
function sameSiteReturn(){
 const raw=new URLSearchParams(location.search).get('from');
 const base=new URL('.',location.href).pathname;
 const here=location.pathname;
 const allowed=value=>{
  if(!value||value.startsWith('//')||value.includes('\\')||value.startsWith('#'))return null;
  try{
   const target=new URL(value,location.href);
   if(target.origin!==location.origin||!target.pathname.startsWith(base)||target.pathname===here)return null;
   return target.pathname+target.search+target.hash;
  }catch{return null;}
 };
 return allowed(raw)||allowed(document.referrer)||new URL('ai-home.html',location.href).pathname;
}
const back=byId('lp-back');
if(back)back.href=sameSiteReturn();

function addNotice(text,tone){
 const target=byId('lp-billing-notice');if(!target)return;
 target.textContent=text;target.dataset.tone=tone;
}
function setStatus(node,text,error=false){
 if(!node)return;node.textContent=text;node.dataset.error=String(error);
}
function planAction(button,notice,id,billing){
 button.addEventListener('click',async()=>{
  if(!billing)return;
  if(!state.user){auth('login');return;}
  button.disabled=true;setStatus(notice,'Opening secure checkout…');
  try{
   const response=await api('checkout',{plan:id});
   const destination=new URL(response.url);
   if(!['https:','http:'].includes(destination.protocol))throw Error('Invalid checkout URL.');
   location.assign(destination.href);
  }catch(error){
   setStatus(notice,error?.message||'Unable to open checkout.',true);
   button.disabled=false;
  }
 });
}
function renderPlans(cfg,configFailed=false){
 const host=byId('lp-plan-grid');if(!host)return;
 const providerPlans=Array.isArray(cfg?.plans)&&cfg.plans.length?cfg.plans:proposedPlans;
 const live=cfg?.billing===true;
 const signedIn=Boolean(state.user);
 const current=state.account?.plan||'';
 host.replaceChildren();
 if(configFailed)addNotice('Unable to confirm live billing. Prices shown are previews; checkout is unavailable.','error');
 else if(!live)addNotice('Plan preview · Checkout is currently unavailable until merchant billing is configured.','preview');
 else if(cfg?.testBilling)addNotice('Test billing is enabled. These are test transactions, not real purchases.','preview');
 else addNotice('Live checkout is enabled. Review plan terms and price before confirming payment.','live');
 for(const id of ['free','pro','lifetime']){
  const p=providerPlans.find(x=>x.id===id)||proposedPlans.find(x=>x.id===id);
  const copy=presentation[id];
  const credits=Number.isFinite(Number(p.credits))?String(p.credits):'0';
  const price=Number.isFinite(Number(p.price_cents))?Number(p.price_cents):0;
  const featured=id==='pro';
  const card=elem('article','lp-plan'+(featured?' lp-plan-featured':''));
  if(featured)card.append(elem('span','lp-featured-badge','MOST POPULAR'));
  card.append(elem('div','lp-plan-label',copy.eyebrow),elem('h3','lp-plan-name',copy.name));
  card.append(elem('p','lp-plan-description',copy.description));
  const priceRow=elem('div','lp-plan-price-row');
  const formatted=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(price/100);
  priceRow.append(elem('span','lp-plan-price',formatted));
  priceRow.append(elem('span','lp-plan-period',id==='pro'?'/ month':id==='lifetime'?'one time':'forever'));
  card.append(priceRow);
  if(current===id&&signedIn)card.append(elem('div','lp-plan-current','✓ Your current plan'));
  card.append(elem('div','lp-plan-divider'),elem('p','lp-plan-features-title','What’s included'));
  const list=elem('ul','lp-plan-features');
  for(const item of copy.features(credits))list.append(elem('li',null,item));
  card.append(list,elem('div','lp-plan-grow'));
  const isCurrent=signedIn&&current===id;
  const action=elem('button','lp-btn '+(featured?'lp-btn-primary':'lp-btn-secondary'));
  action.type='button';
  const small=elem('p','lp-plan-small');
  small.setAttribute('role','alert');
  if(isCurrent){
   action.textContent='Current plan';action.disabled=true;
  }else if(id==='free'){
   if(signedIn){action.textContent='Free tools available';action.disabled=true;}
   else{action.textContent='Get started free';action.addEventListener('click',()=>auth('register'));}
  }else if(live){
   action.textContent='Choose '+(id==='pro'?'Pro':'Lifetime');
   planAction(action,small,id,true);
  }else{
   action.textContent='Checkout coming soon';
   action.disabled=true;
   small.textContent='No payment is being taken at this time.';
  }
  card.append(action,small);host.append(card);
 }
}
let plansConfig=null,plansError=false;
if(document.body.hasAttribute('data-account-upgrade')){
 renderPlans(null,false);
 config().then(c=>{plansConfig=c;renderPlans(c);}).catch(()=>{plansError=true;renderPlans(null,true);});
 document.addEventListener('loox-user',()=>renderPlans(plansConfig,plansError));
 document.addEventListener('loox-account',()=>renderPlans(plansConfig,plansError));
}

function renderSettings(){
 if(!document.body.hasAttribute('data-settings-page'))return;
 const guest=byId('lp-settings-guest'),loading=byId('lp-settings-loading'),content=byId('lp-settings-content');
 if(!state.user){
  guest.hidden=false;loading.hidden=true;content.hidden=true;return;
 }
 guest.hidden=true;
 if(!state.account){
  loading.hidden=false;content.hidden=true;return;
 }
 loading.hidden=true;content.hidden=false;
 const name=byId('lp-display-name');
 // Do not overwrite an in-progress edit during an incidental account refresh.
 if(document.activeElement!==name)name.value=state.account.profile?.name||'';
 byId('lp-email').value=state.user.email||'';
 const plan=state.account.plan||'free';
 byId('lp-plan-info').textContent=(plan==='pro'?'LOOX Pro':plan==='lifetime'?'LOOX Lifetime':'Free plan')+
  ' · '+(state.account.wallet?.balance??'…')+' available credits';
}
if(document.body.hasAttribute('data-settings-page')){
 document.addEventListener('loox-user',renderSettings);
 document.addEventListener('loox-account',renderSettings);
 renderSettings();
 byId('lp-settings-login').addEventListener('click',()=>auth('login'));
 byId('lp-profile-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const name=byId('lp-display-name').value.trim();
  const btn=byId('lp-profile-save'),status=byId('lp-profile-status');
  if(!name||name.length>80){setStatus(status,'Enter a display name up to 80 characters.',true);return;}
  btn.disabled=true;setStatus(status,'Saving…');
  try{
   await api('profile',{name});await refresh();
   setStatus(status,'Changes saved.');
  }catch(error){
   setStatus(status,error?.message||'Could not save your profile.',true);
  }finally{btn.disabled=false;}
 });
 const theme=byId('lp-theme');
 const readPrefs=()=>{try{const p=JSON.parse(localStorage.getItem('loox-platform-prefs')||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{}}catch{return{}}};
 const currentTheme=readPrefs().theme;
 theme.value=['dark','light','system'].includes(currentTheme)?currentTheme:'dark';
 theme.addEventListener('change',()=>{
  const prefs=readPrefs();prefs.theme=theme.value;
  try{
   localStorage.setItem('loox-platform-prefs',JSON.stringify(prefs));
   setStatus(byId('lp-theme-status'),'Theme saved. Supported LOOX pages will use this preference.');
  }catch{setStatus(byId('lp-theme-status'),'Unable to save this preference on your device.',true);}
 });
 byId('lp-password-reset').addEventListener('click',()=>auth('forgot'));
 byId('lp-sign-out').addEventListener('click',signOut);
 const deleteDialog=byId('lp-delete-dialog');
 byId('lp-delete-open').addEventListener('click',()=>deleteDialog.showModal());
 byId('lp-delete-cancel').addEventListener('click',()=>deleteDialog.close());
 deleteDialog.addEventListener('close',()=>{
  byId('lp-delete-form').reset();
  setStatus(byId('lp-delete-status'),'');
 });
 byId('lp-delete-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const password=byId('lp-delete-password').value;
  if(!password||!byId('lp-delete-agree').checked)return;
  const btn=byId('lp-delete-confirm'),status=byId('lp-delete-status');
  btn.disabled=true;setStatus(status,'Deleting your account…');
  try{
   await api('delete',{password});
   await state.client?.auth.signOut({scope:'local'});
   location.replace('ai-home.html');
  }catch(error){
   setStatus(status,error?.message||'Could not delete account.',true);
   btn.disabled=false;
  }
 });
}
