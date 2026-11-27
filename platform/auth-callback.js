import {config,state,terms,getAuthClient,loadAuthSDK,isolatedOAuthClient,emailCallbackClient,emailRecoveryPending,installVerifiedSession,auth} from './account.js?v=auth-20261127';
import {oauthAttemptKey,readOAuthAttempt,cleanOAuthSession,safeAuthReturn} from './auth-flow.js';
const params=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1));
const code=params.get('code'),flow=params.get('flow'),nonce=params.get('attempt');
// Remove codes and provider errors before any later navigation or user-visible error.
history.replaceState(null,'',location.pathname);
const status=document.getElementById('auth-status'),controls=document.getElementById('auth-controls');
let candidate,installed=false;
function tell(text){status.textContent=text;}
async function verifyMFA(c){
 const level=await c.auth.mfa.getAuthenticatorAssuranceLevel();if(level.error)throw level.error;
 if(level.data?.nextLevel!=='aal2'||level.data?.currentLevel==='aal2')return;
 const factors=await c.auth.mfa.listFactors();if(factors.error)throw factors.error;
 const factor=factors.data?.totp?.find(f=>f.status==='verified');if(!factor)throw Error('Authenticator unavailable. Use your account recovery options.');
 tell('Enter the code from your authenticator app to finish signing in.');
 await new Promise((resolve,reject)=>{
  const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),button=document.createElement('button');
  label.textContent='Authenticator code';input.required=true;input.inputMode='numeric';input.autocomplete='one-time-code';input.pattern='[0-9]{6}';input.maxLength=6;
  label.append(input);button.type='submit';button.textContent='Verify sign-in';form.append(label,button);controls.replaceChildren(form);input.focus();let pending=false,next=0;
  form.onsubmit=async event=>{event.preventDefault();if(pending||Date.now()<next)return;pending=true;button.disabled=true;const value=input.value;input.value='';try{const r=await c.auth.mfa.challengeAndVerify({factorId:factor.id,code:value});if(r.error)throw r.error;controls.replaceChildren();resolve();}catch{next=Date.now()+2000;tell('That code is invalid or expired. Use the latest code and try again.');}finally{pending=false;button.disabled=false;}};
  window.addEventListener('pagehide',()=>reject(Error('Sign-in cancelled.')),{once:true});
 });
}
try{
 if(params.has('error')||fragment.has('error'))throw Error('Sign-in was cancelled or the request expired. Return to LOOX and try again.');
 if(!code||code.length>4096||fragment.has('access_token'))throw Error('This link is incomplete or no longer supported. Return to LOOX and request a new sign-in or recovery link.');
 let attempt=null;
 if(flow==='google')attempt=readOAuthAttempt(sessionStorage.getItem(oauthAttemptKey),nonce);
 else if(flow!=='email')throw Error('Start a new sign-in request from LOOX.');
 await loadAuthSDK();const cfg=await config();await getAuthClient();
 if(attempt&&(state.user?.id||null)!==(attempt.owner||null))throw Error('The active account changed while signing in. Start again from LOOX.');
 const recovery=flow==='email'&&emailRecoveryPending();
 candidate=attempt?isolatedOAuthClient(cfg,attempt.nonce):emailCallbackClient(cfg);
 const result=await candidate.auth.exchangeCodeForSession(code);if(result.error)throw Error('This sign-in link is expired or was opened in a different browser. Request a new link in this browser.');
 const checked=await candidate.auth.getUser();if(checked.error||!checked.data?.user?.email_confirmed_at)throw Error('Your email identity could not be verified. Please sign in again.');
 if(attempt?.reauth&&checked.data.user.id!==attempt.owner)throw Error('Choose the same Google account to verify this security action.');
 await verifyMFA(candidate);
 if(checked.data.user.user_metadata?.loox_terms!==terms){
  tell('Review and accept the LOOX Terms and Privacy Policy before using your account.');
  await new Promise(resolve=>{const form=document.createElement('form'),label=document.createElement('label'),check=document.createElement('input'),submit=document.createElement('button');check.type='checkbox';check.required=true;label.append(check,document.createTextNode('I accept the LOOX Terms and Privacy Policy.'));
   const legal=document.createElement('p');for(const [text,file] of [['Terms','terms.html'],['Privacy Policy','privacy-policy.html']]){const link=document.createElement('a');link.textContent=text;link.href=file;link.target='_blank';link.rel='noopener noreferrer';legal.append(link,document.createTextNode(' '));}
   submit.type='submit';submit.textContent='Accept and continue';form.append(legal,label,submit);controls.replaceChildren(form);form.onsubmit=async event=>{event.preventDefault();if(!check.checked||submit.disabled)return;submit.disabled=true;try{const result=await candidate.auth.updateUser({data:{loox_terms:terms}});if(result.error)throw result.error;controls.replaceChildren();resolve();}catch{tell('Your acceptance could not be saved. Please retry.');submit.disabled=false;}};
  });
 }

 const current=await candidate.auth.getSession();if(current.error)throw current.error;
 if(attempt){readOAuthAttempt(sessionStorage.getItem(oauthAttemptKey),nonce);if((state.user?.id||null)!==(attempt.owner||null))throw Error('The active account changed. Start again from LOOX.');}
 await installVerifiedSession(cleanOAuthSession(current.data.session),attempt?.remember);installed=true;
 if(attempt)sessionStorage.removeItem(oauthAttemptKey);
 tell('You are signed in securely.');
 if(recovery){state.recoveryReady=true;document.querySelector('h1').textContent='Choose your new LOOX password';tell('This changes your LOOX password. It does not change your Google password.');auth('reset');}
 else location.replace(safeAuthReturn(attempt?.returnTo||'settings.html#general',location.href));
}catch(error){tell(error.message||'Sign-in could not be completed. Start again from LOOX.');if(flow==='google'){try{sessionStorage.removeItem(oauthAttemptKey);if(nonce)sessionStorage.removeItem('loox-oauth-'+nonce+'-code-verifier');}catch{}}}
finally{if(candidate&&!installed)try{await candidate.auth.signOut({scope:'local'});}catch{/* Never log provider credentials or callback URLs. */}}
