import {auth,state,initialize,pricing} from './account.js';

const $=id=>document.getElementById(id);
const landing=document.body.classList.contains('ai-home');
const prompt=$('aiPrompt'),form=$('aiForm'),send=$('aiSend');
const modelButton=$('aiModelButton'),modelMenu=$('aiModelMenu');
const toolsButton=$('aiToolsButton'),toolsMenu=$('aiToolsMenu');
const modelName=$('aiModelName'),status=$('aiStatus'),thread=$('aiThread');
const recentPanel=$('aiRecentPanel'),recentToggle=$('aiRecentToggle');
const recentList=$('aiRecentList'),recentMore=$('aiRecentMore'),recentScrim=$('aiRecentScrim');
const draftsKey='loox-ai-start-v1', historyURL='https://looxtoolfree-backend.vercel.app/api/loox-chat-history';
const chatURL='https://looxtoolfree-backend.vercel.app/api/loox-chat';
let model='free',busy=false,currentThreadId=null,messages=[],recentOffset=0;
let usage={free:null,premium:null},activeAnimation=0,knownUser=null,loadingRecent=false;
let mobile=window.matchMedia('(max-width:760px)');
let recentClosed=mobile.matches;

function note(value){if(status)status.textContent=value;}
function allowance(kind=model){
 const u=usage[kind];
 return u&&Number.isFinite(u.remaining)?u.remaining+' of '+u.limit+' messages remaining':
  (kind==='free'?'25 requests per 24 hours':'20 requests per 24 hours');
}
function quotaNote(){note((model==='free'?'LOOX Free · ':'LOOX Pro · ')+allowance());}
function premium(){return ['pro','lifetime'].includes(state.account?.plan);}
function hideMenus(){
 modelMenu.hidden=true;toolsMenu.hidden=true;
 modelButton.setAttribute('aria-expanded','false');
 toolsButton.setAttribute('aria-expanded','false');
}
modelButton?.addEventListener('click',()=>{
 const open=modelMenu.hidden;hideMenus();modelMenu.hidden=!open;
 modelButton.setAttribute('aria-expanded',String(open));
});
toolsButton?.addEventListener('click',()=>{
 const open=toolsMenu.hidden;hideMenus();toolsMenu.hidden=!open;
 toolsButton.setAttribute('aria-expanded',String(open));
});
document.addEventListener('click',event=>{
 if(!event.target.closest('.ai-composer-wrap'))hideMenus();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape')hideMenus();
});

async function sessionToken(){
 const session=(await state.client?.auth.getSession())?.data?.session;
 if(!session)throw Error('Sign in to access your private conversations.');
 return session.access_token;
}
async function historyRequest(action,options={}){
 const token=await sessionToken(),method=options.method||'GET';
 const url=new URL(historyURL);
 url.searchParams.set('action',action);
 if(options.id)url.searchParams.set('id',options.id);
 if(options.offset!=null)url.searchParams.set('offset',String(options.offset));
 const response=await fetch(url,{
  method,cache:'no-store',
  headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},
  body:method==='POST'?JSON.stringify(options.body||{}):undefined,
  signal:AbortSignal.timeout(25000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Could not access your conversations.');
 return data;
}
async function refreshQuota(){
 if(!state.user)return;
 try{
  const token=await sessionToken();
  const response=await fetch(chatURL,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  for(const kind of ['free','premium'])if(data[kind])usage[kind]=data[kind];
  if(!busy)quotaNote();
 }catch{}
}
function selectModel(choice){
 hideMenus();
 if(choice==='premium'&&!premium()){
  pricing();note('LOOX Pro requires an active subscription.');return;
 }
 if(choice!==model&&!landing){
  if(busy){note('Finish the current reply before switching models.');return;}
  newChat(false);
 }
 model=choice;
 modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';
 quotaNote();
}
modelMenu?.addEventListener('click',event=>{
 const target=event.target.closest('[data-model]');
 if(target)selectModel(target.dataset.model);
});

function addBubble(text,role,error=false){
 if(!thread)return null;
 const el=document.createElement('div');
 el.className='ai-msg '+role+(error?' error':'');
 setBubbleText(el,text);
 thread.append(el);
 thread.scrollTop=thread.scrollHeight;
 return el;
}
function setBubbleText(el,text){
 const base='https://deadloxend-hash.github.io/looxtoolsfree/';
 const urls=/(https:\/\/deadloxend-hash\.github\.io\/looxtoolsfree\/[a-z0-9-]+\.html(?:\?[a-z0-9%=&_-]+)?)/gi;
 let last=0;
 el.replaceChildren();
 for(const match of String(text).matchAll(urls)){
  el.append(document.createTextNode(text.slice(last,match.index)));
  const link=document.createElement('a');
  link.href=match[0];link.textContent=match[0].slice(base.length);
  link.rel='noopener';link.style.cssText='color:#d5aaff;text-decoration:underline;text-underline-offset:3px';
  el.append(link);last=match.index+match[0].length;
 }
 el.append(document.createTextNode(String(text).slice(last)));
}
function drawThread(){
 activeAnimation++;
 if(!thread)return;
 thread.replaceChildren();
 if(!messages.length){
  addBubble("Hi! I'm LOOX AI. What would you like to explore today?",'assistant');
 }else for(const msg of messages)addBubble(msg.text,msg.role,Boolean(msg.error));
}
function showThinking(){
 const el=document.createElement('div');
 el.className='ai-msg assistant ai-typing';
 el.setAttribute('aria-label','LOOX AI is preparing a reply');
 el.innerHTML='<span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>';
 thread.append(el);thread.scrollTop=thread.scrollHeight;
 return el;
}
async function animateReply(reply,targetThread){
 if(!thread||targetThread!==currentThreadId)return;
 const el=addBubble('','assistant');
 const seq=++activeAnimation;
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  setBubbleText(el,reply);return;
 }
 // Display word-by-word, rather than instantaneously dumping the whole answer.
 // Cap the animation for very long replies, and cancel it when chats change.
 const pieces=reply.match(/\S+\s*/g)||[reply];
 const interval=Math.min(66,Math.max(15,13000/Math.max(pieces.length,1)));
 const chunk=pieces.length>400?2:1;
 let i=0;
 await new Promise(resolve=>{
  function tick(){
   if(seq!==activeAnimation||!el.isConnected){resolve();return;}
   i=Math.min(pieces.length,i+chunk);
   el.textContent=pieces.slice(0,i).join('');
   thread.scrollTop=thread.scrollHeight;
   if(i>=pieces.length){resolve();return;}
   setTimeout(tick,interval);
  }
  tick();
 });
 if(seq===activeAnimation&&el.isConnected)setBubbleText(el,reply);
}
function resize(){
 prompt.style.height='auto';
 prompt.style.height=Math.min(prompt.scrollHeight,landing?200:160)+'px';
}
prompt?.addEventListener('input',resize);
prompt?.addEventListener('keydown',event=>{
 if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
  event.preventDefault();form.requestSubmit();
 }
});

function setRecentOpen(open){
 if(!recentPanel)return;
 recentClosed=!open;
 recentPanel.classList.toggle('is-collapsed',recentClosed);
 document.body.classList.toggle('ai-recent-open',open);
 recentToggle.setAttribute('aria-expanded',String(open));
 recentToggle.textContent=open?'›':'‹';
 recentToggle.title=open?'Hide recent chats':'Show recent chats';
 if(recentScrim)recentScrim.hidden=!open||!mobile.matches;
}
recentToggle?.addEventListener('click',()=>setRecentOpen(recentClosed));
recentScrim?.addEventListener('click',()=>setRecentOpen(false));
mobile.addEventListener('change',()=>setRecentOpen(!mobile.matches));
setRecentOpen(!mobile.matches);

function chatURLState(id){
 const u=new URL(location.href);
 if(id)u.searchParams.set('id',id);
 else u.searchParams.delete('id');
 history.replaceState(null,'',u.pathname+u.search);
}
function newChat(focus=true){
 if(busy){note('Finish the current reply before starting a new chat.');return;}
 currentThreadId=null;messages=[];activeAnimation++;
 chatURLState(null);drawThread();
 if(mobile.matches)setRecentOpen(false);
 note('New chat ready.');if(focus)prompt.focus();
 renderSelectedThread();
}
$('aiNewChat')?.addEventListener('click',()=>newChat());

function renderSelectedThread(){
 document.querySelectorAll('.ai-recent-item').forEach(node=>
  node.classList.toggle('is-active',node.dataset.id===currentThreadId));
}
function emptyRecent(message){
 recentList.replaceChildren();
 const text=document.createElement('p');
 text.className='ai-recent-empty';text.textContent=message;
 recentList.append(text);
}
function createRecentRow(t){
 const row=document.createElement('div');
 row.className='ai-recent-item';row.dataset.id=t.id;
 const open=document.createElement('button');
 open.type='button';open.className='ai-recent-open';
 open.title=t.title||'Open conversation';
 const excerpt=document.createElement('span');
 excerpt.className='ai-recent-title';
 excerpt.textContent=t.title||'Conversation';
 open.append(excerpt);
 const minor=document.createElement('small');
 minor.textContent=(t.model==='premium'?'Pro · ':'Free · ')+
  new Date(t.updated_at).toLocaleDateString();
 open.append(minor);
 open.addEventListener('click',()=>openThread(t.id));
 const del=document.createElement('button');
 del.type='button';del.className='ai-recent-delete';
 del.setAttribute('aria-label','Delete '+(t.title||'chat'));
 del.title='Delete conversation';del.textContent='×';
 del.addEventListener('click',async()=>{
  if(busy){note('Finish the reply before deleting conversations.');return;}
  if(!confirm('Permanently delete this conversation and its messages?'))return;
  del.disabled=true;
  try{
   await historyRequest('delete',{method:'POST',body:{id:t.id}});
   if(currentThreadId===t.id)newChat(false);
   await loadRecent(true);
   note('Conversation deleted.');
  }catch(error){del.disabled=false;note(error.message);}
 });
 row.append(open,del);
 return row;
}
async function loadRecent(reset=true){
 if(!recentList||!state.user||loadingRecent)return;
 loadingRecent=true;
 if(reset){recentOffset=0;emptyRecent('Loading your conversations…');}
 try{
  const data=await historyRequest('list',{offset:recentOffset});
  if(reset)recentList.replaceChildren();
  if(!data.threads?.length&&!recentOffset)emptyRecent('Your conversations will appear here after you send a message.');
  for(const t of data.threads||[])recentList.append(createRecentRow(t));
  recentOffset+=(data.threads||[]).length;
  recentMore.hidden=!data.has_more;
  renderSelectedThread();
 }catch(error){if(reset)emptyRecent(error.message);}
 finally{loadingRecent=false;}
}
recentMore?.addEventListener('click',()=>loadRecent(false));

async function openThread(id){
 if(busy){note('Finish the current reply before switching chats.');return;}
 if(!state.user)return auth('login');
 try{
  const result=await historyRequest('read',{id});
  currentThreadId=result.thread.id;
  model=result.thread.model;
  modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';
  messages=result.messages.map(m=>({role:m.role,text:m.content}));
  drawThread();chatURLState(id);renderSelectedThread();quotaNote();
  if(mobile.matches)setRecentOpen(false);
 }catch(error){note(error.message);}
}

async function sendMessage(message){
 if(busy)return;
 if(!state.user){prompt.value=message;auth('login');note('Sign in to send your message.');return;}
 if(model==='premium'&&!premium()){prompt.value=message;pricing();note('Upgrade to LOOX Pro to use this model.');return;}
 const chosen=model;
 busy=true;send.disabled=true;
 prompt.value='';resize();
 messages.push({role:'user',text:message});
 addBubble(message,'user');
 const thinking=showThinking();note('LOOX AI is preparing your reply…');
 let id=currentThreadId;
 try{
  const token=await sessionToken();
  const response=await fetch(chatURL,{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
   body:JSON.stringify({model:chosen,message,threadId:id}),
   signal:AbortSignal.timeout(65000)
  });
  const data=await response.json().catch(()=>({}));
  if(data.usage)usage[chosen]=data.usage;
  if(!response.ok)throw Error(data.error||'LOOX AI could not answer.');
  const reply=String(data.reply||'').trim();
  if(!reply||typeof data.threadId!=='string')throw Error('The reply was not saved. Please retry.');
  // The backend only returns threadId after a successful, atomic save.
  id=data.threadId;
  currentThreadId=id;
  chatURLState(id);
  renderSelectedThread();
  messages.push({role:'assistant',text:reply});
  thinking.remove();
  note('LOOX AI is typing…');
  void loadRecent(true);
  await animateReply(reply,id);
  quotaNote();
 }catch(error){
  thinking.remove();
  const text=error.message||'LOOX AI is temporarily unavailable.';
  messages.push({role:'assistant',text,error:true});
  if(id===currentThreadId)addBubble(text,'assistant',true);
  note(text);
  await loadRecent(true);
  await refreshQuota();
 }finally{
  thinking.remove();busy=false;send.disabled=false;
  if(!landing)prompt.focus();
 }
}
form?.addEventListener('submit',event=>{
 event.preventDefault();
 const message=prompt.value.trim();
 if(!message||busy)return;
 if(landing){
  try{sessionStorage.setItem(draftsKey,JSON.stringify({message,model}));}catch{}
  location.assign('ai-chat.html');return;
 }
 sendMessage(message);
});

async function syncUser(){
 if(landing)return;
 const userId=state.user?.id||null;
 if(userId===knownUser)return;
 knownUser=userId;
 currentThreadId=null;messages=[];drawThread();
 if(!userId){
  emptyRecent('Sign in to save and reopen your conversations.');
  recentMore.hidden=true;
  return;
 }
 await loadRecent(true);
}
document.addEventListener('loox-user',()=>{syncUser().catch(()=>{});if(state.user)refreshQuota();});
document.addEventListener('loox-account',()=>{if(!busy)refreshQuota();});

async function start(){
 try{await initialize();}catch{}
 await syncUser();
 await refreshQuota();
 if(landing){
  if(!state.user)note('Free: 25 messages per day · Pro: paid subscribers');
  return;
 }
 drawThread();
 let draft=null;
 try{draft=JSON.parse(sessionStorage.getItem(draftsKey)||'null');sessionStorage.removeItem(draftsKey);}catch{}
 if(draft&&typeof draft.message==='string'&&draft.message.trim()){
  model=draft.model==='premium'?'premium':'free';
  modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';
  if(state.user)await sendMessage(draft.message.trim().slice(0,1800));
  else{
   prompt.value=draft.message.trim().slice(0,1800);resize();
   note('Sign in and press Send to start your conversation.');
  }
 }else{
  const id=new URLSearchParams(location.search).get('id');
  if(state.user&&id)await openThread(id);
  else if(!state.user)note('Sign in to chat and save your conversations.');
  else quotaNote();
 }
}
start();

// The shared LOOX navigation hamburger is managed by loox-experience.js.
