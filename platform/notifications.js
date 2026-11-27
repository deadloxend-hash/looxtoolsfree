import {state,auth} from './account.js?v=settings-2-20261124';
import {cloudRequest,cloudImage,PROFILE_API} from './profile-cloudflare.js?v=settings-2-20261124';
import {category,relativeTime,timeGroup,target,message,mergeNotifications} from './notifications-core.mjs';
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./notifications.css?v=20261126',import.meta.url);document.head.append(style);
const headerAlignment=document.createElement('style');headerAlignment.textContent=`@media(max-width:790px){#loox-sitewide-header .loox-notification-bell{order:5!important;margin:0!important;width:39px;height:39px}body.loox-creative-landing #loox-sitewide-header .loox-notification-bell{order:8!important}}@media(max-width:420px){#loox-sitewide-header .loox-notification-bell{width:35px;height:35px}}`;document.head.append(headerAlignment);
const svg=(paths)=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
const icons={bell:svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>'),close:svg('<path d="m6 6 12 12M6 18 18 6"/>'),user:svg('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'),like:svg('<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 3 10 8 15 5-5 13-10 8-15Z"/>'),comment:svg('<path d="M21 11a9 9 0 1 0-5 8l5 2-2-5a9 9 0 0 0 2-5Z"/>'),system:svg('<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z"/>')};
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
let activePanel;
function countUpdate(count){if(!Number.isFinite(count))return;document.querySelectorAll('.loox-notification-bell').forEach(b=>{const badge=b.querySelector('.ln-count');badge.textContent=count>99?'99+':String(count);badge.hidden=!count;b.setAttribute('aria-label',count?`Notifications, ${count} unread`:'Notifications');});}
export function createNotificationPanel({userState=state,request=(p,o)=>cloudRequest(userState,p,o),avatar=id=>cloudImage(userState,id,'avatar'),navigate=href=>location.assign(href),now=()=>Date.now()}={}){
 const trigger=document.activeElement,d=el('dialog','ln-panel');d.setAttribute('aria-label','Notifications');
 const head=el('header','ln-head'),title=el('h2','','Notifications'),mark=el('button','ln-mark','Mark all read'),close=el('button','ln-close');close.innerHTML=icons.close;close.setAttribute('aria-label','Close notifications');head.append(title,mark,close);
 const filters=el('nav','ln-filters');filters.setAttribute('aria-label','Notification filters');const list=el('div','ln-list');list.setAttribute('aria-label','Notification activity');const status=el('p','ln-status');status.setAttribute('role','status');const more=el('button','ln-more','Load older notifications');more.hidden=true;const retry=el('button','ln-more','Try again');retry.hidden=true;d.append(head,filters,list,status,retry,more);document.body.append(d);
 let rows=[],offset=0,busy=false,filter='All',canDelete=false,closed=false,unreadCount=0;const identity=userState.user?.id;
 const valid=()=>!closed&&userState.user?.id===identity;
 const bodyOverflow=document.body.style.overflow,htmlOverflow=document.documentElement.style.overflow;
 document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
 function finish(){if(closed)return;closed=true;document.body.style.overflow=bodyOverflow;document.documentElement.style.overflow=htmlOverflow;d.remove();trigger?.focus?.({preventScroll:true});if(activePanel===d)activePanel=null;}
 close.onclick=()=>d.close();d.addEventListener('close',finish,{once:true});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 document.addEventListener('loox-user',function changed(){if(userState.user?.id!==identity){d.close();document.removeEventListener('loox-user',changed);}},{signal:(()=>{const c=new AbortController();d.addEventListener('close',()=>c.abort(),{once:true});return c.signal;})()});
 const fail=error=>{if(valid()){status.textContent=error.message||'Notifications could not be loaded.';retry.hidden=false;}};
 async function mutate(options){const result=await request('notifications',options);if(!valid())throw Error('Your account changed. Open notifications again.');unreadCount=result.unread_count;countUpdate(unreadCount);return result;}
 async function open(n,href){try{if(!n.is_read){await mutate({method:'PATCH',data:{id:n.id}});n.is_read=1;render();}d.close();finish();navigate(href);}catch(error){fail(error);}}
 function render(){
  filters.replaceChildren();const categories=['All',...['Likes','Comments','Followers','System'].filter(c=>rows.some(n=>category(n)===c))];if(!categories.includes(filter))filter='All';
  categories.forEach(c=>{const b=el('button','',c);b.setAttribute('aria-pressed',String(filter===c));b.onclick=()=>{filter=c;render();};filters.append(b);});
  list.replaceChildren();let group='';const visible=rows.filter(n=>filter==='All'||category(n)===filter);
  for(const n of visible){const g=timeGroup(n.created_at,now());if(g!==group){list.append(el('h3','ln-group',g));group=g;}
   const row=el('article','ln-row'+(!n.is_read?' is-unread':'')),link=el('a','ln-link');link.href=target(n);link.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();open(n,link.getAttribute('href'));};
   const av=el('span','ln-avatar'),system=category(n)==='System';
   if(system){av.classList.add('ln-brand');const logo=el('img');logo.src=new URL('../assets/loox-wordmark.svg',import.meta.url);logo.alt='LOOX';av.append(logo);}else{av.innerHTML=icons.user;if(n.avatar_path&&n.actor_id)avatar(n.actor_id).then(url=>{if(!av.isConnected)return;const img=el('img');img.alt='';img.src=url;img.onerror=()=>img.remove();av.prepend(img);}).catch(()=>{});}
   const activity=el('span','ln-activity');activity.innerHTML=icons[system?'system':n.kind==='like'?'like':n.kind==='follow'?'user':'comment'];av.append(activity);
   const copy=el('span','ln-copy'),text=el('span','ln-message',message(n));copy.append(text);if(n.comment_body||n.post_caption)copy.append(el('span','ln-excerpt',n.comment_body||n.post_caption));const time=el('time','ln-time',relativeTime(n.created_at,now()));time.dateTime=n.created_at;time.title=new Date(n.created_at).toLocaleString();copy.append(time);link.append(av,copy);
   if(n.post_media_path&&n.post_media_type!=='video'){const img=el('img','ln-thumb');img.src=PROFILE_API+'/media?type=post&variant=preview&id='+encodeURIComponent(n.post_id);img.alt='Post preview';img.loading='lazy';img.width=44;img.height=44;img.onerror=()=>img.remove();link.append(img);}if(!n.is_read){const dot=el('span','ln-dot');dot.setAttribute('aria-label','Unread');link.append(dot);}row.append(link);
   if(canDelete){const del=el('button','ln-delete');del.innerHTML=icons.close;del.setAttribute('aria-label','Delete notification');del.onclick=async()=>{del.disabled=true;try{await mutate({method:'DELETE',data:{id:n.id}});rows=rows.filter(x=>x.id!==n.id);offset=Math.max(0,offset-1);render();}catch(error){del.disabled=false;fail(error);}};row.append(del);}list.append(row);
  }
  mark.disabled=!(unreadCount>0||rows.some(n=>!n.is_read));status.textContent=visible.length?'':filter==='All'?'You’re all caught up. Likes, comments and new followers will appear here.':'No '+filter.toLowerCase()+' in these notifications.';
 }
 async function load(){if(busy||!valid())return;busy=true;more.disabled=true;retry.hidden=true;list.setAttribute('aria-busy','true');if(!rows.length){list.replaceChildren();for(let i=0;i<4;i++)list.append(el('div','ln-skeleton'));status.textContent='Loading notifications…';}
  try{const data=await request('notifications',{query:{offset}});if(!valid())return;rows=mergeNotifications(rows,data.items||[]);offset+=(data.items||[]).length;canDelete=data.can_delete===true;unreadCount=data.unread_count;countUpdate(unreadCount);more.hidden=!data.has_more;render();}catch(error){if(!rows.length)list.replaceChildren();fail(error);}finally{busy=false;more.disabled=false;list.removeAttribute('aria-busy');}}
 mark.onclick=async()=>{mark.disabled=true;try{await mutate({method:'PATCH',data:{all:true}});rows.forEach(n=>n.is_read=1);render();}catch(error){mark.disabled=false;fail(error);}};
 more.onclick=load;retry.onclick=load;d.showModal();load();return d;
}
export function openNotifications(){if(!state.user){auth('login');return;}if(activePanel?.isConnected){activePanel.focus();return;}activePanel=createNotificationPanel();}
export function mountNotifications(){
 const host=document.querySelector('.loox-sitewide-inner');if(!host||host.querySelector('.loox-notification-bell'))return;
 function bell(){const b=el('button','loox-notification-bell');b.type='button';b.innerHTML=icons.bell;b.setAttribute('aria-label','Notifications');b.setAttribute('aria-haspopup','dialog');const count=el('span','ln-count');count.hidden=true;b.append(count);b.onclick=openNotifications;return b;}
 host.insertBefore(bell(),host.querySelector('.loox-sitewide-account'));
 const native=document.querySelector('body>header.lig-header,body>header.lx-header');if(native){const b=bell();b.classList.add('ln-native-bell');let anchor=native.querySelector('.loox-mobile-app-native-trigger,.lig-header-user,[data-loox-account]');while(anchor&&anchor.parentElement!==native)anchor=anchor.parentElement;native.insertBefore(b,anchor||null);}
 document.body.classList.add('loox-notifications-ready');let pending=false;
 async function refresh(){if(pending||document.hidden)return;if(!state.user){countUpdate(0);return;}pending=true;const id=state.user.id;try{const data=await cloudRequest(state,'notifications',{query:{summary:1}});if(state.user?.id===id)countUpdate(data.unread_count);}catch{}finally{pending=false;if(state.user?.id!==id)refresh();}}
 document.addEventListener('loox-user',()=>{countUpdate(0);refresh();});document.addEventListener('visibilitychange',refresh);refresh();setInterval(refresh,60000);
}
