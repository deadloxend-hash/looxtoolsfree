import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../platform/account.js',import.meta.url),'utf8');
function fixture({failed=false,mfa=false}={}){
 let call,installed=0,reloads=0,remember='local',challenge;
 const fields=[];
 const element=()=>({append(){},replaceChildren(){},setAttribute(){},addEventListener(){},value:'',checked:true,focus(){}});
 const candidate={auth:{signInWithPassword:async()=>failed?{error:Error('Invalid credentials')}:{data:{session:{access_token:'candidate-access',refresh_token:'candidate-refresh'},user:{id:'B',email:'b@example.com'}}},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{nextLevel:mfa?'aal2':'aal1'}}),listFactors:async()=>({data:{totp:[{id:'factor',status:'verified'}]}}),challengeAndVerify:async()=>({data:{access_token:'mfa-access',refresh_token:'mfa-refresh'}})}}};
 const active={auth:{setSession:async session=>{installed++;assert.equal(session.access_token,mfa?'mfa-access':'candidate-access');return {data:{}};}}};
 const form=element();
 const context={state:{user:{id:'A',email:'a@example.com'}},localStorage:{getItem:()=>remember,setItem:(k,v)=>{remember=v},removeItem:()=>{remember=null}},store:()=>context.localStorage,rememberKey:'remember',config:async()=>({auth:true,url:'https://auth.example.com',key:'public'}),client:async()=>active,dialog:()=>({box:element(),d:{...element(),close(){}}}),el:(tag)=>tag==='form'?form:element(),field:(parent,label)=>{const field={...element(),value:label==='Email address'?'b@example.com':'test-password'};fields.push(field);return field;},button:()=>element(),link:()=>element(),msg(){},strong:()=>true,withStatus:(f,s,n,fn)=>{call=fn},document:{baseURI:'https://example.com/'},URL,window:{supabase:{createClient:()=>candidate}},location:{reload:()=>{reloads++}},refresh:async()=>{},rememberRecentAccount(){},terms:'test'};
 vm.runInNewContext(source.slice(source.indexOf('export function auth('),source.indexOf('function ensureSwitcherStyles')).replace('export function','function'),context);
 context.auth('login',{switching:true});
 return {run:()=>call(),get installed(){return installed},get remember(){return remember},get reloads(){return reloads},form};
}
test('failed account switch never installs session or changes persistence',async()=>{const f=fixture({failed:true});await assert.rejects(f.run(),/Invalid credentials/);assert.equal(f.installed,0);assert.equal(f.remember,'local');assert.equal(f.reloads,0)});
test('successful switch installs verified session and clears workspace through reload',async()=>{const f=fixture();await f.run();assert.equal(f.installed,1);assert.equal(f.reloads,1)});
test('MFA switch installs only the challenged session',async()=>{const f=fixture({mfa:true});const pending=f.run();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.installed,0);await f.form.onsubmit({preventDefault(){}});await pending;assert.equal(f.installed,1);assert.equal(f.reloads,1)});
test('blocked draft storage cannot prevent clearing private account state on identity change',()=>{
 const start=source.indexOf('api.auth.onAuthStateChange(')+'api.auth.onAuthStateChange('.length;
 const end=source.indexOf('\n  });',start);
 const callback=source.slice(start,end+4);
 let reloads=0;
 const context={state:{user:{id:'A'},account:{wallet:{balance:25}}},previousIdentity:'A',accountError:'',sessionStorage:{removeItem(){throw Error('Storage blocked')}},location:{reload(){reloads++}},renderHeader(){},document:{dispatchEvent(){}},Event:class{},setTimeout(){}};
 vm.runInNewContext('handler='+callback,context);
 context.handler('SIGNED_IN',{user:{id:'B'}});
 assert.equal(reloads,1);assert.equal(context.state.user.id,'B');assert.equal(context.state.account,null);
});
