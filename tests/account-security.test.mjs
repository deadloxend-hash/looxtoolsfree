import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCurrentPassword,authenticatorImage} from '../platform/account-security.js';
test('sensitive setup verifies password in an isolated session and revokes it without changing the current account',async()=>{
 const calls=[];let owner='owner',correct=true;
 const sdk={createClient(url,key,options){assert.equal(options.auth.persistSession,false);return {auth:{signInWithPassword:async credentials=>{assert.equal(credentials.email,'owner@example.com');calls.push('verify');return correct?{data:{user:{id:'owner'}}}:{error:Error('bad')};},signOut:async options=>{assert.equal(options.scope,'local');calls.push('revoke');return {};}}};}};
 const opts={sdk,config:{url:'https://auth.invalid',key:'public'},user:{id:'owner',email:'owner@example.com'},password:'fixture',currentUser:()=>owner};
 await verifyCurrentPassword(opts);assert.deepEqual(calls,['verify','revoke']);
 owner='other';await assert.rejects(verifyCurrentPassword(opts),/Account changed/);assert.equal(calls.at(-1),'revoke');
 correct=false;await assert.rejects(verifyCurrentPassword(opts),/Password verification failed/);
});
test('authenticator setup renders only a bounded SVG image data URL, never remote HTML',()=>{
 assert.match(authenticatorImage({qr_code:'<svg xmlns="http://www.w3.org/2000/svg"></svg>'}),/^data:image\/svg\+xml/);
 assert.match(authenticatorImage({qr_code:'data:image/svg+xml;utf-8,<svg></svg>'}),/^data:image\/svg\+xml/);
 assert.throws(()=>authenticatorImage({qr_code:'https://attacker.invalid/secret'}));assert.throws(()=>authenticatorImage({qr_code:'<svg'+' '.repeat(100001)}));
});
