(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true}),panel=$('panelContent');
const keys=['brightness','contrast','exposure','highlights','shadows','saturation','vibrance','temperature','tint','fade','gamma'];
const definitions={brightness:['Brightness',-100,100,0],contrast:['Contrast',-100,100,0],saturation:['Saturation',-100,100,0],vibrance:['Vibrance',-100,100,0],highlights:['Highlights',-100,100,0],shadows:['Shadows',-100,100,0],exposure:['Exposure',-3,3,0],temperature:['Temperature',-100,100,0],tint:['Tint',-100,100,0],fade:['Fade',0,100,0],gamma:['Gamma',-100,100,0]};
let overlays=[],selectedOverlay=-1,overlayDrag=null,cropRatio='free',frame={style:'none',color:'#ffffff',width:20},drawColor='#ff52ad',drawSize=16,resizeMode='fit',resizeBackground='#ffffff';let source=null,base=null,mask=null,filename='photo',tab='tools',brushSize=44,intensity=85,brushActive=false,zoom=1,fitScale=1,crop=null,drag=null,history=[],future=[],busy=false,renderToken=0;
const adjustments=()=>Object.fromEntries(keys.map(k=>[k,definitions[k][3]]));let values=adjustments(),preset='original';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const setStatus=s=>$('status').textContent=s;
const makeCanvas=(w,h)=>{let c=document.createElement('canvas');c.width=w;c.height=h;return c};
const clone=c=>{let x=makeCanvas(c.width,c.height);x.getContext('2d').drawImage(c,0,0);return x};
function saveHistory(){if(!base)return;history.push({base:clone(base),mask:clone(mask),values:{...values},preset,frame:{...frame},overlays:overlays.map(o=>({...o}))});if(history.length>15)history.shift();future=[];updateHistory()}
function snapshot(){return {base:clone(base),mask:clone(mask),values:{...values},preset,overlays:overlays.map(o=>({...o}))}}
function restore(s){base=clone(s.base);mask=clone(s.mask);values={...s.values};preset=s.preset;frame={...(s.frame||{style:'none',color:'#ffffff',width:20})};overlays=(s.overlays||[]).map(o=>({...o}));selectedOverlay=-1;crop=null;syncCanvas();render();showPanel();updateHistory()}
function updateHistory(){$('undo').disabled=!history.length;$('redo').disabled=!future.length}
function undo(){if(!history.length||!base)return;future.push(snapshot());restore(history.pop())}
function redo(){if(!future.length||!base)return;history.push(snapshot());restore(future.pop())}
const presets={original:{},cinematic:{contrast:20,saturation:-12,highlights:-22,shadows:8,temperature:-12},bw:{saturation:-100,contrast:16,shadows:9},hdr:{contrast:23,saturation:18,highlights:-32,shadows:38},vintage:{saturation:-27,contrast:-10,temperature:35,highlights:-15},grayscale:{saturation:-100},sepia:{saturation:-28,temperature:48,contrast:-5},vignette:{contrast:8,shadows:-8},glow:{brightness:15,contrast:-15,saturation:14,highlights:20},warm:{temperature:35,vibrance:20},cool:{temperature:-35,contrast:8},vibrant:{saturation:25,vibrance:35,contrast:12},matte:{fade:30,contrast:-15,shadows:18},moody:{exposure:-.35,contrast:28,saturation:-15,shadows:-25},sunset:{temperature:42,tint:20,highlights:12},pastel:{fade:24,brightness:10,saturation:-20},film:{fade:15,temperature:15,contrast:10},noir:{saturation:-100,contrast:45,shadows:-20},frost:{temperature:-28,highlights:22,saturation:-10},amber:{temperature:45,contrast:12},rose:{tint:35,fade:8},teal:{temperature:-22,tint:-25,contrast:14},portrait:{shadows:15,highlights:-18,vibrance:12},landscape:{contrast:15,vibrance:30,highlights:-15},soft:{contrast:-22,fade:15,highlights:10},dramatic:{contrast:38,exposure:-.15,shadows:-25}};
function effective(){let v={...values};for(const [k,n]of Object.entries(presets[preset]||{}))v[k]+=n;return v}
function tone(input,output,v){const mul=Math.pow(2,v.exposure/1.7),c=(259*(v.contrast+255))/(255*(259-v.contrast));for(let i=0;i<input.length;i+=4){let a=input[i+3];if(!a){output[i]=output[i+1]=output[i+2]=0;output[i+3]=0;continue}let r=input[i]*mul,g=input[i+1]*mul,b=input[i+2]*mul;const lum=clamp((.2126*r+.7152*g+.0722*b)/255,0,1);let shadow=(1-lum)**2,highlight=lum**2;let lift=v.shadows*1.15*shadow+v.highlights*1.15*highlight; r+=lift;g+=lift;b+=lift;const bright=v.brightness*1.65;r+=bright;g+=bright;b+=bright;const t=v.temperature;r+=t*.48;g+=t*.04;b-=t*.48;const tint=v.tint||0;r+=tint*.22;g-=tint*.36;b+=tint*.22;r=c*(r-128)+128;g=c*(g-128)+128;b=c*(b-128)+128;const l=.2126*r+.7152*g+.0722*b,s=1+v.saturation/100+(v.vibrance||0)/200*(1-Math.min(1,(Math.max(r,g,b)-Math.min(r,g,b))/255));const fade=(v.fade||0)/100,gamma=Math.pow(2,-(v.gamma||0)/100);output[i]=clamp(Math.pow(clamp((l+(r-l)*s)*(1-fade)+128*fade,0,255)/255,gamma)*255,0,255);output[i+1]=clamp(Math.pow(clamp((l+(g-l)*s)*(1-fade)+128*fade,0,255)/255,gamma)*255,0,255);output[i+2]=clamp(Math.pow(clamp((l+(b-l)*s)*(1-fade)+128*fade,0,255)/255,gamma)*255,0,255);output[i+3]=a}}
function compose(){if(!base)return null;const w=base.width,h=base.height,work=makeCanvas(w,h),wc=work.getContext('2d',{willReadFrequently:true});wc.drawImage(base,0,0);let data=wc.getImageData(0,0,w,h),out=wc.createImageData(w,h);tone(data.data,out.data,effective());wc.putImageData(out,0,0);
const mc=mask.getContext('2d',{willReadFrequently:true}),alpha=mc.getImageData(0,0,w,h).data;let any=false;for(let i=3;i<alpha.length;i+=4){if(alpha[i]>0){any=true;break}}
if(any){const blurred=makeCanvas(w,h),bc=blurred.getContext('2d');bc.filter='blur('+Math.max(12,Math.round(Math.min(w,h)*.018))+'px)';bc.drawImage(work,0,0);bc.filter='none';const bd=bc.getImageData(0,0,w,h).data,od=out.data;for(let i=0;i<od.length;i+=4){const mix=alpha[i+3]/255;for(let j=0;j<3;j++)od[i+j]=od[i+j]*(1-mix)+bd[i+j]*mix}wc.putImageData(out,0,0)}
if(preset==='sepia'||preset==='vignette'){let pic=wc.getImageData(0,0,w,h),d=pic.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=(y*w+x)*4;if(preset==='sepia'){let r=d[i],g=d[i+1],b=d[i+2];d[i]=clamp(r*.393+g*.769+b*.189,0,255);d[i+1]=clamp(r*.349+g*.686+b*.168,0,255);d[i+2]=clamp(r*.272+g*.534+b*.131,0,255)}else{let dx=(x/w-.5)*2,dy=(y/h-.5)*2,f=1-.55*Math.pow(Math.min(1,Math.sqrt(dx*dx+dy*dy)/1.3),1.7);d[i]*=f;d[i+1]*=f;d[i+2]*=f}}wc.putImageData(pic,0,0)}
for(const o of overlays){
  wc.save();wc.globalAlpha=o.opacity??1;
  if(o.type==='shape'){wc.fillStyle=o.color;wc.strokeStyle=o.color;if(o.shape==='circle'){wc.beginPath();wc.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);wc.fill()}else if(o.shape==='line'){wc.lineWidth=Math.max(2,o.h/8);wc.beginPath();wc.moveTo(o.x,o.y);wc.lineTo(o.x+o.w,o.y+o.h);wc.stroke()}else wc.fillRect(o.x,o.y,o.w,o.h)}
  else if(o.type==='image'&&o.image){wc.drawImage(o.image,o.x,o.y,o.w,o.h)}
  else if(o.type==='stroke'){wc.lineWidth=o.size;wc.lineCap='round';wc.lineJoin='round';wc.strokeStyle=o.color;wc.beginPath();o.points.forEach((p,i)=>i?wc.lineTo(p.x,p.y):wc.moveTo(p.x,p.y));if(o.points.length===1){wc.arc(o.points[0].x,o.points[0].y,o.size/2,0,Math.PI*2);wc.fillStyle=o.color;wc.fill()}else wc.stroke()}
  else {wc.fillStyle=o.color;wc.textBaseline='top';wc.font=(o.weight||'bold')+' '+o.size+'px '+(o.font||'system-ui,Arial,sans-serif');String(o.text||'').split('\\n').forEach((line,n)=>wc.fillText(line,o.x,o.y+n*o.size*1.25))}
  wc.restore();
}
if(frame.style!=='none'){
  wc.save();wc.strokeStyle=frame.color;wc.lineWidth=frame.width;
  if(frame.style==='double'){wc.strokeRect(frame.width/2,frame.width/2,w-frame.width,h-frame.width);wc.lineWidth=Math.max(2,frame.width/5);wc.strokeRect(frame.width*1.3,frame.width*1.3,w-frame.width*2.6,h-frame.width*2.6)}
  else {if(frame.style==='dashed')wc.setLineDash([frame.width*2,frame.width]);wc.strokeRect(frame.width/2,frame.width/2,w-frame.width,h-frame.width)}
  wc.restore();
}
return work}
function render(){if(!base)return;let token=++renderToken;requestAnimationFrame(()=>{if(token!==renderToken||!base)return;try{const image=compose();if(canvas.width!==image.width||canvas.height!==image.height){canvas.width=image.width;canvas.height=image.height}ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);layoutCanvas()}catch(e){console.error(e);setStatus('Rendering failed — try a smaller image.')}})}
function syncCanvas(){canvas.width=base.width;canvas.height=base.height;$('dimensions').textContent=base.width+' × '+base.height;$('empty').hidden=true;$('empty').style.display='none';canvas.style.display='block';layoutCanvas()}
function layoutCanvas(){if(!base)return;const vp=$('dropzone'),maxW=Math.max(100,vp.clientWidth-36),maxH=Math.max(100,vp.clientHeight-36);fitScale=Math.min(maxW/base.width,maxH/base.height);const s=fitScale*zoom;canvas.style.width=Math.max(1,Math.round(base.width*s))+'px';canvas.style.height=Math.max(1,Math.round(base.height*s))+'px';$('zoomLabel').textContent=Math.round(s*100)+'%';positionCrop()}
function positionCrop(){if(!crop||!base){$('cropOverlay').hidden=true;return}const b=canvas.getBoundingClientRect(),v=$('dropzone').getBoundingClientRect(),el=$('cropOverlay');el.hidden=false;Object.assign(el.style,{left:b.left-v.left+$('dropzone').scrollLeft+'px',top:b.top-v.top+$('dropzone').scrollTop+'px',width:b.width+'px',height:b.height+'px'});const c=$('cropBox'),sx=b.width/base.width,sy=b.height/base.height;Object.assign(c.style,{left:crop.x*sx+'px',top:crop.y*sy+'px',width:crop.w*sx+'px',height:crop.h*sy+'px'})}
function load(file){if(!file)return;if(!file.type.startsWith('image/')){setStatus('Please choose an image file');return}if(file.size>80*1024*1024){setStatus('Image is larger than 80 MB');return}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);if(img.naturalWidth*img.naturalHeight>24000000){setStatus('Image exceeds the 24-megapixel editor limit');return}source=makeCanvas(img.naturalWidth,img.naturalHeight);source.getContext('2d').drawImage(img,0,0);base=clone(source);mask=makeCanvas(base.width,base.height);values=adjustments();preset='original';frame={style:'none',color:'#ffffff',width:20};overlays=[];selectedOverlay=-1;history=[];future=[];crop=null;zoom=1;filename=file.name.replace(/\.[^.]+$/,'').replace(/[^a-z0-9-_ ]/gi,'_').slice(0,80)||'photo';$('fileName').textContent=file.name;syncCanvas();render();showPanel();updateHistory();setStatus('Image loaded • full resolution')};img.onerror=()=>{URL.revokeObjectURL(url);setStatus('Could not decode image')};img.src=url}
function triggerUpload(){$('fileInput').click()}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b}
function heading(s){const h=document.createElement('h3');h.textContent=s;panel.append(h)}
function hint(s){const p=document.createElement('p');p.className='hint';p.textContent=s;panel.append(p)}
function actions(items,cls='action-grid'){let g=document.createElement('div');g.className=cls;for(const [title,fn]of items)g.append(button(title,fn));panel.append(g);return g}
function control(name,min,max,step,value,onChange){const wrap=document.createElement('label');wrap.className='field';let title=document.createElement('div');title.textContent=name;let row=document.createElement('div');row.className='slider-row',range=document.createElement('input'),num=document.createElement('input');range.type='range';num.type='number';for(const e of [range,num]){e.min=min;e.max=max;e.step=step;e.value=value}range.addEventListener('pointerdown',startAdjustment,{once:true});function startAdjustment(){if(base)saveHistory()}let numEditing=false;num.addEventListener('focus',()=>{numEditing=true;if(base)saveHistory()},{once:true});const apply=v=>{const n=clamp(Number(v)||0,min,max);range.value=n;num.value=n;onChange(n)};range.addEventListener('input',()=>apply(range.value));num.addEventListener('change',()=>apply(num.value));row.append(range,num);wrap.append(title,row);panel.append(wrap)}
function showPanel(){
 panel.replaceChildren();$('panelTitle').textContent=tab.charAt(0).toUpperCase()+tab.slice(1);
 if(tab==='tools'){
  heading('Transform');actions([['＋ Open photo',triggerUpload],['⌗ Crop',beginCrop],['↻ Rotate 90°',()=>rotate(1)],['↺ Rotate −90°',()=>rotate(-1)],['⇄ Flip H',()=>flip(true)],['⇅ Flip V',()=>flip(false)]]);
  if(crop){heading('Crop ratio');const ratios=['free','1:1','4:5','16:9','9:16','4:3','3:2'];const g=actions(ratios.map(r=>[r==='free'?'Freeform':r,()=>setCropRatio(r)]));[...g.children].forEach((b,i)=>b.classList.toggle('selected',ratios[i]===cropRatio));hint('Drag the crop box or its corner to frame the photo.');actions([['Apply crop',applyCrop],['Cancel',()=>{crop=null;positionCrop();showPanel()}]])}
  heading('Quick actions');actions([['Fit canvas',()=>{zoom=1;layoutCanvas()}],['Reset photo',resetImage]]);hint('The image remains centered in a fixed editing workspace. Zoom only changes the preview.');
 }
 if(tab==='resize'){
  heading('Social media sizes');hint('Fit keeps the whole photo; Fill crops the edges to fill the chosen size.');
  const mode=actions([['Fit image',()=>{resizeMode='fit';showPanel()}],['Fill canvas',()=>{resizeMode='fill';showPanel()}]]);
  [...mode.children].forEach((b,i)=>b.classList.toggle('selected',resizeMode===(i?'fill':'fit')));
  const sizes=[['YouTube thumbnail',1280,720],['YouTube banner',2560,1440],['TikTok / Reel',1080,1920],['Instagram post',1080,1080],['Instagram portrait',1080,1350],['Instagram story',1080,1920],['Facebook post',1200,630],['Facebook cover',820,312],['X header',1500,500],['Pinterest pin',1000,1500],['LinkedIn banner',1584,396],['Square avatar',800,800]];
  const g=actions(sizes.map(([name,w,h])=>[name+' · '+w+'×'+h,()=>resizeTo(w,h)]),'preset-grid');
  g.classList.add('size-grid');
  heading('Custom dimensions');const row=document.createElement('div');row.className='dimension-row';
  const w=document.createElement('input'),h=document.createElement('input');for(const [el,v]of [[w,base?.width||1280],[h,base?.height||720]]){el.type='number';el.min='1';el.max='8000';el.value=v;el.setAttribute('aria-label',el===w?'Width in pixels':'Height in pixels')}
  const apply=button('Apply size',()=>resizeTo(Number(w.value),Number(h.value)));row.append(w,h,apply);panel.append(row);
  hint('Maximum 24 megapixels. Fit adds a solid background; PNG retains transparency if you choose it below.');
  const color=document.createElement('input');color.type='color';color.value=resizeBackground;const label=document.createElement('label');label.className='field';label.textContent='Fit background ';label.append(color);panel.append(label);color.oninput=()=>resizeBackground=color.value;
 }
 if(tab==='adjust'){
  heading('Light');['exposure','brightness','contrast','highlights','shadows','gamma'].forEach(k=>addAdjustment(k));
  heading('Color');['temperature','tint','saturation','vibrance','fade'].forEach(k=>addAdjustment(k));
  actions([['Auto enhance',()=>{if(!base)return;saveHistory();values={...values,contrast:14,shadows:18,highlights:-14,vibrance:22};render();showPanel()}],['Reset adjustments',()=>{if(!base)return;saveHistory();values=adjustments();render();showPanel()}]]);
 }
 if(tab==='effects'){
  heading('Looks & filters');const names=Object.keys(presets);const g=actions(names.map(k=>[k==='bw'?'B&W':k.charAt(0).toUpperCase()+k.slice(1),()=>{if(!base)return;saveHistory();preset=k;render();showPanel()}]),'preset-grid');[...g.children].forEach((b,i)=>b.classList.toggle('selected',names[i]===preset));hint('Layer a look over the adjustments. Original removes the filter.');
 }
 if(tab==='retouch'){
  heading('Selective blur');hint('Paint directly on the photo. Erase restores only the masked blur.');
  const modes=actions([['Blur brush',()=>{brushActive=true;showPanel()}],['Erase blur',()=>{brushActive='erase';showPanel()}],['Stop painting',()=>{brushActive=false;showPanel()}]]);
  [...modes.children].forEach((b,i)=>b.classList.toggle('selected',brushActive===(i===0?true:i===1?'erase':false)));
  control('Brush size',10,100,1,brushSize,v=>brushSize=v);control('Blur intensity',10,100,1,intensity,v=>intensity=v);
  actions([['Clear blur',()=>{if(!base)return;saveHistory();mask.getContext('2d').clearRect(0,0,mask.width,mask.height);render()}]]);
  const link=document.createElement('a');link.href='face-blur.html';link.className='panel-link';link.textContent='Open automatic Face Blur ↗';panel.append(link);
 }
 if(tab==='text'){
  heading('Text');actions([['＋ Add heading',()=>addText('Your heading',.09)],['＋ Add caption',()=>addText('Your caption',.04)],['Remove selected',removeOverlay]]);
  showLayerControls('text');
 }
 if(tab==='elements'){
  heading('Shapes & stickers');actions([['▢ Rectangle',()=>addShape('rect')],['◯ Circle',()=>addShape('circle')],['╱ Line',()=>addShape('line')],['＋ Add photo',()=>$('overlayInput').click()]]);
  const stickers=['★','♥','✨','🔥','✓','☀','⚡','🌸','🎉','→','●','✦'];const g=actions(stickers.map(s=>[s,()=>addText(s,.10)]),'sticker-grid');g.setAttribute('aria-label','Stickers');showLayerControls('elements');
 }
 if(tab==='draw'){
  heading('Draw on image');hint('Choose a color and stroke width, then draw on the canvas with a mouse or finger.');
  const color=document.createElement('input');color.type='color';color.value=drawColor;color.oninput=()=>drawColor=color.value;const label=document.createElement('label');label.className='field';label.textContent='Stroke color ';label.append(color);panel.append(label);
  control('Stroke size',2,100,1,drawSize,v=>drawSize=v);
  actions([[(brushActive==='draw'?'✓ ':'')+'Draw mode',()=>{brushActive=brushActive==='draw'?false:'draw';showPanel()}],['Remove last stroke',()=>{const i=overlays.findLastIndex(o=>o.type==='stroke');if(i>=0){saveHistory();overlays.splice(i,1);render()}}]]);
  showLayerControls('draw');
 }
 if(tab==='frames'){
  heading('Borders & frames');const names=['none','solid','double','dashed'];const g=actions(names.map(s=>[s.charAt(0).toUpperCase()+s.slice(1),()=>{if(!base)return;saveHistory();frame.style=s;render();showPanel()}]));[...g.children].forEach((b,i)=>b.classList.toggle('selected',names[i]===frame.style));
  control('Border width',2,150,1,frame.width,v=>{frame.width=v;render()});const color=document.createElement('input');color.type='color';color.value=frame.color;color.onfocus=()=>base&&saveHistory();color.oninput=()=>{frame.color=color.value;render()};const label=document.createElement('label');label.className='field';label.textContent='Frame color ';label.append(color);panel.append(label);
 }
 if(tab==='export'){heading('Download');hint('PNG, JPEG and WebP at the edited canvas dimensions.');actions([['Export image',openExport],['Reset photo',resetImage]])}
}
function addAdjustment(k){const [name,min,max]=definitions[k];control(name,min,max,k==='exposure'?.1:1,values[k],v=>{values[k]=v;render()})}
function resetImage(){if(!source)return;saveHistory();base=clone(source);mask=makeCanvas(base.width,base.height);values=adjustments();preset='original';frame={style:'none',color:'#ffffff',width:20};overlays=[];selectedOverlay=-1;crop=null;zoom=1;syncCanvas();render();showPanel();setStatus('Original photo restored')}
function addText(text,scale){if(!base)return;saveHistory();overlays.push({type:'text',text,x:Math.round(base.width*.12),y:Math.round(base.height*.2),size:Math.max(20,Math.round(base.width*scale)),color:'#ffffff',opacity:1,font:'system-ui,Arial,sans-serif',weight:'bold'});selectedOverlay=overlays.length-1;brushActive=false;render();showPanel()}
function addShape(shape){if(!base)return;saveHistory();overlays.push({type:'shape',shape,x:Math.round(base.width*.3),y:Math.round(base.height*.3),w:Math.round(base.width*.35),h:Math.round(base.height*.25),color:'#ff62ad',opacity:1});selectedOverlay=overlays.length-1;brushActive=false;render();showPanel()}
function removeOverlay(){if(selectedOverlay<0||!overlays[selectedOverlay])return;saveHistory();overlays.splice(selectedOverlay,1);selectedOverlay=overlays.length?Math.min(selectedOverlay,overlays.length-1):-1;render();showPanel()}
function showLayerControls(kind){
 if(!overlays.length){hint('Add an element to edit its position, color and layer order.');return}
 heading('Layers');const chooser=document.createElement('select');chooser.className='text-select';overlays.forEach((o,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=(i+1)+'. '+(o.type==='text'?String(o.text).slice(0,22):o.type==='stroke'?'Drawn stroke':o.type==='image'?'Photo layer':o.shape||'Element');chooser.append(opt)});selectedOverlay=clamp(selectedOverlay,0,overlays.length-1);chooser.value=selectedOverlay;chooser.onchange=()=>{selectedOverlay=Number(chooser.value);showPanel()};panel.append(chooser);
 const o=overlays[selectedOverlay];if(o.type==='text'){const label=document.createElement('label');label.className='field';label.textContent='Text';const input=document.createElement('textarea');input.value=o.text;input.rows=2;input.addEventListener('focus',()=>saveHistory(),{once:true});input.oninput=()=>{o.text=input.value;render()};label.append(input);panel.append(label);control('Font size',10,500,1,o.size,v=>{o.size=v;render()});const fonts=['system-ui,Arial,sans-serif','Georgia,serif','Impact,sans-serif','monospace'];const sel=document.createElement('select');sel.className='text-select';fonts.forEach((f,i)=>{const opt=document.createElement('option');opt.value=f;opt.textContent=['Modern','Serif','Bold display','Mono'][i];sel.append(opt)});sel.value=o.font||fonts[0];sel.onchange=()=>{saveHistory();o.font=sel.value;render()};panel.append(sel)}
 if(o.type==='shape'||o.type==='image'){control('Width',10,base.width*2,1,o.w,v=>{o.w=v;render()});control('Height',10,base.height*2,1,o.h,v=>{o.h=v;render()})}
 if(o.type!=='image'&&o.type!=='stroke'){const color=document.createElement('input');color.type='color';color.value=o.color;color.onfocus=()=>saveHistory();color.oninput=()=>{o.color=color.value;render()};const label=document.createElement('label');label.className='field';label.textContent='Color ';label.append(color);panel.append(label)}
 control('Opacity',0,100,1,Math.round((o.opacity??1)*100),v=>{o.opacity=v/100;render()});
 if(o.type!=='stroke'){control('Horizontal position',0,base.width,1,o.x,v=>{o.x=v;render()});control('Vertical position',0,base.height,1,o.y,v=>{o.y=v;render()})}
 actions([['Move forward',()=>{if(selectedOverlay>=overlays.length-1)return;saveHistory();[overlays[selectedOverlay],overlays[selectedOverlay+1]]=[overlays[selectedOverlay+1],overlays[selectedOverlay]];selectedOverlay++;render();showPanel()}],['Move backward',()=>{if(selectedOverlay<1)return;saveHistory();[overlays[selectedOverlay],overlays[selectedOverlay-1]]=[overlays[selectedOverlay-1],overlays[selectedOverlay]];selectedOverlay--;render();showPanel()}],['Duplicate',()=>{saveHistory();overlays.push({...o,x:(o.x||0)+20,y:(o.y||0)+20,points:o.points?.map(p=>({...p}))});selectedOverlay=overlays.length-1;render();showPanel()}],['Delete layer',removeOverlay]]);
}
function setBrush(s){brushSize=s;brushActive=true;showPanel();setStatus('Blur brush active')}
function selectTab(t){if(t==='export'){openExport();return}tab=t;document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===t));if(t!=='retouch'&&t!=='draw')brushActive=false;showPanel();if(innerWidth<768){$('inspector').classList.add('open');document.querySelector('.app').classList.add('drawer-open');layoutCanvas()}}
function closeDrawer(){$('inspector').classList.remove('open');document.querySelector('.app').classList.remove('drawer-open');layoutCanvas()}
function transform(draw,w,h){if(!base)return;saveHistory();for(const name of ['base','mask']){const old=name==='base'?base:mask,n=makeCanvas(w,h),c=n.getContext('2d');draw(c,old);if(name==='base')base=n;else mask=n}crop=null;syncCanvas();render();setStatus('Transform applied')}
function resizeTo(w,h){
 if(!base)return;
 w=Math.round(w);h=Math.round(h);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1||w>8000||h>8000||w*h>24000000){setStatus('Choose dimensions from 1 to 8000 px and under 24 megapixels');return}
 saveHistory();const oldW=base.width,oldH=base.height;
 const scale=resizeMode==='fill'?Math.max(w/oldW,h/oldH):Math.min(w/oldW,h/oldH),drawW=oldW*scale,drawH=oldH*scale,dx=(w-drawW)/2,dy=(h-drawH)/2;
 const newBase=makeCanvas(w,h),bc=newBase.getContext('2d');bc.fillStyle=resizeBackground;bc.fillRect(0,0,w,h);bc.imageSmoothingQuality='high';bc.drawImage(base,dx,dy,drawW,drawH);
 const newMask=makeCanvas(w,h);newMask.getContext('2d').drawImage(mask,dx,dy,drawW,drawH);
 base=newBase;mask=newMask;overlays=overlays.map(o=>{const n={...o,x:(o.x||0)*scale+dx,y:(o.y||0)*scale+dy};if(o.w)n.w=o.w*scale;if(o.h)n.h=o.h*scale;if(o.size)n.size=o.size*scale;if(o.points)n.points=o.points.map(p=>({x:p.x*scale+dx,y:p.y*scale+dy}));return n});
 frame.width=Math.round(frame.width*scale);crop=null;zoom=1;syncCanvas();render();showPanel();setStatus('Resized to '+w+' × '+h);
}
function rotate(dir){if(!base)return;const oldW=base.width,oldH=base.height;transform((c,old)=>{c.translate(dir>0?old.height:0,dir>0?0:old.width);c.rotate(dir*Math.PI/2);c.drawImage(old,0,0)},base.height,base.width);overlays.forEach(o=>{let x=o.x,y=o.y;o.x=dir>0?oldH-y:y;o.y=dir>0?x:oldW-x});render()}
function flip(horizontal){if(!base)return;transform((c,old)=>{c.translate(horizontal?old.width:0,horizontal?0:old.height);c.scale(horizontal?-1:1,horizontal?1:-1);c.drawImage(old,0,0)},base.width,base.height);overlays.forEach(o=>{if(horizontal)o.x=base.width-o.x;else o.y=base.height-o.y});render()}
function beginCrop(){if(!base)return;brushActive=false;cropRatio='free';const margin=.08;crop={x:Math.round(base.width*margin),y:Math.round(base.height*margin),w:Math.round(base.width*(1-2*margin)),h:Math.round(base.height*(1-2*margin))};positionCrop();tab='tools';showPanel();setStatus('Drag crop boundary, then Apply crop')}
function setCropRatio(ratio){if(!crop||!base)return;cropRatio=ratio;if(ratio!=='free'){let [a,b]=ratio.split(':').map(Number),w=Math.min(base.width,base.height*a/b),h=w*b/a;if(h>base.height){h=base.height;w=h*a/b}crop={x:Math.round((base.width-w)/2),y:Math.round((base.height-h)/2),w:Math.round(w),h:Math.round(h)}}positionCrop();showPanel()}
function applyCrop(){if(!crop||!base)return;const r={...crop};transform((c,old)=>c.drawImage(old,r.x,r.y,r.w,r.h,0,0,r.w,r.h),Math.max(1,Math.round(r.w)),Math.max(1,Math.round(r.h)));overlays.forEach(o=>{o.x-=r.x;o.y-=r.y});render();showPanel()}
function pointerPosition(e){const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)*base.width/r.width,0,base.width),y:clamp((e.clientY-r.top)*base.height/r.height,0,base.height)}}
let painting=false,lastPoint=null,activeStroke=null;
function paint(p){const c=mask.getContext('2d');const s=Math.max(3,brushSize*Math.min(base.width,base.height)/1000);c.lineCap='round';c.lineJoin='round';c.lineWidth=s;c.globalCompositeOperation=brushActive==='erase'?'destination-out':'source-over';c.strokeStyle='rgba(255,255,255,'+(intensity/100)+')';c.beginPath();c.moveTo(lastPoint?.x??p.x,lastPoint?.y??p.y);c.lineTo(p.x,p.y);c.stroke();c.beginPath();c.arc(p.x,p.y,s/2,0,Math.PI*2);c.fillStyle=c.strokeStyle;c.fill();c.globalCompositeOperation='source-over';lastPoint=p}
canvas.addEventListener('pointerdown',e=>{
 if(!base||crop)return;
 if((tab==='text'||tab==='elements')&&overlays.length){
  const p=pointerPosition(e);let hit=-1;
  for(let i=overlays.length-1;i>=0;i--){const o=overlays[i];if(o.type==='stroke')continue;const w=o.w||String(o.text||'').length*o.size*.65,h=o.h||o.size*1.3;if(p.x>=o.x-12&&p.x<=o.x+w+12&&p.y>=o.y-12&&p.y<=o.y+h+12){hit=i;break}}
  if(hit>=0){e.preventDefault();saveHistory();selectedOverlay=hit;overlayDrag={dx:p.x-overlays[hit].x,dy:p.y-overlays[hit].y};canvas.setPointerCapture(e.pointerId);showPanel();return}
 }
 if(!brushActive)return;
 e.preventDefault();saveHistory();painting=true;lastPoint=null;canvas.setPointerCapture(e.pointerId);
 if(brushActive==='draw'){activeStroke={type:'stroke',points:[pointerPosition(e)],size:drawSize*base.width/Math.max(1,canvas.getBoundingClientRect().width),color:drawColor,opacity:1};overlays.push(activeStroke);selectedOverlay=overlays.length-1}
 else paint(pointerPosition(e));
 render();
});
canvas.addEventListener('pointermove',e=>{
 if(overlayDrag&&base){e.preventDefault();const p=pointerPosition(e),o=overlays[selectedOverlay];if(o){o.x=Math.round(clamp(p.x-overlayDrag.dx,0,base.width));o.y=Math.round(clamp(p.y-overlayDrag.dy,0,base.height));render()}return}
 if(!painting||!base)return;e.preventDefault();if(activeStroke)activeStroke.points.push(pointerPosition(e));else paint(pointerPosition(e));render();
});
const endPaint=()=>{overlayDrag=null;if(painting){painting=false;activeStroke=null;lastPoint=null;render();setStatus('Edit applied')}};canvas.addEventListener('pointerup',endPaint);canvas.addEventListener('pointercancel',endPaint);
$('cropBox').addEventListener('pointerdown',e=>{if(!crop||!base)return;e.preventDefault();e.stopPropagation();const r=$('cropOverlay').getBoundingClientRect(),sx=base.width/r.width,sy=base.height/r.height;drag={startX:e.clientX,startY:e.clientY,start:{...crop},sx,sy,resize:e.target.tagName==='I'};$('cropBox').setPointerCapture(e.pointerId)});
$('cropBox').addEventListener('pointermove',e=>{if(!drag||!crop)return;const dx=(e.clientX-drag.startX)*drag.sx,dy=(e.clientY-drag.startY)*drag.sy,r=drag.start;if(drag.resize){crop.w=Math.round(clamp(r.w+dx,10,base.width-r.x));crop.h=Math.round(clamp(r.h+dy,10,base.height-r.y));if(cropRatio!=='free'){const [a,b]=cropRatio.split(':').map(Number);crop.h=Math.round(Math.min(base.height-r.y,crop.w*b/a));crop.w=Math.round(crop.h*a/b)}}else{crop.x=Math.round(clamp(r.x+dx,0,base.width-r.w));crop.y=Math.round(clamp(r.y+dy,0,base.height-r.h))}positionCrop()});
$('cropBox').addEventListener('pointerup',()=>drag=null);$('cropBox').addEventListener('pointercancel',()=>drag=null);
function openExport(){if(!base){setStatus('Open an image first');triggerUpload();return}closeDrawer();$('exportDialog').showModal()}
function download(){if(!base||busy)return;busy=true;const b=$('download');b.disabled=true;b.textContent='Preparing image…';setTimeout(()=>{try{const type=$('format').value,q=Number($('quality').value)/100;const output=compose();if(type==='image/jpeg'){const jpg=makeCanvas(output.width,output.height),c=jpg.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,jpg.width,jpg.height);c.drawImage(output,0,0);jpg.toBlob(blob=>finishBlob(blob,type),type,q)}else output.toBlob(blob=>finishBlob(blob,type),type,q)}catch(e){console.error(e);setStatus('Export failed');busy=false;b.disabled=false;b.textContent='Download image ↓'}},40)}
function finishBlob(blob,type){busy=false;const b=$('download');b.disabled=false;b.textContent='Download image ↓';if(!blob){setStatus('Export failed — image may be too large');return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename+'-loox.'+({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type]||'png');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);$('exportDialog').close();setStatus('Image exported successfully')}
$('overlayInput').addEventListener('change',e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file||!base)return;
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{URL.revokeObjectURL(url);saveHistory();const scale=Math.min(base.width*.55/img.width,base.height*.55/img.height,1);overlays.push({type:'image',image:img,x:Math.round(base.width*.2),y:Math.round(base.height*.2),w:Math.round(img.width*scale),h:Math.round(img.height*scale),opacity:1});selectedOverlay=overlays.length-1;render();showPanel();setStatus('Photo layer added')};
 img.onerror=()=>{URL.revokeObjectURL(url);setStatus('Could not open photo layer')};img.src=url;
});
$('fileInput').addEventListener('change',e=>{load(e.target.files[0]);e.target.value=''});['openImage','chooseImage'].forEach(id=>$(id).addEventListener('click',triggerUpload));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
$('closeDrawer').addEventListener('click',closeDrawer);$('drawerBackdrop').addEventListener('click',closeDrawer);
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);$('exportTop').addEventListener('click',openExport);$('closeExport').addEventListener('click',()=>$('exportDialog').close());$('download').addEventListener('click',download);
$('quality').addEventListener('input',e=>$('qualityValue').textContent=e.target.value+'%');$('format').addEventListener('change',e=>{$('quality').disabled=e.target.value==='image/png';$('exportInfo').textContent=e.target.value==='image/png'?'PNG export is lossless; quality is ignored.':'Export at original pixel dimensions.'});
$('zoomIn').addEventListener('click',()=>{zoom=clamp(zoom*1.25,.2,8);layoutCanvas()});$('zoomOut').addEventListener('click',()=>{zoom=clamp(zoom/1.25,.2,8);layoutCanvas()});$('fit').addEventListener('click',()=>{zoom=1;layoutCanvas()});
const zone=$('dropzone');zone.addEventListener('dragover',e=>{e.preventDefault();zone.style.outline='2px dashed #a979ff'});zone.addEventListener('dragleave',()=>zone.style.outline='');zone.addEventListener('drop',e=>{e.preventDefault();zone.style.outline='';load([...e.dataTransfer.files].find(f=>f.type.startsWith('image/')))});window.addEventListener('resize',layoutCanvas);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}if(e.key==='Escape'&&crop){crop=null;positionCrop();showPanel()}});
updateHistory();showPanel();})();