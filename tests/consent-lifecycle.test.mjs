import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../platform/privacy.js',import.meta.url),'utf8');
function fixture(){const data=new Map(),listeners={},events=[];const context={URL,Date,JSON,Object,Number,localStorage:{getItem:k=>data.get(k)??null},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},window:{addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent:e=>events.push(e)},document:{currentScript:{src:'https://example.invalid/platform/privacy.js'},readyState:'loading',createElement:()=>({}),head:{append(){}},addEventListener(){}}};vm.runInNewContext(source,context);return {data,listeners,events,privacy:context.window.LOOXPrivacy};}
test('expired, future-dated, malformed and cross-tab-cleared choices fail closed without a reload',()=>{
 const f=fixture(),key='loox-consent-v1';const choice={version:1,savedAt:Date.now(),essential:true,analytics:true,functional:true,marketing:true};f.data.set(key,JSON.stringify(choice));assert.equal(f.privacy.preferences().analytics,true);assert.equal(f.privacy.permits('analytics'),false,'No optional integrations configured');
 for(const savedAt of [Date.now()-181*86400000,Date.now()+86400000]){f.data.set(key,JSON.stringify({...choice,savedAt}));assert.equal(f.privacy.preferences(),null);}
 f.data.set(key,'broken');assert.equal(f.privacy.preferences(),null);f.data.clear();f.listeners.storage({key:null});assert.equal(f.events.at(-1).detail,null);assert.equal(f.privacy.permits('essential'),true);
});
