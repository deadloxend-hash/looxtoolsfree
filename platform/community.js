import {cropAvatar} from './avatar-crop.js?v=1';
import {installSocial,installPrivacy} from './community-social.js?v=14';
import {api,refresh} from './account.js?v=9';
import {cloudRequest,cloudImage,cloudUpload,cloudDelete} from './profile-cloudflare.js?v=1';
// Shared community UI. Only Supabase publishable credentials enter the browser.
export const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
export const result=r=>{if(r.error)throw Error(r.error.code==='23505'?'That username is already taken. Choose another.':r.error.message);return r.data;};
export async function rpc(state,name,args={}){
 // Cloudflare D1 is authoritative for public creator profiles and social feeds.
 if(name==='loox_discover')return cloudRequest(state,'discover',{query:{
  kind:args.p_kind||'all',sort:args.p_sort||'latest',offset:args.p_offset||0,
  creator:args.p_creator||null,query:args.p_query||'',collection:args.p_collection||null,days:args.p_days||30
 }});
 if(name==='loox_public_post')return cloudRequest(state,'post',{query:{id:args.p_id}});
 if(name==='loox_creator_summary')return cloudRequest(state,'profile',{query:{id:args.p_creator}});
 if(name==='loox_creator_connections')return cloudRequest(state,'connections',{query:{id:args.p_creator,kind:args.p_kind,offset:args.p_offset||0}});
 if(name==='loox_save_privacy')return cloudRequest(state,'privacy',{method:'PATCH',data:{is_private:args.p_private,hide_connections:args.p_hide_connections,notifications_enabled:args.p_notifications}});
 if(name==='loox_save_creator')return cloudRequest(state,'profile',{method:'PATCH',data:{username:args.p_username,display_name:args.p_name,bio:args.p_bio}});
 if(!state.client)throw Error('The account service is unavailable. Please retry.');
 return result(await state.client.rpc(name,args));
}
const urls=new Map();
export async function mediaURL(state,path,bucket='loox-results',resource=null){
 if(resource?.type==='avatar')return cloudImage(state,resource.id,'avatar');
 if(resource?.type==='cover')return cloudImage(state,resource.id,'cover');
 if(resource?.type==='post'){
  const variant=resource.variant==='original'?'original':'preview';
  return 'https://loox-profile-api.looxai-studio.workers.dev/v1/media?type=post&id='+encodeURIComponent(resource.id)+'&variant='+variant;
 }
 if(!path&&!resource)return null;const key=resource?resource.type+'/'+resource.id+'/'+(resource.variant||'preview'):bucket+'/'+path,old=urls.get(key);if(old&&old.until>Date.now())return old.url;
 if(resource){const response=await fetch('https://looxtoolfree-backend.vercel.app/api/loox?'+new URLSearchParams({action:'public_media',type:resource.type,id:resource.id,variant:resource.variant||'preview'}),{credentials:'omit'}),data=await response.json().catch(()=>({}));if(!response.ok||!data.url)throw Error(data.error||'Media is unavailable.');urls.set(key,{url:data.url,until:Date.now()+240000});return data.url;}
 const uid=state.user?.id;const data=result(await state.client.storage.from(bucket).createSignedUrl(path,300));if(uid!==state.user?.id)throw Error('Account changed. Open this media again.');urls.set(key,{url:data.signedUrl,until:Date.now()+240000});return data.signedUrl;
}
export function action(label,fn,cls='community-button',onError=console.error){const b=element('button',cls,label);b.type='button';b.addEventListener('click',()=>Promise.resolve().then(fn).catch(onError));return b;}
function modal(title){const d=element('dialog','community-dialog'),h=element('div','community-dialog-head');h.append(element('h2','',title),action('×',()=>d.close(),'community-close'));d.append(h);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d;}
function field(root,label,value='',tag='input'){const l=element('label','community-field',label),i=element(tag);i.value=value;l.append(i);root.append(l);return i;}
export async function publishCreation({state,auth,id,prompt='',notice=()=>{}}){
 if(!state.user){auth('login');return;}
 const d=modal('Share with LOOX Community'),form=element('form'),status=element('p','community-note');
 const caption=field(form,'Caption');caption.required=true;caption.placeholder='Give your creation a public caption';caption.maxLength=300;
 const label=element('label','community-check'),share=element('input');share.type='checkbox';label.append(share,'Share my generation prompt');form.append(label,element('p','community-note','Your creation stays private until an administrator approves it. Public posts show your creator profile, never your email.'));
 const submit=element('button','community-primary','Submit for review');submit.type='submit';form.append(submit,status);d.append(form);
 form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;status.textContent='Submitting…';try{await cloudRequest(state,'publish',{method:'POST',data:{job_id:id,caption:caption.value.trim(),share_prompt:share.checked}});status.textContent='Submitted for approval. Manage your post from your creator profile.';notice('Submitted to Community for review.');submit.remove();}catch(error){status.textContent=error.message;submit.disabled=false;}});
}
export async function editCreator({state,auth,onSave=()=>{}}){
 if(!state.user){auth('login');return;}
 const current=await cloudRequest(state,'profile',{query:{id:state.user.id}});const d=modal('Your creator profile'),form=element('form'),status=element('p','community-note');
 const username=field(form,'Username',current?.username||'creator_'+state.user.id.replaceAll('-','').slice(0,12));username.required=true;username.pattern='[a-z0-9_]{3,30}';username.maxLength=30;
 const name=field(form,'Display name',current?.display_name||'LOOX creator');name.required=true;name.maxLength=60;
 const bio=field(form,'Bio',current?.bio||'','textarea');bio.maxLength=500;
 const avatar=field(form,'Profile picture (PNG, JPG, WebP · up to 2 MB)');avatar.type='file';avatar.accept='image/png,image/jpeg,image/webp';
 const removeLabel=element('label','community-check'),remove=element('input');remove.type='checkbox';removeLabel.append(remove,'Remove current profile picture');form.append(removeLabel);const submit=element('button','community-primary','Save profile');submit.type='submit';form.append(submit,status);d.append(form);
 form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{
 await cloudRequest(state,'profile',{method:'PATCH',data:{username:username.value.trim().toLowerCase(),display_name:name.value.trim(),bio:bio.value}});
 if(remove.checked)await cloudDelete(state,'avatar');
 else if(avatar.files[0])await cloudUpload(state,'avatar',await cropAvatar(avatar.files[0]));
 try{await api('profile',{name:name.value.trim()});await refresh();}
 catch(syncError){status.textContent='Creator profile saved, but the account name did not sync: '+syncError.message;submit.disabled=false;await onSave();return;}
 d.close();await onSave();}catch(error){status.textContent=error.message;submit.disabled=false;}});
}
export class Community {
 constructor({state,auth,initialize,root,creator=null,kind='all'}){Object.assign(this,{state,auth,initialize,root,creator,kind});this.sort=new URLSearchParams(location.search).get('feed')||'latest';this.query='';this.collection=new URLSearchParams(location.search).get('id')&&location.pathname.endsWith('collections.html')?new URLSearchParams(location.search).get('id'):null;this.days=30;this.posts=[];this.offset=0;this.epoch=0;this.initialized=false;this.pendingLikes=new Set();this.masonryCount=0;this.build();this.onMasonryResize=()=>{if(this.usesDiscoveryMasonry()&&this.masonryCount!==this.discoveryColumns())this.renderDiscoveryMasonry();};window.addEventListener('resize',this.onMasonryResize,{passive:true});document.addEventListener('loox-user',()=>{urls.clear();if(this.initialized)this.load(true);});}
 build(){this.root.classList.add('loox-community');this.root.replaceChildren();const head=element('div','community-heading'),titles=element('div');if(this.creator){titles.append(element('h1','','Profile'));head.append(titles);}else{titles.append(element('span','community-eyebrow','MADE WITH LOOX'),element('h1','','Community'),element('p','','Discover the people and ideas behind the creations.'));head.append(titles,action('Profile',()=>{if(!this.state.user)return this.auth('login');location.assign('creator.html');},'community-button',e=>this.note(e.message)));}this.root.append(head);const tools=element('div','community-tools');tools.append(action('Collections',()=>this.collections(),'community-button',e=>this.note(e.message)),action('Notifications',()=>this.notifications(),'community-button',e=>this.note(e.message)));this.tools=tools;tools.hidden=!!this.creator;this.root.append(tools);
 this.profile=element('section','community-profile');this.profile.hidden=!this.creator;
 if(this.creator){
  this.profile.setAttribute('aria-busy','true');
  const stub=element('div','community-profile-avatar loox-profile-skeleton-avatar');
  stub.setAttribute('aria-hidden','true');
  const lines=element('div','loox-profile-skeleton-lines');
  lines.setAttribute('role','status');lines.setAttribute('aria-label','Loading creator profile');
  for(const width of ['wide','medium','short'])lines.append(element('span','loox-profile-skeleton-line loox-profile-skeleton-'+width));
  this.profile.append(stub,lines);
 }
 this.root.append(this.profile);
 const filters=element('div','community-filters');for(const [name,kind] of [['All media','all'],['Images','image'],['Videos','video']]){const b=action(name,()=>{this.kind=kind;this.load(true);},'community-filter',e=>this.note(e.message));b.dataset.kind=kind;filters.append(b);}const sort=element('select');sort.setAttribute('aria-label','Sort community');for(const [label,value] of [['Newest','latest'],['Following','following'],['Trending','trending'],['Popular','popular'],['Saved','saved'],['Liked','liked']])sort.append(new Option(label,value));sort.value=this.sort;sort.addEventListener('change',()=>{this.sort=sort.value;this.load(true);});filters.append(sort);const search=element('input','community-search');search.type='search';search.placeholder='Search creations, creators or models';search.setAttribute('aria-label','Search community');let timer;search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{this.query=search.value.trim();this.load(true);},300);});filters.append(search);const days=element('select');days.setAttribute('aria-label','Trending period');for(const [label,n] of [['Today',1],['This week',7],['This month',30]])days.append(new Option(label,n));days.value='30';days.addEventListener('change',()=>{this.days=Number(days.value);this.sort='trending';sort.value='trending';this.load(true);});filters.append(days);this.filters=filters;filters.hidden=Boolean(this.creator);this.root.append(filters);
 this.status=element('p','community-note');this.status.setAttribute('role','status');this.profileOnly=Boolean(this.creator&&this.creator!==this.state.user?.id);this.root.classList.toggle('loox-profile-only',this.profileOnly);this.status.hidden=this.profileOnly;this.grid=element('div','community-grid');this.grid.hidden=this.profileOnly;this.more=action('Load more',()=>this.load(false),'community-more',e=>this.note(e.message));this.more.hidden=true;this.root.append(this.status,this.grid,this.more);}
 usesDiscoveryMasonry(){return ['community.html','trending.html','creator.html'].includes(location.pathname.split('/').pop());}
 discoveryColumns(){return matchMedia('(max-width:700px)').matches?(location.pathname.split('/').pop()==='community.html'?1:2):matchMedia('(max-width:1100px)').matches?3:5;}
 renderDiscoveryMasonry(){
  if(!this.usesDiscoveryMasonry())return;
  const count=this.discoveryColumns();
  const cards=[...this.grid.querySelectorAll('.community-card')];
  // DOM traversal groups by column, so restore the original feed order first.
  cards.sort((a,b)=>Number(a.dataset.feedPosition)-Number(b.dataset.feedPosition));
  const columns=Array.from({length:count},()=>element('div','loox-community-masonry-column'));
  for(let index=0;index<cards.length;index++)columns[index%count].append(cards[index]);
  this.grid.replaceChildren(...columns);
  this.masonryCount=count;
 }
 note(text){this.status.textContent=text;}
 async show(){if(!this.initialized){try{await this.initialize({publicAccess:true,waitForAccount:!this.creator});}catch{}this.initialized=true;}await this.load(true);}
 async load(reset=true){const seq=++this.epoch,uid=this.state.user?.id;this.profileOnly=Boolean(this.creator&&this.creator!==uid);this.root.classList.toggle('loox-profile-only',this.profileOnly);if(this.filters)this.filters.hidden=Boolean(this.creator);if(this.tools)this.tools.hidden=Boolean(this.creator);if(this.grid)this.grid.hidden=this.profileOnly;if(this.status)this.status.hidden=this.profileOnly;if(reset){this.offset=0;this.posts=[];}const offset=this.offset;this.more.disabled=true;this.note('Loading creations…');this.root.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===this.kind)));
 try{if(this.creator)await this.loadProfile(seq);if(this.profileOnly){this.grid.replaceChildren();this.more.hidden=true;this.note('');return;}if(['following','saved','liked'].includes(this.sort)&&!this.state.user){this.grid.replaceChildren();this.more.hidden=true;this.note('Sign in to see your '+this.sort+' feed.');return;}const data=await rpc(this.state,'loox_discover',{p_kind:this.kind,p_sort:this.sort,p_offset:offset,p_creator:this.creator,p_query:this.query,p_collection:this.collection,p_days:this.days});
 // Filter public posts against the authoritative Cloudflare privacy record and
 // show current Cloudflare identity, not stale Supabase profile snapshots.
 // D1 discovery already enforces privacy and joins the current creator record.
 if(seq!==this.epoch||uid!==this.state.user?.id)return;
 if(reset)this.grid.replaceChildren();for(const post of data.items||[]){this.posts.push(post);const card=this.card(post);card.dataset.feedPosition=String(this.posts.length-1);this.grid.append(card);}this.renderDiscoveryMasonry();this.offset=offset+(data.items||[]).length;this.more.hidden=!data.has_more;this.more.textContent='Load more';this.note(this.offset?'':this.sort==='following'?'Follow creators to see their newest public posts here.':'No matching public creations yet. Private generations stay in My Creations.');if(!offset){const postId=new URLSearchParams(location.search).get('post');const target=this.posts.find(p=>p.id===postId);if(target&&!this.openedLink){this.openedLink=true;await this.details(target);}else if(postId&&!this.openedLink){const linked=await rpc(this.state,'loox_public_post',{p_id:postId});this.openedLink=true;if(linked)await this.details(linked);else this.note('This post is unavailable or private.');}}}
 catch(error){if(seq===this.epoch){
  if(this.creator&&this.profile.getAttribute('aria-busy')==='true'){
   this.profile.replaceChildren(element('p','community-note',error.message||'Could not load this profile.'));
   this.profile.setAttribute('aria-busy','false');
  }
  if(reset)this.grid.replaceChildren();
  this.note(error.message);
  this.more.hidden=Boolean(this.profileOnly);
  this.more.textContent='Try again';
 }}
 finally{if(seq===this.epoch)this.more.disabled=false;}}
 card(post){const card=element('article','community-card'),open=action('',()=>{},'community-media');open.setAttribute('aria-label','Open '+post.caption);open.dataset.mediaType=post.media_type;
 // Keep the card at a real height before signed R2 media is fetched.
 // Do not show a browser broken-image glyph or the alt text as layout content.
 const media=element(post.media_type==='video'?'video':'img');
 open.classList.add('loox-media-pending');
 if(post.media_type==='video'){
  media.muted=true;media.playsInline=true;media.preload='metadata';
  media.setAttribute('aria-label',post.caption);
 }else{
  media.alt='';media.decoding='async';media.loading='eager';
 }
 open.append(media);
 open.addEventListener('click',()=>this.details(post).catch(e=>this.note(e.message)));
 const art=element('div','community-card-art');art.append(open);card.append(art);
 const markReady=(width,height)=>{
  if(!open.isConnected)return;
  if(width>0&&height>0)open.style.setProperty('aspect-ratio',width+' / '+height,'important');
  open.classList.remove('loox-media-pending','loox-media-error');
  open.classList.add('loox-media-ready');
 };
 const markError=()=>{
  if(!open.isConnected)return;
  open.classList.remove('loox-media-pending');
  open.classList.add('loox-media-error');
  media.removeAttribute('src');
  if(!open.querySelector('.loox-media-error-label'))
   open.append(element('span','loox-media-error-label','Preview unavailable'));
 };
 const loadPreview=async()=>{
  if(!open.isConnected)return;
  if(post.media_type==='video'){
   const src=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id});
   if(!open.isConnected)return;
   media.addEventListener('loadedmetadata',()=>{
    if(media.duration>0)media.currentTime=Math.min(.1,media.duration/2);
    markReady(media.videoWidth||16,media.videoHeight||9);
   },{once:true});
   media.addEventListener('error',markError,{once:true});
   media.src=src;
   return;
  }
  // Decode off-screen first; promote to the visible gallery only once valid.
  let lastError;
  for(const variant of ['preview','original']){
   try{
    const src=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id,variant});
    const candidate=new Image();
    candidate.decoding='async';
    await new Promise((resolve,reject)=>{
     candidate.onload=resolve;
     candidate.onerror=()=>reject(Error('Media could not be decoded'));
     candidate.src=src;
    });
    if(!open.isConnected)return;
    media.src=src;
    markReady(candidate.naturalWidth,candidate.naturalHeight);
    return;
   }catch(error){lastError=error;}
  }
  throw lastError||Error('Preview unavailable');
 };
 const observer=new IntersectionObserver(items=>{
  for(const item of items)if(item.isIntersecting){
   observer.disconnect();
   loadPreview().catch(markError);
  }
 },{rootMargin:'450px'});
 observer.observe(card);
 const body=element('div','community-card-body'),creator=element('a','community-creator');creator.href='creator.html?id='+post.creator_id;
 const avatar=element('span','community-avatar',post.display_name?.slice(0,1)||'L');creator.append(avatar,element('span','','@'+post.username));
 const hoverCreator=element('a','community-hover-creator');hoverCreator.href=creator.href;hoverCreator.setAttribute('aria-label','View '+(post.display_name||post.username)+' profile');
 const hoverAvatar=element('span','community-avatar',post.display_name?.slice(0,1)||'L');
 const hoverNames=element('span','community-hover-names');hoverNames.append(element('strong','',post.display_name||post.username),element('small','','@'+post.username));
 hoverCreator.append(hoverAvatar,hoverNames);
 mediaURL(this.state,post.avatar_path,'loox-avatars',{type:'avatar',id:post.creator_id}).then(url=>{
  for(const holder of [avatar,hoverAvatar]){if(!holder.isConnected)continue;const img=element('img');img.src=url;img.alt='';img.loading='lazy';holder.replaceChildren(img);}
 }).catch(()=>{});
 const hover=element('div','community-card-hover'),hoverTools=element('div','community-hover-tools');
 const saveQuick=action('',()=>this.save(post,saveQuick),'community-save-shortcut',e=>this.note(e.message));
 saveQuick.dataset.postId=post.id;saveQuick.setAttribute('aria-label',post.saved?'Remove saved post':'Save post');saveQuick.setAttribute('aria-pressed',String(!!post.saved));saveQuick.title='Save creation';
 saveQuick.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5V22l-7-5-7 5V4.5Z"/></svg>';
 const copyLink=action('',async()=>{const permalink=new URL('community.html?post='+encodeURIComponent(post.id),location.href).href;await navigator.clipboard.writeText(permalink);this.note('Post link copied.');},'community-copy-shortcut',e=>this.note(e.message));
 copyLink.title='Copy post link';copyLink.setAttribute('aria-label','Copy post link');
 copyLink.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.6.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.6-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/></svg>';
 const likeQuick=action('',()=>this.like(post,likeQuick),'community-like-shortcut',e=>this.note(e.message));
 likeQuick.dataset.postId=post.id;
 likeQuick.title=post.liked?'Unlike post':'Like post';
 this.renderLike(post,likeQuick);
 hoverTools.append(likeQuick,copyLink,saveQuick);hover.append(hoverTools,hoverCreator);art.append(hover);
 const line=element('div','community-card-line'),like=action('',()=>this.like(post,like),'community-like',e=>this.note(e.message));this.renderLike(post,like);line.append(creator,like);const actions=element('div','community-post-actions'),save=action(post.saved?'Saved':'Save',()=>this.save(post,save),'community-button',e=>this.note(e.message));save.dataset.postId=post.id;save.setAttribute('aria-pressed',String(!!post.saved));actions.append(save,element('span','community-note',(post.comments||0)+' comments'+(post.media_type==='video'?' · '+(post.view_count||0)+' views':'')));body.append(element('p','community-caption',post.caption),element('small','community-note',this.modelName(post.model_id)),line,actions);card.append(body);return card;}
 renderLike(post,b){
  b.setAttribute('aria-pressed',String(!!post.liked));
  b.setAttribute('aria-label',(post.liked?'Unlike':'Like')+' post, '+(Number(post.likes)||0)+' likes');
  if(b.classList.contains('community-like-shortcut')){
   b.innerHTML='<svg viewBox="0 0 24 24" fill="'+(post.liked?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.6 5.6 0 0 0-7.9 0L12 5.5l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z"/></svg>';
   b.title=post.liked?'Unlike post':'Like post';
  }else b.textContent=(post.liked?'♥ ':'♡ ')+(Number(post.likes)||0);
 }
 async like(post,button){if(!this.state.user){this.auth('login');return;}if(this.pendingLikes.has(post.id))return;this.pendingLikes.add(post.id);const uid=this.state.user.id,before={liked:!!post.liked,likes:Number(post.likes)||0};post.liked=!before.liked;post.likes=Math.max(0,before.likes+(post.liked?1:-1));this.renderLike(post,button);
  const syncCard=()=>{document.querySelectorAll('.community-like-shortcut[data-post-id="'+post.id+'"]').forEach(other=>this.renderLike(post,other));};
  syncCard();
 try{await cloudRequest(this.state,'like',{method:'POST',data:{post_id:post.id,on:post.liked}});}catch(error){Object.assign(post,before);this.renderLike(post,button);syncCard();throw error;}finally{this.pendingLikes.delete(post.id);}}
 async details(post){
  const d=modal(post.caption),status=element('p','community-note');
  d.classList.add('loox-post-viewer');
  const head=d.querySelector('.community-dialog-head');
  if(head)head.querySelector('h2').textContent='Community post';
  const stage=element('div','loox-post-stage');
  const media=element(post.media_type==='video'?'video':'img','community-detail-media');
  media.alt=post.media_type==='video'?'':post.caption;
  if(post.media_type==='video'){media.controls=true;media.playsInline=true;}
  const mediaStatus=element('p','loox-post-media-status','Loading original…');
  stage.append(media,mediaStatus);
  try{
   media.src=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'original'});
   if(post.media_type==='image')media.onload=()=>mediaStatus.remove();
   else media.onloadeddata=()=>mediaStatus.remove();
   media.onerror=()=>{mediaStatus.textContent='Original unavailable';};
  }catch(e){mediaStatus.textContent='Original unavailable';}
  const bar=element('div','loox-post-action-bar');
  const icons={
   heart:'<path d="M20.8 4.6a5.6 5.6 0 0 0-7.9 0L12 5.5l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z"/>',
   save:'<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5V22l-7-5-7 5V4.5Z"/>',
   download:'<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v3h16v-3"/>',
   link:'<path d="M10 13a5 5 0 0 0 7.6.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.6-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>'
  };
  const control=(name,label,fn)=>{
   const b=action('',fn,'loox-post-icon-button',e=>status.textContent=e.message);
   b.setAttribute('aria-label',label);b.title=label;
   b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';
   return b;
  };
  const like=control('heart','Like this post',async()=>{
   await this.like(post,like);
   like.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons.heart+'</svg>';
   like.setAttribute('aria-pressed',String(!!post.liked));
   like.title=post.liked?'Unlike post':'Like post';
   status.textContent=post.liked?'Liked':'Like removed';
  });
  like.setAttribute('aria-pressed',String(!!post.liked));
  const save=control('save','Save post',async()=>{
   await this.save(post,save);
   save.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons.save+'</svg>';
   save.setAttribute('aria-pressed',String(!!post.saved));
   save.title=post.saved?'Remove saved post':'Save post';
   status.textContent=post.saved?'Saved':'Removed from saved';
  });
  save.dataset.postId=post.id;save.setAttribute('aria-pressed',String(!!post.saved));
  const download=control('download','Download original',async()=>{
   const url=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'original'});
   const ext=post.media_type==='video'?'mp4':'png';
   try{
    const response=await fetch(url,{mode:'cors'});
    if(!response.ok)throw Error('Download unavailable');
    const blob=await response.blob();
    const link=document.createElement('a'),local=URL.createObjectURL(blob);
    link.href=local;link.download='loox-creation-'+post.id+'.'+(blob.type==='image/webp'?'webp':blob.type==='image/jpeg'?'jpg':ext);
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(local),60000);
   }catch{
    // The media CDN may not expose cross-origin fetch; allow saving from a new tab.
    window.open(url,'_blank','noopener,noreferrer');
    status.textContent='Original opened in a new tab. Use Save image/video as if download does not start.';
   }
  });
  if(post.allow_download===false){download.disabled=true;download.title='Downloads disabled by creator';download.setAttribute('aria-label','Downloads disabled by creator');}
  const share=control('link','Copy post link',async()=>{
   await navigator.clipboard.writeText(new URL('community.html?post='+encodeURIComponent(post.id),location.href).href);
   status.textContent='Post link copied';
  });
  bar.append(like,save,download,share);
  stage.append(bar);
  const info=element('div','loox-post-info');
  const creator=element('a','community-creator loox-post-creator-profile');
  creator.href='creator.html?id='+encodeURIComponent(post.creator_id);
  creator.setAttribute('aria-label','View '+(post.display_name||post.username)+' creator profile');
  const profileAvatar=element('span','community-avatar',post.display_name?.slice(0,1)||post.username?.slice(0,1)||'L');
  const profileNames=element('span','loox-post-creator-names');
  profileNames.append(
   element('strong','',post.display_name||post.username),
   element('small','','@'+post.username)
  );
  creator.append(profileAvatar,profileNames);
  {
   mediaURL(this.state,post.avatar_path,'loox-avatars',{type:'avatar',id:post.creator_id})
    .then(url=>{
     if(!profileAvatar.isConnected)return;
     const img=element('img');img.src=url;img.alt='';img.loading='lazy';
     img.onerror=()=>{img.remove();};
     profileAvatar.replaceChildren(img);
    }).catch(()=>{});
  }
  info.append(creator,element('p','loox-post-caption',post.caption),element('p','community-note',new Date(post.created_at).toLocaleString()));
  if(post.shared_prompt){
   const prompt=element('details','loox-post-prompt'),summary=element('summary','','View prompt');
   prompt.append(summary,element('p','community-shared-prompt',post.shared_prompt),
    action('Copy prompt',async()=>{await navigator.clipboard.writeText(post.shared_prompt);status.textContent='Prompt copied';},'community-button',e=>status.textContent=e.message));
   info.append(prompt);
  }
  const similar=element('section','loox-post-related');
  // Rank already-public, already-loaded posts by shared model and caption keywords.
  const keywords=text=>new Set(String(text||'').toLowerCase().match(/[a-z]{4,}/g)||[]);
  const terms=keywords(post.caption);
  const options=this.posts.filter(p=>p.id!==post.id&&p.media_type===post.media_type)
   .map(p=>({post:p,score:(p.model_id&&p.model_id===post.model_id?4:0)+
     [...keywords(p.caption)].filter(word=>terms.has(word)).length}))
   .sort((a,b)=>b.score-a.score)
   .slice(0,8).map(item=>item.post);
  if(options.length){
   similar.append(element('h3','','More like this'));
   const strip=element('div','loox-post-related-grid');
   for(const candidate of options){
    const tile=action('',async()=>{d.close();await this.details(candidate);},'loox-post-related-item',e=>status.textContent=e.message);
    tile.setAttribute('aria-label','Open similar post: '+candidate.caption);
    const thumb=element(candidate.media_type==='video'?'video':'img');
    thumb.loading='lazy';thumb.alt=candidate.caption;
    if(candidate.media_type==='video'){thumb.muted=true;thumb.playsInline=true;thumb.preload='metadata';}
    tile.append(thumb,element('span','',candidate.caption));
    mediaURL(this.state,candidate.media_path,'loox-results',{type:'post',id:candidate.id}).then(url=>{
     if(thumb.isConnected)thumb.src=url;
    }).catch(()=>{tile.classList.add('loox-related-unavailable');});
    strip.append(tile);
   }
   similar.append(strip);
  }
  // Keep the creator visible before the artwork, including on short mobile screens.
  d.append(creator,stage,info,status);
  if(options.length)d.append(similar);
 }


 async connections(p_creator,kind){
  const d=modal(kind==='followers'?'Followers':'Following');
  const list=element('div','loox-connections-list'),status=element('p','community-note');
  const more=action('Show more',()=>load(),'community-button',err=>status.textContent=err.message);
  more.hidden=true;d.append(list,more,status);
  let offset=0,busy=false;
  const load=async()=>{
   if(busy)return;busy=true;more.disabled=true;
   try{
    const data=await cloudRequest(this.state,'connections',{query:{id:p_creator,kind,offset}});
    if(data.hidden){
     status.textContent='This creator keeps their connections private.';
     more.hidden=true;return;
    }
    const items=data.items||[];
    for(const p of items){
     const row=element('a','loox-connection-person');
     row.href='creator.html?id='+encodeURIComponent(p.user_id);
     const photo=element('span','loox-connection-avatar',(p.display_name||'L').slice(0,1).toUpperCase());
     if(p.avatar_path)mediaURL(this.state,p.avatar_path,'loox-avatars',{type:'avatar',id:p.user_id})
       .then(url=>{
        if(!photo.isConnected)return;
        const img=element('img');img.alt='';img.loading='lazy';img.src=url;
        img.addEventListener('error',()=>img.remove(),{once:true});
        photo.replaceChildren(img);
       }).catch(()=>{});
     const details=element('span','loox-connection-name');
     details.append(element('strong','',p.display_name||p.username),
      element('small','','@'+p.username));
     if(p.bio)details.append(element('small','loox-connection-bio',p.bio));
     row.append(photo,details);list.append(row);
    }
    offset+=items.length;more.hidden=!data.has_more;
    if(!offset)status.textContent=kind==='followers'?'No followers yet.':'Not following anyone yet.';
    else status.textContent='';
   }catch(error){status.textContent=error.message;}
   finally{busy=false;more.disabled=false;}
  };
  await load();
 }
 async loadProfile(seq){
   this.profile.setAttribute('aria-busy','true');
  const p=await cloudRequest(this.state,'profile',{query:{id:this.creator}});
  if(seq!==this.epoch)return;
  this.profile.replaceChildren();this.profile.setAttribute('aria-busy','false');const own=this.state.user?.id===this.creator;
  if(!p){
   this.profile.append(element('h2','',own?'Create your profile':'Profile unavailable'),
    element('p','community-note',own?'Choose your public name, photo and bio.':'This creator profile is private or unavailable.'));
   if(own)this.profile.append(action('Set up profile',()=>editCreator({state:this.state,auth:this.auth,onSave:()=>this.load(true)}),'community-primary',e=>this.note(e.message)));
   return;
  }
  const avatar=element('div','community-profile-avatar',(p.display_name||'L').slice(0,1).toUpperCase());
  if(p.avatar_path){
    // The avatar never blocks profile text, plan badges, or follower counts.
    void mediaURL(this.state,p.avatar_path,'loox-avatars',{type:'avatar',id:p.user_id})
     .then(url=>{
      if(!url||seq!==this.epoch||!avatar.isConnected)return;
      const img=element('img');img.alt=p.display_name;img.decoding='async';
      img.onload=()=>{if(seq===this.epoch&&avatar.isConnected)avatar.replaceChildren(img);};
      img.src=url;
     }).catch(()=>{});
   }
  const text=element('div','loox-profile-details');
  const heading=element('div','loox-profile-name-row');
  heading.append(element('h2','',p.display_name));
  const badge=element('span','community-plan-badge', (p.plan_badge||'Basic')+' plan');
  badge.dataset.plan=(p.plan_badge||'Basic').toLowerCase();
  heading.append(badge);
  text.append(heading,element('p','community-handle','@'+p.username));
  if(p.bio)text.append(element('p','community-bio',p.bio));
  const counts=element('div','community-counts loox-profile-counts');
  counts.append(element('span','loox-profile-stat',p.posts+' posts'));
  for(const kind of ['followers','following']){
   const count=Number(p[kind]||0);
   const button=action(count+' '+kind,()=>this.connections(p.user_id,kind),
      'loox-profile-stat loox-profile-stat-button',e=>this.note(e.message));
   const hidden=!own&&Boolean(p.hide_connections);
   button.disabled=hidden;button.title=hidden?'Connections are private':'View '+kind;
   counts.append(button);
  }
  counts.append(element('span','loox-profile-stat',(p.total_views||0)+' video views'));
  text.append(counts);
  this.profile.append(avatar,text);
  if(own){
   const actions=element('div','community-profile-actions');
   actions.append(
    action('Edit profile',()=>editCreator({state:this.state,auth:this.auth,onSave:()=>this.load(true)}),'community-button',e=>this.note(e.message)),
    action('Manage posts',()=>this.manage(),'community-button',e=>this.note(e.message)),
    action('Privacy settings',()=>this.privacy(p),'community-button',e=>this.note(e.message)),
    action('Collections',()=>this.collections(),'community-button',e=>this.note(e.message)));
   const accountLink=element('a','community-button','Account & credits');
   accountLink.href='account.html';actions.append(accountLink);this.profile.append(actions);
  }else{
   const follow=action(p.followed?'Following':'Follow',async()=>{
    if(!this.state.user)return this.auth('login');
    follow.disabled=true;
    try{
     await cloudRequest(this.state,'follow',{method:'POST',data:{creator_id:p.user_id,follow:!p.followed}});
     await this.loadProfile(seq);
    }finally{follow.disabled=false;}
   },'community-primary',e=>this.note(e.message));
   follow.setAttribute('aria-pressed',String(p.followed));
   this.profile.append(follow);
  }
 }
 async manage(){
  if(!this.state.user)return this.auth('login');
  const d=modal('Manage your Community posts');
  const status=element('p','community-note'),list=element('div','community-manage');
  const more=action('Load more',load,'community-button',e=>status.textContent=e.message);
  d.append(list,more,status);
  const self=this;let offset=0,busy=false;
  async function load(){
   if(busy)return;busy=true;more.disabled=true;
   try{
    const data=await cloudRequest(self.state,'manage',{query:{offset}});
    const rows=data.items||[];
    for(const p of rows){
     const row=element('div','community-manage-row');
     const vis=p.visible?'Visible':'Hidden';
     row.append(element('strong','',p.caption),element('small','community-note',p.status+' · '+vis));
     for(const [label,act] of [[p.visible?'Hide':'Show',p.visible?'hide':'show'],['Edit title','edit'],['Post permissions','permissions'],['Delete post','delete']]){
      const button=action(label,async()=>{
       if(act==='permissions'){await self.postPermissions(p);return;}
       if(act==='delete'&&!confirm('Delete this Community post? Its comments, likes and saves will be removed. Your private AI generation stays saved.'))return;
       let caption=null,share=null;
       if(act==='edit'){
        caption=window.prompt('Edit post title (1–300 characters). Changes require approval.',p.caption);
        if(caption===null)return;
        caption=caption.trim();
        if(!caption||caption.length>300)throw Error('Enter a title between 1 and 300 characters.');
        if(caption===p.caption)return;
        share=Boolean(p.shared_prompt);
       }
       await cloudRequest(self.state,'manage',{method:'POST',data:{id:p.id,action:act,caption,share_prompt:share}});
       d.close();await self.load(true);
      },'community-button',e=>status.textContent=e.message);
      row.append(button);
     }
     list.append(row);
    }
    offset+=rows.length;more.hidden=!data.has_more;
    status.textContent=offset?'':'No Community submissions yet.';
   }catch(e){status.textContent=e.message;}finally{busy=false;more.disabled=false;}
  }
  await load();
 }

}

installSocial(Community,{element,action,rpc,result,mediaURL,modal,field});

installPrivacy(Community,{element,action,rpc,modal});
