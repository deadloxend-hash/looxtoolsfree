import {billingURL} from './billing-url.js';
import {setupSettings} from './settings-2.js?v=sidebar-activity-20261127';
import {state,config,api,auth,refresh,signOut,buyCredits,startGoogleSignIn} from './account.js?v=auth-20261127';
import {authenticatorImage} from './account-security.js?v=settings-2-20261124';
import {cloudRequest} from './profile-cloudflare.js?v=settings-2-20261124';
if(document.body.hasAttribute('data-settings-page'))setupSettings();
const byId=id=>document.getElementById(id);
const elem=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const proposedPlans=[{id:'free',price_cents:0,credits:25,cadence:'signup'},{id:'creator',price_cents:1200,credits:500,cadence:'month'},{id:'creator_yearly',price_cents:12000,credits:6000,cadence:'year'},{id:'pro',price_cents:2900,credits:1500,cadence:'month'},{id:'pro_yearly',price_cents:29000,credits:18000,cadence:'year'},{id:'business',price_cents:6900,credits:4000,cadence:'month'},{id:'business_yearly',price_cents:69000,credits:48000,cadence:'year'}];
const presentation={business:{name:'LOOX Business',icon:'◆',eyebrow:'FOR TEAMS & HIGHER VOLUME',description:'For teams and power users who need higher creative volume.'},free:{name:'LOOX Basic',icon:'◇',eyebrow:'YOUR FIRST IDEAS',description:'Free forever. Try AI images and basic creative tools.'},creator:{name:'LOOX Creator',icon:'✦',eyebrow:'FOR YOUR CREATIVE ROUTINE',description:'For everyday creators. Make more images and explore motion.'},pro:{name:'LOOX Pro',icon:'♛',eyebrow:'FOR YOUR BIGGEST IDEAS',description:'A bigger creative allowance and premium video models.'}};
let cadence='month',plansConfig=null,plansError=false;
const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(c/100);
function sameSiteReturn(){try{const raw=new URLSearchParams(location.search).get('from')||document.referrer;const target=new URL(raw,location.href);if(target.origin===location.origin&&target.pathname!==location.pathname&&!/\/(?:account|settings)\.html$/.test(target.pathname))return target.pathname+target.search+target.hash;}catch{}return 'ai-home.html';}
const back=byId('lp-back');if(back)back.href=sameSiteReturn();
function setStatus(node,text,error=false){if(node){node.textContent=text;node.dataset.error=String(error);}}
function addNotice(text,tone){const n=byId('lp-billing-notice');if(n){n.textContent=text;n.dataset.tone=tone;}}
function planAction(button,notice,id){button.addEventListener('click',async()=>{if(!state.user){auth('login');return;}button.disabled=true;setStatus(notice,'Opening secure checkout…');try{const r=await api('checkout',{plan:id});location.assign(billingURL(r.url));}catch(e){setStatus(notice,e.message||'Checkout is unavailable.',true);button.disabled=false;}});}
function renderPlans(cfg,failed=false){
 const host=byId('lp-plan-grid');if(!host)return;
 if(cfg?.annualBillingEnabled!==true)cadence='month';
 const plans=cfg?.plans?.length?cfg.plans:proposedPlans,live=cfg?.billing===true;
 const current=state.account?.plan||'basic';host.replaceChildren();
 addNotice(failed?'Plan service is unavailable. Displayed prices are previews.':!live?'Secure checkout coming soon · monthly plans are previews. No payment is taken.':cfg?.testBilling?'Test checkout · No real payments.':'Secure checkout · USD prices. Applicable taxes are shown before payment.',live?'live':'preview');
 for(const id of ['free','creator','pro','business']){
  const key=id==='free'?id:id+(cadence==='year'?'_yearly':'');
  const p=plans.find(p=>p.id===key)||proposedPlans.find(p=>p.id===key),copy=presentation[id],featured=id==='pro';
  const card=elem('article','lp-plan'+(featured?' lp-plan-featured':''));card.dataset.plan=id;
  if(featured)card.append(elem('span','lp-featured-badge','MOST POPULAR'));
  card.append(elem('span','lp-tier-icon lp-tier-'+id,copy.icon),elem('div','lp-plan-label',copy.eyebrow),elem('h3','lp-plan-name',copy.name),elem('p','lp-plan-description',copy.description));
  const price=elem('div','lp-plan-price-row');price.append(elem('span','lp-plan-price',money(p.price_cents)),elem('span','lp-plan-period',id==='free'?'always free':cadence==='year'?'/ year':'/ month'));card.append(price);
  card.append(elem('p','lp-price-detail',id==='free'?'Automatically assigned after verified signup':cadence==='year'?money(p.price_cents/12)+' / month equivalent · billed yearly':'Billed monthly · cancel renewal anytime'));
  card.append(elem('div','lp-credit-allowance',p.credits.toLocaleString()+' credits'+(id==='free'?' to start':cadence==='year'?' per year':' per month')));
  const standardCost=Math.max(1,Number(cfg?.operations?.find(o=>o.id==='generate')?.cost)||3);
  const imageCount=Math.floor(p.credits/standardCost).toLocaleString();
  card.append(elem('p','lp-plan-usecase',id==='free'?'Try AI images and basic tools':cadence==='year'?'Up to '+imageCount+' standard AI images per year':'Up to '+imageCount+' standard AI images per month'));
  const features=id==='business'?['4,000 credits per month','All Pro model access; premium video priced by model and length','Private creations and credit history','Priority access to local GPU when available']:id==='free'?['25 credits after email verification','Earn 5 return credits every 12 hours; balance cap 50','Local AI models when the GPU is online','Free browser tools and a Basic profile badge']:id==='creator'?['500 credits per month','Standard cloud video models and AI images','Credits shown before each generation','Creator badge and local queue priority']:['1,500 credits per month','Creator features plus premium video models','Pay credits based on chosen model and duration','Pro badge and highest local queue priority'];
  const list=elem('ul','lp-plan-features');for(const text of features)list.append(elem('li','',text));
  card.append(list,elem('p','lp-plan-small',id==='free'?'Rewards require a manual claim. First reward unlocks 12 hours after your first signed-in visit.':cadence==='year'?'All annual credits arrive after a successful annual payment.':'Credits arrive after each successful monthly payment.'));
  const examples=elem('div','lp-plan-estimates');examples.dataset.credits=p.credits;examples.dataset.tier=id==='free'?'basic':id;card.append(examples);
  const button=elem('button','lp-btn '+(featured?'lp-btn-primary':'lp-btn-secondary')),note=elem('p','lp-plan-small');button.type='button';note.setAttribute('role','status');
  if(state.user&&current===(id==='free'?'basic':id)){button.textContent='Your current plan';button.disabled=true;}
  else if(id==='free'){button.textContent=state.user?'Basic included':'Start creating free';button.disabled=Boolean(state.user);button.onclick=()=>auth('register');}
  else{const configured=live&&(!Array.isArray(cfg.checkoutPlans)||cfg.checkoutPlans.includes(key));button.textContent=configured?'Choose '+copy.name:'Coming Soon';button.disabled=!configured;planAction(button,note,key);}
  card.append(elem('div','lp-plan-grow'),button,note);host.append(card);
 }
 renderEstimates(cfg);
}
function renderEstimates(cfg){
 const selector=byId('lp-estimate-model'),duration=byId('lp-estimate-duration');if(!selector||!duration)return;
 const models=cfg?.videoModels||[];
 const estimator=byId('lp-credit-estimator');if(estimator)estimator.hidden=!models.some(model=>model.available===true);
 if(models.length&&selector.options.length===1&&!selector.options[0].value)selector.replaceChildren();
 if(!selector.options.length){for(const m of models.filter(m=>m.available)){const o=elem('option','',m.name+' · '+m.capabilities.resolution);o.value=m.id;selector.append(o);}if(!selector.options.length){const o=elem('option','','Video pricing unavailable');o.value='';selector.append(o);}}
 const model=models.find(m=>m.id===selector.value),previous=duration.value;duration.replaceChildren();
 for(const d of model?.durationOptions||[5]){const o=elem('option','',d+' seconds');o.value=d;duration.append(o);}if([...duration.options].some(o=>o.value===previous))duration.value=previous;
 const op=cfg?.operations?.find(o=>o.id==='generate')?.cost||3,cloudImage=cfg?.models?.find(m=>m.available),premiumImage=cloudImage?.cost||25;
 const videoCost=model?.creditCosts?.[duration.value],rank={basic:0,creator:1,pro:2,business:2};
 for(const target of document.querySelectorAll('.lp-plan-estimates')){
  const credits=Number(target.dataset.credits),tier=target.dataset.tier,allowed=rank[tier]>=rank[model?.minimumPlan||'creator'];target.replaceChildren();
  target.append(elem('strong','','Spend the whole balance on one option:'),elem('p','',Math.floor(credits/op).toLocaleString()+' local images · '+op+' credits each'));
  if(cloudImage)target.append(elem('p','',Math.floor(credits/premiumImage)+' '+cloudImage.name+' images · '+premiumImage+' credits each'));
  target.append(elem('p','',!model?'Video generation is Coming Soon':!allowed?'Selected video requires LOOX '+(model.minimumPlan==='pro'?'Pro':'Creator'):Math.floor(credits/videoCost)+' × '+duration.value+'s videos · '+videoCost+' credits each'));
 }
 byId('lp-estimate-note').textContent=model?'Counts are alternatives from the same balance, not combined allowances. '+model.name+': '+videoCost+' credits per '+duration.value+'s clip at '+model.capabilities.resolution+'. Local generation depends on GPU availability.':'Video generation is Coming Soon. Credit estimates appear when a model becomes available.';
}
if(document.body.hasAttribute('data-account-upgrade')){
 const buy=byId('lp-buy-credits');if(buy){buy.disabled=true;buy.textContent='Coming Soon';}
 renderPlans(null);config().then(c=>{plansConfig=c;renderPlans(c);}).catch(()=>{plansError=true;renderPlans(null,true);});
 for(const name of ['loox-user','loox-account'])document.addEventListener(name,()=>renderPlans(plansConfig,plansError));
 for(const id of ['lp-estimate-model','lp-estimate-duration'])byId(id)?.addEventListener('change',()=>renderEstimates(plansConfig));
}

const monthlyCredits={free:25,basic:25,creator:500,pro:1500,business:4000};
const billingNames={free:'LOOX Basic',basic:'LOOX Basic',creator:'LOOX Creator',pro:'LOOX Pro',business:'LOOX Business'};
let rechargeOwner=null,rechargeItems=null,rechargeError='';
const recordDate=value=>{const time=new Date(value);return Number.isFinite(time.getTime())?time.toLocaleDateString():'';};
function historyRows(id,records,emptyMessage){
 const list=byId(id);if(!list)return;
 list.replaceChildren();
 if(!records.length)list.append(elem('li','',emptyMessage));
 for(const line of records)list.append(elem('li','',line));
}
function fetchRechargeHistory(){
 const owner=state.user?.id;
 if(!owner||rechargeOwner===owner)return;
 rechargeOwner=owner;rechargeItems=null;rechargeError='';
 api('recharge_history').then(data=>{
  if(state.user?.id!==owner)return;
  rechargeItems=Array.isArray(data?.items)?data.items:[];renderBilling();
 }).catch(error=>{
  if(state.user?.id!==owner)return;
  rechargeError=error.message||'Recharge history could not be loaded.';
  rechargeItems=[];renderBilling();
 });
}
function renderBilling(){
 if(!document.body.hasAttribute('data-settings-page')||!state.user||!state.account)return;
 const account=state.account,rawPlan=String(account.plan||'free');
 const annual=rawPlan.endsWith('_yearly'),tier=rawPlan.replace(/_yearly$/,'');
 const subscription=Array.isArray(account.subscriptions)?account.subscriptions:[];
 const active=subscription.find(s=>['active','trialing','past_due'].includes(s.status));
 const balance=account.wallet?.balance;
 byId('lp-billing-balance').textContent=Number.isFinite(balance)?balance.toLocaleString():'Unavailable';
 byId('lp-billing-plan').textContent=billingNames[tier]||'Existing plan';
 byId('lp-billing-plan-status').textContent=active?'Subscription · '+String(active.status).replace(/_/g,' '):'No active paid subscription';
 byId('lp-billing-allocation').textContent=annual?'—':(monthlyCredits[tier]??'—').toLocaleString();
 byId('lp-billing-allocation-note').textContent=annual?'Existing annual plan · review your subscription':tier==='free'||tier==='basic'?'One-time signup credits':'Credits per paid month';
 const enabled=false; // Free launch: checkout remains unavailable.
 byId('lp-billing-status').textContent=enabled?'Secure billing is configured. Check your subscription status before managing payments.':'Payments are not active yet. Recharge and subscription checkout are coming soon.';
 const portal=byId('lp-billing-portal');portal.disabled=!enabled||!active;
 portal.title=portal.disabled?'Subscription portal available after billing setup and an active subscription':'Manage or cancel your subscription securely';
 const credits=(Array.isArray(account.credits)?account.credits:[]).slice(0,25).map(item=>
  [recordDate(item.created_at),item.reason||'Credit activity',Number(item.amount)>0?'+':null,Number(item.amount||0).toLocaleString()+' credits'].filter(Boolean).join(' · '));
 historyRows('lp-billing-credit-history',credits,account.unavailable?.includes('credits')?'Credit history is temporarily unavailable. Retry billing.':'No credit activity to display.');
 const payments=(Array.isArray(account.payments)?account.payments:[]).slice(0,20).map(item=>
  [recordDate(item.created_at),billingNames[item.plan]||item.plan||'Subscription',money(Number(item.amount_cents||0)),item.status||'Pending'].filter(Boolean).join(' · '));
 if(rechargeItems)for(const item of rechargeItems.slice(0,20))payments.push(
  [recordDate(item.created_at),item.package_id||'Credit recharge',money(Number(item.amount_cents||0)),item.status||'Pending'].filter(Boolean).join(' · '));
 if(account.unavailable?.includes('payments'))payments.push('Subscription payment history is temporarily unavailable. Retry billing.');
 if(rechargeError)payments.push(rechargeError);
 historyRows('lp-billing-transaction-history',payments,rechargeItems===null?'Loading recharge history…':'No transactions to display.');
 fetchRechargeHistory();

}
let securityOwner=null,securityLoaded=0,securityPending=false;
const securityTime=value=>value?new Date(value).toLocaleString(): 'Unavailable';
async function loadSecurity(force=false){
 const owner=state.user?.id;if(!owner)return;
 if(securityPending&&securityOwner===owner||!force&&securityOwner===owner&&Date.now()-securityLoaded<30000)return;
 securityOwner=owner;securityPending=true;
 const sessions=byId('lp-security-sessions'),activity=byId('lp-security-activity'),remove=byId('lp-delete-open');
 if(!sessions||!activity)return;
 remove.disabled=true;sessions.replaceChildren(elem('li','','Checking active sign-ins…'));activity.replaceChildren(elem('li','','Checking security activity…'));
 try{
  const data=await api('security_summary');if(state.user?.id!==owner)return;
  sessions.replaceChildren();activity.replaceChildren();
  for(const session of data.sessions||[]){
   const item=elem('li');item.append(elem('strong','',session.current?'This browser session':'Other sign-in session'),elem('small','','Started '+securityTime(session.created_at)+' · Last token refresh '+securityTime(session.refreshed_at)));
   if(session.user_agent){const details=elem('details');details.append(elem('summary','','Browser information'),elem('small','',session.user_agent));item.append(details);}sessions.append(item);
  }
  if(!sessions.children.length)sessions.append(elem('li','','No active sessions returned.'));
  for(const event of data.activity||[])activity.append(elem('li','',(event.action||'Account event').replaceAll('_',' ')+' · '+securityTime(event.created_at)));
  if(!activity.children.length)activity.append(elem('li','','No retained security activity was returned.'));
  const needsReview=data.deletion?.requires_support;
  remove.disabled=needsReview!==false;
  byId('lp-deletion-eligibility').textContent=needsReview===true?'This account needs a verified support review because of billing, administrator access or shared platform assets.':needsReview===false?'Password verification is required. Your private records and media will be removed across both storage services.':'Deletion eligibility could not be verified. Contact support.';
  securityLoaded=Date.now();
 }catch{
  if(state.user?.id!==owner)return;
  sessions.replaceChildren(elem('li','','Session information is temporarily unavailable.'));activity.replaceChildren(elem('li','','Security activity is temporarily unavailable.'));
  byId('lp-deletion-eligibility').textContent='Deletion eligibility could not be verified. Refresh Settings or contact support.';
 }finally{if(securityOwner===owner)securityPending=false;}
}
function savePrivateDownload(blob,name){
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function googleOnly(){return state.user?.identities?.some(i=>i.provider==='google')&&!state.user?.identities?.some(i=>i.provider==='email');}
function securityPassword(form,label){
 if(!googleOnly()){const wrap=elem('label','lx-field'),input=elem('input');wrap.append(elem('span','',label),input);input.type='password';input.required=true;input.maxLength=128;input.autocomplete='current-password';form.append(wrap);return input;}
 form.append(elem('p','','Verify the same Google account again, then return to this action. LOOX never needs your Google password. Verification lasts five minutes and each security action can use it once.'));
 const verify=elem('button','lp-btn lp-btn-secondary','Verify with Google');verify.type='button';verify.onclick=async()=>{verify.disabled=true;try{await startGoogleSignIn({reauth:true,returnTo:location.href});}catch(error){form.append(elem('p','',error.message||'Google verification could not start.'));verify.disabled=false;}};form.append(verify);const alternate=elem('button','lx-link','Use a LOOX password instead');alternate.type='button';const input=elem('input'),wrap=elem('label','lx-field');input.type='password';input.maxLength=128;input.autocomplete='current-password';wrap.append(elem('span','','LOOX password · never your Google password'),input);wrap.hidden=true;alternate.onclick=()=>{wrap.hidden=false;input.required=true;input.focus();alternate.hidden=true;};form.append(alternate,wrap);return input;
}
function renderSettings(){
 if(!document.body.hasAttribute('data-settings-page'))return;
 const guest=byId('lp-settings-guest'),loading=byId('lp-settings-loading'),content=byId('lp-settings-content');
 if(state.authRestoring&&!state.user){guest.hidden=true;loading.hidden=false;loading.textContent='Restoring your account…';content.hidden=true;return;}
 if(!state.user){
  guest.hidden=false;loading.hidden=true;content.hidden=true;securityOwner=null;securityLoaded=0;
  for(const id of ['lp-billing-balance','lp-billing-plan','lp-billing-allocation'])byId(id).textContent='Sign in';
  byId('lp-billing-plan-status').textContent='Sign in to view your plan.';byId('lp-billing-status').textContent='Sign in to view your balance and credit history. Payments are coming soon.';
  historyRows('lp-billing-credit-history',[],'Sign in to view credit history.');historyRows('lp-billing-transaction-history',[],'Sign in to view transactions.');return;
 }
 guest.hidden=true;
 if(!state.account){
  loading.hidden=false;loading.textContent=state.accountError||'Loading your billing information…';content.hidden=false;
 }else{loading.hidden=true;content.hidden=false;}
 // Profile and security are independent of the wallet request.
 const name=byId('lp-display-name');
 // Do not overwrite an in-progress edit during an incidental account refresh.
 if(document.activeElement!==name)name.value=state.account?.profile?.name||state.user.user_metadata?.full_name||'';
 byId('lp-email').value=state.user.email||'';
 byId('lp-password-reset').textContent=googleOnly()?'Set or reset LOOX password':'Reset LOOX password';
 byId('lp-email-verification').textContent=state.user.email_confirmed_at?'Verified email address':'Email verification required';
 const factorOwner=state.user.id;
 state.client?.auth.mfa.listFactors().then(({data,error})=>{
  if(state.user?.id!==factorOwner)return;
  const enabled=data?.totp?.some(f=>f.status==='verified');
  byId('lp-mfa-status').textContent=error?'Authenticator status unavailable':enabled?'Authenticator enabled. Use your code when signing in. Contact support if you lose your authenticator.':'Add a time-based authenticator after verifying your identity.';
  byId('lp-mfa-enable').hidden=Boolean(error||enabled);
  const remove=byId('lp-mfa-remove');if(remove){remove.hidden=Boolean(error||!enabled);remove.dataset.factor=data?.totp?.find(f=>f.status==='verified')?.id||'';}
 }).catch(()=>{if(state.user?.id===factorOwner)byId('lp-mfa-status').textContent='Authenticator status unavailable';});
 const plan=state.account?.plan||'free';
 byId('lp-plan-info').textContent=(plan==='business'?'LOOX Business':plan==='pro'?'LOOX Pro':plan==='creator'?'LOOX Creator':'LOOX Basic')+
  ' · '+(state.account?.wallet?.balance??'Unavailable')+' available credits';
 renderBilling();
 loadSecurity();
}
if(document.body.hasAttribute('data-settings-page')){
 document.addEventListener('loox-billing-retry',()=>{rechargeOwner=null;rechargeItems=null;rechargeError='';if(state.account)renderBilling();});
 document.addEventListener('loox-security-retry',()=>loadSecurity(true));
 document.addEventListener('loox-user',renderSettings);
 document.addEventListener('loox-account',renderSettings);
 renderSettings();
 byId('lp-settings-login').addEventListener('click',()=>auth('login'));
 byId('lp-billing-recharge').disabled=true;byId('lp-billing-recharge').textContent='Recharge · Coming soon';
 byId('lp-billing-portal').addEventListener('click',async()=>{
  const trigger=byId('lp-billing-portal'),status=byId('lp-billing-status');
  if(trigger.disabled||!state.config?.billing)return;
  trigger.disabled=true;setStatus(status,'Opening your secure subscription portal…');
  try{
   const result=await api('portal',{});
   location.assign(billingURL(result.url));
  }catch(error){setStatus(status,error.message||'The subscription portal is unavailable.',true);renderBilling();}
  finally{trigger.disabled=!(state.config?.billing&&state.account?.subscriptions?.some(s=>['active','trialing','past_due'].includes(s.status)));}
 });
 byId('lp-profile-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const name=byId('lp-display-name').value.trim();
  const btn=byId('lp-profile-save'),status=byId('lp-profile-status');
  if(!name||name.length>60){setStatus(status,'Enter a display name up to 60 characters.',true);return;}
  btn.disabled=true;setStatus(status,'Saving…');
  try{
   await cloudRequest(state,'profile',{method:'PATCH',data:{display_name:name}});
   await api('profile',{name});await refresh();
   setStatus(status,'Changes saved.');
  }catch(error){
   setStatus(status,error?.message||'Could not save your profile.',true);
  }finally{btn.disabled=false;}
 });
 const removeFactor=elem('button','lp-btn lp-btn-secondary','Remove authenticator');removeFactor.id='lp-mfa-remove';removeFactor.type='button';removeFactor.hidden=true;byId('lp-mfa-enable').after(removeFactor);
 removeFactor.onclick=async()=>{const {dialog,msg}=await import('./account.js?v=auth-20261127');const owner=state.user?.id;if(!owner)return;const {box,d}=dialog('Remove authenticator');box.append(elem('p','','Confirm your identity before removing this authenticator. Keep access to your verified email. Administrator accounts require a recovery review.'));const form=elem('form','lx-stack'),password=securityPassword(form,'Current LOOX password'),submit=elem('button','lx-button','Confirm removal'),note=elem('p');submit.type='submit';note.role='status';form.append(submit,note);box.append(form);form.onsubmit=async event=>{event.preventDefault();if(submit.disabled)return;submit.disabled=true;const value=password.value;password.value='';try{await api('auth_factor',{operation:'remove',factorId:removeFactor.dataset.factor,password:value});if(state.user?.id!==owner)return;await state.client.auth.refreshSession();d.close();renderSettings();}catch(error){msg(note,error.message||'Authenticator removal could not finish.');submit.disabled=false;}};};
 byId('lp-password-reset').addEventListener('click',()=>auth('forgot'));
 byId('lp-mfa-enable').addEventListener('click',async()=>{
  const {dialog,field,msg}=await import('./account.js?v=auth-20261127');
  const owner=state.user?.id,user=state.user;if(!owner)return;
  const {box,d}=dialog('Set up authenticator');
  box.append(elem('p','','Keep access to your verified recovery email. Use a trusted authenticator app and keep its backup securely. Do not share the setup code.'));
  const form=elem('form','lx-stack'),note=elem('p');note.setAttribute('role','status');
  const password=securityPassword(form,'Current LOOX password');
  const submit=elem('button','lx-button lx-primary','Verify identity');submit.type='submit';form.append(submit,note);box.append(form);
  let factor=null,operation=Promise.resolve(),complete=false;
  d.addEventListener('close',()=>{
   box.replaceChildren();
   operation.finally(async()=>{
    if(!factor||complete||state.user?.id!==owner)return;
    try{const result=await state.client.auth.mfa.listFactors();if(result.data?.totp?.some(f=>f.id===factor&&f.status==='unverified'))await state.client.auth.mfa.unenroll({factorId:factor});}catch{/* Unverified factors cannot authorize sign-ins; support can remove stale enrollments. */}
   });
  },{once:true});
  form.onsubmit=event=>{event.preventDefault();submit.disabled=true;const value=password.value;password.value='';
   operation=(async()=>{
    try{
     if(state.user?.id!==owner||!d.open)return;
     const existing=await state.client.auth.mfa.listFactors();if(existing.error)throw existing.error;
     if(existing.data?.totp?.some(f=>f.status==='verified'))throw Error('An authenticator is already enabled. Refresh Settings.');
     const enrolled={data:await api('auth_factor',{operation:'enroll',password:value})};
     if(enrolled.error)throw enrolled.error;factor=enrolled.data?.id;
     if(!factor)throw Error('Authenticator setup failed.');
     if(state.user?.id!==owner||!d.open)return;
     const qr=elem('img','lp-mfa-qr');qr.alt='Scan this code in your authenticator app';qr.src=authenticatorImage(enrolled.data.totp);qr.width=224;qr.height=224;
     const instructions=elem('p','','Scan this QR code, then enter the current six-digit code to activate two-factor authentication. Setup is incomplete until the code is verified.');
     form.replaceChildren(qr,instructions);
     const code=field(form,'Authenticator code','text',{required:true,inputMode:'numeric',pattern:'[0-9]{6}',maxLength:6,autocomplete:'one-time-code'});
     const confirm=elem('button','lx-button lx-primary','Enable authenticator');confirm.type='submit';form.append(confirm,note);msg(note,'');code.focus();
     form.onsubmit=event=>{event.preventDefault();if(state.user?.id!==owner||!d.open)return;confirm.disabled=true;const entered=code.value;code.value='';
      operation=(async()=>{try{
       const result=await state.client.auth.mfa.challengeAndVerify({factorId:factor,code:entered});if(result.error)throw result.error;
       complete=true;factor=null;if(state.user?.id!==owner||!d.open)return;
       form.replaceChildren();d.close();renderSettings();byId('lp-security-status').textContent='Authenticator enabled. Your next sign-in will request a code.';loadSecurity(true);
      }catch(error){msg(note,error.message||'Code verification failed. Try the latest code.');confirm.disabled=false;}})();
     };
    }catch(error){msg(note,error.message||'Unable to start authenticator setup.');submit.disabled=false;}
   })();
  };
 });
 byId('lp-data-export').addEventListener('click',async()=>{
  const {dialog,field,msg}=await import('./account.js?v=auth-20261127');
  const owner=state.user?.id;if(!owner)return;
  const {box,d}=dialog('Download personal data');
  box.append(elem('p','','Verify your identity to collect account, credit, conversation, creator and social records. Download the JSON and every media part for your content. Links expire after five minutes; verify again for fresh links. Keep downloads private. Very large exports require Support.'));
  const form=elem('form','lx-stack'),parts=elem('div','lp-export-parts');
  const password=securityPassword(form,'Confirm your LOOX password');
  const submit=elem('button','lx-button lx-primary','Verify and prepare downloads');submit.type='submit';
  const note=elem('p');note.setAttribute('role','status');form.append(submit,note);box.append(form,parts);
  const abort=new AbortController();d.addEventListener('close',()=>{abort.abort();parts.replaceChildren();},{once:true});
  let busy=false;
  form.onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;submit.disabled=true;parts.replaceChildren();msg(note,'Verifying and collecting your records…');
   const value=password.value;password.value='';
   try{
    const data=await api('export_account',{password:value});if(state.user?.id!==owner||!d.open)return;
    const {groupMedia,buildPrivateArchive}=await import('./privacy-data.js?v=settings-2-20261124');
    const authHost=new URL((await config()).url).hostname,groups=groupMedia(data.media||[],owner,authHost);
    savePrivateDownload(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'loox-personal-data-'+new Date().toISOString().slice(0,10)+'.json');
    groups.forEach((part,index)=>{
     const button=elem('button','lx-button',part.direct?'Download original '+part.files[0].key.split('/').pop():'Download media part '+(index+1)+' ('+part.files.length+' files)');button.type='button';parts.append(button);
     button.onclick=async()=>{
      if(busy)return;
      if(state.user?.id!==owner||Date.parse(data.media_links_expire_at)<=Date.now()){msg(note,'Account changed or links expired. Verify your password again.');return;}
      busy=true;submit.disabled=true;for(const item of parts.children)item.disabled=true;
      try{
       if(part.direct){const a=elem('a');a.href=part.files[0].url;a.rel='noreferrer noopener';a.download=part.files[0].key.split('/').pop();a.target='_blank';document.body.append(a);a.click();a.remove();msg(note,'Original-file download opened.');}
       else{
        const bytes=await buildPrivateArchive(data,part,{owner,currentUser:()=>state.user?.id,authHost,signal:abort.signal,progress:(n,total)=>msg(note,'Downloading media '+n+' of '+total+'…')});
        if(state.user?.id!==owner||!d.open)return;
        savePrivateDownload(new Blob([bytes],{type:'application/zip'}),'loox-media-part-'+(index+1)+'.zip');msg(note,'Media part '+(index+1)+' is ready. Download all remaining parts.');
       }
      }catch(error){msg(note,error.message||'Unable to download media. Verify again or contact Support.');}
      finally{busy=false;submit.disabled=false;for(const item of parts.children)item.disabled=false;}
     };
    });
    msg(note,groups.length?'Records JSON is ready. Download every media part below to include your original files.':'Personal-data JSON is ready. No private media files were found.');
   }catch(error){msg(note,error.message||'Unable to export personal data. Please use Support.');}finally{busy=false;submit.disabled=false;}
  };
 });
 byId('lp-sign-out').addEventListener('click',signOut);
 async function revoke(scope){
  const {dialog,field,msg}=await import('./account.js?v=auth-20261127');
  const owner=state.user?.id;if(!owner)return;
  const {box,d}=dialog(scope==='global'?'Sign out all devices':'Sign out other devices');
  box.append(elem('p','','Verify your identity to revoke sign-ins on the server. Previously issued access tokens may remain valid until expiry. Accounts with MFA must have completed authenticator verification.'));
  const form=elem('form','lx-stack'),password=securityPassword(form,'Current LOOX password');
  const submit=elem('button','lx-button lx-primary','Verify and sign out'),note=elem('p');submit.type='submit';note.role='status';form.append(submit,note);box.append(form);
  let pending=false;form.onsubmit=async event=>{event.preventDefault();if(pending)return;pending=true;submit.disabled=true;const value=password.value;password.value='';
   try{await api('revoke_sessions',{password:value,scope});if(state.user?.id!==owner)return;d.close();if(scope==='global'){await signOut();return;}byId('s2-session-status').textContent='Other sessions revoked. Access tokens expire at their normal expiry.';loadSecurity(true);}
   catch{msg(note,googleOnly()?'Verification could not be used. Verify with Google again, then retry.':'Unable to revoke sessions. Check your LOOX password and authenticator sign-in, then retry.');}finally{pending=false;submit.disabled=false;}
  };
 }
 byId('lp-sign-out-others').addEventListener('click',()=>revoke('others'));
 byId('s2-sign-out-all').addEventListener('click',()=>revoke('global'));
 const deleteDialog=byId('lp-delete-dialog');
 byId('lp-delete-open').addEventListener('click',()=>{if(!byId('lp-delete-open').disabled){const password=byId('lp-delete-password');password.required=!googleOnly();password.closest('label').hidden=googleOnly();let google=byId('lp-delete-google');if(!google){google=elem('button','lp-btn lp-btn-secondary','Verify with Google before deleting');google.id='lp-delete-google';google.type='button';google.onclick=()=>startGoogleSignIn({reauth:true,returnTo:location.href});deleteDialog.querySelector('form').prepend(google);}google.hidden=!googleOnly();deleteDialog.showModal();}});
 byId('lp-delete-cancel').addEventListener('click',()=>deleteDialog.close());
 deleteDialog.addEventListener('close',()=>{
  byId('lp-delete-form').reset();
  setStatus(byId('lp-delete-status'),'');
 });
 byId('lp-delete-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const password=byId('lp-delete-password').value;byId('lp-delete-password').value='';
  if((!password&&!googleOnly())||!byId('lp-delete-agree').checked)return;
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
