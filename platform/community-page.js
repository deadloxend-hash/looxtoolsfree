import {state,auth,initialize} from './account.js?v=9';
import {Community,element,action,result} from './community.js?v=9';
const root=document.getElementById('community-root'),page=location.pathname.split('/').pop();
const discoveryPage=page==='community.html'||page==='trending.html';
if(discoveryPage)document.body.classList.add('loox-discovery-gallery');
const community=new Community({state,auth,initialize,root});
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
if(page==='collections.html'&&!new URLSearchParams(location.search).get('id')){
 root.querySelector('h1').textContent='Collections';root.querySelector('.community-heading p').textContent='Keep your favorite ideas together. Collections start private.';community.grid.replaceChildren();community.more.hidden=true;
 if(!state.user){community.note('Sign in to manage your collections.');root.append(action('Sign in',()=>auth('login'),'community-primary'));}
 else try{const rows=result(await state.client.from('loox_collections').select('id,name,is_public').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(100));community.note(rows.length?'':'Create your first collection using the Collections button.');for(const c of rows){const link=element('a','community-collection-card');link.href='collections.html?id='+c.id;link.append(element('h2','',c.name),element('p','community-note',c.is_public?'Public collection':'Private collection'));community.grid.append(link);}}catch(error){community.note(error.message);}
}
