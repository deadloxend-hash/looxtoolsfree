/* LOOX Video Studio — original browser timeline compositor */
(() => {
'use strict';
const Core=window.LOOXVideoCore;
const $ = id => document.getElementById(id);
const canvas=$('preview'),ctx=canvas.getContext('2d',{alpha:false}),scrub=$('scrub');
if(!ctx){$('status').textContent='Canvas rendering is unavailable in this browser.';return}
const clips=[];let selected=null,playhead=0,playing=false,playStarted=0,exporting=false,recorder=null,exportStream=null,exportTimer=null,exportRenderTimer=null;
let viewSeconds=30,nextId=1,aspect='16:9',bg='#171827',audioCtx=null,audioDest=null,audioNodes=new Map(),cropMode=false,cropDraft=null,cropRatio='free';
const history=[],future=[],urls=new Set(),maxHistory=30;
const mediaLibrary=[],trackStates=new Map();
let projectName='Untitled project',saveTimer=null,projectDB=null,markers=[],clipboard=null;
const mediaSources=new WeakMap(),pixelSurfaces=new Map();
const tracks=[{id:0,name:'Video 1',kind:'video'},{id:4,name:'Video 2',kind:'video'},{id:7,name:'Titles',kind:'video'},{id:2,name:'Audio 1',kind:'audio'},{id:3,name:'Audio 2',kind:'audio'}];
let pixelsPerSecond=50,inspectorTab='basic',exportCanceled=false;
const trackState=id=>{if(!trackStates.has(id))trackStates.set(id,{locked:false,hidden:false,solo:false});return trackStates.get(id)};
const audible=c=>!trackState(c.layer).hidden&&(!tracks.some(t=>trackState(t.id).solo)||trackState(c.layer).solo);
const editable=()=>{const c=getSelected();if(exporting)return false;if(c&&trackState(c.layer).locked){status('Unlock this track to edit its clips.');return false}return true};
const tc=t=>{const fps=Number($('fps').value)||30,n=Math.floor(Math.max(0,t)*fps+1e-5);return [Math.floor(n/fps/3600),Math.floor(n/fps/60)%60,Math.floor(n/fps)%60,n%fps].map(v=>String(v).padStart(2,'0')).join(':')};
const themes={none:'',vivid:'saturate(1.7) contrast(1.16)',warm:'sepia(.3) saturate(1.35)',cool:'hue-rotate(22deg) saturate(1.2)',mono:'grayscale(1)',vintage:'sepia(.6) contrast(.9)',dream:'saturate(1.2) blur(1.5px)'};
const icons={video:'▣',image:'▧',audio:'♫',text:'T'};
const esc=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=t=>{t=Math.max(0,Number(t)||0);return String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0')};
const status=s=>$('status').textContent=s;
const total=()=>clips.reduce((m,c)=>Math.max(m,c.start+c.duration),0);
const active=c=>playhead>=c.start&&playhead<c.start+c.duration;
const snap=()=>{history.push(clips.map(Core.clone));if(history.length>maxHistory)history.shift();future.length=0;scheduleSave()};
function restore(list){pause();clips.splice(0,clips.length,...list.map(Core.clone));if(!clips.some(c=>c.id===selected))selected=null;syncMedia();refresh()}
function undo(){if(exporting||!history.length)return;future.push(clips.map(Core.clone));restore(history.pop())}
function redo(){if(exporting||!future.length)return;history.push(clips.map(Core.clone));restore(future.pop())}
$('undo').onclick=undo;$('redo').onclick=redo;
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;if(/input|textarea|select/i.test(e.target.tagName))return;if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(e.key.toLowerCase()==='y'){e.preventDefault();redo()}});
function getSelected(){return clips.find(c=>c.id===selected)||null}
function pick(id){if(cropMode&&selected!==id){cropMode=false;cropDraft=null}selected=id;showLayers();showProperties();renderTimeline()}
function createMedia(kind,url){if(kind==='image'){const img=new Image();img.onload=()=>{if(!playing)renderPreview()};img.src=url;return img}const m=document.createElement(kind==='audio'?'audio':'video');m.addEventListener('loadeddata',()=>{if(!playing)renderPreview()});m.addEventListener('seeked',()=>{if(!playing)renderPreview()});m.src=url;m.preload='auto';m.playsInline=true;m.loop=false;return m}
function waitMeta(el,kind){return new Promise((resolve,reject)=>{if(kind==='image'&&el.complete&&el.naturalWidth)return resolve();if(kind!=='image'&&el.readyState>=1&&Number.isFinite(el.duration))return resolve();const timer=setTimeout(()=>{clean();reject(new Error('Media metadata timed out'))},15000);const ok=()=>{clean();resolve()},bad=()=>{clean();reject(new Error('Unsupported or corrupted media'))};function clean(){clearTimeout(timer);el.removeEventListener(kind==='image'?'load':'loadedmetadata',ok);el.removeEventListener('error',bad)}el.addEventListener(kind==='image'?'load':'loadedmetadata',ok,{once:true});el.addEventListener('error',bad,{once:true})})}
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
  const c=baseProps(kind,file.name);c.assetId=c.id;c.file=file;c.media=media;c.url=url;c.sourceDuration=kind==='image'?5:Math.max(.1,Number(media.duration)||5);c.duration=kind==='image'?5:c.sourceDuration;
  if(kind==='video'&&mode!=='overlay'){c.start=clips.filter(t=>t.kind==='video'&&t.layer===0).reduce((m,t)=>Math.max(m,t.start+t.duration),0);c.x=.5;c.y=.5;c.w=1;c.h=1;c.volume=1}
  if(mode==='overlay'){c.layer=4;c.w=.46;c.h=.46;c.volume=0;c.start=playhead;c.fit='contain'}
  if(kind==='image'){c.layer=4;c.w=.46;c.h=.46;c.fit='contain'}
  if(kind==='audio'){c.layer=2;c.volume=1}
  clips.push(c);selected=c.id;mediaLibrary.push(Core.clone(c));queueAssetPreview(c);
  if(kind!=='image')media.addEventListener('seeked',()=>{if(!playing)renderPreview()});
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
 if(mode==='project'){selected=null;showProperties();status('Choose the canvas ratio above the monitor and background in Export settings.');}
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
 const query=($('mediaSearch')?.value||'').toLowerCase();
 for(const asset of mediaLibrary.filter(a=>a.name.toLowerCase().includes(query))){
  const b=document.createElement('button');b.className='studio-list-item';b.draggable=true;b.textContent=icons[asset.kind]+' '+asset.name+' · '+fmt(asset.sourceDuration);b.title='Add another instance at the playhead';
  b.ondragstart=e=>e.dataTransfer.setData('application/x-loox-media',String(asset.assetId));
  const thumbnail=assetPreviews.get(asset.assetId)?.thumbnail;if(thumbnail){const img=document.createElement('img');img.src=thumbnail;img.alt='';img.width=64;img.height=36;b.prepend(img)}b.onclick=()=>insertAsset(asset,playhead);root.append(b);
 }
}
function insertAsset(asset,start,layer=asset.layer){if(exporting||trackState(layer).locked)return;snap();const c={...Core.clone(asset),id:nextId++,start,layer,media:createMedia(asset.kind,asset.url)};if(c.kind!=='image')c.media.addEventListener('seeked',()=>{if(!playing)renderPreview()});clips.push(c);selected=c.id;refresh()}
function volumeAt(c,t){const keys=c.keys||[];if(!keys.length)return 1;const sorted=keys.slice().sort((a,b)=>a.t-b.t);if(t<=sorted[0].t)return sorted[0].v;for(let i=1;i<sorted.length;i++)if(t<=sorted[i].t){const a=sorted[i-1],b=sorted[i];return a.v+(b.v-a.v)*(t-a.t)/(b.t-a.t)}return sorted.at(-1).v}
function extendInspector(c,el){
 const audioKeys=['volume','eq','noiseCut','keyVolume'],colorKeys=['filter','transition','fade','brightness','contrast','saturation','temperature','blur','visualEffect'];
 const extras=document.createElement('div');
 extras.innerHTML=field('Scale','scale',c.scale,'range',.05,4,.01)+field('Move to track','layer',opts(tracks.filter(t=>(c.kind==='audio')===(t.kind==='audio')).map(t=>[t.id,t.name]),c.layer),'select');
 if(c.kind==='video'||c.kind==='audio')extras.innerHTML+=field('EQ preset','eq',opts([['flat','Flat'],['bass','Bass boost'],['vocal','Vocal clarity'],['treble','Treble reduction']],c.eq||'flat'),'select')+field('Hum reduction','noiseCut',opts([[0,'Off'],[1,'High-pass · 120 Hz']],c.noiseCut?1:0),'select')+field('Keyframe gain %','keyVolume',Math.round(volumeAt(c,playhead-c.start)*100),'range',0,200,1)+'<div class="key-controls"><button class="studio-btn secondary" id="setVolumeKey">◆ Set volume keyframe</button><button class="studio-btn secondary" id="clearVolumeKeys">Clear keyframes</button><p class="studio-section-note">Keyframes interpolate over time. Hum reduction filters low frequencies; AI denoising is not installed.</p></div>';
 if(c.kind!=='audio')extras.innerHTML+=field('Brightness','brightness',c.brightness??1,'range',.2,2,.01)+field('Contrast','contrast',c.contrast??1,'range',.2,2,.01)+field('Saturation','saturation',c.saturation??1,'range',0,3,.01)+field('Temperature','temperature',c.temperature||0,'range',-50,50,1)+field('Blur','blur',c.blur||0,'range',0,20,.5)+'<div class="color-controls"><button class="studio-btn secondary" id="resetEffects">Reset color & effects</button></div>';
 el.append(extras);
 extras.querySelectorAll('[data-prop]').forEach(input=>{const key=input.dataset.prop;input.onfocus=()=>{if(editable())snap()};const change=()=>{if(!editable())return;if(key!=='keyVolume')c[key]=key==='eq'?input.value:Number(input.value);if(key==='layer')renderTimeline();scheduleMediaSync();scheduleSave()};input.addEventListener(input.tagName==='SELECT'?'change':'input',change)});
 if(el.querySelector('#setVolumeKey')){el.querySelector('#setVolumeKey').onclick=()=>{if(!editable())return;snap();const t=clamp(playhead-c.start,0,c.duration),v=Number(el.querySelector('[data-prop=keyVolume]').value)/100;c.keys=(c.keys||[]).filter(k=>Math.abs(k.t-t)>.02);c.keys.push({t,v});c.keys.sort((a,b)=>a.t-b.t);refresh()};el.querySelector('#clearVolumeKeys').onclick=()=>{if(!editable())return;snap();c.keys=[];refresh()}}
 if(el.querySelector('#resetEffects'))el.querySelector('#resetEffects').onclick=()=>{if(!editable())return;snap();Object.assign(c,{filter:'none',transition:'none',blur:0,brightness:1,contrast:1,saturation:1,temperature:0,visualEffect:'none',effectAmount:.5});refresh()};
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
$('previewAspect').onchange=e=>{if(exporting)return;$('aspect').value=e.target.value;getRatio();scheduleSave()};
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
 window.LOOXCrop.syncInsets(inspector,cropDraft,dims.w,dims.h);
 const px={cropX:Math.round(cropDraft.x*dims.w),cropY:Math.round(cropDraft.y*dims.h),
 cropW:Math.round(cropDraft.w*dims.w),cropH:Math.round(cropDraft.h*dims.h)};
 Object.entries(px).forEach(([key,v])=>{const el=inspector.querySelector('[data-prop='+key+']');if(el&&el!==except)el.value=v});
 const label=inspector.querySelector('#cropReadout');if(label)label.textContent='Selected source: '+Math.max(1,px.cropW)+' × '+Math.max(1,px.cropH)+' px • layer crop';renderPreview();
}
function enterCrop(){
 if(!editable())return;
 const c=getSelected();
 if(!c||!['video','image'].includes(c.kind)){status('Select a video or image clip before using Crop.');return}
 pause();seek(Math.min(c.start+c.duration-.04,Math.max(c.start+.04,playhead)));
 cropMode=true;cropRatio='free';cropDraft={x:.03,y:.03,w:.94,h:.94};
 showProperties();status('Crop mode: drag the white handles to resize, or type exact pixel dimensions.');
}
function exitCrop(){cropMode=false;cropDraft=null;canvas.style.cursor='default';showProperties();renderPreview()}
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
 window.LOOXCrop.attachInsets(el,dims.w,dims.h,()=>cropDraft,r=>{cropDraft=r;syncVideoCropFields()});
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
   if(prop==='rate'){v=clamp(v,.1,16);const factor=(c.rate||1)/v;c.duration=Math.max(.01,c.duration*factor);c.keys=(c.keys||[]).map(k=>({...k,t:k.t*factor}));for(const keys of Object.values(c.animation||{}))for(const key of keys)key.t*=factor}
   if(prop==='start')v=clamp(v,0,36000);
   if(prop==='zoom')v=clamp(v,1,4);
   c[prop]=v;
   const output=input.closest('label')?.querySelector('.studio-live-value');
   if(output)output.textContent=input.value+(['opacity','volume'].includes(prop)?'%':'');
   if(['start','duration','trimStart','rate'].includes(prop))renderTimeline();
   if(['volume','rate','trimStart','start','duration'].includes(prop))syncMedia();
   renderPreview();scheduleSave()
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
 extendInspector(c,el);advancedInspector(c,el);
}
function removeSelected(){const c=getSelected();if(!c||!editable())return;snap();pause();if($('ripple').checked)clips.filter(x=>x.layer===c.layer&&x.start>=c.start+c.duration).forEach(x=>x.start-=c.duration);clips.splice(clips.indexOf(c),1);selected=null;refresh();status('Clip removed.')}
$('deleteClip').onclick=removeSelected;
function duplicate(){const c=getSelected();if(!c||!editable())return;snap();const copy={...Core.clone(c),id:nextId++,start:c.start+c.duration,name:c.name+' copy',cropSource:{...c.cropSource},keys:(c.keys||[]).map(k=>({...k}))};
 if(c.media&&c.url)copy.media=createMedia(c.kind,c.url);
 clips.push(copy);selected=copy.id;refresh()}
function split(){
 if(!editable())return;
 const c=getSelected();if(!c||!['video','audio'].includes(c.kind)){status('Select a video or audio clip before splitting.');return}
 const delta=playhead-c.start,frame=1/Number($('fps').value);if(delta<frame-.0001||delta>c.duration-frame+.0001){status('Leave at least one frame on each side of the cut.');return}
 snap();const parts=Core.splitClip(c,delta);Object.assign(c,parts[0]);const right={...parts[1],id:nextId++,name:c.name+' (part 2)',start:playhead,trimStart:c.trimStart+delta*(c.rate||1),duration:parts[1].duration,media:createMedia(c.kind,c.url)};
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
   const bar=document.createElement('div');bar.tabIndex=0;bar.role='button';bar.dataset.clip=c.id;bar.className='studio-clip '+c.kind+(c.id===selected?' active':'');bar.setAttribute('aria-label',c.name+' timeline clip');
   bar.style.left=c.start*pixelsPerSecond+'px';bar.style.width=Math.max(10,c.duration*pixelsPerSecond)+'px';bar.innerHTML='<span class="clip-trim left" data-edge="left"></span><span>'+esc(c.name)+'</span><span class="clip-trim right" data-edge="right"></span>';
   const preview=assetPreviews.get(c.assetId);if(preview?.thumbnail){bar.style.backgroundImage='linear-gradient(#13233b44,#13233baa),url('+preview.thumbnail+')';bar.style.backgroundSize='auto 100%'}
   if(preview?.peaks){const peaks=preview.peaks,from=Math.floor(c.trimStart/c.sourceDuration*peaks.length),to=Math.max(from+1,Math.ceil((c.trimStart+c.duration*c.rate)/c.sourceDuration*peaks.length)),slice=peaks.slice(from,to);bar.insertAdjacentHTML('beforeend','<svg class="audio-waveform" viewBox="0 0 512 40" preserveAspectRatio="none"><path d="'+slice.map((v,i)=>'M'+(i/slice.length*512).toFixed(1)+' '+(20-v*18).toFixed(1)+'v'+(v*36).toFixed(1)).join(' ')+'"/></svg>')}
   if(c.kind==='audio'||c.kind==='video'){
    const points=[{t:0,v:1},...(c.keys||[]),{t:c.duration,v:1}].sort((a,b)=>a.t-b.t);
    bar.insertAdjacentHTML('beforeend','<svg class="volume-line" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline fill="none" stroke="#fdd68f" stroke-width="1" points="'+points.map(k=>(k.t/c.duration*100)+','+(38-k.v*17)).join(' ')+'"/></svg>')
   }
   let action=null;
   bar.onpointerdown=e=>{if(e.button!==0||exporting)return;e.stopPropagation();pause();selected=c.id;root.querySelectorAll('[data-clip]').forEach(el=>el.classList.toggle('active',Number(el.dataset.clip)===c.id));showLayers();showProperties();if(state.locked)return status('Track is locked.');snap();action={x:e.clientX,start:c.start,duration:c.duration,trim:c.trimStart,edge:e.target.dataset.edge};bar.setPointerCapture(e.pointerId)};
   bar.onpointermove=e=>{if(!action)return;const d=(e.clientX-action.x)/pixelsPerSecond,rate=c.rate||1;
    if(action.edge==='right')c.duration=clamp(action.duration+d,1/Number($('fps').value),c.media&&c.kind!=='image'?(c.sourceDuration-c.trimStart)/rate:36000);
    else if(action.edge==='left'){const delta=clamp(d,-Math.min(action.start,action.trim/rate),action.duration-.04);c.start=action.start+delta;c.trimStart=action.trim+delta*rate;c.duration=action.duration-delta}
    else {c.start=Math.max(0,Math.round((action.start+d)*Number($('fps').value))/Number($('fps').value));if($('snapping').checked){const targets=[playhead,0,...clips.filter(x=>x.id!==c.id).flatMap(x=>[x.start,x.start+x.duration])];const target=targets.find(v=>Math.abs(v-c.start)<8/pixelsPerSecond);if(target!==undefined)c.start=target}}
    bar.style.left=c.start*pixelsPerSecond+'px';bar.style.width=Math.max(10,c.duration*pixelsPerSecond)+'px';scheduleMediaSync()
   };
   const end=e=>{if(!action)return;if($('ripple').checked&&action.edge==='right'){const delta=c.duration-action.duration;clips.filter(x=>x.id!==c.id&&x.layer===c.layer&&x.start>=action.start+action.duration-.001).forEach(x=>x.start=Math.max(0,x.start+delta))}if(!action.edge){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-track]');if(target){const dest=tracks.find(t=>t.id===Number(target.dataset.track));if(dest&&!trackState(dest.id).locked&&((c.kind==='audio')===(dest.kind==='audio')))c.layer=dest.id}}action=null;refresh()};
   bar.onpointerup=end;bar.onpointercancel=end;bar.onkeydown=e=>{if(e.key==='Enter')pick(c.id)};line.append(bar)
  });
  line.onclick=e=>{if(e.target===line&&!exporting){pause();seek((e.clientX-line.getBoundingClientRect().left)/pixelsPerSecond)}};
  line.ondragover=e=>e.preventDefault();line.ondrop=e=>{e.preventDefault();const asset=mediaLibrary.find(a=>String(a.assetId)===e.dataTransfer.getData('application/x-loox-media'));if(asset&&((asset.kind==='audio')===(t.kind==='audio')))insertAsset(asset,Math.max(0,(e.clientX-line.getBoundingClientRect().left)/pixelsPerSecond),t.id)};
  row.append(label,line);root.append(row)
 });
 root.scrollLeft=scroll;root.scrollTop=top;drawRuler();scrub.max=Math.max(.1,total());scrub.value=clamp(playhead,0,total());
}
function drawRuler(){const ruler=$('ruler'),scroll=$('tracks').scrollLeft,step=pixelsPerSecond>120?1:pixelsPerSecond>30?5:10;ruler.innerHTML='';for(let t=Math.floor(scroll/pixelsPerSecond/step)*step;t<(scroll+ruler.clientWidth)/pixelsPerSecond+step;t+=step){const s=document.createElement('span');s.className='ruler-tick';s.style.left=(t*pixelsPerSecond-scroll)+'px';s.textContent=tc(t);ruler.append(s)}for(const t of markers){const b=document.createElement('button');b.className='video-marker';b.style.left=(t*pixelsPerSecond-scroll)+'px';b.textContent='◆';b.title='Marker '+tc(t)+' · double-click to remove';b.onclick=e=>{e.stopPropagation();pause();seek(t)};b.ondblclick=()=>{markers=markers.filter(v=>v!==t);drawRuler();scheduleSave()};ruler.append(b)}}
$('tracks').onscroll=drawRuler;
$('ruler').onclick=e=>{if(!exporting){pause();seek((e.clientX-$('ruler').getBoundingClientRect().left+$('tracks').scrollLeft)/pixelsPerSecond)}};
function syncMedia(){
 for(const c of clips){if(!c.media||c.kind==='image')continue;
  const local=playhead-c.start,should=local>=0&&local<c.duration;
  const desired=clamp(c.trimStart+local*(c.rate||1),0,Math.max(0,c.sourceDuration-.05));
  c.media.playbackRate=clamp(c.rate||1,.1,16);c.media.preservesPitch=true;
  if(should&&c.media.readyState>=1&&Math.abs(c.media.currentTime-desired)>(playing?.24:.001)){try{c.media.currentTime=desired}catch{}}
  if(should&&playing){if(c.media.paused&&!c._starting){c._starting=true;const p=c.media.play();Promise.resolve(p).catch(()=>{}).finally(()=>c._starting=false)}}
  else if(!c.media.paused)c.media.pause();
  const fade=Math.min(1,c.audioFadeIn?Math.max(0,local)/c.audioFadeIn:1,c.audioFadeOut?Math.max(0,c.duration-local)/c.audioFadeOut:1);
  const volume=should&&audible(c)?clamp(Core.valueAt(c.animation?.volume,local,c.volume)*volumeAt(c,local)*fade,0,2):0;
  if(audioNodes.has(c.id)){c.media.volume=1;const n=audioNodes.get(c.id);n.gain.gain.value=volume;n.eq.type=c.eq==='bass'?'lowshelf':c.eq==='vocal'?'peaking':'highshelf';n.eq.frequency.value=c.eq==='bass'?180:c.eq==='vocal'?1800:5000;n.eq.gain.value=c.eq==='bass'?8:c.eq==='vocal'?5:c.eq==='treble'?-10:0;n.clean.frequency.value=c.noiseCut?120:10}
  else c.media.volume=clamp(volume,0,1);
 }
}
function pause(){playing=false;$('play').textContent='Play';clips.forEach(c=>{if(c.media&&c.kind!=='image')c.media.pause()})}
function seek(t){playhead=clamp(Math.round(t*Number($('fps').value))/Number($('fps').value),0,total());if(playing)playStarted=performance.now()-playhead*1000;syncMedia();renderPreview();$('time').textContent=fmt(playhead)+' / '+fmt(total());scrub.value=playhead}
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
 renderTimeline();$('empty').classList.toggle('studio-hidden',clips.length>0);$('canvasInfo').textContent=aspect+' · '+canvas.width+' × '+canvas.height+' preview';updateExportInfo();renderPreview();scheduleSave()
}
function updateExportInfo(){const dims=dimension(aspect,Number($('resolution').value));$('exportInfo').textContent=dims.join(' × ')+' · '+($('exportFormat').value.startsWith('video/mp4')?'MP4':'WebM')+' · '+$('fps').value+' fps · '+fmt(total())}
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
 ctx.save();ctx.beginPath();if(c.mask==='circle')ctx.ellipse(0,0,dw/2,dh/2,0,0,Math.PI*2);else if(c.mask==='diamond'){ctx.moveTo(0,-dh/2);ctx.lineTo(dw/2,0);ctx.lineTo(0,dh/2);ctx.lineTo(-dw/2,0);ctx.closePath()}else if(c.radius&&ctx.roundRect)ctx.roundRect(-dw/2,-dh/2,dw,dh,Math.min(dw,dh)*c.radius);else ctx.rect(-dw/2,-dh/2,dw,dh);ctx.clip();
 if(c.visualEffect==='pixelate'){let low=pixelSurfaces.get(c.id);if(!low){low=document.createElement('canvas');pixelSurfaces.set(c.id,low)}const size=Math.max(8,Math.round(90-(c.effectAmount??.5)*80));const pixelHeight=Math.max(4,Math.round(size*srcH/srcW));if(low.width!==size||low.height!==pixelHeight){low.width=size;low.height=pixelHeight}low.getContext('2d').drawImage(m,sx,sy,srcW,srcH,0,0,low.width,low.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(low,-srcW*scale/2+offsetX,-srcH*scale/2+offsetY,srcW*scale,srcH*scale)}else ctx.drawImage(m,sx,sy,srcW,srcH,-srcW*scale/2+offsetX,-srcH*scale/2+offsetY,srcW*scale,srcH*scale);
 ctx.restore()
}
function drawText(c,w,h){
 const lines=String(c.text||'').split('\n').slice(0,8);
 const font=Math.max(12,Math.round(c.fontSize*w/960));ctx.font='900 '+font+'px '+JSON.stringify(c.font||'Arial');ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle=c.color;ctx.lineJoin='round';
 if(c.visualEffect==='glow'){ctx.shadowColor=c.color;ctx.shadowBlur=(c.effectAmount??.5)*40*w/960}
 else if(c.effect==='shadow'){ctx.shadowColor='#000c';ctx.shadowBlur=13;ctx.shadowOffsetY=7}
 else if(c.effect==='neon'){ctx.shadowColor=c.color;ctx.shadowBlur=26}
 if(c.effect==='outline'){ctx.lineWidth=Math.max(3,font/9);ctx.strokeStyle='#0a0820'}
 lines.forEach((line,i)=>{const y=(i-(lines.length-1)/2)*font*1.23;if(c.effect==='outline')ctx.strokeText(line,0,y,w*c.w);ctx.fillText(line,0,y,w*c.w)})
}
function renderPreview(){
 const w=canvas.width,h=canvas.height;
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 clips.filter(c=>active(c)&&audible(c)).sort((a,b)=>a.layer-b.layer||a.start-b.start||a.id-b.id).forEach(c=>{
  if(c.kind==='audio')return;
  const local=playhead-c.start;c=Core.evaluated(c,local);let opacity=clamp(c.opacity,0,1);
  const transTime=Math.min(Math.max(.05,c.transitionDuration||c.fade||.65),c.duration/2);
  const progress=clamp(local/transTime,0,1);
  if(c.fade>0)opacity*=Math.min(1,local/c.fade,(c.duration-local)/c.fade);
  if(c.transition==='fade'||c.transition==='slide-left'||c.transition==='slide-right'||c.transition==='zoom-in')opacity*=progress;
  if(opacity<=0)return;
  const offset=c.transition==='slide-left'?(1-progress)*w:c.transition==='slide-right'?-(1-progress)*w:0;
  const zoom=c.transition==='zoom-in'?.78+.22*progress:1;
  ctx.save();ctx.globalAlpha=opacity;const amount=c.effectAmount??.5,shake=c.visualEffect==='shake'?amount*.018:0,pulse=c.visualEffect==='pulse'?1+amount*.1*Math.sin(local*Math.PI*4):1;ctx.translate(c.x*w+offset+Math.sin(local*61)*w*shake,c.y*h+Math.cos(local*47)*h*shake);ctx.rotate(c.angle*Math.PI/180);ctx.scale(c.scale*zoom*pulse*(c.flipX||1),c.scale*zoom*pulse*(c.flipY||1));if(c.visualEffect==='glow'){ctx.shadowColor='#a1d6ff';ctx.shadowBlur=(c.effectAmount??.5)*40*w/960;}ctx.globalCompositeOperation=['source-over','multiply','screen','overlay','lighten','darken'].includes(c.blend)?c.blend:'source-over';
  ctx.filter=(themes[c.filter]||'')+' brightness('+(c.brightness??1)+') contrast('+(c.contrast??1)+') saturate('+(c.saturation??1)+') sepia('+(Math.max(0,c.temperature||0)/100)+') hue-rotate('+Math.min(0,c.temperature||0)+'deg) blur('+(c.blur||0)*w/960+'px)';
  if(c.kind==='video'||c.kind==='image')drawMedia(c,w,h);
  else if(c.kind==='text'){if(c.mask==='circle'||c.mask==='diamond'||c.radius){const dw=w*c.w,dh=h*c.h;ctx.beginPath();if(c.mask==='circle')ctx.ellipse(0,0,dw/2,dh/2,0,0,Math.PI*2);else if(c.mask==='diamond'){ctx.moveTo(0,-dh/2);ctx.lineTo(dw/2,0);ctx.lineTo(0,dh/2);ctx.lineTo(-dw/2,0);ctx.closePath()}else if(ctx.roundRect)ctx.roundRect(-dw/2,-dh/2,dw,dh,Math.min(dw,dh)*c.radius);ctx.clip()}drawText(c,w,h)}
  ctx.restore();
  if(!exporting&&selected===c.id){ctx.save();ctx.strokeStyle='#d1b5ff';ctx.lineWidth=Math.max(2,w/500);ctx.setLineDash([8,5]);const ww=w*c.w,hh=h*c.h;ctx.translate(c.x*w,c.y*h);ctx.rotate(c.angle*Math.PI/180);ctx.strokeRect(-ww/2,-hh/2,ww,hh);ctx.restore()}
 })
 if(!exporting&&$('safeZones').checked){ctx.save();ctx.strokeStyle='#e2eaff88';ctx.setLineDash([8,6]);ctx.lineWidth=Math.max(1,w/600);ctx.strokeRect(w*.15,h*.10,w*.70,h*.74);ctx.restore()}
 if(!exporting&&cropMode&&cropDraft){
  const chosen=getSelected();
  if(chosen&&(chosen.kind==='video'||chosen.kind==='image')){
   window.LOOXCrop.draw(ctx,w,h,cropAbsolute(chosen),{bounds:cropClipBox(chosen)});
  }
 }
}
function tick(now){
 if(playing&&!exporting){const at=Math.min(total(),(now-playStarted)/1000);playhead=at;syncMedia();if(playhead>=total()-.01&&!exporting)pause()}
 if(playing&&!exporting){renderPreview();
 $('time').textContent=tc(playhead)+' / '+tc(total());
 document.querySelectorAll('.timeline-playhead').forEach(el=>el.style.left=playhead*pixelsPerSecond+'px');
 scrub.value=clamp(playhead,0,Math.max(.1,total()));}
 requestAnimationFrame(tick)
}
requestAnimationFrame(tick);
let drag=null,syncPending=false;
function scheduleMediaSync(){if(syncPending)return;syncPending=true;requestAnimationFrame(()=>{syncPending=false;syncMedia();renderPreview()})}
function pointOnCanvas(e){const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/canvas.width,r.height/canvas.height),width=canvas.width*scale,height=canvas.height*scale,left=r.left+(r.width-width)/2,top=r.top+(r.height-height)/2;return {x:(e.clientX-left)/width,y:(e.clientY-top)/height,rect:{left,top,width,height}}}
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
   syncVideoCropFields();renderPreview();return
  }
 }
 if(!drag||drag.type!=='move')return;
 const c=clips.find(c=>c.id===drag.id);if(!c)return;
 const {x,y}=pointOnCanvas(e);
 c.x=clamp(drag.origX+x-drag.x,-.5,1.5);
 c.y=clamp(drag.origY+y-drag.y,-.5,1.5);scheduleMediaSync();scheduleSave()
});
function endCanvasMove(){if(!drag)return;const hadMove=drag.type==='move';drag=null;if(hadMove)showProperties()}
canvas.addEventListener('pointerup',endCanvasMove);
canvas.addEventListener('pointercancel',endCanvasMove);
function getRatio(){if(exporting)return;aspect=$('aspect').value;$('previewAspect').value=aspect;const [w,h]=dimension(aspect,Number($('previewQuality').value));canvas.width=w;canvas.height=h;$('canvasInfo').textContent=w+' × '+h;updateExportInfo();renderPreview()}
$('aspect').onchange=()=>{getRatio();scheduleSave()};$('background').oninput=e=>{bg=e.target.value;renderPreview();scheduleSave()};$('resolution').onchange=updateExportInfo;$('fps').onchange=()=>{updateExportInfo();scheduleSave()};getRatio();
async function enableAudio(){
 if(!window.AudioContext)return;
 if(!audioCtx){audioCtx=new AudioContext();audioDest=audioCtx.createMediaStreamDestination()}
 await audioCtx.resume();
 for(const c of clips){
  if(!c.media||c.kind==='image'||audioNodes.get(c.id)?.media===c.media)continue;
  try{const source=mediaSources.get(c.media)||audioCtx.createMediaElementSource(c.media);mediaSources.set(c.media,source);source.disconnect();const gain=audioCtx.createGain(),eq=audioCtx.createBiquadFilter(),clean=audioCtx.createBiquadFilter();clean.type='highpass';clean.frequency.value=10;gain.gain.value=0;c.media.volume=1;source.connect(clean);clean.connect(eq);eq.connect(gain);gain.connect(audioCtx.destination);gain.connect(audioDest);audioNodes.set(c.id,{source,gain,eq,clean,media:c.media})}catch{}
 }
}
function stopExport(canceled=false){
 if(canceled)exportCanceled=true;
 if(exportTimer){clearInterval(exportTimer);exportTimer=null}if(exportRenderTimer){clearInterval(exportRenderTimer);exportRenderTimer=null}
 if(recorder&&recorder.state!=='inactive')try{recorder.stop()}catch{}
 if(canceled){status('Export canceled.');$('exportInfo').textContent='Export canceled.'}
}
$('cancelExport').onclick=()=>stopExport(true);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&exporting){stopExport(true);status('Export stopped because this tab became hidden. Keep the editor visible and export again.')}});
const supportedFormats=[['video/mp4;codecs=avc1.42E01E,mp4a.40.2','MP4 · H.264 / AAC'],['video/webm;codecs=vp9,opus','WebM · VP9 / Opus'],['video/webm;codecs=vp8,opus','WebM · VP8 / Opus']].filter(([mime])=>window.MediaRecorder&&MediaRecorder.isTypeSupported(mime));
for(const [mime,label]of supportedFormats){const option=document.createElement('option');option.value=mime;option.textContent=label;$('exportFormat').append(option)}
if(!supportedFormats.length){$('export').disabled=true;$('exportInfo').textContent='Video recording is unsupported in this browser.'}
$('exportFormat').onchange=updateExportInfo;
function exportDownload(blob,name){
 const url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download=name;a.textContent='↓ Download '+name+' · '+(blob.size/1048576).toFixed(1)+' MB';$('exportResult').replaceChildren(a);a.click();
}
function exportUI(busy){document.querySelectorAll('.studio-workspace button,.studio-workspace input,.studio-workspace select,.studio-workspace textarea,.studio-timeline button,.studio-timeline input,#undo,#redo,#aspect,#resolution,#fps,#background,#export,#exportTop,#exportName,#exportFormat,#exportBitrate,.video-project-bar button,.video-project-bar input,#projectName').forEach(el=>el.disabled=busy);$('cancelExport').disabled=!busy;$('closeExport').disabled=busy}
async function exportVideo(){
 if(exporting||!clips.length)return status('Add at least one layer before exporting.');
 if(clips.some(c=>c.kind!=='text'&&!c.media))return status('Relink missing media before exporting.');
 if(!canvas.captureStream||!window.MediaRecorder)return status('This browser does not support canvas video recording. Try recent Chrome or Edge.');
 const mime=$('exportFormat').value;if(!mime)return status('WebM export codec unavailable in this browser.');
 const seconds=total();if(seconds<=.1)return status('Timeline is too short.');
 const [w,h]=dimension(aspect,Number($('resolution').value));const fps=Number($('fps').value);
 if(w*h>8300000&&!await (await import('./platform/loox-ui.js?v=ui-20261125')).confirmDialog('4K projects can be very demanding and may fail on this device. Try 720p first. Continue?'))return;
 pause();seek(0);const original=[canvas.width,canvas.height];canvas.width=w;canvas.height=h;exporting=true;exportCanceled=false;
 exportUI(true);$('exportResult').replaceChildren();$('exportProgress').value=0;
 try{
  await enableAudio().catch(()=>{});
  syncMedia();await Promise.all(clips.filter(c=>c.media&&c.kind==='video'&&active(c)).map(c=>new Promise(resolve=>{if(c.media.readyState>=2&&!c.media.seeking)return resolve();const timer=setTimeout(resolve,5000);c.media.addEventListener('seeked',()=>{clearTimeout(timer);resolve()},{once:true});c.media.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve()},{once:true})})));
  if(exportCanceled)throw new Error('Export canceled');
  renderPreview();exportStream=canvas.captureStream(0);const captureTrack=exportStream.getVideoTracks()[0];if(!captureTrack.requestFrame){exportStream.getTracks().forEach(t=>t.stop());exportStream=canvas.captureStream(fps)}
  if(audioDest)audioDest.stream.getAudioTracks().forEach(track=>exportStream.addTrack(track));
  const bitrate=clamp(Number($('exportBitrate').value)||8,1,80)*1000000;
  const chunks=[];recorder=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:bitrate,audioBitsPerSecond:192000});
  let canceled=false;
  const oldCancel=$('cancelExport').onclick;
  $('cancelExport').onclick=()=>{canceled=true;stopExport(true)};
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  recorder.onerror=()=>{canceled=true;stopExport();status('Video recorder failed. Try a smaller resolution.')};
  recorder.onstop=async()=>{
   stopExport();pause();canvas.width=original[0];canvas.height=original[1];
   if(exportStream){exportStream.getVideoTracks().forEach(t=>t.stop());exportStream=null}
   if(!canceled&&!exportCanceled&&chunks.length){const recording=new Blob(chunks,{type:recorder.mimeType||mime});const extension=mime.startsWith('video/mp4')?'mp4':'webm',name=($('exportName').value||projectName).replace(/[^a-z0-9 _-]/gi,'_').slice(0,120);exportDownload(recording,name+'-'+w+'x'+h+'.'+extension);$('exportProgress').value=100;status(extension.toUpperCase()+' export complete. Review the file before sharing.')}
   else if(!canceled&&!exportCanceled)status('No recorded data. Try a lower resolution or a different browser.');
   exporting=false;exportUI(false);$('cancelExport').onclick=oldCancel;getRatio();seek(0);showProperties();
  };
  recorder.start(1000);playing=true;playStarted=performance.now();$('play').textContent='Ⅱ Exporting';syncMedia();
  status('Recording '+w+' × '+h+' with '+fps+' fps capture target. Keep this tab active.');
  const capture=exportStream.getVideoTracks()[0];const drawExportFrame=()=>{playhead=Math.min(seconds,(performance.now()-playStarted)/1000);syncMedia();renderPreview();capture.requestFrame?.();$('time').textContent=tc(playhead)+' / '+tc(seconds)};drawExportFrame();exportRenderTimer=setInterval(drawExportFrame,1000/fps);
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
window.addEventListener('pagehide',e=>{if(!e.persisted){pause();urls.forEach(u=>URL.revokeObjectURL(u));if(audioCtx)audioCtx.close().catch(()=>{})}});

async function freezeFrame(c){
 if(!editable()||c.kind!=='video'||!c.media||c.media.readyState<2||c.media.seeking)return status('Seek to a decoded video frame before freezing.');
 const surface=document.createElement('canvas'),ratio=Math.min(1,4096/Math.max(c.media.videoWidth,c.media.videoHeight));surface.width=Math.round(c.media.videoWidth*ratio);surface.height=Math.round(c.media.videoHeight*ratio);surface.getContext('2d').drawImage(c.media,0,0,surface.width,surface.height);const blob=await new Promise(r=>surface.toBlob(r,'image/png'));if(!blob)return status('Frame capture failed.');
 if(exporting)return;snap();const file=new File([blob],c.name+' freeze.png',{type:'image/png'}),url=URL.createObjectURL(file);urls.add(url);const id=nextId++,copy={...Core.clone(c),id,assetId:id,kind:'image',name:c.name+' freeze',start:playhead,duration:1,trimStart:0,sourceDuration:1,layer:4,volume:0,rate:1,animation:{},keys:[],media:createMedia('image',url),file,url};clips.push(copy);mediaLibrary.push(Core.clone(copy));queueAssetPreview(copy);selected=id;refresh();status('Frozen frame added as a one-second overlay. Original clip timing preserved.');
}
function joinDissolve(c){
 if(!editable())return;const previous=clips.filter(x=>x.id!==c.id&&x.layer===c.layer&&x.start<c.start).sort((a,b)=>b.start-a.start)[0];if(!previous||Math.abs(previous.start+previous.duration-c.start)>.05)return status('Place this clip immediately after another clip on the same track first.');
 const length=Math.min(c.transitionDuration||.5,c.duration/2,previous.duration/2);snap();const at=c.start;for(const x of clips.filter(x=>x.layer===c.layer&&x.start>=at))x.start=Math.max(0,x.start-length);c.transition='fade';c.fade=0;c.transitionDuration=length;refresh();status('Created a '+length.toFixed(2)+'s overlapping dissolve. Following clips moved on this track.');
}

function advancedInspector(c,el){
 const box=document.createElement('section');box.className='video-advanced';
 if(inspectorTab==='basic'&&c.kind!=='audio'){
 box.innerHTML='<h3>Motion keyframes</h3>'+field('Animate','animateProperty',opts(Core.animated.filter(p=>p!=='volume').map(p=>[p,p]),'x'),'select')+field('Interpolation','animateEase',opts([['linear','Linear'],['ease-in','Ease in'],['ease-out','Ease out'],['ease-in-out','Smooth']],c.animationEase||'linear'),'select')+'<p class="studio-section-note">Change a property above, then set its keyframe at the playhead. Keys use clip-local time.</p><div class="studio-button-row"><button id="previousKey">Previous</button><button id="setMotionKey">Set keyframe</button><button id="nextKey">Next</button><button id="removeMotionKey">Remove keyframe</button></div><div id="motionKeyList"></div>';
 box.innerHTML+='<h3>Compositing</h3>'+field('Mask','mask',opts([['none','None'],['circle','Ellipse'],['diamond','Diamond']],c.mask||'none'),'select')+field('Blend','blend',opts([['source-over','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['lighten','Lighten'],['darken','Darken']],c.blend||'source-over'),'select')+field('Round corners','radius',c.radius||0,'range',0,.5,.01)+'<div class="studio-button-row"><button id="flipHorizontal">Flip H</button><button id="flipVertical">Flip V</button></div>';
 }else if(inspectorTab==='audio'&&['audio','video'].includes(c.kind)){
 box.innerHTML='<h3>Audio envelope</h3>'+field('Fade in (s)','audioFadeIn',c.audioFadeIn||0,'number',0,30,.1)+field('Fade out (s)','audioFadeOut',c.audioFadeOut||0,'number',0,30,.1);
 if(c.kind==='video')box.innerHTML+='<button id="detachAudio">Detach audio</button>';
 }else if(inspectorTab==='color'&&c.kind!=='audio')box.innerHTML='<button id="beforeAfter">Hold to view original color</button>';
 if(inspectorTab==='color'&&c.kind!=='audio')box.innerHTML+=field('Motion / texture effect','visualEffect',opts([['none','None'],['shake','Camera shake'],['pulse','Zoom pulse'],['glow','Glow'],['pixelate','Pixelate']],c.visualEffect||'none'),'select')+field('Effect strength','effectAmount',c.effectAmount??.5,'range',0,1,.01);
 if(inspectorTab==='basic'&&c.kind==='video')box.innerHTML+='<h3>Clip tools</h3><button id="freezeFrame">Freeze frame overlay</button><button id="joinDissolve">Dissolve with previous</button>'+field('Dissolve length (s)','transitionDuration',c.transitionDuration||.5,'number',.05,5,.05);
 el.append(box);
 if(box.querySelector('#freezeFrame'))box.querySelector('#freezeFrame').onclick=()=>freezeFrame(c);
 if(box.querySelector('#joinDissolve'))box.querySelector('#joinDissolve').onclick=()=>joinDissolve(c);
 const prop=box.querySelector('[data-prop="animateProperty"]'),ease=box.querySelector('[data-prop="animateEase"]');
 const keyList=()=>{const list=box.querySelector('#motionKeyList');if(!list)return;list.replaceChildren();for(const key of c.animation?.[prop.value]||[]){const b=document.createElement('button');b.textContent=tc(key.t)+' · '+key.v.toFixed(2);b.onclick=()=>{pause();seek(c.start+key.t)};list.append(b)}};
 if(prop){prop.onchange=keyList;keyList();box.querySelector('#setMotionKey').onclick=()=>{if(!editable())return;snap();const p=prop.value,t=clamp(playhead-c.start,0,c.duration);c.animation||={};c.animation[p]=(c.animation[p]||[]).filter(k=>Math.abs(k.t-t)>.5/Number($('fps').value));c.animation[p].push({t,v:c[p]??(p==='scale'?1:0),ease:ease.value});c.animation[p].sort((a,b)=>a.t-b.t);keyList();renderPreview();scheduleSave()};
 box.querySelector('#removeMotionKey').onclick=()=>{if(!editable())return;snap();const p=prop.value,t=playhead-c.start;if(c.animation?.[p])c.animation[p]=c.animation[p].filter(k=>Math.abs(k.t-t)>.5/Number($('fps').value));keyList();renderPreview();scheduleSave()};
 for(const [id,dir]of [['previousKey',-1],['nextKey',1]])box.querySelector('#'+id).onclick=()=>{const keys=c.animation?.[prop.value]||[],t=playhead-c.start;const k=dir<0?keys.filter(k=>k.t<t-.001).at(-1):keys.find(k=>k.t>t+.001);if(k){pause();seek(c.start+k.t)}};
 }
 for(const input of box.querySelectorAll('[data-prop]')){if(input===prop||input===ease)continue;input.onfocus=()=>{if(editable())snap()};input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{if(!editable())return;c[input.dataset.prop]=input.tagName==='SELECT'?input.value:Number(input.value);renderPreview();scheduleSave()})}
 for(const [id,key]of [['flipHorizontal','flipX'],['flipVertical','flipY']])if(box.querySelector('#'+id))box.querySelector('#'+id).onclick=()=>{if(!editable())return;snap();c[key]=-(c[key]||1);renderPreview();scheduleSave()};
 if(box.querySelector('#detachAudio'))box.querySelector('#detachAudio').onclick=()=>{if(!editable())return;snap();const a={...Core.clone(c),id:nextId++,kind:'audio',layer:2,name:c.name+' · detached audio',media:createMedia('audio',c.url)};c.volume=0;clips.push(a);selected=a.id;refresh();status('Audio detached. Original video muted; timing and speed preserved.')};
 if(box.querySelector('#beforeAfter')){const b=box.querySelector('#beforeAfter');let old=null;const reset=()=>{if(old){Object.assign(c,old);old=null;renderPreview()}};b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);old={filter:c.filter,brightness:c.brightness,contrast:c.contrast,saturation:c.saturation,temperature:c.temperature,blur:c.blur};Object.assign(c,{filter:'none',brightness:1,contrast:1,saturation:1,temperature:0,blur:0});renderPreview()};b.onpointerup=reset;b.onpointercancel=reset;}
 if(trackState(c.layer).locked)box.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);
}
function projectData(){return {version:2,name:projectName,aspect,bg,fps:Number($('fps').value),markers,clips:clips.map(c=>{const clean=Core.clone(c);for(const k of ['media','url','file','_starting'])delete clean[k];return clean}),assets:mediaLibrary.map(a=>({id:a.assetId,name:a.name,kind:a.kind,size:a.file?.size,lastModified:a.file?.lastModified})),tracks:tracks.map(t=>({...t,state:{...trackState(t.id)}}))}}
// Bounded, asynchronous source previews. Peaks are real decoded audio, never decorative bars.
const assetPreviews=new Map();let previewQueue=Promise.resolve();
function queueAssetPreview(asset){if(assetPreviews.has(asset.assetId))return;const cached={};assetPreviews.set(asset.assetId,cached);previewQueue=previewQueue.then(async()=>{
 try{
 if(asset.kind==='video'||asset.kind==='image'){
 const m=createMedia(asset.kind,asset.url);await waitMeta(m,asset.kind);
 if(asset.kind==='video')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Thumbnail timeout')),5000);m.onseeked=()=>{clearTimeout(timer);resolve()};m.currentTime=Math.min(.15,m.duration/2)});
 const surface=document.createElement('canvas');surface.width=128;surface.height=72;surface.getContext('2d').drawImage(m,0,0,128,72);cached.thumbnail=surface.toDataURL('image/jpeg',.65);if(asset.kind==='video'){m.pause();m.removeAttribute('src');m.load()}
 }
 if(['audio','video'].includes(asset.kind)&&asset.file?.size<=24000000&&window.OfflineAudioContext){
 const decoder=new OfflineAudioContext(1,1,44100),audio=await decoder.decodeAudioData(await asset.file.arrayBuffer()),samples=audio.getChannelData(0),step=Math.max(1,Math.ceil(samples.length/512));cached.peaks=[];
 for(let i=0;i<samples.length;i+=step){let peak=0;for(let j=i;j<Math.min(samples.length,i+step);j+=8)peak=Math.max(peak,Math.abs(samples[j]));cached.peaks.push(peak)}
 }
 }catch{/* Unsupported decoding leaves the source usable; no invented waveform. */}
 if(mediaLibrary.some(a=>a.assetId===asset.assetId)){showMediaBin();if(!playing&&!exporting)renderTimeline()}
 }).catch(()=>{});
}
function adaptTimeline(){const mobile=matchMedia('(max-width:700px)').matches,workspace=document.querySelector('.studio-workspace'),timeline=document.querySelector('.studio-timeline');if(mobile)workspace.append(timeline);else workspace.after(timeline)}
matchMedia('(max-width:700px)').addEventListener('change',adaptTimeline);adaptTimeline();

let projectId=crypto.randomUUID(),projectDirty=false,loadingProject=false,saveRevision=0;
function dbRequest(mode,action){return new Promise((resolve,reject)=>{if(!projectDB)return reject(new Error('Local project storage unavailable'));const tx=projectDB.transaction('projects',mode);let result;const r=action(tx.objectStore('projects'));if(r)r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save interrupted'))})}
function scheduleSave(){if(loadingProject||exporting)return;projectDirty=true;saveRevision++;clearTimeout(saveTimer);$('saveState').textContent='Unsaved changes';saveTimer=setTimeout(saveProject,1200)}
async function saveProject(){if(loadingProject||!projectDirty)return;clearTimeout(saveTimer);try{const revision=saveRevision,data=projectData();await dbRequest('readwrite',s=>s.put({id:projectId,updated:Date.now(),data,files:mediaLibrary.map(a=>({id:a.assetId,file:a.file})).filter(a=>a.file)}));if(revision===saveRevision){projectDirty=false;$('saveState').textContent='Saved on this device'}return true}catch(error){$('saveState').textContent='Save failed · download project';status('Local save failed: '+error.message+'. Download the project and keep your source files.');return false}}
async function openProject(record){
 if(exporting)return;const data=Core.validateProject(record.data);pendingRelink=record.data.assets||[];loadingProject=true;pause();
 try{
 const files=new Map((record.files||[]).map(a=>[a.id,a.file])),assets=[];
 for(const a of (record.data.assets||[]).slice(0,1000)){
  const file=files.get(a.id);if(!file)continue;
  const url=URL.createObjectURL(file);urls.add(url);const kind=/^video\//.test(file.type)?'video':/^audio\//.test(file.type)?'audio':/^image\//.test(file.type)?'image':null;if(!kind){URL.revokeObjectURL(url);continue}
  const media=createMedia(kind,url);try{await waitMeta(media,kind)}catch{URL.revokeObjectURL(url);continue}
  assets.push({...baseProps(kind,file.name),assetId:a.id,url,file,media,sourceDuration:kind==='image'?5:media.duration});
 }
 clips.forEach(c=>c.media?.pause?.());audioNodes.forEach(n=>{n.gain.disconnect();n.source.disconnect()});audioNodes.clear();
 assetPreviews.clear();pixelSurfaces.clear();mediaLibrary.splice(0,mediaLibrary.length,...assets);assets.forEach(queueAssetPreview);clips.splice(0,clips.length,...data.clips.map(raw=>{const a=assets.find(a=>a.assetId===raw.assetId);const c={...baseProps(raw.kind,raw.name),...raw};if(a){c.file=a.file;c.url=a.url;c.media=createMedia(raw.kind,a.url);if(raw.kind!=='image')c.media.addEventListener('seeked',()=>{if(!playing)renderPreview()})}return c}));
 trackStates.clear();const savedTracks=Array.isArray(record.data.tracks)?record.data.tracks.filter(t=>Number.isInteger(t.id)&&t.id>=0&&t.id<=10000&&['video','audio'].includes(t.kind)).slice(0,100):[];tracks.splice(0,tracks.length,...(savedTracks.length?savedTracks.map(t=>({id:t.id,name:String(t.name).slice(0,60),kind:t.kind})):[{id:0,name:'Video 1',kind:'video'},{id:4,name:'Video 2',kind:'video'},{id:7,name:'Titles',kind:'video'},{id:2,name:'Audio 1',kind:'audio'},{id:3,name:'Audio 2',kind:'audio'}]));savedTracks.forEach(t=>trackStates.set(t.id,{locked:!!t.state?.locked,hidden:!!t.state?.hidden,solo:!!t.state?.solo}));
 nextId=Math.max(0,...clips.map(c=>c.id),...assets.map(a=>a.assetId))+1;projectId=record.id||crypto.randomUUID();projectName=data.name;aspect=data.aspect;bg=data.bg;markers=data.markers;$('projectName').value=projectName;$('fps').value=data.fps;$('aspect').value=aspect;$('background').value=bg;selected=null;history.length=0;future.length=0;getRatio();seek(0);refresh();
 const retained=new Set(assets.map(a=>a.url));for(const url of urls)if(!retained.has(url)){URL.revokeObjectURL(url);urls.delete(url)}
 const missing=clips.filter(c=>c.kind!=='text'&&!c.media).length;status(missing?missing+' clip(s) need source files. Use Relink media to select the original files.':'Project restored with local media.');$('saveState').textContent=missing?'Relink source media':'Saved on this device';projectDirty=false;
 }finally{loadingProject=false}
}
async function listProjects(){const root=$('recentProjects');root.replaceChildren();try{const records=await dbRequest('readonly',s=>s.getAll());records.sort((a,b)=>b.updated-a.updated);for(const record of records){const b=document.createElement('button');b.textContent=String(record.data.name)+' · '+new Date(record.updated).toLocaleString();b.onclick=async()=>{if(projectDirty&&!await saveProject())return;try{await openProject(record);$('projectDialog').close()}catch(e){status(e.message)}};root.append(b)}if(!records.length)root.textContent='No saved projects on this device.'}catch(e){root.textContent=e.message}}
$('projectName').onchange=()=>{projectName=$('projectName').value.trim().slice(0,120)||'Untitled project';$('projectName').value=projectName;scheduleSave()};
$('saveProject').onclick=saveProject;
$('recentButton').onclick=()=>{listProjects();$('projectDialog').showModal()};
$('closeProjects').onclick=()=>$('projectDialog').close();
$('newProject').onclick=async()=>{if(exporting)return;if(projectDirty&&!await saveProject())return;await openProject({data:{version:2,name:'Untitled project',clips:[],assets:[]}});scheduleSave()};
$('duplicateProject').onclick=()=>{projectId=crypto.randomUUID();projectName+=' copy';$('projectName').value=projectName;scheduleSave();saveProject()};
$('downloadProject').onclick=()=>{const blob=new Blob([JSON.stringify(projectData(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=projectName.replace(/[^a-z0-9 _-]/gi,'_')+'.loox.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('Project downloaded. Keep original media; the project file contains editing instructions only.')};
$('importProject').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>8000000)throw new Error('Project file exceeds 8 MB');const data=JSON.parse(await f.text());Core.validateProject(data);if(projectDirty&&!await saveProject())return;await openProject({data});pendingRelink=data.assets||[];scheduleSave()}catch(error){status('Cannot open project: '+error.message)}};
let pendingRelink=[];
$('relinkMedia').onchange=async e=>{if(exporting)return;const files=Array.from(e.target.files||[]);e.target.value='';let count=0;for(const file of files){const a=pendingRelink.find(a=>a.name===file.name&&(!a.size||a.size===file.size));if(!a||!/^video\/|^audio\/|^image\//.test(file.type))continue;const kind=file.type.split('/')[0],url=URL.createObjectURL(file);urls.add(url);const media=createMedia(kind,url);try{await waitMeta(media,kind)}catch{URL.revokeObjectURL(url);continue}mediaLibrary.push({...baseProps(kind,file.name),assetId:a.id,url,file,media,sourceDuration:kind==='image'?5:media.duration});for(const c of clips.filter(c=>c.assetId===a.id)){c.url=url;c.file=file;c.media=createMedia(c.kind,url);count++}pendingRelink=pendingRelink.filter(x=>x.id!==a.id)}refresh();status('Relinked '+count+' timeline clip(s).');scheduleSave()};
if(window.indexedDB){const request=indexedDB.open('loox-video-studio-2',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects',{keyPath:'id'});request.onsuccess=()=>{projectDB=request.result;projectDB.onversionchange=()=>projectDB.close();$('saveState').textContent='Local autosave ready';};request.onerror=()=>{$('saveState').textContent='Local storage unavailable'}}
window.addEventListener('beforeunload',e=>{if(projectDirty){e.preventDefault();e.returnValue=''}});
$('mediaSearch').oninput=showMediaBin;
$('addMarker').onclick=()=>{if(exporting)return;markers.push(playhead);markers=[...new Set(markers)].sort((a,b)=>a-b);drawRuler();scheduleSave()};
$('removeGaps').onclick=()=>{const c=getSelected();if(!c||!editable())return status('Select a clip on the track to close its gaps.');snap();let end=0;for(const x of clips.filter(x=>x.layer===c.layer).sort((a,b)=>a.start-b.start)){x.start=Math.min(x.start,end);end=Math.max(end,x.start+x.duration)}refresh()};
$('fullscreenPreview').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('previewShell').requestFullscreen()}catch{status('Fullscreen preview is unavailable in this browser.')}};
$('toggleLibrary').onclick=()=>document.body.classList.toggle('hide-video-library');
$('toggleInspector').onclick=()=>document.body.classList.toggle('hide-video-inspector');
$('safeZones').onchange=renderPreview;
document.addEventListener('keydown',e=>{if(/input|textarea|select/i.test(e.target.tagName)||exporting)return;if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='c'||e.key.toLowerCase()==='x'){const c=getSelected();if(!c)return;e.preventDefault();clipboard=Core.clone(c);if(e.key.toLowerCase()==='x')removeSelected()}if(e.key.toLowerCase()==='v'&&clipboard){e.preventDefault();if(trackState(clipboard.layer).locked)return;snap();const c={...Core.clone(clipboard),id:nextId++,start:playhead};if(c.url)c.media=createMedia(c.kind,c.url);clips.push(c);selected=c.id;refresh()}if(e.key.toLowerCase()==='s'){e.preventDefault();saveProject()}}else if(e.key.toLowerCase()==='b')split();else if(e.key.toLowerCase()==='i')$('addMarker').click()});

showLayers();showProperties();renderTimeline();setTab('video');status('Ready. Import video, image or audio, or paste/drag media into the editor.');
})();


