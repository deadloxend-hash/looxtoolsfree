import {state,auth,initialize} from './account.js?v=9';
import {Community,element,action,result} from './community.js?v=8';
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
await community.show();
if(page==='collections.html'&&!new URLSearchParams(location.search).get('id')){
 root.querySelector('h1').textContent='Collections';root.querySelector('.community-heading p').textContent='Keep your favorite ideas together. Collections start private.';community.grid.replaceChildren();community.more.hidden=true;
 if(!state.user){community.note('Sign in to manage your collections.');root.append(action('Sign in',()=>auth('login'),'community-primary'));}
 else try{const rows=result(await state.client.from('loox_collections').select('id,name,is_public').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(100));community.note(rows.length?'':'Create your first collection using the Collections button.');for(const c of rows){const link=element('a','community-collection-card');link.href='collections.html?id='+c.id;link.append(element('h2','',c.name),element('p','community-note',c.is_public?'Public collection':'Private collection'));community.grid.append(link);}}catch(error){community.note(error.message);}
}
