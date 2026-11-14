import {auth,state,initialize,pricing} from './account.js?v=12';
const form=document.getElementById('chatForm'),input=document.getElementById('chatPrompt'),send=document.getElementById('chatSend'),log=document.getElementById('chatLog'),notice=document.getElementById('chatStatus');
const switcher=document.getElementById('chatModels'),heading=document.getElementById('chatModelLabel');
const transcripts={free:[],premium:[]}, histories={free:[],premium:[]};let model='free',busy=false;
function bubble(message,role){const node=document.createElement('div');node.className='bubble '+role;node.textContent=message;log.append(node);log.scrollTop=log.scrollHeight}
function render(){log.replaceChildren();bubble(model==='free'?"Hi! I'm LOOX AI Free. Ask me anything.":"Welcome to LOOX AI Pro. Premium subscribers can chat here.",'assistant');for(const item of transcripts[model])bubble(item.text,item.role);
 for(const button of switcher.querySelectorAll('[data-chat-model]')){const selected=button.dataset.chatModel===model;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))}
 heading.textContent=model==='free'?'LOOX AI Free':'LOOX AI Pro · Subscribers';
 notice.textContent=!state.user?'Sign in to chat.':model==='free'?'Free model · Up to 25 requests daily.':'Premium model · Active LOOX subscription required.';
}
switcher.addEventListener('click',event=>{const target=event.target.closest('[data-chat-model]');if(!target||busy)return;model=target.dataset.chatModel;render()});
document.getElementById('chatUpgrade')?.addEventListener('click',()=>pricing());
initialize().then(render).catch(()=>render());
document.addEventListener('loox-account',render);document.addEventListener('loox-user',render);
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;const message=input.value.trim();if(!message)return;
 if(!state.user){auth('login');notice.textContent='Sign in with a verified account to chat.';return}
 if(model==='premium'&&!['pro','lifetime'].includes(state.account?.plan)){notice.textContent='LOOX AI Pro requires a paid subscription.';pricing();return}
 const selected=model;input.value='';transcripts[selected].push({role:'user',text:message});bubble(message,'user');busy=true;send.disabled=true;switcher.setAttribute('aria-busy','true');notice.textContent='LOOX AI is thinking…';
 try{
  const session=(await state.client.auth.getSession()).data.session;if(!session)throw Error('Please sign in again.');
  const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox-chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({model:selected,message,history:histories[selected].slice(-8)}),signal:AbortSignal.timeout(65000)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'LOOX AI is temporarily unavailable.');
  transcripts[selected].push({role:'assistant',text:data.reply});histories[selected].push({role:'user',text:message},{role:'assistant',text:data.reply});
  if(selected===model)bubble(data.reply,'assistant');notice.textContent='Response ready.';
 }catch(e){const error=e.message||'The AI service is temporarily unavailable.';transcripts[selected].push({role:'assistant',text:error});if(selected===model)bubble(error,'assistant');notice.textContent='No LOOX credits were deducted.'}
 finally{busy=false;send.disabled=false;switcher.removeAttribute('aria-busy');input.focus()}
});
