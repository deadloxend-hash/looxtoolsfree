/* LOOX Video Studio — original browser timeline compositor */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas=$('preview'),ctx=canvas.getContext('2d',{alpha:false}),scrub=$('scrub');
if(!ctx){$('status').textContent='Canvas rendering is unavailable in this browser.';return}
const clips=[];let selected=null,playhead=0,playing=false,playStarted=0,exporting=false,recorder=null,exportStream=null,exportTimer=null;
let viewSeconds=30,nextId=1,aspect='16:9',bg='#171827',audioCtx=null,audioDest=null,audioNodes=new Map(),cropMode=false,cropDraft=null,cropRatio='free';
const history=[],future=[],urls=new Set(),maxHistory=30;
const mediaLibrary=[],trackStates=new Map();
const tracks=[{id:0,name:'Video 1',kind:'video'},{id:4,name:'Video 2',kind:'video'},{id:7,name:'Titles',kind:'video'},{id:2,name:'Audio 1',kind:'audio'},{id:3,name:'Audio 2',kind:'audio'}];
let pixelsPerSecond=50,inspectorTab='basic',ffmpegJob=null,exportCanceled=false;
const trackState=id=>{if(!trackStates.has(id))trackStates.set(id,{locked:false,hidden:false,solo:false});return trackStates.get(id)};
const audible=c=>!trackState(c.layer).hidden&&(!tracks.some(t=>trackState(t.id).solo)||trackState(c.layer).solo);
const editable=()=>{const c=getSelected();if(exporting)return false;if(c&&trackState(c.layer).locked){status('Unlock this track to edit its clips.');return false}return true};
const tc=t=>{const fps=Number($('fps').value)||30,n=Math.floor(Math.max(0,t)*fps+1e-5);return [Math.floor(n/fps/3600),Math.floor(n/fps/60)%60,Math.floor(n/fps)%60,n%fps].map(v=>String(v).padStart(2,'0')).join(':')};
const themes={none:'none',vivid:'saturate(1.7) contrast(1.16)',warm:'sepia(.3) saturate(1.35)',cool:'hue-rotate(22deg) saturate(1.2)',mono:'grayscale(1)',vintage:'sepia(.6) contrast(.9)',dream:'saturate(1.2) blur(1.5px)'};
const icons={video:'▣',image:'▧',audio:'♫',text:'T'};
const esc=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=t=>{t=Math.max(0,Number(t)||0);return String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0')};
const status=s=>$('status').textContent=s;
const total=()=>clips.reduce((m,c)=>Math.max(m,c.start+c.duration),0);
const active=c=>playhead>=c.start&&playhead<c.start+c.duration;
const snap=()=>{history.push(clips.map(c=>({...c})));if(history.length>maxHistory)history.shift();future.length=0};
function restore(list){pause();clips.splice(0,clips.length,...list.map(c=>({...c})));if(!clips.some(c=>c.id===selected))selected=null;syncMedia();refresh()}
function undo(){if(exporting||!history.length)return;future.push(clips.map(c=>({...c})));restore(history.pop())}
function redo(){if(exporting||!future.length)return;history.push(clips.map(c=>({...c})));restore(future.pop())}
$('undo').onclick=undo;$('redo').onclick=redo;
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;if(/input|textarea|select/i.test(e.target.tagName))return;if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(e.key.toLowerCase()==='y'){e.preventDefault();redo()}});
function getSelected(){return clips.find(c=>c.id===selected)||null}
function pick(id){if(cropMode&&selected!==id){cropMode=false;cropDraft=null}selected=id;showLayers();showProperties();renderTimeline()}
function createMedia(kind,url){if(kind==='image'){const img=new Image();img.src=url;return img}const m=document.createElement(kind==='audio'?'audio':'video');m.src=url;m.preload='auto';m.playsInline=true;m.loop=false;return m}
function waitMeta(el,kind){return new Promise((resolve,reject)=>{if(kind==='image'&&el.complete&&el.naturalWidth)return resolve();if(kind!=='image'&&el.readyState>=1&&Number.isFinite(el.duration))return resolve();const ok=()=>{clean();resolve()},bad=()=>{clean();reject(new Error('Unsupported or corrupted media'))};function clean(){el.removeEventListener(kind==='image'?'load':'loadedmetadata',ok);el.removeEventListener('error',bad)}el.addEventListener(kind==='image'?'load':'loadedmetadata',ok,{once:true});el.addEventListener('error',bad,{once:true})})}
const baseProps=(kind,name)=>({cropSource:{x:0,y:0,w:1,h:1},id:nextId++,kind,name,start:playhead,duration:5,trimStart:0,sourceDuration:5,layer:kind==='video'?0:kind==='audio'?1:kind==='image'?3:kind==='text'?5:6,x:.5,y:.5,w:kind==='video'?1:kind==='image'?.5:.65,h:kind==='video'?1:kind==='image'?.5:.3,scale:1,angle:0,opacity:1,volume:kind==='video'?1:kind==='audio'?1:0,zoom:1,panX:0,panY:0,rate:1,fit:'cover',filter:'none',fade:0,transition:'none',text:'Your title',font:'Arial',fontSize:64,color:'#ffffff',effect:'shadow'});
async function addFiles(files,mode){
 if(exporting)return;
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
  clips.push(c);selected=c.id;mediaLibrary.push({...c});
 }
 refresh();status(errors?'Imported with '+errors+' unsupported file(s) skipped.':'Media imported. Select or drag layers on the timeline.');
}
function addText(){if(exporting)return;snap();const c=baseProps('text','Text '+nextId);c.text='Your title';c.layer=7;clips.push(c);pick(c.id);refresh();status('Text added. Edit the title in Properties.')}
let uploadMode='video';
function setTab(mode){
 if(exporting)return;
 $('assetChoices').innerHTML='';
 $('libraryTitle').textContent=({video:'Media · Video',overlay:'Media · Overlay video',image:'Media · Images',audio:'Media · Audio',text:'Text',crop:'Crop selected layer',project:'Canvas'})[mode]||'Media';
 $('libraryHelp').textContent=({video:'Import one or more main video clips. New main clips are placed after the previous clip.',overlay:'Import a video that should appear above another clip, then resize and move it in the preview.',image:'Import PNG, JPG, WebP or another browser-supported image as an overlay.',audio:'Import MP3, WAV, M4A or another audio format your browser can decode. Audio gets its own timeline track.',text:'Create a title, then type directly in Properties for a live preview.',crop:'Select a video or image first, then drag the crop handles in the preview.',project:'Project size, ratio and export settings are available from Export.'})[mode];
 document.querySelectorAll('.studio-toolrail button').forEach(b=>b.classList.toggle('active',b.id==='tool'+mode[0].toUpperCase()+mode.slice(1)));
 if(['video','overlay','image','audio'].includes(mode)){
  uploadMode=mode;
 $('uploadButton').textContent=({video:'+ Import media',overlay:'+ Import overlay',image:'+ Import image',audio:'+ Import audio'})[mode];
 }
 if(mode==='text')addText();
 if(mode==='crop')enterCrop();
 if(mode==='project'){selected=null;showProperties();$('exportDialog').showModal();}
}
['Video','Overlay','Image','Audio','Text','Crop','Project'].forEach(word=>{$('tool'+word).onclick=()=>setTab(word.toLowerCase())});
$('fileVideo').accept='video/*,audio/*,image/*';
$('uploadButton').onclick=()=>{if(exporting)return;const m=uploadMode==='overlay'?'Overlay':uploadMode[0].toUpperCase()+uploadMode.slice(1);$('file'+m).click()};
for(const [input,mode] of [['fileVideo','video'],['fileOverlay','overlay'],['fileImage','image'],['fileAudio','audio']]){
 $(input).addEventListener('change',async e=>{await addFiles(e.target.files,mode==='video'?null:mode);e.target.value=''})
}
$('addTitle').onclick=addText;
document.addEventListener('paste',async e=>{const files=Array.from(e.clipboardData?.files||[]);if(files.length){e.preventDefault();await addFiles(files,null);status('Pasted '+files.length+' media file(s) into the project.')}});
$('previewShell').addEventListener('dragover',e=>{e.preventDefault()});
$('previewShell').addEventListener('drop',async e=>{e.preventDefault();const files=Array.from(e.dataTransfer.files);if(files.length)await addFiles(files,null)});
function showLayers(){
 showMediaBin();
 const list=$('layerList');list.innerHTML='';
 if(!clips.length){list.innerHTML='<p class="studio-section-note">No layers yet. Choose Video, Overlay, Image, Audio or Text above.</p>';return}
 clips.slice().sort((a,b)=>b.layer-a.layer||a.start-b.start).forEach(c=>{
  const b=document.createElement('button');b.type='button';b.className='studio-list-item';b.setAttribute('aria-pressed',String(selected===c.id));
  b.innerHTML='<span class="symbol">'+icons[c.kind]+'</span><span><strong>'+esc(c.name)+'</strong><small>'+esc(c.kind)+' · '+fmt(c.start)+' · '+fmt(c.duration)+'</small></span>';
  b.onclick=()=>pick(c.id);list.appendChild(b)
 })
}
function showMediaBin(){
 const root=$('mediaBin');root.innerHTML='';
 mediaLibrary.forEach(asset=>{const b=document.createElement('button');b.className='studio-list-item';b.textContent=icons[asset.kind]+' '+asset.name;b.title='Add to timeline at playhead';b.onclick=()=>{if(exporting)return;snap();const c={...asset,id:nextId++,start:playhead,media:createMedia(asset.kind,asset.url)};clips.push(c);selected=c.id;refresh()};root.append(b)})
}
function volumeAt(c,t){const keys=c.keys||[];if(!keys.length)return 1;const sorted=keys.slice().sort((a,b)=>a.t-b.t);if(t<=sorted[0].t)return sorted[0].v;for(let i=1;i<sorted.length;i++)if(t<=sorted[i].t){const a=sorted[i-1],b=sorted[i];return a.v+(b.v-a.v)*(t-a.t)/(b.t-a.t)}return sorted.at(-1).v}
function extendInspector(c,el){
 const audioKeys=['volume','eq','noiseCut','keyVolume'],colorKeys=['filter','transition','fade','brightness','contrast','saturation','temperature','blur','visualEffect'];
 const extras=document.createElement('div');
 extras.innerHTML=field('Scale','scale',c.scale,'range',.05,4,.01)+field('Move to track','layer',opts(tracks.filter(t=>(c.kind==='audio')===(t.kind==='audio')).map(t=>[t.id,t.name]),c.layer),'select');
 if(c.kind==='video'||c.kind==='audio')extras.innerHTML+=field('EQ preset','eq',opts([['flat','Flat'],['bass','Bass boost'],['vocal','Vocal clarity'],['treble','Treble reduction']],c.eq||'flat'),'select')+field('Hum reduction','noiseCut',opts([[0,'Off'],[1,'High-pass · 120 Hz']],c.noiseCut?1:0),'select')+field('Keyframe gain %','keyVolume',Math.round(volumeAt(c,playhead-c.start)*100),'range',0,200,1)+'<div class="key-controls"><button class="studio-btn secondary" id="setVolumeKey">◆ Set volume keyframe</button><button class="studio-btn secondary" id="clearVolumeKeys">Clear keyframes</button><p class="studio-section-note">Keyframes interpolate over time. Hum reduction filters low frequencies; AI denoising is not installed.</p></div>';
 if(c.kind!=='audio')extras.innerHTML+=field('Brightness','brightness',c.brightness??1,'range',.2,2,.01)+field('Contrast','contrast',c.contrast??1,'range',.2,2,.01)+field('Saturation','saturation',c.saturation??1,'range',0,3,.01)+field('Temperature','temperature',c.temperature||0,'range',-50,50,1)+field('Blur','blur',c.blur||0,'range',0,20,.5)+'<div class="color-controls"><button class="studio-btn secondary" id="resetEffects">Reset color & effects</button></div>';
 el.append(extras);
 extras.querySelectorAll('[data-prop]').forEach(input=>{const key=input.dataset.prop;input.onpointerdown=()=>{if(editable())snap()};input.onchange=input.oninput=()=>{if(!editable())return;if(key!=='keyVolume')c[key]=['eq'].includes(key)?input.value:Number(input.value);syncMedia();renderPreview()}});
 if(el.querySelector('#setVolumeKey')){el.querySelector('#setVolumeKey').onclick=()=>{if(!editable())return;snap();const t=clamp(playhead-c.start,0,c.duration),v=Number(el.querySelector('[data-prop=keyVolume]').value)/100;c.keys=(c.keys||[]).filter(k=>Math.abs(k.t-t)>.02);c.keys.push({t,v});c.keys.sort((a,b)=>a.t-b.t);refresh()};el.querySelector('#clearVolumeKeys').onclick=()=>{if(!editable())return;snap();c.keys=[];refresh()}}
 if(el.querySelector('#resetEffects'))el.querySelector('#resetEffects').onclick=()=>{if(!editable())return;snap();Object.assign(c,{filter:'none',transition:'none',blur:0,brightness:1,contrast:1,saturation:1,temperature:0});refresh()};
 el.querySelectorAll('.studio-field').forEach(label=>{const prop=label.querySelector('[data-prop]')?.dataset.prop;label.hidden=(audioKeys.includes(prop)?'audio':colorKeys.includes(prop)?'color':'basic')!==inspectorTab});
 el.querySelectorAll('.key-controls').forEach(x=>x.hidden=inspectorTab!=='audio');
 el.querySelectorAll('.color-controls').forEach(x=>x.hidden=inspectorTab!=='color');
 if(trackState(c.layer).locked)el.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);
}
$('inspectorTabs').onclick=e=>{if(!e.target.dataset.inspector)return;inspectorTab=e.target.dataset.inspector;document.querySelectorAll('[data-inspector]').forEach(b=>b.classList.toggle('active',b===e.target));showProperties()};
function assetPanel(mode){
 if(exporting)return;$('libraryTitle').textContent=mode[0].toUpperCase()+mode.slice(1);$('libraryHelp').textContent=mode==='stickers'?'Click to add an animated title overlay.':'Select a visual clip, then choose a preset. Transition presets animate the start of the selected clip.';const root=$('assetChoices');root.innerHTML='';
 const choices=mode==='transitions'?[['fade','Fade'],['slide-left','Wipe right'],['slide-right','Wipe left'],['zoom-in','Zoom']]:mode==='filters'?[['none','Original'],['vivid','Vivid'],['warm','Cinematic warm'],['cool','Cool'],['mono','B&W'],['vintage','Retro']]:mode==='stickers'?[['⭐','Star'],['❤️','Heart'],['🔥','Fire'],['🎉','Celebrate'],['➡️','Arrow'],['✨','Sparkles']]:[['dream','Soft blur'],['neon','Neon title'],['vintage','VHS tone'],['none','Clear']];
 choices.forEach(([value,label])=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(exporting)return;if(mode==='stickers'){addText();const c=getSelected();c.text=value;c.name=label+' sticker';c.fontSize=110;c.w=.3;c.h=.3;c.transition='zoom-in';c.fade=.3;refresh();return}const c=getSelected();if(!c||c.kind==='audio')return status('Select a video, image or title on the timeline first.');if(!editable())return;snap();if(mode==='transitions')c.transition=value;else if(value==='neon'){if(c.kind!=='text')return status('Neon glow applies to a title layer.');c.effect='neon'}else c.filter=value;refresh();status(label+' applied to '+c.name)};root.append(b)});
 document.querySelectorAll('.studio-toolrail button').forEach(b=>b.classList.toggle('active',b.id.toLowerCase()==='tool'+mode))
}
['Transitions','Filters','Stickers','Effects'].forEach(m=>$('tool'+m).onclick=()=>assetPanel(m.toLowerCase()));
function stepFrame(d){if(exporting)return;pause();seek(playhead+d/Number($('fps').value))}
$('frameBack').onclick=()=>stepFrame(-1);$('frameNext').onclick=()=>stepFrame(1);
$('previewQuality').onchange=getRatio;
$('previewAspect').onchange=e=>{if(exporting)return;$('aspect').value=e.target.value;getRatio()};
document.addEventListener('keydown',e=>{if(/input|textarea|select/i.test(e.target.tagName)||e.ctrlKey||e.metaKey||exporting)return;if(e.code==='Space'){e.preventDefault();$('play').click()}if(e.key.toLowerCase()==='k')stepFrame(-1);if(e.key.toLowerCase()==='m')stepFrame(1);if(e.key==='Delete')removeSelected()});
for(const [id,kind] of [['addVideoTrack','video'],['addAudioTrack','audio']])$(id).onclick=()=>{if(exporting)return;const n=Math.max(8,...tracks.map(t=>t.id))+1;tracks.push({id:n,kind,name:(kind==='video'?'Video ':'Audio ')+(tracks.filter(t=>t.kind===kind).length+1)});refresh()};
function field(label,key,value,type='number',min='',max='',step='0.01'){
 const input=type==='select'?'<select data-prop="'+key+'">'+value+'</select>':type==='textarea'?'<textarea data-prop="'+key+'">'+esc(value)+'</textarea>':'<input data-prop="'+key+'" type="'+type+'" value="'+esc(value)+'" '+(min!==''?'min="'+min+'" ':'')+(max!==''?'max="'+max+'" ':'')+(step?'step="'+step+'"':'')+'>';
 return '<label class="studio-field"><span>'+label+(type==='range'?'<output class="studio-live-value">'+esc(value)+(['opacity','volume'].includes(key)?'%':'')+'</output>':'')+'</span>'+input+'</label>'
}
const opts=(values,current)=>values.map(([v,label])=>'<option value="'+esc(v)+'" '+(String(v)===String(current)?'selected':'')+'>'+esc(label)+'</option>').join('');
function cropClipBox(c){return {x:c.x-c.w/2,y:c.y-c.h/2,w:c.w,h:c.h}}
function cropAbsolute(c){const b=cropClipBox(c);return {x:b.x+b.w*cropDraft.x,y:b.y+b.h*cropDraft.y,w:b.w*cropDraft.w,h:b.h*cropDraft.h}}
function cropPixels(c){const m=c.media,src=c.cropSource||{x:0,y:0,w:1,h:1};return {w:Math.max(1,(c.kind==='image'?m?.naturalWidth:m?.videoWidth||960)*src.w),h:Math.max(1,(c.kind==='image'?m?.naturalHeight:m?.videoHeight||540)*src.h)}}
function cropAspectValue(){if(cropRatio==='free')return 0;const [a,b]=cropRatio.split(':').map(Number);return a/b}
function fitVideoCropRatio(changed=''){
 const c=getSelected(),ratio=cropAspectValue();if(!c||!ratio||!cropDraft)return;
 const b=cropClipBox(c),factor=ratio*canvas.height*b.h/(canvas.width*b.w);
 const cx=cropDraft.x+cropDraft.w/2,cy=cropDraft.y+cropDraft.h/2;
 let w=cropDraft.w,h=cropDraft.h;
 if(changed==='w')h=w/factor;
 else if(changed==='h')w=h*factor;
 else if(w/h>factor)w=h*factor;
 else h=w/factor;
 if(w>1){w=1;h=w/factor}if(h>1){h=1;w=h*factor}
 cropDraft={x:clamp(cx-w/2,0,1-w),y:clamp(cy-h/2,0,1-h),w,h}
}
function syncVideoCropFields(except=null){
 if(!cropMode||!cropDraft)return;
 const c=getSelected();if(!c)return;
 const dims=cropPixels(c),inspector=$('properties');
 const px={cropX:Math.round(cropDraft.x*dims.w),cropY:Math.round(cropDraft.y*dims.h),
 cropW:Math.round(cropDraft.w*dims.w),cropH:Math.round(cropDraft.h*dims.h)};
 Object.entries(px).forEach(([key,v])=>{const el=inspector.querySelector('[data-prop='+key+']');if(el&&el!==except)el.value=v});
 const label=inspector.querySelector('#cropReadout');if(label)label.textContent='Selected source: '+Math.max(1,px.cropW)+' × '+Math.max(1,px.cropH)+' px • layer crop';
}
function enterCrop(){
 if(!editable())return;
 const c=getSelected();
 if(!c||!['video','image'].includes(c.kind)){status('Select a video or image clip before using Crop.');return}
 pause();seek(Math.min(c.start+c.duration-.04,Math.max(c.start+.04,playhead)));
 cropMode=true;cropRatio='free';cropDraft={x:.03,y:.03,w:.94,h:.94};
 showProperties();status('Crop mode: drag the white handles to resize, or type exact pixel dimensions.');
}
function exitCrop(){cropMode=false;cropDraft=null;canvas.style.cursor='default';showProperties()}
function showVideoCropInspector(c,el){
 const dims=cropPixels(c);const px={cropX:Math.round(cropDraft.x*dims.w),cropY:Math.round(cropDraft.y*dims.h),cropW:Math.round(cropDraft.w*dims.w),cropH:Math.round(cropDraft.h*dims.h)};
 el.innerHTML='<strong>Crop '+esc(c.name)+'</strong><p class="studio-crop-guide">Drag inside the crop to move it, or drag the corners and edges to resize. The preview shows the selected layer crop.</p>'+
 field('Crop aspect ratio','cropRatio',opts([['free','Free crop'],['1:1','1:1 Square'],['16:9','16:9 Landscape'],['9:16','9:16 Portrait'],['4:3','4:3 Classic'],['4:5','4:5 Portrait']],cropRatio),'select')+
 '<div class="studio-field-grid">'+field('X (px)','cropX',px.cropX,'number',0,dims.w,1)+field('Y (px)','cropY',px.cropY,'number',0,dims.h,1)+field('Width (px)','cropW',px.cropW,'number',8,dims.w,1)+field('Height (px)','cropH',px.cropH,'number',8,dims.h,1)+'</div>'+
 '<p class="studio-section-note" id="cropReadout"></p><div class="studio-button-row"><button class="studio-btn" id="applyVideoCrop">✓ Apply crop</button><button class="studio-btn secondary" id="cancelVideoCrop">Cancel</button><button class="studio-btn ghost" id="resetVideoCrop">Reset</button></div>';
 el.querySelector('[data-prop=cropRatio]').onchange=e=>{cropRatio=e.target.value;fitVideoCropRatio();syncVideoCropFields()};
 ['cropX','cropY','cropW','cropH'].forEach(key=>{
  const input=el.querySelector('[data-prop='+key+']');
  input.oninput=()=>{
   const value=Number(input.value),prop=key.slice(-1).toLowerCase();
   if(!Number.isFinite(value))return;
   const unit=(prop==='x'||prop==='w'?dims.w:dims.h);
   cropDraft[prop]=clamp(value/unit,prop==='w'||prop==='h'?.01:0,1);
   cropDraft.w=clamp(cropDraft.w,.01,1-cropDraft.x);cropDraft.h=clamp(cropDraft.h,.01,1-cropDraft.y);
   cropDraft.x=clamp(cropDraft.x,0,1-cropDraft.w);cropDraft.y=clamp(cropDraft.y,0,1-cropDraft.h);
   if(cropRatio!=='free'&&(prop==='w'||prop==='h'))fitVideoCropRatio(prop);
   syncVideoCropFields(input)
  }
 });
 el.querySelector('#applyVideoCrop').onclick=applyVideoCrop;
 el.querySelector('#cancelVideoCrop').onclick=exitCrop;
 el.querySelector('#resetVideoCrop').onclick=()=>{cropDraft={x:.03,y:.03,w:.94,h:.94};fitVideoCropRatio();syncVideoCropFields()};
 syncVideoCropFields();
}
function applyVideoCrop(){
 const c=getSelected();if(!c||!cropDraft)return;
 snap();
 const old={x:c.x,y:c.y,w:c.w,h:c.h};
 c.x=old.x-old.w/2+old.w*(cropDraft.x+cropDraft.w/2);
 c.y=old.y-old.h/2+old.h*(cropDraft.y+cropDraft.h/2);
 c.w=old.w*cropDraft.w;c.h=old.h*cropDraft.h;
 const oldSource=c.cropSource||{x:0,y:0,w:1,h:1};
 c.cropSource={x:oldSource.x+oldSource.w*cropDraft.x,y:oldSource.y+oldSource.h*cropDraft.y,
 w:oldSource.w*cropDraft.w,h:oldSource.h*cropDraft.h};
 c.fit='cover';c.zoom=1;c.panX=0;c.panY=0;
 cropMode=false;cropDraft=null;showProperties();renderPreview();
 status('Crop applied. The selected video/image is now trimmed visually; Undo restores the original.');
}
function showProperties(){
 const el=$('properties'),c=getSelected();
 if(cropMode&&c&&cropDraft){showVideoCropInspector(c,el);return}
 if(!c){el.innerHTML='<p class="studio-section-note">Choose a clip to edit, or use these project controls.</p><button class="studio-btn secondary" id="addTextInspector">+ New title layer</button>';el.querySelector('button').onclick=addText;return}
 let html='<strong style="overflow-wrap:anywhere">'+esc(c.name)+'</strong><p class="studio-section-note">Layer '+c.layer+' · '+esc(c.kind)+'</p>';
 html+='<div class="studio-field-grid">'+field('Start (s)','start',c.start,'number',0,36000,.1)+field('Length (s)','duration',c.duration,'number',.1,36000,.1)+'</div>';
 if(c.kind==='video'||c.kind==='audio'){
  html+='<div class="studio-field-grid">'+field('Source in (s)','trimStart',c.trimStart,'number',0,c.sourceDuration,.1)+field('Volume %','volume',Math.round(c.volume*100),'range',0,200,1)+'</div>';
  html+=field('Playback speed (0.1–16×)','rate',c.rate,'number',.1,16,.1);
 }
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
  html+=field('Filter','filter',opts(Object.keys(themes).map(v=>[v,v[0].toUpperCase()+v.slice(1)]),c.filter),'select');
  html+='<div class="studio-button-row"><button class="studio-btn secondary" type="button" id="cropLayer">⌗ Crop with mouse</button></div>'
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
  const prop=input.dataset.prop;let remembered=false;
  const mark=()=>{if(!remembered){snap();remembered=true}};
  input.addEventListener('focus',mark);
  input.addEventListener('pointerdown',mark);
  input.addEventListener('blur',()=>{remembered=false});
  const change=()=>{
   if(!editable())return;
   let v=input.value;
   if(!['text','font','color','effect','fit','filter','transition'].includes(prop))v=Number(v);
   if(['x','y','w','h','opacity','volume'].includes(prop))v/=100;
   if(prop==='duration')v=clamp(v,.1,c.kind==='video'||c.kind==='audio'?Math.max(.1,(c.sourceDuration-c.trimStart)/(c.rate||1)):36000);
   if(prop==='trimStart'){v=clamp(v,0,Math.max(0,c.sourceDuration-.1));c.duration=Math.min(c.duration,(c.sourceDuration-v)/(c.rate||1))}
   if(prop==='rate'){v=clamp(v,.1,16);c.duration=Math.max(.01,c.duration*(c.rate||1)/v)}
   if(prop==='start')v=clamp(v,0,36000);
   if(prop==='zoom')v=clamp(v,1,4);
   c[prop]=v;
   const output=input.closest('label')?.querySelector('.studio-live-value');
   if(output)output.textContent=input.value+(['opacity','volume'].includes(prop)?'%':'');
   if(['start','duration','trimStart','rate'].includes(prop))renderTimeline();
   if(['volume','rate','trimStart','start','duration'].includes(prop))syncMedia();
   renderPreview()
  };
  input.addEventListener(input.tagName==='SELECT'?'change':'input',change);
  if(input.type==='range'){
   input.addEventListener('wheel',e=>{
    e.preventDefault();mark();
    const step=Number(input.step)||1,delta=e.deltaY>0?-step:step;
    input.value=clamp(Number(input.value)+delta,Number(input.min),Number(input.max));
    input.dispatchEvent(new Event('input',{bubbles:true}))
   },{passive:false})
  }
 });
 el.querySelector('#remove').onclick=removeSelected;
 el.querySelector('#duplicate').onclick=duplicate;
 if(c.kind==='video'||c.kind==='image')el.querySelector('#cropLayer').onclick=enterCrop;
 extendInspector(c,el);
}
function removeSelected(){const c=getSelected();if(!c||!editable())return;snap();pause();if($('ripple').checked)clips.filter(x=>x.layer===c.layer&&x.start>=c.start+c.duration).forEach(x=>x.start-=c.duration);clips.splice(clips.indexOf(c),1);selected=null;refresh();status('Clip removed.')}
$('deleteClip').onclick=removeSelected;
function duplicate(){const c=getSelected();if(!c||!editable())return;snap();const copy={...c,id:nextId++,start:c.start+c.duration,name:c.name+' copy',cropSource:{...c.cropSource},keys:(c.keys||[]).map(k=>({...k}))};
 if(c.media&&c.url)copy.media=createMedia(c.kind,c.url);
 clips.push(copy);selected=copy.id;refresh()}
function split(){
 if(!editable())return;
 const c=getSelected();if(!c||!['video','audio'].includes(c.kind)){status('Select a video or audio clip before splitting.');return}
 const delta=playhead-c.start,frame=1/Number($('fps').value);if(delta<frame-.0001||delta>c.duration-frame+.0001){status('Leave at least one frame on each side of the cut.');return}
 snap();const right={...c,id:nextId++,name:c.name+' (part 2)',start:playhead,trimStart:c.trimStart+delta*(c.rate||1),duration:c.duration-delta,media:createMedia(c.kind,c.url)};
 if(c.keys?.length){const boundary=volumeAt(c,delta);right.keys=[{t:0,v:boundary},...c.keys.filter(k=>k.t>delta).map(k=>({t:k.t-delta,v:k.v}))];c.keys=[...c.keys.filter(k=>k.t<delta),{t:delta,v:boundary}]}
 c.duration=delta;clips.push(right);selected=right.id;pause();refresh();status('Clip split at '+tc(playhead)+'.')
}
$('split').onclick=split;
function renderTimeline(){
 const root=$('tracks'),scroll=root.scrollLeft,top=root.scrollTop,width=Math.max(root.clientWidth-150,(total()+5)*pixelsPerSecond,600);
 clips.forEach(c=>{if(!tracks.some(t=>t.id===c.layer))tracks.push({id:c.layer,name:'Layer '+c.layer,kind:c.kind==='audio'?'audio':'video'})});
 root.innerHTML='';root.style.setProperty('--timeline-width',(width+150)+'px');
 tracks.slice().sort((a,b)=>(a.kind==='audio')-(b.kind==='audio')||b.id-a.id).forEach(t=>{
  const state=trackState(t.id),row=document.createElement('div');row.className='studio-track';row.dataset.track=t.id;
  const label=document.createElement('div');label.className='studio-track-label';label.textContent=t.name;
  const buttons=document.createElement('div');buttons.className='track-buttons';
  for(const [key,text] of [['locked','Lock'],['hidden',t.kind==='audio'?'Mute':'Hide'],['solo','Solo']]){
   const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',text+' '+t.name);b.setAttribute('aria-pressed',state[key]);b.onclick=()=>{if(exporting)return;state[key]=!state[key];syncMedia();refresh()};buttons.append(b)
  }label.append(buttons);
  const line=document.createElement('div');line.className='studio-track-line';
  const ph=document.createElement('i');ph.className='timeline-playhead';ph.style.left=playhead*pixelsPerSecond+'px';line.append(ph);
  clips.filter(c=>c.layer===t.id).forEach(c=>{
   const bar=document.createElement('div');bar.tabIndex=0;bar.role='button';bar.className='studio-clip '+c.kind+(c.id===selected?' active':'');bar.setAttribute('aria-label',c.name+' timeline clip');
   bar.style.left=c.start*pixelsPerSecond+'px';bar.style.width=Math.max(10,c.duration*pixelsPerSecond)+'px';bar.innerHTML='<span class="clip-trim left" data-edge="left"></span><span>'+esc(c.name)+'</span><span class="clip-trim right" data-edge="right"></span>';
   if(c.kind==='audio'||c.kind==='video'){
    const points=[{t:0,v:1},...(c.keys||[]),{t:c.duration,v:1}].sort((a,b)=>a.t-b.t);
    bar.insertAdjacentHTML('beforeend','<svg class="volume-line" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline fill="none" stroke="#fdd68f" stroke-width="1" points="'+points.map(k=>(k.t/c.duration*100)+','+(38-k.v*17)).join(' ')+'"/></svg>')
   }
   let action=null;
   bar.onpointerdown=e=>{if(e.button!==0||exporting)return;e.stopPropagation();pause();selected=c.id;showLayers();showProperties();if(state.locked)return status('Track is locked.');snap();action={x:e.clientX,start:c.start,duration:c.duration,trim:c.trimStart,edge:e.target.dataset.edge};bar.setPointerCapture(e.pointerId)};
   bar.onpointermove=e=>{if(!action)return;const d=(e.clientX-action.x)/pixelsPerSecond,rate=c.rate||1;
    if(action.edge==='right')c.duration=clamp(action.duration+d,1/Number($('fps').value),c.media&&c.kind!=='image'?(c.sourceDuration-c.trimStart)/rate:36000);
    else if(action.edge==='left'){const delta=clamp(d,-Math.min(action.start,action.trim/rate),action.duration-.04);c.start=action.start+delta;c.trimStart=action.trim+delta*rate;c.duration=action.duration-delta}
    else {c.start=Math.max(0,action.start+d);if($('snapping').checked){const targets=[playhead,0,...clips.filter(x=>x.id!==c.id).flatMap(x=>[x.start,x.start+x.duration])];const target=targets.find(v=>Math.abs(v-c.start)<8/pixelsPerSecond);if(target!==undefined)c.start=target}}
    bar.style.left=c.start*pixelsPerSecond+'px';bar.style.width=Math.max(10,c.duration*pixelsPerSecond)+'px';syncMedia()
   };
   const end=e=>{if(!action)return;if($('ripple').checked&&action.edge==='right'){const delta=c.duration-action.duration;clips.filter(x=>x.id!==c.id&&x.layer===c.layer&&x.start>=action.start+action.duration-.001).forEach(x=>x.start=Math.max(0,x.start+delta))}if(!action.edge){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-track]');if(target){const dest=tracks.find(t=>t.id===Number(target.dataset.track));if(dest&&!trackState(dest.id).locked&&((c.kind==='audio')===(dest.kind==='audio')))c.layer=dest.id}}action=null;refresh()};
   bar.onpointerup=end;bar.onpointercancel=end;bar.onkeydown=e=>{if(e.key==='Enter')pick(c.id)};line.append(bar)
  });
  line.onclick=e=>{if(e.target===line&&!exporting){pause();seek((e.clientX-line.getBoundingClientRect().left)/pixelsPerSecond)}};
  row.append(label,line);root.append(row)
 });
 root.scrollLeft=scroll;root.scrollTop=top;drawRuler();scrub.max=Math.max(.1,total());scrub.value=clamp(playhead,0,total());
}
function drawRuler(){const ruler=$('ruler'),scroll=$('tracks').scrollLeft,step=pixelsPerSecond>120?1:pixelsPerSecond>30?5:10;ruler.innerHTML='';for(let t=Math.floor(scroll/pixelsPerSecond/step)*step;t<(scroll+ruler.clientWidth)/pixelsPerSecond+step;t+=step){const s=document.createElement('span');s.className='ruler-tick';s.style.left=(t*pixelsPerSecond-scroll)+'px';s.textContent=tc(t);ruler.append(s)}}
$('tracks').onscroll=drawRuler;
$('ruler').onclick=e=>{if(!exporting){pause();seek((e.clientX-$('ruler').getBoundingClientRect().left+$('tracks').scrollLeft)/pixelsPerSecond)}};
function syncMedia(){
 for(const c of clips){if(!c.media||c.kind==='image')continue;
  const local=playhead-c.start,should=local>=0&&local<c.duration;
  const desired=clamp(c.trimStart+local*(c.rate||1),0,Math.max(0,c.sourceDuration-.05));
  c.media.playbackRate=clamp(c.rate||1,.0625,16);
  if(should&&c.media.readyState>=1&&Math.abs(c.media.currentTime-desired)>(playing?.24:.001)){try{c.media.currentTime=desired}catch{}}
  if(should&&playing){if(c.media.paused&&!c._starting){c._starting=true;const p=c.media.play();Promise.resolve(p).catch(()=>{}).finally(()=>c._starting=false)}}
  else if(!c.media.paused)c.media.pause();
  const volume=should&&audible(c)?clamp(c.volume*volumeAt(c,local),0,2):0;
  if(audioNodes.has(c.id)){const n=audioNodes.get(c.id);n.gain.gain.value=volume;n.eq.type=c.eq==='bass'?'lowshelf':c.eq==='vocal'?'peaking':'highshelf';n.eq.frequency.value=c.eq==='bass'?180:c.eq==='vocal'?1800:5000;n.eq.gain.value=c.eq==='bass'?8:c.eq==='vocal'?5:c.eq==='treble'?-10:0;n.clean.frequency.value=c.noiseCut?120:10}
  else c.media.volume=clamp(volume,0,1);
 }
}
function pause(){playing=false;$('play').textContent='▶ Play';clips.forEach(c=>{if(c.media&&c.kind!=='image')c.media.pause()})}
function seek(t){playhead=clamp(t,0,total());if(playing)playStarted=performance.now()-playhead*1000;syncMedia();renderPreview();$('time').textContent=fmt(playhead)+' / '+fmt(total());scrub.value=playhead}
$('play').onclick=async()=>{if(exporting)return;if(playing){pause();return}if(!clips.length)return status('Add media or a text layer first.');if(playhead>=total()-.03)seek(0);playing=true;$('play').textContent='Ⅱ Pause';await enableAudio().catch(()=>{});playStarted=performance.now()-playhead*1000;syncMedia()};
$('toStart').onclick=()=>{pause();seek(0)};
$('toEnd').onclick=()=>{pause();seek(total())};
scrub.oninput=e=>{pause();seek(Number(e.target.value))};
$('timelineZoomIn').onclick=()=>setZoom(pixelsPerSecond*1.4);
$('timelineZoomOut').onclick=()=>setZoom(pixelsPerSecond/1.4);
function setZoom(v){pixelsPerSecond=clamp(v,10,240);$('zoomSlider').value=pixelsPerSecond;renderTimeline()}
$('zoomSlider').oninput=e=>setZoom(Number(e.target.value));
function dimension(r,h){const [a,b]=r.split(':').map(Number);if(a>=b)return[Math.round(h*a/b/2)*2,Math.round(h/2)*2];return[Math.round(h/2)*2,Math.round(h*b/a/2)*2]}
function previewDims(){const [a,b]=aspect.split(':').map(Number);let w=960,h=Math.round(w*b/a);if(h>1000){h=1000;w=Math.round(h*a/b)}return[w,h]}
function refresh(full=true){
 if(full){showLayers();showProperties()}
 renderTimeline();$('empty').classList.toggle('studio-hidden',clips.length>0);$('canvasInfo').textContent=aspect+' · '+canvas.width+' × '+canvas.height+' preview';updateExportInfo()
}
function updateExportInfo(){const dims=dimension(aspect,Number($('resolution').value));$('exportInfo').textContent=dims.join(' × ')+' · MP4 · '+$('fps').value+' fps · '+fmt(total())}
function drawMedia(c,w,h){
 const m=c.media;if(!m)return;
 const sw=c.kind==='image'?m.naturalWidth:m.videoWidth,sh=c.kind==='image'?m.naturalHeight:m.videoHeight;
 if(!(sw>0&&sh>0))return;
 const src=c.cropSource||{x:0,y:0,w:1,h:1};
 const sx=clamp(src.x*sw,0,sw-1),sy=clamp(src.y*sh,0,sh-1);
 const srcW=clamp(src.w*sw,1,sw-sx),srcH=clamp(src.h*sh,1,sh-sy);
 const dw=w*c.w,dh=h*c.h;if(dw<=0||dh<=0)return;
 const fit=c.fit==='contain'?Math.min(dw/srcW,dh/srcH):Math.max(dw/srcW,dh/srcH);
 const scale=fit*(c.zoom||1);
 const offsetX=-Math.max(0,srcW*scale-dw)*(c.panX||0)/200,offsetY=-Math.max(0,srcH*scale-dh)*(c.panY||0)/200;
 ctx.save();ctx.beginPath();ctx.rect(-dw/2,-dh/2,dw,dh);ctx.clip();
 ctx.drawImage(m,sx,sy,srcW,srcH,-srcW*scale/2+offsetX,-srcH*scale/2+offsetY,srcW*scale,srcH*scale);
 ctx.restore()
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
 clips.filter(c=>active(c)&&audible(c)).sort((a,b)=>a.layer-b.layer||a.id-b.id).forEach(c=>{
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
  ctx.filter=(themes[c.filter]||'')+' brightness('+(c.brightness??1)+') contrast('+(c.contrast??1)+') saturate('+(c.saturation??1)+') sepia('+(Math.max(0,c.temperature||0)/100)+') hue-rotate('+Math.min(0,c.temperature||0)+'deg) blur('+(c.blur||0)*w/960+'px)';
  if(c.kind==='video'||c.kind==='image')drawMedia(c,w,h);
  else if(c.kind==='text')drawText(c,w,h);
  ctx.restore();
  if(!exporting&&selected===c.id){ctx.save();ctx.strokeStyle='#d1b5ff';ctx.lineWidth=Math.max(2,w/500);ctx.setLineDash([8,5]);const ww=w*c.w,hh=h*c.h;ctx.translate(c.x*w,c.y*h);ctx.rotate(c.angle*Math.PI/180);ctx.strokeRect(-ww/2,-hh/2,ww,hh);ctx.restore()}
 })
 if(!exporting&&cropMode&&cropDraft){
  const chosen=getSelected();
  if(chosen&&(chosen.kind==='video'||chosen.kind==='image')){
   window.LOOXCrop.draw(ctx,w,h,cropAbsolute(chosen),{bounds:cropClipBox(chosen)});
  }
 }
}
function tick(now){
 if(playing){const at=Math.min(total(),(now-playStarted)/1000);playhead=at;syncMedia();if(playhead>=total()-.01&&!exporting)pause()}
 renderPreview();
 $('time').textContent=tc(playhead)+' / '+tc(total());
 document.querySelectorAll('.timeline-playhead').forEach(el=>el.style.left=playhead*pixelsPerSecond+'px');
 scrub.value=clamp(playhead,0,Math.max(.1,total()));
 requestAnimationFrame(tick)
}
requestAnimationFrame(tick);
let drag=null;
function pointOnCanvas(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,rect:r}}
function cropPointer(e,c){
 const p=pointOnCanvas(e),b=cropClipBox(c);
 return {x:(p.x-b.x)/b.w,y:(p.y-b.y)/b.h,width:p.rect.width*b.w,height:p.rect.height*b.h}
}
function cropCursor(mode){return ({nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize',move:'move'})[mode]||'crosshair'}
canvas.addEventListener('pointerdown',e=>{
 if(exporting||!editable())return;
 if(cropMode&&cropDraft){
  const c=getSelected();if(!c)return;
  const p=cropPointer(e,c),handle=window.LOOXCrop.hit(cropDraft,p.x,p.y,p.width,p.height);
  if(!handle)return;
  e.preventDefault();drag={type:'crop',handle,rect:{...cropDraft},from:{x:p.x,y:p.y}};
  canvas.setPointerCapture(e.pointerId);canvas.style.cursor=cropCursor(handle);return
 }
 const {x,y}=pointOnCanvas(e);
 const hit=clips.filter(c=>active(c)&&c.kind!=='audio').sort((a,b)=>b.layer-a.layer).find(c=>Math.abs(x-c.x)<c.w/2&&Math.abs(y-c.y)<c.h/2);
 if(!hit)return;
 e.preventDefault();pick(hit.id);snap();drag={type:'move',id:hit.id,x,y,origX:hit.x,origY:hit.y};canvas.setPointerCapture(e.pointerId)
});
canvas.addEventListener('pointermove',e=>{
 if(cropMode&&cropDraft){
  const c=getSelected();if(!c)return;const p=cropPointer(e,c);
  if(!drag){canvas.style.cursor=cropCursor(window.LOOXCrop.hit(cropDraft,p.x,p.y,p.width,p.height));return}
  if(drag.type==='crop'){
   cropDraft=window.LOOXCrop.drag(drag.rect,drag.handle,drag.from,{x:p.x,y:p.y},p.width,p.height,cropAspectValue());
   syncVideoCropFields();return
  }
 }
 if(!drag||drag.type!=='move')return;
 const c=clips.find(c=>c.id===drag.id);if(!c)return;
 const {x,y}=pointOnCanvas(e);
 c.x=clamp(drag.origX+x-drag.x,-.5,1.5);
 c.y=clamp(drag.origY+y-drag.y,-.5,1.5)
});
function endCanvasMove(){if(!drag)return;const hadMove=drag.type==='move';drag=null;if(hadMove)showProperties()}
canvas.addEventListener('pointerup',endCanvasMove);
canvas.addEventListener('pointercancel',endCanvasMove);
function getRatio(){if(exporting)return;aspect=$('aspect').value;$('previewAspect').value=aspect;const [w,h]=dimension(aspect,Number($('previewQuality').value));canvas.width=w;canvas.height=h;$('canvasInfo').textContent=w+' × '+h;updateExportInfo()}
$('aspect').onchange=getRatio;$('background').oninput=e=>bg=e.target.value;$('resolution').onchange=updateExportInfo;$('fps').onchange=updateExportInfo;getRatio();
async function enableAudio(){
 if(!window.AudioContext)return;
 if(!audioCtx){audioCtx=new AudioContext();audioDest=audioCtx.createMediaStreamDestination()}
 await audioCtx.resume();
 for(const c of clips){
  if(!c.media||c.kind==='image'||audioNodes.has(c.id))continue;
  try{const source=audioCtx.createMediaElementSource(c.media),gain=audioCtx.createGain(),eq=audioCtx.createBiquadFilter(),clean=audioCtx.createBiquadFilter();clean.type='highpass';clean.frequency.value=10;gain.gain.value=0;source.connect(clean);clean.connect(eq);eq.connect(gain);gain.connect(audioCtx.destination);gain.connect(audioDest);audioNodes.set(c.id,{source,gain,eq,clean})}catch{}
 }
}
function stopExport(canceled=false){
 if(canceled){exportCanceled=true;if(ffmpegJob)ffmpegJob.terminate()}
 if(exportTimer){clearInterval(exportTimer);exportTimer=null}
 if(recorder&&recorder.state!=='inactive')try{recorder.stop()}catch{}
 if(canceled){status('Export canceled.');$('exportInfo').textContent='Export canceled.'}
}
$('cancelExport').onclick=()=>stopExport(true);
const selectMime=()=>['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/webm;codecs=vp8,opus','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m));

async function convertWebMToMp4(webmBlob,onProgress){
  const mod=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
  const util=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
  const ff=new mod.FFmpeg();
  ffmpegJob=ff;
  if(exportCanceled)throw new Error('Export canceled');
  ff.on('progress',p=>onProgress?.(Math.round((p.progress||0)*100)));
  const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
  const workerURL=URL.createObjectURL(new Blob(["import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js';"],{type:'text/javascript'}));
  const engineURLs=[];
  try{
  const coreURL=await util.toBlobURL(base+'/ffmpeg-core.js','text/javascript');engineURLs.push(coreURL);
  const wasmURL=await util.toBlobURL(base+'/ffmpeg-core.wasm','application/wasm');engineURLs.push(wasmURL);
  if(exportCanceled)throw new Error('Export canceled');
  await ff.load({classWorkerURL:workerURL,coreURL,wasmURL});
  await ff.writeFile('input.webm',await util.fetchFile(webmBlob));
  const code=await ff.exec(['-i','input.webm','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','output.mp4']);
  if(code!==0)throw new Error('FFmpeg could not encode MP4');
  const data=await ff.readFile('output.mp4');
  return new Blob([data],{type:'video/mp4'});
  }finally{ff.terminate();ffmpegJob=null;URL.revokeObjectURL(workerURL);engineURLs.forEach(u=>URL.revokeObjectURL(u))}
}
function exportDownload(blob,name){
 const url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download=name;a.textContent='↓ Download '+name+' · '+(blob.size/1048576).toFixed(1)+' MB';$('exportResult').replaceChildren(a);a.click();
}
function exportUI(busy){document.querySelectorAll('.studio-workspace button,.studio-workspace input,.studio-workspace select,.studio-workspace textarea,.studio-timeline button,.studio-timeline input,#undo,#redo,#aspect,#resolution,#fps,#background,#export,#exportTop').forEach(el=>el.disabled=busy);$('cancelExport').disabled=!busy;$('closeExport').disabled=busy}
async function exportVideo(){
 if(exporting||!clips.length)return status('Add at least one layer before exporting.');
 if(!canvas.captureStream||!window.MediaRecorder)return status('This browser does not support canvas video recording. Try recent Chrome or Edge.');
 const mime=selectMime();if(!mime)return status('WebM export codec unavailable in this browser.');
 const seconds=total();if(seconds<=.1)return status('Timeline is too short.');
 const [w,h]=dimension(aspect,Number($('resolution').value));const fps=Number($('fps').value);
 if(w*h>8300000&&!confirm('4K projects can be very demanding and may fail on this device. Try 720p first. Continue?'))return;
 pause();seek(0);const original=[canvas.width,canvas.height];canvas.width=w;canvas.height=h;exporting=true;exportCanceled=false;
 exportUI(true);$('exportResult').replaceChildren();$('exportProgress').value=0;
 try{
  await enableAudio().catch(()=>{});
  syncMedia();await Promise.all(clips.filter(c=>c.media&&c.kind==='video'&&active(c)).map(c=>new Promise(resolve=>{if(c.media.readyState>=2&&!c.media.seeking)return resolve();const timer=setTimeout(resolve,5000);c.media.addEventListener('seeked',()=>{clearTimeout(timer);resolve()},{once:true});c.media.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve()},{once:true})})));
  if(exportCanceled)throw new Error('Export canceled');
  renderPreview();exportStream=canvas.captureStream(fps);
  if(audioDest)audioDest.stream.getAudioTracks().forEach(track=>exportStream.addTrack(track));
  const bitrate=clamp(w*h*fps*.075,1000000,30000000);
  const chunks=[];recorder=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:bitrate});
  let canceled=false;
  const oldCancel=$('cancelExport').onclick;
  $('cancelExport').onclick=()=>{canceled=true;stopExport(true)};
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  recorder.onerror=()=>{canceled=true;stopExport();status('Video recorder failed. Try a smaller resolution.')};
  recorder.onstop=async()=>{
   stopExport();pause();canvas.width=original[0];canvas.height=original[1];
   if(exportStream){exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null}
   if(!canceled&&!exportCanceled&&chunks.length){const recording=new Blob(chunks,{type:mime});try{status('Preparing MP4 download…');const file=mime.startsWith('video/mp4')?recording:await convertWebMToMp4(recording,p=>{$('exportInfo').textContent='Converting to MP4 '+p+'%';$('exportProgress').value=p});if(!exportCanceled){exportDownload(file,'loox-video-'+w+'x'+h+'.mp4');$('exportProgress').value=100;status('MP4 export complete. Use the download link if your browser did not save automatically.')}}catch(error){if(!exportCanceled){exportDownload(recording,'loox-video-'+w+'x'+h+'.webm');status('MP4 encoding failed: '+error.message+'. Your WebM recording is available below.')}}}
   else if(!canceled)status('No recorded data. Try a lower resolution or a different browser.');
   exporting=false;exportUI(false);$('cancelExport').onclick=oldCancel;getRatio();seek(0);showProperties();
  };
  recorder.start(1000);playing=true;playStarted=performance.now();$('play').textContent='Ⅱ Exporting';syncMedia();
  status('Recording '+w+' × '+h+' at '+fps+' fps. Keep this tab active.');
  exportTimer=setInterval(()=>{const percent=Math.min(100,Math.round(playhead/seconds*100));$('exportInfo').textContent='Exporting '+percent+'% · '+fmt(playhead)+' / '+fmt(seconds);$('exportProgress').value=percent;if(playhead>=seconds-.03)stopExport()},100)
 }catch(error){
  exporting=false;pause();canvas.width=original[0];canvas.height=original[1];
  if(exportStream){exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null}
  exportUI(false);
  status('Export failed: '+(error&&error.message||'Unsupported device settings')+'. Try 720p at 30 fps.')
 }
}
$('export').onclick=exportVideo;
$('exportTop').onclick=()=>{if(!$('exportDialog').open)$('exportDialog').showModal()};
$('closeExport').onclick=()=>{$('exportDialog').close()};
window.addEventListener('beforeunload',()=>{pause();urls.forEach(u=>URL.revokeObjectURL(u));if(audioCtx)audioCtx.close().catch(()=>{})});
showLayers();showProperties();renderTimeline();setTab('video');status('Ready. Import video, image or audio, or paste/drag media into the editor.');
})();

