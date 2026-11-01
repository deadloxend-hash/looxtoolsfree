/* LOOX local upscaler — all pixel processing stays in the browser. No API calls. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const file=$('work-file'),controls=$('work-controls'),view=$('work-canvas'),empty=$('work-empty'),status=$('work-status'),dimensions=$('work-dimensions'),results=$('work-results'),run=$('work-export'),cancel=$('work-cancel'),progress=$('work-progress'),zone=$('work-upload');
let photo=null,name='image',current=null,working=false,stopped=false,job=0;
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error)};
controls.innerHTML='<h2>Local upscale settings</h2>'+
 '<label>Enlarge <select class="work-control" id="u-factor"><option value="2">2×</option><option value="3">3×</option><option value="4">4×</option></select></label>'+
 '<label>Sharpen strength <output id="u-sharp-val">45%</output><input class="work-control" type="range" id="u-sharp" min="0" max="100" value="45"></label>'+
 '<label>Clarity <output id="u-clarity-val">30%</output><input class="work-control" type="range" id="u-clarity" min="0" max="100" value="30"></label>'+
 '<label>Noise reduction <output id="u-noise-val">15%</output><input class="work-control" type="range" id="u-noise" min="0" max="100" value="15"></label>'+
 '<label>Output format <select class="work-control" id="u-format"><option value="image/png">PNG (lossless)</option><option value="image/jpeg">JPG (smaller file)</option><option value="image/webp">WebP</option></select></label>'+
 '<p class="work-note">100% free • Runs locally • No upload • Sharpening and interpolation, not a trained AI model. These filters cannot recover genuinely missing detail.</p>';
for(const key of ['sharp','clarity','noise'])$('u-'+key).addEventListener('input',e=>$('u-'+key+'-val').textContent=e.target.value+'%');
function preview(c){const max=1300,scale=Math.min(1,max/Math.max(c.width,c.height));view.width=Math.max(1,Math.round(c.width*scale));view.height=Math.max(1,Math.round(c.height*scale));view.getContext('2d').drawImage(c,0,0,view.width,view.height);view.hidden=false;empty.hidden=true}
function resetResult(){results.replaceChildren();if(current?.url)URL.revokeObjectURL(current.url);current=null}
function openFile(f){if(!f)return;if(!f.type.startsWith('image/'))return message('Choose a PNG, JPG or WebP image.',true);if(f.size>35*1024*1024)return message('Choose an image smaller than 35 MB.',true);
const id=++job,url=URL.createObjectURL(f),img=new Image();resetResult();run.disabled=true;
img.onload=()=>{URL.revokeObjectURL(url);if(id!==job)return;if(img.naturalWidth*img.naturalHeight>20000000)return message('Source exceeds 20 megapixels; use a smaller photo.',true);
photo=canvas(img.naturalWidth,img.naturalHeight);photo.getContext('2d').drawImage(img,0,0);name=f.name.replace(/\.[^.]*$/,'').replace(/[^\w-]+/g,'-').slice(0,70)||'image';preview(photo);dimensions.textContent=img.naturalWidth+' × '+img.naturalHeight+' px · original';run.disabled=false;message('Image ready. Choose settings and select Upscale image.')};
img.onerror=()=>{URL.revokeObjectURL(url);message('Could not open this image.',true)};img.src=url}
file.addEventListener('change',e=>openFile(e.target.files[0]));
zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging')});
zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));
zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragging');openFile(e.dataTransfer.files[0])});
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
function filter(c,noise,sharp,clarity){
 const w=c.width,h=c.height,cx=c.getContext('2d',{willReadFrequently:true});
 const original=cx.getImageData(0,0,w,h),data=original.data;
 if(noise>0){const strength=noise/100*.55,buffer=new Uint8ClampedArray(data);for(let y=1;y<h-1;y++){for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let ch=0;ch<3;ch++){const v=data[i+ch],neighbors=[buffer[i-4+ch],buffer[i+4+ch],buffer[i-w*4+ch],buffer[i+w*4+ch]],average=(neighbors[0]+neighbors[1]+neighbors[2]+neighbors[3]+v*4)/8;data[i+ch]=v+(average-v)*strength}}}}
 if(sharp>0||clarity>0){
  cx.putImageData(original,0,0);
  const soft=canvas(w,h),bc=soft.getContext('2d',{willReadFrequently:true});bc.filter='blur(1.35px)';bc.drawImage(c,0,0);bc.filter='none';const b=bc.getImageData(0,0,w,h).data;
  const amount=sharp/100*1.65+clarity/100*.75,threshold=2+Math.round((100-clarity)*.04);
  for(let i=0;i<data.length;i+=4){for(let ch=0;ch<3;ch++){const delta=data[i+ch]-b[i+ch];if(Math.abs(delta)>threshold)data[i+ch]=clamp(data[i+ch]+delta*amount,0,255)}}
 }
 cx.putImageData(original,0,0);
}
async function upscale(){if(working||!photo)return;resetResult();const factor=Number($('u-factor').value),w=photo.width*factor,h=photo.height*factor;
if(w*h>16000000||w>8192||h>8192)return message('This upscale would exceed the 16 MP / 8192 px browser safety limit. Choose a lower factor or a smaller input.',true);
working=true;stopped=false;run.disabled=true;cancel.disabled=false;progress.value=5;
try{
 message('Enlarging image locally…');await yieldUI();if(stopped)return;
 const out=canvas(w,h),cx=out.getContext('2d',{willReadFrequently:true});cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
 cx.drawImage(photo,0,0,w,h);progress.value=40;await yieldUI();if(stopped)return;
 message('Applying clarity and detail enhancement…');
 filter(out,Number($('u-noise').value),Number($('u-sharp').value),Number($('u-clarity').value));progress.value=80;await yieldUI();if(stopped)return;
 const format=$('u-format').value,blob=await new Promise(resolve=>out.toBlob(resolve,format,.93));if(!blob)throw Error('Image export failed.');
 const url=URL.createObjectURL(blob);current={url};const card=document.createElement('div'),a=document.createElement('a');a.className='work-button';a.href=url;a.download=name+'-loox-'+factor+'x.'+({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[format]);a.textContent='Download enhanced image ↓';a.style.display='inline-block';a.style.textDecoration='none';card.append(a);results.append(card);
 preview(out);dimensions.textContent=w+' × '+h+' px · '+(blob.size/1048576).toFixed(2)+' MB · enhanced';progress.value=100;message('Finished! Download your locally enhanced image.');
 }catch(e){message(e.message||'Enhancement failed.',true)}
 finally{working=false;run.disabled=!photo;cancel.disabled=true}
}
run.textContent='Upscale image';run.addEventListener('click',upscale);cancel.addEventListener('click',()=>{stopped=true;message('Cancel requested.');cancel.disabled=true});cancel.disabled=true;message('Choose an image to begin.');
})();