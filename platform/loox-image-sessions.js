import {publishCreation} from './community.js?v=1';
// Private media conversations; job API remains responsible for credits and files.
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
const checked=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const date=t=>new Date(t).toLocaleString();
export class MediaSessions {
 constructor(options){
  Object.assign(this,options);this.id=null;this.epoch=0;this.user=undefined;this.offset=0;
  this.root.classList.add('loox-sessions-layout');document.body.classList.add('loox-conversations','loox-focus-generator');
  this.scroll=this.feed.closest('.lig-content-scroll');
  // Reuse the rail rendered in HTML so the layout exists before the async model config finishes.
  this.rail=this.root.querySelector(':scope > .loox-session-rail')||el('aside','loox-session-rail');
  this.rail.className='loox-session-rail';this.rail.setAttribute('aria-label','Generative sessions');
  const head=el('div','loox-session-head');head.append(el('strong','','Generative sessions'));
  this.toggle=this.button('‹',()=>this.collapse(!this.rail.classList.contains('collapsed')));this.toggle.className='loox-session-toggle';this.toggle.setAttribute('aria-label','Toggle generative sessions');head.append(this.toggle);
  this.list=el('div','loox-session-list');this.list.id='loox-media-sessions';this.toggle.setAttribute('aria-controls',this.list.id);
  this.more=this.button('Load more',()=>this.loadList(false));this.more.hidden=true;
  const recent=el('div','loox-session-recent-label','Recent');
  this.rail.replaceChildren(head,this.button('＋ New chat',()=>this.fresh()),recent,this.list,this.more);
  if(!this.rail.isConnected)this.root.append(this.rail);
  this.scrim=this.button('',()=>this.collapse(true));this.scrim.className='loox-session-scrim';this.scrim.setAttribute('aria-label','Close sessions');this.root.append(this.scrim);
  // New generator workspaces begin with Generative sessions expanded on every screen size.
  this.collapse(matchMedia('(max-width:900px)').matches);
  const main=this.root.closest('main');
  const layout=()=>{const v=window.visualViewport,h=document.querySelector('body > header');const top=Math.max(main.getBoundingClientRect().top,h?.getBoundingClientRect().bottom||0);document.documentElement.style.setProperty('--loox-workspace-height',Math.max(180,(v?.height||innerHeight)+(v?.offsetTop||0)-top)+'px');};
  if(window.ResizeObserver)new ResizeObserver(layout).observe(document.querySelector('body > header')||this.root);
  window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',layout);layout();
  this.prompt.addEventListener('input',()=>{this.prompt.style.height='auto';this.prompt.style.height=Math.min(132,this.prompt.scrollHeight)+'px';});
  document.addEventListener('click',event=>{const a=event.target.closest('a');if(!a)return;const u=new URL(a.href,location.href);if(u.origin===location.origin&&/\/(ai-text-to-image|ai-image-workspace|ai-video-generator)\.html$/.test(u.pathname)&&u.hash!=='#templates'){if(this.id)u.searchParams.set('session',this.id);else u.searchParams.delete('session');a.href=u.href;}},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&matchMedia('(max-width:900px)').matches)this.collapse(true);});
 }
 button(label,fn){const b=el('button','lig-small-action',label);b.type='button';b.addEventListener('click',()=>Promise.resolve().then(fn).catch(e=>this.notice(e.message,true)));return b;}
 setCommunity(on){this.root.classList.toggle('loox-community-view',on);this.rail.hidden=on;this.scrim.hidden=on||this.rail.classList.contains('collapsed')||!matchMedia('(max-width:900px)').matches;}
 collapse(closed){this.rail.classList.toggle('collapsed',closed);this.root.classList.toggle('loox-sessions-collapsed',closed);this.toggle.textContent=closed?'›':'‹';this.toggle.setAttribute('aria-expanded',String(!closed));this.scrim.hidden=closed||!matchMedia('(max-width:900px)').matches;}
 url(){const u=new URL(location.href);if(this.id)u.searchParams.set('session',this.id);else u.searchParams.delete('session');history.replaceState(null,'',u.pathname+u.search+u.hash);}
 nearBottom(){return this.scroll.scrollHeight-this.scroll.scrollTop-this.scroll.clientHeight<160;}
 bottom(near){if(near)requestAnimationFrame(()=>this.scroll.scrollTo({top:this.scroll.scrollHeight,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}));}
 async init(){const uid=this.state.user?.id||null;if(uid===this.user)return;if(this.user&&uid!==this.user){this.id=null;this.url();}this.user=uid;this.epoch++;this.id=null;this.feed.replaceChildren();if(!uid){this.list.replaceChildren(el('p','','Sign in to save your sessions.'));this.more.hidden=true;return;}await this.loadList();const params=new URLSearchParams(location.search),id=params.get('session');if(id)await this.open(id);const reuse=params.get('reuse');if(reuse&&id){const entry=checked(await this.state.client.from('loox_media_entries').select('*').eq('id',reuse).eq('session_id',id).single());const u=new URL(location.href);u.searchParams.delete('reuse');history.replaceState(null,'',u.pathname+u.search+u.hash);await this.reuse(entry);}}
 async fresh(){if(this.isBusy())throw Error('Wait for the current generation.');this.epoch++;this.id=null;this.feed.replaceChildren();this.url();await this.loadList();if(matchMedia('(max-width:900px)').matches)this.collapse(true);this.prompt.focus();}
 pinKey(){return 'loox-pinned-media-sessions:'+this.state.user?.id;}
 pinnedSessions(){try{const v=JSON.parse(localStorage.getItem(this.pinKey())||'[]');return Array.isArray(v)?v:[]}catch{return []}}
 togglePinnedSession(id){const pinned=this.pinnedSessions();const next=pinned.includes(id)?pinned.filter(x=>x!==id):[id,...pinned];try{localStorage.setItem(this.pinKey(),JSON.stringify(next))}catch{}this.refreshPinnedRows();}
 refreshPinnedRows(){const pinned=this.pinnedSessions(),rows=[...this.list.querySelectorAll('.loox-session-row')];rows.forEach(row=>{const active=pinned.includes(row.dataset.session);row.classList.toggle('is-pinned',active);const btn=row.querySelector('.loox-session-pin');if(btn){btn.textContent=active?'◆':'♧';btn.title=active?'Unpin chat':'Pin chat';btn.setAttribute('aria-label',btn.title);btn.setAttribute('aria-pressed',String(active));}});rows.sort((a,b)=>Number(pinned.includes(b.dataset.session))-Number(pinned.includes(a.dataset.session)));rows.forEach(row=>this.list.append(row));}
 async loadList(reset=true){
  if(!this.state.user)return;const uid=this.state.user.id;if(reset)this.offset=0;
  const rows=checked(await this.state.client.from('loox_media_sessions').select('*').order('updated_at',{ascending:false}).order('id').range(this.offset,this.offset+39));
  if(uid!==this.state.user?.id)return;if(reset)this.list.replaceChildren();this.offset+=rows.length;this.more.hidden=rows.length<40;
  for(const s of rows){const row=el('div','loox-session-row');row.classList.toggle('active',s.id===this.id);const open=this.button(s.title,()=>this.open(s.id));open.className='loox-session-entry';open.title=s.title+'\nCreated '+date(s.created_at)+'\nLast activity '+date(s.updated_at);
   const menu=el('details','loox-session-menu'),summary=el('summary','','⋯');summary.setAttribute('aria-label','Session actions');
   const pin=this.button('♧',()=>this.togglePinnedSession(s.id));pin.className='loox-session-pin';pin.title='Pin chat';pin.setAttribute('aria-label','Pin chat');pin.setAttribute('aria-pressed','false');
   menu.append(summary,this.button('Rename',async()=>{const title=window.prompt('Session name',s.title)?.trim();if(!title)return;checked(await this.state.client.from('loox_media_sessions').update({title:title.slice(0,120)}).eq('id',s.id));await this.loadList();}),this.button('Delete session',async()=>{if(this.isBusy())throw Error('Wait for the current generation.');if(!confirm('Delete this session? Original media files and credit records stay in your account.'))return;checked(await this.state.client.from('loox_media_sessions').delete().eq('id',s.id));if(this.id===s.id)await this.fresh();else await this.loadList();}));const thumb=el('span','loox-session-thumb','✧');row.append(thumb,open,pin,menu);this.list.append(row);row.dataset.session=s.id;
  }
  this.refreshPinnedRows();
  this.loadThumbnails(rows,uid).catch(()=>{});
  if(!this.offset)this.list.append(el('p','','Your saved sessions will appear here.'));
 }
 async loadThumbnails(rows,uid){
  if(!rows.length)return;const data=checked(await this.state.client.rpc('loox_session_thumbnails',{p_sessions:rows.map(s=>s.id)}));
  if(uid!==this.state.user?.id)return;
  for(const item of data||[]){const holder=this.list.querySelector('[data-session="'+item.session_id+'"] .loox-session-thumb');if(!holder)continue;
   const observer=new IntersectionObserver(items=>{if(!items.some(i=>i.isIntersecting))return;observer.disconnect();this.api('status',null,{id:item.job_id}).then(status=>{if(uid!==this.state.user?.id||!holder.isConnected||!status.url)return;const media=el(item.media_type==='video'?'video':'img');media.src=status.url;if(item.media_type==='video'){media.muted=true;media.playsInline=true;media.preload='metadata';media.addEventListener('loadedmetadata',()=>{media.currentTime=Math.min(.1,media.duration/2);},{once:true});}else{media.alt='';media.loading='lazy';}holder.replaceChildren(media);}).catch(()=>{});},{root:this.list,rootMargin:'80px'});observer.observe(holder);
  }
 }
 async begin(data){
  const uid=this.state.user.id;
  if(!this.id){const s=checked(await this.state.client.from('loox_media_sessions').insert({user_id:uid,title:data.prompt.slice(0,120)}).select().single());if(uid!==this.state.user?.id)throw Error('Your account changed.');this.id=s.id;this.url();}
  const entry=checked(await this.state.client.from('loox_media_entries').insert({...data,session_id:this.id,user_id:uid,request_id:crypto.randomUUID()}).select().single());
  checked(await this.state.client.from('loox_media_sessions').update({updated_at:new Date().toISOString()}).eq('id',this.id));await this.loadList();return entry;
 }
 attach(view,entry){view.card.dataset.entry=entry.id;view.entry=entry;const meta=el('small','loox-generation-meta',[entry.model_name,entry.ratio||'Original settings unavailable',...Object.values(entry.settings||{}),date(entry.created_at)].join(' · '));view.card.querySelector('.lig-output-top')?.after(meta);const actions=el('div','loox-generation-actions');
  actions.append(this.button('Copy prompt',async()=>{await navigator.clipboard.writeText(entry.prompt);this.notice('Prompt copied.');}),this.button('Regenerate',()=>this.reuse(entry)),this.button('Details',()=>{const d=el('dialog','loox-media-details');d.append(el('h2','','Generation details'),el('p','',entry.prompt),el('p','',[entry.model_name,entry.ratio||'Aspect ratio unavailable',date(entry.created_at),JSON.stringify(entry.settings)].join(' · ')),this.button('Close',()=>d.close()));d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();}),this.button('Delete',async()=>{if(this.isBusy())throw Error('Wait for the current generation.');if(!confirm('Remove this generation from the session? The original file stays in your account.'))return;checked(await this.state.client.from('loox_media_entries').delete().eq('id',entry.id));view.card.remove();}));view.card.append(actions);
 }
 completed(view,id){const entry=view.entry;if(!entry)return;const actions=el('div','loox-generation-actions');actions.append(this.button('Publish',()=>publishCreation({state:this.state,auth:this.auth,id,prompt:entry.prompt,notice:this.notice})),this.button('Preview',()=>this.preview(entry,id)),this.button('Download original',()=>this.download(entry,id)));view.card.append(actions);const media=view.stage.querySelector('img');if(media){media.tabIndex=0;media.style.cursor='zoom-in';media.addEventListener('click',()=>this.preview(entry,id).catch(e=>this.notice(e.message,true)));media.addEventListener('keydown',e=>{if(e.key==='Enter')this.preview(entry,id).catch(e=>this.notice(e.message,true));});}}
 async open(id){
  if(this.isBusy())throw Error('Wait for the current generation before opening a session.');const seq=++this.epoch,uid=this.state.user?.id;
  const s=checked(await this.state.client.from('loox_media_sessions').select('id').eq('id',id).single());
  const entries=[];for(let offset=0;;offset+=200){const batch=checked(await this.state.client.from('loox_media_entries').select('*').eq('session_id',s.id).order('created_at').order('id').range(offset,offset+199));if(seq!==this.epoch||uid!==this.state.user?.id)return;entries.push(...batch);if(batch.length<200)break;}
  if(seq!==this.epoch||uid!==this.state.user?.id)return;this.id=id;this.url();this.feed.replaceChildren();await this.loadList();if(matchMedia('(max-width:900px)').matches)this.collapse(true);
  this.observer?.disconnect();this.observer=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){this.observer.unobserve(item.target);const e=entries.find(e=>e.id===item.target.dataset.entry);if(e)this.restore(e,item.target,seq).catch(error=>{if(seq===this.epoch)item.target.querySelector('.lig-output-stage').textContent=error.message;});}},{root:this.scroll,rootMargin:'500px'});
  for(const e of entries){const card=el('article','lig-output'),top=el('div','lig-output-top');top.append(el('span','lig-output-name',e.prompt));const stage=el('div','lig-output-stage','Loading generation…');stage.style.setProperty('--lig-ratio',(e.ratio||'1:1').replace(':',' / '));card.append(top,stage);this.feed.append(card);this.attach({card,stage},e);this.observer.observe(card);}
 }
 async restore(entry,card,seq){
  const stage=card.querySelector('.lig-output-stage');let count=0;
  while(seq===this.epoch&&card.isConnected){const job=checked(await this.state.client.from('loox_jobs').select('id,state,failure_code').eq('request_id',entry.request_id).eq('user_id',this.state.user.id).maybeSingle());if(seq!==this.epoch||!card.isConnected)return;
   if(!job){if(Date.now()-new Date(entry.created_at).getTime()<180000&&count++<36){stage.textContent='Waiting for the generation request to be accepted…';await new Promise(resolve=>setTimeout(resolve,5000));continue;}stage.textContent='No accepted job found. Check your account before trying again.';return;}
   if(job.state==='failed'){stage.textContent='Generation failed. Reserved credits were released.';return;}
   if(job.state==='succeeded'){const status=await this.api('status',null,{id:job.id});if(seq!==this.epoch||!card.isConnected)return;if(!status.url){stage.textContent='Preview unavailable. Try reopening this session.';return;}
    const media=el(entry.media_type==='video'?'video':'img');media.src=status.url;if(entry.media_type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';}else{media.alt=entry.prompt;media.loading='lazy';media.decoding='async';}stage.replaceChildren(media);this.completed({card,stage,entry},job.id);return;}
   stage.textContent=job.state==='processing'?'Generating…':'Waiting in the queue…';if(++count>1100){stage.textContent='Still processing. Reopen this session for an update.';return;}await new Promise(resolve=>setTimeout(resolve,5000));
  }
 }
 async preview(entry,id){const status=await this.api('status',null,{id});if(!status.url)throw Error('Preview unavailable.');const d=el('dialog','loox-media-preview'),media=el(entry.media_type==='video'?'video':'img');media.src=status.url;if(entry.media_type==='video'){media.controls=true;media.playsInline=true;}else media.alt=entry.prompt;d.append(this.button('Close',()=>d.close()),media);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();}
 async download(entry,id){const status=await this.api('status',null,{id});if(!status.url)throw Error('Download unavailable.');const r=await fetch(status.url,{credentials:'omit'});if(!r.ok)throw Error('Download failed. Please retry.');const blob=await r.blob(),url=URL.createObjectURL(blob),a=el('a'),ext=entry.media_type==='video'?'mp4':blob.type.includes('jpeg')?'jpg':blob.type.includes('webp')?'webp':'png';a.href=url;a.download='loox-'+id+'.'+ext;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
