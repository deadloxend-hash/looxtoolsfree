import test from 'node:test';
import assert from 'node:assert/strict';
import {Community} from '../platform/community.js';
function fixture({signedIn=true,fail=false}={}){
 let writes=0,logins=0;
 const button={textContent:'',setAttribute(){}};
 const state={user:signedIn?{id:'viewer'}:null,client:{from(){return {insert:async row=>{writes++;assert.equal(row.user_id,'viewer');return fail?{error:{message:'Network unavailable'}}:{data:null};}};}}};
 const c=Object.assign(Object.create(Community.prototype),{state,auth:()=>logins++,pendingLikes:new Set()});
 return {c,button,post:{id:'post',liked:false,likes:2},writes:()=>writes,logins:()=>logins};
}
test('a signed-in like updates immediately and persists once',async()=>{const f=fixture();const pending=f.c.like(f.post,f.button);assert.equal(f.post.liked,true);assert.equal(f.post.likes,3);await pending;assert.equal(f.writes(),1);});
test('a failed like restores the real previous count',async()=>{const f=fixture({fail:true});await assert.rejects(f.c.like(f.post,f.button),/Network unavailable/);assert.equal(f.post.liked,false);assert.equal(f.post.likes,2);assert.equal(f.c.pendingLikes.size,0);});
test('logged-out like opens sign-in and never writes',async()=>{const f=fixture({signedIn:false});await f.c.like(f.post,f.button);assert.equal(f.logins(),1);assert.equal(f.writes(),0);assert.equal(f.post.likes,2);});
test('concurrent clicks cannot write duplicate likes',async()=>{const f=fixture();await Promise.all([f.c.like(f.post,f.button),f.c.like(f.post,f.button)]);assert.equal(f.writes(),1);});
