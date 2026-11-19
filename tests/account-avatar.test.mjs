import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('shared avatar deduplicates loads, survives header replacement and isolates account changes',async()=>{
 const cache=new Map(),pending=new Map();let requests=0,images=0,invalidations=0;
 class Holder{constructor(){this.isConnected=true;this.child=null;this.classList={toggle(){},remove(){}};}querySelector(){return this.child;}replaceChildren(img){this.child=img;}}
 class MockImage{set src(value){this.value=value;queueMicrotask(()=>this.onload?.());}get src(){return this.value;}}
 let holders=[new Holder()];
 const context={Date,Promise,Image:MockImage,queueMicrotask,document:{querySelectorAll:()=>holders},sessionStorage:{getItem:key=>cache.get(key),setItem:(k,v)=>cache.set(k,v)},cloudRequest:async(state)=>{requests++;return new Promise(resolve=>pending.set(state.user.id,resolve));},cloudImage:async(state,id)=>{images++;return 'blob:'+id+':'+images;},invalidateCloudImage(){invalidations++;}};
 const source=(await readFile(new URL('../platform/account-avatar.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'')+'\nthis.sync=syncAccountAvatar;';vm.runInNewContext(source,context);
 const a={user:{id:'a'},account:{profile:{name:'Alice'}}};
 const first=context.sync(a),duplicate=context.sync(a);assert.equal(requests,1);pending.get('a')({avatar_path:'a/avatar.webp'});await Promise.all([first,duplicate]);await Promise.resolve();assert.equal(holders[0].child.src,'blob:a:1');
 holders=[new Holder()];await context.sync(a);await Promise.resolve();assert.equal(requests,1);assert.equal(holders[0].child.src,'blob:a:1');
 const old=context.sync(a,true);const b={user:{id:'b'},account:{profile:{name:'Bob'}}};holders=[new Holder()];const current=context.sync(b);pending.get('b')({avatar_path:'b/avatar.webp'});await current;pending.get('a')({avatar_path:'a/changed.webp'});await old;await Promise.resolve();assert.match(holders[0].child.src,/blob:b:/);assert.equal(invalidations,1);
 for(const value of cache.values())assert.ok(!value.includes('blob:'));
});
