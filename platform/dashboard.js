import {aiTools} from './catalog.js';
import {el,button,config,state,pricing,auth} from './account.js';
const host=document.querySelector('[data-ai-dashboard]');
if(host){
 const full=host.dataset.aiDashboard==='full';
 host.className='lx lx-ai-dashboard';
 const top=el('div',null,'lx-row'),copy=el('div');
 copy.append(el('p','CREATE WITH LOOX','lx-eyebrow'),el(full?'h1':'h2','AI tools for your next idea'),el('p','Edit, enhance and generate images in one workspace.'));
 const credits=button('Sign in for AI credits',()=>state.user?pricing():auth(),'lx-button lx-primary');
 function balance(){credits.textContent=state.user?(state.account?.wallet.balance??'…')+' credits · Upgrade':'Sign in for AI credits';}
 document.addEventListener('loox-account',balance);document.addEventListener('loox-user',balance);balance();top.append(copy,credits);
 host.append(top);
 const note=el('p','Checking cloud AI availability…','lx-note');note.setAttribute('role','status');host.append(note);
 let cfg=null;
 config().then(c=>{cfg=c;note.textContent=c.ai?'Cloud jobs require an account and AI credits.':'Cloud AI activation is pending. Browse workspaces and settings below. Automatic face blur runs on your device.';draw();}).catch(()=>{note.textContent='Cloud service is unavailable. Local tools are available.';draw();});
 const search=el('input');search.type='search';search.placeholder='Search AI tools';search.setAttribute('aria-label','Search AI tools');search.className='lx-ai-search';host.append(search);
 const tabs=el('nav',null,'lx-tabs');tabs.setAttribute('aria-label','AI tool categories');host.append(tabs);
 let category='All';const buttons=[];
 for(const name of ['All','Editing','Enhancement','Generation','Restoration','Privacy','Utilities']){
  const b=button(name,()=>{category=name;draw();});buttons.push([name,b]);tabs.append(b);
 }
 const grid=el('div',null,'lx-ai-grid');host.append(grid);
 const count=el('p',null,'lx-note');count.setAttribute('role','status');host.append(count);
 function draw(){
  grid.replaceChildren();for(const [name,b] of buttons)b.setAttribute('aria-pressed',String(category===name));
  const selected=aiTools.filter(t=>(category==='All'||category===t.category)&&(t.name+' '+t.description).toLowerCase().includes(search.value.trim().toLowerCase()));
  for(const t of selected){
   const a=el('a',null,'lx-ai-card');a.href=t.slug+'.html';
   const status=t.operation==='local'?'On-device AI':t.operation?(cfg?.ai?'Uses AI credits':'Cloud setup pending'):'Integration pending';
   a.append(el('span',t.icon,'lx-ai-icon'),el('small',t.category),el('h3',t.name),el('p',t.description),el('small',status,'lx-status'),el('strong','Open workspace ↗'));
   grid.append(a);
  }count.textContent=selected.length+' tools';if(!selected.length)grid.append(el('p','No tools match your search.'));
 }
 search.oninput=draw;draw();
 if(!full){const link=el('a','Explore all AI tools ↗','lx-button');link.href='all-ai-tools.html';host.append(link);}
}
