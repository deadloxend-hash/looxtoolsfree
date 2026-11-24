import {syncAccountAvatar} from './account-avatar.js?v=settings-2-20261124';
const endpoint='https://looxtoolfree-backend.vercel.app/api/loox';
export const terms='2026-11';
export const labels={fill:'Generative Fill',background:'Background removal',upscale2:'2× upscale',upscale4:'4× upscale',erase:'Object eraser',generate:'Text to image',generate_video:'Text to video',enhance:'Image enhancer',uncrop:'Generative uncrop',restore:'Old photo restorer',retouch:'Skin retoucher',face_restore:'Face restoration',face_swap:'Face swap'};
const proposal=[{id:'free',price_cents:0,credits:25},{id:'creator',price_cents:1200,credits:500},{id:'pro',price_cents:2900,credits:1500},{id:'business',price_cents:6900,credits:4000}];
const planName={basic:'LOOX Basic',free:'LOOX Basic',creator:'LOOX Creator',creator_yearly:'LOOX Creator',pro:'LOOX Pro',pro_yearly:'LOOX Pro',business:'LOOX Business',business_yearly:'LOOX Business',lifetime:'Legacy Lifetime'};
export const state={config:null,client:null,user:null,account:null};
let loading,library,clientReady,modal,refreshTask,previousIdentity=null,accountError='';
export function el(tag,text,cls){
 const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;
}
export function button(label,fn,cls='lx-button'){
 const b=el('button',label,cls);b.type='button';b.onclick=fn;return b;
}
function link(label,href){const a=el('a',label);a.href=href;return a;}
export function msg(node,text){if(!node)return;node.textContent=text;node.hidden=!text;}
export async function config(){
 if(!loading)loading=fetch(endpoint+'?action=config',{signal:AbortSignal.timeout(20000),credentials:'omit'}).then(async r=>{
  if(!r.ok)throw Error();state.config=await r.json();if(typeof document!=='undefined')document.dispatchEvent(new Event('loox-config'));return state.config;
 }).catch(()=>{loading=null;throw Error('The LOOX account service is unavailable. Please try again later.');});
 return loading;
}
const rememberKey='loox-auth-storage',sessionKey='loox-account-v1',recentAccountsKey='loox-recent-accounts-v1';
function recentAccounts(){
 try{
  const parsed=JSON.parse(localStorage.getItem(recentAccountsKey)||'[]');
  if(!Array.isArray(parsed))return [];
  return [...new Set(parsed.filter(value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)).map(value=>value.toLowerCase()))].slice(0,5);
 }catch{return [];}
}
function rememberRecentAccount(email){
 const value=String(email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)||value.length>254)return;
 try{localStorage.setItem(recentAccountsKey,JSON.stringify([value,...recentAccounts().filter(e=>e!==value)].slice(0,5)));}
 catch{/* Blocked storage must not prevent a login. */}
}

function store(){return localStorage.getItem(rememberKey)==='session'?sessionStorage:localStorage;}
function hasStoredSession(){return Boolean(localStorage.getItem(sessionKey)||sessionStorage.getItem(sessionKey));}
const authStorage={getItem:k=>localStorage.getItem(k)??sessionStorage.getItem(k),setItem:(k,v)=>{const target=store();target.setItem(k,v);(target===localStorage?sessionStorage:localStorage).removeItem(k);},removeItem:k=>{localStorage.removeItem(k);sessionStorage.removeItem(k);}};
async function sdk(){
 if(!library)library=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('../vendor/supabase-2.118.0.js',import.meta.url);const timer=setTimeout(()=>{library=null;s.remove();reject(Error('Account library timed out. Check your connection and retry.'));},15000);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);library=null;reject(Error('Account library could not load.'));};document.head.append(s);});
 await library;
}
async function client(){
 const cfg=await config();if(!cfg.auth)throw Error('Account setup is pending. Free browser tools are available.');
 if(!clientReady)clientReady=(async()=>{
  await sdk();const api=window.supabase.createClient(cfg.url,cfg.key,{auth:{storage:authStorage,storageKey:sessionKey,flowType:'pkce',detectSessionInUrl:true}});
  state.client=api;
  api.auth.onAuthStateChange((event,session)=>{
   const changed=state.user?.id!==session?.user?.id;
   state.user=session?.user||null;
   if(changed){
    // Shared-device drafts must never transfer to the next signed-in account.
    if(previousIdentity && previousIdentity!==session?.user?.id){
     try{for(const key of ['loox-image-generator-draft-v2','loox-creative-launch-v1'])sessionStorage.removeItem(key);}catch{/* Reload still clears private in-memory state when storage is unavailable. */}
     location.reload();
    }
    previousIdentity=session?.user?.id||null;
    state.account=null;accountError='';renderHeader();document.dispatchEvent(new Event('loox-user'));}
   if(event==='PASSWORD_RECOVERY')setTimeout(()=>auth('reset'),0);
   if(session&&changed)setTimeout(()=>refresh().catch(()=>{}),0);
  });
  const {data,error}=await Promise.race([api.auth.getSession(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Session restoration timed out. Check your connection and retry.')),15000))]);if(error)throw error;
  state.user=data.session?.user||null;previousIdentity=state.user?.id||null;return api;
 })().catch(e=>{clientReady=null;throw e;});
 return clientReady;
}
export async function api(action,body,extra={}){
 const c=await client(),owner=state.user?.id,{data}=await c.auth.getSession();if(!data.session)throw Error('Sign in to continue.');
 const r=await fetch(endpoint+'?'+new URLSearchParams({action,...extra}),{method:body==null?'GET':'POST',credentials:'omit',
  headers:{Authorization:'Bearer '+data.session.access_token,...(body==null?{}:{'Content-Type':'application/json'})},body:body==null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(action==='cloud_job'?115000:action==='account'?20000:60000)});
 const result=await r.json().catch(()=>({}));if(state.user?.id!==owner)throw Error('Account changed. Please retry.');if(!r.ok){const e=Error(result.error||'Request failed. Please retry.');e.status=r.status;throw e;}return result;
}
export async function refresh(){
 if(!state.user)return;
 if(!refreshTask){const id=state.user.id;refreshTask=(async()=>{try{return await api('account');}catch(error){if(state.user?.id!==id||error.status&&error.status<500||typeof navigator!=='undefined'&&!navigator.onLine)throw error;await new Promise(resolve=>setTimeout(resolve,600));return api('account');}})().then(data=>{if(state.user?.id!==id)return;state.account=data;accountError='';state.accountError='';renderHeader();document.dispatchEvent(new Event('loox-account'));}).catch(e=>{accountError=e.message||'Could not load your account.';state.accountError=accountError;renderHeader();document.dispatchEvent(new Event('loox-account'));throw e;}).finally(()=>{refreshTask=null;});}
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
export function auth(mode='login',options={}){
 const titles={login:'Welcome back',register:'Create your LOOX account',forgot:'Forgot your password?',reset:'Choose a new password'};
 const switching=mode==='login'&&Boolean(options.switching);
 const previousUserId=state.user?.id||null;
 const previousUserEmail=state.user?.email||null;
 const previousRemembered=store()===localStorage;
 const {box,d}=dialog(switching?'Sign in to another account':titles[mode]);
 if(switching)box.append(el('p','Your current LOOX account stays signed in until the new account is verified.','lx-note'));
 const form=el('form',null,'lx-stack');box.append(form);
 const reg=mode==='register', reset=mode==='reset', forgot=mode==='forgot';
 const full=reg&&field(form,'Full name','text',{required:true,maxLength:80,autocomplete:'name'});
 const email=!reset&&field(form,'Email address','email',{required:true,autocomplete:'email',maxLength:254});
 if(email&&mode==='login'&&typeof options.email==='string')email.value=options.email.slice(0,254);
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
  // Commit persistence preferences only after credentials have been verified.
  const c=await client(),redirect=new URL('account.html',document.baseURI);
  let result;
  if(reg){result=await c.auth.signUp({email:email.value.trim(),password:pass.value,options:{emailRedirectTo:redirect.href,data:{full_name:full.value.trim(),loox_terms:terms}}});}
  else if(forgot){redirect.searchParams.set('flow','recovery');result=await c.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:redirect.href});}
  else if(reset){result=await c.auth.updateUser({password:pass.value});}
  else {
   // An isolated client keeps failed credentials and MFA challenges from replacing the active account.
   const cfg=await config();
   const candidate=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   let committed=false;
   d.addEventListener('close',()=>{if(!committed)candidate.auth.signOut?.({scope:'local'})?.catch(()=>{});},{once:true});
   result=await candidate.auth.signInWithPassword({email:email.value.trim(),password:pass.value});
   if(result.error)throw result.error;
   if(!result.data?.session)throw Error('Sign-in did not return a session.');
   const assurance=await candidate.auth.mfa.getAuthenticatorAssuranceLevel();
   if(assurance.error)throw assurance.error;
   if(assurance.data?.nextLevel==='aal2'){
    const factors=await candidate.auth.mfa.listFactors();
    if(factors.error)throw factors.error;
    const factor=factors.data?.totp?.find(f=>f.status==='verified');
    if(!factor)throw Error('Use your account recovery method to complete two-factor sign-in.');
    const verificationTitle=d.querySelector?.('h2');if(verificationTitle)verificationTitle.textContent='Two-step verification';
    form.replaceChildren();
    form.append(el('p','Verify your sign-in with the six-digit code from your authenticator app.'));
    submit.textContent='Verify and sign in';
    const code=field(form,'Authenticator code','text',{required:true,maxLength:6,pattern:'[0-9]{6}',inputMode:'numeric',autocomplete:'one-time-code'});
    form.append(submit,note);
    pass.value='';
    await new Promise((resolve,reject)=>{
     let verifying=false,nextAttempt=0;
     form.onsubmit=async event=>{event.preventDefault();if(verifying||Date.now()<nextAttempt)return;verifying=true;submit.disabled=true;try{
      const challenge=await candidate.auth.mfa.challengeAndVerify({factorId:factor.id,code:code.value.trim()});
      if(challenge.error)throw challenge.error;
      result={data:{session:challenge.data,user:result.data.user}};resolve();
     }catch(error){nextAttempt=Date.now()+2000;msg(note,'Code invalid or expired. Use the latest six-digit code and try again in a moment.');}finally{verifying=false;submit.disabled=false;}};
     msg(note,'Enter the six-digit code from your authenticator.');submit.disabled=false;code.focus();
     d.addEventListener('close',()=>reject(Error('Sign-in canceled.')),{once:true});
    });
   }
   const before=localStorage.getItem(rememberKey);
   try{
    if(remember)localStorage.setItem(rememberKey,remember.checked?'local':'session');
    const installed=await c.auth.setSession({access_token:result.data.session.access_token,refresh_token:result.data.session.refresh_token});
    if(installed.error)throw installed.error;
    committed=true;
   }catch(error){if(before===null)localStorage.removeItem(rememberKey);else localStorage.setItem(rememberKey,before);throw error;}
  }
  if(result.error)throw result.error;
  if(forgot||reg){
   form.replaceChildren(el('p',forgot?'If this email has an account, check your inbox for a recovery link. Only request another email if needed.':'Registration was submitted. Check your inbox for a verification link. After verifying, return to the LOOX website and choose Sign in with the same email and password. Do not register a second time.'));
   if(reg)form.append(button('I already verified my email · Sign in',()=>auth('login'),'lx-button lx-primary'));
   return;
  }
  if(reset){await c.auth.signOut();history.replaceState(null,'','account.html');auth();return;}
  if(mode==='login'&&remember?.checked){
   if(switching&&previousRemembered&&previousUserEmail)rememberRecentAccount(previousUserEmail);
   rememberRecentAccount(result.data?.user?.email||email.value.trim());
  }
  d.close();
  // Reload creative workspaces after a successful switch to clear previous-user media.
  if(switching&&previousUserId!==(result.data?.user?.id||state.user?.id)){
   location.reload();return;
  }
  await refresh();
 });
}
function ensureSwitcherStyles(){
 if(document.querySelector('link[data-loox-account-switcher]'))return;
 const style=el('link');style.rel='stylesheet';
 style.href=new URL('./account-switcher.css?v=1',import.meta.url).href;
 style.dataset.looxAccountSwitcher='';document.head.append(style);
}
export function switchAccount(){
 if(!state.user){auth('login');return;}
 document.querySelectorAll('.lx-profile-details[open]').forEach(node=>{node.open=false;});
 ensureSwitcherStyles();
 const currentEmail=String(state.user.email||'').trim().toLowerCase();
 const {box,d}=dialog('Switch account');
 d.classList.add('loox-switch-dialog');
 box.append(el('p','Choose an account. Your current account stays active unless another sign-in succeeds.','loox-switch-note'));
 const current=el('div',null,'loox-switch-current');
 const avatar=el('span',String(state.account?.profile?.name||state.user.user_metadata?.full_name||currentEmail||'L').slice(0,1).toUpperCase(),'loox-switch-avatar');
 avatar.setAttribute('aria-hidden','true');
 const identity=el('span',null,'loox-switch-copy');
 identity.append(el('strong',String(state.account?.profile?.name||state.user.user_metadata?.full_name||'Current account')));
 identity.append(el('small',currentEmail));
 current.append(avatar,identity,el('span','Current','loox-switch-status'));
 box.append(current);
 const others=recentAccounts().filter(email=>email!==currentEmail);
 if(others.length){
  box.append(el('strong','Other accounts on this device','loox-switch-heading'));
  const list=el('div',null,'loox-switch-list');
  for(const email of others){
   const option=button('',()=>auth('login',{switching:true,email}),'loox-switch-choice');
   const icon=el('span',email.slice(0,1).toUpperCase(),'loox-switch-avatar');icon.setAttribute('aria-hidden','true');
   const copy=el('span',null,'loox-switch-copy');
   copy.append(el('strong',email),el('small','Sign in to switch'));
   option.append(icon,copy);list.append(option);
  }
  box.append(list);
 }
 const another=button('',()=>auth('login',{switching:true}),'loox-switch-add');
 another.append(el('span','+','loox-switch-plus'),el('span','Use another account','loox-switch-copy'));
 box.append(another);
 box.append(el('p','Only previously used email addresses are remembered on this device. Passwords and extra login sessions are not saved by this account chooser.','loox-switch-privacy'));
 if(recentAccounts().length){
  const clear=button('Forget account suggestions',()=>{try{localStorage.removeItem(recentAccountsKey);}catch{}d.close();switchAccount();},'loox-switch-forget');
  box.append(clear);
 }
}
function strong(p){return p.length>=12&&/[a-z]/i.test(p)&&/\d/.test(p);}
function positionAccountMenu(details,menu){
 const rect=details.querySelector('summary').getBoundingClientRect();
 const width=Math.min(300,Math.max(240,window.innerWidth-24));
 menu.style.setProperty('position','fixed','important');
 menu.style.setProperty('inset','auto','important');
 menu.style.setProperty('margin','0','important');
 menu.style.setProperty('width',Math.min(width,window.innerWidth-24)+'px','important');
 menu.style.setProperty('left',Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12))+'px','important');
 const top=Math.max(12,Math.min(rect.bottom+8,window.innerHeight-180));
 menu.style.setProperty('top',top+'px','important');
 menu.style.setProperty('max-height',Math.max(140,window.innerHeight-top-12)+'px','important');
 menu.style.setProperty('overflow-y','auto','important');
 menu.style.setProperty('overscroll-behavior','contain','important');
}
// Shared, compact account header for every LOOX page with [data-loox-account].
// Personal information is visible only after opening the profile avatar.
export function renderHeader(){
 for(const host of document.querySelectorAll('[data-loox-account]')){
  const menuWasOpen=Boolean(host.querySelector('.lx-profile-details[open]'));
  host.replaceChildren();
  host.classList.add('lx-controls','lx-account-header');
  const signedIn=Boolean(state.user);
  const restoring=Boolean(state.authRestoring&&!signedIn);
  const balance=state.account?.wallet?.balance;
  const credit=el('span',null,'lx-credit-chip lx-credit-readonly');
  credit.setAttribute('aria-label',signedIn?'Available AI credits':'Sign in to view your credits');
  credit.append(el('span','Credit','lx-credit-label'),
    el('span',' - ','lx-credit-divider'),
    el('strong',signedIn?(balance!=null&&Number.isFinite(Number(balance))?String(balance):state.accountError?'Unavailable':'Loading'):'0','lx-credit-value'));
  host.append(credit);
  const upgrade=button('Upgrade',pricing,'lx-button lx-primary lx-upgrade');
  upgrade.setAttribute('aria-label','View LOOX upgrade plans');
  host.append(upgrade);
  const rewardSlot=el('div',null,'lx-header-reward');rewardSlot.dataset.looxReward='';rewardSlot.hidden=true;host.append(rewardSlot);
  const details=el('details',null,'lx-details lx-profile-details');
  const summary=el('summary',null,'lx-profile-trigger');
  summary.setAttribute('aria-label',signedIn?'Open your account menu':restoring?'Restoring your account':'Sign in or create an account');
  summary.setAttribute('title',signedIn?'Account':'Sign in');
  const name=String(state.account?.profile?.name||state.user?.user_metadata?.full_name||state.user?.email?.split('@')[0]||'Account').trim()||'Account';
  const initial=(signedIn?name:'L').slice(0,1).toUpperCase();
  const avatar=el('span',initial,'lx-avatar');
  avatar.setAttribute('aria-hidden','true');
  if(state.authRestoring&&!signedIn)avatar.classList.add('loox-avatar-loading');
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
   menu.append(links,link('Billing & Credits','settings.html#billing'));
   const switchButton=button('Switch account',switchAccount,'lx-link lx-profile-switch-account');
   switchButton.setAttribute('aria-label','Switch to another LOOX account');
   menu.append(switchButton);
   const signOutButton=button('Sign out',signOut,'lx-link lx-profile-signout');
   menu.append(signOutButton);
  }else if(restoring){
   menu.append(el('div','Restoring your account…','lx-profile-identity'));
  }else{
   menu.append(el('div','Welcome to LOOX','lx-profile-identity'));
   menu.append(button('Sign in',()=>{details.open=false;auth('login');},'lx-button lx-primary lx-profile-auth'));
   menu.append(button('Create account',()=>{details.open=false;auth('register');},'lx-button lx-profile-auth'));
  }
  details.append(summary,menu);
  if(typeof menu.showPopover==='function'){
   menu.setAttribute('popover','manual');
   details.addEventListener('toggle',()=>{
    if(!details.isConnected||!menu.isConnected)return;
    if(details.open){positionAccountMenu(details,menu);if(!menu.matches(':popover-open'))menu.showPopover();}
    else if(menu.matches(':popover-open'))menu.hidePopover();
   });
  }
  if(menuWasOpen){details.open=true;menu.scrollTop=0;requestAnimationFrame(()=>{if(details.open)menu.scrollTop=0;});}
  host.append(details);
 }
 void syncAccountAvatar(state);
 document.dispatchEvent(new Event('loox-header'));
}
if(typeof document!=='undefined')document.addEventListener('pointerdown',event=>{
 if(event.target.closest('.lx-profile-details'))return;
 document.querySelectorAll('.lx-profile-details[open]').forEach(node=>{node.open=false;});
});
if(typeof document!=='undefined')document.addEventListener('keydown',event=>{
 if(event.key==='Escape')document.querySelectorAll('.lx-profile-details[open]').forEach(node=>{node.open=false;});
});
export async function signOut(){try{const c=await client();const {error}=await c.auth.signOut({scope:'local'});if(error)throw error;location.assign('index.html');}catch(e){dialog('Sign out').box.append(el('p',e.message));}}
const sections=[['profile','Account Overview'],['credits','My Credits'],['subscription','Subscription'],['history','Transaction History'],['settings','Account Settings']];
function money(cents){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);}
export async function plans(host){host.replaceChildren(el('p','Explore LOOX Basic, Creator, Pro and Business with monthly billing.'),button('Compare plans and generation counts',pricing,'lx-button lx-primary'));}
export function nextAccountUrl(page){
 const current=(location.pathname.split('/').pop()||'index.html')+location.search+location.hash;
 return page+'?from='+encodeURIComponent(current);
}
export async function buyCredits(){
 if(!document.querySelector('link[data-recharge-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./billing/recharge.css',import.meta.url).href;css.dataset.rechargeStyle='';document.head.append(css);}
 const {openRecharge}=await import('./billing/recharge.js?v=settings-2-20261124');return openRecharge({state,api,config,auth,dialog,el,button,refresh});
}
export function pricing(){location.assign(nextAccountUrl('upgrade.html'));}
export async function initialize({publicAccess=false,waitForAccount=true}={}){
 state.authRestoring=hasStoredSession();renderHeader();
 const accountPage=!!document.querySelector('[data-dashboard],[data-upgrade-page],[data-settings-page]');
 if(publicAccess||accountPage||hasStoredSession()||location.search.includes('code=')){
  try{await client();state.authRestoring=false;renderHeader();if(state.user&&waitForAccount)await refresh();}catch(e){if(accountPage){accountError=e.message||'Unable to load your account.';state.accountError=accountError;msg(document.querySelector('[data-account-note]'),accountError);}}
 }
 state.authRestoring=false;renderHeader();
 if(accountPage){drawDashboard();document.dispatchEvent(new Event('loox-user'));}
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
 settings.append(link('Open account settings →',nextAccountUrl('settings.html')));

}
if(typeof document!=='undefined'){
document.addEventListener('loox-account',drawDashboard);
document.addEventListener('loox-user',drawDashboard);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user)refresh().catch(()=>{});});
if(location.search.includes('payment=return')){const note=document.querySelector('[data-account-note]');if(note)msg(note,'Checkout returned. Credits appear once the payment provider confirms payment.');}
initialize();
}

import './return-rewards.js?v=settings-2-20261124';

if(typeof document!=='undefined'){
document.addEventListener('loox-avatar-change',()=>syncAccountAvatar(state,true));
window.addEventListener('storage',event=>{if(event.key==='loox-avatar-updated')syncAccountAvatar(state,true);});
}

if(typeof window!=='undefined')window.addEventListener('resize',()=>{document.querySelectorAll('.lx-profile-details[open]').forEach(details=>positionAccountMenu(details,details.querySelector('.lx-profile-menu')));});
