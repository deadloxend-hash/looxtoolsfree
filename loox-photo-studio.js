/* LOOX Photo Studio — original local-first layered canvas editor */
(()=>{
'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
if(!ctx){$('status').textContent='Canvas is unavailable in this browser';return}
const layers=[],history=[],future=[],urls=new Set();
let nextId=1,selected=null,tool='move',drag=null,comparison=false,crop={x:5,y:5,w:90,h:90},cropRatio='free';
let bg='#ffffff',transparent=false,baseImageId=null;
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const colors={violet:'#a78bfa',pink:'#f48fc6'};
const snapshot=()=>({layers:layers.map(l=>({...l,points:l.points?l.points.map(p=>({...p})):undefined})),width:canvas.width,height:canvas.height,bg,transparent,baseImageId});
function remember(){history.push(snapshot());if(history.length>35)history.shift();future.length=0}
function restore(state){layers.splice(0,layers.length,...state.layers.map(l=>({...l,points:l.points?l.points.map(p=>({...p})):undefined})));canvas.width=state.width;canvas.height=state.height;bg=state.bg;transparent=state.transparent;baseImageId=state.baseImageId;selected=layers.some(l=>l.id===selected)?selected:null;$('background').value=bg;$('transparent').value=String(transparent);refresh()}
$('undo').onclick=()=>{if(!history.length)return;future.push(snapshot());restore(history.pop())};
$('redo').onclick=()=>{if(!future.length)return;history.push(snapshot());restore(future.pop())};
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||/input|textarea|select/i.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();e.shiftKey?$('redo').click():$('undo').click()}if(k==='y'){e.preventDefault();$('redo').click()}});
const say=s=>$('status').textContent=s;
const base=(kind,name)=>({id:nextId++,kind,name,x:.5,y:.5,w:.6,h:.5,rotation:0,scale:1,opacity:1,flip:1,color:'#ffffff',font:'Arial',fontSize:70,text:'Your title',effect:'shadow',filter:'none',brightness:100,contrast:100,saturation:100,blur:0,zoom:1,panX:0,panY:0,fit:'contain',shape:'rectangle',stroke:'#ffffff',points:[],brushWidth:16});
const own=()=>layers.find(l=>l.id===selected)||null;
function pick(id){selected=id;showLayers();showInspector();draw()}
function updateEmpty(){$('empty').classList.toggle('studio-hidden',layers.length>0)}
function refresh(){updateEmpty();showLayers();showInspector();$('dimensions').textContent=canvas.width+' × '+canvas.height;draw()}
function createFileImage(url){const img=new Image();img.src=url;return new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve(img);img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Cannot decode image'))})}
async function addFiles(fileList){
 const files=Array.from(fileList||[]).filter(f=>f.type.startsWith('image/'));if(!files.length)return;
 remember();let good=0,bad=0;
 for(const f of files){const url=URL.createObjectURL(f);urls.add(url);let img;
  try{img=await createFileImage(url)}catch{bad++;URL.revokeObjectURL(url);urls.delete(url);continue}
  const l=base('image',f.name);l.img=img;l.url=url;
  if(!layers.length){
   const max=6144,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
   canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
   l.w=1;l.h=1;l.fit='cover';l.name='Original · '+f.name;baseImageId=l.id;
   if(ratio<1)say('Large image fitted within 6144px for browser performance.')
  }else{l.w=.52;l.h=.52}
  layers.push(l);selected=l.id;good++
 }
 refresh();say('Imported '+good+' photo(s)'+(bad?' · '+bad+' unsupported file(s)':'')+'.');
}
$('file').onchange=async e=>{await addFiles(e.target.files);e.target.value=''};
$('upload').onclick=()=>$('file').click();
$('shell').addEventListener('dragover',e=>e.preventDefault());
$('shell').addEventListener('drop',e=>{e.preventDefault();addFiles(e.dataTransfer.files)});
function addText(){remember();const l=base('text','Text '+nextId);l.text='Your title';l.w=.84;l.h=.28;layers.push(l);selected=l.id;tool='move';refresh();say('Title added. Edit font, color and effects in Inspector.')}
function addShape(shape){remember();const l=base('shape',shape+' shape');l.shape=shape;l.color=shape==='circle'?'#a78bfa':'#e45daa';l.w=.4;l.h=.38;layers.push(l);selected=l.id;tool='move';refresh()}
$('addText').onclick=addText;
function activate(t){
 tool=t;document.querySelectorAll('.studio-toolrail button').forEach(b=>b.classList.toggle('active',b.id==='tool'+t[0].toUpperCase()+t.slice(1)));
 $('libraryTitle').textContent=({move:'Layers & assets',upload:'Import images',text:'Text & typography',shape:'Shapes',draw:'Draw on canvas',eraser:'Erase with brush',crop:'Crop composition',canvas:'Canvas size'})[t]||'Layers & assets';
 $('libraryHelp').textContent=({move:'Select a layer and drag it around the canvas.',upload:'Add JPG, PNG, WebP and other browser-supported images.',text:'Add titles, choose fonts and create effects.',shape:'Add rectangle and circle shapes with editable colors.',draw:'Drag across the canvas to paint with your chosen brush.',eraser:'Drag over the artwork to remove pixels in the composite.',crop:'Choose a crop rectangle then apply it to the entire composition.',canvas:'Change the width and height of your design.'})[t];
 showInspector();draw();
}
['Move','Upload','Text','Shape','Draw','Eraser','Crop','Canvas'].forEach(t=>{$('tool'+t).onclick=()=>{
 activate(t.toLowerCase());if(t==='Upload')$('file').click();if(t==='Text')addText();if(t==='Shape')showShapePalette();
}});
function showShapePalette(){
 $('libraryTitle').textContent='Add shapes';
 const list=$('layerList');list.innerHTML='<div class="studio-button-row"><button type="button" class="studio-btn secondary" id="addRect">▭ Rectangle</button><button type="button" class="studio-btn secondary" id="addCircle">◯ Circle</button></div>';
 $('addRect').onclick=()=>addShape('rectangle');$('addCircle').onclick=()=>addShape('circle')
}
$('brushSize').oninput=e=>$('brushValue').textContent=e.target.value;
function showLayers(){
 const list=$('layerList');list.innerHTML='';
 if(!layers.length){list.innerHTML='<p class="studio-section-note">No layers yet.</p>';return}
 [...layers].reverse().forEach(l=>{
  const b=document.createElement('button');b.className='studio-list-item';b.type='button';b.setAttribute('aria-pressed',String(selected===l.id));
  const symbol=({image:'▧',text:'T',shape:'⬡',paint:'✎',erase:'◌'})[l.kind]||'◈';
  b.innerHTML='<span class="symbol">'+symbol+'</span><span><strong>'+esc(l.name)+'</strong><small>'+esc(l.kind)+' layer</small></span>';b.onclick=()=>{activate('move');pick(l.id)};list.appendChild(b)
 })
}
function field(title,key,value,type='number',min='',max='',step='1'){
 let control=type==='textarea'?'<textarea data-prop="'+key+'">'+esc(value)+'</textarea>':type==='select'?'<select data-prop="'+key+'">'+value+'</select>':'<input data-prop="'+key+'" type="'+type+'" value="'+esc(value)+'" '+(min!==''?'min="'+min+'"':'')+' '+(max!==''?'max="'+max+'"':'')+' step="'+step+'">';
 return '<label class="studio-field"><span>'+title+'</span>'+control+'</label>'
}
const options=(arr,actual)=>arr.map(([value,name])=>'<option value="'+esc(value)+'" '+(String(actual)===String(value)?'selected':'')+'>'+esc(name)+'</option>').join('');
function cropUnit(){return {x:crop.x/100,y:crop.y/100,w:crop.w/100,h:crop.h/100}}
function cropValue(){if(cropRatio==='free')return 0;const p=cropRatio.split(':').map(Number);return p[0]/p[1]}
function fitCropRatio(changed=''){
 const ratio=cropValue();if(!ratio)return;
 const target=ratio*canvas.height/canvas.width;
 const cx=crop.x+crop.w/2,cy=crop.y+crop.h/2;
 let w=crop.w/100,h=crop.h/100;
 if(changed==='w')h=w/target;
 else if(changed==='h')w=h*target;
 else if(w/h>target)w=h*target;
 else h=w/target;
 if(w>1){w=1;h=w/target}
 if(h>1){h=1;w=h*target}
 crop.w=clamp(w*100,.2,100);crop.h=clamp(h*100,.2,100);
 crop.x=clamp(cx-crop.w/2,0,100-crop.w);crop.y=clamp(cy-crop.h/2,0,100-crop.h)
}
function syncCropControls(except=null){
 const root=$('inspector');if(tool!=='crop')return;
 const values={cropX:Math.round(crop.x*canvas.width/100),cropY:Math.round(crop.y*canvas.height/100),
 cropW:Math.round(crop.w*canvas.width/100),cropH:Math.round(crop.h*canvas.height/100)};
 for(const [k,v] of Object.entries(values)){const el=root.querySelector('[data-prop='+k+']');if(el&&el!==except)el.value=v}
 const output=root.querySelector('#cropReadout');
 if(output)output.textContent='Output: '+Math.max(1,values.cropW)+' × '+Math.max(1,values.cropH)+' px';
}
function showInspector(){
 const root=$('inspector'),l=own();
 if(tool==='crop'){
  root.innerHTML='<p class="studio-crop-guide">Drag inside the crop to move it, or drag any of its eight white handles to resize. Choose an aspect ratio or enter exact pixels below.</p>'+
  field('Crop aspect ratio','cropRatio',options([['free','Free crop'],['1:1','1:1 Square'],['16:9','16:9 Landscape'],['9:16','9:16 Portrait'],['4:3','4:3 Classic'],['3:2','3:2 Photo'],['4:5','4:5 Portrait']],cropRatio),'select')+
  '<div class="studio-field-grid">'+field('X position (px)','cropX',Math.round(crop.x*canvas.width/100),'number',0,canvas.width)+field('Y position (px)','cropY',Math.round(crop.y*canvas.height/100),'number',0,canvas.height)+
  field('Width (px)','cropW',Math.round(crop.w*canvas.width/100),'number',8,canvas.width)+field('Height (px)','cropH',Math.round(crop.h*canvas.height/100),'number',8,canvas.height)+'</div>'+
  '<p class="studio-section-note" id="cropReadout"></p><div class="studio-button-row"><button class="studio-btn" id="applyCrop">✓ Apply crop</button><button class="studio-btn secondary" id="resetCrop">Reset</button></div>'+
  '<p class="studio-crop-guide">Crop applies to the complete composition and flattens it into a new image layer; Undo restores your previous layers.</p>';
  const ratioInput=root.querySelector('[data-prop=cropRatio]');
  ratioInput.onchange=()=>{cropRatio=ratioInput.value;fitCropRatio();syncCropControls();draw()};
  ['cropX','cropY','cropW','cropH'].forEach(key=>{
   const input=root.querySelector('[data-prop='+key+']');
   input.oninput=()=>{
    const value=Number(input.value),unit=(key==='cropX'||key==='cropW'?canvas.width:canvas.height);
    if(!Number.isFinite(value))return;
    const prop=key.slice(-1).toLowerCase();
    crop[prop]=clamp(value/unit*100,prop==='w'||prop==='h'?.2:0,100);
    crop.w=clamp(crop.w,.2,100-crop.x);crop.h=clamp(crop.h,.2,100-crop.y);
    crop.x=clamp(crop.x,0,100-crop.w);crop.y=clamp(crop.y,0,100-crop.h);
    if(cropRatio!=='free'&&(prop==='w'||prop==='h'))fitCropRatio(prop);
    syncCropControls(input);draw()
   }
  });
  root.querySelector('#applyCrop').onclick=applyCrop;
  root.querySelector('#resetCrop').onclick=()=>{crop={x:5,y:5,w:90,h:90};fitCropRatio();syncCropControls();draw()};
  syncCropControls();return
 }
 if(tool==='canvas'){
  root.innerHTML='<p class="studio-section-note">Resize the output canvas. Existing layers scale proportionally with it.</p>'+
  '<div class="studio-field-grid">'+field('Width px','cw',canvas.width,'number',32,8192)+field('Height px','ch',canvas.height,'number',32,8192)+'</div>'+
  '<div class="studio-button-row"><button class="studio-btn" id="resizeCanvas">Resize</button><button class="studio-btn secondary" data-preset="1920,1080">16:9</button><button class="studio-btn secondary" data-preset="1080,1920">9:16</button><button class="studio-btn secondary" data-preset="1080,1080">Square</button></div>';
  const doResize=(w,h)=>{w=clamp(Math.round(w),32,8192);h=clamp(Math.round(h),32,8192);if(w*h>20000000&&!confirm('Very large canvas dimensions may use a lot of memory. Continue?'))return;remember();canvas.width=w;canvas.height=h;refresh();activate('move');say('Canvas resized to '+w+' × '+h)};
  root.querySelector('#resizeCanvas').onclick=()=>doResize(Number(root.querySelector('[data-prop=cw]').value),Number(root.querySelector('[data-prop=ch]').value));
  root.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>doResize(...b.dataset.preset.split(',').map(Number)));return
 }
 if(tool==='draw'||tool==='eraser'){
  root.innerHTML='<p class="studio-section-note">Use the canvas to '+(tool==='draw'?'paint on a new brush layer.':'erase visible pixels. Transparent parts appear when exported as PNG or WebP.')+'</p><p class="studio-section-note">Color and brush size are available in the left panel.</p>';
  return
 }
 if(!l){root.innerHTML='<p class="studio-section-note">Select a layer to edit it, or add text, shapes or a photo.</p><button class="studio-btn secondary" id="inspectorText">+ Add title</button>';root.querySelector('button').onclick=addText;return}
 let html='<strong style="overflow-wrap:anywhere">'+esc(l.name)+'</strong><p class="studio-section-note">Editable '+l.kind+' layer</p>';
 if(l.kind!=='paint'&&l.kind!=='erase')html+='<div class="studio-field-grid">'+field('X position %','x',Math.round(l.x*100),'number',-100,200)+field('Y position %','y',Math.round(l.y*100),'number',-100,200)+field('Width %','w',Math.round(l.w*100),'number',1,400)+field('Height %','h',Math.round(l.h*100),'number',1,400)+field('Rotation','rotation',l.rotation,'number',-360,360)+field('Opacity %','opacity',Math.round(l.opacity*100),'range',0,100)+'</div>';
 if(l.kind==='image'){
  html+='<h3>Image adjustments</h3><div class="studio-field-grid">'+field('Brightness %','brightness',l.brightness,'range',0,200)+field('Contrast %','contrast',l.contrast,'range',0,200)+field('Saturation %','saturation',l.saturation,'range',0,200)+field('Blur px','blur',l.blur,'range',0,30)+'</div>';
  html+=field('Effect preset','filter',options([['none','Original'],['vivid','Vibrant'],['mono','Black & White'],['vintage','Vintage'],['warm','Warm sunset'],['cool','Cool blue']],l.filter),'select');
  html+=field('Image fit','fit',options([['cover','Fill / crop'],['contain','Show entire photo']],l.fit),'select');
  html+=field('Zoom / crop','zoom',l.zoom,'range',1,4,.05);
  html+='<div class="studio-field-grid">'+field('Crop pan X','panX',l.panX,'range',-100,100)+field('Crop pan Y','panY',l.panY,'range',-100,100)+'</div>';
 }
 if(l.kind==='text'){
  html+=field('Text content','text',l.text,'textarea');
  html+=field('Font family','font',options([['Arial','Modern Sans'],['Georgia','Editorial Serif'],['Impact','Bold Display'],['Verdana','Clean'],['Trebuchet MS','Rounded'],['Courier New','Monospace']],l.font),'select');
  html+='<div class="studio-field-grid">'+field('Font size','fontSize',l.fontSize,'number',12,240)+field('Text color','color',l.color,'color')+'</div>';
  html+=field('Text effect','effect',options([['none','Plain'],['shadow','Soft Shadow'],['outline','Bold Outline'],['neon','Neon Glow']],l.effect),'select')
 }
 if(l.kind==='shape'){html+=field('Shape','shape',options([['rectangle','Rectangle'],['circle','Ellipse']],l.shape),'select');html+=field('Fill','color',l.color,'color')}
 
 if(l.kind==='paint'||l.kind==='erase')html+='<p class="studio-section-note">This brush stroke is independently removable in the layer stack.</p>';
 html+='<div class="studio-button-row"><button class="studio-btn secondary" id="rotateLeft">↶ 90°</button><button class="studio-btn secondary" id="rotateRight">↷ 90°</button><button class="studio-btn secondary" id="flipH">⇋ Flip</button><button class="studio-btn secondary" id="up">↑ Layer</button><button class="studio-btn secondary" id="down">↓ Layer</button><button class="studio-btn secondary" id="duplicate">Duplicate</button><button class="studio-btn danger" id="remove">Delete</button></div>';
 root.innerHTML=html;
 root.querySelectorAll('[data-prop]').forEach(el=>{
  if(el.type==='range')el.onpointerdown=remember;
  const apply=()=>{if(el.type!=='range')remember();let value=el.value,prop=el.dataset.prop;
   if(!['text','font','color','effect','fit','filter','shape'].includes(prop))value=Number(value);
   if(['x','y','w','h','opacity'].includes(prop))value/=100;
   if(prop==='zoom')value=clamp(value,1,4);
   l[prop]=value;draw();if(prop==='text')l.name='Text '+value.slice(0,14);
  };
  el.addEventListener(el.type==='range'?'input':'change',apply)
 });
 root.querySelector('#rotateLeft').onclick=()=>{remember();l.rotation=(l.rotation-90)%360;refresh()};
 root.querySelector('#rotateRight').onclick=()=>{remember();l.rotation=(l.rotation+90)%360;refresh()};
 root.querySelector('#flipH').onclick=()=>{remember();l.flip*=-1;refresh()};
 root.querySelector('#up').onclick=()=>moveLayer(1);
 root.querySelector('#down').onclick=()=>moveLayer(-1);
 root.querySelector('#duplicate').onclick=duplicate;
 root.querySelector('#remove').onclick=remove;
}
function moveLayer(dir){const l=own();if(!l)return;const i=layers.indexOf(l),j=i+dir;if(j<0||j>=layers.length)return;remember();[layers[i],layers[j]]=[layers[j],layers[i]];refresh()}
function duplicate(){const l=own();if(!l)return;remember();const clone={...l,id:nextId++,name:l.name+' copy',x:l.x+.04,y:l.y+.04,points:l.points?l.points.map(p=>({...p})):[]};layers.splice(layers.indexOf(l)+1,0,clone);selected=clone.id;refresh()}
function remove(){const l=own();if(!l)return;remember();layers.splice(layers.indexOf(l),1);selected=null;refresh();say('Layer removed')}
function drawImageLayer(l,w,h){
 if(!l.img||!l.img.naturalWidth)return;
 const sw=l.img.naturalWidth,sh=l.img.naturalHeight,dw=w*l.w,dh=h*l.h,ratio=(l.fit==='cover'?Math.max(dw/sw,dh/sh):Math.min(dw/sw,dh/sh))*l.zoom;
 ctx.beginPath();ctx.rect(-dw/2,-dh/2,dw,dh);ctx.clip();const ox=-Math.max(0,sw*ratio-dw)*(l.panX||0)/200,oy=-Math.max(0,sh*ratio-dh)*(l.panY||0)/200;ctx.drawImage(l.img,-sw*ratio/2+ox,-sh*ratio/2+oy,sw*ratio,sh*ratio)
}
function drawTextLayer(l,w){
 const lines=String(l.text).split('\n').slice(0,12),font=Math.max(6,l.fontSize*w/1280);
 ctx.font='900 '+font+'px '+JSON.stringify(l.font);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=l.color;
 if(l.effect==='shadow'){ctx.shadowColor='#000b';ctx.shadowBlur=Math.max(8,font/3);ctx.shadowOffsetY=font/8}
 if(l.effect==='neon'){ctx.shadowColor=l.color;ctx.shadowBlur=font/2}
 if(l.effect==='outline'){ctx.strokeStyle='#121021';ctx.lineWidth=Math.max(3,font/8);ctx.lineJoin='round'}
 lines.forEach((text,i)=>{const y=(i-(lines.length-1)/2)*font*1.18;if(l.effect==='outline')ctx.strokeText(text,0,y,w*l.w);ctx.fillText(text,0,y,w*l.w)})
}
function drawPath(l,w,h){
 const p=l.points;if(!p||p.length<2)return;
 ctx.save();if(l.kind==='erase')ctx.globalCompositeOperation='destination-out';
 ctx.globalAlpha=l.opacity;ctx.strokeStyle=l.color;ctx.lineWidth=l.brushWidth*w/1280;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
 p.forEach((point,i)=>{if(i===0)ctx.moveTo(point.x*w,point.y*h);else ctx.lineTo(point.x*w,point.y*h)});ctx.stroke();ctx.restore()
}
function render(withSelection=true,onlyOriginal=false){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 if(!transparent){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)}
 const list=onlyOriginal?layers.filter(l=>l.id===baseImageId):layers;
 list.forEach(l=>{
  if(l.kind==='paint'||l.kind==='erase'){drawPath(l,w,h);return}
  ctx.save();ctx.globalAlpha=clamp(l.opacity,0,1);ctx.translate(l.x*w,l.y*h);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.flip,1);
  if(l.kind==='image'){
   const presets={none:'',vivid:'saturate(1.5) contrast(1.15)',mono:'grayscale(1)',vintage:'sepia(.6)',warm:'sepia(.24) saturate(1.15)',cool:'hue-rotate(18deg) saturate(1.15)'};
   ctx.filter='brightness('+l.brightness+'%) contrast('+l.contrast+'%) saturate('+l.saturation+'%) blur('+l.blur+'px) '+(presets[l.filter]||'');
   drawImageLayer(l,w,h)
  }else if(l.kind==='text')drawTextLayer(l,w);
  else if(l.kind==='shape'){ctx.fillStyle=l.color;if(l.shape==='circle'){ctx.beginPath();ctx.ellipse(0,0,w*l.w/2,h*l.h/2,0,0,Math.PI*2);ctx.fill()}else ctx.fillRect(-w*l.w/2,-h*l.h/2,w*l.w,h*l.h)}
  ctx.restore();
  if(withSelection&&!comparison&&tool==='move'&&selected===l.id){
   ctx.save();ctx.translate(l.x*w,l.y*h);ctx.rotate(l.rotation*Math.PI/180);ctx.lineWidth=Math.max(2,w/600);ctx.strokeStyle='#b47aff';ctx.setLineDash([10,7]);ctx.strokeRect(-w*l.w/2,-h*l.h/2,w*l.w,h*l.h);ctx.restore()
  }
 });
 if(withSelection&&tool==='crop'){
  window.LOOXCrop.draw(ctx,w,h,cropUnit());
 }
}
function draw(){render(true,comparison)}
function pointerAt(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height,rect}}
function cropCursor(mode){return ({nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',n:'ns-resize',s:'ns-resize',w:'ew-resize',e:'ew-resize',move:'move'})[mode]||'crosshair'}
canvas.addEventListener('pointerdown',e=>{
 if(comparison)return;const {x,y,rect}=pointerAt(e);
 if(tool==='crop'){
  const frame=cropUnit(),mode=window.LOOXCrop.hit(frame,x,y,rect.width,rect.height);
  if(!mode)return;
  e.preventDefault();drag={type:'crop',mode,rect:frame,start:{x,y}};
  canvas.setPointerCapture(e.pointerId);canvas.style.cursor=cropCursor(mode);return
 }
 if(tool==='draw'||tool==='eraser'){
  e.preventDefault();remember();
  const l=base(tool==='draw'?'paint':'erase',tool==='draw'?'Brush stroke':'Eraser stroke');
  l.color=$('brushColor').value;l.brushWidth=Number($('brushSize').value);
  l.points=[{x,y},{x:x+.00001,y:y+.00001}];layers.push(l);selected=l.id;drag={type:'paint',id:l.id};
  canvas.setPointerCapture(e.pointerId);draw();return
 }
 if(tool!=='move')return;
 const hit=[...layers].reverse().find(l=>l.kind!=='paint'&&l.kind!=='erase'&&Math.abs(x-l.x)<l.w/2&&Math.abs(y-l.y)<l.h/2);
 if(!hit){selected=null;showInspector();draw();return}
 e.preventDefault();pick(hit.id);remember();
 drag={type:'move',id:hit.id,startX:x,startY:y,x:hit.x,y:hit.y};canvas.setPointerCapture(e.pointerId)
});
canvas.addEventListener('pointermove',e=>{
 const {x,y,rect}=pointerAt(e);
 if(!drag){
  canvas.style.cursor=tool==='crop'?cropCursor(window.LOOXCrop.hit(cropUnit(),x,y,rect.width,rect.height)):tool==='move'?'default':'crosshair';
  return
 }
 if(drag.type==='crop'){
  const changed=window.LOOXCrop.drag(drag.rect,drag.mode,drag.start,{x,y},rect.width,rect.height,cropValue());
  crop={x:changed.x*100,y:changed.y*100,w:changed.w*100,h:changed.h*100};
  syncCropControls();draw();return
 }
 const l=layers.find(l=>l.id===drag.id);if(!l)return;
 if(drag.type==='paint')l.points.push({x,y});
 else{l.x=clamp(drag.x+x-drag.startX,-1,2);l.y=clamp(drag.y+y-drag.startY,-1,2)}
 draw()
});
function endCanvasDrag(){if(!drag)return;const cropWasActive=drag.type==='crop';drag=null;if(!cropWasActive){showLayers();showInspector()}else syncCropControls()}
canvas.addEventListener('pointerup',endCanvasDrag);
canvas.addEventListener('pointercancel',endCanvasDrag);
async function applyCrop(){
 const x=clamp(crop.x,0,99),y=clamp(crop.y,0,99),w=clamp(crop.w,1,100-x),h=clamp(crop.h,1,100-y);
 remember();render(false,false);
 const sx=Math.floor(canvas.width*x/100),sy=Math.floor(canvas.height*y/100),sw=Math.max(1,Math.floor(canvas.width*w/100)),sh=Math.max(1,Math.floor(canvas.height*h/100));
 const tmp=document.createElement('canvas');tmp.width=sw;tmp.height=sh;tmp.getContext('2d').drawImage(canvas,sx,sy,sw,sh,0,0,sw,sh);
 const blob=await new Promise(resolve=>tmp.toBlob(resolve,'image/png'));if(!blob){say('Crop failed. Try a smaller image.');return}
 const url=URL.createObjectURL(blob);urls.add(url);const img=await createFileImage(url);canvas.width=sw;canvas.height=sh;layers.length=0;
 const l=base('image','Cropped composition');l.img=img;l.url=url;l.w=1;l.h=1;l.fit='cover';layers.push(l);selected=l.id;baseImageId=l.id;activate('move');refresh();say('Cropped to '+sw+' × '+sh+'. Use Undo to restore previous layers.')
}
$('before').addEventListener('pointerdown',()=>{comparison=true;draw()});
for(const name of ['pointerup','pointerleave','pointercancel'])$('before').addEventListener(name,()=>{comparison=false;draw()});
$('fit').onclick=()=>{canvas.style.maxWidth='100%';canvas.style.maxHeight='60vh';canvas.scrollIntoView({block:'nearest',behavior:'smooth'});say('Canvas fitted to your workspace.')};
$('background').oninput=e=>{bg=e.target.value;draw()};
$('transparent').onchange=e=>{transparent=e.target.value==='true';draw()};
$('quality').oninput=e=>$('qualityValue').textContent=e.target.value+'%';
function download(){
 if(!layers.length){say('Add a photo, text or shape first.');return}
 render(false,false);
 const mime=$('format').value,quality=Number($('quality').value)/100;
 const save=()=>{
  const exportCanvas=document.createElement('canvas');exportCanvas.width=canvas.width;exportCanvas.height=canvas.height;
  const x=exportCanvas.getContext('2d');if(mime==='image/jpeg'){x.fillStyle='#ffffff';x.fillRect(0,0,canvas.width,canvas.height)}
  x.drawImage(canvas,0,0);exportCanvas.toBlob(blob=>{
   if(!blob){say('Export failed. Try reducing canvas dimensions.');draw();return}
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='loox-photo-'+canvas.width+'x'+canvas.height+(mime==='image/png'?'.png':mime==='image/jpeg'?'.jpg':'.webp');a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
   say('Downloaded '+(blob.size/1048576).toFixed(1)+' MB image');draw()
  },mime,quality)
 };
 save()
}
$('download').onclick=download;$('saveTop').onclick=()=>{$('exportDialog').showModal()};
$('closeExport').onclick=()=>$('exportDialog').close();
window.addEventListener('beforeunload',()=>urls.forEach(u=>URL.revokeObjectURL(u)));
refresh();say('Ready. Add a photo or create a design.');
})();
