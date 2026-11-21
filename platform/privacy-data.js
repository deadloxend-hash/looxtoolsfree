import {zipSync,strToU8} from '../vendor/fflate-0.8.2.mjs';
const PART_BYTES=32000000,FILE_BYTES=40000000;
export function validMedia(file,owner,authHost){
 if(!file||typeof file.key!=='string'||file.key.startsWith('/')||file.key.includes('\\')||/[\x00-\x1f]/.test(file.key)||file.key.split('/').some(p=>p==='.'||p==='..'))return false;
 try{
  const u=new URL(file.url);if(u.protocol!=='https:'||u.username||u.password)return false;
  const encoded=file.key.split('/').map(encodeURIComponent).join('/');
  if(file.provider==='r2')return u.pathname.endsWith('/'+encoded)&&u.hostname.endsWith('.r2.cloudflarestorage.com')&&(file.key.startsWith('users/'+owner+'/')||file.key.startsWith('public/avatars/'+owner+'/'));
  return file.provider==='supabase'&&u.pathname==='/storage/v1/object/sign/'+file.bucket+'/'+encoded&&u.hostname===authHost&&['loox-results','loox-avatars'].includes(file.bucket)&&file.key.startsWith(owner+'/');
 }catch{return false;}
}
export function groupMedia(files,owner,authHost){
 const groups=[],seen=new Set();let group=[],bytes=0;
 const flush=()=>{if(group.length)groups.push({files:group,bytes,direct:false});group=[];bytes=0;};
 for(const file of files){
  if(!validMedia(file,owner,authHost))throw Error('Media ownership could not be verified.');
  const id=file.provider+'/'+(file.bucket||'')+'/'+file.key;if(seen.has(id))continue;seen.add(id);
  const size=Number(file.bytes);
  if(!Number.isSafeInteger(size)||size<=0||size>FILE_BYTES){flush();groups.push({files:[file],bytes:size||0,direct:true});continue;}
  if(bytes+size>PART_BYTES)flush();group.push(file);bytes+=size;
 }
 flush();return groups;
}
export async function readPrivateMedia(file,{owner,currentUser,authHost,request=fetch,signal}={}){
 if(currentUser()!==owner||!validMedia(file,owner,authHost))throw Error('Account changed or media ownership could not be verified.');
 const expected=Number(file.bytes);if(!Number.isSafeInteger(expected)||expected<=0||expected>FILE_BYTES)throw Error('Use the original-file download for this item.');
 const timeout=AbortSignal.timeout(180000),abort=signal&&AbortSignal.any?AbortSignal.any([signal,timeout]):signal||timeout;
 const response=await request(file.url,{credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:abort});
 if(!response.ok)throw Error('Media could not be downloaded. Verify your password again if the links expired.');
 const reader=response.body?.getReader();if(!reader)throw Error('Streaming downloads are unavailable in this browser.');
 const chunks=[];let length=0;
 for(;;){const item=await reader.read();if(item.done)break;length+=item.value.length;
  if(currentUser()!==owner||length>expected||length>FILE_BYTES){await reader.cancel();throw Error('Account changed or media size verification failed.');}
  chunks.push(item.value);
 }
 if(currentUser()!==owner||length!==expected)throw Error('Media changed during export. Please verify and export again.');
 const result=new Uint8Array(length);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;
}
export async function buildPrivateArchive(data,part,{owner,currentUser,authHost,request=fetch,signal,progress=()=>{}}={}){
 if(data.account?.id!==owner||currentUser()!==owner)throw Error('Account changed.');
 if(!Number.isFinite(Date.parse(data.media_links_expire_at))||Date.parse(data.media_links_expire_at)<=Date.now())throw Error('Download links expired. Verify your password again for fresh links.');
 if(part.direct)throw Error('Use the original-file download for this item.');
 const files=Object.create(null);files['loox-personal-data.json']=strToU8(JSON.stringify(data,null,2));
 for(let i=0;i<part.files.length;i++){
  if(Date.parse(data.media_links_expire_at)<=Date.now())throw Error('Download links expired. Verify your password again.');
  const file=part.files[i];progress(i+1,part.files.length);
  const path=file.provider+'/'+(file.bucket?file.bucket+'/':'')+file.key;
  files[path]=await readPrivateMedia(file,{owner,currentUser,authHost,request,signal});
 }
 if(currentUser()!==owner||signal?.aborted)throw Error('Export canceled.');
 return zipSync(files,{level:0});
}
