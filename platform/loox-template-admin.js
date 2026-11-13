
import {state,initialize,auth} from './account.js?v=10';
import {cloudRequest} from './profile-cloudflare.js?v=1';
const notice=document.getElementById('notice'),queue=document.getElementById('queue');
const endpoint='https://looxtoolfree-backend.vercel.app/api/loox';
async function request(action,body){
 const session=await state.client?.auth.getSession(),token=session?.data?.session?.access_token;
 if(!token)throw Error('Please sign in with your administrator account.');
 const r=await fetch(endpoint+'?action=template_'+action,{method:body?'POST':'GET',credentials:'omit',
  headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'Request failed');return data;
}
async function load(){
 queue.replaceChildren();notice.textContent='Loading pending submissions…';
 try{
  const data=await request('queue');
  notice.textContent=data.items.length+' pending submission(s).';
  for(const item of data.items){
   const card=document.createElement('article');card.className='card';
   const image=document.createElement(item.media_type==='video'?'video':'img');if(item.media_type==='video'){image.controls=true;image.playsInline=true;}image.src=item.url;image.alt='Image awaiting approval';image.loading='lazy';image.style.cssText='width:100%;max-height:320px;object-fit:contain';
   const prompt=document.createElement('p');prompt.textContent=(item.caption||'')+(item.prompt?'\n\n'+item.prompt:'');
   const actions=document.createElement('div');actions.className='actions';
   for(const [status,label] of [['approved','Approve'],['rejected','Reject']]){
    const btn=document.createElement('button');btn.textContent=label;
    if(status==='rejected')btn.className='reject';
    btn.addEventListener('click',async()=>{
     if(!confirm(label+' this template?'))return;
     for(const b of actions.querySelectorAll('button'))b.disabled=true;
     try{await request('review',{id:item.id,status});card.remove();notice.textContent=label+'d successfully. Refresh to see remaining submissions.'}
     catch(e){notice.textContent=e.message;for(const b of actions.querySelectorAll('button'))b.disabled=false}
    });actions.append(btn);
   }
   card.append(image,prompt,actions);queue.append(card);
  }
 }catch(e){notice.textContent=e.message;if(!state.user){
  const login=document.createElement('button');login.textContent='Sign in';login.onclick=()=>auth('login');queue.append(login);
 }}
}

const cloudNotice=document.getElementById('cloud-notice');
const cloudQueue=document.getElementById('cloud-queue');
const cloudURLs=new Set();
async function loadCloudQueue(){
 for(const url of cloudURLs)URL.revokeObjectURL(url);
 cloudURLs.clear();cloudQueue.replaceChildren();cloudNotice.textContent='Loading Cloudflare Community post approvals…';
 try{
  const data=await cloudRequest(state,'review-queue');
  cloudNotice.textContent=data.items.length+' pending Community post(s) in Cloudflare D1.';
  for(const item of data.items){
   const card=document.createElement('article');card.className='card';
   const media=document.createElement(item.media_type==='video'?'video':'img');
   media.style.cssText='width:100%;max-height:300px;object-fit:contain;background:#0e0a14';
   if(item.media_type==='video'){media.controls=true;media.playsInline=true;}
   else{media.alt='Private pending Community creation';media.loading='lazy';}
   const desc=document.createElement('p');
   desc.textContent='@'+(item.username||'creator')+'\n'+(item.caption||'')+(item.shared_prompt?'\nPrompt: '+item.shared_prompt:'');
   const actions=document.createElement('div');actions.className='actions';
   for(const [status,label] of [['approved','Approve'],['rejected','Reject']]){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    if(status==='rejected')button.className='reject';
    button.addEventListener('click',async()=>{
     if(!confirm(label+' this Community post?'))return;
     actions.querySelectorAll('button').forEach(b=>b.disabled=true);
     try{
      await cloudRequest(state,'review',{method:'POST',data:{id:item.id,status}});
      card.remove();cloudNotice.textContent='Community post '+status+' in Cloudflare.';
     }catch(e){cloudNotice.textContent=e.message;actions.querySelectorAll('button').forEach(b=>b.disabled=false);}
    });actions.append(button);
   }
   card.append(media,desc,actions);cloudQueue.append(card);
   try{
    const blob=await cloudRequest(state,'media',{query:{type:'post',id:item.id,variant:'preview'},media:true});
    if(!card.isConnected)continue;
    const src=URL.createObjectURL(blob);cloudURLs.add(src);media.src=src;
   }catch(e){const note=document.createElement('p');note.textContent='Preview unavailable: '+e.message;card.append(note);}
  }
 }catch(e){cloudNotice.textContent=e.message;}
}

document.getElementById('reload').addEventListener('click',load);
document.getElementById('reload').addEventListener('click',loadCloudQueue);
await initialize();await Promise.all([load(),loadCloudQueue()]);
document.addEventListener('loox-user',()=>{void load();void loadCloudQueue();});
