import test from 'node:test';
import assert from 'node:assert/strict';
import {groupMedia,validMedia,readPrivateMedia,buildPrivateArchive} from '../platform/privacy-data.js';
import {unzipSync,strFromU8} from '../vendor/fflate-0.8.2.mjs';
const owner='00000000-0000-4000-8000-000000000001';
const file={provider:'r2',key:'users/'+owner+'/generations/a.png',bytes:3,url:'https://example.r2.cloudflarestorage.com/looxai/users/'+owner+'/generations/a.png?signature=temporary'};
test('private archive grouping bounds memory and rejects foreign keys, traversal and hostile origins',()=>{
 assert.equal(validMedia(file,owner,'auth.supabase.co'),true);
 for(const f of [{...file,key:'users/another/generations/a.png'},{...file,key:'users/'+owner+'/../other'},{...file,url:'https://attacker.invalid/media'},{...file,url:'https://example.r2.cloudflarestorage.com.attacker.invalid/a'}])assert.equal(validMedia(f,owner,'auth.supabase.co'),false);
 const groups=groupMedia([file,{...file,key:file.key+'2',url:file.url.replace('a.png?','a.png2?'),bytes:31000000},{...file,key:file.key+'3',url:file.url.replace('a.png?','a.png3?'),bytes:40000000},{...file,key:file.key+'4',url:file.url.replace('a.png?','a.png4?'),bytes:50000000}],owner,'auth.supabase.co');
 assert.equal(groups.length,3);assert.equal(groups[0].files.length,2);assert.equal(groups[2].direct,true);
});
test('archive contains original bytes and data, without sending user credentials to signed media hosts',async()=>{
 const data={account:{id:owner},media_links_expire_at:new Date(Date.now()+60000).toISOString(),records:{profile:'own'}};
 const part=groupMedia([file],owner,'auth.supabase.co')[0];
 const request=async(url,opts)=>{assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(opts.headers,undefined);return new Response(new Uint8Array([1,2,3]));};
 const zip=await buildPrivateArchive(data,part,{owner,currentUser:()=>owner,authHost:'auth.supabase.co',request});
 const files=unzipSync(zip);assert.deepEqual(files['r2/'+file.key],new Uint8Array([1,2,3]));assert.equal(JSON.parse(strFromU8(files['loox-personal-data.json'])).account.id,owner);
});
test('account changes and oversized responses cancel rather than exporting private bytes',async()=>{
 let current=owner;
 await assert.rejects(readPrivateMedia(file,{owner,currentUser:()=>current,authHost:'auth.supabase.co',request:async()=>{current='another';return new Response(new Uint8Array([1,2,3]));}}),/Account changed/);
 await assert.rejects(readPrivateMedia(file,{owner,currentUser:()=>owner,authHost:'auth.supabase.co',request:async()=>new Response(new Uint8Array([1,2,3,4]))}),/size verification/);
});
