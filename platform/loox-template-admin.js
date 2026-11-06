
import {state,initialize,auth} from './account.js?v=9';
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
document.getElementById('reload').addEventListener('click',load);
await initialize();await load();
document.addEventListener('loox-user',load);
