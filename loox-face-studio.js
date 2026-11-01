/* LOOX Face Blur Studio — all image edits remain inside the browser. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('faceCanvas'), ctx = canvas.getContext('2d', {willReadFrequently:false});
  const upload = $('faceUpload'), fileInput = $('faceFile'), editor = $('faceEditor');
  const status = $('faceStatus'), tools = $('faceTools'), sheetBackdrop = $('faceSheetBackdrop');
  const autoButton = $('faceAuto'), autoMobile = $('faceMobileAuto');
  const brushSlider = $('faceBrushSize'), strengthSlider = $('faceBlurStrength');
  const brushOut = $('faceBrushOut'), strengthOut = $('faceStrengthOut');
  const undoButton = $('faceUndo'), redoButton = $('faceRedo');
  const mobileUndo = $('faceMobileUndo'), mobileSave = $('faceMobileSave');
  const preview = $('faceBrushPreview'), stage = $('faceStage');
  let original = null, sourceName = 'loox-face-blurred', history = [], future = [];
  let editing = false, lastPoint = null, strokeLayer = null, activePointer = null;
  let cropRect=null,cropDrag=null;
  let editMode = "blur"; // "blur" paints a softened image; "erase" restores original pixels.
  let detectorPromise = null, fallbackPromise = null, detecting = false, currentLoad = 0;
  const mobile = () => window.matchMedia('(max-width:800px)').matches;
  // Define mobile() before it is called: otherwise the entire editor fails to initialize.
  const HISTORY_LIMIT = mobile() ? 3 : 5;
  const allowPointer = e => e.pointerType !== 'mouse' || e.button === 0;

  function feedback(text, kind = '') {
    status.textContent = text;
    status.className = 'loox-face-status' + (kind ? ' ' + kind : '');
    status.hidden = false;
  }
  function updateButtons() {
    for (const b of [undoButton, mobileUndo]) b.disabled = history.length === 0;
    redoButton.disabled = future.length === 0;
  }
  function snapshot() {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    c.getContext('2d').drawImage(canvas,0,0);
    return c;
  }
  function saveUndo() {
    history.push(snapshot());
    if (history.length > HISTORY_LIMIT) history.shift();
    future = [];
    updateButtons();
  }
  function restore(snap) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(snap,0,0);
  }
  function undo() {
    if (!history.length || editing || detecting) return;
    future.push(snapshot()); restore(history.pop()); updateButtons();
    feedback('Undone. Your previous edit is restored.');
  }
  function redo() {
    if (!future.length || editing || detecting) return;
    history.push(snapshot()); if (history.length > HISTORY_LIMIT) history.shift();
    restore(future.pop()); updateButtons(); feedback('Edit restored.');
  }
  function reset() {
    if (!original || editing || detecting) return;
    saveUndo(); restore(original); feedback('Back to your original photo.');
  }
  function fitHeader() {
    const header = document.querySelector('.loox-tool-nav-header,.loox-unified-header,.loox-appbar,.topbar');
    document.documentElement.style.setProperty('--loox-face-header', Math.max(0,Math.round(header?.getBoundingClientRect().height || 0)) + 'px');
  }
  async function load(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024) {
      feedback('Choose a JPG, PNG or WebP image no larger than 20 MB.', 'error');return;
    }
    const serial = ++currentLoad;
    feedback('Opening photo…');
    try {
      const bitmap = await createImageBitmap(file);
      if (serial !== currentLoad) { bitmap.close();return; }
      if (bitmap.width * bitmap.height > 20000000) throw new Error('Use a photo under 20 megapixels for smooth editing.');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      ctx.drawImage(bitmap,0,0);
      original = snapshot();
      cropRect=null;$('faceCropFrame').hidden=true;document.body.classList.remove('loox-face-cropping');
      if (typeof bitmap.close === 'function') bitmap.close();
      sourceName = (file.name.replace(/\.[^.]+$/,'') || 'loox-face-blurred').slice(0,90);
      history = [];future = []; updateButtons();
      upload.hidden = true; editor.hidden = false;
      document.body.classList.add('loox-face-ready');
      requestAnimationFrame(fitCanvas);
      closeSheet();
      fitHeader();
      feedback('Photo ready. Tap AI Faces to automatically blur every detected face, or select Brush for manual edits.', 'success');
    } catch(e) {
      feedback(e.message || 'Unable to open this photo.', 'error');
    }
  }
  upload.addEventListener('click', e => {if (e.target !== fileInput) fileInput.click()});
  upload.addEventListener('keydown', e => {if(e.key === 'Enter'||e.key===' '){e.preventDefault();fileInput.click()}});
  upload.addEventListener('dragover', e => {e.preventDefault();upload.classList.add('is-dragging')});
  upload.addEventListener('dragleave', () => upload.classList.remove('is-dragging'));
  upload.addEventListener('drop', e => {e.preventDefault();upload.classList.remove('is-dragging');load(e.dataTransfer.files?.[0])});
  fileInput.addEventListener('change', e => load(e.target.files?.[0]));
  $('faceChange').addEventListener('click', () => {fileInput.value = '';fileInput.click()});

  function setBrush(v) {
    brushSlider.value = Math.max(+brushSlider.min,Math.min(+brushSlider.max,Number(v)||60));
    brushOut.textContent = brushSlider.value;
    document.querySelectorAll('[data-face-brush-preset]').forEach(b => {
      b.setAttribute('aria-pressed',String(Number(b.dataset.faceBrushPreset) === Number(brushSlider.value)));
    });
    movePreview(null);
  }
  brushSlider.addEventListener('input', e => setBrush(e.target.value));
  document.querySelectorAll('[data-face-brush-preset]').forEach(b => b.addEventListener('click',() => setBrush(b.dataset.faceBrushPreset)));
  strengthSlider.addEventListener('input',e => strengthOut.textContent = e.target.value);
  setBrush(70);

  function fitCanvas() {
    if (!original || editor.hidden) return;
    const styles = getComputedStyle(stage);
    const availableWidth = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const availableHeight = stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    if (availableWidth <= 0 || availableHeight <= 0) return;
    const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
    canvas.style.width = Math.floor(canvas.width * scale) + 'px';
    canvas.style.height = Math.floor(canvas.height * scale) + 'px';
    movePreview(null);
    positionFaceCrop();
  }
  new ResizeObserver(() => requestAnimationFrame(fitCanvas)).observe(stage);

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {x:Math.max(0,Math.min(canvas.width,(e.clientX-r.left)*canvas.width/Math.max(1,r.width))),
            y:Math.max(0,Math.min(canvas.height,(e.clientY-r.top)*canvas.height/Math.max(1,r.height)))};
  }
  function brushRadius() {
    return (+brushSlider.value/2)*canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
  }
  function blurPx() {
    const scale=canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
    return Math.max(4,Math.min(160,+strengthSlider.value*Math.sqrt(Math.max(1,scale))));
  }
  function blurSnapshot(source, intensity) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const block = Math.max(12, Math.round(intensity / 2));
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.ceil(canvas.width / block));
    small.height = Math.max(1, Math.ceil(canvas.height / block));
    small.getContext('2d').drawImage(source, 0, 0, small.width, small.height);
    const cctx = c.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    return c;
  }
  function paintSegment(a,b) {
    if (!strokeLayer) return;
    const r=brushRadius();
    const l=Math.max(0,Math.floor(Math.min(a.x,b.x)-r-2));
    const t=Math.max(0,Math.floor(Math.min(a.y,b.y)-r-2));
    const right=Math.min(canvas.width,Math.ceil(Math.max(a.x,b.x)+r+2));
    const bottom=Math.min(canvas.height,Math.ceil(Math.max(a.y,b.y)+r+2));
    if(right<=l||bottom<=t)return;
    ctx.save();
    ctx.beginPath();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=r*2;
    ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#fff';
    ctx.clip(new Path2D(strokePath(a,b,r)));
    ctx.drawImage(strokeLayer,l,t,right-l,bottom-t,l,t,right-l,bottom-t);
    ctx.restore();
  }
  // A simple capsule silhouette keeps blurred pixels only inside the painted path.
  // Canvas Path2D SVG is supported on desktop and current mobile browsers.
  function strokePath(a,b,r) {
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
    if(dist<0.01) {
      return 'M '+(a.x+r)+' '+a.y+' A '+r+' '+r+' 0 1 0 '+(a.x-r)+' '+a.y+' A '+r+' '+r+' 0 1 0 '+(a.x+r)+' '+a.y+' Z';
    }
    const px=-dy/dist*r,py=dx/dist*r;
    return 'M '+(a.x+px)+' '+(a.y+py)+' L '+(b.x+px)+' '+(b.y+py)+
      ' A '+r+' '+r+' 0 0 1 '+(b.x-px)+' '+(b.y-py)+
      ' L '+(a.x-px)+' '+(a.y-py)+' A '+r+' '+r+' 0 0 1 '+(a.x+px)+' '+(a.y+py)+' Z';
  }
  function movePreview(e) {
    if (!e || !original || !document.body.classList.contains('loox-face-brush-mode')) {
      preview.hidden = true;return;
    }
    const r=canvas.getBoundingClientRect(),container=stage.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){
      preview.hidden=true;return;
    }
    const size=+brushSlider.value;
    preview.hidden=false;
    preview.style.width=size+'px';preview.style.height=size+'px';
    preview.style.left=(e.clientX-container.left)+'px';
    preview.style.top=(e.clientY-container.top)+'px';
  }
  function setMode(mode) {
    editMode = mode === 'erase' ? 'erase' : 'blur';
    document.body.classList.add('loox-face-brush-mode');
    document.body.classList.toggle('loox-face-erase-mode',editMode === 'erase');
    const selection = [
      ['faceMobileBrush','blur'],['faceMobileErase','erase'],
      ['faceToolBrush','blur'],['faceToolErase','erase']
    ];
    for(const [id,action] of selection){
      const b=$(id),selected=editMode===action;
      b.classList.toggle('active',selected);
      b.setAttribute('aria-pressed',String(selected));
    }
    preview.hidden=true;
    if(original)feedback(editMode==='erase'
      ? 'Erase Blur selected. Paint on blurred areas to restore the original details.'
      : 'Blur Brush selected. Paint over areas to blur them.');
  }
  canvas.addEventListener('pointerdown',e => {
    if(cropRect)return; // Ignore touches on the image outside the crop frame.
    if(!original||detecting||!allowPointer(e)||!document.body.classList.contains('loox-face-brush-mode'))return;
    e.preventDefault(); if(editing)return;
    saveUndo();
    strokeLayer=editMode==='erase' ? original : blurSnapshot(canvas,blurPx());
    editing=true;activePointer=e.pointerId;lastPoint=point(e);
    try{canvas.setPointerCapture(e.pointerId)}catch{}
    paintSegment(lastPoint,lastPoint);movePreview(e);
  });
  canvas.addEventListener('pointermove',e=>{
    movePreview(e);
    if(!editing||activePointer!==e.pointerId)return;
    e.preventDefault();const p=point(e);paintSegment(lastPoint,p);lastPoint=p;
  },{passive:false});
  function endStroke(e) {
    if(activePointer!==e.pointerId)return;
    editing=false;activePointer=null;lastPoint=null;strokeLayer=null;movePreview(e);
    feedback(editMode==='erase' ? 'Blur erased in the selected area. Undo is available.' : 'Blur applied. Brush another area or download the image.', 'success');
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,endStroke);
  canvas.addEventListener('pointerleave',()=>movePreview(null));
  canvas.addEventListener('pointerenter',movePreview);
  $('faceToolBrush').addEventListener('click',()=>setMode('blur'));
  $('faceToolErase').addEventListener('click',()=>setMode('erase'));
  undoButton.addEventListener('click',undo);redoButton.addEventListener('click',redo);
  mobileUndo.addEventListener('click',undo);
  $('faceReset').addEventListener('click',reset);

  async function mediaPipeDetector() {
    if(!detectorPromise){
      detectorPromise=(async()=>{
        const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs');
        const files=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
        return vision.FaceDetector.createFromOptions(files,{
          baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'},
          runningMode:'IMAGE',minDetectionConfidence:0.5,minSuppressionThreshold:0.3
        });
      })().catch(e=>{detectorPromise=null;throw e});
    }
    return detectorPromise;
  }
  async function faceApiDetector() {
    if(!fallbackPromise){
      fallbackPromise=(async()=>{
        if(!window.faceapi){
          await new Promise((resolve,reject)=>{
            const s=document.createElement('script');
            s.src='https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
            s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(new Error('face-api.js could not load'));
            document.head.append(s);
          });
        }
        if(!window.faceapi)throw new Error('face-api.js was unavailable');
        // CPU works on browsers and devices where WebGL is disabled.
        if (window.faceapi.tf?.setBackend) {
          await window.faceapi.tf.setBackend('cpu');
          await window.faceapi.tf.ready();
        }
        if(!window.faceapi.nets.tinyFaceDetector.isLoaded){
          await window.faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model');
        }
        return window.faceapi;
      })().catch(e=>{fallbackPromise=null;throw e});
    }
    return fallbackPromise;
  }
  function detectionCanvas() {
    const c=document.createElement('canvas');
    const scale=Math.min(1,1280/Math.max(canvas.width,canvas.height));
    c.width=Math.max(1,Math.round(canvas.width*scale));
    c.height=Math.max(1,Math.round(canvas.height*scale));
    c.getContext('2d').drawImage(original,0,0,c.width,c.height);
    return c;
  }
  async function detectFaces() {
    const small=detectionCanvas(), sx=canvas.width/small.width,sy=canvas.height/small.height;
    let faces=[], engine='MediaPipe', errors=[];
    try{
      const detector=await mediaPipeDetector();
      const result=detector.detect(small);
      faces=(result?.detections||[]).map(d=>{
        const b=d.boundingBox;
        return b?{x:b.originX*sx,y:b.originY*sy,w:b.width*sx,h:b.height*sy}:null;
      }).filter(Boolean);
    }catch(e){errors.push('MediaPipe: '+(e?.message||'unavailable'))}
    if(!faces.length){
      try{
        const api=await faceApiDetector();
        const detections=await api.detectAllFaces(small,new api.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.65}));
        faces=detections.map(d=>({x:d.box.x*sx,y:d.box.y*sy,w:d.box.width*sx,h:d.box.height*sy}));
        engine='face-api.js';
      }catch(e){errors.push('face-api.js: '+(e?.message||'unavailable'))}
    }
    return {faces,engine,errors};
  }
  function autoBlurFaces(faces) {
    if (!faces.length) return;
    saveUndo();
    // Work from the unedited snapshot for every detection. Reducing a face to
    // roughly eight samples across removes identifying detail even when canvas
    // filters are unavailable on the device.
    const starting = snapshot();
    for (const box of faces) {
      if (![box.x, box.y, box.w, box.h].every(Number.isFinite) || box.w <= 0 || box.h <= 0) continue;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const rx = box.w * .7, ry = box.h * .78;
      const left = Math.max(0, Math.floor(cx - rx)), top = Math.max(0, Math.floor(cy - ry));
      const right = Math.min(canvas.width, Math.ceil(cx + rx));
      const bottom = Math.min(canvas.height, Math.ceil(cy + ry));
      const width = right - left, height = bottom - top;
      if (width <= 0 || height <= 0) continue;
      const samplesX = Math.max(1, Math.ceil(box.w / Math.max(12, box.w / 8)));
      const samplesY = Math.max(1, Math.round(samplesX * height / width));
      const small = document.createElement('canvas');
      small.width = samplesX; small.height = samplesY;
      small.getContext('2d').drawImage(starting, left, top, width, height, 0, 0, samplesX, samplesY);
      const mosaic = document.createElement('canvas');
      mosaic.width = width; mosaic.height = height;
      const mc = mosaic.getContext('2d');
      mc.imageSmoothingEnabled = false;
      mc.drawImage(small, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(mosaic, left, top);
      ctx.restore();
    }
  }
  async function runAuto(){
    if(!original||detecting||editing)return;
    detecting=true;autoButton.disabled=true;autoMobile.disabled=true;closeSheet();
    feedback('AI is finding faces on your device. Downloading detection models if needed…');
    try{
      // Yield one frame so the loading status appears before synchronous inference.
      await new Promise(requestAnimationFrame);
      const {faces,engine,errors}=await detectFaces();
      if(!faces.length){
        feedback(errors.length===2?'AI detection could not load: '+errors.join('; ')+'. Use the manual brush.':'No faces found. Try a clearer photo or use the manual brush.', 'error');
        return;
      }
      autoBlurFaces(faces);
      feedback('Blurred '+faces.length+' detected face'+(faces.length===1?'':'s')+' with '+engine+'. Check the full photo before sharing.', 'success');
    }catch(e){
      feedback('AI blur failed: '+(e?.message||'unknown error')+'. Your photo is safe; use Brush instead.','error');
    }finally{
      detecting=false;autoButton.disabled=false;autoMobile.disabled=false;updateButtons();
    }
  }
  autoButton.addEventListener('click',runAuto);autoMobile.addEventListener('click',runAuto);
  function download(){
    if(!original||editing||detecting)return;
    canvas.toBlob(blob=>{
      if(!blob){feedback('Could not export the image. Try again.', 'error');return}
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=sourceName+'-face-blur.png';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      feedback('Image exported as PNG. Review the file at full size before sharing.', 'success');
    },'image/png');
  }

  const faceCropFrame=$('faceCropFrame'),cropActions=$('faceCropActions');
  function positionFaceCrop(){
    if(!cropRect||!original){faceCropFrame.hidden=true;return}
    const r=canvas.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
    const x=r.width/canvas.width,y=r.height/canvas.height;
    faceCropFrame.hidden=false;
    faceCropFrame.style.left=(r.left-stageRect.left+cropRect.x*x)+'px';
    faceCropFrame.style.top=(r.top-stageRect.top+cropRect.y*y)+'px';
    faceCropFrame.style.width=(cropRect.w*x)+'px';
    faceCropFrame.style.height=(cropRect.h*y)+'px';
  }
  function cancelFaceCrop(){
    cropRect=null;cropDrag=null;faceCropFrame.hidden=true;cropActions.hidden=true;
    document.body.classList.remove('loox-face-cropping');$('faceCropStart').hidden=false;
    $('faceMobileCrop').classList.remove('active');
  }
  function startFaceCrop(){
    if(!original||editing||detecting)return;
    const m=.06;cropRect={x:Math.round(canvas.width*m),y:Math.round(canvas.height*m),w:Math.round(canvas.width*(1-2*m)),h:Math.round(canvas.height*(1-2*m))};
    document.body.classList.add('loox-face-cropping');$('faceCropStart').hidden=true;cropActions.hidden=false;
    $('faceMobileCrop').classList.add('active');closeSheet();positionFaceCrop();
    feedback('Crop: drag inside the frame to move, or pull an edge to resize. Outside taps do nothing.');
  }
  $('faceCropStart').addEventListener('click',startFaceCrop);
  $('faceMobileCrop').addEventListener('click',()=>{
    if(cropRect){if(mobile())openSheet('crop');else cancelFaceCrop()}
    else {startFaceCrop();if(mobile())openSheet('crop')}
  });
  $('faceCropCancel').addEventListener('click',()=>{cancelFaceCrop();closeSheet()});
  $('faceCropApply').addEventListener('click',()=>{
    if(!cropRect||editing||detecting)return;
    const x=Math.max(0,Math.round(cropRect.x)),y=Math.max(0,Math.round(cropRect.y));
    const w=Math.min(canvas.width-x,Math.max(1,Math.round(cropRect.w))),h=Math.min(canvas.height-y,Math.max(1,Math.round(cropRect.h)));
    if(w<2||h<2)return;
    const cropped=document.createElement('canvas');cropped.width=w;cropped.height=h;cropped.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);
    const orig=document.createElement('canvas');orig.width=w;orig.height=h;orig.getContext('2d').drawImage(original,x,y,w,h,0,0,w,h);
    history=[];future=[];canvas.width=w;canvas.height=h;ctx.drawImage(cropped,0,0);original=orig;
    cancelFaceCrop();closeSheet();updateButtons();requestAnimationFrame(fitCanvas);
    feedback('Crop applied. Save PNG to download your cropped photo.','success');
  });
  faceCropFrame.addEventListener('pointerdown',e=>{
    if(!cropRect||!allowPointer(e))return;
    e.preventDefault();e.stopPropagation();
    const edge=e.target.dataset.edge||'move',start={...cropRect};
    cropDrag={id:e.pointerId,edge,x:e.clientX,y:e.clientY,start};
    faceCropFrame.setPointerCapture(e.pointerId);
  });
  faceCropFrame.addEventListener('pointermove',e=>{
    if(!cropDrag||cropDrag.id!==e.pointerId||!cropRect)return;
    e.preventDefault();const d=cropDrag,r=canvas.getBoundingClientRect();
    const dx=(e.clientX-d.x)*canvas.width/Math.max(1,r.width),dy=(e.clientY-d.y)*canvas.height/Math.max(1,r.height),a=d.start,min=12;
    let l=a.x,t=a.y,right=a.x+a.w,bottom=a.y+a.h;
    if(d.edge==='move'){l=Math.max(0,Math.min(canvas.width-a.w,a.x+dx));t=Math.max(0,Math.min(canvas.height-a.h,a.y+dy));right=l+a.w;bottom=t+a.h}
    else{
      if(d.edge.includes('w'))l=Math.max(0,Math.min(right-min,a.x+dx));
      if(d.edge.includes('e'))right=Math.max(l+min,Math.min(canvas.width,a.x+a.w+dx));
      if(d.edge.includes('n'))t=Math.max(0,Math.min(bottom-min,a.y+dy));
      if(d.edge.includes('s'))bottom=Math.max(t+min,Math.min(canvas.height,a.y+a.h+dy));
    }
    cropRect={x:l,y:t,w:right-l,h:bottom-t};positionFaceCrop();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])faceCropFrame.addEventListener(event,()=>cropDrag=null);

  $('faceDownload').addEventListener('click',download);
  mobileSave.addEventListener('click',download);

  function openSheet(section){
    if(!mobile()){tools.classList.remove('open');return}
    tools.dataset.active=section; tools.classList.add('open');
    sheetBackdrop.hidden=false;
    $('faceMobileAdjust').classList.toggle('active',section==='adjust');
  }
  function closeSheet(){
    tools.classList.remove('open');sheetBackdrop.hidden=true;
    $('faceMobileAdjust').classList.remove('active');
  }
  $('faceMobileBrush').addEventListener('click',()=>{
    const wasOpen=tools.classList.contains('open')&&tools.dataset.active==='brush'&&editMode==='blur';
    setMode('blur');
    if(wasOpen)closeSheet(); else openSheet('brush');
  });
  $('faceMobileErase').addEventListener('click',()=>{
    const wasOpen=tools.classList.contains('open')&&tools.dataset.active==='brush'&&editMode==='erase';
    setMode('erase');
    if(wasOpen)closeSheet(); else openSheet('brush');
  });
  $('faceMobileAdjust').addEventListener('click',()=>{
    if(tools.classList.contains('open')&&tools.dataset.active==='adjust')closeSheet();
    else openSheet('adjust');
  });
  $('faceSheetClose').addEventListener('click',closeSheet);
  sheetBackdrop.addEventListener('click',closeSheet);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
  window.addEventListener('resize',()=>{fitHeader();requestAnimationFrame(fitCanvas);if(!mobile())closeSheet()});
  window.addEventListener('orientationchange',fitHeader);
  setMode('blur');updateButtons();fitHeader();
})();