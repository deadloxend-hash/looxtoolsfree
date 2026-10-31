/* LOOX Video Studio — original browser timeline compositor */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas=$('preview'),ctx=canvas.getContext('2d',{alpha:false}),scrub=$('scrub');
if(!ctx){$('status').textContent='Canvas rendering is unavailable in this browser.';return}
const clips=[];let selected=null,playhead=0,playing=false,playStarted=0,exporting=false,recorder=null,exportStream=null,exportTimer=null;
let viewSeconds=30,nextId=1,aspect='16:9',bg='#090916',audioCtx=null,audioDest=null,audioNodes=new Map(),cropMode=false,cropDraft=null,cropRatio='free';
const history=[],future=[],urls=new Set(),maxHistory=30;
const themes={none:'none',vivid:'saturate(1.7) contrast(1.16)',warm:'sepia(.3) saturate(1.35)',cool:'hue-rotate(22deg) saturate(1.2)',mono:'grayscale(1)',vintage:'sepia(.6) contrast(.9)',dream:'saturate(1.2) blur(1.5px)'};
const icons={video:'▣',image:'▧',audio:'♫',text:'T'};
const esc=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=t=>{t=Math.max(0,Number(t)||0);return String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0')};
const status=s=>$('status').textContent=s;
const total=()=>clips.reduce((m,c)=>Math.max(m,c.start+c.duration),0);
const active=c=>playhead>=c.start&&playhead<c.start+c.duration;
const snap=()=>{history.push(clips.map(c=>({...c})));if(history.length>maxHistory)history.shift();future.length=0};
function restore(list){clips.splice(0,clips.length,...list.map(c=>({...c})));if(!clips.some(c=>c.id===selected))selected=null;pause();syncMedia();refresh()}
function undo(){if(!history.length)return;future.push(clips.map(c=>({...c})));restore(history.pop())}
function redo(){if(!future.length)return;history.push(clips.map(c=>({...c})));restore(future.pop())}
$('undo').onclick=undo;$('redo').onclick=redo;
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;if(/input|textarea|select/i.test(e.target.tagName))return;if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(e.key.toLowerCase()==='y'){e.preventDefault();redo()}});
function getSelected(){return clips.find(c=>c.id===selected)||null}
function pick(id){selected=id;showLayers();showProperties();renderTimeline()}
function createMedia(kind,url){if(kind==='image'){const img=new Image();img.src=url;return img}const m=document.createElement(kind==='audio'?'audio':'video');m.src=url;m.preload='auto';m.playsInline=true;m.loop=false;return m}
function waitMeta(el,kind){return new Promise((resolve,reject)=>{if(kind==='image'&&el.complete&&el.naturalWidth)return resolve();if(kind!=='image'&&el.readyState>=1&&Number.isFinite(el.duration))return resolve();const ok=()=>{clean();resolve()},bad=()=>{clean();reject(new Error('Unsupported or corrupted media'))};function clean(){el.removeEventListener(kind==='image'?'load':'loadedmetadata',ok);el.removeEventListener('error',bad)}el.addEventListener(kind==='image'?'load':'loadedmetadata',ok,{once:true});el.addEventListener('error',bad,{once:true})})}
const baseProps=(kind,name)=>({cropSource:{x:0,y:0,w:1,h:1},id:nextId++,kind,name,start:playhead,duration:5,trimStart:0,sourceDuration:5,layer:kind==='video'?0:kind==='audio'?1:kind==='image'?3:kind==='text'?5:6,x:.5,y:.5,w:kind==='video'?1:kind==='image'?.5:.65,h:kind==='video'?1:kind==='image'?.5:.3,scale:1,angle:0,opacity:1,volume:kind==='video'?1:kind==='audio'?1:0,zoom:1,panX:0,panY:0,rate:1,fit:'cover',filter:'none',fade:0,transition:'none',text:'Your title',font:'Arial',fontSize:64,color:'#ffffff',effect:'shadow'});
async function addFiles(files,mode){
 const arr=Array.from(files||[]);if(!arr.length)return;
 snap();let errors=0;status('Importing '+arr.length+' file(s)…');
 for(const file of arr){
  const kind=mode==='overlay'?'video':mode||(/video/.test(file.type)?'video':/audio/.test(file.type)?'audio':'image');
  const valid=kind==='video'?file.type.startsWith('video/'):kind==='audio'?file.type.startsWith('audio/'):file.type.startsWith('image/');
  if(!valid){errors++;continue}
  const url=URL.createObjectURL(file);urls.add(url);const media=createMedia(kind,url);
  try{await waitMeta(media,kind)}catch{errors++;URL.revokeObjectURL(url);urls.delete(url);continue}
  const c=baseProps(kind,file.name);c.media=media;c.url=url;c.sourceDuration=kind==='image'?5:Math.max(.1,Number(media.duration)||5);c.duration=kind==='image'?5:c.sourceDuration;
  if(kind==='video'&&mode!=='overlay'){c.start=clips.filter(t=>t.kind==='video'&&t.layer===0).reduce((m,t)=>Math.max(m,t.start+t.duration),0);c.x=.5;c.y=.5;c.w=1;c.h=1;c.volume=1}
  if(mode==='overlay'){c.layer=4;c.w=.46;c.h=.46;c.volume=0;c.start=playhead;c.fit='contain'}
  if(kind==='image'){c.layer=4;c.w=.46;c.h=.46;c.fit='contain'}
  if(kind==='audio'){c.layer=2;c.volume=1}
  clips.push(c);selected=c.id;
 }
 refresh();status(errors?'Imported with '+errors+' unsupported file(s) skipped.':'Media imported. Select or drag layers on the timeline.');
}
function addText(){snap();const c=baseProps('text','Text '+nextId);c.text='Your title';c.layer=7;clips.push(c);pick(c.id);refresh();status('Text added. Edit the title in Properties.')}
function setTab(mode){
 $('libraryTitle').textContent=({video:'Video clips',overlay:'Video overlays',image:'Images',audio:'Sound & music',text:'Titles & fonts',crop:'Crop layer',project:'Canvas settings'})[mode]||'Your media';
 $('libraryHelp').textContent=({video:'Add one or more main-track video clips, in sequence.',overlay:'Layer a second video over your first video; drag it around the preview.',image:'Add an image over video or build a photo slideshow.',audio:'Mix music or sound effects. Source audio formats depend on your browser.',text:'Create titles with font, color, shadow and outline effects.',crop:'Drag a crop box by its white handles, or type exact dimensions.',project:'Choose your aspect ratio, export resolution, background and frame rate.'})[mode];
 document.querySelectorAll('.studio-toolrail button').forEach(b=>b.classList.toggle('active',b.id==='tool'+mode[0].toUpperCase()+mode.slice(1)));
 if(mode==='video'||mode==='overlay'||mode==='image'||mode==='audio')$('file'+(mode==='overlay'?'Overlay':mode[0].toUpperCase()+mode.slice(1))).click();
 if(mode==='text')addText();
 if(mode==='crop')enterCrop();
 if(mode==='project'){selected=null;showProperties();}
}
['Video','Overlay','Image','Audio','Text','Crop','Project'].forEach(word=>{$('tool'+word).onclick=()=>setTab(word.toLowerCase())});
let uploadMode='video';
$('toolVideo').addEventListener('click',()=>uploadMode='video');$('toolOverlay').addEventListener('click',()=>uploadMode='overlay');$('toolImage').addEventListener('click',()=>uploadMode='image');$('toolAudio').addEventListener('click',()=>uploadMode='audio');
$('uploadButton').onclick=()=>{const m=uploadMode==='overlay'?'Overlay':uploadMode[0].toUpperCase()+uploadMode.slice(1);$('file'+m).click()};
for(const [input,mode] of [['fileVideo','video'],['fileOverlay','overlay'],['fileImage','image'],['fileAudio','audio']]){
 $(input).addEventListener('change',async e=>{await addFiles(e.target.files,mode);e.target.value=''})
}
$('addTitle').onclick=addText;
$('previewShell').addEventListener('dragover',e=>{e.preventDefault()});
$('previewShell').addEventListener('drop',async e=>{e.preventDefault();const files=Array.from(e.dataTransfer.files);if(files.length)await addFiles(files,null)});
function showLayers(){
 const list=$('layerList');list.innerHTML='';
 if(!clips.length){list.innerHTML='<p class="studio-section-note">No layers yet. Choose Video, Overlay, Image, Audio or Text above.</p>';return}
 clips.slice().sort((a,b)=>b.layer-a.layer||a.start-b.start).forEach(c=>{
  const b=document.createElement('button');b.type='button';b.className='studio-list-item';b.setAttribute('aria-pressed',String(selected===c.id));
  b.innerHTML='<span class="symbol">'+icons[c.kind]+'</span><span><strong>'+esc(c.name)+'</strong><small>'+esc(c.kind)+' · '+fmt(c.start)+' · '+fmt(c.duration)+'</small></span>';
  b.onclick=()=>pick(c.id);list.appendChild(b)
 })
}
function field(label,key,value,type='number',min='',max='',step='0.01'){
 const input=type==='select'?'<select data-prop="'+key+'">'+value+'</select>':type==='textarea'?'<textarea data-prop="'+key+'">'+esc(value)+'</textarea>':'<input data-prop="'+key+'" type="'+type+'" value="'+esc(value)+'" '+(min!==''?'min="'+min+'" ':'')+(max!==''?'max="'+max+'" ':'')+(step?'step="'+step+'"':'')+'>';
 return '<label class="studio-field"><span>'+label+'</span>'+input+'</label>'
}
const opts=(values,current)=>values.map(([v,label])=>'<option value="'+esc(v)+'" '+(String(v)===String(current)?'selected':'')+'>'+esc(label)+'</option>').join('');
function showProperties(){
 const el=$('properties'),c=getSelected();
 if(!c){el.innerHTML='<p class="studio-section-note">Choose a clip to edit, or use these project controls.</p><button class="studio-btn secondary" id="addTextInspector">+ New title layer</button>';el.querySelector('button').onclick=addText;return}
 let html='<strong style="overflow-wrap:anywhere">'+esc(c.name)+'</strong><p class="studio-section-note">Layer '+c.layer+' · '+esc(c.kind)+'</p>';
 html+='<div class="studio-field-grid">'+field('Start (s)','start',c.start,'number',0,36000,.1)+field('Length (s)','duration',c.duration,'number',.1,36000,.1)+'</div>';
 if(c.kind==='video'||c.kind==='audio')html+='<div class="studio-field-grid">'+field('Source in (s)','trimStart',c.trimStart,'number',0,c.sourceDuration,.1)+field('Volume %','volume',Math.round(c.volume*100),'range',0,200,1)+'</div>';
  html+=field('Playback speed','rate',opts([[.5,'0.5× Slow'],[.75,'0.75×'],[1,'1× Normal'],[1.25,'1.25×'],[1.5,'1.5×'],[2,'2× Fast']],c.rate),'select');
 if(c.kind!=='audio'){
  html+='<div class="studio-field-grid">'+field('Horizontal %','x',Math.round(c.x*100),'range',-50,150,1)+field('Vertical %','y',Math.round(c.y*100),'range',-50,150,1)+field('Width %','w',Math.round(c.w*100),'number',2,250,1)+field('Height %','h',Math.round(c.h*100),'number',2,250,1)+field('Rotation °','angle',c.angle,'number',-360,360,1)+field('Opacity %','opacity',Math.round(c.opacity*100),'range',0,100,1)+'</div>';
  html+=field('Layer order','layer',c.layer,'number',0,30,1);
  html+=field('Fade duration (s)','fade',c.fade,'number',0,10,.1);
 }
 if(c.kind==='video'||c.kind==='image'){
  html+=field('Transition','transition',opts([['none','None'],['fade','Fade in'],['slide-left','Slide from right'],['slide-right','Slide from left'],['zoom-in','Zoom in']],c.transition),'select');
  html+=field('Framing','fit',opts([['cover','Fill & crop'],['contain','Fit inside']],c.fit),'select');
  html+=field('Crop / zoom','zoom',c.zoom,'range',1,4,.05);
  html+='<div class="studio-field-grid">'+field('Crop pan X','panX',c.panX,'range',-100,100,1)+field('Crop pan Y','panY',c.panY,'range',-100,100,1)+'</div>';
  html+=field('Filter','filter',opts(Object.keys(themes).map(v=>[v,v[0].toUpperCase()+v.slice(1)]),c.filter),'select')
 }
 if(c.kind==='text'){
  html+=field('Title','text',c.text,'textarea');
  html+=field('Font','font',opts([['Arial','Modern Sans'],['Georgia','Editorial Serif'],['Impact','Bold Display'],['Verdana','Clean'],['Courier New','Typewriter'],['Trebuchet MS','Rounded Sans']],c.font),'select');
  html+='<div class="studio-field-grid">'+field('Size','fontSize',c.fontSize,'number',12,200,1)+field('Color','color',c.color,'color')+'</div>';
  html+=field('Text effect','effect',opts([['none','Clean'],['shadow','Shadow'],['outline','Outline'],['neon','Neon Glow']],c.effect),'select')
 }
 
 html+='<div class="studio-button-row"><button class="studio-btn secondary" id="duplicate">Duplicate</button><button class="studio-btn danger" id="remove">Delete</button></div>';
 el.innerHTML=html;
 el.querySelectorAll('[data-prop]').forEach(input=>{
  const prop=input.dataset.prop;
  if(input.type==='range')input.onpointerdown=()=>snap();
  const change=()=>{if(input.type!=='range')snap();let v=input.value;
   if(!['text','font','color','effect','fit','filter','transition'].includes(prop))v=Number(v);
   if(['x','y','w','h','opacity','volume'].includes(prop))v/=100;
   if(prop==='duration')v=clamp(v,.1,c.kind==='video'||c.kind==='audio'?Math.max(.1,c.sourceDuration-c.trimStart):36000);
   if(prop==='trimStart'){v=clamp(v,0,Math.max(0,c.sourceDuration-.1));c.duration=Math.min(c.duration,(c.sourceDuration-v)/c.rate)}
   if(prop==='rate')c.duration=Math.max(.1,(c.sourceDuration-c.trimStart)/v);
   if(prop==='start')v=clamp(v,0,36000);
   if(prop==='zoom')v=clamp(v,1,4);
   
   c[prop]=v;
   if(!playing)syncMedia();
   refresh(false);
  };
  input.addEventListener(input.type==='range'?'input':'change',change)
 });
 el.querySelector('#remove').onclick=removeSelected;
 el.querySelector('#duplicate').onclick=duplicate;
}
function removeSelected(){const c=getSelected();if(!c)return;snap();clips.splice(clips.indexOf(c),1);selected=null;pause();refresh();status('Layer removed.')}
$('deleteClip').onclick=removeSelected;
function duplicate(){const c=getSelected();if(!c)return;snap();const copy={...c,id:nextId++,start:c.start+c.duration/3,name:c.name+' copy',layer:c.layer+1};
 if(c.media&&c.url)copy.media=createMedia(c.kind,c.url);
 clips.push(copy);selected=copy.id;refresh()}
function split(){
 const c=getSelected();if(!c||!['video','audio'].includes(c.kind)){status('Select a video or audio clip before splitting.');return}
 const delta=playhead-c.start;if(delta<=.06||delta>=c.duration-.06){status('Move the playhead inside the selected clip.');return}
 snap();const right={...c,id:nextId++,name:c.name+' (part 2)',start:playhead,trimStart:c.trimStart+delta*(c.rate||1),duration:c.duration-delta,media:createMedia(c.kind,c.url)};
 c.duration=delta;clips.push(right);selected=right.id;pause();refresh();status('Clip split at '+fmt(playhead)+'.')
}
$('split').onclick=split;
function renderTimeline(){
 const length=total();viewSeconds=Math.max(viewSeconds,length+1,10);
 $('ruler').innerHTML=Array.from({length:7},(_,i)=>'<span>'+fmt(viewSeconds*i/6)+'</span>').join('');
 const root=$('tracks');root.innerHTML='';
 if(!clips.length)root.innerHTML='<p class="studio-section-note">Imported tracks, overlays, music and titles will appear here.</p>';
 clips.slice().sort((a,b)=>b.layer-a.layer||a.start-b.start).forEach(c=>{
  const row=document.createElement('div');row.className='studio-track';
  const label=document.createElement('div');label.className='studio-track-label';label.textContent=icons[c.kind]+' '+c.name;label.title=c.name;
  const line=document.createElement('div');line.className='studio-track-line';
  const bar=document.createElement('button');bar.type='button';bar.className='studio-clip '+c.kind+(c.id===selected?' active':'');
  bar.style.left=(c.start/viewSeconds*100)+'%';bar.style.width=(c.duration/viewSeconds*100)+'%';
  bar.title=c.name+' — drag to reposition';bar.textContent=icons[c.kind]+' '+c.name;
  let dragX=0,oldStart=0,dragging=false;
  bar.addEventListener('pointerdown',e=>{e.stopPropagation();if(e.button!==0)return;selected=c.id;showLayers();showProperties();bar.classList.add('active');dragX=e.clientX;oldStart=c.start;dragging=true;snap();bar.setPointerCapture(e.pointerId)});
  bar.addEventListener('pointermove',e=>{if(!dragging)return;c.start=clamp(oldStart+(e.clientX-dragX)/line.getBoundingClientRect().width*viewSeconds,0,36000);bar.style.left=(c.start/viewSeconds*100)+'%';$('time').textContent=fmt(playhead)+' / '+fmt(total())});
  bar.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;refresh()});
  line.appendChild(bar);
  line.addEventListener('click',e=>{if(e.target===line)seek(clamp((e.clientX-line.getBoundingClientRect().left)/line.clientWidth*viewSeconds,0,total()))});
  row.append(label,line);root.appendChild(row)
 });
 scrub.max=Math.max(.1,length);scrub.value=clamp(playhead,0,length)
}
function syncMedia(){
 for(const c of clips){if(!c.media||c.kind==='image')continue;
  const local=playhead-c.start,should=local>=0&&local<c.duration;
  const desired=clamp(c.trimStart+local*(c.rate||1),0,Math.max(0,c.sourceDuration-.05));
  c.media.playbackRate=c.rate||1;
  if(should&&c.media.readyState>=1&&Math.abs(c.media.currentTime-desired)>.24){try{c.media.currentTime=desired}catch{}}
  if(should&&playing){if(c.media.paused&&!c._starting){c._starting=true;const p=c.media.play();Promise.resolve(p).catch(()=>{}).finally(()=>c._starting=false)}}
  else if(!c.media.paused)c.media.pause();
  if(audioNodes.has(c.id))audioNodes.get(c.id).gain.gain.value=clamp(c.volume,0,2);
  else c.media.volume=clamp(c.volume,0,1);
 }
}
function pause(){playing=false;$('play').textContent='▶ Play';clips.forEach(c=>{if(c.media&&c.kind!=='image')c.media.pause()})}
function seek(t){playhead=clamp(t,0,total());if(playing)playStarted=performance.now()-playhead*1000;syncMedia();renderPreview();$('time').textContent=fmt(playhead)+' / '+fmt(total());scrub.value=playhead}
$('play').onclick=async()=>{if(exporting)return;if(playing){pause();return}if(!clips.length)return status('Add media or a text layer first.');if(playhead>=total()-.03)seek(0);playing=true;$('play').textContent='Ⅱ Pause';await enableAudio().catch(()=>{});playStarted=performance.now()-playhead*1000;syncMedia()};
$('toStart').onclick=()=>{pause();seek(0)};
$('toEnd').onclick=()=>{pause();seek(total())};
scrub.oninput=e=>{pause();seek(Number(e.target.value))};
$('timelineZoomIn').onclick=()=>{viewSeconds=Math.max(total()+1,10,viewSeconds/1.5);renderTimeline()};
$('timelineZoomOut').onclick=()=>{viewSeconds=Math.min(36000,viewSeconds*1.5);renderTimeline()};
function dimension(r,h){const [a,b]=r.split(':').map(Number);if(a>=b)return[Math.round(h*a/b/2)*2,Math.round(h/2)*2];return[Math.round(h/2)*2,Math.round(h*b/a/2)*2]}
function previewDims(){const [a,b]=aspect.split(':').map(Number);let w=960,h=Math.round(w*b/a);if(h>1000){h=1000;w=Math.round(h*a/b)}return[w,h]}
function refresh(full=true){
 if(full){showLayers();showProperties()}
 renderTimeline();$('empty').classList.toggle('studio-hidden',clips.length>0);$('canvasInfo').textContent=aspect+' · '+canvas.width+' × '+canvas.height+' preview';updateExportInfo()
}
function updateExportInfo(){const dims=dimension(aspect,Number($('resolution').value));$('exportInfo').textContent=dims.join(' × ')+' · WebM · '+$('fps').value+' fps · Real-time recording. Higher settings may be unsupported.'}
function drawMedia(c,w,h){
 const m=c.media;if(!m)return;
 const sw=c.kind==='image'?m.naturalWidth:m.videoWidth,sh=c.kind==='image'?m.naturalHeight:m.videoHeight;
 if(!(sw>0&&sh>0))return;
 const dw=w*c.w,dh=h*c.h;if(dw<=0||dh<=0)return;
 const fit=c.fit==='contain'?Math.min(dw/sw,dh/sh):Math.max(dw/sw,dh/sh);
 const scale=fit*c.zoom;
 ctx.save();ctx.beginPath();ctx.rect(-dw/2,-dh/2,dw,dh);ctx.clip();const offsetX=-Math.max(0,sw*scale-dw)*(c.panX||0)/200,offsetY=-Math.max(0,sh*scale-dh)*(c.panY||0)/200;ctx.drawImage(m,-sw*scale/2+offsetX,-sh*scale/2+offsetY,sw*scale,sh*scale);ctx.restore()
}
function drawText(c,w,h){
 const lines=String(c.text||'').split('\n').slice(0,8);
 const font=Math.max(12,Math.round(c.fontSize*w/960));ctx.font='900 '+font+'px '+JSON.stringify(c.font||'Arial');ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle=c.color;ctx.lineJoin='round';
 if(c.effect==='shadow'){ctx.shadowColor='#000c';ctx.shadowBlur=13;ctx.shadowOffsetY=7}
 else if(c.effect==='neon'){ctx.shadowColor=c.color;ctx.shadowBlur=26}
 if(c.effect==='outline'){ctx.lineWidth=Math.max(3,font/9);ctx.strokeStyle='#0a0820'}
 lines.forEach((line,i)=>{const y=(i-(lines.length-1)/2)*font*1.23;if(c.effect==='outline')ctx.strokeText(line,0,y,w*c.w);ctx.fillText(line,0,y,w*c.w)})
}
function renderPreview(){
 const w=canvas.width,h=canvas.height;
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 clips.filter(active).sort((a,b)=>a.layer-b.layer||a.id-b.id).forEach(c=>{
  if(c.kind==='audio')return;
  const local=playhead-c.start;let opacity=clamp(c.opacity,0,1);
  const transTime=Math.min(Math.max(.1,c.fade||.65),c.duration/2);
  const progress=clamp(local/transTime,0,1);
  if(c.fade>0)opacity*=Math.min(1,local/c.fade,(c.duration-local)/c.fade);
  if(c.transition==='fade'||c.transition==='slide-left'||c.transition==='slide-right'||c.transition==='zoom-in')opacity*=progress;
  if(opacity<=0)return;
  const offset=c.transition==='slide-left'?(1-progress)*w:c.transition==='slide-right'?-(1-progress)*w:0;
  const zoom=c.transition==='zoom-in'?.78+.22*progress:1;
  ctx.save();ctx.globalAlpha=opacity;ctx.translate(c.x*w+offset,c.y*h);ctx.rotate(c.angle*Math.PI/180);ctx.scale(c.scale*zoom,c.scale*zoom);
  ctx.filter=themes[c.filter]||'none';
  if(c.kind==='video'||c.kind==='image')drawMedia(c,w,h);
  else if(c.kind==='text')drawText(c,w,h);
  ctx.restore();
  if(!exporting&&selected===c.id){ctx.save();ctx.strokeStyle='#d1b5ff';ctx.lineWidth=Math.max(2,w/500);ctx.setLineDash([8,5]);const ww=w*c.w,hh=h*c.h;ctx.translate(c.x*w,c.y*h);ctx.rotate(c.angle*Math.PI/180);ctx.strokeRect(-ww/2,-hh/2,ww,hh);ctx.restore()}
 })
}
function tick(now){
 if(playing){const at=Math.min(total(),(now-playStarted)/1000);playhead=at;syncMedia();if(playhead>=total()-.01&&!exporting)pause()}
 renderPreview();
 $('time').textContent=fmt(playhead)+' / '+fmt(total());
 scrub.value=clamp(playhead,0,Math.max(.1,total()));
 requestAnimationFrame(tick)
}
requestAnimationFrame(tick);
let drag=null;
canvas.addEventListener('pointerdown',e=>{
 if(exporting)return;
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
 const hit=clips.filter(c=>active(c)&&c.kind!=='audio').sort((a,b)=>b.layer-a.layer).find(c=>Math.abs(x-c.x)<c.w/2&&Math.abs(y-c.y)<c.h/2);
 if(!hit)return;pick(hit.id);snap();drag={id:hit.id,x,y,origX:hit.x,origY:hit.y};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const c=clips.find(c=>c.id===drag.id);if(!c)return;const r=canvas.getBoundingClientRect();c.x=clamp(drag.origX+(e.clientX-r.left)/r.width-drag.x,-.5,1.5);c.y=clamp(drag.origY+(e.clientY-r.top)/r.height-drag.y,-.5,1.5)});
canvas.addEventListener('pointerup',()=>{if(drag){drag=null;showProperties()}});
function getRatio(){aspect=$('aspect').value;const [w,h]=previewDims();canvas.width=w;canvas.height=h;$('canvasInfo').textContent=aspect+' · '+w+' × '+h+' preview';updateExportInfo()}
$('aspect').onchange=getRatio;$('background').oninput=e=>bg=e.target.value;$('resolution').onchange=updateExportInfo;$('fps').onchange=updateExportInfo;getRatio();
async function enableAudio(){
 if(!window.AudioContext)return;
 if(!audioCtx){audioCtx=new AudioContext();audioDest=audioCtx.createMediaStreamDestination()}
 await audioCtx.resume();
 for(const c of clips){
  if(!c.media||c.kind==='image'||audioNodes.has(c.id))continue;
  try{const source=audioCtx.createMediaElementSource(c.media),gain=audioCtx.createGain();gain.gain.value=clamp(c.volume,0,2);source.connect(gain);gain.connect(audioCtx.destination);gain.connect(audioDest);audioNodes.set(c.id,{source,gain})}catch{}
 }
}
function stopExport(canceled=false){
 if(exportTimer){clearInterval(exportTimer);exportTimer=null}
 if(recorder&&recorder.state!=='inactive')try{recorder.stop()}catch{}
 if(canceled){status('Export canceled.');$('exportInfo').textContent='Export canceled.'}
}
$('cancelExport').onclick=()=>stopExport(true);
const selectMime=()=>['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm;codecs=vp8','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m));
async function exportVideo(){
 if(exporting||!clips.length)return status('Add at least one layer before exporting.');
 if(!canvas.captureStream||!window.MediaRecorder)return status('This browser does not support canvas video recording. Try recent Chrome or Edge.');
 const mime=selectMime();if(!mime)return status('WebM export codec unavailable in this browser.');
 const seconds=total();if(seconds<=.1)return status('Timeline is too short.');
 const [w,h]=dimension(aspect,Number($('resolution').value));const fps=Number($('fps').value);
 if(w*h>8300000&&!confirm('4K projects can be very demanding and may fail on this device. Try 720p first. Continue?'))return;
 pause();seek(0);const original=[canvas.width,canvas.height];canvas.width=w;canvas.height=h;exporting=true;
 $('export').disabled=true;$('exportTop').disabled=true;$('cancelExport').disabled=false;
 try{
  await enableAudio().catch(()=>{});
  syncMedia();await new Promise(resolve=>setTimeout(resolve,150));
  renderPreview();exportStream=canvas.captureStream(fps);
  if(audioDest)audioDest.stream.getAudioTracks().forEach(track=>exportStream.addTrack(track));
  const bitrate=clamp(w*h*fps*.075,1000000,30000000);
  const chunks=[];recorder=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:bitrate});
  let canceled=false;
  const oldCancel=$('cancelExport').onclick;
  $('cancelExport').onclick=()=>{canceled=true;stopExport(true)};
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  recorder.onerror=()=>status('Video recorder error. Try a smaller resolution or file.');
  recorder.onstop=()=>{
   exporting=false;pause();canvas.width=original[0];canvas.height=original[1];
   if(exportStream){exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null}
   $('export').disabled=false;$('exportTop').disabled=false;$('cancelExport').disabled=true;$('cancelExport').onclick=oldCancel;
   if(!canceled&&chunks.length){const file=new Blob(chunks,{type:mime});const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='loox-video-'+w+'x'+h+'.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),120000);status('Export complete! Saved '+(file.size/1048576).toFixed(1)+' MB WebM.')}
   else if(!canceled)status('No recorded data. Try a lower resolution or a different browser.');
   getRatio();seek(0)
  };
  recorder.start(1000);playing=true;playStarted=performance.now();$('play').textContent='Ⅱ Exporting';syncMedia();
  status('Recording '+w+' × '+h+' at '+fps+' fps. Keep this tab active.');
  exportTimer=setInterval(()=>{const percent=Math.min(100,Math.round(playhead/seconds*100));$('exportInfo').textContent='Exporting '+percent+'% · '+fmt(playhead)+' / '+fmt(seconds)+' (real-time)';if(playhead>=seconds-.03)stopExport()},100)
 }catch(error){
  exporting=false;pause();canvas.width=original[0];canvas.height=original[1];
  if(exportStream){exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null}
  $('export').disabled=false;$('exportTop').disabled=false;$('cancelExport').disabled=true;
  status('Export failed: '+(error&&error.message||'Unsupported device settings')+'. Try 720p at 30 fps.')
 }
}
$('export').onclick=exportVideo;
$('exportTop').onclick=()=>{if(!$('exportDialog').open)$('exportDialog').showModal()};
$('closeExport').onclick=()=>{$('exportDialog').close()};
window.addEventListener('beforeunload',()=>{pause();urls.forEach(u=>URL.revokeObjectURL(u));if(audioCtx)audioCtx.close().catch(()=>{})});
showLayers();showProperties();renderTimeline();status('Ready. Import a video, add an overlay or build a title sequence.');
})();
