import {auth,state,initialize} from './account.js';
const form=document.getElementById('chatForm'),input=document.getElementById('chatPrompt'),send=document.getElementById('chatSend'),log=document.getElementById('chatLog'),notice=document.getElementById('chatStatus');
const history=[];
function bubble(text,who){const node=document.createElement('div');node.className='bubble '+who;node.textContent=text;log.append(node);log.scrollTop=log.scrollHeight}
initialize().then(()=>{notice.textContent=state.user?'Ready to chat.':'Sign in to use LOOX AI Chat.'}).catch(()=>{});
form.addEventListener('submit',async event=>{
event.preventDefault();const message=input.value.trim();if(!message)return;
if(!state.user){auth('login');notice.textContent='Sign in with your verified account to use LOOX AI Chat.';return}
input.value='';bubble(message,'user');send.disabled=true;notice.textContent='LOOX AI is preparing your response…';
try{const session=(await state.client.auth.getSession()).data.session;if(!session)throw Error('Please sign in again.');
const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox-chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({message,history:history.slice(-8)}),signal:AbortSignal.timeout(65000)});
const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'LOOX AI Chat is temporarily unavailable.');
bubble(data.reply,'assistant');history.push({role:'user',text:message},{role:'assistant',text:data.reply});notice.textContent='Response ready.';
}catch(e){bubble(e.message||'The AI service is temporarily unavailable.','assistant');notice.textContent='Your message could not be processed. No LOOX credits were deducted.'}finally{send.disabled=false;input.focus()}
});