// Real pinned Supabase SDK, synthetic REST replies. Never contacts Google or a paid provider.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const base=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',S='33333333-3333-4333-8333-333333333333',F='44444444-4444-4444-8444-444444444444';
const user=(id=A,google=true,mfa=false)=>({id,email:(id===A?'alice':'bob')+'@example.com',email_confirmed_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',app_metadata:{providers:[google?'google':'email']},identities:[{id,provider:google?'google':'email'}],user_metadata:{full_name:id===A?'Alice':'Bob'},factors:mfa?[{id:F,factor_type:'totp',status:'verified'}]:[]});
const session=(id=A,google=true,aal='aal1',mfa=false)=>{const seconds=Math.floor(Date.now()/1000),u=user(id,google,mfa);const claims={sub:id,iss:'https://fixture.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',session_id:S,exp:seconds+3600,iat:seconds,aal,amr:[{method:google?'oauth':'password',timestamp:seconds}]};return {access_token:Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.synthetic-fixture-signature',refresh_token:'synthetic-refresh-'+id,expires_in:3600,expires_at:seconds+3600,token_type:'bearer',user:u,provider_token:'google-provider-must-not-persist',provider_refresh_token:'google-refresh-must-not-persist'};};
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
let checks=0;
async function setup(width,{enabled=true,mfa=false,identity=A}={}){
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage();let google=true,passwordCalls=0,pkceCalls=0,recoveryCalls=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://loox-profile-api.looxai-studio.workers.dev/**',r=>r.fulfill({json:{user_id:identity,display_name:'Fixture'}}));
 await context.route('https://looxtoolfree-backend.vercel.app/api/**',r=>{const action=new URL(r.request().url()).searchParams.get('action');assert.equal(r.request().method(),'GET','Authentication test cannot mutate production APIs');return r.fulfill({json:action==='config'?{auth:true,url:'https://fixture.supabase.co',key:'public-fixture',billing:false,plans:[],operations:[]}:action==='account'?{profile:{name:'Fixture'},wallet:{balance:25},plan:'basic',credits:[],payments:[],subscriptions:[]}:action==='security_summary'?{sessions:[],activity:[],deletion:{requires_support:false}}:[]});});
 await context.route('https://fixture.supabase.co/auth/v1/**',async r=>{
  const url=new URL(r.request().url()),path=url.pathname,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'};
  if(r.request().method()==='OPTIONS')return r.fulfill({status:200,headers});
  if(path.endsWith('/settings'))return r.fulfill({headers,json:{external:{google:enabled,email:true}}});
  if(path.endsWith('/authorize')){google=true;
   assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('code_challenge_method'),'s256');assert.ok(url.searchParams.get('code_challenge')?.length>=43);assert.equal(url.searchParams.get('scopes'),'openid email profile');assert.equal(url.searchParams.get('access_type'),'online');assert.equal(url.searchParams.get('prompt'),'select_account');
   const callback=new URL(url.searchParams.get('redirect_to'));assert.equal(callback.origin,new URL(base).origin);assert.ok(callback.pathname.endsWith('/auth-callback.html'));callback.searchParams.set('code','synthetic-auth-code');checks+=6;
   return r.fulfill({status:302,headers:{...headers,Location:callback.href},body:''});
  }
  if(path.endsWith('/recover')){const b=r.request().postDataJSON();assert.ok(b.code_challenge);assert.equal(b.code_challenge_method,'s256');assert.ok(url.searchParams.get('redirect_to').includes('account.html?flow=recovery'));recoveryCalls++;google=false;return r.fulfill({headers,json:{}});}
  if(path.endsWith('/token')){
   const grant=url.searchParams.get('grant_type'),body=r.request().postDataJSON();
   if(grant==='password'){passwordCalls++;google=false;if(body.password!=='fixture-password-123')return r.fulfill({status:400,headers,json:{code:'invalid_credentials',msg:'Invalid login credentials'}});}
   if(grant==='pkce'){pkceCalls++;assert.equal(body.auth_code,'synthetic-auth-code');assert.ok(body.code_verifier?.length>=43);}
   return r.fulfill({headers,json:session(identity,google,'aal1',mfa)});
  }
  if(path.endsWith('/user'))return r.fulfill({headers,json:user(identity,google,mfa)});
  if(path.endsWith('/challenge'))return r.fulfill({headers,json:{id:'challenge-fixture',expires_at:Math.floor(Date.now()/1000)+300}});
  if(path.endsWith('/verify')){assert.equal(r.request().postDataJSON().code,'123456');return r.fulfill({headers,json:session(identity,google,'aal2',mfa)});}
  if(path.endsWith('/logout'))return r.fulfill({headers,json:{}});
  throw Error('Unexpected authentication request '+path);
 });
 return {context,page,errors,get passwordCalls(){return passwordCalls},get pkceCalls(){return pkceCalls},get recoveryCalls(){return recoveryCalls}};
}
try{
 for(const width of [320,360,390,430,768,1440,1920]){
  const f=await setup(width);await f.page.goto(base+'settings.html#security');await f.page.locator('#lp-settings-login').click();
  const dialog=f.page.locator('dialog[open]');await dialog.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();await dialog.getByText(/Google shares only/).waitFor();
  const rect=await dialog.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);assert.ok(rect.height<=850);checks+=2;
  await dialog.getByLabel('Email address',{exact:true}).fill('alice@example.com');await dialog.getByLabel('Password',{exact:true}).fill('wrong-fixture');await dialog.getByRole('button',{name:'Sign in',exact:true}).click();await dialog.getByText(/email or password is incorrect/).waitFor();assert.equal(f.passwordCalls,1);checks++;
  await dialog.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await dialog.getByLabel('Password',{exact:true}).getAttribute('type'),'text');checks++;
  await dialog.getByRole('button',{name:'Continue with Google',exact:true}).click();await f.page.waitForURL('**/settings.html#security');await f.page.getByText('Verified email address',{exact:true}).waitFor();
  const saved=await f.page.evaluate(()=>JSON.parse(localStorage.getItem('loox-account-v1')));assert.equal(saved.user.id,A);assert.equal(saved.provider_token,undefined);assert.equal(saved.provider_refresh_token,undefined);assert.equal(f.pkceCalls,1);checks+=4;
  await f.page.goto(base+'ai-image-landing.html');await f.page.getByRole('button',{name:'Open your account menu',exact:true}).waitFor();assert.equal((await f.page.evaluate(()=>JSON.parse(localStorage.getItem('loox-account-v1')))).user.id,A);checks++;
  assert.deepEqual(f.errors,[]);await f.context.close();console.log('Real SDK sign-in, failed password, OAuth, privacy and navigation passed at '+width+'px');
 }
 // Successful password sign-in and cross-tab sign-out use the real SDK broadcast channel.
 {const f=await setup(390,{enabled:false});await f.page.goto(base+'settings.html#security');await f.page.locator('#lp-settings-login').click();await f.page.getByLabel('Email address',{exact:true}).fill('alice@example.com');await f.page.getByLabel('Password',{exact:true}).fill('fixture-password-123');await f.page.getByRole('button',{name:'Sign in',exact:true}).click();await f.page.locator('dialog[open]').waitFor({state:'hidden'});assert.equal((await f.page.evaluate(()=>JSON.parse(localStorage.getItem('loox-account-v1')))).user.id,A);checks++;
 const other=await f.context.newPage();await other.goto(base+'settings.html#security');await other.getByText('Verified email address',{exact:true}).waitFor();await f.page.goto(base+'settings.html#profile');await f.page.locator('#lp-sign-out').click();await other.waitForFunction(()=>!localStorage.getItem('loox-account-v1'));await other.locator('#lp-settings-login').waitFor({state:'visible'});assert.equal(await other.evaluate(()=>localStorage.getItem('loox-account-v1')),null);checks+=2;assert.deepEqual(f.errors,[]);await f.context.close();}
 // A wrong Google account must never replace the active account during reauthentication.
 {const f=await setup(390,{identity:B});await f.page.addInitScript(({origin,session})=>{if(location.origin===origin&&!sessionStorage.getItem('auth-fixture-seeded')){localStorage.setItem('loox-account-v1',JSON.stringify(session));sessionStorage.setItem('auth-fixture-seeded','1');}},{origin:new URL(base).origin,session:session(A)});await f.page.goto(base+'settings.html#data-controls');await f.page.locator('#lp-data-export').click();await f.page.locator('dialog[open]').getByRole('button',{name:'Verify with Google',exact:true}).click();await f.page.getByText(/Choose the same Google account/).waitFor();assert.equal((await f.page.evaluate(()=>JSON.parse(localStorage.getItem('loox-account-v1')))).user.id,A);assert.equal(await f.page.evaluate(()=>location.search),'');checks+=2;assert.deepEqual(f.errors,[]);await f.context.close();}
 // MFA is completed before the active browser session is installed.
 {const f=await setup(390,{mfa:true});await f.page.goto(base+'settings.html#security');await f.page.locator('#lp-settings-login').click();await f.page.getByText(/Google shares only/).waitFor();await f.page.getByRole('button',{name:'Continue with Google',exact:true}).click();await f.page.getByLabel('Authenticator code').waitFor();assert.equal(await f.page.evaluate(()=>localStorage.getItem('loox-account-v1')),null);checks++;await f.page.getByLabel('Authenticator code').fill('123456');await f.page.getByRole('button',{name:'Verify sign-in',exact:true}).click();await f.page.waitForURL('**/settings.html#security');checks++;assert.deepEqual(f.errors,[]);await f.context.close();}
 // Provider disabled: usable email authentication, no misleading Google redirect.
 {const f=await setup(320,{enabled:false});await f.page.goto(base+'settings.html#security');await f.page.locator('#lp-settings-login').click();await f.page.getByText(/Google sign-in is not configured yet/).waitFor();assert.equal(await f.page.getByRole('button',{name:'Continue with Google',exact:true}).isDisabled(),true);await f.page.getByRole('button',{name:'Forgot password?',exact:true}).click();await f.page.getByLabel('Email address',{exact:true}).fill('alice@example.com');await f.page.getByRole('button',{name:'Send recovery email',exact:true}).click();await f.page.getByText(/If this email has an account/).waitFor();assert.equal(f.recoveryCalls,1);checks+=2;await f.page.goto(base+'account.html?flow=recovery&code=synthetic-auth-code');await f.page.getByRole('heading',{name:'Choose your new LOOX password',exact:true}).waitFor();await f.page.getByRole('button',{name:'Save password',exact:true}).waitFor();assert.equal(await f.page.evaluate(()=>location.search),'');checks+=2;assert.deepEqual(f.errors,[]);await f.context.close();}
 {const f=await setup(390);await f.page.goto(base+'auth-callback.html?flow=google&attempt=invalid&code=synthetic-auth-code');await f.page.getByText(/request has expired/).waitFor();assert.equal(f.pkceCalls,0);assert.equal(await f.page.evaluate(()=>location.search),'');checks+=2;assert.deepEqual(f.errors,[]);await f.context.close();}
 console.log('Authentication browser audit: '+checks+' assertions passed using the real SDK and intercepted auth services.');
}finally{await browser.close();}
