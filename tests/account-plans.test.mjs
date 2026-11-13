import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('all four plans render before configuration loads, then initialize estimates',async()=>{
 const nodes=[];
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.value='';nodes.push(this);}
  append(...items){this.children.push(...items);if(this.tag==='select'&&!this.value&&items[0])this.value=String(items[0].value);}
  replaceChildren(...items){this.children=[];this.append(...items);}
  get options(){return this.children;}
  setAttribute(k,v){this.attributes[k]=v;}
  before(){} addEventListener(){}
 }
 const ids=Object.fromEntries(['lp-plan-grid','lp-billing-notice','lp-estimate-model','lp-estimate-duration','lp-estimate-note'].map(id=>[id,new Element(id.includes('model')||id.includes('duration')?'select':'div')]));
 let called=false;
 const context={console,URL,URLSearchParams,Intl,document:{getElementById:id=>ids[id],createElement:t=>new Element(t),body:{hasAttribute:key=>key==='data-account-upgrade'},querySelectorAll:()=>nodes.filter(n=>n.className==='lp-plan-estimates'),addEventListener(){},referrer:''},location:{href:'https://example.com/upgrade.html',search:'',pathname:'/upgrade.html',origin:'https://example.com'},state:{user:null},config:()=>{called=true;return Promise.resolve({plans:[],videoModels:[{id:'grok_video',name:'Grok',available:true,durationOptions:[5],creditCosts:{5:11},minimumPlan:'creator',capabilities:{resolution:'720p'}}]});}};
 const source=fs.readFileSync(new URL('../platform/account-pages.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInNewContext(source,context);assert.equal(called,true);assert.equal(ids['lp-plan-grid'].children.length,4);
 assert.match(ids['lp-plan-grid'].children[3].children.map(n=>n.textContent||'').join(' '),/LOOX Business/);
 await Promise.resolve();assert.equal(ids['lp-plan-grid'].children.length,4);assert.equal(ids['lp-estimate-model'].options[0].value,'grok_video');
});
