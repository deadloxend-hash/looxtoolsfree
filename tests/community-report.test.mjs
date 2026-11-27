import test from 'node:test';
import assert from 'node:assert/strict';
import {communityReportPayload} from '../platform/community-report.mjs';
import {boundedBlob} from '../tools/image-core.mjs';
const postId='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222';
test('D1 content reports use the idempotent private community support category without requiring a legacy post row',()=>{
 const p=communityReportPayload({postId,requestId,reason:'A reason for review'});assert.equal(p.category,'community');assert.equal(p.requestId,requestId);assert.equal(p.reference,'community:'+postId);assert.deepEqual(communityReportPayload({postId,requestId,reason:'A reason for review'}),p);
 assert.throws(()=>communityReportPayload({postId:'invalid',requestId,reason:'Valid reason'}));assert.throws(()=>communityReportPayload({postId,requestId,reason:'bad'}));
});
test('PNG inflation cancels as soon as the stream exceeds its limit instead of buffering everything',async()=>{
 let canceled=false;const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(8));c.enqueue(new Uint8Array(8));},cancel(){canceled=true;}});
 await assert.rejects(boundedBlob(stream,10),/too large/);assert.equal(canceled,true);
 const ok=new Blob(['fixture']).stream();assert.equal(await (await boundedBlob(ok,10)).text(),'fixture');
});
