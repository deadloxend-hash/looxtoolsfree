/* Shared local canvas recording and compatible MP4 conversion. */
const graphs=new WeakMap(),contexts=new Set();
export const abortError=()=>new DOMException('Export canceled.','AbortError');
export function releaseVideo(video){const graph=graphs.get(video);if(graph){graphs.delete(video);contexts.delete(graph.context);graph.context.close().catch(()=>{})}}
export function mediaMime(){return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/webm;codecs=vp8,opus','video/webm'].find(m=>globalThis.MediaRecorder?.isTypeSupported(m))}
export async function recordVideo(canvas,video,{fps=30,onProgress=()=>{},onFrameReady=()=>{},signal}={}){
 const mime=mediaMime();if(!mime||!canvas.captureStream)throw Error('Canvas recording is unavailable in this browser. Try a recent desktop browser.');
 if(!Number.isFinite(video.duration)||video.duration<=0)throw Error('The video duration is unavailable.');
 let graph=graphs.get(video);
 if(!graph&&globalThis.AudioContext){const context=new AudioContext(),source=context.createMediaElementSource(video),destination=context.createMediaStreamDestination();source.connect(destination);source.connect(context.destination);graph={context,destination};graphs.set(video,graph);contexts.add(context)}
 if(graph)await graph.context.resume();
 video.pause();video.currentTime=0;
 await new Promise((resolve,reject)=>{if(video.readyState>=2&&!video.seeking)return resolve();const timer=setTimeout(()=>{clean();reject(Error('The video could not prepare its first frame.'))},10000);const ready=()=>{if(video.readyState>=2&&!video.seeking){clean();resolve()}};function clean(){clearTimeout(timer);video.removeEventListener('seeked',ready);video.removeEventListener('loadeddata',ready)}video.addEventListener('seeked',ready);video.addEventListener('loadeddata',ready)});
 if(signal?.aborted)throw abortError();
 onFrameReady();
 const stream=canvas.captureStream(fps);graph?.destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t.clone()));
 try{
 return await new Promise((resolve,reject)=>{
  let recorder,timer,settled=false;const chunks=[];
  const finish=(error)=>{if(settled)return;settled=true;clearInterval(timer);video.pause();video.removeEventListener('ended',end);video.removeEventListener('error',bad);signal?.removeEventListener('abort',cancel);if(recorder?.state!=='inactive')try{recorder.stop()}catch{};error?reject(error):resolve(new Blob(chunks,{type:mime}))};
  const end=()=>{if(recorder?.state!=='inactive')recorder.stop()},bad=()=>finish(Error('The source video stopped decoding.')),cancel=()=>finish(abortError());
  try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.max(2000000,Math.min(16000000,canvas.width*canvas.height*fps*.1))});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=()=>finish(Error('The browser recorder failed.'));recorder.onstop=()=>chunks.length?finish():finish(Error('No video frames were recorded.'));video.addEventListener('ended',end,{once:true});video.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',cancel,{once:true});recorder.start(500);video.play().catch(finish);timer=setInterval(()=>onProgress(Math.min(100,video.currentTime/video.duration*100)),120)}catch(error){finish(error)}
 });
 }finally{stream.getTracks().forEach(t=>t.stop())}
}
export async function toMp4(blob,{onProgress=()=>{},signal}={}){
 if(blob.type.startsWith('video/mp4'))return blob;
 if(signal?.aborted)throw abortError();
 const [{FFmpeg},util]=await Promise.all([import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'),import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js')]);
 const ff=new FFmpeg(),urls=[];
 const cancel=()=>ff.terminate();signal?.addEventListener('abort',cancel,{once:true});
 try{
  const workerURL=URL.createObjectURL(new Blob(["import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js';"],{type:'text/javascript'}));urls.push(workerURL);
  const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm',coreURL=await util.toBlobURL(base+'/ffmpeg-core.js','text/javascript');urls.push(coreURL);const wasmURL=await util.toBlobURL(base+'/ffmpeg-core.wasm','application/wasm');urls.push(wasmURL);
  if(signal?.aborted)throw abortError();ff.on('progress',p=>onProgress(Math.max(0,Math.min(100,p.progress*100))));await ff.load({classWorkerURL:workerURL,coreURL,wasmURL});await ff.writeFile('recording.webm',await util.fetchFile(blob));
  const code=await ff.exec(['-i','recording.webm','-c:v','libx264','-preset','ultrafast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','output.mp4']);
  if(code!==0)throw Error('MP4 encoding could not finish. Try a shorter video or lower output size.');
  const data=await ff.readFile('output.mp4');return new Blob([data],{type:'video/mp4'});
 }finally{signal?.removeEventListener('abort',cancel);ff.terminate();urls.forEach(u=>URL.revokeObjectURL(u))}
}
window.addEventListener('beforeunload',()=>contexts.forEach(c=>c.close().catch(()=>{})));
