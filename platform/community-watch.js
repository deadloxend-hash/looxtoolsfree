// Previews never count: only user-controlled, visible playback in the full viewer.
export function trackMeaningfulView(media,post,state,onCount=()=>{}){
 if(!state.user||state.user.id===post.creator_id)return;
 const viewer=state.user.id;let challenge=null,pending=false,done=false,watched=0,last=null;
 async function request(action,body){const {data}=await state.client.auth.getSession();if(!data.session||state.user?.id!==viewer)throw Error('Account changed');const r=await fetch('https://looxtoolfree-backend.vercel.app/api/loox?action=community_'+action,{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('Playback session unavailable');return r.json();}
 media.addEventListener('play',()=>{document.querySelectorAll('video').forEach(other=>{if(other!==media)other.pause();});last=media.currentTime;if(!challenge&&!pending){pending=true;request('view_start',{post:post.id}).then(q=>challenge=q).catch(()=>{}).finally(()=>pending=false);}});
 media.addEventListener('seeking',()=>last=null);
 media.addEventListener('timeupdate',()=>{const now=media.currentTime;if(!document.hidden&&!media.paused&&last!==null){const delta=now-last;if(delta>0&&delta<2)watched+=delta;}last=now;if(challenge&&!done&&!pending&&watched>=challenge.minimum_seconds){pending=true;request('view_record',{post:post.id,token:challenge.token}).then(data=>{done=true;post.view_count=data.views;onCount(data.views);}).catch(()=>{}).finally(()=>pending=false);}});
 media.addEventListener('pause',()=>last=null);
}
