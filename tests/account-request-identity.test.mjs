import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {cloudRequest} from '../platform/profile-cloudflare.js';
const source=readFileSync(new URL('../platform/account.js',import.meta.url),'utf8');
test('backend and profile requests never use a different account bearer while UI identity is unchanged',async t=>{
 let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;throw Error('Must not send a foreign bearer');});
 const state={user:{id:'A'},client:{auth:{getSession:async()=>({data:{session:{access_token:'foreign-fixture',user:{id:'B'}}}})}}};
 await assert.rejects(cloudRequest(state,'profile'),/account changed/);
 const c={state,client:async()=>state.client,fetch:globalThis.fetch,URLSearchParams,AbortSignal,endpoint:'https://fixture.example/api'};
 vm.runInNewContext(source.slice(source.indexOf('export async function api('),source.indexOf('export async function refresh(')).replace('export async function','async function')+'\nthis.request=api;',c);
 await assert.rejects(c.request('account'),/Account changed/);assert.equal(requests,0);
});
test('a previous account request cannot clear or overwrite a new account refresh task or error state',async()=>{
 const pending=new Map(),calls=[],state={user:{id:'A'},account:null};
 const c={state,refreshTask:null,refreshOwner:null,accountError:'',navigator:{onLine:true},api:()=>{calls.push(state.user.id);return new Promise((resolve,reject)=>pending.set(state.user.id,{resolve,reject}));},renderHeader(){},document:{dispatchEvent(){}},Event:class{},setTimeout};
 vm.runInNewContext(source.slice(source.indexOf('export async function refresh('),source.indexOf('export function dialog(')).replace('export async function','async function')+'\nthis.refresh=refresh;',c);
 const old=c.refresh().catch(e=>e);state.user={id:'B'};const current=c.refresh();assert.deepEqual(calls,['A','B']);pending.get('A').reject(Object.assign(Error('Old request failed'),{status:409}));await old;assert.equal(state.accountError,undefined);
 const duplicate=c.refresh();assert.deepEqual(calls,['A','B']);pending.get('B').resolve({owner:'B',wallet:{balance:91}});await Promise.all([current,duplicate]);assert.equal(state.account.owner,'B');assert.equal(state.account.wallet.balance,91);assert.equal(state.accountError,'');
});
