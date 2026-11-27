import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthStorage} from '../platform/auth-storage.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const blocked=()=>{throw Error('Storage denied');};
test('session persistence survives a denied localStorage area and clears alternate stale copies',()=>{
 const session=store(),a=createAuthStorage({local:blocked,session:()=>session});
 a.storage.setItem('loox-account-v1','session-fixture');assert.equal(a.hasStoredSession(),true);assert.equal(a.storage.getItem('loox-account-v1'),'session-fixture');
 a.storage.removeItem('loox-account-v1');assert.equal(a.hasStoredSession(),false);
});
test('remember-me session choice takes precedence and account removal clears both stores',()=>{
 const local=store(),session=store();local.setItem('loox-auth-storage','session');local.setItem('loox-account-v1','old');
 const a=createAuthStorage({local:()=>local,session:()=>session});a.storage.setItem('loox-account-v1','new');
 assert.equal(session.getItem('loox-account-v1'),'new');assert.equal(local.getItem('loox-account-v1'),null);a.storage.removeItem('loox-account-v1');assert.equal(a.hasStoredSession(),false);
});
test('fully blocked browser storage permits an in-memory session without throwing',()=>{
 const a=createAuthStorage({local:blocked,session:blocked});a.storage.setItem('loox-account-v1','temporary');assert.equal(a.hasStoredSession(),true);a.storage.removeItem('loox-account-v1');assert.equal(a.hasStoredSession(),false);
});

test('remember choice remains effective when it is stored only in sessionStorage',()=>{
 const local=store(),session=store();session.setItem('loox-auth-storage','session');const a=createAuthStorage({local:()=>local,session:()=>session});a.storage.setItem('loox-account-v1','session-only');assert.equal(local.getItem('loox-account-v1'),null);assert.equal(session.getItem('loox-account-v1'),'session-only');
});
