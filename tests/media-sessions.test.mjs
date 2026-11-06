import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {MediaSessions}=await import('../platform/loox-image-sessions.js');
function fixture(){
 const tables={loox_media_sessions:[],loox_media_entries:[]};
 const client={from(table){const q={data:null,error:null,insert(row){this.data={id:crypto.randomUUID(),...row};tables[table].push(this.data);return this;},select(){return this;},single(){return Promise.resolve({data:this.data});},update(row){this.patch=row;return this;},eq(key,value){for(const r of tables[table])if(r[key]===value)Object.assign(r,this.patch);return Promise.resolve({data:null});}};return q;}};
 const manager=Object.assign(Object.create(MediaSessions.prototype),{state:{user:{id:'user-a'},client},id:null,epoch:0,feed:{replaceChildren(){this.cleared=true;}},prompt:{focus(){}},isBusy:()=>false,loadList:async()=>{},url(){this.urlId=this.id;},collapse(){}});
 return {manager,tables};
}
test('multiple generations share one durable session with unique request IDs',async()=>{
 const {manager,tables}=fixture();const image={prompt:'First scene',media_type:'image',model_name:'FLUX',ratio:'1:1',settings:{}};
 const a=await manager.begin(image);const b=await manager.begin({...image,prompt:'Next scene',media_type:'video'});
 assert.equal(tables.loox_media_sessions.length,1);assert.equal(tables.loox_media_entries.length,2);assert.equal(a.session_id,b.session_id);assert.notEqual(a.request_id,b.request_id);assert.equal(manager.urlId,a.session_id);assert.equal(b.user_id,'user-a');
});
test('fresh session clears conversation without deleting saved entries',async()=>{
 globalThis.matchMedia=()=>({matches:false});const {manager,tables}=fixture();
 await manager.begin({prompt:'Earlier scene',media_type:'image',model_name:'FLUX'});const old=manager.id;
 await manager.fresh();assert.equal(manager.id,null);assert.equal(manager.feed.cleared,true);assert.equal(tables.loox_media_entries.length,1);
 await manager.begin({prompt:'New scene',media_type:'video',model_name:'Wan'});assert.notEqual(manager.id,old);assert.equal(tables.loox_media_sessions.length,2);
});
test('generation in progress blocks changing the session',async()=>{
 const {manager}=fixture();manager.id='active';manager.isBusy=()=>true;await assert.rejects(manager.fresh(),/current generation/);assert.equal(manager.id,'active');
});
test('session persistence failure stops before a generation can be submitted',async()=>{
 const {manager}=fixture();manager.state.client.from=()=>({insert(){return this;},select(){return this;},single:async()=>({error:{message:'Database unavailable'}})});
 await assert.rejects(manager.begin({prompt:'Scene'}),/Database unavailable/);assert.equal(manager.id,null);
});
test('scroll follow threshold respects a user reading older content',()=>{
 const {manager}=fixture();manager.scroll={scrollHeight:2000,scrollTop:100,clientHeight:600};assert.equal(manager.nearBottom(),false);manager.scroll.scrollTop=1350;assert.equal(manager.nearBottom(),true);
});
