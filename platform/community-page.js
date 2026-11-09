import {state,auth,initialize} from './account.js?v=9';
import {Community,element,action,result,mediaURL} from './community.js?v=22';
const root=document.getElementById('community-root'),page=location.pathname.split('/').pop();
const discoveryPage=page==='community.html'||page==='trending.html';
if(discoveryPage)document.body.classList.add('loox-discovery-gallery');
if(page==='community.html')document.body.classList.add('loox-community-photo-wall');

/* Mobile Community: a full-width image feed. Existing cards and actions remain
   untouched on desktop, Trending, profiles and other pages. */
if(page==='community.html'){
 const originalCard=Community.prototype.card;
 const svg=(path)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
 const icons={
  comment:svg('<path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.4-4.1A8.5 8.5 0 1 1 20 11.5Z"/>'),
  share:svg('<path d="m21 3-9 18-3.6-7.4L1 10l20-7Zm0 0L8.4 13.6"/>'),
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
  const openComments=async()=>{
   await self.details(post);
   const dialog=document.querySelector('dialog.community-viewer[open]');
   const section=dialog?.querySelector('.loox-conversation');
   if(dialog&&section){
    requestAnimationFrame(()=>{
     if(!dialog.open)return;
     const top=section.getBoundingClientRect().top-dialog.getBoundingClientRect().top+dialog.scrollTop-16;
     dialog.scrollTop=Math.max(0,top);
    });
   }
  };
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
  const save=makeAction('Save post',()=>self.save(post,save),'loox-mobile-feed-action community-save-shortcut loox-mobile-feed-save');
  save.dataset.postId=post.id;
  save.setAttribute('aria-pressed',String(!!post.saved));
  save.innerHTML=icons.save;
  actions.append(like,comment,share,save);
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
  meta.append(commentsLink,element('span','',new Date(post.created_at).toLocaleDateString()));
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

const community=new Community({state,auth,initialize,root});
if(page==='community.html'){
 const originalColumns=community.discoveryColumns.bind(community);
 community.discoveryColumns=()=>matchMedia('(max-width:700px)').matches?1:originalColumns();
}
window.__looxOpenCommunityNotifications=()=>community.notifications().catch(error=>community.note(error.message));
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
 community.sort='trending';root.querySelector('h1').textContent='Trending';root.querySelector('.community-heading p').textContent='Stay ahead with the newest trending templates.';root.querySelector('[aria-label="Sort community"]').value='trending';
}
// Replace browser-native select menus only on discovery pages. Reuse the
// original select's change event so all existing backend filters keep working.
if(discoveryPage){
 const selects=[...root.querySelectorAll('.community-filters select')];
 const menu=element('div','loox-discovery-select-menu');
 menu.hidden=true;menu.setAttribute('role','listbox');
 document.body.append(menu);
 let active=null;
 const close=()=>{
  menu.hidden=true;
  if(active)active.setAttribute('aria-expanded','false');
  active=null;
 };
 const place=button=>{
  const rect=button.getBoundingClientRect();
  menu.style.width='max-content';
  menu.style.minWidth=Math.ceil(rect.width)+'px';
  menu.style.maxWidth=Math.min(218,window.innerWidth-20)+'px';
  menu.hidden=false;
  const bounds=menu.getBoundingClientRect();
  menu.style.left=Math.max(10,Math.min(rect.left,innerWidth-bounds.width-10))+'px';
  menu.style.top=(rect.bottom+6+bounds.height>innerHeight-8
   ? Math.max(8,rect.top-bounds.height-6):rect.bottom+6)+'px';
 };
 for(const select of selects){
  const wrap=element('span','loox-discovery-select-wrap');
  const button=element('button','loox-discovery-select-trigger');
  button.type='button';button.setAttribute('aria-haspopup','listbox');
  button.setAttribute('aria-expanded','false');
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
    item.type='button';item.setAttribute('role','option');
    item.setAttribute('aria-selected',String(option.value===select.value));
    item.onclick=()=>{
     select.value=option.value;
     select.dispatchEvent(new Event('change',{bubbles:true}));
     sync();close();button.focus();
    };
    menu.append(item);
   }
   place(button);
  };
 }
 document.addEventListener('pointerdown',ev=>{
  if(active&&!menu.contains(ev.target)&&ev.target!==active)close();
 });
 document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&active){close();return;}
  if(ev.key==='ArrowDown'&&active&&document.activeElement===active){
   ev.preventDefault();menu.querySelector('button')?.focus();
  }
 });
 // Unlike the former template bug, an internal scroll is NOT a page scroll.
 window.addEventListener('scroll',ev=>{
  if(active&&ev.target!==menu&&!menu.contains(ev.target))close();
 },true);
 window.addEventListener('resize',close);
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
 else try{const rows=result(await state.client.from('loox_collections').select('id,name,is_public').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(100));community.note(rows.length?'':'Create your first collection using the Collections button.');for(const c of rows){const link=element('a','community-collection-card');link.href='collections.html?id='+c.id;link.append(element('h2','',c.name),element('p','community-note',c.is_public?'Public collection':'Private collection'));community.grid.append(link);}}catch(error){community.note(error.message);}
}
