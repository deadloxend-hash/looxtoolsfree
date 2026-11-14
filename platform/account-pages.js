import {state,config,api,auth,refresh,signOut,buyCredits} from './account.js?v=12';
import {cloudRequest} from './profile-cloudflare.js?v=1';
const byId=id=>document.getElementById(id);
const elem=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const proposedPlans=[{id:'free',price_cents:0,credits:25,cadence:'signup'},{id:'creator',price_cents:1200,credits:500,cadence:'month'},{id:'creator_yearly',price_cents:12000,credits:6000,cadence:'year'},{id:'pro',price_cents:2900,credits:1500,cadence:'month'},{id:'pro_yearly',price_cents:29000,credits:18000,cadence:'year'},{id:'business',price_cents:6900,credits:4000,cadence:'month'},{id:'business_yearly',price_cents:69000,credits:48000,cadence:'year'}];
const presentation={business:{name:'LOOX Business',icon:'◆',eyebrow:'FOR TEAMS & HIGHER VOLUME',description:'For teams and power users who need higher creative volume.'},free:{name:'LOOX Basic',icon:'◇',eyebrow:'YOUR FIRST IDEAS',description:'Free forever. Try AI images and basic creative tools.'},creator:{name:'LOOX Creator',icon:'✦',eyebrow:'FOR YOUR CREATIVE ROUTINE',description:'For everyday creators. Make more images and explore motion.'},pro:{name:'LOOX Pro',icon:'♛',eyebrow:'FOR YOUR BIGGEST IDEAS',description:'A bigger creative allowance and premium video models.'}};
let cadence='month',plansConfig=null,plansError=false;
const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(c/100);
function sameSiteReturn(){try{const raw=new URLSearchParams(location.search).get('from')||document.referrer;const target=new URL(raw,location.href);if(target.origin===location.origin&&target.pathname!==location.pathname)return target.pathname+target.search+target.hash;}catch{}return 'ai-home.html';}
const back=byId('lp-back');if(back)back.href=sameSiteReturn();
function setStatus(node,text,error=false){if(node){node.textContent=text;node.dataset.error=String(error);}}
function addNotice(text,tone){const n=byId('lp-billing-notice');if(n){n.textContent=text;n.dataset.tone=tone;}}
function planAction(button,notice,id){button.addEventListener('click',async()=>{if(!state.user){auth('login');return;}button.disabled=true;setStatus(notice,'Opening secure checkout…');try{const r=await api('checkout',{plan:id});const url=new URL(r.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.lemonsqueezy.com'))throw Error('Invalid checkout URL.');location.assign(url.href);}catch(e){setStatus(notice,e.message||'Checkout is unavailable.',true);button.disabled=false;}});}
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
  else{const configured=live&&(!Array.isArray(cfg.checkoutPlans)||cfg.checkoutPlans.includes(key));button.textContent=configured?'Choose '+copy.name:'Secure checkout coming soon';button.disabled=!configured;planAction(button,note,key);}
  card.append(elem('div','lp-plan-grow'),button,note);host.append(card);
 }
 renderEstimates(cfg);
}
function renderEstimates(cfg){
 const selector=byId('lp-estimate-model'),duration=byId('lp-estimate-duration');if(!selector||!duration)return;
 const models=cfg?.videoModels||[];
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
  target.append(elem('p','',!model?'Video estimates load with live model prices':!allowed?'Selected video requires LOOX '+(model.minimumPlan==='pro'?'Pro':'Creator'):Math.floor(credits/videoCost)+' × '+duration.value+'s videos · '+videoCost+' credits each'));
 }
 byId('lp-estimate-note').textContent=model?'Counts are alternatives from the same balance, not combined allowances. '+model.name+': '+videoCost+' credits per '+duration.value+'s clip at '+model.capabilities.resolution+'. Local generation depends on GPU availability.':'Counts use the same shared credit balance. Live video prices could not be loaded.';
}
if(document.body.hasAttribute('data-account-upgrade')){
 const buy=byId('lp-buy-credits');if(buy)buy.onclick=buyCredits;
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
 const balance=Number(account.wallet?.balance);
 byId('lp-billing-balance').textContent=Number.isFinite(balance)?balance.toLocaleString():'Unavailable';
 byId('lp-billing-plan').textContent=billingNames[tier]||'Existing plan';
 byId('lp-billing-plan-status').textContent=active?'Subscription · '+String(active.status).replace(/_/g,' '):'No active paid subscription';
 byId('lp-billing-allocation').textContent=annual?'—':(monthlyCredits[tier]??'—').toLocaleString();
 byId('lp-billing-allocation-note').textContent=annual?'Existing annual plan · review your subscription':tier==='free'||tier==='basic'?'One-time signup credits':'Credits per paid month';
 const enabled=state.config?.billing===true;
 byId('lp-billing-status').textContent=enabled?'Secure billing is configured. Check your subscription status before managing payments.':'Payments are not active yet. Recharge and subscription checkout are coming soon.';
 const portal=byId('lp-billing-portal');portal.disabled=!enabled||!active;
 portal.title=portal.disabled?'Subscription portal available after billing setup and an active subscription':'Manage or cancel your subscription securely';
 const credits=(Array.isArray(account.credits)?account.credits:[]).slice(0,25).map(item=>
  [recordDate(item.created_at),item.reason||'Credit activity',Number(item.amount)>0?'+':null,Number(item.amount||0).toLocaleString()+' credits'].filter(Boolean).join(' · '));
 historyRows('lp-billing-credit-history',credits,'No credit activity to display.');
 const payments=(Array.isArray(account.payments)?account.payments:[]).slice(0,20).map(item=>
  [recordDate(item.created_at),billingNames[item.plan]||item.plan||'Subscription',money(Number(item.amount_cents||0)),item.status||'Pending'].filter(Boolean).join(' · '));
 if(rechargeItems)for(const item of rechargeItems.slice(0,20))payments.push(
  [recordDate(item.created_at),item.package_id||'Credit recharge',money(Number(item.amount_cents||0)),item.status||'Pending'].filter(Boolean).join(' · '));
 if(rechargeError)payments.push(rechargeError);
 historyRows('lp-billing-transaction-history',payments,rechargeItems===null?'Loading recharge history…':'No transactions to display.');
 fetchRechargeHistory();
 if(location.hash==='#billing'&&!document.body.dataset.billingAnchored){
  document.body.dataset.billingAnchored='true';
  requestAnimationFrame(()=>byId('billing')?.scrollIntoView({block:'start',behavior:'instant'}));
 }
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
 byId('lp-plan-info').textContent=(plan==='business'?'LOOX Business':plan==='pro'?'LOOX Pro':plan==='creator'?'LOOX Creator':'LOOX Basic')+
  ' · '+(state.account.wallet?.balance??'…')+' available credits';
 renderBilling();
}
if(document.body.hasAttribute('data-settings-page')){
 document.addEventListener('loox-user',renderSettings);
 document.addEventListener('loox-account',renderSettings);
 renderSettings();
 byId('lp-settings-login').addEventListener('click',()=>auth('login'));
 byId('lp-billing-recharge').addEventListener('click',()=>buyCredits());
 byId('lp-billing-portal').addEventListener('click',async()=>{
  const trigger=byId('lp-billing-portal'),status=byId('lp-billing-status');
  if(trigger.disabled||!state.config?.billing)return;
  trigger.disabled=true;setStatus(status,'Opening your secure subscription portal…');
  try{
   const result=await api('portal',{}),url=new URL(result.url);
   if(url.protocol!=='https:'||!(url.hostname==='lemonsqueezy.com'||url.hostname.endsWith('.lemonsqueezy.com')))throw Error('Unexpected billing portal address.');
   location.assign(url.href);
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
 const languages=[
  ['en','English'],['es','Español'],['pt-BR','Português'],['fr','Français'],['de','Deutsch'],
  ['it','Italiano'],['pl','Polski'],['ja','日本語'],['zh-CN','简体中文'],['ko','한국어'],
  ['tr','Türkçe'],['id','Bahasa Indonesia'],['vi','Tiếng Việt'],['hu','Magyar'],
  ['fi','Suomi'],['cs','Čeština'],['nb','Norsk Bokmål'],['da','Dansk'],
  ['ar','العربية'],['sk','Slovenčina'],['sl','Slovenščina'],['sv','Svenska'],
  ['uk','Українська'],['lv','Latviešu'],['et','Eesti'],['bg','Български']
 ];
 const language=byId('lp-language');
 for(const [code,label] of languages){
  const option=document.createElement('option');option.value=code;option.textContent=label;language.append(option);
 }
 const readPrefs=()=>{try{const p=JSON.parse(localStorage.getItem('loox-platform-prefs')||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{}}catch{return{}}};
 const old=readPrefs();
 const theme=byId('lp-theme');
 theme.value=['dark','light','system'].includes(old.theme)?old.theme:'dark';
 const preferredLang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('loox-language')||'en';
 language.value=languages.some(([code])=>code===preferredLang)?preferredLang:'en';
 byId('lp-accent').value=/^#[0-9a-f]{6}$/i.test(old.accent||'')?old.accent:'#a791ff';
 byId('lp-password-length').value=Number.isFinite(Number(old.passwordLength))?Math.max(12,Math.min(128,Number(old.passwordLength))):24;
 byId('lp-image-format').value=['image/png','image/jpeg','image/webp'].includes(old.imageFormat)?old.imageFormat:'image/png';
 byId('lp-live-preview').checked=old.livePreview!==false;
 byId('lp-preferences-form').addEventListener('submit',event=>{
  event.preventDefault();
  const values={
   theme:theme.value,
   accent:byId('lp-accent').value,
   livePreview:byId('lp-live-preview').checked,
   passwordLength:Math.max(12,Math.min(128,Number(byId('lp-password-length').value)||24)),
   imageFormat:byId('lp-image-format').value
  };
  const status=byId('lp-theme-status');
  try{
   localStorage.setItem('loox-platform-prefs',JSON.stringify(values));
   localStorage.setItem('loox-language',language.value);
   const light=values.theme==='light'||(values.theme==='system'&&matchMedia('(prefers-color-scheme:light)').matches);
   localStorage.setItem('loox-theme-v1',light?'white':'dark');
   window.dispatchEvent(new CustomEvent('looxpreferenceschange',{detail:values}));
   setStatus(status,'Preferences saved. Your supported LOOX pages will use them.');
  }catch{setStatus(status,'Unable to save your preferences on this device.',true);}
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
