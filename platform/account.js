const endpoint='https://looxtoolfree-backend.vercel.app/api/loox';
export const terms='2026-11';
export const labels={fill:'Generative Fill',background:'Background removal',upscale2:'2× upscale',upscale4:'4× upscale',erase:'Object eraser',generate:'Text to image',generate_video:'Text to video',enhance:'Image enhancer',uncrop:'Generative uncrop',restore:'Old photo restorer',retouch:'Skin retoucher',face_restore:'Face restoration',face_swap:'Face swap'};
const proposal=[{id:'free',price_cents:0,credits:25},{id:'creator',price_cents:1200,credits:500},{id:'pro',price_cents:2900,credits:1500},{id:'business',price_cents:6900,credits:4000}];
const planName={basic:'LOOX Basic',free:'LOOX Basic',creator:'LOOX Creator',creator_yearly:'LOOX Creator',pro:'LOOX Pro',pro_yearly:'LOOX Pro',business:'LOOX Business',business_yearly:'LOOX Business',lifetime:'Legacy Lifetime'};
export const state={config:null,client:null,user:null,account:null};
let loading,library,clientReady,modal,refreshTask,accountError='';
export function el(tag,text,cls){
 const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;
}
export function button(label,fn,cls='lx-button'){
 const b=el('button',label,cls);b.type='button';b.onclick=fn;return b;
}
function link(label,href){const a=el('a',label);a.href=href;return a;}
export function msg(node,text){node.textContent=text;node.hidden=!text;}
export async function config(){
 if(!loading)loading=fetch(endpoint+'?action=config',{signal:AbortSignal.timeout(20000),credentials:'omit'}).then(async r=>{
  if(!r.ok)throw Error();state.config=await r.json();return state.config;
 }).catch(()=>{loading=null;throw Error('The LOOX account service is unavailable. Please try again later.');});
 return loading;
}
const rememberKey='loox-auth-storage',sessionKey='loox-account-v1';
function store(){return localStorage.getItem(rememberKey)==='session'?sessionStorage:localStorage;}
async function sdk(){
 if(!library)library=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('../vendor/supabase-2.118.0.js',import.meta.url);s.onload=resolve;s.onerror=()=>{library=null;reject(Error('Account library could not load.'));};document.head.append(s);});
 await library;
}
async function client(){
 const cfg=await config();if(!cfg.auth)throw Error('Account setup is pending. Free browser tools are available.');
 if(!clientReady)clientReady=(async()=>{
  await sdk();const api=window.supabase.createClient(cfg.url,cfg.key,{auth:{storage:{getItem:k=>store().getItem(k),setItem:(k,v)=>store().setItem(k,v),removeItem:k=>store().removeItem(k)},storageKey:sessionKey,flowType:'pkce',detectSessionInUrl:true}});
  state.client=api;
  api.auth.onAuthStateChange((event,session)=>{
   const changed=state.user?.id!==session?.user?.id;
   state.user=session?.user||null;
   if(changed){state.account=null;accountError='';renderHeader();document.dispatchEvent(new Event('loox-user'));}
   if(event==='PASSWORD_RECOVERY')setTimeout(()=>auth('reset'),0);
   if(session&&changed)setTimeout(()=>refresh().catch(()=>{}),0);
  });
  const {data,error}=await api.auth.getSession();if(error)throw error;
  state.user=data.session?.user||null;return api;
 })().catch(e=>{clientReady=null;throw e;});
 return clientReady;
}
export async function api(action,body,extra={}){
 const c=await client(),{data}=await c.auth.getSession();if(!data.session)throw Error('Sign in to continue.');
 const r=await fetch(endpoint+'?'+new URLSearchParams({action,...extra}),{method:body==null?'GET':'POST',credentials:'omit',
  headers:{Authorization:'Bearer '+data.session.access_token,...(body==null?{}:{'Content-Type':'application/json'})},body:body==null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(action==='cloud_job'?115000:60000)});
 const result=await r.json().catch(()=>({}));if(!r.ok){const e=Error(result.error||'Request failed. Please retry.');e.status=r.status;throw e;}return result;
}
export async function refresh(){
 if(!state.user)return;
 if(!refreshTask){const id=state.user.id;refreshTask=api('account').then(data=>{if(state.user?.id!==id)return;state.account=data;accountError='';renderHeader();document.dispatchEvent(new Event('loox-account'));}).catch(e=>{accountError=e.message||'Could not load your account.';document.dispatchEvent(new Event('loox-account'));throw e;}).finally(()=>{refreshTask=null;});}
 return refreshTask;
}
export function dialog(title){
 modal?.close();const d=el('dialog',null,'lx lx-modal'),head=el('header',null,'lx-modal-head'),h=el('h2',title);h.id='lx-dialog-title';d.setAttribute('aria-labelledby',h.id);
 const close=button('×',()=>d.close(),'lx-close');close.setAttribute('aria-label','Close dialog');head.append(h,close);
 const box=el('div',null,'lx-stack');d.append(head,box);document.body.append(d);
 d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();modal=d;return {box,d};
}
export function field(parent,title,type='text',opts={}){
 const wrap=el('label',null,'lx-field'),caption=el('span',title),input=el('input');input.type=type;Object.assign(input,opts);wrap.append(caption,input);parent.append(wrap);return input;
}
function friendlyAuthError(err){
 const code=String(err?.code||'').toLowerCase(),message=String(err?.message||'');
 if(code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(message))return 'The verification email limit for LOOX Tools has been reached. Please do not try another email or register repeatedly. If you already verified your account, use Sign in instead. Email delivery will resume when the provider limit resets or when LOOX configures custom email sending.';
 if(code==='email_address_not_authorized'||/email address not authorized/i.test(message))return 'Email signup is temporarily restricted by the email provider. LOOX must configure custom SMTP before registering other addresses.';
 if(code==='email_exists'||code==='user_already_exists'||/already registered/i.test(message))return 'That email may already have an account. Choose Sign in instead of registering again.';
 if(code==='invalid_credentials'||/invalid login credentials/i.test(message))return 'The email or password is incorrect. If you already verified your email, try signing in with the password you used at registration; otherwise use Forgot password.';
 return message||'The account request failed. Please try again later.';
}
function withStatus(form,submit,status,call){
 form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;msg(status,'');try{await call();}catch(err){msg(status,friendlyAuthError(err));}finally{submit.disabled=false;}};
}
export function auth(mode='login'){
 const titles={login:'Welcome back',register:'Create your LOOX account',forgot:'Forgot your password?',reset:'Choose a new password'};
 const {box,d}=dialog(titles[mode]);const form=el('form',null,'lx-stack');box.append(form);
 const reg=mode==='register', reset=mode==='reset', forgot=mode==='forgot';
 const full=reg&&field(form,'Full name','text',{required:true,maxLength:80,autocomplete:'name'});
 const email=!reset&&field(form,'Email address','email',{required:true,autocomplete:'email',maxLength:254});
 const pass=!forgot&&field(form,reset?'New password':'Password','password',{required:true,minLength:reg||reset?12:1,maxLength:128,autocomplete:reg||reset?'new-password':'current-password'});
 const confirm=(reg||reset)&&field(form,'Confirm password','password',{required:true,autocomplete:'new-password'});
 if(pass){
  const show=button('Show password',()=>{pass.type=pass.type==='text'?'password':'text';if(confirm)confirm.type=pass.type;show.textContent=pass.type==='text'?'Hide password':'Show password';},'lx-link');
  form.append(show);
 }
 if(confirm){const strength=el('small','Use at least 12 characters, including a letter and a number.');form.append(strength);pass.oninput=()=>{strength.textContent=strong(pass.value)?'Password meets the requirements.':'Use at least 12 characters, including a letter and a number.';};}
 function check(text,checked=false){const l=el('label',null,'lx-check'),c=el('input');c.type='checkbox';c.checked=checked;l.append(c,text);form.append(l);return c;}
 let agreement;
 if(reg){const span=el('span','I agree to the ');const t=link('Terms','terms.html'),p=link('Privacy Policy','privacy-policy.html');t.target=p.target='_blank';span.append(t,' and ',p,'.');agreement=check(span);agreement.required=true;}
 const remember=mode==='login'&&check('Remember me on this device',true);
 const submit=el('button',({register:'Create account',login:'Sign in',forgot:'Send recovery email',reset:'Save password'})[mode],'lx-button lx-primary');
 const note=el('p',null,'lx-note');note.setAttribute('role','status');form.append(submit,note);
 if(!reset){
  if(mode!=='login')box.append(button('Already have an account? Sign in',()=>auth(),'lx-link'));
  if(mode==='login')box.append(button('Create an account',()=>auth('register'),'lx-link'),button('Forgot password?',()=>auth('forgot'),'lx-link'));
 }
 config().then(cfg=>{if(!cfg.auth){submit.disabled=true;msg(note,'Account setup is pending. You can still use all free browser tools.');}}).catch(e=>msg(note,e.message));
 withStatus(form,submit,note,async()=>{
  if(confirm&&(!strong(pass.value)||pass.value!==confirm.value))throw Error('Use a stronger password and make sure both passwords match.');
  if(remember)localStorage.setItem(rememberKey,remember.checked?'local':'session');
  const c=await client(),redirect=new URL('account.html',document.baseURI);
  let result;
  if(reg){result=await c.auth.signUp({email:email.value.trim(),password:pass.value,options:{emailRedirectTo:redirect.href,data:{full_name:full.value.trim(),loox_terms:terms}}});}
  else if(forgot){redirect.searchParams.set('flow','recovery');result=await c.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:redirect.href});}
  else if(reset){result=await c.auth.updateUser({password:pass.value});}
  else result=await c.auth.signInWithPassword({email:email.value.trim(),password:pass.value});
  if(result.error)throw result.error;
  if(forgot||reg){
   form.replaceChildren(el('p',forgot?'If this email has an account, check your inbox for a recovery link. Only request another email if needed.':'Registration was submitted. Check your inbox for a verification link. After verifying, return to the LOOX website and choose Sign in with the same email and password. Do not register a second time.'));
   if(reg)form.append(button('I already verified my email · Sign in',()=>auth('login'),'lx-button lx-primary'));
   return;
  }
  if(reset){await c.auth.signOut();history.replaceState(null,'','account.html');auth();return;}
  d.close();await refresh();
 });
}
function strong(p){return p.length>=12&&/[a-z]/i.test(p)&&/\d/.test(p);}
// Shared, compact account header for every LOOX page with [data-loox-account].
// Personal information is visible only after opening the profile avatar.
export function renderHeader(){
 for(const host of document.querySelectorAll('[data-loox-account]')){
  host.replaceChildren();
  host.classList.add('lx-controls','lx-account-header');
  const signedIn=Boolean(state.user);
  const balance=state.account?.wallet?.balance;
  const credit=el('span',null,'lx-credit-chip lx-credit-readonly');
  credit.setAttribute('aria-label',signedIn?'Available AI credits':'Sign in to view your credits');
  credit.append(el('span','Credit','lx-credit-label'),
    el('span',' - ','lx-credit-divider'),
    el('strong',signedIn?(Number.isFinite(Number(balance))?String(balance):'…'):'0','lx-credit-value'));
  host.append(credit);
  const upgrade=button('Upgrade',pricing,'lx-button lx-primary lx-upgrade');
  upgrade.setAttribute('aria-label','View LOOX upgrade plans');
  host.append(upgrade);
  const rewardSlot=el('div',null,'lx-header-reward');rewardSlot.dataset.looxReward='';host.append(rewardSlot);
  const details=el('details',null,'lx-details lx-profile-details');
  const summary=el('summary',null,'lx-profile-trigger');
  summary.setAttribute('aria-label',signedIn?'Open your account menu':'Sign in or create an account');
  summary.setAttribute('title',signedIn?'Account':'Sign in');
  const name=String(state.account?.profile?.name||state.user?.user_metadata?.full_name||state.user?.email?.split('@')[0]||'Account').trim()||'Account';
  const initial=(signedIn?name:'?').slice(0,1).toUpperCase();
  const avatar=el('span',initial,'lx-avatar');
  avatar.setAttribute('aria-hidden','true');
  summary.append(avatar);
  const menu=el('nav',null,'lx-menu lx-profile-menu');
  menu.setAttribute('aria-label','Account options');
  if(signedIn){
   const identity=el('div',null,'lx-profile-identity');
   identity.append(el('strong',name,'lx-profile-name'));
   identity.append(el('span',({basic:'◇ Basic',creator:'✦ Creator',pro:'♛ Pro',business:'◆ Business'})[state.account?.plan]||'◇ Basic','lx-plan-badge'));
   const reward=el('div',null,'lx-return-reward');reward.dataset.looxReward='';identity.append(reward);
   identity.append(el('small',state.user.email||'','lx-profile-email'));
   menu.append(identity);
   const links=el('div',null,'lx-profile-links');
   for(const [id,label] of sections){if(['credits','subscription','history'].includes(id))continue;links.append(link(label,id==='settings'?'settings.html':'account.html#'+id));}
   menu.append(button('Authenticator security',()=>{details.open=false;authenticator();},'lx-button'));
   menu.append(links,link('Billing & Credits','settings.html#billing'));
   const signOutButton=button('Sign out',signOut,'lx-link lx-profile-signout');
   menu.append(signOutButton);
  }else{
   menu.append(el('div','Welcome to LOOX','lx-profile-identity'));
   menu.append(button('Sign in',()=>{details.open=false;auth('login');},'lx-button lx-primary lx-profile-auth'));
   menu.append(button('Create account',()=>{details.open=false;auth('register');},'lx-button lx-profile-auth'));
  }
  details.append(summary,menu);
  host.append(details);
 }
}
if(typeof document!=='undefined')document.addEventListener('pointerdown',event=>{
 if(event.target.closest('.lx-profile-details'))return;
 document.querySelectorAll('.lx-profile-details[open]').forEach(node=>{node.open=false;});
});
if(typeof document!=='undefined')document.addEventListener('keydown',event=>{
 if(event.key==='Escape')document.querySelectorAll('.lx-profile-details[open]').forEach(node=>{node.open=false;});
});
export async function signOut(){try{const c=await client();const {error}=await c.auth.signOut();if(error)throw error;location.assign('index.html');}catch(e){dialog('Sign out').box.append(el('p',e.message));}}
const sections=[['profile','Account Overview'],['credits','My Credits'],['subscription','Subscription'],['history','Transaction History'],['settings','Account Settings']];
function money(cents){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);}
export async function plans(host){host.replaceChildren(el('p','Explore LOOX Basic, Creator, Pro and Business with monthly billing.'),button('Compare plans and generation counts',pricing,'lx-button lx-primary'));}
export function nextAccountUrl(page){
 const current=(location.pathname.split('/').pop()||'index.html')+location.search+location.hash;
 return page+'?from='+encodeURIComponent(current);
}
export async function authenticator(){const {openMFA}=await import('./billing/mfa.js?v=2');return openMFA({client,dialog,el,button,refresh});}
export async function buyCredits(){
 if(!document.querySelector('link[data-recharge-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./billing/recharge.css',import.meta.url).href;css.dataset.rechargeStyle='';document.head.append(css);}
 const {openRecharge}=await import('./billing/recharge.js?v=1');return openRecharge({state,api,config,auth,dialog,el,button,refresh});
}
export function pricing(){location.assign(nextAccountUrl('upgrade.html'));}
export async function initialize({publicAccess=false,waitForAccount=true}={}){
 renderHeader();
 const accountPage=!!document.querySelector('[data-dashboard],[data-upgrade-page],[data-settings-page]');
 if(publicAccess||accountPage||store().getItem(sessionKey)||location.search.includes('code=')){
  try{await client();renderHeader();if(state.user&&waitForAccount)await refresh();}catch(e){if(accountPage){accountError=e.message||'Unable to load your account.';msg(document.querySelector('[data-account-note]'),accountError);}}
 }
 if(accountPage)drawDashboard();
 const planHost=document.querySelector('[data-pricing]');if(planHost)plans(planHost);
}
function drawDashboard(){
 const host=document.querySelector('[data-dashboard]');if(!host)return;host.replaceChildren();
 if(!state.user){host.append(el('p','Sign in to see your credits, AI jobs and billing history.'),button('Sign in',()=>auth()));return;}
 if(!state.account){host.append(el('p',accountError||'Loading your account…'),button('Retry',()=>{accountError='';drawDashboard();client().then(()=>refresh()).catch(e=>{accountError=e.message||'Unable to load account.';drawDashboard();});},'lx-button'));return;}
 const a=state.account;
 const nav=el('nav',null,'lx-tabs');for(const [id,label] of sections)nav.append(link(label,id==='settings'?nextAccountUrl('settings.html'):'#'+id));host.append(nav);
 function section(id,title){const s=el('section',null,'lx-card');s.id=id;s.append(el('h2',title));host.append(s);return s;}
 section('profile','Account overview').append(el('h3','Welcome, '+a.profile.name),el('p',a.jobs.length+' recent AI actions'),el('p',a.profile.name+' · '+state.user.email),el('p','Plan · '+planName[a.plan]));
 section('credits','My credits').append(el('strong',a.wallet.balance+' available credits','lx-price'),link('Manage Billing & Credits →','settings.html#billing'));
 const jobs=section('usage','Recent AI jobs');if(!a.jobs.length)jobs.append(el('p','No AI jobs yet.'));
 for(const j of a.jobs){const row=el('div',null,'lx-row');row.append(el('span',labels[j.operation]+' · '+j.state));
 if(j.state!=='failed')row.append(button(j.state==='succeeded'?'Open result':'Check status',async()=>{try{const result=await api('status',null,{id:j.id});if(result.url){const d=dialog('Your private result');d.box.append(link('Open PNG',result.url));}await refresh();}catch(e){msg(document.querySelector('[data-account-note]'),e.message);}},'lx-link'));jobs.append(row);}
 const sub=section('subscription','Subscription');sub.append(el('p',a.subscriptions.map(s=>s.status+(s.ends_at?' · ends '+new Date(s.ends_at).toLocaleDateString():'')).join(', ')||planName[a.plan]),button('Upgrade',pricing));
 if(a.subscriptions.length)sub.append(button('Manage or cancel subscription',async()=>{try{location.assign((await api('portal',{})).url);}catch(e){msg(document.querySelector('[data-account-note]'),e.message);}}));
 const history=section('history','Transaction history');
 for(const item of a.credits)history.append(el('p',new Date(item.created_at).toLocaleString()+' · '+item.reason+' · '+(item.amount>0?'+':'')+item.amount+' credits'));
 for(const p of a.payments)history.append(el('p',planName[p.plan]+' · '+money(p.amount_cents)+' · '+p.status));
 api('recharge_history').then(data=>{if(!history.isConnected)return;for(const p of data.items)history.append(el('p',p.package_id+' · '+money(p.amount_cents)+' · '+p.status+' · '+p.reference));}).catch(()=>history.append(el('p','Recharge history is temporarily unavailable.')));
 const settings=section('settings','Account settings');
 settings.append(el('p','Update your display name, security and account preferences on the dedicated settings page.'));
 settings.append(link('Open account settings →',nextAccountUrl('settings.html')),button('Authenticator security',authenticator));
 if(state.user?.app_metadata?.loox_template_admin===true)settings.append(link('Financial dashboard →','billing-admin.html'));

}
if(typeof document!=='undefined'){
document.addEventListener('loox-account',drawDashboard);
document.addEventListener('loox-user',drawDashboard);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user)refresh().catch(()=>{});});
if(location.search.includes('payment=return')){const note=document.querySelector('[data-account-note]');if(note)msg(note,'Checkout returned. Credits appear once the payment provider confirms payment.');}
initialize();
}

import './return-rewards.js?v=1';
