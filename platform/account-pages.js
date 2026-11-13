import {state,config,api,auth,refresh,signOut} from './account.js?v=10';
import {cloudRequest} from './profile-cloudflare.js?v=1';
const byId=id=>document.getElementById(id);
const elem=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const proposedPlans=[{id:'free',price_cents:0,credits:10,cadence:'signup'},{id:'creator',price_cents:1200,credits:100,cadence:'month'},{id:'creator_yearly',price_cents:12000,credits:1200,cadence:'year'},{id:'pro',price_cents:2900,credits:250,cadence:'month'},{id:'pro_yearly',price_cents:29000,credits:3000,cadence:'year'}];
const presentation={free:{name:'LOOX Basic',icon:'◇',eyebrow:'YOUR FIRST IDEAS',description:'Explore the studio and start creating for free.'},creator:{name:'LOOX Creator',icon:'✦',eyebrow:'FOR YOUR CREATIVE ROUTINE',description:'A flexible balance for images, motion and everyday ideas.'},pro:{name:'LOOX Pro',icon:'♛',eyebrow:'FOR YOUR BIGGEST IDEAS',description:'Premium video models and more room to experiment.'}};
let cadence='month',plansConfig=null,plansError=false;
const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(c/100);
function sameSiteReturn(){try{const raw=new URLSearchParams(location.search).get('from')||document.referrer;const target=new URL(raw,location.href);if(target.origin===location.origin&&target.pathname!==location.pathname)return target.pathname+target.search+target.hash;}catch{}return 'ai-home.html';}
const back=byId('lp-back');if(back)back.href=sameSiteReturn();
function setStatus(node,text,error=false){if(node){node.textContent=text;node.dataset.error=String(error);}}
function addNotice(text,tone){const n=byId('lp-billing-notice');if(n){n.textContent=text;n.dataset.tone=tone;}}
function planAction(button,notice,id){button.addEventListener('click',async()=>{if(!state.user){auth('login');return;}button.disabled=true;setStatus(notice,'Opening secure checkout…');try{const r=await api('checkout',{plan:id});const url=new URL(r.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.lemonsqueezy.com'))throw Error('Invalid checkout URL.');location.assign(url.href);}catch(e){setStatus(notice,e.message||'Checkout is unavailable.',true);button.disabled=false;}});}
function renderPlans(cfg,failed=false){
 const host=byId('lp-plan-grid');if(!host)return;
 const plans=cfg?.plans?.length?cfg.plans:proposedPlans,live=cfg?.billing===true;
 const current=state.account?.plan||'basic';host.replaceChildren();
 addNotice(failed?'Plan service is unavailable. Displayed prices are previews.':!live?'Plans are ready to explore. Secure checkout is awaiting merchant setup.':cfg?.testBilling?'Test checkout · No real payments.':'Secure checkout · USD prices. Applicable taxes are shown before payment.',live?'live':'preview');
 for(const id of ['free','creator','pro']){
  const key=id==='free'?id:id+(cadence==='year'?'_yearly':'');
  const p=plans.find(p=>p.id===key)||proposedPlans.find(p=>p.id===key),copy=presentation[id],featured=id==='creator';
  const card=elem('article','lp-plan'+(featured?' lp-plan-featured':''));card.dataset.plan=id;
  if(featured)card.append(elem('span','lp-featured-badge','MOST POPULAR'));
  card.append(elem('span','lp-tier-icon lp-tier-'+id,copy.icon),elem('div','lp-plan-label',copy.eyebrow),elem('h3','lp-plan-name',copy.name),elem('p','lp-plan-description',copy.description));
  const price=elem('div','lp-plan-price-row');price.append(elem('span','lp-plan-price',money(p.price_cents)),elem('span','lp-plan-period',id==='free'?'always free':cadence==='year'?'/ year':'/ month'));card.append(price);
  card.append(elem('p','lp-price-detail',id==='free'?'Automatically assigned after verified signup':cadence==='year'?money(p.price_cents/12)+' / month equivalent · billed yearly':'Billed monthly · cancel renewal anytime'));
  card.append(elem('div','lp-credit-allowance',p.credits.toLocaleString()+' credits'+(id==='free'?' to start':cadence==='year'?' per year':' per month')));
  const features=id==='free'?['10 signup credits after email verification','1 return credit every 12 hours; balance cap 10','Local image and video generation when online','Free browser tools, private creations and Basic badge']:id==='creator'?['Standard cloud video models + image models','Kling 4.0 Flash, Grok, MiniMax H3 and more','100 daily image / video submissions per category','Creator profile badge + local queue priority']:['All Creator features + premium video access','Kling 4.0, Seedance 2.5 and Veo 3.1','250 daily image / video submissions per category','Pro profile badge + highest local queue priority'];
  const list=elem('ul','lp-plan-features');for(const text of features)list.append(elem('li','',text));
  card.append(list,elem('p','lp-plan-small',id==='free'?'Rewards require a manual claim. First reward unlocks 12 hours after your first signed-in visit.':cadence==='year'?'All annual credits arrive after a successful annual payment.':'Credits arrive after each successful monthly payment.'));
  const examples=elem('div','lp-plan-estimates');examples.dataset.credits=p.credits;examples.dataset.tier=id==='free'?'basic':id;card.append(examples);
  const button=elem('button','lp-btn '+(featured?'lp-btn-primary':'lp-btn-secondary')),note=elem('p','lp-plan-small');button.type='button';note.setAttribute('role','status');
  if(state.user&&current===(id==='free'?'basic':id)){button.textContent='Your current plan';button.disabled=true;}
  else if(id==='free'){button.textContent=state.user?'Basic included':'Start creating free';button.disabled=Boolean(state.user);button.onclick=()=>auth('register');}
  else{const configured=live&&(!Array.isArray(cfg.checkoutPlans)||cfg.checkoutPlans.includes(key));button.textContent=configured?'Choose '+copy.name:'Checkout pending';button.disabled=!configured;planAction(button,note,key);}
  card.append(button,note);host.append(card);
 }
 renderEstimates(cfg);
}
function renderEstimates(cfg){
 const selector=byId('lp-estimate-model'),duration=byId('lp-estimate-duration');if(!selector||!duration)return;
 const models=cfg?.videoModels||[];
 if(!selector.options.length){for(const m of models.filter(m=>m.available)){const o=elem('option','',m.name+' · '+m.capabilities.resolution);o.value=m.id;selector.append(o);}if(!selector.options.length){const o=elem('option','','Video pricing unavailable');o.value='';selector.append(o);}}
 const model=models.find(m=>m.id===selector.value),previous=duration.value;duration.replaceChildren();
 for(const d of model?.durationOptions||[5]){const o=elem('option','',d+' seconds');o.value=d;duration.append(o);}if([...duration.options].some(o=>o.value===previous))duration.value=previous;
 const op=cfg?.operations?.find(o=>o.id==='generate')?.cost||3,cloudImage=cfg?.models?.find(m=>m.available),premiumImage=cloudImage?.cost||25;
 const videoCost=model?.creditCosts?.[duration.value],rank={basic:0,creator:1,pro:2};
 for(const target of document.querySelectorAll('.lp-plan-estimates')){
  const credits=Number(target.dataset.credits),tier=target.dataset.tier,allowed=rank[tier]>=rank[model?.minimumPlan||'creator'];target.replaceChildren();
  target.append(elem('strong','','Spend the whole balance on one option:'),elem('p','',Math.floor(credits/op).toLocaleString()+' local images · '+op+' credits each'));
  if(cloudImage)target.append(elem('p','',Math.floor(credits/premiumImage)+' '+cloudImage.name+' images · '+premiumImage+' credits each'));
  target.append(elem('p','',!model?'Video estimates load with live model prices':!allowed?'Selected video requires LOOX '+(model.minimumPlan==='pro'?'Pro':'Creator'):Math.floor(credits/videoCost)+' × '+duration.value+'s videos · '+videoCost+' credits each'));
 }
 byId('lp-estimate-note').textContent=model?'Counts are alternatives from the same balance, not combined allowances. '+model.name+': '+videoCost+' credits per '+duration.value+'s clip at '+model.capabilities.resolution+'. Local generation depends on GPU availability.':'Counts use the same shared credit balance. Live video prices could not be loaded.';
}
if(document.body.hasAttribute('data-account-upgrade')){
 const controls=elem('div','lp-billing-toggle');controls.setAttribute('aria-label','Billing period');
 for(const [value,label] of [['month','Monthly'],['year','Yearly · save ~17%']]){const b=elem('button','',label);b.type='button';b.setAttribute('aria-pressed',String(cadence===value));b.onclick=()=>{cadence=value;for(const item of controls.children)item.setAttribute('aria-pressed',String(item===b));renderPlans(plansConfig,plansError);};controls.append(b);}
 byId('lp-plan-grid').before(controls);
 renderPlans(null);config().then(c=>{plansConfig=c;renderPlans(c);}).catch(()=>{plansError=true;renderPlans(null,true);});
 for(const name of ['loox-user','loox-account'])document.addEventListener(name,()=>renderPlans(plansConfig,plansError));
 for(const id of ['lp-estimate-model','lp-estimate-duration'])byId(id)?.addEventListener('change',()=>renderEstimates(plansConfig));
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
 byId('lp-plan-info').textContent=(plan==='pro'?'LOOX Pro':plan==='creator'?'LOOX Creator':'LOOX Basic')+
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
