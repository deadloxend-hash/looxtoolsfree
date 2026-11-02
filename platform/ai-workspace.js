import {auth,state,initialize,pricing} from './account.js';
const landing=document.body.classList.contains('ai-home');
const prompt=document.getElementById('aiPrompt'),form=document.getElementById('aiForm'),send=document.getElementById('aiSend'),modelButton=document.getElementById('aiModelButton'),modelMenu=document.getElementById('aiModelMenu'),toolsButton=document.getElementById('aiToolsButton'),toolsMenu=document.getElementById('aiToolsMenu'),modelName=document.getElementById('aiModelName'),status=document.getElementById('aiStatus'),thread=document.getElementById('aiThread');
const draftsKey='loox-ai-start-v1';const conversations={free:[],premium:[]};const histories={free:[],premium:[]};let model='free',busy=false;
function premium(){return ['pro','lifetime'].includes(state.account?.plan)}
function note(s){if(status)status.textContent=s}
function hideMenus(){modelMenu.hidden=true;toolsMenu.hidden=true;modelButton.setAttribute('aria-expanded','false');toolsButton.setAttribute('aria-expanded','false')}
modelButton.addEventListener('click',()=>{const open=modelMenu.hidden;hideMenus();modelMenu.hidden=!open;modelButton.setAttribute('aria-expanded',String(open))});
toolsButton.addEventListener('click',()=>{const open=toolsMenu.hidden;hideMenus();toolsMenu.hidden=!open;toolsButton.setAttribute('aria-expanded',String(open))});
document.addEventListener('click',event=>{if(!event.target.closest('.ai-composer-wrap'))hideMenus()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideMenus()});
function selectModel(choice){hideMenus();if(choice==='premium'&&!premium()){pricing();note('LOOX Pro requires an active paid subscription.');return}model=choice;modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';if(thread)drawThread();note(model==='free'?'LOOX Free · 25 requests per 24 hours.':'LOOX Pro · Subscribers only.')}
modelMenu.addEventListener('click',event=>{const target=event.target.closest('[data-model]');if(target)selectModel(target.dataset.model)});
document.getElementById('aiNewChat')?.addEventListener('click',()=>{conversations[model]=[];histories[model]=[];drawThread();note('New conversation started.')});
function addBubble(text,role,error=false){if(!thread)return;const el=document.createElement('div');el.className='ai-msg '+role+(error?' error':'');const base='https://deadloxend-hash.github.io/looxtoolsfree/';const urls=/(https:\/\/deadloxend-hash\.github\.io\/looxtoolsfree\/[a-z0-9-]+\.html|https:\/\/deadloxend-hash\.github\.io\/looxtoolsfree\/index\.html)/gi;let last=0;for(const match of text.matchAll(urls)){const start=match.index;el.append(document.createTextNode(text.slice(last,start)));const link=document.createElement('a');link.href=match[0];link.textContent=match[0].slice(base.length);link.target='_self';link.rel='noopener';link.style.cssText='color:#d5aaff;text-decoration:underline;text-underline-offset:3px';el.append(link);last=start+match[0].length}el.append(document.createTextNode(text.slice(last)));thread.append(el);thread.scrollTop=thread.scrollHeight}
function drawThread(){if(!thread)return;thread.replaceChildren();if(!conversations[model].length){addBubble("Hi! I'm LOOX AI. What would you like to explore today?",'assistant');return}for(const msg of conversations[model])addBubble(msg.text,msg.role,msg.error)}
function resize(){prompt.style.height='auto';prompt.style.height=Math.min(prompt.scrollHeight,landing?200:160)+'px'}
prompt.addEventListener('input',resize);
prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}});
async function sendMessage(message){if(busy)return;if(!state.user){prompt.value=message;auth('login');note('Sign in to send your message.');return}
 if(model==='premium'&&!premium()){prompt.value=message;pricing();note('Upgrade to LOOX Pro to use the premium assistant.');return}
 const chosen=model;busy=true;send.disabled=true;prompt.value='';resize();conversations[chosen].push({role:'user',text:message});addBubble(message,'user');note('LOOX AI is thinking…');
 try{const session=(await state.client.auth.getSession()).data.session;if(!session)throw Error('Sign in again to continue.');
 const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox-chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({model:chosen,message,history:histories[chosen].slice(-8)}),signal:AbortSignal.timeout(65000)});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'LOOX AI could not answer right now.');
 const reply=String(data.reply||'').trim();if(!reply)throw Error('LOOX AI returned an empty response.');
 conversations[chosen].push({role:'assistant',text:reply});histories[chosen].push({role:'user',text:message},{role:'assistant',text:reply});if(model===chosen)addBubble(reply,'assistant');note('Response ready.');
 }catch(e){const text=e.message||'AI processing is temporarily unavailable.';conversations[chosen].push({role:'assistant',text,error:true});if(model===chosen)addBubble(text,'assistant',true);note('No LOOX AI credits were deducted.');}
 finally{busy=false;send.disabled=false;prompt.focus()}
}
form.addEventListener('submit',e=>{e.preventDefault();const message=prompt.value.trim();if(!message||busy)return;if(landing){try{sessionStorage.setItem(draftsKey,JSON.stringify({message,model}))}catch{}location.href='ai-chat.html';return}sendMessage(message)});
async function start(){try{await initialize()}catch{}if(thread)drawThread();if(landing){note('Free: 25 requests per day · Pro: paid subscribers.');return}
 let draft=null;try{draft=JSON.parse(sessionStorage.getItem(draftsKey)||'null');sessionStorage.removeItem(draftsKey)}catch{}
 if(draft&&typeof draft.message==='string'&&draft.message.trim()){model=draft.model==='premium'?'premium':'free';modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';if(state.user){await sendMessage(draft.message.trim().slice(0,1800))}else{prompt.value=draft.message.trim().slice(0,1800);resize();note('Sign in and press send to start your conversation.')}}else note(state.user?'LOOX Free · 25 requests per 24 hours.':'Sign in to chat with LOOX AI.');
}
start();

const aiNav=document.getElementById('aiNav'),navToggle=document.getElementById('aiNavToggle'),navClose=document.getElementById('aiNavClose'),navBackdrop=document.getElementById('aiNavBackdrop');
function setNav(open){aiNav.hidden=!open;navBackdrop.hidden=!open;navToggle.setAttribute('aria-expanded',String(open));navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');document.body.classList.toggle('ai-nav-open',open)}
navToggle?.addEventListener('click',()=>setNav(aiNav.hidden));navClose?.addEventListener('click',()=>setNav(false));navBackdrop?.addEventListener('click',()=>setNav(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!aiNav.hidden)setNav(false)});
