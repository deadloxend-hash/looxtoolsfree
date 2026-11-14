import {el,button,msg} from './account.js?v=12';
const host=document.querySelector('[data-ocr]');
const file=el('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.setAttribute('aria-label','Choose image for OCR');
const preview=el('img');preview.alt='OCR source';preview.style.maxWidth='100%';preview.hidden=true;
const output=el('textarea');output.rows=8;output.setAttribute('aria-label','Recognized text');
const note=el('p');note.setAttribute('role','status');const progress=el('progress');progress.max=1;progress.hidden=true;
let imageURL=null,busy=false;
file.onchange=async()=>{if(imageURL)URL.revokeObjectURL(imageURL);const f=file.files[0];preview.hidden=true;if(!f)return;if(f.size>10000000||!['image/png','image/jpeg','image/webp'].includes(f.type)){file.value='';return msg(note,'Use a PNG, JPG or WebP under 10 MB.');}imageURL=URL.createObjectURL(f);preview.src=imageURL;preview.hidden=false;output.value='';};
let library;
function load(){if(!library)library=new Promise((resolve,reject)=>{const s=el('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>{library=null;reject(Error('OCR library could not load. Check your connection.'));};document.head.append(s);});return library;}
const run=button('Extract text',async()=>{if(busy||!file.files[0])return msg(note,'Choose an image first.');busy=true;run.disabled=file.disabled=true;progress.hidden=false;let worker;
 try{await load();worker=await window.Tesseract.createWorker('eng',1,{logger:m=>{msg(note,m.status);progress.value=m.progress||0;}});const {data}=await worker.recognize(file.files[0]);output.value=data.text;msg(note,'Text is ready. Review recognition accuracy before using it.');}
 catch(e){msg(note,e.message||'OCR could not finish.');}
 finally{await worker?.terminate();busy=false;run.disabled=file.disabled=false;progress.hidden=true;}
});
const save=button('Download text',()=>{if(!output.value)return;const url=URL.createObjectURL(new Blob([output.value],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='loox-text.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
host.append(file,preview,run,progress,note,output,save);
