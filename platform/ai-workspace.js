import {auth,state,initialize,pricing} from './account.js?v=9';

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
let openingThread=0,openingAttachments=0,attachments=[];
const attachmentURL='https://looxtoolfree-backend.vercel.app/api/loox';
async function attachmentRequest(action,options={}){
 const token=await sessionToken(),method=options.method||'GET',url=new URL(attachmentURL);
 url.searchParams.set('action','chat_attachment_'+action);
 if(options.thread_id)url.searchParams.set('thread_id',options.thread_id);
 const response=await fetch(url,{method,cache:'no-store',credentials:'omit',
  headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},
  body:method==='POST'?JSON.stringify(options.body||{}):undefined,signal:AbortSignal.timeout(65000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Chat attachment could not be saved.');
 return data;
}
function attachmentBubble(item){
 if(!thread)return;
 const box=document.createElement('div');box.className='ai-msg user ai-attachment';
 box.style.cssText='display:flex;align-items:center;gap:10px;max-width:min(100%,310px);margin-left:auto';
 const img=document.createElement('img');img.src=item.thumbnail_url||item.url;
 img.alt='Chat image';img.loading='lazy';img.decoding='async';
 img.style.cssText='display:block;max-width:190px;max-height:180px;width:auto;height:auto;object-fit:contain;border-radius:12px';
 const controls=document.createElement('div');controls.style.cssText='display:flex;flex-direction:column;gap:8px';
 const view=document.createElement('a');view.href=item.url;view.target='_blank';view.rel='noopener noreferrer';
 view.textContent='Open';view.style.cssText='color:#c9a6ff;font-size:12px';
 const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';
 remove.setAttribute('aria-label','Delete chat image');remove.style.cssText='font:inherit;font-size:12px;color:#f2d9ff;background:#45275a;border:1px solid #76548d;border-radius:6px;cursor:pointer';
 remove.addEventListener('click',async()=>{
  if(busy)return note('Finish the current reply first.');
  const id=currentThreadId;if(!id||!confirm('Delete this chat image?'))return;
  remove.disabled=true;
  try{await attachmentRequest('delete',{method:'POST',body:{id:item.id}});
   if(currentThreadId===id)await loadAttachments(id);
   note('Chat image deleted.');
  }catch(error){note(error.message);remove.disabled=false;}
 });
 controls.append(view,remove);box.append(img,controls);thread.append(box);
}
async function loadAttachments(id){
 const seq=++openingAttachments,owner=state.user?.id;
 const data=await attachmentRequest('list',{thread_id:id});
 if(seq!==openingAttachments||id!==currentThreadId||owner!==state.user?.id)return;
 attachments=data.items||[];drawThread();
}
const sessionPreview=title=>String(title||'Untitled session').trim().split(/\s+/u).slice(0,3).join(' ');
let mobile=window.matchMedia('(max-width:760px)');
let recentClosed=false;

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

function nearBottom(){return !thread||thread.scrollHeight-thread.scrollTop-thread.clientHeight<150;}
function followBottom(near){if(near&&thread)thread.scrollTop=thread.scrollHeight;}
function addBubble(text,role,error=false){
 const near=nearBottom();
 if(!thread)return null;
 const el=document.createElement('div');
 el.className='ai-msg '+role+(error?' error':'');
 setBubbleText(el,text);
 thread.append(el);
 followBottom(near);
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
 // A fresh AI Agent session uses the same uncluttered empty workspace as Image/Video.
 // Messages appear only after the user starts the conversation.
 for(const msg of messages)addBubble(msg.text,msg.role,Boolean(msg.error));
 for(const item of attachments)attachmentBubble(item);
}
function showThinking(){
 const el=document.createElement('div');
 el.className='ai-msg assistant ai-typing';
 el.setAttribute('aria-label','LOOX AI is preparing a reply');
 el.innerHTML='<span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>';
 const near=nearBottom();thread.append(el);followBottom(near);
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
   const near=nearBottom();el.textContent=pieces.slice(0,i).join('');
   followBottom(near);
   if(i>=pieces.length){resolve();return;}
   setTimeout(tick,interval);
  }
  tick();
 });
 if(seq===activeAnimation&&el.isConnected)setBubbleText(el,reply);
}
function resize(){
 // Shared generator styles use !important; update inline height at the same priority
 // so multiline chat input grows without changing the bottom composer position.
 prompt.style.setProperty('height','auto','important');
 prompt.style.setProperty('height',Math.min(prompt.scrollHeight,landing?200:132)+'px','important');
}
prompt?.addEventListener('input',resize);
prompt?.addEventListener('keydown',event=>{
 if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
  event.preventDefault();form.requestSubmit();
 }
});

// AI Agent sessions are permanent and never close on mobile or desktop.
function setRecentOpen(){
 if(!recentPanel)return;
 recentClosed=false;
 recentPanel.classList.remove('is-collapsed');
 document.body.classList.add('ai-recent-open','ai-agent-permanent-sessions');
 if(recentScrim)recentScrim.hidden=true;
}
setRecentOpen();

function chatURLState(id){
 const u=new URL(location.href);
 if(id)u.searchParams.set('id',id);
 else u.searchParams.delete('id');
 history.replaceState(null,'',u.pathname+u.search);
}
function newChat(focus=true){
 openingThread++;
 if(busy){note('Finish the current reply before starting a new chat.');return;}
 currentThreadId=null;messages=[];attachments=[];openingAttachments++;activeAnimation++;
 chatURLState(null);drawThread();
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
const pinSvg='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-3 1-3 5-5-5 5-3 1-3Z"/><path d="m10 14-7 7"/></svg>';
function chatPinKey(){return 'loox-pinned-chat-threads:'+state.user?.id;}
function pinnedChats(){try{const v=JSON.parse(localStorage.getItem(chatPinKey())||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function reorderChatPins(){const pinned=pinnedChats(),rows=[...recentList.querySelectorAll('.ai-recent-item')];rows.forEach(row=>{const on=pinned.includes(row.dataset.id);row.classList.toggle('is-pinned',on);const pin=row.querySelector('.loox-session-pin');if(pin){pin.title=on?'Unpin chat':'Pin chat';pin.setAttribute('aria-label',pin.title);pin.setAttribute('aria-pressed',String(on));}});rows.sort((a,b)=>Number(pinned.includes(b.dataset.id))-Number(pinned.includes(a.dataset.id)));rows.forEach(row=>recentList.append(row));}
function toggleChatPin(id){const current=pinnedChats(),next=current.includes(id)?current.filter(x=>x!==id):[id,...current];try{localStorage.setItem(chatPinKey(),JSON.stringify(next))}catch{}reorderChatPins();}
function createRecentRow(t){
 const row=document.createElement('div');
 row.className='ai-recent-item';row.dataset.id=t.id;
 const open=document.createElement('button');
 open.type='button';open.className='ai-recent-open';
 open.title=t.title||'Open conversation';
 const excerpt=document.createElement('span');
 excerpt.className='ai-recent-title';
 excerpt.textContent=sessionPreview(t.title||'Conversation');
 open.append(excerpt);
 open.title=(t.title||'Conversation')+'\nCreated '+new Date(t.created_at).toLocaleString()+'\nLast activity '+new Date(t.updated_at).toLocaleString();
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
 const pin=document.createElement('button');pin.type='button';pin.className='loox-session-pin';pin.innerHTML=pinSvg;pin.title='Pin chat';pin.setAttribute('aria-label','Pin chat');pin.setAttribute('aria-pressed','false');pin.addEventListener('click',()=>toggleChatPin(t.id));
 const menu=document.createElement('details');menu.className='loox-session-menu';
 const summary=document.createElement('summary');summary.textContent='⋯';summary.setAttribute('aria-label','Session actions');
 const rename=document.createElement('button');rename.type='button';rename.textContent='Rename';
 rename.addEventListener('click',async()=>{
  if(busy){note('Wait for the current reply.');return;}
  const title=window.prompt('Session name',t.title)?.trim();if(!title)return;
  try{const result=await state.client.from('loox_chat_threads').update({title:title.slice(0,120)}).eq('id',t.id);if(result.error)throw result.error;await loadRecent(true);}catch(error){note(error.message);}
 });
 del.textContent='Delete';menu.append(summary,rename,del);row.append(open,pin,menu);
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
  reorderChatPins();
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
  const seq=++openingThread,user=state.user.id;
  const result=await historyRequest('read',{id});
  if(seq!==openingThread||user!==state.user?.id)return;
  currentThreadId=result.thread.id;
  model=result.thread.model;
  modelName.textContent=model==='free'?'✦ LOOX Free':'♛ LOOX Pro';
  messages=result.messages.map(m=>({role:m.role,text:m.content}));
  attachments=[];drawThread();chatURLState(id);renderSelectedThread();quotaNote();
  await loadAttachments(id).catch(error=>{if(id===currentThreadId)note('Images: '+error.message);});
 }catch(error){note(error.message);}
}

async function sendMessage(message){
 if(busy)return;
 if(!state.user){prompt.value=message;auth('login');note('Sign in to send your message.');return;}
 if(model==='premium'&&!premium()){prompt.value=message;pricing();note('Upgrade to LOOX Pro to use this model.');return;}
 const chosen=model,generationUser=state.user.id;
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
  if(generationUser!==state.user?.id)return;
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
 knownUser=userId;openingThread++;
 currentThreadId=null;messages=[];attachments=[];openingAttachments++;drawThread();
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

if(!landing&&toolsButton?.parentElement){
 const upload=document.createElement('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';
 upload.hidden=true;upload.setAttribute('aria-label','Choose a private chat image');
 const attach=document.createElement('button');attach.type='button';attach.className='ai-round';
 attach.textContent='📎';attach.title='Attach an image to this saved chat';
 attach.setAttribute('aria-label','Attach image');toolsButton.parentElement.insertBefore(attach,toolsButton.nextSibling);
 toolsButton.parentElement.append(upload);
 attach.addEventListener('click',()=>{
  if(busy)return note('Finish the current reply before attaching an image.');
  if(!state.user)return auth('login');
  if(!currentThreadId)return note('Send a message first to create a saved chat, then attach an image.');
  upload.click();
 });
 upload.addEventListener('change',async()=>{
  const file=upload.files?.[0],id=currentThreadId;upload.value='';
  if(!file||!id)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2_097_152)
   return note('Choose a PNG, JPG or WebP image under 2 MB.');
  attach.disabled=true;note('Saving image privately to this chat…');
  try{
   const image=await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(Error('Could not read the image.'));reader.readAsDataURL(file);
   });
   await attachmentRequest('upload',{method:'POST',body:{thread_id:id,image}});
   if(currentThreadId===id){await loadAttachments(id);note('Image saved in this chat. AI text replies do not analyze image contents.');}
  }catch(error){note(error.message);}
  finally{attach.disabled=false;}
 });
}

start();

// The shared LOOX navigation hamburger is managed by loox-experience.js.
