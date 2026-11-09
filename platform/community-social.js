import {trackMeaningfulView} from './community-watch.js?v=1';
// Persistent social controls. User-generated text is always rendered as textContent.
// Helpers are injected to keep this module independent of the existing generator.
export function installSocial(Community,{element:e,action:a,rpc,result,mediaURL,modal,field}){
 Object.assign(Community.prototype,{
  async save(post,button){
   if(!this.state.user)return this.auth('login');if(button.disabled)return;button.disabled=true;
   try{const q=this.state.client.from('loox_saved_posts');result(post.saved?await q.delete().eq('user_id',this.state.user.id).eq('post_id',post.id):await q.insert({user_id:this.state.user.id,post_id:post.id}));post.saved=!post.saved;
    const controls=[...document.querySelectorAll('.community-save-shortcut[data-post-id], .loox-viewer-save[data-post-id]')].filter(node=>node.dataset.postId===post.id);
    if(!controls.includes(button))controls.push(button);
    for(const control of controls){
     control.setAttribute('aria-pressed',String(post.saved));
     if(control.classList.contains('community-save-shortcut')||control.classList.contains('loox-viewer-save')){
      control.title=post.saved?'Remove saved creation':'Save creation';
      control.setAttribute('aria-label',post.saved?'Remove saved post':'Save post');
     }else control.textContent=post.saved?'Saved':'Save';
    }}finally{button.disabled=false;}
  },
  async collections(post=null){
   if(!this.state.user)return this.auth('login');
   const d=modal(post?'Add to collection':'My collections'),status=e('p','community-note'),list=e('div','community-collection-list'),form=e('form','community-collection-form');
   const name=field(form,'Collection name');name.maxLength=80;name.required=true;
   const label=e('label','community-check'),pub=e('input');pub.type='checkbox';label.append(pub,'Make collection public');form.append(label);
   const submit=e('button','community-primary','Create collection');submit.type='submit';form.append(submit);d.append(list,form,status);
   const load=async()=>{list.replaceChildren();const rows=result(await this.state.client.from('loox_collections').select('id,name,is_public').eq('user_id',this.state.user.id).order('created_at',{ascending:false}).limit(100));
    for(const c of rows){const row=e('div','community-manage-row'),link=e('a','community-creator',c.name+(c.is_public?' · Public':' · Private'));link.href='collections.html?id='+c.id;row.append(link);
     const fail=err=>status.textContent=err.message;
     if(post)row.append(a('Add',async()=>{const r=await this.state.client.from('loox_collection_items').insert({collection_id:c.id,post_id:post.id});if(r.error?.code!=='23505')result(r);status.textContent='Added to '+c.name;},'community-button',fail));
     row.append(a('Rename',async()=>{const value=prompt('Collection name',c.name);if(!value?.trim())return;result(await this.state.client.from('loox_collections').update({name:value.trim()}).eq('id',c.id).eq('user_id',this.state.user.id));await load();},'community-button',fail),a(c.is_public?'Make private':'Make public',async()=>{result(await this.state.client.from('loox_collections').update({is_public:!c.is_public}).eq('id',c.id).eq('user_id',this.state.user.id));await load();},'community-button',fail),a('Delete',async()=>{if(!confirm('Delete this collection? Original posts stay saved.'))return;result(await this.state.client.from('loox_collections').delete().eq('id',c.id).eq('user_id',this.state.user.id));await load();},'community-button',fail));list.append(row);}
    if(!rows.length)list.append(e('p','community-note','Create a collection to organize public community posts. Collections are private by default.'));
   };
   form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{result(await this.state.client.from('loox_collections').insert({user_id:this.state.user.id,name:name.value.trim(),is_public:pub.checked}));name.value='';await load();}catch(error){status.textContent=error.message;}finally{submit.disabled=false;}});await load();
  },
  async postPermissions(post){
   const d=modal('Post permissions'),form=e('form'),status=e('p','community-note'),controls={};
   for(const [key,label,value] of [['comments','Allow comments',post.comments_enabled],['remix','Allow recreation with my public prompt',post.allow_remix],['download','Show download action',post.allow_download]]){const l=e('label','community-check'),i=e('input');i.type='checkbox';i.checked=value!==false;controls[key]=i;l.append(i,label);form.append(l);}
   form.append(e('p','community-note','Public media can be viewed by anyone. Hiding the download action does not make a public file private.'));const submit=e('button','community-primary','Save permissions');submit.type='submit';form.append(submit,status);d.append(form);form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await rpc(this.state,'loox_post_permissions',{p_id:post.id,p_comments:controls.comments.checked,p_remix:controls.remix.checked,p_download:controls.download.checked});d.close();await this.load(true);}catch(error){status.textContent=error.message;submit.disabled=false;}});
  },
  async report(post,comment=null){
   if(!this.state.user)return this.auth('login');const d=modal(comment?'Report comment':'Report post'),form=e('form'),reason=field(form,'Tell us what is wrong','','textarea'),status=e('p','community-note');reason.required=true;reason.minLength=5;reason.maxLength=1000;
   const submit=e('button','community-primary','Send report');submit.type='submit';form.append(submit,status);d.append(form);form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{result(await this.state.client.from('loox_content_reports').insert({user_id:this.state.user.id,post_id:post.id,comment_id:comment,reason:reason.value.trim()}));status.textContent='Report received. An administrator can review it.';submit.remove();}catch(error){status.textContent=error.message;submit.disabled=false;}});
  },

  async comments(post,container){
   const self=this, pageSize=15;
   const section=e('section','loox-conversation'),heading=e('h3','','Conversation');
   const list=e('div','community-comments loox-thread-list');
   const status=e('p','community-note loox-comment-status');
   status.setAttribute('role','status');
   const more=a('Load more comments',()=>loadPage(),'community-button loox-comments-more',err=>{status.textContent=err.message;});
   more.hidden=true;
   section.append(heading,list,more,status);
   container.append(section);
   let offset=0,loading=false,replyTo=null;
   const profiles=new Map();
   async function fetchPeople(ids){
    const missing=[...new Set(ids)].filter(id=>id&&!profiles.has(id));
    if(!missing.length)return;
    const rows=result(await self.state.client.from('loox_creator_profiles')
     .select('user_id,username,display_name,avatar_path').in('user_id',missing));
    const found=new Map(rows.map(p=>[p.user_id,p]));
    for(const id of missing)profiles.set(id,found.get(id)||{user_id:id,username:'loox_user',display_name:'LOOX creator',avatar_path:null});
   }
   function avatar(profile){
    const holder=e('span','loox-comment-avatar',(profile.display_name||'L').slice(0,1).toUpperCase());
    if(profile.avatar_path)mediaURL(self.state,profile.avatar_path,'loox-avatars',{type:'avatar',id:profile.user_id})
      .then(url=>{
       if(!holder.isConnected)return;
       const img=e('img');img.alt='';img.loading='lazy';img.src=url;
       img.addEventListener('error',()=>img.remove(),{once:true});
       holder.replaceChildren(img);
      }).catch(()=>{});
    return holder;
   }
   function authorLink(profile){
    const link=e('a','loox-comment-author');
    link.href='creator.html?id='+encodeURIComponent(profile.user_id);
    const labels=e('span','loox-comment-author-labels');
    labels.append(e('strong','',profile.display_name||profile.username||'LOOX creator'),
      e('small','','@'+(profile.username||'loox_user')));
    link.append(avatar(profile),labels);
    return link;
   }
   let form,input,replyLabel;
   const cancelReply=()=>{
    replyTo=null;
    if(replyLabel)replyLabel.hidden=true;
    if(input)input.placeholder='Write a comment…';
   };
   const setReply=(c)=>{
    if(!self.state.user){self.auth('login');return;}
    replyTo=c;
    const name=profiles.get(c.user_id)?.username||'creator';
    replyLabel.hidden=false;
    replyLabel.replaceChildren(e('span','','Replying to @'+name),
      a('Cancel',cancelReply,'loox-reply-cancel',err=>status.textContent=err.message));
    input.placeholder='Reply to @'+name+'…';
    input.focus();
   };
   function render(c,nested=false){
    const person=profiles.get(c.user_id)||{user_id:c.user_id,display_name:'LOOX creator',username:'loox_user'};
    const row=e('article','community-comment'+(nested?' is-reply':''));
    row.dataset.commentId=c.id;
    const top=e('div','loox-comment-top'),info=authorLink(person);
    top.append(info,e('time','loox-comment-date',new Date(c.created_at).toLocaleString()));
    const body=e('p','loox-comment-text',c.body);
    const controls=e('div','loox-comment-actions');
    if(!nested&&post.comments_enabled!==false)
      controls.append(a('Reply',()=>setReply(c),'loox-comment-action',err=>status.textContent=err.message));
    if(self.state.user?.id===c.user_id||self.state.user?.id===post.creator_id)
      controls.append(a('Delete',async()=>{
       if(!confirm('Delete this comment?'))return;
       result(await self.state.client.from('loox_post_comments').delete().eq('id',c.id));
       await reload();
      },'loox-comment-action',err=>status.textContent=err.message));
    controls.append(a('Report',()=>self.report(post,c.id),'loox-comment-action',err=>status.textContent=err.message));
    row.append(top,body,controls);
    return row;
   }
   async function appendReplies(parents){
    if(!parents.length)return;
    const ids=parents.map(c=>c.id);
    let replyOffset=0;
    const holders=new Map(parents.map(c=>[c.id,list.querySelector('[data-replies-for="'+c.id+'"]')]));
    const loadBatch=async()=>{
     const rows=result(await self.state.client.from('loox_post_comments')
      .select('id,post_id,parent_id,user_id,body,created_at')
      .eq('post_id',post.id).in('parent_id',ids)
      .order('created_at',{ascending:true}).order('id',{ascending:true})
      .range(replyOffset,replyOffset+199));
     replyOffset+=rows.length;
     await fetchPeople(rows.map(c=>c.user_id));
     for(const c of rows)holders.get(c.parent_id)?.append(render(c,true));
     return rows.length===200;
    };
    const extra=e('div','loox-reply-more-wrap');
    const moreReplies=a('Load more replies',async()=>{
     moreReplies.disabled=true;
     try{moreReplies.hidden=!(await loadBatch());}
     catch(err){status.textContent=err.message;}
     finally{moreReplies.disabled=false;}
    },'loox-comment-action',err=>status.textContent=err.message);
    extra.append(moreReplies);
    list.append(extra);
    moreReplies.hidden=!(await loadBatch());
   }
   async function loadPage(){
    if(loading)return;
    loading=true;more.disabled=true;
    try{
     const rows=result(await self.state.client.from('loox_post_comments')
      .select('id,post_id,parent_id,user_id,body,created_at')
      .eq('post_id',post.id).is('parent_id',null)
      .order('created_at',{ascending:true}).order('id',{ascending:true})
      .range(offset,offset+pageSize-1));
     offset+=rows.length;
     more.hidden=rows.length<pageSize;
     await fetchPeople(rows.map(c=>c.user_id));
     for(const c of rows){
      const thread=e('div','loox-comment-thread'),replies=e('div','loox-thread-replies');
      replies.dataset.repliesFor=c.id;
      thread.append(render(c),replies);
      list.append(thread);
     }
     if(rows.length)await appendReplies(rows);
     if(!list.querySelector('.loox-comment-thread')){
      status.textContent='No comments yet.';
     }else status.textContent='';
    }catch(err){status.textContent=err.message;more.hidden=false;}
    finally{loading=false;more.disabled=false;}
   }
   async function reload(){
    offset=0;list.replaceChildren();status.textContent='';
    await loadPage();
   }
   if(post.comments_enabled!==false){
    form=e('form','community-comment-form loox-compact-comment-form');
    replyLabel=e('div','loox-reply-banner');replyLabel.hidden=true;
    input=e('textarea','loox-comment-input');
    input.rows=2;input.maxLength=1200;input.required=true;
    input.placeholder='Write a comment…';input.setAttribute('aria-label','Your comment');
    const submit=e('button','community-primary loox-comment-send','Post');
    submit.type='submit';
    form.append(replyLabel,input,submit);
    section.append(form);
    form.addEventListener('submit',async ev=>{
     ev.preventDefault();
     if(!self.state.user){self.auth('login');return;}
     const body=input.value.trim();
     if(!body||body.length>1200){status.textContent='Enter a comment up to 1,200 characters.';return;}
     submit.disabled=true;
     try{
      const data={post_id:post.id,user_id:self.state.user.id,body};
      if(replyTo)data.parent_id=replyTo.id;
      result(await self.state.client.from('loox_post_comments').insert(data));
      input.value='';cancelReply();
      await reload();
     }catch(err){status.textContent=err.message;}
     finally{submit.disabled=false;}
    });
   }else section.append(e('p','community-note','Comments are turned off for this post.'));
   await loadPage();
  },
  async notifications(){
   if(!this.state.user)return this.auth('login');
   const d=modal('Notifications'),list=e('div','loox-notification-list'),
    status=e('p','community-note');
   status.setAttribute('role','status');
   const markAll=a('Mark all read',async()=>{
    result(await this.state.client.from('loox_notifications').update({is_read:true})
      .eq('user_id',this.state.user.id).eq('is_read',false));
    list.querySelectorAll('.is-unread').forEach(n=>n.classList.remove('is-unread'));
   },'community-button loox-notification-markall',err=>status.textContent=err.message);
   d.append(markAll,list,status);
   try{
    const rows=result(await this.state.client.from('loox_notifications')
     .select('id,kind,actor_id,post_id,comment_id,is_read,created_at')
     .eq('user_id',this.state.user.id)
     .order('created_at',{ascending:false}).limit(60));
    const unique=values=>[...new Set(values.filter(Boolean))];
    const actorIds=unique(rows.map(n=>n.actor_id));
    const postIds=unique(rows.map(n=>n.post_id));
    const commentIds=unique(rows.map(n=>n.comment_id));
    const [people,posts,comments]=await Promise.all([
     actorIds.length?this.state.client.from('loox_creator_profiles')
       .select('user_id,username,display_name,avatar_path').in('user_id',actorIds):Promise.resolve({data:[]}),
     postIds.length?this.state.client.from('loox_community_posts')
       .select('id,caption,media_path,media_type').in('id',postIds):Promise.resolve({data:[]}),
     commentIds.length?this.state.client.from('loox_post_comments')
       .select('id,body').in('id',commentIds):Promise.resolve({data:[]})
    ]);
    // A deleted, private or unavailable actor/post must not prevent other notifications from loading.
    const actors=new Map((people.data||[]).map(p=>[p.user_id,p]));
    const postMap=new Map((posts.data||[]).map(p=>[p.id,p]));
    const commentMap=new Map((comments.data||[]).map(p=>[p.id,p]));
    const mark=n=>{
     if(n.is_read)return;
     void this.state.client.from('loox_notifications').update({is_read:true})
       .eq('id',n.id).eq('user_id',this.state.user.id);
    };
    for(const n of rows){
     const actor=actors.get(n.actor_id),post=postMap.get(n.post_id);
     const name=actor?.display_name||actor?.username||'Someone';
     const row=e('article','community-notification loox-notification'+(!n.is_read?' is-unread':''));
     const avatarLink=e('a','loox-notification-avatar',(name||'L').slice(0,1).toUpperCase());
     avatarLink.href=n.actor_id?'creator.html?id='+encodeURIComponent(n.actor_id):'community.html';
     if(actor?.avatar_path)mediaURL(this.state,actor.avatar_path,'loox-avatars',{type:'avatar',id:actor.user_id})
      .then(url=>{
       if(!avatarLink.isConnected)return;
       const img=e('img');img.src=url;img.alt='';img.loading='lazy';
       img.addEventListener('error',()=>img.remove(),{once:true});
       avatarLink.replaceChildren(img);
      }).catch(()=>{});
     avatarLink.addEventListener('click',()=>mark(n));
     const content=e('a','loox-notification-content');
     content.href=n.post_id?'community.html?post='+encodeURIComponent(n.post_id):
       n.actor_id?'creator.html?id='+encodeURIComponent(n.actor_id):'community.html';
     let heading='';
     if(n.kind==='comment')heading=name+' commented on your post';
     else if(n.kind==='reply')heading=name+' replied to your comment';
     else if(n.kind==='like')heading=name+' liked your post';
     else if(n.kind==='follow')heading=name+' started following you';
     else if(n.kind==='approved')heading='Your creation was approved';
     else if(n.kind==='rejected')heading='Your submission was rejected';
     else heading='Community notification';
     content.append(e('strong','loox-notification-heading',heading));
     const commentText=commentMap.get(n.comment_id)?.body;
     if(commentText)content.append(e('span','loox-notification-message','“'+commentText+'”'));
     if(post?.caption)content.append(e('small','loox-notification-post','On: '+post.caption));
     content.append(e('time','loox-notification-time',new Date(n.created_at).toLocaleString()));
     content.addEventListener('click',()=>mark(n));
     row.append(avatarLink,content);
     if(post?.media_path&&post.media_type!=='video'){
      const thumb=e('a','loox-notification-thumb');
      thumb.href=content.href;thumb.setAttribute('aria-label','Open post');
      const img=e('img');img.alt='Post preview';img.loading='lazy';thumb.append(img);
      mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id})
       .then(url=>{if(img.isConnected)img.src=url;}).catch(()=>thumb.remove());
      thumb.addEventListener('click',()=>mark(n));
      row.append(thumb);
     }
     list.append(row);
    }
    if(!rows.length)status.textContent='No notifications yet. Likes, comments, replies and follows will appear here.';
   }catch(err){status.textContent=err.message;}
  },
  async details(post){
   // Re-fetch visibility on every open. Saved references and stale cards confer no permission.
   const fresh=result(await this.state.client.from('loox_community_posts').select('id').eq('id',post.id).maybeSingle());if(!fresh)throw Error('This post is no longer public.');
   const d=modal('');d.classList.add('community-viewer');d.setAttribute('aria-label','Community post');d.querySelector('.community-dialog-head h2')?.remove();const status=e('p','community-note'),stage=e('div','community-viewer-stage'),panel=e('section','community-viewer-info'),media=e(post.media_type==='video'?'video':'img');media.className='community-detail-media';
   const controls=e('div','community-viewer-controls');const fail=err=>status.textContent=err.message;
   const mobileCommunity=location.pathname.split('/').pop()==='community.html'&&matchMedia('(max-width:700px)').matches&&typeof this.mobileComments==='function'&&typeof this.mobileDetails==='function';
   media.src=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'original'});if(post.media_type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';trackMeaningfulView(media,post,this.state,count=>status.textContent=count+' views');}else{media.alt=post.caption;media.tabIndex=0;media.title='Click to zoom';const zoom=()=>media.classList.toggle('is-zoomed');media.addEventListener('click',zoom);media.addEventListener('keydown',event=>{if(event.key==='Enter')zoom();});}
   controls.append(a('Full screen',()=>stage.requestFullscreen?.(),'community-button',fail));
   if(mobileCommunity)controls.append(a('Details',()=>this.mobileDetails(post),'community-button loox-mobile-viewer-details',fail));
   const index=this.posts?.findIndex(p=>p.id===post.id)??-1;
   const next=delta=>{const p=this.posts?.[index+delta];if(p){d.close();return this.details(p);}};
   if(index>0)controls.append(a('← Previous',()=>next(-1),'community-button',fail));if(index>=0&&index<this.posts.length-1)controls.append(a('Next →',()=>next(1),'community-button',fail));
   let touchX;stage.addEventListener('touchstart',event=>touchX=event.changedTouches[0].clientX,{passive:true});stage.addEventListener('touchend',event=>{const delta=event.changedTouches[0].clientX-touchX;if(Math.abs(delta)>80&&!media.classList.contains('is-zoomed'))Promise.resolve(next(delta<0?1:-1)).catch(fail);},{passive:true});
   d.addEventListener('close',()=>{if(post.media_type==='video'){media.pause();media.removeAttribute('src');media.load();}});stage.append(media);
   const creator=e('a','community-creator loox-social-creator');
   creator.href='creator.html?id='+encodeURIComponent(post.creator_id);
   creator.setAttribute('aria-label','Open '+(post.display_name||post.username)+' profile');
   const creatorAvatar=e('span','community-avatar',post.display_name?.slice(0,1)||post.username?.slice(0,1)||'L');
   const creatorNames=e('span','loox-social-creator-names');
   creatorNames.append(e('strong','',post.display_name||post.username),e('small','','@'+post.username));
   creator.append(creatorAvatar,creatorNames);
   if(post.avatar_path)mediaURL(this.state,post.avatar_path,'loox-avatars',{type:'avatar',id:post.creator_id})
    .then(url=>{if(!creatorAvatar.isConnected)return;const img=e('img');img.alt='';img.src=url;
     img.onerror=()=>img.remove();creatorAvatar.replaceChildren(img);}).catch(()=>{});
   const creatorRow=e('div','loox-social-creator-row');
   creatorRow.append(creator);
   if(this.state.user?.id!==post.creator_id){
    const summary=await rpc(this.state,'loox_creator_summary',{p_creator:post.creator_id});
    let followed=!!summary?.followed;
    const follow=a(followed?'Following':'Follow',async()=>{
     if(!this.state.user)return this.auth('login');follow.disabled=true;
     try{
      const q=this.state.client.from('loox_creator_follows');
      result(followed?await q.delete().eq('follower_id',this.state.user.id).eq('creator_id',post.creator_id):
       await q.insert({follower_id:this.state.user.id,creator_id:post.creator_id}));
      followed=!followed;follow.textContent=followed?'Following':'Follow';
      follow.setAttribute('aria-pressed',String(followed));
     }finally{follow.disabled=false;}
    },'community-button loox-social-follow',fail);
    follow.setAttribute('aria-pressed',String(followed));
    creatorRow.append(follow);
   }
   panel.append(creatorRow,
    e('p','community-note loox-viewer-uploaded-at',new Date(post.created_at).toLocaleString()),
    e('p','community-model loox-viewer-model',this.modelName(post.model_id)),
    ...(post.media_type==='video'?[e('p','community-note',(post.view_count||0)+' views')]:[]));
   const icons={
    comment:'<path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.4-4.1A8.5 8.5 0 1 1 20 11.5Z"/>',
    heart:'<path d="M20.8 4.6a5.6 5.6 0 0 0-7.9 0L12 5.5l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z"/>',
    save:'<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5V22l-7-5-7 5V4.5Z"/>',
    collection:'<path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h5m6 9v6m-3-3h6"/>',
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4m-6.6 8.8 6.6 3.1"/>',
    download:'<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v3h16v-3"/>',
    report:'<path d="M5 21V4m0 1c6-4 9 4 16 0v11c-7 4-10-4-16 0"/>',
    edit:'<path d="m15 5 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z"/>'
   };
   const actions=e('div','loox-social-photo-actions');
   const icon=(name,label,fn,cls='')=>{
    const b=a('',fn,'loox-social-action '+cls,fail);
    b.title=label;b.setAttribute('aria-label',label);
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';
    return b;
   };
   const like=icon('heart','Like post',()=>this.like(post,like),'community-like-shortcut');
   like.dataset.postId=post.id;this.renderLike(post,like);
   const save=icon('save','Save post',()=>this.save(post,save),'loox-viewer-save');
   save.dataset.postId=post.id;save.setAttribute('aria-pressed',String(!!post.saved));
   actions.append(like);
   if(mobileCommunity)actions.append(icon('comment','Open comments',async()=>{d.close();await this.mobileComments(post);},'loox-mobile-viewer-comment'));
   actions.append(save,
    icon('collection','Add to collection',()=>this.collections(post)),
    icon('share','Share post',async()=>{
     const url=new URL('community.html?post='+post.id,location.href).href;
     if(navigator.share)await navigator.share({title:post.caption,url});
     else{await navigator.clipboard.writeText(url);status.textContent='Link copied.';}
    }));
   if(post.allow_download!==false)actions.append(icon('download','Download original',async()=>{
    const url=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'original'});
    try{
     const response=await fetch(url);if(!response.ok)throw Error('Download unavailable.');
     const blob=await response.blob(),link=e('a');
     link.href=URL.createObjectURL(blob);
     link.download='loox-'+post.id+(post.media_type==='video'?'.mp4':blob.type==='image/jpeg'?'.jpg':blob.type==='image/webp'?'.webp':'.png');
     document.body.append(link);link.click();link.remove();
     setTimeout(()=>URL.revokeObjectURL(link.href),60000);
    }catch{window.open(url,'_blank','noopener,noreferrer');status.textContent='Original opened in a new tab.';}
   }));
   if(this.state.user?.id===post.creator_id)actions.append(icon('edit','Edit post',async()=>{
    const caption=window.prompt('Edit caption (changes require approval)',post.caption);
    if(caption===null)return;
    const share=window.confirm('Make the generation prompt public? OK = share, Cancel = private.');
    await rpc(this.state,'loox_manage_post',{p_id:post.id,p_action:'edit',p_caption:caption.trim(),p_share_prompt:share});
    d.close();await this.load(true);
   },'loox-social-edit'));
   else actions.append(icon('report','Report post',()=>this.report(post)));
   const viewerToolbar=e('div','loox-social-viewer-toolbar');viewerToolbar.append(actions,controls);stage.append(viewerToolbar);
   if(post.shared_prompt){
    const promptText=e('p','community-shared-prompt loox-social-prompt-text',post.shared_prompt);
    const promptToggle=a('Show more',()=>{
     const expanded=promptText.classList.toggle('is-expanded');
     promptToggle.textContent=expanded?'Show less':'Show more';
     promptToggle.setAttribute('aria-expanded',String(expanded));
    },'loox-social-prompt-toggle',fail);
    promptToggle.hidden=true;promptToggle.setAttribute('aria-expanded','false');
    panel.append(e('h3','','Prompt'),promptText,promptToggle);
    const measurePrompt=()=>{
     if(!promptText.isConnected||promptText.classList.contains('is-expanded'))return;
     promptToggle.hidden=promptText.scrollHeight<=promptText.clientHeight+2;
    };
    requestAnimationFrame(measurePrompt);
    window.addEventListener('resize',measurePrompt,{passive:true});
    d.addEventListener('close',()=>window.removeEventListener('resize',measurePrompt),{once:true});
    const promptActions=e('div','loox-social-prompt-actions');panel.append(promptActions);promptActions.append(a('Copy prompt',async()=>{await navigator.clipboard.writeText(post.shared_prompt);status.textContent='Prompt copied.';},'community-button',fail));
    if(post.allow_remix!==false)promptActions.append(a('Recreate',()=>{sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:post.media_type==='video'?'video':'image',prompt:post.shared_prompt,operation:post.model_id,model:(this.state.config?.models?.find(m=>m.operation===post.model_id)||this.state.config?.videoModels?.find(m=>post.model_id===m.operation||post.model_id?.startsWith(m.operation+'_')))?.id||(post.model_id==='generate'?'flux':post.model_id==='generate_video'?'wan21':null)}));location.assign(post.media_type==='video'?'ai-video-generator.html#generate':'ai-text-to-image.html#generate');},'community-primary',fail));
   }else panel.append(e('p','community-note','The creator kept this prompt private.'));
   panel.append(status);d.append(stage,panel);
   // Mobile comments use a focused sheet, without duplicating the large viewer.
   // A newly opened post must always begin with its image, not at the comments.
   // Reset again after asynchronous comments finish changing the dialog height.
   d.scrollTop=0;
   if(!mobileCommunity)await this.comments(post,panel);
   d.scrollTop=0;
   requestAnimationFrame(()=>{if(d.open){d.scrollTop=0;stage.scrollTop=0;}});
   
  },
  modelName(operation){const model=this.state.config?.models?.find(m=>m.operation===operation)||this.state.config?.videoModels?.find(m=>operation===m.operation||operation?.startsWith(m.operation+'_'));return model?.name||(operation==='generate'?'FLUX.1 Schnell':operation==='generate_video'?'Wan 2.1 Local':operation?.replace(/^(generate_|video_)/,'').replaceAll('_',' ')||'Model metadata unavailable');}
 });
}

export function installPrivacy(Community,{element:e,action:a,rpc,modal}){
 Community.prototype.privacy=async function(profile){
  const d=modal('Profile privacy'),form=e('form'),status=e('p','community-note'),checks={};
  for(const [key,label,value] of [['private','Private profile (only you can see your profile and posts)',profile.is_private],['connections','Hide follower and following lists',profile.hide_connections],['notifications','Receive community notifications',profile.notifications_enabled!==false]]){const l=e('label','community-check'),i=e('input');i.type='checkbox';i.checked=!!value;checks[key]=i;l.append(i,label);form.append(l);}
  form.append(e('p','community-note','New generations always stay private until you submit them and an administrator approves them. Existing signed media links can remain usable for their short expiry period.'));
  const submit=e('button','community-primary','Save privacy');submit.type='submit';form.append(submit,status);d.append(form);form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await rpc(this.state,'loox_save_privacy',{p_private:checks.private.checked,p_hide_connections:checks.connections.checked,p_notifications:checks.notifications.checked});d.close();await this.load(true);}catch(error){status.textContent=error.message;submit.disabled=false;}});
 };
}
