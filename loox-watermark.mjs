import {recordVideo,toMp4,releaseVideo} from './tools/media-export.mjs';
const $=id=>document.getElementById(id),canvas=$('watermark-canvas'),ctx=canvas.getContext('2d');
let media=null,kind='',sourceURL=null,logo=null,logoURL=null,resultURL=null,exporting=false,abort=null,sourceWidth=0,sourceHeight=0,dragging=false;
const status=(text,error=false)=>{$('watermark-status').textContent=text;$('watermark-status').classList.toggle('error',error)};
const bounded=(id,min,max,fallback)=>{const value=$(id).value,n=Number(value);return Math.max(min,Math.min(max,value!==''&&Number.isFinite(n)?n:fallback))};
function config(){return {text:$('watermark-text').value.slice(0,120),opacity:bounded('watermark-opacity',1,100,25)/100,size:bounded('watermark-size',1,30,5)/100,angle:bounded('watermark-angle',-90,90,0)*Math.PI/180,x:bounded('watermark-x',0,100,50)/100,y:bounded('watermark-y',0,100,50)/100,gap:bounded('watermark-gap',1,6,2),repeat:$('watermark-repeat').checked,color:$('watermark-color').value,mode:$('watermark-mode').value}}
function sizeCanvas(){if(!sourceWidth)return;const max=kind==='video'?Number($('watermark-resolution').value)||1920:8192,scale=Math.min(1,max/Math.max(sourceWidth,sourceHeight));canvas.width=kind==='video'?Math.max(2,Math.floor(sourceWidth*scale/2)*2):sourceWidth;canvas.height=kind==='video'?Math.max(2,Math.floor(sourceHeight*scale/2)*2):sourceHeight}
function drawMark(x,y,c){
 ctx.save();ctx.translate(x,y);ctx.rotate(c.angle);ctx.globalAlpha=c.opacity;
 if(c.mode==='logo'&&logo){const w=canvas.width*c.size*2,h=w*logo.naturalHeight/logo.naturalWidth;ctx.drawImage(logo,-w/2,-h/2,w,h)}
 else if(c.text){ctx.font='700 '+Math.max(9,canvas.width*c.size)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c.color;ctx.shadowColor='#0007';ctx.shadowBlur=3;ctx.fillText(c.text,0,0)}
 ctx.restore()
}
function draw(){
 if(!media)return;ctx.globalAlpha=1;ctx.clearRect(0,0,canvas.width,canvas.height);
 if(kind==='video'||$('watermark-format').value==='image/jpeg'){ctx.fillStyle=kind==='video'?'#10131c':'#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height)}
 if(kind==='video'&&media.readyState<2)return;
 ctx.drawImage(media,0,0,canvas.width,canvas.height);const c=config();
 if(c.repeat){ctx.font='700 '+Math.max(9,canvas.width*c.size)+'px system-ui';const markWidth=c.mode==='logo'&&logo?canvas.width*c.size*2:Math.min(canvas.width,Math.max(canvas.width*.12,ctx.measureText(c.text).width));const stepX=Math.max(canvas.width*.16,markWidth*c.gap),stepY=Math.max(canvas.height*.12,canvas.width*c.size*2*c.gap);for(let y=-stepY;y<canvas.height+stepY;y+=stepY)for(let x=-stepX;x<canvas.width+stepX;x+=stepX)drawMark(x+(Math.round(y/stepY)%2?stepX*.5:0),y,c)}
 else drawMark(c.x*canvas.width,c.y*canvas.height,c)
}
function tick(){if(kind==='video'&&media&&!media.paused)draw();requestAnimationFrame(tick)}requestAnimationFrame(tick);
function readyMedia(element,event){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{clean();reject(Error('This file could not be decoded by the browser.'))},15000);const ok=()=>{clean();resolve()},bad=()=>{clean();reject(Error('Unsupported or damaged media.'))};function clean(){clearTimeout(timer);element.removeEventListener(event,ok);element.removeEventListener('error',bad)}element.addEventListener(event,ok,{once:true});element.addEventListener('error',bad,{once:true})})}
$('watermark-file').onchange=async e=>{
 const file=e.target.files[0];if(!file||exporting)return;
 try{
  if(file.size>500*1024*1024)throw Error('Choose a file smaller than 500 MB.');
  if(!/^(image|video)\//.test(file.type))throw Error('Choose a browser-supported image or video.');
  media?.pause?.();if(media)releaseVideo(media);if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=URL.createObjectURL(file);kind=file.type.startsWith('video/')?'video':'image';
  media=kind==='video'?document.createElement('video'):new Image();if(kind==='video'){media.playsInline=true;media.preload='auto';media.onended=()=>{$('watermark-play').textContent='▶ Play';draw()}}
  const ready=readyMedia(media,kind==='video'?'loadeddata':'load');media.src=sourceURL;await ready;
  sourceWidth=kind==='video'?media.videoWidth:media.naturalWidth;sourceHeight=kind==='video'?media.videoHeight:media.naturalHeight;
  if(kind==='image'&&Math.max(sourceWidth,sourceHeight)>8192)throw Error('Resize this image below 8,192 pixels per edge before adding a watermark.');
  $('watermark-workspace').hidden=false;$('watermark-play').hidden=kind!=='video';$('watermark-resolution-field').hidden=kind!=='video';$('watermark-format-field').hidden=kind==='video';
  sizeCanvas();draw();$('watermark-export').disabled=false;status(file.name+' is ready. Your source file is not modified.');
 }catch(err){media?.pause?.();if(media)releaseVideo(media);media=null;$('watermark-export').disabled=true;status(err.message,true)}
};
$('watermark-logo').onchange=async e=>{const file=e.target.files[0];if(!file||exporting)return;try{if(!file.type.startsWith('image/')||file.size>20*1024*1024)throw Error('Choose a logo image below 20 MB.');if(logoURL)URL.revokeObjectURL(logoURL);logoURL=URL.createObjectURL(file);const image=new Image(),ready=readyMedia(image,'load');image.src=logoURL;await ready;logo=image;$('watermark-mode').value='logo';draw();status('Logo added. Use a transparent PNG or WebP for a clean overlay.')}catch(err){status(err.message,true)}};
document.querySelectorAll('[data-watermark-control]').forEach(el=>el.addEventListener('input',()=>{if(exporting)return;if(el.id==='watermark-resolution')sizeCanvas();draw()}));
$('watermark-play').onclick=async()=>{if(!media||kind!=='video'||exporting)return;if(media.paused){try{if(media.ended)media.currentTime=0;await media.play();$('watermark-play').textContent='Ⅱ Pause'}catch(err){status(err.message,true)}}else{media.pause();$('watermark-play').textContent='▶ Play'}};
canvas.onpointerdown=e=>{if(!media||exporting||$('watermark-repeat').checked)return;dragging=true;canvas.setPointerCapture(e.pointerId);move(e)};
function move(e){if(!dragging)return;const r=canvas.getBoundingClientRect();$('watermark-x').value=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)).toFixed(1);$('watermark-y').value=Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100)).toFixed(1);draw()}
canvas.onpointermove=move;canvas.onpointerup=canvas.onpointercancel=()=>dragging=false;
function download(blob,extension){if(resultURL)URL.revokeObjectURL(resultURL);resultURL=URL.createObjectURL(blob);const a=document.createElement('a');a.href=resultURL;a.download='loox-watermarked.'+extension;a.className='suite-btn';a.textContent='Download '+extension.toUpperCase()+' · '+(blob.size/1048576).toFixed(2)+' MB';$('watermark-result').replaceChildren(a);a.click()}
function busy(value){exporting=value;document.querySelectorAll('[data-watermark-control],#watermark-file,#watermark-logo,#watermark-export,#watermark-play').forEach(el=>el.disabled=value);$('watermark-cancel').disabled=!value}
$('watermark-export').onclick=async()=>{
 if(!media||exporting)return;const c=config();if(c.mode==='logo'&&!logo)return status('Choose a logo image first.',true);if(c.mode==='text'&&!c.text.trim())return status('Enter watermark text first.',true);
 busy(true);abort=new AbortController();$('watermark-progress').value=0;
 try{
  draw();
  if(kind==='image'){const mime=$('watermark-format').value,blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,.92));if(!blob)throw Error('The image could not be encoded.');download(blob,mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'png')}
  else{status('Rendering the watermarked video. Keep this tab visible.');const recording=await recordVideo(canvas,media,{signal:abort.signal,onFrameReady:draw,onProgress:p=>{$('watermark-progress').value=p;status('Rendering video '+Math.round(p)+'%')}});if(abort.signal.aborted)throw new DOMException('Canceled','AbortError');status('Preparing MP4…');const mp4=await toMp4(recording,{signal:abort.signal,onProgress:p=>{$('watermark-progress').value=p;status('Encoding MP4 '+Math.round(p)+'%')}});if(abort.signal.aborted)throw new DOMException('Canceled','AbortError');download(mp4,'mp4')}
  $('watermark-progress').value=100;status('Export ready. Use the download link if the browser did not save automatically.');
 }catch(err){status(err.name==='AbortError'||abort.signal.aborted?'Export canceled.':err.message,true)}
 finally{media?.pause?.();busy(false);$('watermark-play').textContent='▶ Play';draw()}
};
$('watermark-cancel').onclick=()=>abort?.abort();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&exporting&&kind==='video')abort?.abort()});
window.addEventListener('looxpreferenceschange',()=>draw());
window.addEventListener('beforeunload',()=>{abort?.abort();[sourceURL,logoURL,resultURL].filter(Boolean).forEach(u=>URL.revokeObjectURL(u))});
