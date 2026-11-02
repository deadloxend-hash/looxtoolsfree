(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true}),panel=$('panelContent');
const keys=['brightness','contrast','exposure','highlights','shadows','saturation','vibrance','temperature','tint','fade','gamma'];
const definitions={brightness:['Brightness',-100,100,0],contrast:['Contrast',-100,100,0],saturation:['Saturation',-100,100,0],vibrance:['Vibrance',-100,100,0],highlights:['Highlights',-100,100,0],shadows:['Shadows',-100,100,0],exposure:['Exposure',-3,3,0],temperature:['Temperature',-100,100,0],tint:['Tint',-100,100,0],fade:['Fade',0,100,0],gamma:['Gamma',-100,100,0]};
let overlays=[],selectedOverlay=-1,overlayDrag=null,cropRatio='free',frame={style:'none',color:'#ffffff',width:20},drawColor='#ff52ad',drawSize=16,resizeMode='fit',resizeBackground='#ffffff';let cropTarget='canvas',cropIndex=-1,photoBounds=null,selectedPhoto=null,photoResizeDrag=null;let photoTransformSource=null,photoTransformMask=null,photoTransformSourceRect=null;let resizeAnchor=null,resizePlacement=null,resizeLast=null;let source=null,base=null,mask=null,filename='photo',tab='tools',brushSize=44,intensity=85,brushActive=false,zoom=1,fitScale=1,crop=null,drag=null,history=[],future=[],busy=false,renderToken=0;
const adjustments=()=>Object.fromEntries(keys.map(k=>[k,definitions[k][3]]));let values=adjustments(),preset='original';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const setStatus=s=>$('status').textContent=s;
const makeCanvas=(w,h)=>{let c=document.createElement('canvas');c.width=w;c.height=h;return c};
const clone=c=>{let x=makeCanvas(c.width,c.height);x.getContext('2d').drawImage(c,0,0);return x};
const MAX_LAYERS=10;
const layerKind=o=>o.type==='image'?'photo':o.type==='text'?(o.textKind||'text'):o.type==='stroke'?'drawing':o.type;
const layerCount=k=>overlays.filter(o=>layerKind(o)===k).length;
const hasRoom=k=>layerCount(k)<MAX_LAYERS;
function requireRoom(k){if(hasRoom(k))return true;setStatus('Limit reached: 10 '+k+' overlays maximum. Remove one to add more.');return false}
const countInfo=k=>k+' '+layerCount(k)+'/10';
function cropBounds(){
 if(cropTarget==='photo'&&photoBounds){
  const x=Math.max(0,photoBounds.x),y=Math.max(0,photoBounds.y);
  return {x,y,w:Math.max(1,Math.min(base.width,photoBounds.x+photoBounds.w)-x),h:Math.max(1,Math.min(base.height,photoBounds.y+photoBounds.h)-y)};
 }
 if(cropTarget==='overlay'){const o=overlays[cropIndex];if(o?.image){const x=Math.max(0,o.x),y=Math.max(0,o.y);return {x,y,w:Math.max(1,Math.min(base.width,o.x+o.w)-x),h:Math.max(1,Math.min(base.height,o.y+o.h)-y)}}}
 return {x:0,y:0,w:base.width,h:base.height}
}
function cropPhoto(o,r,shiftX=0,shiftY=0){
 const x=Math.max(o.x,r.x),y=Math.max(o.y,r.y),right=Math.min(o.x+o.w,r.x+r.w),bottom=Math.min(o.y+o.h,r.y+r.h);
 if(right<=x||bottom<=y)return null;
 const iw=o.image.naturalWidth||o.image.width,ih=o.image.naturalHeight||o.image.height;
 const sx=(x-o.x)/o.w,sy=(y-o.y)/o.h,sw=(right-x)/o.w,sh=(bottom-y)/o.h;
 const w=Math.max(1,Math.round(sw*iw)),h=Math.max(1,Math.round(sh*ih));
 const image=makeCanvas(w,h);image.getContext('2d').drawImage(o.image,sx*iw,sy*ih,sw*iw,sh*ih,0,0,w,h);
 const blurMask=makeCanvas(w,h);if(o.blurMask){const mw=o.blurMask.width,mh=o.blurMask.height;blurMask.getContext('2d').drawImage(o.blurMask,sx*mw,sy*mh,sw*mw,sh*mh,0,0,w,h)}
 return {...o,image,blurMask,cache:null,x:x-shiftX,y:y-shiftY,w:right-x,h:bottom-y}
}
function cloneOverlay(o){return {...o,values:o.values?{...o.values}:undefined,blurMask:o.blurMask?clone(o.blurMask):undefined,points:o.points?.map(p=>({...p})),cache:null}}
function snapshot(){return {base:clone(base),mask:clone(mask),values:{...values},preset,frame:{...frame},overlays:overlays.map(cloneOverlay),selectedOverlay,resizeAnchor,resizePlacement:resizePlacement?{...resizePlacement}:null,resizeLast,photoBounds:photoBounds?{...photoBounds}:null,photoTransformSource,photoTransformMask,photoTransformSourceRect:photoTransformSourceRect?{...photoTransformSourceRect}:null}}
function saveHistory(){if(!base)return;history.push(snapshot());while(history.length>Math.max(1,Math.min(10,Math.floor(24000000/(base.width*base.height)))))history.shift();future=[];updateHistory()}
function restore(s){base=clone(s.base);mask=clone(s.mask);values={...s.values};preset=s.preset;frame={...(s.frame||{style:'none',color:'#ffffff',width:20})};overlays=(s.overlays||[]).map(cloneOverlay);selectedOverlay=Math.min(s.selectedOverlay??-1,overlays.length-1);resizeAnchor=s.resizeAnchor||null;resizePlacement=s.resizePlacement?{...s.resizePlacement}:null;resizeLast=s.resizeLast||null;photoBounds=s.photoBounds?{...s.photoBounds}:null;photoTransformSource=s.photoTransformSource||null;photoTransformMask=s.photoTransformMask||null;photoTransformSourceRect=s.photoTransformSourceRect?{...s.photoTransformSourceRect}:null;selectedPhoto=null;photoResizeDrag=null;crop=null;cropTarget='canvas';cropIndex=-1;syncCanvas();render();showPanel();updateHistory()}
function updateHistory(){$('undo').disabled=!history.length;$('redo').disabled=!future.length}
function undo(){if(!history.length||!base)return;future.push(snapshot());restore(history.pop())}
function redo(){if(!future.length||!base)return;history.push(snapshot());restore(future.pop())}
const presets={original:{},cinematic:{contrast:20,saturation:-12,highlights:-22,shadows:8,temperature:-12},bw:{saturation:-100,contrast:16,shadows:9},hdr:{contrast:23,saturation:18,highlights:-32,shadows:38},vintage:{saturation:-27,contrast:-10,temperature:35,highlights:-15},grayscale:{saturation:-100},sepia:{saturation:-28,temperature:48,contrast:-5},vignette:{contrast:8,shadows:-8},glow:{brightness:15,contrast:-15,saturation:14,highlights:20},warm:{temperature:35,vibrance:20},cool:{temperature:-35,contrast:8},vibrant:{saturation:25,vibrance:35,contrast:12},matte:{fade:30,contrast:-15,shadows:18},moody:{exposure:-.35,contrast:28,saturation:-15,shadows:-25},sunset:{temperature:42,tint:20,highlights:12},pastel:{fade:24,brightness:10,saturation:-20},film:{fade:15,temperature:15,contrast:10},noir:{saturation:-100,contrast:45,shadows:-20},frost:{temperature:-28,highlights:22,saturation:-10},amber:{temperature:45,contrast:12},rose:{tint:35,fade:8},teal:{temperature:-22,tint:-25,contrast:14},portrait:{shadows:15,highlights:-18,vibrance:12},landscape:{contrast:15,vibrance:30,highlights:-15},soft:{contrast:-22,fade:15,highlights:10},dramatic:{contrast:38,exposure:-.15,shadows:-25},dark:{exposure:-.7,contrast:25,shadows:-30},noise:{contrast:8},blur:{},filmgrain:{fade:12,temperature:10,contrast:12}};
function effective(){let v={...values};for(const [k,n]of Object.entries(presets[preset]||{}))v[k]+=n;return v}
function tone(input,output,v){const mul=Math.pow(2,v.exposure/1.7),c=(259*(v.contrast+255))/(255*(259-v.contrast));for(let i=0;i<input.length;i+=4){let a=input[i+3];if(!a){output[i]=output[i+1]=output[i+2]=0;output[i+3]=0;continue}let r=input[i]*mul,g=input[i+1]*mul,b=input[i+2]*mul;const lum=clamp((.2126*r+.7152*g+.0722*b)/255,0,1);let shadow=(1-lum)**2,highlight=lum**2;let lift=v.shadows*1.15*shadow+v.highlights*1.15*highlight; r+=lift;g+=lift;b+=lift;const bright=v.brightness*1.65;r+=bright;g+=bright;b+=bright;const t=v.temperature;r+=t*.48;g+=t*.04;b-=t*.48;const tint=v.tint||0;r+=tint*.22;g-=tint*.36;b+=tint*.22;r=c*(r-128)+128;g=c*(g-128)+128;b=c*(b-128)+128;const l=.2126*r+.7152*g+.0722*b,s=1+v.saturation/100+(v.vibrance||0)/200*(1-Math.min(1,(Math.max(r,g,b)-Math.min(r,g,b))/255));const fade=(v.fade||0)/100,gamma=Math.pow(2,-(v.gamma||0)/100);output[i]=clamp(Math.pow(clamp((l+(r-l)*s)*(1-fade)+128*fade,0,255)/255,gamma)*255,0,255);output[i+1]=clamp(Math.pow(clamp((l+(g-l)*s)*(1-fade)+128*fade,0,255)/255,gamma)*255,0,255);output[i+2]=clamp(Math.pow(clamp((l+(b-l)*s)*(1-fade)+128*fade,0,255)/255,gamma)*255,0,255);output[i+3]=a}}
function applySpecial(c,name){
 if(!['sepia','vignette','noise','filmgrain','blur'].includes(name))return;
 const cx=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height;
 if(name==='blur'){const temp=clone(c);cx.clearRect(0,0,w,h);cx.filter='blur('+Math.max(8,Math.round(Math.min(w,h)*.025))+'px)';cx.drawImage(temp,0,0);cx.filter='none';return}
 const pic=cx.getImageData(0,0,w,h),d=pic.data;let seed=1515870810;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(!d[i+3])continue;
  if(name==='sepia'){const r=d[i],g=d[i+1],b=d[i+2];d[i]=clamp(r*.393+g*.769+b*.189,0,255);d[i+1]=clamp(r*.349+g*.686+b*.168,0,255);d[i+2]=clamp(r*.272+g*.534+b*.131,0,255)}
  else if(name==='vignette'){const dx=(x/w-.5)*2,dy=(y/h-.5)*2,f=1-.55*Math.pow(Math.min(1,Math.sqrt(dx*dx+dy*dy)/1.3),1.7);d[i]*=f;d[i+1]*=f;d[i+2]*=f}
  else{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const n=((seed>>>0)%256-128)*(name==='noise'?.18:.10);d[i]=clamp(d[i]+n,0,255);d[i+1]=clamp(d[i+1]+n,0,255);d[i+2]=clamp(d[i+2]+n,0,255)}
 }
 cx.putImageData(pic,0,0)
}
function selectedImage(){const o=overlays[selectedOverlay];return o?.type==='image'?o:null}
function editTarget(){const o=selectedImage();return o&&!o.locked?o:null}
function processImageLayer(o){
 if(o.cache)return o.cache;
 const img=o.image,c=makeCanvas(img.naturalWidth||img.width,img.naturalHeight||img.height),cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);
 const v={...adjustments(),...(o.values||{})};for(const [k,n]of Object.entries(presets[o.preset||'original']||{}))v[k]+=n;
 if(Object.values(v).some(Boolean)){const src=cx.getImageData(0,0,c.width,c.height),out=cx.createImageData(c.width,c.height);tone(src.data,out.data,v);cx.putImageData(out,0,0)}
 if(o.blurMask){const alpha=o.blurMask.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let any=false;for(let i=3;i<alpha.length;i+=4)if(alpha[i]){any=true;break}
  if(any){const blurred=makeCanvas(c.width,c.height),bc=blurred.getContext('2d');bc.filter='blur('+Math.max(12,Math.round(Math.min(c.width,c.height)*.025))+'px)';bc.drawImage(c,0,0);bc.filter='none';const a=cx.getImageData(0,0,c.width,c.height),b=bc.getImageData(0,0,c.width,c.height).data;for(let i=0;i<a.data.length;i+=4){const mix=alpha[i+3]/255;for(let j=0;j<3;j++)a.data[i+j]=a.data[i+j]*(1-mix)+b[i+j]*mix}cx.putImageData(a,0,0)}}
 applySpecial(c,o.preset||'original');o.cache=c;return c
}
function drawShape(c,o){
 const {x,y,w,h}=o;c.fillStyle=o.color;c.strokeStyle=o.color;
 if(o.shape==='line'){c.lineWidth=Math.max(2,h/8);c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y+h);c.stroke();return}
 if(o.shape==='circle'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2)}
 else if(o.shape==='rounded'){c.beginPath();c.roundRect(x,y,w,h,Math.min(w,h)*.2)}
 else if(o.shape==='triangle'){c.beginPath();c.moveTo(x+w/2,y);c.lineTo(x+w,y+h);c.lineTo(x,y+h);c.closePath()}
 else if(o.shape==='heart'){c.beginPath();c.moveTo(x+w/2,y+h);c.bezierCurveTo(x-w*.2,y+h*.55,x,y-h*.15,x+w/2,y+h*.25);c.bezierCurveTo(x+w,y-h*.15,x+w*1.2,y+h*.55,x+w/2,y+h);c.closePath()}
 else if(o.shape==='arrow'){c.beginPath();c.moveTo(x,y+h*.3);c.lineTo(x+w*.65,y+h*.3);c.lineTo(x+w*.65,y);c.lineTo(x+w,y+h*.5);c.lineTo(x+w*.65,y+h);c.lineTo(x+w*.65,y+h*.7);c.lineTo(x,y+h*.7);c.closePath()}
 else if(o.shape==='star'){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=(i%2?.22:.5);const px=x+w/2+Math.cos(a)*w*r,py=y+h/2+Math.sin(a)*h*r;i?c.lineTo(px,py):c.moveTo(px,py)}c.closePath()}
 else c.rect(x,y,w,h);
 c.fill()
}
function compose(options={}){if(!base)return null;const w=base.width,h=base.height,work=makeCanvas(w,h),wc=work.getContext('2d',{willReadFrequently:true});if(!options.skipBase){wc.drawImage(base,0,0);let data=wc.getImageData(0,0,w,h),out=wc.createImageData(w,h);tone(data.data,out.data,effective());wc.putImageData(out,0,0);
const mc=mask.getContext('2d',{willReadFrequently:true}),alpha=mc.getImageData(0,0,w,h).data;let any=false;for(let i=3;i<alpha.length;i+=4){if(alpha[i]>0){any=true;break}}
if(any){const blurred=makeCanvas(w,h),bc=blurred.getContext('2d');bc.filter='blur('+Math.max(12,Math.round(Math.min(w,h)*.018))+'px)';bc.drawImage(work,0,0);bc.filter='none';const bd=bc.getImageData(0,0,w,h).data,od=out.data;for(let i=0;i<od.length;i+=4){const mix=alpha[i+3]/255;for(let j=0;j<3;j++)od[i+j]=od[i+j]*(1-mix)+bd[i+j]*mix}wc.putImageData(out,0,0)}
applySpecial(work,preset);
}
for(let i=options.fromLayer||0;i<Math.min(overlays.length,options.toLayer??overlays.length);i++){
 const o=overlays[i];
  if(o.visible===false)continue;
  wc.save();wc.globalAlpha=o.opacity??1;
  if(o.type==='shape'){drawShape(wc,o)}
  else if(o.type==='image'&&o.image){wc.drawImage(processImageLayer(o),o.x,o.y,o.w,o.h);if(o.borderWidth){wc.strokeStyle=o.borderColor||'#ffffff';wc.lineWidth=o.borderWidth;wc.strokeRect(o.x+o.borderWidth/2,o.y+o.borderWidth/2,o.w-o.borderWidth,o.h-o.borderWidth)}}
  else if(o.type==='stroke'){wc.lineWidth=o.size;wc.lineCap='round';wc.lineJoin='round';wc.strokeStyle=o.color;wc.beginPath();o.points.forEach((p,i)=>i?wc.lineTo(p.x,p.y):wc.moveTo(p.x,p.y));if(o.points.length===1){wc.arc(o.points[0].x,o.points[0].y,o.size/2,0,Math.PI*2);wc.fillStyle=o.color;wc.fill()}else wc.stroke()}
  else {wc.fillStyle=o.color;wc.textBaseline='top';wc.font=(o.weight||'bold')+' '+o.size+'px '+(o.font||'system-ui,Arial,sans-serif');wc.lineJoin='round';wc.strokeStyle=o.outlineColor||'#111111';wc.lineWidth=(o.outlineWidth||0)*2;wc.shadowColor='rgba(0,0,0,.85)';wc.shadowBlur=o.shadowBlur||0;String(o.text||'').split('\\n').forEach((line,n)=>{const y=o.y+n*o.size*1.25;if(o.outlineWidth)wc.strokeText(line,o.x,y);wc.fillText(line,o.x,y)})}
  wc.restore();
}
if(options.drawFrame!==false&&frame.style!=='none'){
  wc.save();wc.strokeStyle=frame.color;wc.lineWidth=frame.width;
  if(frame.style==='polaroid'){wc.fillStyle=frame.color;const p=frame.width;wc.fillRect(0,0,w,p);wc.fillRect(0,0,p,h);wc.fillRect(w-p,0,p,h);wc.fillRect(0,h-p*2,w,p*2)}
  else if(frame.style==='double'){wc.strokeRect(frame.width/2,frame.width/2,w-frame.width,h-frame.width);wc.lineWidth=Math.max(2,frame.width/5);wc.strokeRect(frame.width*1.3,frame.width*1.3,w-frame.width*2.6,h-frame.width*2.6)}
  else if(frame.style==='rounded'){wc.beginPath();wc.roundRect(frame.width/2,frame.width/2,w-frame.width,h-frame.width,Math.max(15,frame.width*2));wc.stroke()}
  else if(frame.style==='neon'){wc.shadowColor=frame.color;wc.shadowBlur=frame.width*2;wc.strokeRect(frame.width/2,frame.width/2,w-frame.width,h-frame.width)}
  else if(frame.style==='shadow'){wc.shadowColor='#000';wc.shadowBlur=frame.width*3;wc.strokeRect(frame.width/2,frame.width/2,w-frame.width,h-frame.width)}
  else {if(frame.style==='dashed')wc.setLineDash([frame.width*2,frame.width]);wc.strokeRect(frame.width/2,frame.width/2,w-frame.width,h-frame.width)}
  wc.restore();
}
return work}
function render(){if(!base)return;let token=++renderToken;requestAnimationFrame(()=>{if(token!==renderToken||!base)return;try{const image=compose();if(canvas.width!==image.width||canvas.height!==image.height){canvas.width=image.width;canvas.height=image.height}ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);layoutCanvas()}catch(e){console.error(e);setStatus('Rendering failed — try a smaller image.')}})}
function syncCanvas(){canvas.width=base.width;canvas.height=base.height;$('dimensions').textContent=base.width+' × '+base.height;$('empty').hidden=true;$('empty').style.display='none';canvas.style.display='block';layoutCanvas()}
function layoutCanvas(){if(!base)return;const vp=$('dropzone'),maxW=Math.max(100,vp.clientWidth-36),maxH=Math.max(100,vp.clientHeight-36);fitScale=Math.min(maxW/base.width,maxH/base.height);const s=fitScale*zoom;canvas.style.width=Math.max(1,Math.round(base.width*s))+'px';canvas.style.height=Math.max(1,Math.round(base.height*s))+'px';$('zoomLabel').textContent=Math.round(s*100)+'%';positionCrop();positionPhotoSelection(photoGesture?.last||photoResizeDrag?.next||undefined)}
function positionCrop(){if(!crop||!base){$('cropOverlay').hidden=true;return}const b=canvas.getBoundingClientRect(),v=$('dropzone').getBoundingClientRect(),el=$('cropOverlay');el.hidden=false;Object.assign(el.style,{left:b.left-v.left+$('dropzone').scrollLeft+'px',top:b.top-v.top+$('dropzone').scrollTop+'px',width:b.width+'px',height:b.height+'px'});const c=$('cropBox'),sx=b.width/base.width,sy=b.height/base.height;Object.assign(c.style,{left:crop.x*sx+'px',top:crop.y*sy+'px',width:crop.w*sx+'px',height:crop.h*sy+'px'})}

// Main photo and imported overlays share the same selection and sizing controls.
// Resizing commits once on release, rather than continuously reprocessing large images.
function selectedPhotoRect(){
 if(!base||!selectedPhoto)return null;
 if(selectedPhoto.kind==='base')return photoBounds?{...photoBounds}:{x:0,y:0,w:base.width,h:base.height};
 const o=overlays[selectedPhoto.index];
 return o?.type==='image'&&!o.locked&&o.visible!==false?{x:o.x,y:o.y,w:o.w,h:o.h}:null;
}
function basePixelAt(p){
 if(!base)return false;
 const b=photoBounds||{x:0,y:0,w:base.width,h:base.height};
 if(p.x<b.x||p.x>=b.x+b.w||p.y<b.y||p.y>=b.y+b.h)return false;
 const x=Math.min(base.width-1,Math.max(0,Math.floor(p.x))),y=Math.min(base.height-1,Math.max(0,Math.floor(p.y)));
 return base.getContext('2d',{willReadFrequently:true}).getImageData(x,y,1,1).data[3]>8;
}
function positionPhotoSelection(preview){
 const el=$('photoSelection');if(!el)return;
 const r=preview||selectedPhotoRect();
 if(!base||!r||crop||r.w<=0||r.h<=0){el.hidden=true;return}
 const b=canvas.getBoundingClientRect(),v=$('dropzone').getBoundingClientRect();
 if(!b.width||!b.height){el.hidden=true;return}
 el.hidden=false;
 Object.assign(el.style,{
  left:(b.left-v.left+$('dropzone').scrollLeft+r.x*b.width/base.width)+'px',
  top:(b.top-v.top+$('dropzone').scrollTop+r.y*b.height/base.height)+'px',
  width:(r.w*b.width/base.width)+'px',
  height:(r.h*b.height/base.height)+'px'
 });
 $('photoSizeBadge').textContent=Math.round(r.w)+' × '+Math.round(r.h)+' px';
}
function fitPhotoRect(r){
 if(!base)return r;
 const minW=Math.min(12,base.width),minH=Math.min(12,base.height);
 // The photo can extend beyond the canvas when enlarged, but keep a visible area to grab.
 const w=clamp(Math.round(r.w),minW,base.width*4),h=clamp(Math.round(r.h),minH,base.height*4);
 const visibleX=Math.min(24,base.width*.08),visibleY=Math.min(24,base.height*.08);
 const x=clamp(Math.round(r.x),visibleX-w,base.width-visibleX);
 const y=clamp(Math.round(r.y),visibleY-h,base.height-visibleY);
 return {x,y,w,h};
}
// Magnetic canvas-edge snapping for selected photos (base or photo overlays).
// Works from below and above canvas size, without changing the canvas dimensions.
// Uniform scaling keeps aspect ratio; freeform handles can snap each axis.
function snapPhotoRect(request,uniform=false){
 if(!base)return request;
 const wCanvas=base.width,hCanvas=base.height;
 const tolX=Math.max(8,Math.min(80,wCanvas*.055));
 const tolY=Math.max(8,Math.min(120,hCanvas*.055));
 let r=fitPhotoRect(request);
 const nearLeft=Math.abs(r.x)<=tolX;
 const nearRight=Math.abs(r.x+r.w-wCanvas)<=tolX;
 const nearTop=Math.abs(r.y)<=tolY;
 const nearBottom=Math.abs(r.y+r.h-hCanvas)<=tolY;
 // When the four edges approach the canvas together, align all four precisely.
 if(nearLeft&&nearRight&&nearTop&&nearBottom)
  return {x:0,y:0,w:wCanvas,h:hCanvas};
 if(uniform){
  // Cover-snap to the matching axis while preserving the photo's aspect ratio.
  // The other axis can continue beyond the canvas if the photo is a different shape.
  if(nearLeft&&nearRight&&r.h>=hCanvas-tolY){
   const scale=wCanvas/r.w,h=r.h*scale,midY=r.y+r.h/2;
   return fitPhotoRect({x:0,y:midY-h/2,w:wCanvas,h});
  }
  if(nearTop&&nearBottom&&r.w>=wCanvas-tolX){
   const scale=hCanvas/r.h,w=r.w*scale,midX=r.x+r.w/2;
   return fitPhotoRect({x:midX-w/2,y:0,w,h:hCanvas});
  }
  return r;
 }
 // Handles are freeform: snap the edge currently near the canvas boundary.
 if(nearLeft&&nearRight){r.x=0;r.w=wCanvas}
 else if(nearLeft){r.w+=r.x;r.x=0}
 else if(nearRight){r.w=wCanvas-r.x}
 if(nearTop&&nearBottom){r.y=0;r.h=hCanvas}
 else if(nearTop){r.h+=r.y;r.y=0}
 else if(nearBottom){r.h=hCanvas-r.y}
 return fitPhotoRect(r);
}
// The original pixels stay immutable while resizing/moving a photo.
// Restoring 1276px after reducing to 73px now reads the original 1276px pixels.
function ensurePhotoTransformSource(){
 if(photoTransformSource)return;
 photoTransformSource=clone(base);photoTransformMask=clone(mask);
 photoTransformSourceRect=photoBounds?{...photoBounds}:{x:0,y:0,w:base.width,h:base.height};
}
function drawPhotoTransform(next){
 ensurePhotoTransformSource();
 const r=photoTransformSourceRect;
 const resized=makeCanvas(base.width,base.height),resizedMask=makeCanvas(mask.width,mask.height);
 const dc=resized.getContext('2d'),mc=resizedMask.getContext('2d');
 dc.imageSmoothingEnabled=true;dc.imageSmoothingQuality='high';
 mc.imageSmoothingEnabled=true;mc.imageSmoothingQuality='high';
 dc.drawImage(photoTransformSource,r.x,r.y,r.w,r.h,next.x,next.y,next.w,next.h);
 mc.drawImage(photoTransformMask,r.x,r.y,r.w,r.h,next.x,next.y,next.w,next.h);
 base=resized;mask=resizedMask;photoBounds={...next};
 resizeAnchor=null;resizePlacement=null;resizeLast=null;
}
function applyPhotoRect(next,record=true,rebuildPanel=true){
 const original=selectedPhotoRect();if(!base||!original||crop||!selectedPhoto)return false;
 next=fitPhotoRect(next);
 if(['x','y','w','h'].every(k=>Math.abs(next[k]-original[k])<.5))return false;
 if(selectedPhoto.kind==='base'){
  if(record)saveHistory();
  drawPhotoTransform(next);
 }else{
  const o=overlays[selectedPhoto.index];if(!o||o.type!=='image'||o.locked)return false;
  if(record)saveHistory();Object.assign(o,next);
 }
 render();positionPhotoSelection();
 if(rebuildPanel&&tab==='tools')showPanel();
 if(rebuildPanel)setStatus('Photo updated to '+next.w+' × '+next.h+' px · canvas unchanged');
 return true;
}
function commitPhotoSize(request){if(!applyPhotoRect(snapPhotoRect(request)))positionPhotoSelection()}
function photoSizeFields(){
 const r=selectedPhotoRect();if(!r)return;
 heading(selectedPhoto.kind==='base'?'Main photo dimensions':'Selected overlay dimensions');
 const wrap=document.createElement('div');wrap.className='crop-fields';
 for(const [label,key] of [['Width','w'],['Height','h']]){
  const row=document.createElement('label');row.textContent=label+' (px)';
  const input=document.createElement('input');input.type='number';input.min='1';input.step='1';input.max=String(key==='w'?base.width*4:base.height*4);input.value=String(Math.round(r[key]));
  input.addEventListener('change',()=>{const value=Number(input.value);if(!Number.isFinite(value)||value<1){input.value=String(Math.round(r[key]));return}commitPhotoSize({...r,[key]:value})});
  row.append(input);wrap.append(row);
 }
 panel.append(wrap);hint('One finger moves the photo. Pinch fingers together to enlarge; spread them to shrink. Tap empty canvas to deselect.');
}
function resizeRectFromHandle(start,handle,dx,dy){
 const minW=Math.min(12,base.width),minH=Math.min(12,base.height);
 let left=start.x,top=start.y,right=start.x+start.w,bottom=start.y+start.h;
 if(handle.includes('w'))left=clamp(start.x+dx,right-base.width*4,right-minW);
 if(handle.includes('e'))right=clamp(start.x+start.w+dx,left+minW,left+base.width*4);
 if(handle.includes('n'))top=clamp(start.y+dy,bottom-base.height*4,bottom-minH);
 if(handle.includes('s'))bottom=clamp(start.y+start.h+dy,top+minH,top+base.height*4);
 return snapPhotoRect({x:left,y:top,w:right-left,h:bottom-top});
}
const photoSelectionBox=$('photoSelectionBox');
photoSelectionBox.addEventListener('pointerdown',e=>{
 const handle=e.target.closest('[data-photo-handle]');
 if(!handle||!selectedPhoto||!base||crop)return;
 e.preventDefault();e.stopPropagation();
 const start=selectedPhotoRect();if(!start)return;
 photoResizeDrag={id:e.pointerId,handle:handle.dataset.photoHandle,start,from:pointerPosition(e),next:start};
 handle.setPointerCapture(e.pointerId);
 setStatus('Drag to set photo width and height; release to apply');
});
photoSelectionBox.addEventListener('pointermove',e=>{
 const d=photoResizeDrag;if(!d||d.id!==e.pointerId||!base)return;
 e.preventDefault();const p=pointerPosition(e);
 d.next=resizeRectFromHandle(d.start,d.handle,p.x-d.from.x,p.y-d.from.y);
 positionPhotoSelection(d.next);
});
function finishPhotoResize(e,cancel=false){
 const d=photoResizeDrag;if(!d||e.pointerId!==d.id)return;
 e.preventDefault();photoResizeDrag=null;
 if(!cancel)commitPhotoSize(d.next);
 else positionPhotoSelection();
}
photoSelectionBox.addEventListener('pointerup',e=>finishPhotoResize(e));
photoSelectionBox.addEventListener('pointercancel',e=>finishPhotoResize(e,true));
photoSelectionBox.addEventListener('lostpointercapture',e=>{if(photoResizeDrag?.id===e.pointerId){photoResizeDrag=null;positionPhotoSelection()}});
photoSelectionBox.addEventListener('keydown',e=>{
 const handle=e.target.closest('[data-photo-handle]');
 if(!handle||!selectedPhoto||!base)return;
 const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 const delta=steps[e.key];if(!delta)return;
 e.preventDefault();
 const rect=selectedPhotoRect(),n=e.shiftKey?10:1;
 commitPhotoSize(resizeRectFromHandle(rect,handle.dataset.photoHandle,delta[0]*n,delta[1]*n));
});


/* One-finger move and intentionally reversed two-finger photo scaling.
   Close fingers = larger photo, spread fingers = smaller photo.
   Only the selected photo moves; the canvas dimensions never change. */
const activePhotoPointers=new Map();
let photoGesture=null,gesturePreview=null,photoGestureFrame=0,queuedGestureRect=null;

// Build layered previews only once per gesture; no per-pixel tone processing during drag.
function prepareGesturePreview(){
 if(!base||!selectedPhoto)return;
 ++renderToken; // Discard a full-quality render already queued before this gesture.
 const currentBase=base,currentMask=mask;
 try{
  if(selectedPhoto.kind==='base'){
   base=photoTransformSource||currentBase;
   mask=photoTransformMask||currentMask;
   const moving=compose({toLayer:0,drawFrame:false});
   base=currentBase;mask=currentMask;
   const top=compose({skipBase:true});
   gesturePreview={kind:'base',moving,top,sourceRect:photoTransformSourceRect||{x:0,y:0,w:base.width,h:base.height}};
  }else{
   const index=selectedPhoto.index,o=overlays[index];
   if(!o||o.type!=='image')return;
   const under=compose({toLayer:index,drawFrame:false});
   const moving=processImageLayer(o);
   const top=compose({skipBase:true,fromLayer:index+1});
   gesturePreview={kind:'overlay',under,moving,top,opacity:o.opacity??1,border:o.borderWidth||0,borderColor:o.borderColor||'#ffffff'};
  }
 }catch(err){
  console.warn('Photo gesture preview unavailable',err);
  gesturePreview=null;
 }finally{base=currentBase;mask=currentMask}
}
function paintGesturePreview(rect){
 const p=gesturePreview;if(!p||!base||!rect)return;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if(p.under)ctx.drawImage(p.under,0,0);
 if(p.kind==='base'){
  const src=p.sourceRect;
  ctx.drawImage(p.moving,src.x,src.y,src.w,src.h,rect.x,rect.y,rect.w,rect.h);
 }else{
  ctx.save();ctx.globalAlpha=p.opacity;
  ctx.drawImage(p.moving,rect.x,rect.y,rect.w,rect.h);
  if(p.border){
   ctx.strokeStyle=p.borderColor;ctx.lineWidth=p.border;
   ctx.strokeRect(rect.x+p.border/2,rect.y+p.border/2,Math.max(1,rect.w-p.border),Math.max(1,rect.h-p.border));
  }
  ctx.restore();
 }
 if(p.top)ctx.drawImage(p.top,0,0);
}
function queueGesturePreview(rect){
 queuedGestureRect=rect;
 if(photoGestureFrame)return;
 photoGestureFrame=requestAnimationFrame(()=>{
  photoGestureFrame=0;
  const next=queuedGestureRect;queuedGestureRect=null;
  if(!photoGesture||!next||!selectedPhoto)return;
  if(gesturePreview)paintGesturePreview(next);
  positionPhotoSelection(next);
 });
}
function clearGesturePreview(){
 if(photoGestureFrame)cancelAnimationFrame(photoGestureFrame);
 photoGestureFrame=0;queuedGestureRect=null;gesturePreview=null;
}
const gesturePoint=e=>pointerPosition(e);
const pointerDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function startPhotoPointer(e,keepSelection=false){
 if(!base||crop||brushActive||!selectedPhoto)return false;
 const existing=activePhotoPointers.size;
 const previous=photoGesture;
 const previousRect=previous?(photoGestureRect(previous)||previous.last):null;
 activePhotoPointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY});
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 e.preventDefault();
 if(existing===0||!photoGesture){
  photoGesture={mode:'move',id:e.pointerId,first:gesturePoint(e),start:selectedPhotoRect(),last:null};
  prepareGesturePreview();
 }
 if(activePhotoPointers.size>=2){
  const pts=[...activePhotoPointers.values()].slice(0,2).map(p=>gesturePoint(p));
  const r=previousRect||selectedPhotoRect();
  if(r){
   photoGesture={mode:'pinch',start:r,distance:Math.max(12,pointerDistance(pts[0],pts[1])),
    midpoint:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},last:r};
   queueGesturePreview(r);
  }
 }
 return true;
}
function photoGestureRect(g){
 if(!g||!base||!selectedPhoto)return null;
 if(g.mode==='move'){
  const p=activePhotoPointers.get(g.id);if(!p)return g.last;
  const now=gesturePoint(p);
  return fitPhotoRect({...g.start,x:g.start.x+now.x-g.first.x,y:g.start.y+now.y-g.first.y});
 }
 const pts=[...activePhotoPointers.values()].slice(0,2).map(p=>gesturePoint(p));
 if(pts.length<2)return g.last;
 const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
 const ratio=clamp(Math.max(12,pointerDistance(pts[0],pts[1]))/g.distance,.2,5);
 const w=g.start.w*ratio,h=g.start.h*ratio;
 const fractionX=(g.midpoint.x-g.start.x)/Math.max(1,g.start.w);
 const fractionY=(g.midpoint.y-g.start.y)/Math.max(1,g.start.h);
 return snapPhotoRect({x:mid.x-w*fractionX,y:mid.y-h*fractionY,w,h},true);
}
function progressPhotoGesture(){
 const g=photoGesture;if(!g||!selectedPhoto||crop)return;
 const next=photoGestureRect(g);if(!next)return;
 if(['x','y','w','h'].every(k=>Math.abs(next[k]-g.start[k])<.5))return;
 g.last=next;
 queueGesturePreview(next);
}
function finishPhotoPointer(e){
 if(!activePhotoPointers.has(e.pointerId))return false;
 // Read final pointer position before releasing capture.
 activePhotoPointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY});
 const g=photoGesture;
 const finalRect=g?(photoGestureRect(g)||g.last):null;
 activePhotoPointers.delete(e.pointerId);
 if(g){
  if(activePhotoPointers.size===1){
   const [id,p]=activePhotoPointers.entries().next().value;
   const r=finalRect||g.last||selectedPhotoRect();
   photoGesture={mode:'move',id,first:gesturePoint(p),start:r,last:r};
   queueGesturePreview(r);
  }else if(!activePhotoPointers.size){
   photoGesture=null;clearGesturePreview();
   const before=selectedPhotoRect();
   const changed=finalRect&&before&&['x','y','w','h'].some(k=>Math.abs(finalRect[k]-before[k])>=1);
   if(changed){
    applyPhotoRect(finalRect,true,false);
    if(tab==='tools')showPanel();
    setStatus('Photo moved or resized · one undo step');
   }else{
    render();positionPhotoSelection();
   }
  }
 }
 return true;
}

function load(file){if(!file)return;if(!file.type.startsWith('image/')){setStatus('Please choose an image file');return}if(file.size>80*1024*1024){setStatus('Image is larger than 80 MB');return}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);if(img.naturalWidth*img.naturalHeight>24000000){setStatus('Image exceeds the 24-megapixel editor limit');return}source=makeCanvas(img.naturalWidth,img.naturalHeight);source.getContext('2d').drawImage(img,0,0);base=clone(source);mask=makeCanvas(base.width,base.height);values=adjustments();preset='original';frame={style:'none',color:'#ffffff',width:20};overlays=[];selectedOverlay=-1;history=[];future=[];resizeAnchor=null;resizePlacement=null;resizeLast=null;crop=null;cropTarget='canvas';cropIndex=-1;photoBounds=null;selectedPhoto=null;photoResizeDrag=null;photoTransformSource=null;photoTransformMask=null;photoTransformSourceRect=null;zoom=1;filename=file.name.replace(/\.[^.]+$/,'').replace(/[^a-z0-9-_ ]/gi,'_').slice(0,80)||'photo';$('fileName').textContent=file.name;syncCanvas();render();showPanel();updateHistory();setStatus('Image loaded • full resolution')};img.onerror=()=>{URL.revokeObjectURL(url);setStatus('Could not decode image')};img.src=url}
function triggerUpload(){$('fileInput').click()}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b}
function heading(s){const h=document.createElement('h3');h.textContent=s;panel.append(h)}
function hint(s){const p=document.createElement('p');p.className='hint';p.textContent=s;panel.append(p)}
function actions(items,cls='action-grid'){let g=document.createElement('div');g.className=cls;for(const [title,fn]of items)g.append(button(title,fn));panel.append(g);return g}
function control(name,min,max,step,value,onChange){const wrap=document.createElement('label');wrap.className='field';let title=document.createElement('div');title.textContent=name;let row=document.createElement('div');row.className='slider-row';const range=document.createElement('input'),num=document.createElement('input');range.type='range';num.type='number';for(const e of [range,num]){e.min=min;e.max=max;e.step=step;e.value=value}range.addEventListener('pointerdown',startAdjustment,{once:true});function startAdjustment(){if(base)saveHistory()}let numEditing=false;num.addEventListener('focus',()=>{numEditing=true;if(base)saveHistory()},{once:true});const apply=v=>{const n=clamp(Number(v)||0,min,max);range.value=n;num.value=n;onChange(n)};range.addEventListener('input',()=>apply(range.value));num.addEventListener('change',()=>apply(num.value));row.append(range,num);wrap.append(title,row);panel.append(wrap)}
function showCropControls(){
 heading(cropTarget==='overlay'?'Crop selected overlay':cropTarget==='photo'?'Crop main photo':'Crop entire canvas');
 heading('Crop ratio');
 const ratios=['free','1:1','4:5','16:9','9:16','4:3','3:2','2:1','3:1'];
 const buttons=actions(ratios.map(r=>[r==='free'?'Freeform':r,()=>setCropRatio(r)]));
 [...buttons.children].forEach((button,i)=>button.classList.toggle('selected',ratios[i]===cropRatio));
 hint('Drag inside the crop to move it, or drag an edge or corner to resize it.');
 cropFields();
 actions([['Apply crop',applyCrop],['Cancel',()=>{crop=null;cropTarget='canvas';cropIndex=-1;positionCrop();showPanel()}]]);
}
function showPanel(){
 panel.replaceChildren();$('panelTitle').textContent=tab==='crop'?'Crop Photo':tab.charAt(0).toUpperCase()+tab.slice(1);if(['adjust','effects','retouch'].includes(tab)){hint('Editing: '+(selectedImage()?.name||'Background photo'));if(selectedImage()?.locked||selectedImage()?.visible===false){hint('Unlock and show this layer in Layers before editing it.');return}}
 if(tab==='tools'){
  if(selectedPhoto&&!crop)photoSizeFields();
  heading('Transform');hint('Use Crop in the main toolbar to trim the photo. Crop canvas trims the full design, including overlays.');actions([['＋ Open photo',triggerUpload],['⌗ Crop canvas',()=>beginCrop('canvas')],['↻ Rotate 90°',()=>rotate(1)],['↺ Rotate −90°',()=>rotate(-1)],['⇄ Flip H',()=>flip(true)],['⇅ Flip V',()=>flip(false)]]);
  if(selectedImage()&&!selectedImage().locked&&selectedImage().visible!==false)actions([['⌗ Crop selected photo layer',()=>beginCrop('overlay')]]);
  if(crop)showCropControls();
  heading('Quick actions');actions([['Fit canvas',()=>{zoom=1;layoutCanvas()}],['Reset photo',resetImage]]);hint('The image remains centered in a fixed editing workspace. Zoom only changes the preview.');
 }
 if(tab==='crop'){
  if(crop&&cropTarget==='photo')showCropControls();
  else{heading('Crop your photo');hint('Trim the main photo without changing the canvas size or other layers.');actions([['Start photo crop',()=>beginCrop('photo','crop')]]);}
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
  hint('Maximum 24 megapixels. Fit adds the selected solid background; Fill crops to the preset shape.');
  const color=document.createElement('input');color.type='color';color.value=resizeBackground;const label=document.createElement('label');label.className='field';label.textContent='Fit background ';label.append(color);panel.append(label);color.oninput=()=>resizeBackground=color.value;
 }
 if(tab==='adjust'){
  heading('Light');['exposure','brightness','contrast','highlights','shadows','gamma'].forEach(k=>addAdjustment(k));
  heading('Color');['temperature','tint','saturation','vibrance','fade'].forEach(k=>addAdjustment(k));
  actions([['Auto enhance',()=>{if(!base)return;saveHistory();const target=editTarget();if(target){target.values={...target.values,contrast:14,shadows:18,highlights:-14,vibrance:22};target.cache=null}else values={...values,contrast:14,shadows:18,highlights:-14,vibrance:22};render();showPanel()}],['Reset adjustments',()=>{if(!base)return;saveHistory();const target=editTarget();if(target){target.values=adjustments();target.cache=null}else values=adjustments();render();showPanel()}]]);
 }
 if(tab==='effects'){
  heading('Looks & filters');const names=Object.keys(presets);const g=actions(names.map(k=>[k==='bw'?'B&W':k.charAt(0).toUpperCase()+k.slice(1),()=>{if(!base)return;saveHistory();const target=editTarget();if(target){target.preset=k;target.cache=null}else preset=k;render();showPanel()}]),'preset-grid');[...g.children].forEach((b,i)=>{b.classList.toggle('selected',names[i]===(editTarget()?.preset||preset));const preview=filterThumbnail(names[i]);if(preview)b.style.backgroundImage='linear-gradient(to top,rgba(11,12,22,.95),rgba(11,12,22,.02) 75%),url('+preview+')'});hint('Layer a look over the adjustments. Original removes the filter.');
 }
 if(tab==='retouch'){
  heading('Selective blur');hint('Paint directly on the photo. Erase restores only the masked blur.');
  const modes=actions([['Blur brush',()=>{brushActive=true;showPanel()}],['Erase blur',()=>{brushActive='erase';showPanel()}],['Stop painting',()=>{brushActive=false;showPanel()}]]);
  [...modes.children].forEach((b,i)=>b.classList.toggle('selected',brushActive===(i===0?true:i===1?'erase':false)));
  control('Brush size',10,100,1,brushSize,v=>brushSize=v);control('Blur intensity',10,100,1,intensity,v=>intensity=v);
  actions([['Clear blur',()=>{if(!base)return;saveHistory();const target=editTarget();const m=target?.blurMask||mask;m.getContext('2d').clearRect(0,0,m.width,m.height);if(target)target.cache=null;else if(resizeAnchor){resizeAnchor={...resizeAnchor,mask:makeCanvas(resizeAnchor.mask.width,resizeAnchor.mask.height)}}render()}]]);

 }
 if(tab==='text'){
  heading('Text');const textActions=actions([['＋ Add heading',()=>addText('Your heading',.09,'heading')],['＋ Add caption',()=>addText('Your caption',.04,'caption')],['＋ Add text',()=>addText('Your text',.05,'text')],['Remove selected',removeOverlay]]);['heading','caption','text'].forEach((k,i)=>textActions.children[i].disabled=!hasRoom(k));hint(['heading','caption','text'].map(countInfo).join(' · '));
  showLayerControls('text');
 }
 if(tab==='elements'){
  heading('Shapes & stickers');actions([['▢ Rectangle',()=>addShape('rect')],['◯ Circle',()=>addShape('circle')],['△ Triangle',()=>addShape('triangle')],['★ Star',()=>addShape('star')],['♥ Heart',()=>addShape('heart')],['➜ Arrow',()=>addShape('arrow')],['▢ Rounded',()=>addShape('rounded')],['╱ Line',()=>addShape('line')],['＋ Add photo',()=>$('overlayInput').click()]]);
  const stickers=['★','♥','✨','🔥','✓','☀','⚡','🌸','🎉','→','●','✦'];const g=actions(stickers.map(s=>[s,()=>addText(s,.10,'sticker')]),'sticker-grid');g.setAttribute('aria-label','Stickers');hint(['photo','shape','sticker'].map(countInfo).join(' · '));showLayerControls('elements');
 }
 if(tab==='layers'){heading('Overlay manager');const b=actions([['＋ Add photo overlay',()=>{if(requireRoom('photo'))$('overlayInput').click()}],['＋ Add text',()=>addText('Your text',.05,'text')]]);b.children[0].disabled=!hasRoom('photo');b.children[1].disabled=!hasRoom('text');hint(['photo','heading','caption','text'].map(countInfo).join(' · '));layerManager();}
 if(tab==='draw'){
  heading('Draw on image');hint('Choose a color and stroke width, then draw on the canvas with a mouse or finger.');
  const color=document.createElement('input');color.type='color';color.value=drawColor;color.oninput=()=>drawColor=color.value;const label=document.createElement('label');label.className='field';label.textContent='Stroke color ';label.append(color);panel.append(label);
  control('Stroke size',2,100,1,drawSize,v=>drawSize=v);
  actions([[(brushActive==='draw'?'✓ ':'')+'Draw mode',()=>{brushActive=brushActive==='draw'?false:'draw';showPanel()}],['Remove last stroke',()=>{const i=overlays.findLastIndex(o=>o.type==='stroke');if(i>=0){saveHistory();overlays.splice(i,1);render()}}]]);
  showLayerControls('draw');
 }
 if(tab==='frames'){
  heading('Borders & frames');const names=['none','solid','double','dashed','polaroid','neon','rounded','shadow'];const g=actions(names.map(s=>[s.charAt(0).toUpperCase()+s.slice(1),()=>{if(!base)return;saveHistory();frame.style=s;render();showPanel()}]));[...g.children].forEach((b,i)=>b.classList.toggle('selected',names[i]===frame.style));
  control('Border width',2,150,1,frame.width,v=>{frame.width=v;render()});const color=document.createElement('input');color.type='color';color.value=frame.color;color.onfocus=()=>base&&saveHistory();color.oninput=()=>{frame.color=color.value;render()};const label=document.createElement('label');label.className='field';label.textContent='Frame color ';label.append(color);panel.append(label);
 }
 if(tab==='export'){heading('Download');hint('PNG, JPEG and WebP at the edited canvas dimensions.');actions([['Export image',openExport],['Reset photo',resetImage]])}
}
function filterThumbnail(name){
 if(!base)return '';
 const thumb=makeCanvas(96,72),tc=thumb.getContext('2d',{willReadFrequently:true}),target=editTarget();tc.drawImage(target?.image||base,0,0,96,72);
 const src=tc.getImageData(0,0,96,72),out=tc.createImageData(96,72),v={...(target?.values||values)};
 for(const [k,n] of Object.entries(presets[name]||{}))v[k]+=n;
 tone(src.data,out.data,v);
 if(name==='sepia')for(let i=0;i<out.data.length;i+=4){const r=out.data[i],g=out.data[i+1],b=out.data[i+2];out.data[i]=clamp(r*.393+g*.769+b*.189,0,255);out.data[i+1]=clamp(r*.349+g*.686+b*.168,0,255);out.data[i+2]=clamp(r*.272+g*.534+b*.131,0,255)}
 tc.putImageData(out,0,0);return thumb.toDataURL('image/jpeg',.65);
}
function addAdjustment(k){const [name,min,max]=definitions[k],target=editTarget();control(name,min,max,k==='exposure'?.1:1,target?.values?.[k]??values[k],v=>{const current=editTarget();if(current){current.values={...current.values,[k]:v};current.cache=null}else values[k]=v;render()})}
function resetImage(){if(!source)return;saveHistory();base=clone(source);mask=makeCanvas(base.width,base.height);photoBounds=null;selectedPhoto=null;photoResizeDrag=null;photoTransformSource=null;photoTransformMask=null;photoTransformSourceRect=null;values=adjustments();preset='original';frame={style:'none',color:'#ffffff',width:20};overlays=[];selectedOverlay=-1;resizeAnchor=null;resizePlacement=null;resizeLast=null;crop=null;zoom=1;syncCanvas();render();showPanel();setStatus('Original photo restored')}
function addText(text,scale,textKind='text'){if(!base||!requireRoom(textKind))return;saveHistory();overlays.push({type:'text',textKind,text,x:Math.round(base.width*.12),y:Math.round(base.height*.2),size:Math.max(20,Math.round(base.width*scale)),color:'#ffffff',opacity:1,font:'system-ui,Arial,sans-serif',weight:'bold',outlineWidth:0,outlineColor:'#111111',shadowBlur:0,visible:true,locked:false});selectedOverlay=overlays.length-1;brushActive=false;render();showPanel()}
function addShape(shape){if(!base||!requireRoom('shape'))return;saveHistory();overlays.push({type:'shape',shape,x:Math.round(base.width*.3),y:Math.round(base.height*.3),w:Math.round(base.width*.35),h:Math.round(base.height*.25),color:'#ff62ad',opacity:1,visible:true,locked:false});selectedOverlay=overlays.length-1;brushActive=false;render();showPanel()}
function removeOverlay(){if(selectedOverlay<0||!overlays[selectedOverlay])return;saveHistory();overlays.splice(selectedOverlay,1);selectedOverlay=overlays.length?Math.min(selectedOverlay,overlays.length-1):-1;render();showPanel()}
function layerName(o,i){return o.name||((o.type==='text'?String(o.text).slice(0,20):o.type==='stroke'?'Drawn stroke':o.type==='shape'?o.shape:'Photo overlay')+' '+(i+1))}
function layerManager(){
 const list=document.createElement('div');list.className='layer-list';
 const baseRow=document.createElement('button');baseRow.type='button';baseRow.className='layer-base'+(selectedOverlay<0?' selected':'');baseRow.textContent='▧ Background photo';baseRow.onclick=()=>{selectedOverlay=-1;render();showPanel()};list.append(baseRow);
 overlays.forEach((o,i)=>{const row=document.createElement('div');row.className='layer-row'+(selectedOverlay===i?' selected':'')+(o.visible===false?' is-hidden':'');
  const thumb=document.createElement('canvas');thumb.width=42;thumb.height=42;thumb.className='layer-thumb';const tc=thumb.getContext('2d');if(o.type==='image')tc.drawImage(o.image,0,0,42,42);else if(o.type==='text'){tc.fillStyle=o.color;tc.font='bold 28px system-ui';tc.fillText('T',11,32)}else{tc.fillStyle=o.color||'#a879ff';tc.fillRect(5,5,32,32)}
  const select=button(layerName(o,i),()=>{selectedOverlay=i;render();showPanel()});select.className='layer-select';
  const visible=button(o.visible===false?'◌':'◉',()=>{saveHistory();o.visible=o.visible===false;render();showPanel()});visible.title=o.visible===false?'Show layer':'Hide layer';visible.setAttribute('aria-label',visible.title);
  const lock=button(o.locked?'🔒':'🔓',()=>{saveHistory();o.locked=!o.locked;render();showPanel()});lock.title=o.locked?'Unlock layer':'Lock layer';lock.setAttribute('aria-label',lock.title);
  const del=button('×',()=>{saveHistory();overlays.splice(i,1);selectedOverlay=selectedOverlay===i?-1:selectedOverlay>i?selectedOverlay-1:selectedOverlay;render();showPanel()});del.title='Delete layer';del.setAttribute('aria-label','Delete '+layerName(o,i));
  row.append(thumb,select,visible,lock,del);list.append(row)
 });panel.append(list);
 if(selectedOverlay>=0){const o=overlays[selectedOverlay];hint(o.locked?'This layer is locked. Unlock it to edit.':o.visible===false?'This layer is hidden. Show it to edit.':'Select Adjust, Effects or Retouch to edit this photo layer.');actions([['Move up',()=>moveLayer(1)],['Move down',()=>moveLayer(-1)]])}
}
function moveLayer(dir){const i=selectedOverlay,j=i+dir;if(i<0||j<0||j>=overlays.length)return;saveHistory();[overlays[i],overlays[j]]=[overlays[j],overlays[i]];selectedOverlay=j;render();showPanel()}
function cropFields(){
 const b=cropBounds(),fields=document.createElement('div');fields.className='crop-fields';
 const specs=[
  ['X',()=>crop.x,v=>crop.x=clamp(v,b.x,b.x+b.w-crop.w)],
  ['Y',()=>crop.y,v=>crop.y=clamp(v,b.y,b.y+b.h-crop.h)],
  ['Width',()=>crop.w,v=>crop.w=clamp(v,1,b.x+b.w-crop.x)],
  ['Height',()=>crop.h,v=>crop.h=clamp(v,1,b.y+b.h-crop.y)],
  ['Right inset',()=>b.x+b.w-crop.x-crop.w,v=>crop.x=clamp(b.x+b.w-crop.w-v,b.x,b.x+b.w-crop.w)],
  ['Bottom inset',()=>b.y+b.h-crop.y-crop.h,v=>crop.y=clamp(b.y+b.h-crop.h-v,b.y,b.y+b.h-crop.h)]
 ];
 for(const [name,get,set]of specs){
  const label=document.createElement('label');label.textContent=name+' (px)';
  const input=document.createElement('input');input.type='number';input.min='0';input.value=Math.round(get());
  input.onchange=()=>{set(Number(input.value)||0);positionCrop();showPanel()};
  label.append(input);fields.append(label)
 }
 panel.append(fields)
}
function showLayerControls(kind){
 if(!overlays.length){hint('Add an element to edit its position, color and layer order.');return}
 heading('Selected layer');const chooser=document.createElement('select');chooser.className='text-select';overlays.forEach((o,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=(i+1)+'. '+layerName(o,i);chooser.append(opt)});selectedOverlay=clamp(selectedOverlay,0,overlays.length-1);chooser.value=selectedOverlay;chooser.onchange=()=>{selectedOverlay=Number(chooser.value);render();showPanel()};panel.append(chooser);
 const o=overlays[selectedOverlay];if(o.locked||o.visible===false){hint(o.locked?'Unlock this layer in Layers to edit it.':'Show this layer in Layers to edit it.');return}
 if(o.type==='text'){
  const label=document.createElement('label');label.className='field';label.textContent='Text';const input=document.createElement('textarea');input.value=o.text;input.rows=2;input.addEventListener('focus',()=>saveHistory(),{once:true});input.oninput=()=>{o.text=input.value;render()};label.append(input);panel.append(label);
  control('Font size',10,600,1,o.size,v=>{o.size=v;render()});
  const fonts=['system-ui,Arial,sans-serif','Georgia,serif','Impact,sans-serif','monospace','Trebuchet MS,sans-serif','Arial Black,sans-serif','Times New Roman,serif','Courier New,monospace'];
  const sel=document.createElement('select');sel.className='text-select';fonts.forEach((f,i)=>{const opt=document.createElement('option');opt.value=f;opt.textContent=['Modern','Editorial serif','Impact','Mono','Rounded','Heavy','Classic','Typewriter'][i];sel.append(opt)});sel.value=o.font||fonts[0];sel.onchange=()=>{saveHistory();o.font=sel.value;render()};panel.append(sel);
  control('Outline width',0,30,1,o.outlineWidth||0,v=>{o.outlineWidth=v;render()});colorField('Outline color',o.outlineColor||'#111111',v=>{o.outlineColor=v;render()});
  control('Text shadow',0,60,1,o.shadowBlur||0,v=>{o.shadowBlur=v;render()});
  const weights=actions([['Regular',()=>{saveHistory();o.weight='normal';render();showPanel()}],['Bold',()=>{saveHistory();o.weight='bold';render();showPanel()}]]);[...weights.children].forEach((b,i)=>b.classList.toggle('selected',(o.weight||'bold')===(i?'bold':'normal')));
 }
 if(o.type==='image'){actions([['⌗ Crop photo layer',()=>beginCrop('overlay')]]);control('Photo border',0,100,1,o.borderWidth||0,v=>{o.borderWidth=v;render()});colorField('Border color',o.borderColor||'#ffffff',v=>{o.borderColor=v;render()})}
 if(o.type==='shape'||o.type==='image'){control('Width',10,base.width*2,1,o.w,v=>{o.w=v;render()});control('Height',10,base.height*2,1,o.h,v=>{o.h=v;render()})}
 if(o.type!=='image'&&o.type!=='stroke')colorField('Color',o.color,v=>{o.color=v;render()});
 control('Opacity',0,100,1,Math.round((o.opacity??1)*100),v=>{o.opacity=v/100;render()});
 if(o.type!=='stroke'){control('Horizontal position',0,base.width,1,o.x,v=>{o.x=v;render()});control('Vertical position',0,base.height,1,o.y,v=>{o.y=v;render()})}
 const duplicateButtons=actions([['Move forward',()=>moveLayer(1)],['Move backward',()=>moveLayer(-1)],['Duplicate',()=>{if(!requireRoom(layerKind(o)))return;saveHistory();overlays.push({...cloneOverlay(o),x:(o.x||0)+20,y:(o.y||0)+20});selectedOverlay=overlays.length-1;render();showPanel()}],['Delete layer',removeOverlay]]);duplicateButtons.children[2].disabled=!hasRoom(layerKind(o));
}
function colorField(name,value,onChange){const color=document.createElement('input');color.type='color';color.value=value;color.onfocus=()=>saveHistory();color.oninput=()=>onChange(color.value);const label=document.createElement('label');label.className='field';label.textContent=name+' ';label.append(color);panel.append(label)}
function setBrush(s){brushSize=s;brushActive=true;showPanel();setStatus('Blur brush active')}
function selectTab(t){
 if(t==='export'){openExport();return}
 if(t==='crop'){
  if(!base){setStatus('Open a photo before cropping');triggerUpload();return}
  beginCrop('photo','crop');
 }else{
  if(tab==='crop'&&crop){crop=null;cropTarget='canvas';cropIndex=-1;positionCrop()}
  tab=t;
  document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===t));
  if(t!=='retouch'&&t!=='draw')brushActive=false;
  showPanel();
 }
 if(innerWidth<768){$('inspector').classList.add('open');document.querySelector('.app').classList.add('drawer-open');layoutCanvas()}
}
function closeDrawer(){$('inspector').classList.remove('open');document.querySelector('.app').classList.remove('drawer-open');layoutCanvas()}
function transform(draw,w,h){if(!base)return;saveHistory();resizeAnchor=null;resizePlacement=null;resizeLast=null;for(const name of ['base','mask']){const old=name==='base'?base:mask,n=makeCanvas(w,h),c=n.getContext('2d');draw(c,old);if(name==='base')base=n;else mask=n}crop=null;photoBounds=null;photoTransformSource=null;photoTransformMask=null;photoTransformSourceRect=null;syncCanvas();render();setStatus('Transform applied')}
function resizeTo(w,h){
 if(!base)return;
 w=Math.round(w);h=Math.round(h);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1||w>8000||h>8000||w*h>24000000){
  setStatus('Choose dimensions from 1 to 8000 px and under 24 megapixels');return;
 }
 const key=[w,h,resizeMode,resizeMode==='fit'?resizeBackground:''].join('|');
 if(resizeLast===key&&base.width===w&&base.height===h){
  setStatus('Already '+w+' × '+h+' — no additional resize applied');return;
 }
 // Keep the unpadded, full-quality source for the entire resize session.
 // Repeated Fit/Fill selections must never resize previously added white bars.
 if(!resizeAnchor){
  resizeAnchor={base:clone(base),mask:clone(mask)};
  resizePlacement={scale:1,dx:0,dy:0};
 }
 const original=resizeAnchor.base,srcMask=resizeAnchor.mask;
 const old=resizePlacement;
 const scale=resizeMode==='fill'?
  Math.max(w/original.width,h/original.height):
  Math.min(w/original.width,h/original.height);
 const drawW=original.width*scale,drawH=original.height*scale;
 const dx=(w-drawW)/2,dy=(h-drawH)/2;
 saveHistory();
 const newBase=makeCanvas(w,h),bc=newBase.getContext('2d');
 bc.fillStyle=resizeBackground;bc.fillRect(0,0,w,h);
 bc.imageSmoothingEnabled=true;bc.imageSmoothingQuality='high';
 bc.drawImage(original,dx,dy,drawW,drawH);
 const newMask=makeCanvas(w,h),mc=newMask.getContext('2d');
 mc.imageSmoothingEnabled=true;mc.imageSmoothingQuality='high';
 mc.drawImage(srcMask,dx,dy,drawW,drawH);
 const factor=scale/old.scale;
 overlays=overlays.map(o=>{
  const n={...o,x:((o.x??0)-old.dx)*factor+dx,y:((o.y??0)-old.dy)*factor+dy};
  if(o.w!==undefined)n.w=o.w*factor;
  if(o.h!==undefined)n.h=o.h*factor;
  if(o.size!==undefined)n.size=o.size*factor;
  if(o.points)n.points=o.points.map(p=>({x:(p.x-old.dx)*factor+dx,y:(p.y-old.dy)*factor+dy}));
  return n;
 });
 frame.width=Math.max(1,Math.round(frame.width*factor));
 base=newBase;mask=newMask;
 resizePlacement={scale,dx,dy};
 resizeLast=key;
 photoBounds=null;photoTransformSource=null;photoTransformMask=null;photoTransformSourceRect=null;crop=null;zoom=1;syncCanvas();render();showPanel();
 setStatus('Resized to '+w+' × '+h+' from original photo content');
}
function rotate(dir){if(!base)return;const oldW=base.width,oldH=base.height;transform((c,old)=>{c.translate(dir>0?old.height:0,dir>0?0:old.width);c.rotate(dir*Math.PI/2);c.drawImage(old,0,0)},base.height,base.width);overlays.forEach(o=>{let x=o.x,y=o.y;o.x=dir>0?oldH-y:y;o.y=dir>0?x:oldW-x});render()}
function flip(horizontal){if(!base)return;transform((c,old)=>{c.translate(horizontal?old.width:0,horizontal?0:old.height);c.scale(horizontal?-1:1,horizontal?1:-1);c.drawImage(old,0,0)},base.width,base.height);overlays.forEach(o=>{if(horizontal)o.x=base.width-o.x;else o.y=base.height-o.y});render()}
function beginCrop(target='canvas',panelTab='tools'){
 if(!base)return;brushActive=false;selectedPhoto=null;positionPhotoSelection();cropTarget=target==='overlay'&&selectedImage()&&!selectedImage().locked&&selectedImage().visible!==false?'overlay':target==='photo'?'photo':'canvas';
 cropIndex=cropTarget==='overlay'?selectedOverlay:-1;cropRatio='free';
 const b=cropBounds();
 // Oversized photos start cropping at the four visible canvas edges, never outside.
 const r=cropTarget==='overlay'?overlays[cropIndex]:cropTarget==='photo'?photoBounds:null;
 const oversized=!!r&&(r.x<0||r.y<0||r.x+r.w>base.width||r.y+r.h>base.height);
 const m=oversized?0:.08;
 crop={x:Math.round(b.x+b.w*m),y:Math.round(b.y+b.h*m),w:Math.max(1,Math.round(b.w*(1-2*m))),h:Math.max(1,Math.round(b.h*(1-2*m)))};
 positionCrop();tab=panelTab;document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===panelTab));showPanel();setStatus('Drag inside the crop or its handles; outside clicks are ignored');
}
function setCropRatio(ratio){
 if(!crop||!base)return;cropRatio=ratio;
 if(ratio!=='free'){const b=cropBounds(),[a,d]=ratio.split(':').map(Number);let w=Math.min(b.w,b.h*a/d),h=w*d/a;if(h>b.h){h=b.h;w=h*a/d}crop={x:Math.round(b.x+(b.w-w)/2),y:Math.round(b.y+(b.h-h)/2),w:Math.max(1,Math.round(w)),h:Math.max(1,Math.round(h))}}
 positionCrop();showPanel();
}
function applyCrop(){
 if(!crop||!base)return;const b=cropBounds(),x=Math.round(clamp(crop.x,b.x,b.x+b.w-1)),y=Math.round(clamp(crop.y,b.y,b.y+b.h-1));
 const w=Math.max(1,Math.round(Math.min(crop.w,b.x+b.w-x))),h=Math.max(1,Math.round(Math.min(crop.h,b.y+b.h-y))),r={x,y,w,h};
 if(cropTarget==='overlay'){
  const o=overlays[cropIndex];if(!o?.image)return;const edited=cropPhoto(o,r);if(!edited){setStatus('Crop does not overlap photo layer');return}
  saveHistory();overlays[cropIndex]=edited;selectedOverlay=cropIndex;crop=null;cropTarget='canvas';cropIndex=-1;positionCrop();render();showPanel();setStatus('Photo overlay cropped');return;
 }
 if(cropTarget==='photo'){
  // Preserve the high-resolution source region when cropping an already resized photo.
  const previous=photoBounds||{x:0,y:0,w:base.width,h:base.height};
  const src=photoTransformSourceRect&&photoTransformSource
   ?{x:photoTransformSourceRect.x+(x-previous.x)/previous.w*photoTransformSourceRect.w,
     y:photoTransformSourceRect.y+(y-previous.y)/previous.h*photoTransformSourceRect.h,
     w:w/previous.w*photoTransformSourceRect.w,h:h/previous.h*photoTransformSourceRect.h}:null;
  saveHistory();
  const cropped=makeCanvas(base.width,base.height),croppedMask=makeCanvas(mask.width,mask.height);
  if(src){
   cropped.getContext('2d').drawImage(photoTransformSource,src.x,src.y,src.w,src.h,x,y,w,h);
   croppedMask.getContext('2d').drawImage(photoTransformMask,src.x,src.y,src.w,src.h,x,y,w,h);
   photoTransformSourceRect=src;
  }else{
   cropped.getContext('2d').drawImage(base,x,y,w,h,x,y,w,h);
   croppedMask.getContext('2d').drawImage(mask,x,y,w,h,x,y,w,h);
  }
  base=cropped;mask=croppedMask;photoBounds={...r};
  resizeAnchor=null;resizePlacement=null;resizeLast=null;
  crop=null;cropTarget='canvas';cropIndex=-1;positionCrop();render();showPanel();
  setStatus('Main photo cropped · canvas and overlays preserved');return;
 }
 saveHistory();const newBase=makeCanvas(w,h),newMask=makeCanvas(w,h);newBase.getContext('2d').drawImage(base,x,y,w,h,0,0,w,h);newMask.getContext('2d').drawImage(mask,x,y,w,h,0,0,w,h);
 const previousSelected=selectedOverlay,next=[];let nextSelected=-1;
 overlays.forEach((o,i)=>{let layer;if(o.type==='image')layer=cropPhoto(o,r,x,y);else if(o.type==='stroke'){layer=cloneOverlay(o);layer.points=(o.points||[]).map(p=>({x:p.x-x,y:p.y-y}))}else layer={...o,x:(o.x||0)-x,y:(o.y||0)-y};
 if(layer){if(i===previousSelected)nextSelected=next.length;next.push(layer)}});
 base=newBase;mask=newMask;overlays=next;selectedOverlay=nextSelected;
 if(photoBounds){
  const previous=photoBounds,px=Math.max(previous.x,x),py=Math.max(previous.y,y),pr=Math.min(previous.x+previous.w,x+w),pb=Math.min(previous.y+previous.h,y+h);
  if(pr>px&&pb>py){
   if(photoTransformSourceRect){
    const src=photoTransformSourceRect;
    photoTransformSourceRect={x:src.x+(px-previous.x)/previous.w*src.w,y:src.y+(py-previous.y)/previous.h*src.h,w:(pr-px)/previous.w*src.w,h:(pb-py)/previous.h*src.h};
   }
   photoBounds={x:px-x,y:py-y,w:pr-px,h:pb-py};
  }else{photoBounds=null;photoTransformSource=null;photoTransformMask=null;photoTransformSourceRect=null}
 }else{photoTransformSource=null;photoTransformMask=null;photoTransformSourceRect=null}
 resizeAnchor=null;resizePlacement=null;resizeLast=null;crop=null;cropTarget='canvas';cropIndex=-1;syncCanvas();render();showPanel();setStatus('Canvas and photo overlays cropped');
}
function pointerPosition(e){const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)*base.width/r.width,0,base.width),y:clamp((e.clientY-r.top)*base.height/r.height,0,base.height)}}
let painting=false,lastPoint=null,activeStroke=null,activePaintTarget=null;
function hitOverlay(p,imagesOnly=false){
 for(let i=overlays.length-1;i>=0;i--){const o=overlays[i];if(o.visible===false||o.locked||o.type==='stroke'||(imagesOnly&&o.type!=='image'))continue;
 const w=o.w||String(o.text||'').length*o.size*.65,h=o.h||o.size*1.3;
 if(p.x>=o.x&&p.x<=o.x+w&&p.y>=o.y&&p.y<=o.y+h)return i}
 return -1
}
function paint(p){
 const target=activePaintTarget,m=target?.blurMask||mask;
 const q=target?{x:clamp((p.x-target.x)*m.width/target.w,0,m.width),y:clamp((p.y-target.y)*m.height/target.h,0,m.height)}:p;
 const scale=canvas.width/Math.max(1,canvas.getBoundingClientRect().width),s=Math.max(3,brushSize*scale*(target?m.width/base.width*base.width/target.w:1));
 const c=m.getContext('2d');c.lineCap='round';c.lineJoin='round';c.lineWidth=s;c.globalCompositeOperation=brushActive==='erase'?'destination-out':'source-over';c.strokeStyle='rgba(255,255,255,'+(intensity/100)+')';c.beginPath();c.moveTo(lastPoint?.x??q.x,lastPoint?.y??q.y);c.lineTo(q.x,q.y);c.stroke();c.beginPath();c.arc(q.x,q.y,s/2,0,Math.PI*2);c.fillStyle=c.strokeStyle;c.fill();c.globalCompositeOperation='source-over';if(!target&&resizeAnchor&&resizePlacement){const r=resizePlacement,a={x:(q.x-r.dx)/r.scale,y:(q.y-r.dy)/r.scale},b=lastPoint?{x:(lastPoint.x-r.dx)/r.scale,y:(lastPoint.y-r.dy)/r.scale}:a;const ac=resizeAnchor.mask.getContext('2d');ac.lineCap='round';ac.lineJoin='round';ac.lineWidth=s/r.scale;ac.globalCompositeOperation=brushActive==='erase'?'destination-out':'source-over';ac.strokeStyle=c.strokeStyle;ac.fillStyle=c.fillStyle;ac.beginPath();ac.moveTo(b.x,b.y);ac.lineTo(a.x,a.y);ac.stroke();ac.beginPath();ac.arc(a.x,a.y,ac.lineWidth/2,0,Math.PI*2);ac.fill();ac.globalCompositeOperation='source-over'}lastPoint=q;if(target)target.cache=null
}
canvas.addEventListener('pointerdown',e=>{
 if(!base)return;const p=pointerPosition(e);
 if(crop){e.preventDefault();return}
 if(e.pointerType==='touch'&&activePhotoPointers.size&&selectedPhoto&&!brushActive){
  startPhotoPointer(e,true);return;
 }
 const hit=hitOverlay(p,!(tab==='text'||tab==='elements'||tab==='layers'));
 const previous=selectedOverlay,oldPhoto=selectedPhoto?selectedPhoto.kind+':'+(selectedPhoto.index??-1):'';
 selectedOverlay=hit;
 if(!brushActive){
  const picked=hit>=0&&overlays[hit]?.type==='image'&&!overlays[hit].locked?{kind:'overlay',index:hit}:hit<0&&basePixelAt(p)?{kind:'base'}:null;
  selectedPhoto=picked;
  positionPhotoSelection();
 }
 const nextPhoto=selectedPhoto?selectedPhoto.kind+':'+(selectedPhoto.index??-1):'';
 if(previous!==hit||oldPhoto!==nextPhoto){render();showPanel()}
 if(!brushActive&&selectedPhoto&&tab!=='crop'){
  startPhotoPointer(e);return;
 }
 if(hit>=0&&!brushActive&&['text','elements','layers'].includes(tab)){e.preventDefault();saveHistory();overlayDrag={dx:p.x-overlays[hit].x,dy:p.y-overlays[hit].y};canvas.setPointerCapture(e.pointerId);return}
 if(!brushActive)return;
 e.preventDefault();if(brushActive==='draw'&&!requireRoom('drawing'))return;saveHistory();painting=true;lastPoint=null;canvas.setPointerCapture(e.pointerId);
 if(brushActive==='draw'){activeStroke={type:'stroke',points:[p],size:drawSize*base.width/Math.max(1,canvas.getBoundingClientRect().width),color:drawColor,opacity:1,visible:true,locked:false};overlays.push(activeStroke);selectedOverlay=overlays.length-1}
 else{activePaintTarget=hit>=0?overlays[hit]:null;if(!activePaintTarget&&resizeAnchor)resizeAnchor={...resizeAnchor,mask:clone(resizeAnchor.mask)};paint(p)}
 render();
});
canvas.addEventListener('pointermove',e=>{
 if(activePhotoPointers.has(e.pointerId)){
  activePhotoPointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY});
  e.preventDefault();progressPhotoGesture();return;
 }
 if(overlayDrag&&base){e.preventDefault();const p=pointerPosition(e),o=overlays[selectedOverlay];if(o&&!o.locked){o.x=Math.round(clamp(p.x-overlayDrag.dx,0,base.width));o.y=Math.round(clamp(p.y-overlayDrag.dy,0,base.height));render()}return}
 if(!painting||!base)return;e.preventDefault();if(activeStroke)activeStroke.points.push(pointerPosition(e));else paint(pointerPosition(e));render();
});
const endPaint=e=>{if(finishPhotoPointer(e))return;overlayDrag=null;if(painting){if(brushActive!=='draw'&&!activePaintTarget&&photoTransformSource&&photoTransformMask&&photoBounds&&photoTransformSourceRect){const nextMask=clone(photoTransformMask),r=photoTransformSourceRect,b=photoBounds,mc=nextMask.getContext('2d');mc.clearRect(r.x,r.y,r.w,r.h);mc.drawImage(mask,b.x,b.y,b.w,b.h,r.x,r.y,r.w,r.h);photoTransformMask=nextMask}painting=false;activeStroke=null;activePaintTarget=null;lastPoint=null;render();if(tab==='draw'||tab==='layers')showPanel();setStatus('Edit applied')}};
canvas.addEventListener('pointerup',endPaint);canvas.addEventListener('pointercancel',endPaint);
$('cropBox').addEventListener('pointerdown',e=>{
 if(!crop||!base)return;e.preventDefault();e.stopPropagation();const p=pointerPosition(e),b=cropBounds(),r={x:(crop.x-b.x)/b.w,y:(crop.y-b.y)/b.h,w:crop.w/b.w,h:crop.h/b.h};
 drag={mode:e.target.dataset.handle||'move',from:{x:(p.x-b.x)/b.w,y:(p.y-b.y)/b.h},start:r};
 $('cropBox').setPointerCapture(e.pointerId)
});
// Crop dragging only updates the selection outline, never reprocesses image pixels.
let cropMoveFrame=0,queuedCropPointer=null;
function applyPendingCropPointer(){
 if(!queuedCropPointer||!drag||!crop||!base)return;
 const p=pointerPosition(queuedCropPointer),b=cropBounds(),r=canvas.getBoundingClientRect();
 const ratio=cropRatio==='free'?0:Number(cropRatio.split(':')[0])/Number(cropRatio.split(':')[1]);
 const next=window.LOOXCrop.drag(drag.start,drag.mode,drag.from,
  {x:(p.x-b.x)/b.w,y:(p.y-b.y)/b.h},r.width*b.w/base.width,r.height*b.h/base.height,ratio);
 crop={x:Math.round(b.x+next.x*b.w),y:Math.round(b.y+next.y*b.h),
  w:Math.max(1,Math.round(next.w*b.w)),h:Math.max(1,Math.round(next.h*b.h))};
 positionCrop();
}
$('cropBox').addEventListener('pointermove',e=>{
 if(!drag||!crop)return;
 e.preventDefault();
 queuedCropPointer={clientX:e.clientX,clientY:e.clientY};
 if(cropMoveFrame)return;
 cropMoveFrame=requestAnimationFrame(()=>{
  cropMoveFrame=0;
  applyPendingCropPointer();
  queuedCropPointer=null;
 });
});
function finishCropDrag(e,cancel=false){
 if(!drag)return;
 if(cropMoveFrame)cancelAnimationFrame(cropMoveFrame);
 cropMoveFrame=0;
 if(!cancel){queuedCropPointer={clientX:e.clientX,clientY:e.clientY};applyPendingCropPointer()}
 queuedCropPointer=null;drag=null;
 if(!cancel)showPanel();
}
$('cropBox').addEventListener('pointerup',e=>finishCropDrag(e));
$('cropBox').addEventListener('pointercancel',e=>finishCropDrag(e,true));
$('cropBox').addEventListener('keydown',e=>{const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!move||!crop)return;e.preventDefault();const step=e.shiftKey?10:1;const b=cropBounds();crop.x=clamp(crop.x+move[0]*step,b.x,b.x+b.w-crop.w);crop.y=clamp(crop.y+move[1]*step,b.y,b.y+b.h-crop.h);positionCrop();showPanel()});
let exportPreview=null,exportPreviewKey='',exportTimer=0,exportToken=0;
const fileSizeLabel=bytes=>bytes>=1048576?(bytes/1048576).toFixed(2)+' MB':(bytes/1024).toFixed(1)+' KB';
function exportSettings(){return [$('format').value,$('quality').value,$('exportSize').value,renderToken].join('|')}
function outputCanvas(type){
 const composed=compose(),edge=$('exportSize').value;let w=composed.width,h=composed.height;
 if(edge!=='original'){const scale=Number(edge)/Math.max(w,h);w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale))}
 const out=makeCanvas(w,h),c=out.getContext('2d');c.imageSmoothingQuality='high';
 if(type==='image/jpeg'){c.fillStyle='#ffffff';c.fillRect(0,0,w,h)}
 c.drawImage(composed,0,0,w,h);return out
}
function prepareExport(){
 if(!base||!$('exportDialog').open)return;
 clearTimeout(exportTimer);const token=++exportToken,key=exportSettings();exportPreview=null;
 $('exportFileSize').textContent='File size: calculating…';
 exportTimer=setTimeout(()=>{try{const type=$('format').value,q=Number($('quality').value)/100,out=outputCanvas(type);$('exportInfo').textContent=out.width+' × '+out.height+' px · '+(type==='image/png'?'PNG is lossless; quality has no effect.':'Quality changes compression and file size.');
 out.toBlob(blob=>{if(token!==exportToken)return;exportPreview=blob;exportPreviewKey=key;$('exportFileSize').textContent=blob?'File size: '+fileSizeLabel(blob.size):'File size: unavailable';},type,q)}
 catch(e){if(token===exportToken){console.error(e);$('exportFileSize').textContent='File size: preview unavailable'}}},180)
}
function openExport(){if(!base){setStatus('Open an image first');triggerUpload();return}closeDrawer();$('exportDialog').showModal();prepareExport()}
function download(){
 if(!base||busy)return;busy=true;const b=$('download');b.disabled=true;b.textContent='Preparing image…';
 const type=$('format').value,key=exportSettings();
 if(exportPreview&&exportPreviewKey===key){finishBlob(exportPreview,type);return}
 try{outputCanvas(type).toBlob(blob=>finishBlob(blob,type),type,Number($('quality').value)/100)}
 catch(e){console.error(e);setStatus('Export failed');busy=false;b.disabled=false;b.textContent='Download image ↓'}
}
function finishBlob(blob,type){busy=false;const b=$('download');b.disabled=false;b.textContent='Download image ↓';if(!blob){setStatus('Export failed — image may be too large');return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename+'-loox.'+({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type]||'png');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('exportDialog').close();setStatus('Image exported · '+fileSizeLabel(blob.size))}
$('overlayInput').addEventListener('change',e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file||!base||!requireRoom('photo'))return;
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{URL.revokeObjectURL(url);if(!requireRoom('photo'))return;saveHistory();const scale=Math.min(base.width*.55/img.width,base.height*.55/img.height,1);overlays.push({type:'image',image:img,name:file.name,visible:true,locked:false,values:adjustments(),preset:'original',blurMask:makeCanvas(img.width,img.height),cache:null,x:Math.round(base.width*.2),y:Math.round(base.height*.2),w:Math.round(img.width*scale),h:Math.round(img.height*scale),opacity:1,borderWidth:0,borderColor:'#ffffff'});selectedOverlay=overlays.length-1;render();showPanel();setStatus('Photo layer added')};
 img.onerror=()=>{URL.revokeObjectURL(url);setStatus('Could not open photo layer')};img.src=url;
});
$('fileInput').addEventListener('change',e=>{load(e.target.files[0]);e.target.value=''});['openImage','chooseImage'].forEach(id=>$(id).addEventListener('click',triggerUpload));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
$('closeDrawer').addEventListener('click',closeDrawer);$('drawerBackdrop').addEventListener('click',closeDrawer);
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);$('exportTop').addEventListener('click',openExport);$('closeExport').addEventListener('click',()=>$('exportDialog').close());$('download').addEventListener('click',download);
$('quality').addEventListener('input',e=>{$('qualityValue').textContent=e.target.value+'%';prepareExport()});$('format').addEventListener('change',e=>{$('quality').disabled=e.target.value==='image/png';prepareExport()});$('exportSize').addEventListener('change',prepareExport);
$('zoomIn').addEventListener('click',()=>{zoom=clamp(zoom*1.25,.2,8);layoutCanvas()});$('zoomOut').addEventListener('click',()=>{zoom=clamp(zoom/1.25,.2,8);layoutCanvas()});$('fit').addEventListener('click',()=>{zoom=1;layoutCanvas()});
const zone=$('dropzone');zone.addEventListener('pointerdown',e=>{if(e.target!==zone||!selectedPhoto||crop||!base)return;selectedPhoto=null;positionPhotoSelection();if(tab==='tools')showPanel()});zone.addEventListener('dragover',e=>{e.preventDefault();zone.style.outline='2px dashed #a979ff'});zone.addEventListener('dragleave',()=>zone.style.outline='');zone.addEventListener('drop',e=>{e.preventDefault();zone.style.outline='';load([...e.dataTransfer.files].find(f=>f.type.startsWith('image/')))});window.addEventListener('resize',layoutCanvas);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}if(e.key==='Escape'&&crop){crop=null;positionCrop();showPanel()}else if(e.key==='Escape'&&selectedPhoto){selectedPhoto=null;positionPhotoSelection();if(tab==='tools')showPanel()}});
updateHistory();showPanel();})();