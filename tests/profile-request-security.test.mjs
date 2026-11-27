import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudRequest,cloudImage} from '../platform/profile-cloudflare.js';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
function account(){return {user:{id:A},client:{auth:{getSession:async()=>({data:{session:{access_token:'fixture-only-token'}}})}}};}
test('profile requests reject account changes and never follow redirects with a token',async t=>{
 const state=account();t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');state.user={id:B};return Response.json({display_name:'Previous user'});});
 await assert.rejects(cloudRequest(state,'profile'),/account changed/);
 await assert.rejects(cloudRequest(state,'../unexpected'),/Invalid profile action/);
});
test('profile images reuse one request per account and never reuse a private image across accounts',async t=>{
 let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;return new Response(new Blob(['fixture'],{type:'image/webp'}));});const state=account();
 const first=await cloudImage(state,A,'avatar');assert.equal(await cloudImage(state,A,'avatar'),first);assert.equal(requests,1);
 state.user={id:B};assert.notEqual(await cloudImage(state,A,'avatar'),first);assert.equal(requests,2);
});
