/* Real browser checks. Open photo-studio-browser.html through a local static server. */
'use strict';
const frame=document.querySelector('#editor'),results=document.querySelector('#results'),summary=document.querySelector('#summary');
let doc,win,encodings=[],failures=0,checks=0,errors=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,message='Timed out'){for(let n=0;n<160;n++){if(fn())return;await wait(25)}throw Error(message)}
const idle=async()=>{await wait(90);await new Promise(r=>win.requestAnimationFrame(()=>win.requestAnimationFrame(r)))};
function assert(condition,message){if(!condition)throw Error(message)}
async function check(name,fn){checks++;const row=document.createElement('tr');try{const detail=await fn();row.innerHTML='<td></td><td class="pass">PASS</td><td></td>';row.children[2].textContent=detail||''}catch(e){failures++;row.innerHTML='<td></td><td class="fail">FAIL</td><td></td>';row.children[2].textContent=e.message}row.children[0].textContent=name;results.append(row);summary.textContent=`${checks-failures}/${checks} passed${failures?' · '+failures+' failed':''}`}
const id=name=>doc.getElementById(name);
async function clickText(text){const b=[...doc.querySelectorAll('#panelContent button')].find(b=>b.textContent.trim()===text);assert(b,'Missing button '+text);b.click();await idle()}
async function tool(name){if(win.innerWidth<768&&id('inspector').classList.contains('open')&&id('panelTitle').textContent.toLowerCase()===name)return;doc.querySelector(`.rail [data-tab="${name}"]`).click();await idle()}
async function number(name,value){const input=doc.querySelector(`input[aria-label="${name} value"]`);assert(input,'Missing control '+name);input.value=value;input.dispatchEvent(new win.Event('change',{bubbles:true}));await idle()}
const pixels=()=>id('canvas').getContext('2d').getImageData(0,0,id('canvas').width,id('canvas').height).data;
const equalPixels=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<=1);
async function loadFixture(){
 const c=doc.createElement('canvas');c.width=240;c.height=160;const cx=c.getContext('2d');cx.fillStyle='#e3455b';cx.fillRect(0,0,120,80);cx.fillStyle='#1ea787';cx.fillRect(120,0,120,80);cx.fillStyle='#325ed8';cx.fillRect(0,80,120,80);cx.fillStyle='#f4c44c';cx.fillRect(120,80,120,80);cx.clearRect(0,0,12,12);
 const blob=await new Promise(r=>c.toBlob(r));const file=new win.File([blob],'studio-fixture.png',{type:'image/png'}),transfer=new win.DataTransfer();transfer.items.add(file);id('fileInput').files=transfer.files;id('fileInput').dispatchEvent(new win.Event('change',{bubbles:true}));await until(()=>id('dimensions').textContent==='240 × 160');await idle();
}
async function exportBlob(type='image/png'){
 id('exportTop').click();await idle();id('format').value=type;id('format').dispatchEvent(new win.Event('change',{bubbles:true}));const start=encodings.length;await until(()=>encodings.length>start&&id('exportFileSize').textContent.includes('KB'),'Export encoding did not complete');return encodings.at(-1);
}
async function init(){
 doc=frame.contentDocument;win=frame.contentWindow;await until(()=>doc.querySelector('#panView svg'));
 win.confirm=()=>true;win.Element.prototype.setPointerCapture=function(){};win.addEventListener('error',e=>errors.push(e.message));
 const original=win.HTMLCanvasElement.prototype.toBlob;win.HTMLCanvasElement.prototype.toBlob=function(callback,...args){return original.call(this,blob=>{if(blob)encodings.push(blob);callback(blob)},...args)};
}
document.querySelector('#viewport').onchange=async e=>{const [w,h]=e.target.value.split('×');frame.width=w;frame.height=h;await idle();summary.textContent=`Visual review: ${w} × ${h}`};
document.querySelector('#run').onclick=async()=>{
 const run=document.querySelector('#run');run.disabled=true;checks=failures=0;errors=[];results.replaceChildren();summary.textContent='Running…';
 try{
  await init();
  await check('Import at original resolution',async()=>{await loadFixture();assert(id('canvas').width===240&&pixels()[3]===0,'Resolution/transparency changed');return '240 × 160 PNG, transparency retained'});
  await check('Photo drag cancellation and proportional corner resize',async()=>{
   await tool('tools');const canvas=id('canvas'),r=canvas.getBoundingClientRect(),x=r.left+r.width*.4,y=r.top+r.height*.4;
   const event=(type,target,px,py)=>target.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:31,pointerType:'mouse',clientX:px,clientY:py,buttons:type==='pointerup'?0:1}));
   const original=pixels().slice();event('pointerdown',canvas,x,y);event('pointermove',canvas,x+30,y+20);event('pointercancel',canvas,x+30,y+20);await idle();assert(equalPixels(original,pixels()),'Cancelled drag changed photo');
   event('pointerdown',canvas,x,y);event('pointerup',canvas,x,y);await idle();const h=doc.querySelector('[data-photo-handle="se"]'),box=h.getBoundingClientRect(),hx=box.x+box.width/2,hy=box.y+box.height/2;
   event('pointerdown',h,hx,hy);event('pointermove',h,hx-45,hy-30);event('pointerup',h,hx-45,hy-30);await idle();const dims=id('photoSizeBadge').textContent.match(/(\d+) × (\d+)/);assert(Math.abs(Number(dims[1])/Number(dims[2])-1.5)<.02,'Corner resize distorted aspect');id('undo').click();await idle();assert(equalPixels(original,pixels()),'Resize undo lost original quality');return 'Simulated pointer events; cancellation, ratio and undo checked';
  });
  await check('Drawing stroke and selective blur undo',async()=>{
   await tool('draw');await clickText('Draw mode');const canvas=id('canvas'),r=canvas.getBoundingClientRect(),before=pixels().slice();
   const event=(type,x,y)=>canvas.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:41,pointerType:'mouse',clientX:r.left+x*r.width,clientY:r.top+y*r.height,buttons:type==='pointerup'?0:1}));
   event('pointerdown',.2,.2);event('pointermove',.6,.7);event('pointerup',.6,.7);await idle();assert(!equalPixels(before,pixels()),'Drawing stroke not visible');id('undo').click();await idle();assert(equalPixels(before,pixels()),'Stroke undo failed');
   await tool('layers');await clickText('Main photo');await tool('retouch');await clickText('Blur brush');const rr=canvas.getBoundingClientRect();
   for(const [type,dx] of [['pointerdown',-.04],['pointermove',.04],['pointerup',.04]])canvas.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:42,pointerType:'mouse',clientX:rr.left+rr.width*(.5+dx),clientY:rr.top+rr.height*.5,buttons:type==='pointerup'?0:1}));
   await idle();assert(!equalPixels(before,pixels()),'Blur mask had no effect');id('undo').click();await idle();assert(equalPixels(before,pixels()),'Retouch undo failed');return 'Simulated pointer strokes restore exact original pixels';
  });
  await check('Photo overlays keep adjustments isolated from the main photo',async()=>{
   const c=doc.createElement('canvas');c.width=60;c.height=40;const cx=c.getContext('2d');cx.fillStyle='#6080a0';cx.fillRect(0,0,60,40);const blob=await new Promise(r=>c.toBlob(r));const dt=new win.DataTransfer();dt.items.add(new win.File([blob],'overlay.png',{type:'image/png'}));id('overlayInput').files=dt.files;id('overlayInput').dispatchEvent(new win.Event('change'));await until(()=>id('status').textContent==='Photo layer added');await idle();
   const before=pixels().slice();await tool('adjust');await number('Brightness',40);const after=pixels().slice();assert(!equalPixels(before,after),'Photo overlay adjustment not visible');const offset=(130*240+200)*4;assert(before[offset]===after[offset],'Photo adjustment changed main layer');id('undo').click();await idle();assert(equalPixels(before,pixels()),'Overlay effect undo failed');await tool('layers');await clickText('Delete layer');
  });
  await check('Imported main photo drags directly and can optionally be locked',async()=>{
   await tool('tools');assert(id('movePhoto').getAttribute('aria-pressed')==='true','Imported image movement is disabled by default');
   const c=id('canvas'),r=c.getBoundingClientRect(),before=pixels().slice();
   const pointer=(type,x,y)=>c.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:71,pointerType:'mouse',clientX:r.left+r.width*x,clientY:r.top+r.height*y,button:0}));
   pointer('pointerdown',.4,.4);pointer('pointermove',.5,.5);pointer('pointerup',.5,.5);await idle();assert(!equalPixels(before,pixels()),'Dragging the imported photo had no effect');id('undo').click();await idle();assert(equalPixels(before,pixels()),'Photo drag undo failed');
   id('movePhoto').click();await idle();pointer('pointerdown',.4,.4);pointer('pointermove',.5,.5);pointer('pointerup',.5,.5);await idle();assert(equalPixels(before,pixels()),'Position lock did not prevent movement');id('movePhoto').click();
  });
  await check('Drawing and retouch panels prevent photo dragging without disabling normal movement',async()=>{
   const c=id('canvas'),before=pixels().slice();
   for(const name of ['draw','retouch']){await tool(name);const r=c.getBoundingClientRect();for(const [type,x] of [['pointerdown',.4],['pointermove',.6],['pointerup',.6]])c.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:79,pointerType:'mouse',clientX:r.left+r.width*x,clientY:r.top+r.height*.4,button:0}));await idle();assert(equalPixels(before,pixels()),name+' moved the photo')}
   await tool('tools');assert(id('movePhoto').getAttribute('aria-pressed')==='true','Returning to Tools disabled photo dragging');
  });
  await check('Drawing uses a display-sized preview and hides transformation handles',async()=>{
   await tool('draw');await clickText('Draw mode');assert(id('photoSelection').hidden,'Photo resize handles are active over drawing');
   const c=id('canvas'),r=c.getBoundingClientRect(),before=pixels().slice();
   const pointer=(type,x,y)=>c.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:72,pointerType:'mouse',clientX:r.left+r.width*x,clientY:r.top+r.height*y,button:0}));
   pointer('pointerdown',.1,.3);for(let n=0;n<120;n++)pointer('pointermove',.1+n*.006,.3+Math.sin(n/12)*.1);await idle();
   assert(equalPixels(before,pixels()),'Full-resolution canvas was repainted during an unfinished stroke');const preview=doc.querySelector('.photo-gesture-preview');assert(!preview.hidden,'Live stroke preview is missing');assert(Math.max(preview.width,preview.height)<=1000,'Stroke preview exceeds bounded resolution');
   pointer('pointerup',.82,.3);await idle();assert(!equalPixels(before,pixels()),'Final drawing was not committed');id('undo').click();await idle();assert(equalPixels(before,pixels()),'Stroke did not undo as one operation');
  });
  await check('Cancelled strokes leave no pixels or unwanted photo movement',async()=>{
   await tool('draw');await clickText('Draw mode');const c=id('canvas'),r=c.getBoundingClientRect(),before=pixels().slice();
   for(const [type,x] of [['pointerdown',.2],['pointermove',.7],['pointercancel',.7]])c.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:73,pointerType:'mouse',clientX:r.left+r.width*x,clientY:r.top+r.height*.4,button:0}));
   await idle();assert(equalPixels(before,pixels()),'Cancelled stroke persisted');assert(id('photoSelection').hidden,'Cancelled drawing exposed photo handles');
  });
  await check('Rectangle path does not refill an earlier brush stroke',async()=>{
   await tool('draw');await clickText('Draw mode');const c=id('canvas'),r=c.getBoundingClientRect();
   for(const [type,x] of [['pointerdown',.1],['pointermove',.8],['pointerup',.8]])c.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:74,pointerType:'mouse',clientX:r.left+r.width*x,clientY:r.top+r.height*.85,button:0}));await idle();
   const before=pixels().slice();await tool('elements');await clickText('▢ Rectangle');await number('Horizontal position',20);await number('Vertical position',20);await number('Width',35);await number('Height',25);
   // A contaminated path also fills around the old round brush dot, far outside this rectangle.
   const after=pixels();for(let y=100;y<160;y++)for(let x=0;x<240;x++){const i=(y*240+x)*4;for(let ch=0;ch<4;ch++)assert(Math.abs(before[i+ch]-after[i+ch])<=1,'Rectangle filled pixels outside its bounds')}
   id('undo').click();await idle();id('undo').click();await idle();id('undo').click();await idle();id('undo').click();await idle();id('undo').click();await idle();id('undo').click();await idle();
  });
  await check('Unused inspector cross has been removed',async()=>{assert(!id('closeDrawer'),'Inspector cross is still present')});
  await check('Adjustment, undo and redo',async()=>{await tool('adjust');const before=pixels().slice();await number('Brightness',15);const after=pixels().slice();assert(!equalPixels(before,after),'Brightness had no effect');id('undo').click();await idle();assert(equalPixels(before,pixels()),'Undo did not restore pixels');id('redo').click();await idle();assert(equalPixels(after,pixels()),'Redo did not restore effect')});
  await check('Individual adjustment reset',async()=>{doc.querySelector('[aria-label="Reset Brightness"]').click();await idle();assert(doc.querySelector('[aria-label="Brightness value"]').value==='0','Brightness reset is not zero')});
  await check('Filter preview cancel and intensity undo',async()=>{const before=pixels().slice();await tool('filters');doc.querySelector('.filter-choice[aria-label="Clean filter"]').click();await idle();id('filterIntensity').value=30;id('filterIntensity').dispatchEvent(new win.Event('input'));await idle();id('filterCancel').click();await idle();assert(equalPixels(before,pixels()),'Cancelled preview changed pixels');await tool('filters');doc.querySelector('.filter-choice[aria-label="Clean filter"]').click();id('filterIntensity').value=35;id('filterIntensity').dispatchEvent(new win.Event('input'));id('filterApply').click();await idle();assert(!equalPixels(before,pixels()),'Confirmed filter has no effect');id('undo').click();await idle();assert(equalPixels(before,pixels()),'Filter undo failed')});
  await check('Multiline text and font controls',async()=>{await tool('text');await clickText('＋ Add heading');const text=doc.querySelector('.photo-inline-text-editor');text.value='LOOX\nPhoto Studio';text.dispatchEvent(new win.Event('input',{bubbles:true}));text.blur();await idle();await number('Font size',24);await number('Letter spacing',2);await number('Line height',1.5);await clickText('Italic');await clickText('Underline');await clickText('Center align');assert(doc.querySelector('#panelContent textarea').value==='LOOX\nPhoto Studio','Multiline text lost')});
  await check('Opening another tool preserves layer selection',async()=>{await tool('layers');await clickText('Main photo');await tool('text');assert(doc.querySelector('.text-select').value==='-1','Opening Text selected a layer');await tool('layers');await clickText('Main photo')});
  await check('Shapes, layer rename, duplication, opacity and blend',async()=>{await tool('elements');await clickText('▢ Rectangle');await tool('layers');const name=doc.querySelector('#panelContent input[type=text]');name.value='Design accent';name.dispatchEvent(new win.Event('change'));await idle();assert([...doc.querySelectorAll('.layer-select')].some(b=>b.textContent==='Design accent'),'Rename failed');await number('Opacity',45);const select=doc.querySelector('[aria-label="Layer blend mode"]');select.value='multiply';select.dispatchEvent(new win.Event('change'));await clickText('Duplicate');assert(doc.querySelectorAll('.layer-row').length===3,'Duplication failed');await clickText('Move backward');await clickText('Center horizontally');await clickText('Center vertically')});
  await check('Hidden and locked layers cannot be edited',async()=>{doc.querySelector('.layer-row.selected [aria-label="Lock layer"]').click();await idle();assert(!doc.querySelector('[aria-label="Opacity value"]'),'Locked layer controls available');doc.querySelector('.layer-row.selected [aria-label="Unlock layer"]').click();await idle();doc.querySelector('.layer-row.selected [aria-label="Hide layer"]').click();await idle();assert(!doc.querySelector('[aria-label="Opacity value"]'),'Hidden layer controls available');doc.querySelector('.layer-row.selected [aria-label="Show layer"]').click();await idle()});
  await check('Rotate composition four times without layer drift',async()=>{await tool('tools');const before=pixels().slice();for(let n=0;n<4;n++)await clickText('↻ Rotate 90°');assert(id('canvas').width===240&&id('canvas').height===160,'Dimensions did not restore');assert(equalPixels(before,pixels()),'Layers moved after four rotations')});
  await check('Flip composition twice without layer drift',async()=>{const before=pixels().slice();await clickText('⇄ Flip H');await clickText('⇄ Flip H');assert(equalPixels(before,pixels()),'Layers moved after two flips')});
  await check('Crop photo preserves canvas and overlay count',async()=>{await tool('layers');const count=doc.querySelectorAll('.layer-row').length;await clickText('Main photo');await tool('crop');await clickText('1:1');await clickText('Apply crop');assert(id('canvas').width===240&&id('canvas').height===160,'Photo crop changed canvas');await tool('layers');assert(doc.querySelectorAll('.layer-row').length===count,'Photo crop removed layers');id('undo').click();await idle()});
  await check('Crop entire canvas and restore with undo',async()=>{await tool('tools');await clickText('⌗ Crop canvas');await clickText('1:1');await clickText('Apply crop');assert(id('canvas').width===160&&id('canvas').height===160,'Canvas crop dimensions wrong');id('undo').click();await idle();assert(id('canvas').width===240,'Canvas crop undo failed')});
  await check('Resize twice and undo restores original geometry',async()=>{await tool('resize');const widths=doc.querySelectorAll('.dimension-row input');widths[0].value=480;widths[1].value=320;await clickText('Apply size');assert(id('canvas').width===480&&id('canvas').height===320,'Resize failed');id('undo').click();await idle();assert(id('canvas').width===240,'Resize undo failed')});
  await check('Transparent and gradient backgrounds are independent',async()=>{await tool('resize');await clickText('Gradient background');assert(doc.querySelector('.canvas-transparency-backdrop').style.backgroundImage.includes('gradient'),'Gradient preview missing');await clickText('Transparent');assert(!doc.querySelector('.canvas-transparency-backdrop').style.backgroundImage,'Transparency not restored')});
  await check('Drawing and retouch modes do not leak across tabs',async()=>{await tool('draw');await clickText('Draw mode');await tool('retouch');assert(![...doc.querySelectorAll('.action-grid button.selected')].some(b=>b.textContent==='Blur brush'),'Retouch inherited draw mode');await tool('layers');await clickText('Main photo')});
  await check('PNG export matches visible pixels, without handles',async()=>{const expected=pixels().slice(),blob=await exportBlob();assert(blob.type==='image/png','Wrong PNG MIME');const bitmap=await win.createImageBitmap(blob),c=doc.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);assert(equalPixels(expected,c.getContext('2d').getImageData(0,0,c.width,c.height).data),'Export does not match preview');assert(id('quality').disabled,'PNG quality is not disabled');id('closeExport').click()});
  await check('JPEG and WebP encoders produce correct MIME types',async()=>{for(const type of ['image/jpeg','image/webp']){const blob=await exportBlob(type);assert(blob.type===type,'Encoder silently fell back to '+blob.type);id('closeExport').click()}});
  await check('Custom export resolution and bounds validation',async()=>{await exportBlob();id('exportSize').value='custom';id('exportSize').dispatchEvent(new win.Event('change'));id('customExportWidth').value=300;id('customExportHeight').value=200;id('customExportWidth').dispatchEvent(new win.Event('input'));const start=encodings.length;await until(()=>encodings.length>start);const image=await win.createImageBitmap(encodings.at(-1));assert(image.width===300&&image.height===200,'Custom output resolution ignored');id('customExportWidth').value=9000;id('customExportWidth').dispatchEvent(new win.Event('input'));await until(()=>id('exportFileSize').textContent.includes('unavailable'));id('closeExport').click();id('exportSize').value='original'});
  for(const [w,h]of [[320,568],[360,740],[375,812],[390,844],[414,896],[768,1024],[1024,768],[1280,800],[1440,900],[1920,1080],[2560,1440],[667,375]]){
   await check(`Responsive canvas and controls: ${w} × ${h}`,async()=>{
    frame.width=w;frame.height=h;await idle();await tool('adjust');const app=doc.querySelector('.app').getBoundingClientRect(),canvas=id('canvas').getBoundingClientRect(),zone=id('dropzone').getBoundingClientRect(),options=id('inspector').getBoundingClientRect(),bottom=doc.querySelector('.mobile-bar').getBoundingClientRect();
    assert(doc.documentElement.scrollWidth<=w+1,'Horizontal page overflow');assert(app.bottom<=h+2,'Editor extends below viewport');assert(zone.height>=42&&canvas.height>0,'No usable image preview');assert(canvas.top>=zone.top-2&&canvas.bottom<=zone.bottom+2,'Fit image clipped');
    assert(options.bottom<=h+1&&options.right<=w+1,'Controls outside viewport');if(w<768){assert(options.bottom<=bottom.top+1,'Tray overlaps mobile tools');assert(canvas.bottom<=options.top+1||canvas.right<=options.left+1,'Tray covers image')}
    const out=id('exportTop').getBoundingClientRect();assert(out.right<=w&&out.top>=0,'Export button clipped');
    if(w===320)assert(canvas.height>=90,'Small-phone preview too short');return `Canvas ${Math.round(canvas.width)} × ${Math.round(canvas.height)}, controls in bounds`;
   });
  }
  await check('Optional local recovery restores composition',async()=>{
   frame.width=390;frame.height=844;await idle();await tool('tools');const checkbox=doc.querySelector('.autosave-option input');checkbox.checked=true;checkbox.dispatchEvent(new win.Event('change'));await until(()=>id('saveState').textContent==='Saved on this device','Project did not autosave');
   const expected=pixels().slice();frame.src='../photo-editor.html?recovery-test';await new Promise(r=>frame.onload=r);await init();await until(()=>!id('recoveryBanner').hidden,'Recovery banner missing');id('restoreProject').click();await until(()=>id('status').textContent.includes('recovered'));await idle();assert(equalPixels(expected,pixels()),'Recovered pixels differ');await tool('tools');const off=doc.querySelector('.autosave-option input');off.checked=false;off.dispatchEvent(new win.Event('change'));await clickText('Clear saved project');
  });
  await check('Editor has no unexpected runtime errors',async()=>{assert(!errors.length,errors.join('; '));return 'No application runtime errors'});
 }catch(e){await check('Suite setup',()=>{throw e})}finally{run.disabled=false;summary.textContent=`Complete: ${checks-failures}/${checks} passed${failures?' · '+failures+' failed':''}`;document.title=`Photo Studio QA: ${checks-failures}/${checks} passed`}
};
