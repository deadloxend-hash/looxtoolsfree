/* Cloudflare D1 + R2 is the source of truth for LOOX creator profiles.
 * Supabase is used only to verify the existing login session.
 */
export const PROFILE_API='https://loox-profile-api.looxai-studio.workers.dev/v1';
const mediaCache=new Map(),MEDIA_CACHE_MS=300000,MEDIA_CACHE_LIMIT=48;
function release(entry){if(entry)Promise.resolve(entry.promise).then(url=>{const timer=setTimeout(()=>URL.revokeObjectURL(url),30000);timer.unref?.();}).catch(()=>{});}
function clearMediaCache(){for(const entry of mediaCache.values())release(entry);mediaCache.clear();}
let cacheOwner;
if(typeof document!=='undefined')document.addEventListener('loox-user',()=>{clearMediaCache();});
if(typeof window!=='undefined')window.addEventListener('pagehide',event=>{if(!event.persisted)clearMediaCache();});
async function token(state){
 if(!state.user||!state.client)return null;
 const {data,error}=await state.client.auth.getSession();
 if(error)throw error;
 if(data?.session&&data.session.user?.id!==state.user?.id)throw Error('Your account changed. Retry this action.');
 return data?.session?.access_token||null;
}
export async function cloudRequest(state,path,{method='GET',query=null,data=null,blob=null,media=false,timeout=20000}={}){
 if(!/^[a-z][a-z-]{0,40}$/.test(path))throw Error('Invalid profile action.');
 const owner=state.user?.id||null;
 const url=new URL(PROFILE_API+'/'+path);
 if(query)for(const [name,value] of Object.entries(query))if(value!==null&&value!==undefined)url.searchParams.set(name,String(value));
 const headers={},authToken=await token(state);
 if(authToken)headers.Authorization='Bearer '+authToken;
 if(data!==null)headers['Content-Type']='application/json';
 if(blob)headers['Content-Type']=blob.type||'image/webp';
 const response=await fetch(url.href,{method,mode:'cors',cache:'no-store',headers,
  body:data!==null?JSON.stringify(data):blob||undefined,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(timeout)});
 if((state.user?.id||null)!==owner)throw Error('Your account changed. Retry this action.');
 if(!response.ok){
  const body=await response.json().catch(()=>null);
  throw Error(body?.error||'Profile service unavailable ('+response.status+').');
 }
 if(media)return response.blob();
 return response.json();
}
export async function cloudImage(state,id,type){
 const owner=state.user?.id||'public';
 if(cacheOwner!==owner){clearMediaCache();cacheOwner=owner;}
 const key=id+'/'+type+'/'+owner;
 const found=mediaCache.get(key);
 if(found&&Date.now()-found.created<MEDIA_CACHE_MS)return found.promise;
 if(found){mediaCache.delete(key);release(found);}
 const promise=cloudRequest(state,'media',{query:{type,id},media:true}).then(blob=>URL.createObjectURL(blob));
 while(mediaCache.size>=MEDIA_CACHE_LIMIT){const oldest=mediaCache.keys().next().value;release(mediaCache.get(oldest));mediaCache.delete(oldest);}
 mediaCache.set(key,{promise,created:Date.now()});
 try{return await promise;}catch(e){mediaCache.delete(key);throw e;}
}
export async function cloudUpload(state,type,blob){
 const result=await cloudRequest(state,type,{method:'POST',blob});
 const key=state.user?.id+'/'+type+'/'+(state.user?.id||'public');
 const previous=mediaCache.get(key);mediaCache.delete(key);
 release(previous);
 if(type==='avatar'){try{sessionStorage.removeItem('loox-avatar-reference:'+state.user?.id);localStorage.setItem('loox-avatar-updated',String(Date.now()));}catch{}document.dispatchEvent(new Event('loox-avatar-change'));}
 return result;
}
export async function cloudDelete(state,type){
 const result=await cloudRequest(state,type,{method:'DELETE'});
 const key=state.user?.id+'/'+type+'/'+(state.user?.id||'public');
 const previous=mediaCache.get(key);mediaCache.delete(key);
 release(previous);
 if(type==='avatar'){try{sessionStorage.removeItem('loox-avatar-reference:'+state.user?.id);localStorage.setItem('loox-avatar-updated',String(Date.now()));}catch{}document.dispatchEvent(new Event('loox-avatar-change'));}
 return result;
}

export function invalidateCloudImage(state,id,type){
 const key=id+'/'+type+'/'+(state.user?.id||'public'),previous=mediaCache.get(key);mediaCache.delete(key);
 release(previous);
}
