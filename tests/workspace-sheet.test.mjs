import test from 'node:test';
import assert from 'node:assert/strict';
import {openSheet} from '../platform/workspace-sheet.js';
class Element extends EventTarget{
 constructor(){super();this.style={overflow:''};this.children=[];this.open=false;}
 append(...children){this.children.push(...children);}
 setAttribute(){} remove(){this.removed=true;} focus(){} showModal(){this.open=true;} close(){this.open=false;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}
}
function fixture(){const body=new Element(),html=new Element();globalThis.document={body,documentElement:html,activeElement:new Element(),createElement:()=>new Element()};return {body,html};}
test('replacing a sheet preserves the new lock and restores both original overflow values',async()=>{
 const {body,html}=fixture();body.style.overflow='auto';html.style.overflow='scroll';let closed=0;
 const first=openSheet('Settings',new Element(),{onClose:()=>closed++});
 const second=openSheet('Models',new Element());await Promise.resolve();
 assert.equal(first.open,false);assert.equal(closed,1);assert.equal(body.style.overflow,'hidden');assert.equal(html.style.overflow,'hidden');
 second.close();await Promise.resolve();assert.equal(body.style.overflow,'auto');assert.equal(html.style.overflow,'scroll');assert.equal(second.removed,true);
});
test('Escape cancellation restores scrolling and cleanup runs once',async()=>{
 const {body,html}=fixture();let closed=0;const sheet=openSheet('Styles',new Element(),{onClose:()=>closed++});sheet.dispatchEvent(new Event('cancel',{cancelable:true}));await Promise.resolve();
 assert.equal(sheet.open,false);assert.equal(body.style.overflow,'');assert.equal(html.style.overflow,'');assert.equal(closed,1);
});
