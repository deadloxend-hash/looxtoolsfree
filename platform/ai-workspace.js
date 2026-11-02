import {auth,state,initialize,pricing} from './account.js';
const landing=document.body.classList.contains('ai-home');
const prompt=document.getElementById('aiPrompt'),form=document.getElementById('aiForm'),send=document.getElementById('aiSend'),modelButton=document.getElementById('aiModelButton'),modelMenu=document.getElementById('aiModelMenu'),toolsButton=document.getElementById('aiToolsButton'),toolsMenu=document.getElementById('aiToolsMenu'),modelName=document.getElementById('aiModelName'),status=document.getElementById('aiStatus'),thread=document.getElementById('aiThread');
const draftsKey='loox-ai-start-v1';const conversations={free:[],premium:[]};const histories={free:[],premium:[]};let model='free',busy=false;let usage={free:null,premium:null};let activeAnimation=0;
function allowance(kind=model){const u=usage[kind];return u&&Number.isFinite(u.remaining)?`${u.remaining} of ${u.limit} messages remaining`:(kind==='free'?'25 requests per 24 hours':'20 requests per 24 hours')}
function quotaNote(){note((model==='free'?'LOOX Free · ':'LOOX Pro · ')+allowance())}
async function refreshQuota(){if(!state.user)return;try{const session=(await state.client.auth.getSession()).data.session;if(!session)return;const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox-chat',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});if(!response.ok)return;const data=await response.json();for(const kind of ['free','premium'])if(data[kind])usage[kind]=data[kind];quotaNote()}catch{}}

function premium(){return ['pro','lifetime'].includes(state.account?.plan)}
function note(s){if(status)status.textContent=s}
function hideMenus(){modelMenu.hidden=true;toolsMenu.hidden=true;modelButton.setAttribute('aria-expanded','false');toolsButton.setAttribute('aria-expanded','false')}
modelButton.addEventListener('click',()=>{const open=modelMenu.hidden;hideMenus();modelMenu.hidden=!open;modelButton.setAttribute('aria-expanded',String(open))});
toolsButton.addEventListener('click',()=>{const open=toolsMenu.hidden;hideMenus();toolsMenu.hidden=!open;toolsButton.setAttribute('aria-expanded',String(open))});
document.addEventListener('click',event=>{if(!event.target.closest('.ai-composer-wrap'))hideMenus()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideMenus()});
function selectModel(choice){hideMenus();if(choice==='premium'&&!premium()){pricing();note('LOOX Pro requires an active paid subscription.');return}model=choice;modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';if(thread)drawThread();quotaNote()}
modelMenu.addEventListener('click',event=>{const target=event.target.closest('[data-model]');if(target)selectModel(target.dataset.model)});
document.getElementById('aiNewChat')?.addEventListener('click',()=>{conversations[model]=[];histories[model]=[];drawThread();note('New conversation started.')});
function addBubble(text,role,error=false){if(!thread)return;const el=document.createElement('div');el.className='ai-msg '+role+(error?' error':'');const base='https://deadloxend-hash.github.io/looxtoolsfree/';const urls=/(https:\/\/deadloxend-hash\.github\.io\/looxtoolsfree\/[a-z0-9-]+\.html|https:\/\/deadloxend-hash\.github\.io\/looxtoolsfree\/index\.html)/gi;let last=0;for(const match of text.matchAll(urls)){const start=match.index;el.append(document.createTextNode(text.slice(last,start)));const link=document.createElement('a');link.href=match[0];link.textContent=match[0].slice(base.length);link.target='_self';link.rel='noopener';link.style.cssText='color:#d5aaff;text-decoration:underline;text-underline-offset:3px';el.append(link);last=start+match[0].length}el.append(document.createTextNode(text.slice(last)));thread.append(el);thread.scrollTop=thread.scrollHeight;return el}

function showThinking(){if(!thread)return null;const el=document.createElement('div');el.className='ai-msg assistant ai-typing';el.setAttribute('aria-label','LOOX AI is preparing a response');el.innerHTML='<span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>';thread.append(el);thread.scrollTop=thread.scrollHeight;return el}
async function animateReply(reply,kind){if(model!==kind||!thread)return;const el=addBubble('','assistant');const id=++activeAnimation;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const tokens=reply.match(/\S+\s*/g)||[reply];if(reduced||tokens.length>650){el.replaceWith(addBubble(reply,'assistant'));return}let index=0;await new Promise(resolve=>{function tick(){if(id!==activeAnimation||!el.isConnected){resolve();return}const n=Math.min(tokens.length,index+Math.max(1,Math.ceil(tokens.length/95)));const partial=tokens.slice(index,n).join('');el.append(document.createTextNode(partial));index=n;thread.scrollTop=thread.scrollHeight;if(index>=tokens.length){resolve();return}setTimeout(tick,16)}tick()});const parent=el.parentNode;if(parent){const full=addBubble(reply,'assistant');parent.replaceChild(full,el);full.scrollIntoView({block:'nearest'})}}
function drawThread(){activeAnimation++;if(!thread)return;thread.replaceChildren();if(!conversations[model].length){addBubble("Hi! I'm LOOX AI. What would you like to explore today?",'assistant');return}for(const msg of conversations[model])addBubble(msg.text,msg.role,msg.error)}
function resize(){prompt.style.height='auto';prompt.style.height=Math.min(prompt.scrollHeight,landing?200:160)+'px'}
prompt.addEventListener('input',resize);
prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}});
async function sendMessage(message){if(busy)return;if(!state.user){prompt.value=message;auth('login');note('Sign in to send your message.');return}
 if(model==='premium'&&!premium()){prompt.value=message;pricing();note('Upgrade to LOOX Pro to use the premium assistant.');return}
 const chosen=model;busy=true;send.disabled=true;prompt.value='';resize();conversations[chosen].push({role:'user',text:message});addBubble(message,'user');const thinking=showThinking();note('LOOX AI is typing…');
 try{const session=(await state.client.auth.getSession()).data.session;if(!session)throw Error('Sign in again to continue.');
 const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox-chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({model:chosen,message,history:histories[chosen].slice(-8)}),signal:AbortSignal.timeout(65000)});
 const data=await response.json().catch(()=>({}));if(data.usage){usage[chosen]=data.usage;quotaNote()}else if(response.status===429){await refreshQuota()}if(!response.ok)throw Error(data.error||'LOOX AI could not answer right now.');
 const reply=String(data.reply||'').trim();if(!reply)throw Error('LOOX AI returned an empty response.');
 conversations[chosen].push({role:'assistant',text:reply});histories[chosen].push({role:'user',text:message},{role:'assistant',text:reply});thinking?.remove();if(model===chosen)await animateReply(reply,chosen);quotaNote();
 }catch(e){const text=e.message||'AI processing is temporarily unavailable.';conversations[chosen].push({role:'assistant',text,error:true});thinking?.remove();if(model===chosen)addBubble(text,'assistant',true);await refreshQuota();}
 finally{thinking?.remove();busy=false;send.disabled=false;prompt.focus()}
}
form.addEventListener('submit',e=>{e.preventDefault();const message=prompt.value.trim();if(!message||busy)return;if(landing){try{sessionStorage.setItem(draftsKey,JSON.stringify({message,model}))}catch{}location.href='ai-chat.html';return}sendMessage(message)});
async function start(){try{await initialize()}catch{}if(thread)drawThread();await refreshQuota();if(landing){if(!state.user)note('Free: 25 messages per day · Pro: paid subscribers');return}
 let draft=null;try{draft=JSON.parse(sessionStorage.getItem(draftsKey)||'null');sessionStorage.removeItem(draftsKey)}catch{}
 if(draft&&typeof draft.message==='string'&&draft.message.trim()){model=draft.model==='premium'?'premium':'free';modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';if(state.user){await sendMessage(draft.message.trim().slice(0,1800))}else{prompt.value=draft.message.trim().slice(0,1800);resize();note('Sign in and press send to start your conversation.')}}else if(state.user)quotaNote();else note('Sign in to chat with LOOX AI.');
}
start();

// Open the exact same site-wide All tools dialog used by the main LOOX Tools homepage.
document.getElementById('aiNavToggle')?.addEventListener('click',()=>{
 if(typeof window.LOOXOpenAllTools==='function')window.LOOXOpenAllTools();
 else location.href='index.html#tools';
});
