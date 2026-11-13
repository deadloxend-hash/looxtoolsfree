import {state,auth,initialize} from './account.js?v=9';
import {cloudRequest} from './profile-cloudflare.js?v=1';
import {Community,element,action,result,mediaURL} from './community.js?v=28';
const root=document.getElementById('community-root'),page=location.pathname.split('/').pop();
const discoveryPage=page==='community.html'||page==='trending.html';
if(discoveryPage)document.body.classList.add('loox-discovery-gallery');
if(page==='community.html')document.body.classList.add('loox-community-photo-wall');
if(page==='trending.html')document.body.classList.add('loox-trending-feed');

/* Mobile Community: a full-width image feed. Existing cards and actions remain
   untouched on desktop, Trending, profiles and other pages. */
if(page==='community.html'){
 const originalCard=Community.prototype.card;
 const svg=(path)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
 const icons={
  comment:svg('<path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.4-4.1A8.5 8.5 0 1 1 20 11.5Z"/>'),
  share:svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4m-6.6 8.8 6.6 3.1"/>'),
  details:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>'),
  save:svg('<path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V22l-6-4.5L6 22V3.5Z"/>'),
  more:svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')
 };
 const permalink=post=>new URL('community.html?post='+encodeURIComponent(post.id),location.href).href;
 const launch=(post,self)=>{
  if(!post.shared_prompt)return;
  const model=self.state.config?.models?.find(m=>m.operation===post.model_id)
   ||self.state.config?.videoModels?.find(m=>post.model_id===m.operation||post.model_id?.startsWith(m.operation+'_'));
  sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({
   kind:post.media_type==='video'?'video':'image',
   prompt:post.shared_prompt,operation:post.model_id,
   model:model?.id||(post.model_id==='generate'?'flux':post.model_id==='generate_video'?'wan21':null)
  }));
  location.assign(post.media_type==='video'?'ai-video-generator.html#generate':'ai-text-to-image.html#generate');
 };
 Community.prototype.mobileComments=async function(post){
  const d=element('dialog','community-dialog loox-community-comments-sheet');
  d.setAttribute('aria-label','Post comments');
  const top=element('div','loox-community-sheet-head');
  const title=element('h2','','Comments');
  const close=action('×',()=>d.close(),'loox-community-sheet-close');
  close.setAttribute('aria-label','Close comments');
  top.append(title,close);d.append(top);
  d.addEventListener('close',()=>d.remove(),{once:true});
  document.body.append(d);d.showModal();
  d.addEventListener('click',event=>{if(event.target===d)d.close();});
  try{
   await this.comments(post,d);
   if(d.open)d.scrollTop=0;
  }catch(error){d.append(element('p','community-note',error.message||'Comments unavailable.'));}
 };
 Community.prototype.mobileDetails=function(post){
  const d=element('dialog','community-dialog loox-community-details-sheet');
  d.setAttribute('aria-label','Post details');
  const top=element('div','loox-community-sheet-head');
  const heading=element('h2','','Post details');
  const close=action('×',()=>d.close(),'loox-community-sheet-close');
  close.setAttribute('aria-label','Close details');
  top.append(heading,close);d.append(top);
  const info=element('dl','loox-community-details-list');
  const detail=(label,value)=>{
   const row=element('div','loox-community-details-row');
   row.append(element('dt','',label),element('dd','',value));
   info.append(row);
  };
  detail('Uploaded',new Date(post.created_at).toLocaleString());
  detail('AI model',this.modelName(post.model_id));
  detail('Created by',post.display_name||post.username||'LOOX creator');
  d.append(info);
  d.addEventListener('close',()=>d.remove(),{once:true});
  document.body.append(d);d.showModal();
  d.addEventListener('click',event=>{if(event.target===d)d.close();});
 };
 Community.prototype.card=function(post){
  const card=originalCard.call(this,post);
  const self=this;
  const feedback=element('span','loox-mobile-post-feedback');
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const fail=error=>{feedback.textContent=error?.message||'Action unavailable. Please try again.';};
  const makeAction=(label,fn,className='loox-mobile-feed-action')=>{
   const button=action('',fn,className,fail);
   button.type='button';button.title=label;button.setAttribute('aria-label',label);
   return button;
  };
  const profileHref='creator.html?id='+encodeURIComponent(post.creator_id);
  const head=element('div','loox-mobile-feed-head');
  const author=element('a','loox-mobile-feed-author');
  author.href=profileHref;
  const avatar=element('span','community-avatar',(post.display_name||post.username||'L').slice(0,1).toUpperCase());
  const authorText=element('span','loox-mobile-feed-author-text');
  authorText.append(
   element('strong','',post.display_name||post.username||'LOOX creator'),
   element('small','','@'+(post.username||'creator'))
  );
  author.append(avatar,authorText);
  if(post.avatar_path)void mediaURL(self.state,post.avatar_path,'loox-avatars',{type:'avatar',id:post.creator_id})
   .then(url=>{
    if(!avatar.isConnected)return;
    const img=element('img');img.src=url;img.alt='';img.loading='lazy';
    img.addEventListener('error',()=>img.remove(),{once:true});
    avatar.replaceChildren(img);
   }).catch(()=>{});
  const headRight=element('div','loox-mobile-feed-head-right');
  // Avatar and username already link to the profile; no duplicate Profile button.
  const options=element('details','loox-mobile-feed-options');
  const trigger=element('summary','loox-mobile-feed-options-trigger');
  trigger.innerHTML=icons.more;trigger.setAttribute('aria-label','More post options');trigger.title='More post options';
  const menu=element('div','loox-mobile-feed-menu');
  options.addEventListener('toggle',()=>{if(options.open){
   document.querySelectorAll('.loox-mobile-feed-options[open]').forEach(other=>{if(other!==options)other.open=false;});
  }});
  const menuButton=(label,fn)=>{
   const button=action(label,()=>{options.open=false;return fn();},'loox-mobile-feed-menu-item',fail);
   menu.append(button);
  };
  const copyPost=async()=>{
   await navigator.clipboard.writeText(permalink(post));
   feedback.textContent='Post link copied.';
  };
  const copyPrompt=async()=>{
   if(!post.shared_prompt)return;
   await navigator.clipboard.writeText(post.shared_prompt);
   feedback.textContent='Prompt copied.';
  };
  const openComments=()=>self.mobileComments(post);
  const openDetails=()=>self.mobileDetails(post);
  const download=async()=>{
   if(post.allow_download===false)return;
   const url=await mediaURL(self.state,post.media_path,'loox-results',{type:'post',id:post.id,variant:'original'});
   try{
    const response=await fetch(url);
    if(!response.ok)throw Error('Download unavailable');
    const blob=await response.blob(),file=element('a'),object=URL.createObjectURL(blob);
    file.href=object;
    file.download='loox-'+post.id+(post.media_type==='video'?'.mp4':blob.type==='image/jpeg'?'.jpg':blob.type==='image/webp'?'.webp':'.png');
    document.body.append(file);file.click();file.remove();
    setTimeout(()=>URL.revokeObjectURL(object),60000);
   }catch{window.open(url,'_blank','noopener,noreferrer');feedback.textContent='Original opened in a new tab.';}
  };
  const promptPanel=element('div','loox-mobile-feed-prompt');
  promptPanel.hidden=true;
  const viewPrompt=()=>{
   if(!post.shared_prompt)return;
   promptPanel.hidden=!promptPanel.hidden;
   promptButton.textContent=promptPanel.hidden?'View prompt':'Hide prompt';
   promptButton.setAttribute('aria-expanded',String(!promptPanel.hidden));
   if(!promptPanel.hidden)requestAnimationFrame(()=>{
    const text=promptPanel.querySelector('.loox-mobile-feed-prompt-text');
    const expand=promptPanel.querySelector('.loox-mobile-feed-expand');
    if(text&&expand&&!text.classList.contains('is-expanded'))expand.hidden=text.scrollHeight<=text.clientHeight+2;
   });
  };
  menuButton('View details',openDetails);
  menuButton('View profile',()=>location.assign(profileHref));
  menuButton('Copy post link',copyPost);
  if(post.shared_prompt){
   menuButton('View prompt',()=>{if(promptPanel.hidden)viewPrompt();});
   menuButton('Copy prompt',copyPrompt);
   if(post.allow_remix!==false)menuButton('Recreate',()=>launch(post,self));
  }
  if(post.allow_download!==false)menuButton('Download original',download);
  if(self.state.user?.id===post.creator_id)menuButton('Manage post',()=>self.manage());
  else menuButton('Report post',()=>self.report(post));
  options.append(trigger,menu);headRight.append(options);
  head.append(author,headRight);
  card.prepend(head);
  const actions=element('div','loox-mobile-feed-actions');
  const like=makeAction('Like post',async()=>{
   try{await self.like(post,like);}
   finally{likeCount.textContent=(Number(post.likes)||0).toLocaleString()+' likes';}
  },'loox-mobile-feed-action community-like-shortcut loox-mobile-feed-like');
  like.dataset.postId=post.id;
  self.renderLike(post,like);
  const comment=makeAction('View comments',openComments);
  comment.innerHTML=icons.comment;
  const share=makeAction('Share post',async()=>{
   if(navigator.share)await navigator.share({title:post.caption||'LOOX Community post',url:permalink(post)});
   else await copyPost();
  });
  share.innerHTML=icons.share;
  const details=makeAction('View post details',openDetails,'loox-mobile-feed-action loox-mobile-feed-details');
  details.innerHTML=icons.details;
  const save=makeAction('Save post',()=>self.save(post,save),'loox-mobile-feed-action community-save-shortcut loox-mobile-feed-save');
  save.dataset.postId=post.id;
  save.setAttribute('aria-pressed',String(!!post.saved));
  save.innerHTML=icons.save;
  // Show current like and comment totals directly beside their icons.
  const likeGroup=element('span','loox-engagement-group loox-engagement-like');
  const likeNumber=element('span','loox-engagement-number',(Number(post.likes)||0).toLocaleString());
  likeNumber.dataset.postId=post.id;
  likeGroup.append(like,likeNumber);
  new MutationObserver(()=>{
   likeNumber.textContent=(Number(post.likes)||0).toLocaleString();
  }).observe(like,{attributes:true,attributeFilter:['aria-label']});
  const commentGroup=element('span','loox-engagement-group loox-engagement-comment');
  const commentNumber=element('span','loox-engagement-number',(Number(post.comments)||0).toLocaleString());
  commentNumber.dataset.postId=post.id;
  commentGroup.append(comment,commentNumber);
  actions.append(likeGroup,commentGroup,share,details,save);
  const info=element('div','loox-mobile-feed-info');
  const likeCount=element('strong','loox-mobile-feed-like-count',(Number(post.likes)||0).toLocaleString()+' likes');
  likeCount.dataset.postId=post.id;
  info.append(likeCount);
  if(post.caption){
   const caption=element('p','loox-mobile-feed-caption');
   caption.append(element('strong','',post.username||post.display_name||'LOOX creator'),document.createTextNode(' '+post.caption));
   const moreCaption=action('more',()=>{
    const expanded=caption.classList.toggle('is-expanded');
    moreCaption.textContent=expanded?'less':'more';
    moreCaption.setAttribute('aria-expanded',String(expanded));
   },'loox-mobile-feed-caption-more',fail);
   moreCaption.hidden=true;moreCaption.setAttribute('aria-expanded','false');
   info.append(caption,moreCaption);
   requestAnimationFrame(()=>{
    if(caption.isConnected)moreCaption.hidden=caption.scrollHeight<=caption.clientHeight+2;
   });
  }
  const meta=element('div','loox-mobile-feed-meta');
  const commentsLink=action((Number(post.comments)||0)?'View all '+post.comments+' comments':'Add a comment',openComments,'loox-mobile-feed-comments',fail);
  commentsLink.dataset.postId=post.id;
  meta.append(commentsLink);
  info.append(meta);
  const promptBar=element('div','loox-mobile-feed-prompt-bar');
  let promptButton;
  if(post.shared_prompt){
   promptButton=action('View prompt',viewPrompt,'loox-mobile-feed-prompt-button',fail);
   promptButton.setAttribute('aria-expanded','false');
   promptBar.append(promptButton);
   const promptText=element('p','loox-mobile-feed-prompt-text',post.shared_prompt);
   const expand=action('Show more',()=>{
    const expanded=promptText.classList.toggle('is-expanded');
    expand.textContent=expanded?'Show less':'Show more';
   },'loox-mobile-feed-expand',fail);
   const promptControls=element('div','loox-mobile-feed-prompt-controls');
   promptControls.append(action('Copy prompt',copyPrompt,'loox-mobile-feed-pill',fail));
   if(post.allow_remix!==false)promptControls.append(action('Recreate',()=>launch(post,self),'loox-mobile-feed-pill loox-mobile-feed-recreate',fail));
   promptPanel.append(promptText,expand,promptControls);
  }else{
   promptBar.append(element('span','loox-mobile-feed-private','Prompt private'));
  }
  info.append(promptBar,promptPanel,feedback);
  card.append(actions,info);

  // On mobile, a single tap still opens the post. A second nearby tap within
  // 340 ms instead likes the photo and shows a heart burst over that location.
  // The capture listener runs before the original click-to-open handler.
  const photo=card.querySelector('.community-card-art .community-media');
  if(post.media_type==='image'&&photo){
   let firstAt=0,firstX=0,firstY=0,openTimer=null;
   const openPhoto=()=>self.details(post).catch(fail);
   const showHeart=(event)=>{
    const bounds=photo.getBoundingClientRect();
    const heart=element('span','loox-community-doubletap-heart');
    heart.setAttribute('aria-hidden','true');
    heart.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.6 5.6 0 0 0-7.9 0L12 5.5l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z"/></svg>';
    heart.style.left=Math.max(44,Math.min(bounds.width-44,event.clientX-bounds.left))+'px';
    heart.style.top=Math.max(44,Math.min(bounds.height-44,event.clientY-bounds.top))+'px';
    photo.append(heart);
    heart.addEventListener('animationend',()=>heart.remove(),{once:true});
    setTimeout(()=>heart.remove(),900);
    like.classList.remove('loox-community-like-pop');
    void like.offsetWidth; // Restart the icon animation on repeated double-taps.
    like.classList.add('loox-community-like-pop');
    setTimeout(()=>like.classList.remove('loox-community-like-pop'),550);
   };
   photo.addEventListener('click',event=>{
    // Preserve immediate activation for keyboard/screen-reader clicks, and
    // preserve the standard desktop image viewer interaction.
    if(!matchMedia('(max-width:700px)').matches||event.detail===0)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const now=performance.now();
    const doubleTap=firstAt>0&&now-firstAt<340&&
     Math.hypot(event.clientX-firstX,event.clientY-firstY)<75;
    if(openTimer){clearTimeout(openTimer);openTimer=null;}
    if(doubleTap){
     firstAt=0;
     showHeart(event);
     if(!self.state.user){self.auth('login');return;}
     // Double-tapping always likes: never toggle an already-liked post off.
     if(!post.liked&&!self.pendingLikes.has(post.id)){
      const result=self.like(post,like);
      likeCount.textContent=(Number(post.likes)||0).toLocaleString()+' likes';
      Promise.resolve(result).catch(fail).finally(()=>{
       if(likeCount.isConnected)
        likeCount.textContent=(Number(post.likes)||0).toLocaleString()+' likes';
      });
     }
     return;
    }
    firstAt=now;firstX=event.clientX;firstY=event.clientY;
    openTimer=setTimeout(()=>{
     openTimer=null;firstAt=0;
     if(photo.isConnected)openPhoto();
    },340);
   },true);
  }
  return card;
 };
 document.addEventListener('pointerdown',event=>{
  document.querySelectorAll('.loox-mobile-feed-options[open]').forEach(item=>{
   if(!item.contains(event.target))item.open=false;
  });
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')document.querySelectorAll('.loox-mobile-feed-options[open]').forEach(item=>item.open=false);
 });
}

// Update any visible comment badges after a successful post or deletion.
document.addEventListener('loox:post-comment-count',event=>{
 const id=event.detail?.postId,count=Number(event.detail?.count);
 if(!id||!Number.isFinite(count))return;
 const formatted=Math.max(0,count).toLocaleString();
 document.querySelectorAll('.loox-engagement-comment .loox-engagement-number').forEach(node=>{
  if(node.dataset.postId!==id)return;
  node.textContent=formatted;
  const button=node.parentElement?.querySelector('button');
  if(button)button.setAttribute('aria-label','Open post and comments, '+formatted+' comments');
 });
 document.querySelectorAll('.loox-mobile-feed-comments').forEach(node=>{
  if(node.dataset.postId===id)node.textContent=count>0?'View all '+formatted+' comments':'Add a comment';
 });
});
const community=new Community({state,auth,initialize,root});
if(page==='community.html'){
 const originalColumns=community.discoveryColumns.bind(community);
 community.discoveryColumns=()=>matchMedia('(max-width:700px)').matches?1:originalColumns();
}

if(page==='trending.html'){
 // Trending is a discovery feed, not the two-column Community/Template grid.
 // Build one visible, full-width post per row on phones; keep responsive columns
 // on larger screens. Reusing real card actions preserves all social handlers.
 community.discoveryColumns=()=>{
  if(matchMedia('(max-width:850px)').matches)return 1;
  return matchMedia('(max-width:1280px)').matches?2:3;
 };
 const originalCard=community.card.bind(community);
 community.card=post=>{
  const card=originalCard(post);
  card.classList.add('loox-trending-post');
  const art=card.querySelector('.community-card-art');
  const body=card.querySelector('.community-card-body');
  const overlay=card.querySelector('.community-card-hover');
  const quick=card.querySelector('.community-hover-tools');
  if(!art||!body||!quick||!overlay)return card;
  const actions=element('div','loox-trending-action-row');
  actions.setAttribute('aria-label','Post actions');
  const buttons=[...quick.children];
  // Reuse original buttons so likes, sharing and saving continue working.
  const like=buttons.find(button=>button.classList.contains('community-like-shortcut'));
  const copy=buttons.find(button=>button.classList.contains('community-copy-shortcut'));
  const save=buttons.find(button=>button.classList.contains('community-save-shortcut'));
  if(like){
   like.classList.add('loox-trending-action');
   const group=element('span','loox-engagement-group loox-engagement-like');
   const number=element('span','loox-engagement-number',(Number(post.likes)||0).toLocaleString());
   number.dataset.postId=post.id;
   group.append(like,number);actions.append(group);
   new MutationObserver(()=>{
    number.textContent=(Number(post.likes)||0).toLocaleString();
   }).observe(like,{attributes:true,attributeFilter:['aria-label']});
  }
  const comment=element('button','loox-trending-action loox-trending-comment');
  comment.type='button';
  comment.setAttribute('aria-label','Open post and comments, '+(Number(post.comments)||0)+' comments');
  comment.title='Post comments';
  comment.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.4-4.1A8.5 8.5 0 1 1 20 11.5Z"/></svg>';
  comment.addEventListener('click',()=>community.details(post).catch(error=>community.note(error.message)));
  const commentGroup=element('span','loox-engagement-group loox-engagement-comment');
  const commentNumber=element('span','loox-engagement-number',(Number(post.comments)||0).toLocaleString());
  commentNumber.dataset.postId=post.id;
  commentGroup.append(comment,commentNumber);actions.append(commentGroup);
  if(copy){copy.classList.add('loox-trending-action');actions.append(copy);}
  if(save){save.classList.add('loox-trending-action');actions.append(save);}
  const meta=body.querySelector('small.community-note');
  if(meta)meta.classList.add('loox-trending-model');
  body.prepend(actions);
  const profile=overlay.querySelector('.community-hover-creator');
  if(profile)profile.setAttribute('title','View creator profile');
  return card;
 };
 const headline=element('section','loox-trending-intro');
 headline.setAttribute('aria-label','Trending creations');
 const eyebrow=element('span','loox-trending-eyebrow','✦ WHAT’S TRENDING');
 const h=element('h1','','Trending now.');
 const p=element('p','','Discover standout images and videos shared by LOOX creators.');
 headline.append(eyebrow,h,p);
 root.insertBefore(headline,root.querySelector('.community-heading'));
 // Collections and notifications remain functional but live in one overflow
 // control rather than taking two full-width toolbar pills on small screens.
 const toolbar=root.querySelector('.loox-discovery-toolbar');
 const tools=toolbar?.querySelector('.community-tools');
 if(toolbar&&tools){
  const more=element('details','loox-trending-more');
  const summary=element('summary','','More');
  summary.setAttribute('aria-label','More community actions');
  more.append(summary,tools);
  toolbar.append(more);
  tools.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{more.open=false;}));
  document.addEventListener('pointerdown',event=>{
   if(more.open&&!more.contains(event.target))more.open=false;
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&more.open){more.open=false;summary.focus({preventScroll:true});}
  });
 }
}
window.__looxOpenCommunityNotifications=()=>community.notifications().catch(error=>community.note(error.message));
if(page==='community.html'){
 // Reuse the real notifications action rather than adding a duplicate handler.
 const header=document.querySelector('header.loox-gallery-workspace-header');
 const tools=root.querySelector('.community-tools');
 const buttons=[...tools?.querySelectorAll('button')||[]];
 const notify=buttons.find(button=>button.textContent.trim()==='Notifications');
 const collections=buttons.find(button=>button.textContent.trim()==='Collections');
 if(header&&notify){
  notify.classList.add('loox-community-notification');
  notify.setAttribute('aria-label','Open notifications');
  notify.title='Notifications';
  notify.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
  header.insertBefore(notify,header.querySelector('.loox-community-mobile-menu'));
 }
 // Keep collection management available through the existing post/save menus,
 // but remove its standalone Community toolbar button on mobile.
 if(collections)collections.classList.add('loox-community-collections-button');
 const search=root.querySelector('.community-search');
 if(search){search.placeholder='Search creators';search.setAttribute('aria-label','Search creators and creations');}
}
if(discoveryPage){
 // Keep the existing sort, filter, search, collection and notification handlers.
 // Only move their live DOM controls into a compact Templates-style toolbar.
 const filters=root.querySelector('.community-filters');
 const tools=root.querySelector('.community-tools');
 const search=filters?.querySelector('.community-search');
 if(filters&&tools&&search){
  const toolbar=element('div','loox-discovery-toolbar');
  const searchWrap=element('div','loox-discovery-search-wrap');
  search.placeholder=page==='trending.html'?'Search Trending':'Search Community';
  searchWrap.append(search);
  toolbar.append(searchWrap,filters,tools);
  root.insertBefore(toolbar,root.querySelector('.community-note'));
 }
}
if(page==='trending.html'){
 community.sort='trending';root.querySelector('.community-heading h1').textContent='Trending';root.querySelector('.community-heading p').textContent='Discover popular creations shared by LOOX artists.';root.querySelector('[aria-label="Sort community"]').value='trending';
}
// Replace browser-native select menus only on discovery pages. Reuse the
// original select's change event so all existing backend filters keep working.
if(discoveryPage){
 const selects=[...root.querySelectorAll('.community-filters select')];
 const menu=element('div','loox-discovery-select-menu');
 menu.hidden=true;menu.setAttribute('role','listbox');menu.id='loox-community-select-options';
 document.body.append(menu);
 let active=null;
 const close=()=>{
  menu.hidden=true;
  if(active)active.setAttribute('aria-expanded','false');
  active=null;
 };
 const place=button=>{
  const rect=button.getBoundingClientRect(),v=window.visualViewport;
  const left=v?.offsetLeft||0,top=v?.offsetTop||0;
  const viewportWidth=v?.width||innerWidth,viewportHeight=v?.height||innerHeight;
  const maxWidth=Math.max(100,Math.min(244,viewportWidth-20));
  menu.style.setProperty('max-width',maxWidth+'px','important');
  menu.style.minWidth=Math.min(Math.max(136,Math.ceil(rect.width)),maxWidth)+'px';
  menu.style.width='max-content';
  menu.style.setProperty('max-height',Math.max(100,Math.min(320,viewportHeight-24))+'px','important');
  menu.hidden=false;
  const bounds=menu.getBoundingClientRect();
  const below=top+viewportHeight-rect.bottom-12,above=rect.top-top-12;
  const openBelow=below>=Math.min(160,bounds.height)||below>=above;
  const height=Math.max(84,Math.min(bounds.height,openBelow?below:above));
  menu.style.setProperty('max-height',height+'px','important');
  menu.style.left=Math.max(left+10,Math.min(rect.left,left+viewportWidth-bounds.width-10))+'px';
  menu.style.top=Math.max(top+8,openBelow?rect.bottom+6:rect.top-height-6)+'px';
 };
 for(const select of selects){
  const wrap=element('span','loox-discovery-select-wrap');
  const button=element('button','loox-discovery-select-trigger');
  button.type='button';button.setAttribute('aria-haspopup','listbox');
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',menu.id);
  button.setAttribute('aria-label',select.getAttribute('aria-label')||'Select filter');
  const sync=()=>{button.textContent=select.selectedOptions[0]?.textContent||'Select';};
  sync();
  select.addEventListener('change',sync);
  select.parentNode.insertBefore(wrap,select);
  wrap.append(select,button);
  select.classList.add('loox-discovery-native-select');
  button.onclick=()=>{
   if(active===button){close();return;}
   close();active=button;button.setAttribute('aria-expanded','true');menu.replaceChildren();
   for(const option of select.options){
    const item=element('button','loox-discovery-select-option',option.textContent);
    item.type='button';item.setAttribute('role','option');item.disabled=option.disabled;
    item.setAttribute('aria-selected',String(option.value===select.value));
    item.onclick=()=>{
     if(option.disabled)return;
     select.value=option.value;
     select.dispatchEvent(new Event('change',{bubbles:true}));
     sync();close();button.focus();
    };
    menu.append(item);
   }
   place(button);
   const selected=menu.querySelector('[aria-selected="true"]');
   if(selected)menu.scrollTop=Math.max(0,selected.offsetTop-menu.offsetTop-38);
  };
 }
 document.addEventListener('pointerdown',ev=>{
  if(active&&!menu.contains(ev.target)&&ev.target!==active)close();
 });
 document.addEventListener('keydown',ev=>{
  if(!active)return;
  if(ev.key==='Escape'){ev.preventDefault();const target=active;close();target.focus({preventScroll:true});return;}
  if(ev.key==='Tab'&&menu.contains(document.activeElement)){close();return;}
  if(!['ArrowDown','ArrowUp','Home','End'].includes(ev.key))return;
  const choices=[...menu.querySelectorAll('button:not(:disabled)')];
  if(!choices.length)return;
  ev.preventDefault();
  const index=choices.indexOf(document.activeElement);
  if(ev.key==='Home')choices[0].focus();
  else if(ev.key==='End')choices[choices.length-1].focus();
  else choices[(index+(ev.key==='ArrowDown'?1:-1)+choices.length)%choices.length].focus();
 });
 // Unlike the former template bug, an internal scroll is NOT a page scroll.
 window.addEventListener('scroll',ev=>{
  if(active&&ev.target!==menu&&!menu.contains(ev.target))close();
 },true);
 window.addEventListener('resize',close);
 window.visualViewport?.addEventListener('resize',close);
}
if(page==='community.html'){
 // Keep the live sort/date selects and their backend listeners, but group both
 // controls inside the phone Filter dropdown rather than occupying two pills.
 const dates=root.querySelector('select[aria-label="Trending period"]');
 const dateWrap=dates?.closest('.loox-discovery-select-wrap');
 const sort=root.querySelector('select[aria-label="Sort community"]');
 const sortWrap=sort?.closest('.loox-discovery-select-wrap');
 if(dateWrap&&sortWrap){
  const filters=dateWrap.parentNode;
  const sortMarker=document.createComment('Original sort position');
  filters.insertBefore(sortMarker,sortWrap);
  const dateMarker=document.createComment('Original date position');
  filters.insertBefore(dateMarker,dateWrap);
  const details=element('details','loox-community-date-filter');
  const summary=element('summary','loox-community-filter-trigger','Filter');
  summary.setAttribute('aria-label','Open community sorting and filtering');
  const panel=element('div','loox-community-filter-panel');
  const sortRow=element('div','loox-community-filter-row');
  const dateRow=element('div','loox-community-filter-row');
  sortRow.append(element('span','loox-community-filter-label','Sort by'),sortWrap);
  dateRow.append(element('span','loox-community-filter-label','Time period'),dateWrap);
  panel.append(sortRow,dateRow);
  filters.insertBefore(details,dateWrap.nextSibling);
  details.append(summary,panel);
  // On larger screens retain the previous separate sorting pill.
  const query=window.matchMedia('(max-width:700px)');
  const arrange=()=>{
   if(query.matches){
    sortRow.append(sortWrap);dateRow.append(dateWrap);details.hidden=false;
   }else{
    filters.insertBefore(sortWrap,sortMarker);
    filters.insertBefore(dateWrap,dateMarker);
    details.open=false;details.hidden=true;
   }
  };
  arrange();
  query.addEventListener?.('change',arrange);
  sort.addEventListener('change',()=>{details.open=false;});
  dates.addEventListener('change',()=>{
   const sortLabel=sortWrap.querySelector('.loox-discovery-select-trigger');
   if(sortLabel)sortLabel.textContent=sort.selectedOptions[0]?.textContent||'Trending';
   details.open=false;
  });
  document.addEventListener('pointerdown',event=>{
   if(details.open&&!details.contains(event.target)&&!event.target.closest('.loox-discovery-select-menu'))details.open=false;
  });
 }
}
if(page==='community.html'){
 const overflow=document.querySelector('.loox-community-mobile-menu');
 if(overflow){
  document.addEventListener('pointerdown',event=>{
   if(overflow.open&&!overflow.contains(event.target))overflow.open=false;
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&overflow.open){
    overflow.open=false;
    overflow.querySelector('summary')?.focus({preventScroll:true});
   }
  });
  overflow.querySelectorAll('nav a').forEach(link=>link.addEventListener('click',()=>{overflow.open=false;}));
 }
}
await community.show();
if(new URLSearchParams(location.search).get('notifications')==='1'){
 const dest=new URL(location.href);dest.searchParams.delete('notifications');
 history.replaceState(history.state,'',dest.href);
 await window.__looxOpenCommunityNotifications();
}
if(page==='collections.html'&&!new URLSearchParams(location.search).get('id')){
 root.querySelector('h1').textContent='Collections';root.querySelector('.community-heading p').textContent='Keep your favorite ideas together. Collections start private.';community.grid.replaceChildren();community.more.hidden=true;
 if(!state.user){community.note('Sign in to manage your collections.');root.append(action('Sign in',()=>auth('login'),'community-primary'));}
 else try{const rows=(await cloudRequest(state,'collections',{query:{user_id:state.user.id}})).items||[];community.note(rows.length?'':'Create your first collection using the Collections button.');for(const c of rows){const link=element('a','community-collection-card');link.href='collections.html?id='+c.id;link.append(element('h2','',c.name),element('p','community-note',c.is_public?'Public collection':'Private collection'));community.grid.append(link);}}catch(error){community.note(error.message);}
}
