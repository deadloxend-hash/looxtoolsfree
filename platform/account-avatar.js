import {cloudRequest,cloudImage,invalidateCloudImage} from './profile-cloudflare.js?v=settings-2-20261124';
let owner=null,url=null,task=null,checked=0,epoch=0,googleObjectURL=null;
async function googlePicture(state,id){if(!state.user?.identities?.some(i=>i.provider==='google'))return null;const {data,error}=await state.client.auth.getSession();if(error||!data?.session||data.session.user?.id!==id)return null;const r=await fetch('https://looxtoolfree-backend.vercel.app/api/loox?action=auth_avatar',{headers:{Authorization:'Bearer '+data.session.access_token},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok||state.user?.id!==id)return null;const blob=await r.blob();if(blob.size>524288||!['image/png','image/jpeg','image/webp'].includes(blob.type)||state.user?.id!==id)return null;return URL.createObjectURL(blob);}
const holders=()=>document.querySelectorAll('[data-loox-account] .lx-avatar,[data-loox-account] .loox-popover-avatar,.loox-sidebar-avatar');
export function paintAccountAvatar(){
 for(const host of holders()){
  host.classList.toggle('loox-avatar-loading',Boolean(owner&&task&&!url));
  if(!url||host.querySelector('img')?.src===url)continue;
  const img=new Image();img.alt='';img.decoding='async';img.className='loox-creator-avatar-img';
  img.onload=()=>{if(owner&&img.src===url&&host.isConnected){host.replaceChildren(img);host.classList.remove('loox-avatar-loading');}};
  img.onerror=()=>{host.classList.remove('loox-avatar-loading');};img.src=url;
 }
}
export async function syncAccountAvatar(state,force=false){
 const id=state.user?.id;
 if(id!==owner){if(googleObjectURL){URL.revokeObjectURL(googleObjectURL);googleObjectURL=null;}owner=id||null;url=null;task=null;checked=0;epoch++;}
 if(!id){if(!state.authRestoring)for(const host of holders())host.classList.remove('loox-avatar-loading');return;}
 if(task){paintAccountAvatar();return task;}
 if(!force&&Date.now()-checked<300000){paintAccountAvatar();return;}
 const seq=++epoch;
 if(force)invalidateCloudImage(state,id,'avatar');
 task=(async()=>{
  // Cache references only, never private image bytes, tokens, or object URLs.
  const key='loox-avatar-reference:'+id;let reference=null;
  try{reference=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  if(force||!reference||Date.now()-reference.checked>300000){
   const profile=await cloudRequest(state,'profile',{query:{id}}).catch(error=>{if(state.user?.identities?.some(i=>i.provider==='google'))return {};throw error;});
   reference={path:profile.avatar_path||null,checked:Date.now()};
   try{sessionStorage.setItem(key,JSON.stringify(reference));}catch{}
  }
  const next=reference.path?await cloudImage(state,id,'avatar'):await googlePicture(state,id);
  if(seq!==epoch||state.user?.id!==id){if(!reference.path&&next)URL.revokeObjectURL(next);return;}
  if(googleObjectURL&&googleObjectURL!==next)URL.revokeObjectURL(googleObjectURL);googleObjectURL=reference.path?null:next;url=next;checked=Date.now();
  if(!next)for(const host of holders())if(host.querySelector('img'))host.textContent=(state.account?.profile?.name||'L').slice(0,1).toUpperCase();
 })().catch(()=>{if(seq===epoch)checked=Date.now()-270000;}).finally(()=>{if(seq===epoch){task=null;paintAccountAvatar();}});
 paintAccountAvatar();return task;
}
