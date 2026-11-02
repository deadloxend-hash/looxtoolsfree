const endpoint='https://looxtoolfree-backend.vercel.app/api/loox';
export const terms='2026-11';
export const labels={fill:'Generative Fill',background:'Background removal',upscale2:'2× upscale',upscale4:'4× upscale',erase:'Object eraser',generate:'Text to image',enhance:'Image enhancer',uncrop:'Generative uncrop',restore:'Old photo restorer',retouch:'Skin retoucher',face_restore:'Face restoration',face_swap:'Face swap'};
const proposal=[{id:'free',price_cents:0,credits:10},{id:'pro',price_cents:999,credits:100},{id:'lifetime',price_cents:4900,credits:50}];
const planName={free:'Free',pro:'LOOX Pro',lifetime:'LOOX Lifetime'};
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
 if(!loading)loading=fetch(endpoint+'?action=config',{signal:AbortSignal.timeout(7000),credentials:'omit'}).then(async r=>{
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
  headers:{Authorization:'Bearer '+data.session.access_token,...(body==null?{}:{'Content-Type':'application/json'})},body:body==null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
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
export function renderHeader(){
 for(const host of document.querySelectorAll('[data-loox-account]')){
  host.replaceChildren();host.classList.add('lx-controls');
  if(!state.user){host.append(button('Login',()=>auth(),'lx-button'),button('Register',()=>auth('register'),'lx-button lx-primary'));continue;}
  const name=state.account?.profile?.name||'Account', balance=state.account?.wallet?.balance;
  const details=el('details',null,'lx-details'),summary=el('summary'),avatar=el('span',name.slice(0,1).toUpperCase(),'lx-avatar');
  summary.setAttribute('aria-label','Open account menu');summary.append(avatar,el('span',name,'lx-username'),el('span',(balance??'…')+' cr','lx-balance'));
  const menu=el('nav',null,'lx-menu');for(const [id,label] of sections)menu.append(link(label,'account.html#'+id));menu.append(button('Sign out',signOut,'lx-link'));
  details.append(summary,menu);host.append(details,button('Upgrade',pricing,'lx-button lx-primary'));
 }
}
export async function signOut(){try{const c=await client();const {error}=await c.auth.signOut();if(error)throw error;location.assign('index.html');}catch(e){dialog('Sign out').box.append(el('p',e.message));}}
const sections=[['profile','My Profile'],['credits','My Credits'],['subscription','Subscription'],['history','Transaction History'],['settings','Account Settings']];
function money(cents){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);}
export async function plans(host){
 host.replaceChildren(el('p','Loading plans…'));let cfg;
 try{cfg=await config();}catch{}
 const available=cfg?.plans?.length?cfg.plans:proposal;
 host.replaceChildren();
 if(!cfg?.billing)host.append(el('p','Proposed plans · Checkout opens after merchant setup.','lx-note'));
 if(cfg?.testBilling)host.append(el('p','Test checkout · No real payments.','lx-note'));
 const grid=el('div',null,'lx-plans');host.append(grid);
 for(const id of ['free','pro','lifetime']){
  const p=available.find(x=>x.id===id);if(!p)continue;
  const card=el('section',null,'lx-card'),period={free:'',pro:' / month',lifetime:' once'}[id];
  card.append(el('h3',planName[id]+(state.account?.plan===id?' · Current plan':'')),el('strong',money(p.price_cents)+period,'lx-price'),el('p',{free:p.credits+' signup credits after email verification. Local tools stay free.',pro:p.credits+' AI credits per paid billing cycle. Includes all standard AI tools and credit history.',lifetime:p.credits+' AI credits granted once. Includes ongoing access to eligible premium features. No recurring credit refill.'}[id]));
  if(id!=='free'){
   const note=el('p',null,'lx-note'),buy=button(cfg?.billing?'Choose '+planName[id]:'Checkout pending',async()=>{if(!state.user)return auth();buy.disabled=true;try{location.assign((await api('checkout',{plan:id})).url);}catch(e){msg(note,e.message);}finally{buy.disabled=false;}},'lx-button lx-primary');buy.disabled=!cfg?.billing;card.append(buy,note);
  }else if(!state.user)card.append(button('Create account',()=>auth('register')));
  grid.append(card);
 }
}
export function pricing(){const {box}=dialog('Choose your LOOX plan');plans(box);}
export async function initialize(){
 renderHeader();
 const accountPage=!!document.querySelector('[data-dashboard]');
 if(accountPage||store().getItem(sessionKey)||location.search.includes('code=')){
  try{await client();renderHeader();if(state.user)await refresh();}catch(e){if(accountPage){accountError=e.message||'Unable to load your account.';msg(document.querySelector('[data-account-note]'),accountError);}}
 }
 if(accountPage)drawDashboard();
 const planHost=document.querySelector('[data-pricing]');if(planHost)plans(planHost);
}
function drawDashboard(){
 const host=document.querySelector('[data-dashboard]');if(!host)return;host.replaceChildren();
 if(!state.user){host.append(el('p','Sign in to see your credits, AI jobs and billing history.'),button('Sign in',()=>auth()));return;}
 if(!state.account){host.append(el('p',accountError||'Loading your account…'),button('Retry',()=>{accountError='';drawDashboard();client().then(()=>refresh()).catch(e=>{accountError=e.message||'Unable to load account.';drawDashboard();});},'lx-button'));return;}
 const a=state.account;
 const nav=el('nav',null,'lx-tabs');for(const [id,label] of sections)nav.append(link(label,'#'+id));host.append(nav);
 function section(id,title){const s=el('section',null,'lx-card');s.id=id;s.append(el('h2',title));host.append(s);return s;}
 section('profile','My profile').append(el('h3','Welcome, '+a.profile.name),el('p',a.jobs.length+' recent AI actions'),el('p',a.profile.name+' · '+state.user.email),el('p','Plan · '+planName[a.plan]));
 section('credits','My credits').append(el('strong',a.wallet.balance+' available credits','lx-price'),button('Buy credits',pricing));
 const jobs=section('usage','Recent AI jobs');if(!a.jobs.length)jobs.append(el('p','No AI jobs yet.'));
 for(const j of a.jobs){const row=el('div',null,'lx-row');row.append(el('span',labels[j.operation]+' · '+j.state));
 if(j.state!=='failed')row.append(button(j.state==='succeeded'?'Open result':'Check status',async()=>{try{const result=await api('status',null,{id:j.id});if(result.url){const d=dialog('Your private result');d.box.append(link('Open PNG',result.url));}await refresh();}catch(e){msg(document.querySelector('[data-account-note]'),e.message);}},'lx-link'));jobs.append(row);}
 const sub=section('subscription','Subscription');sub.append(el('p',a.subscriptions.map(s=>s.status+(s.ends_at?' · ends '+new Date(s.ends_at).toLocaleDateString():'')).join(', ')||planName[a.plan]),button('Upgrade',pricing));
 if(a.subscriptions.length)sub.append(button('Manage or cancel subscription',async()=>{try{location.assign((await api('portal',{})).url);}catch(e){msg(document.querySelector('[data-account-note]'),e.message);}}));
 const history=section('history','Transaction history');
 for(const item of a.credits)history.append(el('p',new Date(item.created_at).toLocaleString()+' · '+item.reason+' · '+(item.amount>0?'+':'')+item.amount+' credits'));
 for(const p of a.payments)history.append(el('p',planName[p.plan]+' · '+money(p.amount_cents)+' · '+p.status));
 const settings=section('settings','Account settings'),form=el('form',null,'lx-stack');settings.append(form);
 const name=field(form,'Display name','text',{required:true,maxLength:80,value:a.profile.name}),save=el('button','Save name','lx-button'),note=el('p',null,'lx-note');form.append(save,note);
 withStatus(form,save,note,async()=>{await api('profile',{name:name.value});await refresh();});
 settings.append(button('Send password reset',()=>auth('forgot')),button('Sign out',signOut),button('Delete account',()=>{
  const {box}=dialog('Permanently delete account');box.append(el('p','This deletes your private outputs, account, remaining credits and local billing history. Cancel recurring billing first.'));
  const f=el('form',null,'lx-stack');box.append(f);const p=field(f,'Confirm password','password',{required:true,autocomplete:'current-password'}),submit=el('button','Permanently delete','lx-button'),n=el('p',null,'lx-note');f.append(submit,n);withStatus(f,submit,n,async()=>{await api('delete',{password:p.value});await state.client.auth.signOut({scope:'local'});location.replace('index.html');});
 },'lx-link'));
}
document.addEventListener('loox-account',drawDashboard);
document.addEventListener('loox-user',drawDashboard);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user)refresh().catch(()=>{});});
if(location.search.includes('payment=return')){const note=document.querySelector('[data-account-note]');if(note)msg(note,'Checkout returned. Credits appear once the payment provider confirms payment.');}
initialize();
