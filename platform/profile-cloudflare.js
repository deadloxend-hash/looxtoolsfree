/* Cloudflare D1 + R2 is the source of truth for LOOX creator profiles.
 * Supabase is used only to verify the existing login session.
 */
export const PROFILE_API='https://loox-profile-api.looxai-studio.workers.dev/v1';
const mediaCache=new Map();
async function token(state){
 if(!state.user||!state.client)return null;
 const {data,error}=await state.client.auth.getSession();
 if(error)throw error;
 return data?.session?.access_token||null;
}
export async function cloudRequest(state,path,{method='GET',query=null,data=null,blob=null,media=false}={}){
 const url=new URL(PROFILE_API+'/'+path);
 if(query)for(const [name,value] of Object.entries(query))if(value!==null&&value!==undefined)url.searchParams.set(name,String(value));
 const headers={},authToken=await token(state);
 if(authToken)headers.Authorization='Bearer '+authToken;
 if(data!==null)headers['Content-Type']='application/json';
 if(blob)headers['Content-Type']=blob.type||'image/webp';
 const response=await fetch(url.href,{method,mode:'cors',cache:'no-store',headers,
  body:data!==null?JSON.stringify(data):blob||undefined,credentials:'omit',signal:AbortSignal.timeout(20000)});
 if(!response.ok){
  const body=await response.json().catch(()=>null);
  throw Error(body?.error||'Cloudflare profile service unavailable ('+response.status+').');
 }
 if(media)return response.blob();
 return response.json();
}
export async function cloudImage(state,id,type){
 const key=id+'/'+type+'/'+(state.user?.id||'public');
 const found=mediaCache.get(key);
 if(found)return found;
 const promise=cloudRequest(state,'media',{query:{type,id},media:true}).then(blob=>URL.createObjectURL(blob));
 mediaCache.set(key,promise);
 try{return await promise;}catch(e){mediaCache.delete(key);throw e;}
}
export async function cloudUpload(state,type,blob){
 const result=await cloudRequest(state,type,{method:'POST',blob});
 mediaCache.delete(state.user?.id+'/'+type+'/'+(state.user?.id||'public'));
 return result;
}
export async function cloudDelete(state,type){
 const result=await cloudRequest(state,type,{method:'DELETE'});
 mediaCache.delete(state.user?.id+'/'+type+'/'+(state.user?.id||'public'));
 return result;
}
