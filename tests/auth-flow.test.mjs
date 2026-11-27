import test from 'node:test';import assert from 'node:assert/strict';
import {safeAuthReturn,newOAuthAttempt,readOAuthAttempt,oauthVerifierStorage,googleOAuthOptions,trustedOAuthURL,cleanOAuthSession,googleAvailable} from '../platform/auth-flow.js';
import {createAuthStorage} from '../platform/auth-storage.js';
const base='https://deadloxend-hash.github.io/looxtoolsfree/index.html',nonce='11111111-1111-4111-8111-111111111111';
test('authentication returns stay inside the LOOX project and remove secret-bearing parameters',()=>{
 const fallback=new URL('settings.html#general',base).href;
 for(const value of ['https://evil.example/x.html','//evil.example/x.html','https://user:pass@deadloxend-hash.github.io/looxtoolsfree/x.html','../other-project/x.html','auth-callback.html?code=secret','javascript:alert(1)','\\evil.example\\x.html'])assert.equal(safeAuthReturn(value,base),fallback);
 assert.equal(safeAuthReturn('settings.html?access_token=secret#security',base),new URL('settings.html#security',base).href);
});
test('OAuth attempt correlation rejects cancellation replay, wrong nonces, expiry and future timestamps',()=>{
 const attempt=newOAuthAttempt({base,nonce,now:1000,owner:'owner',reauth:true});
 assert.equal(readOAuthAttempt(JSON.stringify(attempt),nonce,1001).owner,'owner');
 for(const [raw,key,time] of [[null,nonce,1001],[JSON.stringify(attempt),'bad',1001],[JSON.stringify(attempt),nonce,601001],[JSON.stringify(attempt),nonce,999]])assert.throws(()=>readOAuthAttempt(raw,key,time));
});
test('isolated OAuth storage persists only the PKCE verifier, never provider/session credentials',()=>{
 const entries=new Map(),area={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 const key='loox-oauth-'+nonce,store=oauthVerifierStorage(nonce,()=>area);
 store.setItem(key+'-code-verifier','pkce-fixture');store.setItem(key,JSON.stringify({access_token:'loox-fixture',provider_token:'google-secret',provider_refresh_token:'google-refresh'}));
 assert.equal(entries.size,1);assert.equal(store.getItem(key+'-code-verifier'),'pkce-fixture');assert.ok(!store.getItem(key).includes('google-secret'));
 store.removeItem(key+'-code-verifier');assert.equal(entries.size,0);
 const main=createAuthStorage({local:()=>area,session:()=>null}).storage;
 main.setItem('loox-account-v1',JSON.stringify({access_token:'loox-fixture',provider_token:'google-secret',provider_refresh_token:'google-refresh'}));assert.ok(!main.getItem('loox-account-v1').includes('google-secret'));
});
test('Google requests only identity scopes, online access and account selection through Supabase',async()=>{
 const request=googleOAuthOptions(new URL('auth-callback.html',base).href);assert.equal(request.provider,'google');assert.equal(request.options.scopes,'openid email profile');assert.equal(request.options.queryParams.prompt,'select_account');assert.equal(request.options.queryParams.access_type,'online');assert.equal(request.options.skipBrowserRedirect,true);
 const cfg={url:'https://fixture.supabase.co',key:'public'};assert.throws(()=>trustedOAuthURL('https://evil.example/auth/v1/authorize?provider=google',cfg));assert.throws(()=>trustedOAuthURL('https://fixture.supabase.co/auth/v1/authorize?provider=github',cfg));
 assert.equal(await googleAvailable(cfg,{request:async()=>({ok:true,json:async()=>({external:{google:false}})})}),false);
 assert.deepEqual(cleanOAuthSession({access_token:'a',refresh_token:'r',provider_token:'must-not-save',user:{id:'fixture'}}),{access_token:'a',refresh_token:'r'});
});
