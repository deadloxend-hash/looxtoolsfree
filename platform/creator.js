import {state,auth,initialize,refresh} from './account.js?v=9';
import {Community,rpc,mediaURL,result} from './community.js?v=29';
import {cropAvatar} from './avatar-crop.js?v=1';
import {cloudRequest,cloudImage,cloudUpload,cloudDelete} from './profile-cloudflare.js?v=1';

const root=document.getElementById('creator-community');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const icons={
 back:'<path d="m14 5-7 7 7 7M7 12h14"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 pin:'<path d="m16 3 5 5-3 1-3 3v4l-2 2-3-6-5-5 2-2h4l3-3 2-3ZM2 22l9-9"/>',
 link:'<path d="M10 13a5 5 0 0 0 7.6.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.6-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>',
 location:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 edit:'<path d="m16 4 4 4L9 19H5v-4L16 4ZM14 6l4 4"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2m-11 0 1 15h12l1-15M10 10v7m4-7v7"/>',
 camera:'<path d="M4 7h4l2-3h4l2 3h4v13H4V7Z"/><circle cx="12" cy="13" r="3"/>',
 more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
 heart:'<path d="M20.8 4.6a5.6 5.6 0 0 0-7.9 0L12 5.5l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z"/>',
 comment:'<path d="M21 11a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.6-5A8.5 8.5 0 1 1 21 11Z"/>',
 bookmark:'<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5V22l-7-5-7 5V4.5Z"/>',
 share:'<path d="M12 16V3m0 0L7 8m5-5 5 5M5 13v7h14v-7"/>',
 play:'<path d="m8 5 12 7-12 7V5Z"/>',
 views:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m21 16-6-6L5 21"/>'
};
const svg=(name,size=19)=>{const span=el('span','cx-icon');span.innerHTML='<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.more)+'</svg>';return span;};
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const btn=(label,click,cls='cx-button')=>{const b=el('button',cls,label);b.type='button';if(click)b.addEventListener('click',()=>{try{Promise.resolve(click()).catch(showError);}catch(e){showError(e);}});return b;};
const link=(label,href,cls='')=>{const a=el('a',cls,label);a.href=href;return a;};
const compact=n=>new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(Number(n)||0);
const dateLabel=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});};
let profile=null,creatorId=null,isOwn=false,engine=null,tab='posts',offset=0,epoch=0,loading=false,feed=null,more=null,status=null,title=null,cover=null,headCount=null;
function showError(e){if(status){status.textContent=e?.message||'Something went wrong. Please retry.';status.hidden=false;}else root.replaceChildren(el('p','cx-error',e?.message||'Could not load profile.'));}
function notice(s){if(status){status.textContent=s;status.hidden=!s;}}
function fallbackAvatar(p,cls='cx-avatar'){const a=el('span',cls,((p?.display_name||p?.username||'L').trim().charAt(0)||'L').toUpperCase());const id=p?.user_id||p?.creator_id;
 if(p?.avatar_path&&id){
   const pending=cloudImage(state,id,'avatar');
  pending.then(url=>{if(!a.isConnected)return;const img=el('img');img.alt='';img.decoding='async';img.loading='lazy';img.src=url;img.onerror=()=>img.remove();a.replaceChildren(img);}).catch(()=>{});
 }
 return a;
}
function profileURL(p){return 'creator.html?username='+encodeURIComponent(p.username);}
function profileSkeleton(){root.innerHTML='<div class="cx-shell"><div class="cx-center"><div class="cx-top"><span class="cx-skeleton cx-skeleton-title"></span></div><div class="cx-skeleton cx-skeleton-cover"></div><div class="cx-skeleton cx-skeleton-avatar"></div><div class="cx-skeleton cx-skeleton-lines"></div><div class="cx-skeleton cx-skeleton-lines short"></div></div></div>';}
function emptyPage(message,signIn,retry=false){
 root.replaceChildren();
 const outer=el('section','cx-empty-page');
 outer.append(el('h1','','Profile'),el('p','',message));
 if(signIn)outer.append(btn('Sign in',()=>auth('login'),'cx-button cx-button-primary'));
 if(retry)outer.append(btn('Try again',()=>main(),'cx-button cx-button-primary'));
 outer.append(link('Explore Community','community.html','cx-button'));
 root.append(outer);
}
function setupEngine(){
 engine=Object.create(Community.prototype);
 Object.assign(engine,{state,auth,creator:creatorId,pendingLikes:new Set(),posts:[],sort:'latest',kind:'all',offset:0,epoch:0});
 engine.note=notice;
 engine.load=async()=>{await refreshProfile();await loadFeed(true);};
 engine.connections=showConnections;
 engine.privacy=showPrivacy;
 engine.notifications=showNotifications;
 engine.like=async(post,button=null)=>{
  if(!state.user){auth('login');return;}
  if(engine.pendingLikes.has(post.id))return;
  engine.pendingLikes.add(post.id);
  const previous={liked:!!post.liked,likes:Number(post.likes)||0};
  post.liked=!previous.liked;post.likes=Math.max(0,previous.likes+(post.liked?1:-1));
  const sync=()=>{
   if(button?.classList.contains('community-like-shortcut'))engine.renderLike(post,button);
   document.dispatchEvent(new CustomEvent('loox:post-like-change',{detail:{postId:post.id,liked:post.liked,likes:post.likes}}));
  };
  sync();
  try{await cloudRequest(state,'like',{method:'POST',data:{post_id:post.id,on:post.liked}});}
  catch(e){Object.assign(post,previous);sync();throw e;}
  finally{engine.pendingLikes.delete(post.id);}
 };
 engine.save=async(post,button=null)=>{
  if(!state.user){auth('login');return;}
  const next=!post.saved;
  await cloudRequest(state,'save',{method:'POST',data:{post_id:post.id,on:next}});
  post.saved=next;
  if(button){button.setAttribute('aria-pressed',String(next));button.setAttribute('aria-label',next?'Remove saved post':'Save post');}
  document.dispatchEvent(new CustomEvent('loox:post-save-change',{detail:{postId:post.id,saved:next}}));
 };
}
async function refreshProfile(){const p=await cloudRequest(state,'profile',{query:{id:creatorId}});
 if(!p){emptyPage('This profile is private or unavailable.',false);throw Error('Profile unavailable.');}
 profile=p;isOwn=state.user?.id===creatorId;return p;
}
function makeMoreMenu(){
 const wrap=el('div','cx-menu-wrap'),trigger=btn('','', 'cx-icon-button');
 trigger.replaceChildren(svg('more'));trigger.setAttribute('aria-label','More profile options');
 const menu=el('div','cx-menu');menu.hidden=true;
 function item(label,fn){menu.append(btn(label,async()=>{menu.hidden=true;await fn();},'cx-menu-item'));}
 item('Copy profile link',async()=>{await navigator.clipboard.writeText(new URL(profileURL(profile),location.href).href);notice('Profile link copied.');});
 if(isOwn){
  item('Notifications',()=>engine.notifications());
  item('Manage posts',()=>engine.manage());
  item('Privacy settings',()=>engine.privacy(profile));
  item('Saved collections',()=>{location.assign('collections.html');});
  item('Account settings',()=>{location.assign('settings.html');});
 }
 trigger.addEventListener('click',e=>{e.stopPropagation();menu.hidden=!menu.hidden;});
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))menu.hidden=true;},{signal:menuAbort.signal});
 wrap.append(trigger,menu);return wrap;
}

async function showConnections(id,kind){
 const {wrap}=dialog(kind==='followers'?'Followers':'Following');
 const list=el('div','cx-connections'),status=el('p','cx-edit-note');
 const more=btn('Show more',load,'cx-button');more.hidden=true;
 wrap.append(list,status,more);let offset=0;
 async function load(){
  more.disabled=true;
  try{
   const data=await cloudRequest(state,'connections',{query:{id,kind,offset}});
   if(data.hidden){status.textContent='This creator keeps their connections private.';more.hidden=true;return;}
   for(const p of data.items||[]){
    const row=link('','creator.html?id='+encodeURIComponent(p.user_id),'cx-connection');
    const avatar=fallbackAvatar(p,'cx-avatar cx-connection-avatar');
    const meta=el('div','cx-connection-info');
    meta.append(el('strong','',p.display_name||p.username),el('small','','@'+p.username));
    if(p.bio)meta.append(el('p','',p.bio));
    row.append(avatar,meta);list.append(row);
   }
   offset+=(data.items||[]).length;
   more.hidden=!data.has_more;
   status.textContent=offset?'':kind==='followers'?'No followers yet.':'Not following anyone yet.';
  }catch(e){status.textContent=e.message;}finally{more.disabled=false;}
 }
 await load();
}
async function showPrivacy(){
 if(!isOwn)return auth('login');
 const {d,wrap}=dialog('Profile privacy'),form=el('form','cx-edit-form');
 const inputs={};
 for(const [key,label,value] of [
  ['is_private','Private profile',profile.is_private],
  ['hide_connections','Hide follower and following lists',profile.hide_connections],
  ['notifications_enabled','Receive notifications',profile.notifications_enabled!==false]
 ]){
  const row=el('label','cx-privacy-option'),input=el('input');
  input.type='checkbox';input.checked=!!value;row.append(input,el('span','',label));
  inputs[key]=input;form.append(row);
 }
 const note=el('p','cx-edit-error');note.hidden=true;
 const save=el('button','cx-button cx-button-primary','Save privacy');save.type='submit';
 form.append(note,save);wrap.append(form);
 form.addEventListener('submit',async e=>{
  e.preventDefault();save.disabled=true;
  try{
   profile=await cloudRequest(state,'privacy',{method:'PATCH',data:Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.checked]))});
   d.close();buildPage();
  }catch(error){note.hidden=false;note.textContent=error.message;save.disabled=false;}
 });
}
async function showNotifications(){
 if(!isOwn)return auth('login');
 const {wrap}=dialog('Notifications');
 const list=el('div','cx-notifications'),note=el('p','cx-edit-note');wrap.append(list,note);
 try{
  const data=await cloudRequest(state,'notifications',{query:{offset:0}});
  for(const n of data.items||[]){
   const row=el('div','cx-notification');
   const who=el('strong','',n.display_name||n.username||'LOOX member');
   const kind=n.kind==='follow'?' followed you':n.kind==='like'?' liked your post':n.kind==='comment'?' commented on your post':' sent an update';
   row.append(who,el('span','',kind));
   if(n.post_id)row.append(link('View post','community.html?post='+encodeURIComponent(n.post_id)));
   list.append(row);
  }
  note.textContent=list.childElementCount?'':'No notifications yet.';
 }catch(e){note.textContent=e.message;}
}

let menuAbort=new AbortController();
function buildPage(){
 menuAbort.abort();menuAbort=new AbortController();
 root.replaceChildren();root.className='cx-profile-root';
 const shell=el('div','cx-shell'),center=el('section','cx-center'),aside=el('aside','cx-aside');
 const top=el('div','cx-top');
 const back=btn('',()=>{if(history.length>1)history.back();else location.assign('community.html');},'cx-icon-button cx-back');
 back.replaceChildren(svg('back'));back.setAttribute('aria-label','Go back');
 const topText=el('div','cx-top-text');topText.append(el('h1','',profile.display_name||profile.username),el('small','',compact(profile.posts)+' posts'));top.append(back,topText);
 cover=el('div','cx-cover');
 const art=el('div','cx-cover-art');art.setAttribute('role','img');art.setAttribute('aria-label','Profile cover');
 cover.append(art);loadCover(art,profile);
 if(isOwn){
  const change=btn('Edit cover',()=>editProfile(),'cx-cover-edit');
  change.prepend(svg('camera',16));cover.append(change);
 }
 const details=el('div','cx-details');
 const tools=el('div','cx-identity-tools');
 const avatar=fallbackAvatar(profile,'cx-avatar cx-avatar-xl');
 avatar.setAttribute('aria-label','Profile picture');
 const buttons=el('div','cx-profile-buttons');
 buttons.append(makeMoreMenu());
 if(isOwn)buttons.append(btn('Edit profile',()=>editProfile(),'cx-button cx-button-outline'));
 else {
  const follow=btn(profile.followed?'Following':'Follow',async()=>{
   if(!state.user){auth('login');return;}
   follow.disabled=true;
   try{
    profile=await cloudRequest(state,'follow',{method:'POST',data:{creator_id:creatorId,follow:!profile.followed}});
    updateFollow(follow);renderCounts(); 
   }finally{follow.disabled=false;}
  },'cx-button cx-button-primary cx-follow');
  buttons.append(follow);updateFollow(follow);
 }
 tools.append(avatar,buttons);
 const names=el('div','cx-names'),line=el('div','cx-name-line');
 line.append(el('h2','',profile.display_name||profile.username));
 const badge=el('span','cx-plan',(profile.plan_badge||'Basic')+' plan');badge.dataset.plan=(profile.plan_badge||'Basic').toLowerCase();line.append(badge);
 names.append(line,el('p','cx-handle','@'+profile.username));
 if(profile.bio)names.append(el('p','cx-bio',profile.bio));
 const meta=el('div','cx-meta');
 if(profile.profile_location){const loc=el('span');loc.append(svg('location',17),el('span','',profile.profile_location));meta.append(loc);}
 if(profile.profile_website){
  try{const u=new URL(profile.profile_website);if(u.protocol==='https:'){const web=link(u.hostname.replace(/^www\./,''),u.href);web.rel='noopener noreferrer';web.target='_blank';const m=el('span');m.append(svg('link',17),web);meta.append(m);}}catch{}
 }
 if(profile.created_at){const joined=el('span');joined.append(svg('calendar',17),el('span','','Joined '+new Date(profile.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'})));meta.append(joined);}
 const counts=el('div','cx-counts');counts.id='cx-counts';
 details.append(tools,names,meta,counts);
 if(isOwn){
  const accountPanel=el('details','cx-account-panel');
  const summary=el('summary','','Account & credits');
  const body=el('div','cx-account-panel-body');
  const balance=el('span','cx-account-balance','Open to see your available credits');
  const accountLinks=el('div','cx-account-links');
  accountLinks.append(link('Account overview','account.html'),link('Settings','settings.html'),link('Upgrade','upgrade.html'));
  body.append(balance,accountLinks);accountPanel.append(summary,body);
  accountPanel.addEventListener('toggle',async()=>{
   if(!accountPanel.open)return;
   balance.textContent='Loading your account…';
   try{
    if(!state.account)await refresh();
    const credits=state.account?.wallet?.balance;
    balance.textContent=typeof credits==='number'?compact(credits)+' available credits':'Open Account overview to check your credits.';
   }catch{balance.textContent='Could not load account details. Try Account overview.';}
  });
  details.append(accountPanel);
 }
 const tabs=el('nav','cx-tabs');tabs.setAttribute('aria-label','Profile sections');
 for(const [value,label] of [['posts','Posts'],['replies','Replies'],['media','Media'],...(isOwn?[['likes','Likes']]:[])]){
  const b=btn(label,()=>switchTab(value),'cx-tab');b.dataset.tab=value;tabs.append(b);
 }
 feed=el('div','cx-feed');
 status=el('p','cx-status');status.setAttribute('role','status');status.hidden=true;
 more=btn('Load more',()=>loadFeed(false),'cx-load-more');more.hidden=true;
 center.append(top,cover,details,tabs,status,feed,more);
 const side=el('div','cx-side-card');
 side.append(el('h3','','Explore LOOX'),el('p','','Discover creative people, prompts and inspiring AI artwork.'));
 for(const [name,href] of [['Community','community.html'],['Trending creations','trending.html'],['Templates','templates.html'],['Create with AI','ai-image-landing.html']])side.append(link(name,href,'cx-side-link'));
 aside.append(side);
 shell.append(center,aside);root.append(shell);
 renderCounts();setTabStyles();
 if(location.hash==='#media')tab='media';
 if(location.hash==='#likes'&&isOwn)tab='likes';
 setTabStyles();loadFeed(true);
}
function updateFollow(button){
 button.textContent=profile.followed?'Following':'Follow';
 button.classList.toggle('cx-following',!!profile.followed);
 button.setAttribute('aria-pressed',String(!!profile.followed));
}
function renderCounts(){
 const box=document.getElementById('cx-counts');if(!box)return;box.replaceChildren();
 for(const kind of ['following','followers']){
  const b=btn('','', 'cx-count');
  const n=el('strong','',compact(profile[kind]));
  b.append(n,el('span','',' '+(kind==='followers'?'Followers':'Following')));
  b.disabled=!isOwn&&Boolean(profile.hide_connections);
  if(!b.disabled)b.addEventListener('click',()=>engine.connections(creatorId,kind).catch(showError));
  else b.title='Connection list is private';
  box.append(b);
 }
 if(profile.total_views)box.append(el('span','cx-view-count',compact(profile.total_views)+' views'));
}
function loadCover(target,p){
 target.classList.toggle('cx-cover-has-image',false);
 if(!p.cover_key)return;
 cloudImage(state,creatorId,'cover').then(url=>{
  if(!target.isConnected||p!==profile)return;
  target.style.backgroundImage='linear-gradient(0deg,rgba(8,8,14,.1),rgba(8,8,14,.1)),url("'+url.replaceAll('"','%22')+'")';
  target.classList.add('cx-cover-has-image');
 }).catch(()=>{});
}
function setTabStyles(){root.querySelectorAll('.cx-tab').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('cx-tab-active',active);b.setAttribute('aria-current',active?'page':'false');});}
function switchTab(value){if(tab===value)return;tab=value;setTabStyles();history.replaceState(null,'',location.pathname+location.search+(value==='posts'?'':'#'+value));loadFeed(true);}
async function loadFeed(reset){
 if(loading&&!reset)return;
 if(reset){postMenuAbort.abort();postMenuAbort=new AbortController();offset=0;feed.replaceChildren();engine.posts=[];}
 const run=++epoch,start=offset;loading=true;more.disabled=true;more.hidden=true;
 if(reset){const skel=el('div','cx-feed-loading');for(let i=0;i<3;i++)skel.append(el('div','cx-post-placeholder cx-skeleton'));feed.append(skel);}
 notice('');
 try{
  if(tab==='replies'){
   const replyData=await cloudRequest(state,'replies',{query:{creator_id:creatorId,offset:start}});
   const replies=replyData.items||[];
   if(run!==epoch)return;
   if(reset)feed.replaceChildren();
   for(const reply of replies)feed.append(replyCard(reply));
   offset=start+replies.length;
   more.hidden=replies.length<20;
   if(!offset)feed.append(emptyContent('No replies yet','Replies to public Community posts will appear here.'));
   return;
  }
  const data=await cloudRequest(state,'feed',{query:{tab,creator_id:creatorId,offset:start}});
  if(run!==epoch)return;
  if(reset)feed.replaceChildren();
  let items=data.items||[];
  if(tab==='posts'&&start===0&&profile.pinned_post_id){
   let pinned=items.find(p=>p.id===profile.pinned_post_id);
   if(!pinned)pinned=await rpc(state,'loox_public_post',{p_id:profile.pinned_post_id}).catch(()=>null);
   if(run!==epoch)return;
   if(pinned)items=[pinned,...items.filter(p=>p.id!==pinned.id)];
  }
  if(reset)engine.posts=[];
  for(const post of items){engine.posts.push(post);feed.append(tab==='media'?mediaTile(post):postCard(post));}
  offset=start+(data.items||[]).length;
  more.hidden=!data.has_more;
  if(!offset&&!items.length){
   const empty=el('div','cx-empty-feed');empty.append(svg(tab==='likes'?'heart':'image',30),
     el('h3','',tab==='likes'?'No liked posts yet':tab==='media'?'No public media yet':'No posts yet'),
     el('p','',tab==='likes'?'Posts you like will appear here.':'Approved, public creations will appear here. Private generations stay private.'));
   if(isOwn&&tab!=='likes')empty.append(link('Create something','ai-image-landing.html','cx-button cx-button-primary'));
   feed.append(empty);
  }
 }catch(e){if(run===epoch){if(reset)feed.replaceChildren();showError(e);more.hidden=true;}}
 finally{if(run===epoch){loading=false;more.disabled=false;}}
}
function preview(post,wrap,asTile=false){
 const media=el(post.media_type==='video'?'video':'img');
 if(post.media_type==='video'){media.muted=true;media.playsInline=true;media.preload='metadata';}
 else{media.alt=post.caption||'Creation';media.decoding='async';media.loading='lazy';}
 const frame=btn('',()=>engine.details(post),'cx-media-frame');
 frame.setAttribute('aria-label','View creation: '+(post.caption||'Media'));frame.append(media);
 if(post.media_type==='video'){const play=el('span','cx-play');play.append(svg('play',22));frame.append(play);}
 const loadingTag=el('span','cx-media-loading');loadingTag.setAttribute('aria-hidden','true');frame.append(loadingTag);
 wrap.append(frame);
 const load=()=>mediaURL(state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'preview'})
  .then(url=>{if(!frame.isConnected)return;media.onload=()=>frame.classList.add('cx-media-ready');media.onloadeddata=()=>frame.classList.add('cx-media-ready');media.onerror=()=>frame.classList.add('cx-media-error');media.src=url;if(media.readyState>=2)frame.classList.add('cx-media-ready');})
  .catch(()=>{frame.classList.add('cx-media-error');loadingTag.textContent='Preview unavailable';});
 if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){io.disconnect();load();}},{rootMargin:'360px'});
  io.observe(frame);
 }else load();

 // Match Community: a tap opens the viewer, while two nearby taps like
 // without opening it or accidentally unliking an already-liked post.
 let firstAt=0,firstX=0,firstY=0,openTimer=null;
 frame.addEventListener('click',event=>{
  if(!matchMedia('(max-width:800px)').matches||event.detail===0)return;
  event.preventDefault();event.stopImmediatePropagation();
  const at=performance.now();
  const double=firstAt>0&&at-firstAt<340&&Math.hypot(event.clientX-firstX,event.clientY-firstY)<75;
  if(openTimer){clearTimeout(openTimer);openTimer=null;}
  if(double){
   firstAt=0;
   const rect=frame.getBoundingClientRect(),burst=el('span','cx-doubletap-heart');
   const mark=svg('heart',76);mark.querySelector('svg')?.setAttribute('fill','currentColor');
   burst.append(mark);burst.setAttribute('aria-hidden','true');
   burst.style.left=Math.max(38,Math.min(rect.width-38,event.clientX-rect.left))+'px';
   burst.style.top=Math.max(38,Math.min(rect.height-38,event.clientY-rect.top))+'px';
   frame.append(burst);burst.addEventListener('animationend',()=>burst.remove(),{once:true});
   setTimeout(()=>burst.remove(),950);
   if(!post.liked&&!engine.pendingLikes.has(post.id))engine.like(post).catch(showError);
   return;
  }
  firstAt=at;firstX=event.clientX;firstY=event.clientY;
  openTimer=setTimeout(()=>{
   openTimer=null;firstAt=0;
   if(frame.isConnected)Promise.resolve(engine.details(post)).catch(showError);
  },340);
 },true);
 return frame;
}
function emptyContent(heading,description){
 const empty=el('div','cx-empty-feed');
 empty.append(svg('comment',30),el('h3','',heading),el('p','',description));
 return empty;
}
function replyCard(reply){
 const article=el('article','cx-post cx-reply');article.dataset.id=reply.id;
 const avatar=fallbackAvatar(profile,'cx-avatar cx-post-avatar');
 const body=el('div','cx-post-body');
 const heading=el('div','cx-post-heading');
 const person=link('',profileURL(profile),'cx-post-person');
 person.append(el('strong','',profile.display_name||profile.username),el('span','','@'+profile.username));
 const time=el('time','cx-post-time',dateLabel(reply.created_at));time.dateTime=reply.created_at||'';
 heading.append(person,time);
 const caption=el('p','cx-post-caption',reply.body||'');
 const origin=link('View conversation','community.html?post='+encodeURIComponent(reply.post_id),'cx-reply-origin');
 origin.prepend(svg('comment',16));
 body.append(el('div','cx-reply-label','Replied to a Community post'),heading,caption,origin);
 article.append(avatar,body);
 return article;
}
function mediaTile(post){const tile=el('article','cx-media-tile');preview(post,tile,true);return tile;}
async function editPostTitle(post){
 if(!isOwn||state.user?.id!==post.creator_id)return auth('login');
 const {d,wrap}=dialog('Edit post title'),form=el('form','cx-edit-form');
 form.noValidate=true;
 const titleField=labeled(form,'Post title',post.caption||'','input',300);
 titleField.required=true;titleField.autocomplete='off';
 const explanation=el('p','cx-edit-note','Changing a published title sends the Community post back for administrator review. Your original AI generation stays private in your library.');
 const error=el('p','cx-edit-error');error.hidden=true;error.setAttribute('role','alert');
 const actions=el('div','cx-dialog-actions'),cancel=btn('Cancel',()=>d.close(),'cx-button cx-button-outline');
 const save=el('button','cx-button cx-button-primary','Save title');save.type='submit';
 actions.append(cancel,save);form.append(explanation,error,actions);wrap.append(form);
 titleField.focus();titleField.select();
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const caption=titleField.value.trim();
  if(!caption||caption.length>300){error.textContent='Enter a title between 1 and 300 characters.';error.hidden=false;return;}
  if(caption===post.caption){d.close();return;}
  save.disabled=true;error.hidden=true;
  try{
   await cloudRequest(state,'manage',{method:'POST',data:{id:post.id,action:'edit',caption,share_prompt:Boolean(post.shared_prompt)}});
   d.close();await refreshProfile();await loadFeed(true);
   notice('Title saved. Your post is awaiting review.');
  }catch(e){error.textContent=e.message||'Could not update the title.';error.hidden=false;save.disabled=false;}
 });
}
function deletePostDialog(post){
 if(!isOwn||state.user?.id!==post.creator_id)return auth('login');
 const {d,wrap}=dialog('Delete Community post?');
 const body=el('div','cx-delete-post-body'),warning=el('p','','Deleting this post removes it from Community and deletes its comments, likes and saves. Your original AI generation will remain in your private library.');
 const error=el('p','cx-edit-error');error.hidden=true;error.setAttribute('role','alert');
 const actions=el('div','cx-dialog-actions'),cancel=btn('Cancel',()=>d.close(),'cx-button cx-button-outline');
 const del=btn('Delete post',async()=>{
  del.disabled=true;cancel.disabled=true;error.hidden=true;
  try{
   await cloudRequest(state,'manage',{method:'POST',data:{id:post.id,action:'delete'}});
   d.close();await refreshProfile();await loadFeed(true);notice('Community post deleted.');
  }catch(e){error.textContent=e.message||'Could not delete the post.';error.hidden=false;del.disabled=false;cancel.disabled=false;}
 },'cx-button cx-button-danger');
 actions.append(cancel,del);body.append(warning,error,actions);wrap.append(body);
}
let postMenuAbort=new AbortController();
function ownerPostMenu(post){
 const toggle=btn('',()=>{
  const {d,wrap}=dialog('Post options');
  d.classList.add('cx-owner-actions-dialog');
  const list=el('div','cx-owner-actions');
  function option(label,iconName,handler,danger=false){
   const b=btn('',async()=>{
    d.close();
    try{await handler();}catch(e){notice(e.message||'Could not update the post.');}
   },'cx-post-option'+(danger?' cx-post-option-danger':''));
   b.append(svg(iconName,19),el('span','',label));
   list.append(b);
  }
  const pinned=post.id===profile.pinned_post_id;
  option(pinned?'Unpin post':'Pin post','pin',async()=>{
   await cloudRequest(state,'pin',{method:'POST',data:{post_id:pinned?null:post.id}});
   await refreshProfile();await loadFeed(true);notice(pinned?'Post unpinned':'Post pinned to profile');
  });
  option('Edit title','edit',()=>editPostTitle(post));
  option('Delete post','trash',()=>deletePostDialog(post),true);
  wrap.append(list);
 },'cx-post-more');
 toggle.append(svg('more',20));toggle.setAttribute('aria-label','Post options');
 toggle.title='Post options';toggle.setAttribute('aria-haspopup','dialog');
 return toggle;
}
async function openPostComments(post){
 const {d,wrap}=dialog('Comments');
 d.classList.add('cx-comments-dialog');
 const content=el('div','cx-comments-content');
 wrap.append(content);
 try{await engine.comments(post,content);}
 catch(e){content.append(el('p','cx-edit-error',e.message||'Comments unavailable.'));}
}
function postCard(post){
 const article=el('article','cx-post');article.dataset.id=post.id;
 const a=fallbackAvatar({user_id:post.creator_id,username:post.username,display_name:post.display_name,avatar_path:post.avatar_path},'cx-avatar cx-post-avatar');
 const person=link('', 'creator.html?id='+encodeURIComponent(post.creator_id),'cx-post-person');
 person.append(el('strong','',post.display_name||post.username),el('span','', '@'+post.username));
 const timestamp=el('time','cx-post-time',dateLabel(post.created_at));timestamp.dateTime=post.created_at||'';
 const heading=el('div','cx-post-heading');heading.append(person,timestamp);
 const toolbar=el('div','cx-post-menu');
 if(isOwn&&post.creator_id===creatorId)toolbar.append(ownerPostMenu(post));
 const text=el('p','cx-post-caption',post.caption||'');
 const body=el('div','cx-post-body');body.append(heading,text);
 if(post.id===profile.pinned_post_id&&tab==='posts'){
  const tag=el('div','cx-pinned');tag.append(svg('pin',15),el('span','','Pinned'));body.prepend(tag);
 }
 if(post.media_type==='video'||post.media_type==='image')preview(post,body);
 if(post.shared_prompt){const prompt=el('details','cx-prompt');prompt.append(el('summary','','View prompt'),el('p','',post.shared_prompt));body.append(prompt);}
 const actions=el('div','cx-post-actions');
 const likeGroup=el('span','cx-engagement-group'),commentGroup=el('span','cx-engagement-group');
 const like=btn('',()=>engine.like(post,like),'cx-post-action cx-post-like');
 like.setAttribute('data-post-id',post.id);
 const likeNumber=el('span','cx-engagement-number');
 const updateLike=()=>{
  const mark=svg('heart',21);mark.querySelector('svg')?.setAttribute('fill',post.liked?'currentColor':'none');
  like.replaceChildren(mark);
  likeNumber.textContent=compact(post.likes);
  like.classList.toggle('cx-active',!!post.liked);
  like.setAttribute('aria-pressed',String(!!post.liked));
  like.setAttribute('aria-label',(post.liked?'Unlike':'Like')+' post, '+Number(post.likes||0)+' likes');
 };
 updateLike();likeGroup.append(like,likeNumber);
 const comment=btn('',()=>openPostComments(post),'cx-post-action cx-post-comment');
 comment.append(svg('comment',21));comment.setAttribute('aria-label','View comments');
 const commentNumber=el('span','cx-engagement-number',compact(post.comments));
 commentGroup.append(comment,commentNumber);
 const save=btn('',()=>engine.save(post,save),'cx-post-action cx-save');
 const updateSave=()=>{
  const mark=svg('bookmark',21);mark.querySelector('svg')?.setAttribute('fill',post.saved?'currentColor':'none');
  save.replaceChildren(mark);save.classList.toggle('cx-active',!!post.saved);
  save.setAttribute('aria-label',post.saved?'Remove saved post':'Save post');
  save.setAttribute('aria-pressed',String(!!post.saved));
 };
 updateSave();
 const share=btn('',async()=>{
  const url=new URL('community.html?post='+encodeURIComponent(post.id),location.href).href;
  if(navigator.share)await navigator.share({title:post.caption||'LOOX creation',url});
  else{await navigator.clipboard.writeText(url);notice('Post link copied.');}
 },'cx-post-action cx-share');
 share.append(svg('share',21));share.setAttribute('aria-label','Share post');
 actions.append(likeGroup,commentGroup,share,save);
 if(post.media_type==='video'&&Number(post.view_count)>0){
  const views=el('span','cx-action-views');views.append(svg('views',17),el('span','',compact(post.view_count)));
  actions.insertBefore(views,share);
 }
 document.addEventListener('loox:post-like-change',event=>{
  if(event.detail?.postId!==post.id)return;
  post.liked=!!event.detail.liked;post.likes=event.detail.likes;updateLike();
 },{signal:postMenuAbort.signal});
 document.addEventListener('loox:post-comment-count',event=>{
  if(event.detail?.postId!==post.id)return;
  post.comments=Math.max(0,Number(event.detail.count)||0);
  commentNumber.textContent=compact(post.comments);
 },{signal:postMenuAbort.signal});
 document.addEventListener('loox:post-save-change',event=>{
  if(event.detail?.postId!==post.id)return;
  post.saved=!!event.detail.saved;updateSave();
 },{signal:postMenuAbort.signal});
 body.append(actions);article.append(a,body,toolbar);return article;
}
function readDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read image.'));reader.readAsDataURL(blob);});}
async function coverBlob(file){
 const src=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not decode cover photo.'));img.src=src;});
  if(!img.naturalWidth||!img.naturalHeight)throw Error('Choose another cover photo.');
  const factor=Math.min(1,1600/img.naturalWidth,1120/img.naturalHeight);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
  const context=canvas.getContext('2d');
  if(!context)throw Error('Image processing is unavailable.');
  context.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));
  if(!blob||blob.size>3_000_000)throw Error('This cover photo is too large after processing. Please use a smaller image.');
  return blob;
 }finally{URL.revokeObjectURL(src);}
}
function dialog(title){
 const d=el('dialog','cx-edit-dialog'),wrap=el('div','cx-dialog-content'),heading=el('div','cx-dialog-top');
 heading.append(btn('',()=>d.close(),'cx-dialog-close'),el('h2','',title));
 heading.firstElementChild.replaceChildren(svg('close'));heading.firstElementChild.setAttribute('aria-label','Close editor');
 wrap.append(heading);d.append(wrap);document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return {d,wrap};
}
function labeled(form,title,value='',kind='input',limit=100){
 const l=el('label','cx-field'),name=el('span','',title),input=el(kind);
 input.value=value||'';input.maxLength=limit;
 l.append(name,input);form.append(l);return input;
}
async function editProfile(){
 if(!isOwn)return auth('login');
 const {d,wrap}=dialog('Edit profile');const form=el('form','cx-edit-form');form.noValidate=true;
 const imageRow=el('div','cx-edit-images'),coverLabel=el('label','cx-edit-cover'),avatarLabel=el('label','cx-edit-avatar');
 coverLabel.append(svg('camera',24),el('span','','Change cover'));
 const coverInput=el('input');coverInput.type='file';coverInput.accept='image/png,image/jpeg,image/webp';coverInput.setAttribute('aria-label','Upload cover photo');coverLabel.append(coverInput);
 if(profile.cover_key)loadCover(coverLabel,profile);
 const avatar=fallbackAvatar(profile,'cx-avatar cx-edit-avatar-display');
 avatarLabel.append(avatar,svg('camera',18));
 const avatarInput=el('input');avatarInput.type='file';avatarInput.accept=coverInput.accept;avatarInput.setAttribute('aria-label','Upload profile picture');avatarLabel.append(avatarInput);
 imageRow.append(coverLabel,avatarLabel);form.append(imageRow);
 const removeRow=el('div','cx-remove-images');
 const removeCover=btn('Remove cover photo',()=>{coverInput.value='';removeCover.dataset.remove='yes';coverLabel.style.backgroundImage='';coverLabel.classList.remove('cx-cover-has-image');notice('Cover photo will be removed when you save.');},'cx-text-action');
 const removeAvatar=btn('Remove profile picture',()=>{avatarInput.value='';removeAvatar.dataset.remove='yes';avatar.replaceChildren(el('span','',profile.display_name?.charAt(0)||'L'));notice('Profile picture will be removed when you save.');},'cx-text-action');
 removeRow.append(removeCover,removeAvatar);form.append(removeRow);
 const name=labeled(form,'Name',profile.display_name||'', 'input',60);name.required=true;
 const username=labeled(form,'Username',profile.username||'','input',30);username.required=true;username.pattern='[a-z0-9_]{3,30}';
 const bio=labeled(form,'Bio',profile.bio||'','textarea',500);bio.rows=3;
 const locationField=labeled(form,'Location',profile.profile_location||'','input',80);
 const website=labeled(form,'Website (HTTPS)',profile.profile_website||'','input',250);website.placeholder='https://example.com';
 const note=el('p','cx-edit-note','Only your public profile details appear here. Your email stays private.');
 const error=el('p','cx-edit-error');error.setAttribute('role','status');error.hidden=true;
 const save=el('button','cx-button cx-button-primary','Save');save.type='submit';
 form.append(note,error,save);wrap.append(form);
 coverInput.addEventListener('change',()=>{const file=coverInput.files?.[0];if(!file)return;removeCover.dataset.remove='no';if(!file.type.startsWith('image/')||file.size>4_000_000){error.textContent='Cover must be a PNG, JPG or WebP under 4 MB.';error.hidden=false;coverInput.value='';return;}const u=URL.createObjectURL(file);coverLabel.style.backgroundImage='url("'+u+'")';coverLabel.classList.add('cx-cover-has-image');d.addEventListener('close',()=>URL.revokeObjectURL(u),{once:true});});
 avatarInput.addEventListener('change',()=>{const file=avatarInput.files?.[0];if(!file)return;removeAvatar.dataset.remove='no';if(file.size>2_097_152){error.textContent='Avatar must be under 2 MB.';error.hidden=false;avatarInput.value='';return;}const u=URL.createObjectURL(file);avatar.replaceChildren();const img=el('img');img.src=u;img.alt='New avatar preview';avatar.append(img);d.addEventListener('close',()=>URL.revokeObjectURL(u),{once:true});});
 form.addEventListener('submit',async event=>{
  event.preventDefault();save.disabled=true;save.textContent='Saving…';error.hidden=true;
  try{
   const cleanName=name.value.trim(),cleanUser=username.value.trim().toLowerCase();
   if(!cleanName||!/^[a-z0-9_]{3,30}$/.test(cleanUser))throw Error('Enter a display name and a username of 3–30 lowercase letters, numbers or underscores.');
   await cloudRequest(state,'profile',{method:'PATCH',data:{username:cleanUser,display_name:cleanName,bio:bio.value.trim(),profile_location:locationField.value.trim(),profile_website:website.value.trim()}});
   if(removeAvatar.dataset.remove==='yes')await cloudDelete(state,'avatar');
   else if(avatarInput.files?.[0])await cloudUpload(state,'avatar',await cropAvatar(avatarInput.files[0]));
   if(removeCover.dataset.remove==='yes')await cloudDelete(state,'cover');
   else if(coverInput.files?.[0])await cloudUpload(state,'cover',await coverBlob(coverInput.files[0]));
   // Creator display names are stored exclusively in Cloudflare D1. Supabase remains the login identity provider.
   d.close();await refreshProfile();buildPage();notice('Profile updated.');
   if(location.search.includes('username='))history.replaceState(null,'',profileURL(profile));
  }catch(e){error.textContent=e.message||'Could not save your profile.';error.hidden=false;save.disabled=false;save.textContent='Save';}
 });
}
async function main(){
 profileSkeleton();
 try{
  await initialize({publicAccess:true,waitForAccount:false});
  const params=new URLSearchParams(location.search);
  const username=params.get('username');const requested=params.get('id');
  if(requested){if(!UUID.test(requested))throw Error('Invalid profile link.');creatorId=requested;}
  else if(username){
   const data=await cloudRequest(state,'profile',{query:{username:username.trim().toLowerCase()}});
   creatorId=data.user_id;
  }else if(state.user)creatorId=state.user.id;
  else{emptyPage('Sign in to see your creator profile, or open a creator from Community.',true);return;}
  await refreshProfile();setupEngine();buildPage();
 }catch(e){emptyPage(e.message||'Profile unavailable.',false,true);}
}
main();
