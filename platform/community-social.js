import {trackMeaningfulView} from './community-watch.js?v=1';
// Persistent social controls. User-generated text is always rendered as textContent.
// Helpers are injected to keep this module independent of the existing generator.
export function installSocial(Community,{element:e,action:a,rpc,result,mediaURL,modal,field}){
 Object.assign(Community.prototype,{
  async save(post,button){
   if(!this.state.user)return this.auth('login');if(button.disabled)return;button.disabled=true;
   try{const q=this.state.client.from('loox_saved_posts');result(post.saved?await q.delete().eq('user_id',this.state.user.id).eq('post_id',post.id):await q.insert({user_id:this.state.user.id,post_id:post.id}));post.saved=!post.saved;button.textContent=post.saved?'Saved':'Save';button.setAttribute('aria-pressed',String(post.saved));}finally{button.disabled=false;}
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
   const list=e('div','community-comments'),status=e('p','community-note'),more=a('More comments',()=>load(),'community-button',err=>status.textContent=err.message);let offset=0;container.append(e('h3','','Conversation'),list,more,status);
   const load=async()=>{more.disabled=true;try{const rows=result(await this.state.client.from('loox_post_comments').select('id,user_id,body,created_at').eq('post_id',post.id).order('created_at').order('id').range(offset,offset+19));offset+=rows.length;more.hidden=rows.length<20;
    const ids=[...new Set(rows.map(c=>c.user_id))];const people=ids.length?result(await this.state.client.from('loox_creator_profiles').select('user_id,username').in('user_id',ids)):[];const names=new Map(people.map(p=>[p.user_id,p.username]));
    for(const c of rows){const row=e('article','community-comment'),by=e('a','community-creator','@'+(names.get(c.user_id)||'LOOX creator'));by.href='creator.html?id='+c.user_id;row.append(by,e('p','',c.body),e('small','community-note',new Date(c.created_at).toLocaleString()));
     if(this.state.user?.id===c.user_id||this.state.user?.id===post.creator_id)row.append(a('Delete',async()=>{result(await this.state.client.from('loox_post_comments').delete().eq('id',c.id));row.remove();},'community-button',err=>status.textContent=err.message));
     row.append(a('Report',()=>this.report(post,c.id),'community-button',err=>status.textContent=err.message));list.append(row);}
    if(!offset)status.textContent='Start the conversation.';
   }finally{more.disabled=false;}};
   if(post.comments_enabled!==false){const form=e('form','community-comment-form'),input=field(form,'Your comment','','textarea');input.maxLength=1200;input.required=true;const submit=e('button','community-primary','Post comment');submit.type='submit';form.append(submit);container.append(form);
    form.addEventListener('submit',async event=>{event.preventDefault();if(!this.state.user)return this.auth('login');submit.disabled=true;try{result(await this.state.client.from('loox_post_comments').insert({post_id:post.id,user_id:this.state.user.id,body:input.value.trim()}));input.value='';offset=0;list.replaceChildren();status.textContent='';await load();}catch(error){status.textContent=error.message;}finally{submit.disabled=false;}});
   }else container.append(e('p','community-note','The creator disabled comments.'));
   await load();
  },
  async notifications(){
   if(!this.state.user)return this.auth('login');const d=modal('Notifications'),list=e('div'),status=e('p','community-note');d.append(a('Mark all read',async()=>{result(await this.state.client.from('loox_notifications').update({is_read:true}).eq('user_id',this.state.user.id).eq('is_read',false));list.querySelectorAll('.is-unread').forEach(n=>n.classList.remove('is-unread'));},'community-button',err=>status.textContent=err.message),list,status);
   const rows=result(await this.state.client.from('loox_notifications').select('id,kind,post_id,is_read,created_at').eq('user_id',this.state.user.id).order('created_at',{ascending:false}).limit(50));
   const labels={like:'Someone liked your creation',follow:'You have a new follower',comment:'A new comment on your creation',approved:'Your creation was approved',rejected:'Your submission was rejected'};
   for(const n of rows){const row=e('div','community-notification'+(!n.is_read?' is-unread':''));row.append(e('p','',labels[n.kind]||'Community update'),e('small','community-note',new Date(n.created_at).toLocaleString()));if(n.post_id){const link=e('a','community-creator','Open post');link.href='community.html?post='+n.post_id;row.append(link);}list.append(row);}if(!rows.length)status.textContent='You are all caught up. New community activity will appear here.';
  },
  async details(post){
   // Re-fetch visibility on every open. Saved references and stale cards confer no permission.
   const fresh=result(await this.state.client.from('loox_community_posts').select('id').eq('id',post.id).maybeSingle());if(!fresh)throw Error('This post is no longer public.');
   const d=modal(post.caption||'Creation');d.classList.add('community-viewer');const status=e('p','community-note'),stage=e('div','community-viewer-stage'),panel=e('section','community-viewer-info'),media=e(post.media_type==='video'?'video':'img');media.className='community-detail-media';
   const controls=e('div','community-viewer-controls');const fail=err=>status.textContent=err.message;
   media.src=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'original'});if(post.media_type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';trackMeaningfulView(media,post,this.state,count=>status.textContent=count+' views');}else{media.alt=post.caption;media.tabIndex=0;media.title='Click to zoom';const zoom=()=>media.classList.toggle('is-zoomed');media.addEventListener('click',zoom);media.addEventListener('keydown',event=>{if(event.key==='Enter')zoom();});}
   controls.append(a('Full screen',()=>stage.requestFullscreen?.(),'community-button',fail));const index=this.posts?.findIndex(p=>p.id===post.id)??-1;
   const next=delta=>{const p=this.posts?.[index+delta];if(p){d.close();return this.details(p);}};
   if(index>0)controls.append(a('← Previous',()=>next(-1),'community-button',fail));if(index>=0&&index<this.posts.length-1)controls.append(a('Next →',()=>next(1),'community-button',fail));
   let touchX;stage.addEventListener('touchstart',event=>touchX=event.changedTouches[0].clientX,{passive:true});stage.addEventListener('touchend',event=>{const delta=event.changedTouches[0].clientX-touchX;if(Math.abs(delta)>80&&!media.classList.contains('is-zoomed'))Promise.resolve(next(delta<0?1:-1)).catch(fail);},{passive:true});
   d.addEventListener('close',()=>{if(post.media_type==='video'){media.pause();media.removeAttribute('src');media.load();}});stage.append(media,controls);
   const creator=e('a','community-creator','@'+post.username);creator.href='creator.html?username='+encodeURIComponent(post.username);if(this.state.user?.id!==post.creator_id){const summary=await rpc(this.state,'loox_creator_summary',{p_creator:post.creator_id});let followed=!!summary?.followed;const follow=a(followed?'Following':'Follow',async()=>{if(!this.state.user)return this.auth('login');follow.disabled=true;try{const q=this.state.client.from('loox_creator_follows');result(followed?await q.delete().eq('follower_id',this.state.user.id).eq('creator_id',post.creator_id):await q.insert({follower_id:this.state.user.id,creator_id:post.creator_id}));followed=!followed;follow.textContent=followed?'Following':'Follow';follow.setAttribute('aria-pressed',String(followed));}finally{follow.disabled=false;}},'community-button',fail);follow.setAttribute('aria-pressed',String(followed));panel.append(follow);}panel.append(creator,e('p','community-bio',post.caption),e('p','community-note',new Date(post.created_at).toLocaleString()),e('p','community-model',this.modelName(post.model_id)),...(post.media_type==='video'?[e('p','community-note',(post.view_count||0)+' views')]:[]));
   const actions=e('div','community-post-actions'),like=a('',()=>this.like(post,like),'community-button',fail);this.renderLike(post,like);const save=a(post.saved?'Saved':'Save',()=>this.save(post,save),'community-button',fail);save.setAttribute('aria-pressed',String(!!post.saved));actions.append(like,save,a('Collection',()=>this.collections(post),'community-button',fail),a('Share',async()=>{const url=new URL('community.html?post='+post.id,location.href).href;if(navigator.share)await navigator.share({title:post.caption,url});else{await navigator.clipboard.writeText(url);status.textContent='Link copied.';}},'community-button',fail));
   if(post.allow_download!==false)actions.append(a('Download',async()=>{const url=await mediaURL(this.state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'original'}),r=await fetch(url);if(!r.ok)throw Error('Download unavailable.');const blob=await r.blob(),link=e('a');link.href=URL.createObjectURL(blob);link.download='loox-'+post.id+(post.media_type==='video'?'.mp4':'.png');link.click();setTimeout(()=>URL.revokeObjectURL(link.href),10000);},'community-button',fail));
   if(post.shared_prompt){panel.append(e('h3','','Prompt'),e('p','community-shared-prompt',post.shared_prompt));actions.append(a('Copy prompt',async()=>{await navigator.clipboard.writeText(post.shared_prompt);status.textContent='Prompt copied.';},'community-button',fail));
    if(post.allow_remix!==false)actions.append(a('Recreate',()=>{sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:post.media_type==='video'?'video':'image',prompt:post.shared_prompt,operation:post.model_id,model:(this.state.config?.models?.find(m=>m.operation===post.model_id)||this.state.config?.videoModels?.find(m=>post.model_id===m.operation||post.model_id?.startsWith(m.operation+'_')))?.id||(post.model_id==='generate'?'flux':post.model_id==='generate_video'?'wan21':null)}));location.assign(post.media_type==='video'?'ai-video-generator.html#generate':'ai-text-to-image.html#generate');},'community-primary',fail));
   }else panel.append(e('p','community-note','The creator kept this prompt private.'));
   actions.append(a('Report',()=>this.report(post),'community-button',fail));if(this.state.user?.id===post.creator_id)actions.append(a('Manage post',()=>this.manage(),'community-button',fail));panel.append(actions,status);d.append(stage,panel);await this.comments(post,panel);
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
