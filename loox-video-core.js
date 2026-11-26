/* Pure timeline math and validated project data. No media or network access. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const numeric=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const animated=['x','y','scale','angle','opacity','brightness','contrast','saturation','blur','volume'];
const ease=(t,mode)=>mode==='ease-in'?t*t:mode==='ease-out'?1-(1-t)*(1-t):mode==='ease-in-out'?t*t*(3-2*t):t;
function valueAt(keys,t,fallback){
 if(!Array.isArray(keys)||!keys.length)return fallback;
 const sorted=keys.slice().sort((a,b)=>a.t-b.t);
 if(t<=sorted[0].t)return sorted[0].v;
 for(let i=1;i<sorted.length;i++){const a=sorted[i-1],b=sorted[i];if(t<=b.t)return a.v+(b.v-a.v)*ease(clamp((t-a.t)/(b.t-a.t||1),0,1),a.ease)}
 return sorted.at(-1).v;
}
function evaluated(c,t){const out={...c};for(const key of animated)out[key]=valueAt(c.animation?.[key],t,c[key]);return out}
function clone(c){return {...c,cropSource:c.cropSource?{...c.cropSource}:undefined,keys:(c.keys||[]).map(k=>({...k})),animation:JSON.parse(JSON.stringify(c.animation||{}))}}
function splitKeys(keys,t,fallback){const v=valueAt(keys,t,fallback);return [[...(keys||[]).filter(k=>k.t<t).map(k=>({...k})),{t,v}],[{t:0,v},...(keys||[]).filter(k=>k.t>t).map(k=>({...k,t:k.t-t}))]]}
function splitClip(c,delta){
 const left=clone(c),right=clone(c);left.duration=delta;right.start=c.start+delta;right.duration=c.duration-delta;right.trimStart=c.trimStart+delta*c.rate;
 [left.keys,right.keys]=splitKeys(c.keys,delta,1);
 for(const key of animated)if(c.animation?.[key]?.length)[left.animation[key],right.animation[key]]=splitKeys(c.animation[key],delta,c[key]);
 return [left,right];
}
const strings=['name','kind','text','font','color','effect','fit','filter','transition','eq','mask','blend','animationEase','visualEffect'];
const ranges={start:[0,36000],duration:[.01,36000],trimStart:[0,36000],sourceDuration:[.01,36000],layer:[0,10000],x:[-2,3],y:[-2,3],w:[.02,4],h:[.02,4],scale:[.05,4],angle:[-3600,3600],opacity:[0,1],volume:[0,2],zoom:[1,4],panX:[-100,100],panY:[-100,100],rate:[.1,16],fade:[0,10],fontSize:[12,300],brightness:[.2,2],contrast:[.2,2],saturation:[0,3],temperature:[-50,50],blur:[0,30],audioFadeIn:[0,30],audioFadeOut:[0,30],flipX:[-1,1],flipY:[-1,1],radius:[0,.5],transitionDuration:[.05,5],effectAmount:[0,1],id:[1,10000000],assetId:[1,10000000]};
function validateProject(data){
 if(!data||data.version!==2||!Array.isArray(data.clips)||data.clips.length>1000)throw new Error('Invalid or oversized LOOX project.');
 const ids=new Set();const clips=data.clips.map(raw=>{
  if(!['video','audio','image','text'].includes(raw.kind)||!Number.isInteger(raw.id)||ids.has(raw.id))throw new Error('Invalid clip identity.');ids.add(raw.id);
  const c={};for(const key of strings)if(typeof raw[key]==='string')c[key]=raw[key].slice(0,key==='text'?8000:240);
  for(const [key,[min,max]] of Object.entries(ranges))if(raw[key]!==undefined)c[key]=clamp(numeric(raw[key],min),min,max);
  for(const key of ['noiseCut'])c[key]=!!raw[key];
  if(!Number.isFinite(c.duration)||!Number.isFinite(c.start))throw new Error('Invalid timing.');
  c.animation={};for(const key of animated){const keys=raw.animation?.[key];if(Array.isArray(keys)){if(keys.length>2000)throw new Error('Too many keyframes.');const [a,b]=ranges[key];c.animation[key]=keys.map(k=>({t:clamp(numeric(k.t),0,c.duration),v:clamp(numeric(k.v),a,b),ease:['linear','ease-in','ease-out','ease-in-out'].includes(k.ease)?k.ease:'linear'})).sort((a,b)=>a.t-b.t)}}
  c.keys=Array.isArray(raw.keys)?raw.keys.slice(0,2000).map(k=>({t:clamp(numeric(k.t),0,c.duration),v:clamp(numeric(k.v,1),0,2)})):[];
  if(raw.cropSource){const x=clamp(numeric(raw.cropSource.x),0,.999),y=clamp(numeric(raw.cropSource.y),0,.999);c.cropSource={x,y,w:clamp(numeric(raw.cropSource.w,1),.001,1-x),h:clamp(numeric(raw.cropSource.h,1),.001,1-y)}}
  return c;
 });
 return {version:2,name:String(data.name||'Untitled project').slice(0,120),aspect:['16:9','9:16','1:1','4:5'].includes(data.aspect)?data.aspect:'16:9',bg:/^#[0-9a-f]{6}$/i.test(data.bg)?data.bg:'#101827',fps:[24,25,30,50,60].includes(data.fps)?data.fps:30,clips,markers:Array.isArray(data.markers)?data.markers.slice(0,1000).map(v=>clamp(numeric(v),0,36000)):[]};
}
function dimensions(r,short){const [a,b]=r.split(':').map(Number);return a>=b?[Math.round(short*a/b/2)*2,Math.round(short/2)*2]:[Math.round(short/2)*2,Math.round(short*b/a/2)*2]}
const api={clamp,ease,valueAt,evaluated,clone,splitKeys,splitClip,validateProject,dimensions,animated};
if(typeof module==='object')module.exports=api;else root.LOOXVideoCore=api;
})(typeof globalThis==='object'?globalThis:this);
