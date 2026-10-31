/* One-shot, cancelable browser FFmpeg jobs. */
export async function processVideo(file,{action='mute',speed=1,ranges=[],onProgress=()=>{},signal}={}){
 if(signal?.aborted)throw new DOMException('Canceled','AbortError');
 const [{FFmpeg},util]=await Promise.all([import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'),import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js')]);
 const ff=new FFmpeg(),urls=[],cancel=()=>ff.terminate();signal?.addEventListener('abort',cancel,{once:true});
 try{
  const worker=URL.createObjectURL(new Blob(["import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js';"],{type:'text/javascript'}));urls.push(worker);
  const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm',coreURL=await util.toBlobURL(base+'/ffmpeg-core.js','text/javascript'),wasmURL=await util.toBlobURL(base+'/ffmpeg-core.wasm','application/wasm');urls.push(coreURL,wasmURL);
  if(signal?.aborted)throw new DOMException('Canceled','AbortError');await ff.load({classWorkerURL:worker,coreURL,wasmURL});await ff.writeFile('input',await util.fetchFile(file));
  const sections=action==='split'?ranges:[null],output=[];let part=0;
  ff.on('progress',p=>onProgress(Math.min(99,(part+Math.max(0,Math.min(1,p.progress)))/sections.length*100)));
  for(const range of sections){if(signal?.aborted)throw new DOMException('Canceled','AbortError');const name='clip-'+(part+1)+'.mp4',args=['-i','input'];if(range)args.push('-ss',String(range[0]),'-t',String(range[1]-range[0]));args.push('-map','0:v:0','-map','0:a?');
   if(action==='mute')args.push('-an');
   if(action==='speed'){const v=Number(speed);if(v<.25||v>4)throw Error('Choose a speed between 0.25× and 4×.');const tempos=[];let remaining=v;while(remaining<.5){tempos.push('atempo=0.5');remaining/=.5}while(remaining>2){tempos.push('atempo=2');remaining/=2}tempos.push('atempo='+remaining);args.push('-vf','setpts=PTS/'+v,'-af',tempos.join(','))}
   args.push('-c:v','libx264','-preset','ultrafast','-crf','22','-pix_fmt','yuv420p','-vf',(action==='speed'?'setpts=PTS/'+Number(speed)+',':'')+'scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:a','aac','-movflags','+faststart',name);
   // Keep a single video-filter argument when speed adjustment is enabled.
   if(action==='speed'){const first=args.indexOf('-vf');args.splice(first,2)}
   const code=await ff.exec(args);if(code!==0)throw Error('The video encoder could not finish. Try a shorter, browser-supported source.');const data=await ff.readFile(name);output.push({name,blob:new Blob([data],{type:'video/mp4'})});await ff.deleteFile(name);part++;
  }onProgress(100);return output;
 }finally{signal?.removeEventListener('abort',cancel);ff.terminate();urls.forEach(u=>URL.revokeObjectURL(u))}
}
export function parseRanges(text,duration){const time=value=>{const values=value.trim().split(':').map(Number);if(values.length>3||values.some(n=>!Number.isFinite(n)||n<0))throw Error('Use seconds or HH:MM:SS timestamps.');return values.reduce((a,n)=>a*60+n,0)};const ranges=text.split(/\n+/).map(s=>s.trim()).filter(Boolean).map(line=>{const p=line.split(/\s*[-–]\s*/);if(p.length!==2)throw Error('Write one range per line, for example 0:00 - 0:15.');const a=time(p[0]),b=time(p[1]);if(b<=a||a<0||b>duration+.02)throw Error('Every range must end after it starts and stay within the video.');return[a,Math.min(duration,b)]});if(!ranges.length||ranges.length>30)throw Error('Enter between 1 and 30 ranges.');return ranges}
export async function animatePicture(source,{duration=3,zoom=1.12,type='gif',onProgress=()=>{},signal}={}){
 const {canvas}=await import('./image-core.mjs');const {FFmpeg}=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'),util=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
 const ff=new FFmpeg(),urls=[],cancel=()=>ff.terminate();signal?.addEventListener('abort',cancel,{once:true});try{
  const worker=URL.createObjectURL(new Blob(["import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js';"],{type:'text/javascript'}));urls.push(worker);const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm',coreURL=await util.toBlobURL(base+'/ffmpeg-core.js','text/javascript'),wasmURL=await util.toBlobURL(base+'/ffmpeg-core.wasm','application/wasm');urls.push(coreURL,wasmURL);if(signal?.aborted)throw new DOMException('Canceled','AbortError');await ff.load({classWorkerURL:worker,coreURL,wasmURL});
  const c=canvas(512,512),x=c.getContext('2d'),fps=15,frames=Math.round(duration*fps);for(let i=0;i<frames;i++){if(signal?.aborted)throw new DOMException('Canceled','AbortError');const phase=(1-Math.cos(i/frames*Math.PI*2))/2,z=1+(zoom-1)*phase,s=Math.max(512/source.width,512/source.height)*z,w=source.width*s,h=source.height*s;x.fillStyle='#000';x.fillRect(0,0,512,512);x.drawImage(source,(512-w)/2,(512-h)/2,w,h);const b=await new Promise(r=>c.toBlob(r,'image/png'));await ff.writeFile('frame-'+String(i).padStart(3,'0')+'.png',await util.fetchFile(b));onProgress(i/frames*50)}
  const name=type==='gif'?'animation.gif':'animation.mp4',args=['-framerate',String(fps),'-i','frame-%03d.png'];if(type==='gif')args.push('-filter_complex','split[a][b];[a]palettegen[p];[b][p]paletteuse','-loop','0');else args.push('-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart');args.push(name);ff.on('progress',p=>onProgress(50+Math.min(1,p.progress)*50));if(await ff.exec(args)!==0)throw Error('Animation encoding failed. Try MP4 or a shorter duration.');return new Blob([await ff.readFile(name)],{type:type==='gif'?'image/gif':'video/mp4'});
 }finally{signal?.removeEventListener('abort',cancel);ff.terminate();urls.forEach(u=>URL.revokeObjectURL(u))}
}
