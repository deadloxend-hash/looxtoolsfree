import test from 'node:test';import assert from 'node:assert/strict';
import {withDeadline,authFetch} from '../platform/auth-restoration.js';
import {cachedAvatar,clearAvatarCache,saveAvatar} from '../platform/avatar-cache.js';
test('bounded verification resolves normally and abandons hung waits',async()=>{assert.equal(await withDeadline(Promise.resolve('verified'),20),'verified');await assert.rejects(withDeadline(new Promise(()=>{}),5),/taking too long/);});
test('auth transport respects caller cancellation as well as its own deadline',async t=>{const controller=new AbortController();controller.abort();t.mock.method(globalThis,'fetch',async(i,o)=>{assert.equal(o.signal.aborted,true);throw o.signal.reason;});await assert.rejects(authFetch('https://fixture.example',{signal:controller.signal}));});
test('avatar previews require the exact verified owner, bounded raster data and an unexpired timestamp',async t=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),key:i=>[...values.keys()][i],get length(){return values.size;}};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:storage});t.after(()=>{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete globalThis.sessionStorage;});const item={owner:'A',at:Date.now(),src:'data:image/png;base64,AAAA'};
 values.set('loox-avatar-image:A',JSON.stringify(item));assert.equal(cachedAvatar('A'),item.src);assert.equal(cachedAvatar('B'),null);
 for(const bad of [{...item,owner:'B'},{...item,at:Date.now()-300001},{...item,at:Date.now()+5000},{...item,src:'data:image/svg+xml;base64,AAAA'},{...item,src:'https://evil.example/pixel'}]){values.set('loox-avatar-image:A',JSON.stringify(bad));assert.equal(cachedAvatar('A'),null);}
 values.set('loox-avatar-image:B',JSON.stringify({...item,owner:'B'}));clearAvatarCache('B');assert.equal(values.has('loox-avatar-image:A'),false);assert.equal(values.has('loox-avatar-image:B'),true);clearAvatarCache();assert.equal(values.size,0);
 let called=false;t.mock.method(globalThis,'fetch',async()=>{called=true;});await saveAvatar('A','blob:fixture',()=>false);assert.equal(called,false);
});
