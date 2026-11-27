// Google credentials stay on Google's origin. Supabase owns OAuth state and PKCE.
export const oauthAttemptKey='loox-oauth-attempt-v1';
export const attemptLifetime=10*60*1000;
export function authEventApplies(event,session,stored,localCommit=false){
 if(event==='INITIAL_SESSION'||localCommit)return true;
 let current;try{current=JSON.parse(stored||'null');}catch{}
 return (current?.user?.id||null)===(session?.user?.id||null);
}
export function safeAuthReturn(value,base){
 const root=new URL('./',base),fallback=new URL('settings.html#general',root);
 try{const u=new URL(value||fallback.href,root);
  if(u.origin!==root.origin||!u.pathname.startsWith(root.pathname)||u.username||u.password||!u.pathname.endsWith('.html')||/(?:auth-callback|account)\.html$/.test(u.pathname)||/[\\\u0000-\u001f]/.test(value||''))return fallback.href;
  // Do not forward credentials or arbitrary query parameters into another page.
  u.search='';if(!/^#[a-z0-9-]*$/i.test(u.hash))u.hash='';return u.href;
 }catch{return fallback.href;}
}
export function newOAuthAttempt({base,returnTo,owner=null,remember=true,reauth=false,now=Date.now(),nonce=crypto.randomUUID()}){
 return {nonce,created:now,owner,remember:Boolean(remember),reauth:Boolean(reauth),returnTo:safeAuthReturn(returnTo,base)};
}
export function readOAuthAttempt(raw,nonce,now=Date.now()){
 let a;try{a=JSON.parse(raw);}catch{throw Error('This sign-in request has expired. Start again from LOOX.');}
 if(!a||typeof a.nonce!=='string'||!/^[a-f0-9-]{36}$/i.test(a.nonce)||a.nonce!==nonce||!Number.isFinite(a.created)||a.created>now||now-a.created>attemptLifetime)throw Error('This sign-in request has expired. Start again from LOOX.');
 return a;
}
export function oauthVerifierStorage(nonce,area=()=>sessionStorage){
 const prefix='loox-oauth-'+nonce,memory=new Map();
 return {getItem(key){return key.startsWith(prefix)&&key.endsWith('-code-verifier')?area().getItem(key):memory.get(key)??null;},
 setItem(key,value){if(key.startsWith(prefix)&&key.endsWith('-code-verifier'))area().setItem(key,value);else{
  try{const s=JSON.parse(value);delete s.provider_token;delete s.provider_refresh_token;value=JSON.stringify(s);}catch{}memory.set(key,value);
 }},removeItem(key){if(key.startsWith(prefix)&&key.endsWith('-code-verifier'))area().removeItem(key);memory.delete(key);}};
}
export function cleanOAuthSession(session){
 if(!session?.access_token||!session?.refresh_token||!session?.user?.id)throw Error('Sign-in did not return a valid session.');
 return {access_token:session.access_token,refresh_token:session.refresh_token};
}
export async function googleAvailable(cfg,{request=fetch}={}){
 const r=await request(cfg.url.replace(/\/$/,'')+'/auth/v1/settings',{headers:{apikey:cfg.key},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('Sign-in options could not be checked. Please retry.');
 return (await r.json()).external?.google===true;
}
export function googleOAuthOptions(callback){return {provider:'google',options:{redirectTo:callback,scopes:'openid email profile',skipBrowserRedirect:true,queryParams:{prompt:'select_account',access_type:'online'}}};}
export function trustedOAuthURL(value,cfg){const u=new URL(value),base=new URL(cfg.url);if(u.origin!==base.origin||u.pathname!=='/auth/v1/authorize'||u.searchParams.get('provider')!=='google')throw Error('The sign-in destination could not be verified.');return u.href;}
