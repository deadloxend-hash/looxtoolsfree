const prefix='loox-avatar-image:',ttl=300000,maxBytes=98304;
export function clearAvatarCache(except=null){try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith(prefix)&&key!==prefix+except)sessionStorage.removeItem(key);}}catch{}}
export function cachedAvatar(id){try{const item=JSON.parse(sessionStorage.getItem(prefix+id)||'null');if(item?.owner===id&&Number.isFinite(item.at)&&Date.now()-item.at>=0&&Date.now()-item.at<ttl&&typeof item.src==='string'&&item.src.length<maxBytes*1.4&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(item.src))return item.src;}catch{}return null;}
export async function saveAvatar(id,src,isCurrent){
 // Only small raster images; never serialize tokens, arbitrary URLs, or another owner's result.
 try{if(!src?.startsWith('blob:')||!isCurrent())return;const blob=await (await fetch(src)).blob();if(blob.size>maxBytes||!['image/png','image/jpeg','image/webp'].includes(blob.type))return;
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 if(isCurrent())sessionStorage.setItem(prefix+id,JSON.stringify({owner:id,at:Date.now(),src:data}));
 }catch{/* Storage quota, blocked storage and cache failures must not prevent an avatar. */}
}
