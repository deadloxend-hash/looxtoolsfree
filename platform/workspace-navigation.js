/* One reusable LOOX navigation for AI sessions and all workspace pages. */
const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 face:'<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c1.6 1.3 4.4 1.3 6 0"/>',
 pen:'<path d="M12 20h9"/><path d="m16.5 3.5 4 4L10 18l-5 1 1-5L16.5 3.5Z"/><path d="m14 6 4 4"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5-5L5 21"/>',
 video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 10 5-5m4 5 5-5m-7 14 5-5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-4.5 4.7-4.5 13.3 0 18m0-18c4.5 4.7 4.5 13.3 0 18"/>',
 trending:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 sparkles:'<path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z"/><path d="m20 19 .5 1.5L22 21l-1.5.5L20 22.5l-.5-1.5L18 21l1.5-.5L20 19Z"/>',
 workflow:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M10 6.5h5a3 3 0 0 1 3 3V14M6.5 10v11"/>',
 bookmark:'<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5V22l-7-5-7 5V4.5Z"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 5a3 3 0 0 1 0 6m1 9v-2a5 5 0 0 0-3-4.6"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 6h2"/>',
 tools:'<path d="m14.7 6.3 3 3-8.8 8.8a2.1 2.1 0 0 1-3-3l8.8-8.8Z"/><path d="m16 4 4 4M4 4l4 4m10 10 2 2"/>',
 photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L4 21"/>',
 editvideo:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>',
 erase:'<path d="m20 13-7 7H8L3 15a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3v2ZM8 20h13"/>',
 upscale:'<path d="M9 3H3v6m0-6 7 7M15 21h6v-6m0 6-7-7M15 3h6v6m0-6-7 7M9 21H3v-6m0 6 7-7"/>',
 external:'<path d="M14 4h6v6m0-6-9 9"/><path d="M20 14v6H4V4h6"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 2 2 3-2 3 2 2 3 1 1 3h6l1-3 3-1 2-2-2-3 2-3-2-2-3-1-1-3Z"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2.5M12 17h.01"/>',
 feedback:'<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h7"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>'
};
export function workspaceIcon(kind){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[kind]||paths.tools)+'</svg>';}
export const navigationGroups=[
 {id:'main',label:'Main navigation',items:[['home','Home','ai-image-landing.html'],['pen','AI Assistant','ai-chat.html'],['image','AI Image','ai-text-to-image.html#generate'],['video','AI Video','ai-video-landing.html','Coming Soon']]},
 {id:'discover',label:'Discover',icon:'globe',items:[['globe','Community','community.html'],['trending','Trending','trending.html'],['sparkles','Templates','templates.html']]},
 {id:'tools',label:'Tools',icon:'tools',items:[['grid','Utilities','index.html'],['tools','Creative Tools','index.html#tools'],['photo','Photo Editor','photo-editor.html'],['editvideo','Video Editor','video-editor.html'],['erase','Background Remover','bg-remove.html'],['upscale','AI Upscaler','ai-image-upscaler.html'],['face','Face Swap','faceswap.html']]},
 {id:'workspace',label:'My Workspace',icon:'folder',items:[['image','My Creations','creator.html'],['bookmark','Collections','collections.html'],['trending','Recent Activity','account.html#usage'],['workflow','Workflows','workflows.html']]}
];
export const navigationFooter=[['settings','Settings','settings.html'],['help','Help and Support','help.html'],['feedback','Feedback','support.html']];
export function activeNavigation(href){
 const active=new URL(href),page=active.pathname.split('/').pop()||'index.html';
 const aliases={'ai-home.html':'ai-image-landing.html','ai-video-generator.html':'ai-video-landing.html'};
 const current=aliases[page]||page;
 const all=[...navigationGroups.flatMap(g=>g.items),...navigationFooter];
 return all.find(i=>{const [file,hash='']=i[2].split('#');return file===current&&hash&&'#'+hash===active.hash;})?.[1]||all.find(i=>i[2].split('#')[0]===current&&!i[2].includes('#'))?.[1]||all.find(i=>i[2].split('#')[0]===current)?.[1]||null;
}
export function mountWorkspaceNavigation(host){
 if(!host||host.querySelector('.loox-workspace-navigation'))return;
 const nav=document.createElement('nav');nav.className='loox-workspace-navigation';nav.setAttribute('aria-label','LOOX AI workspace navigation');
 const root=new URL('../',import.meta.url),groups=[];
 function add(parent,[kind,label,href,badge]){
  const a=document.createElement('a');a.href=new URL(href,root).href;a.className='loox-workspace-link';a.dataset.navigationLabel=label;a.setAttribute('aria-label',label+(badge?' — '+badge:''));
  const icon=document.createElement('span');icon.className='loox-workspace-icon';icon.innerHTML=workspaceIcon(kind);
  const text=document.createElement('span');text.className='loox-workspace-label';text.textContent=label;a.append(icon,text);
  if(badge){const b=document.createElement('small');b.className='loox-coming-label';b.textContent=badge;a.append(b);}
  parent.append(a);
 }
 for(const group of navigationGroups){
  const section=document.createElement(group.id==='main'?'div':'details');section.className=group.id==='main'?'loox-workspace-primary':'loox-workspace-group';section.dataset.navigationGroup=group.id;
  if(group.id!=='main'){
   const summary=document.createElement('summary');summary.setAttribute('aria-label',group.label);summary.innerHTML=workspaceIcon(group.icon);
   const label=document.createElement('span');label.className='loox-workspace-label';label.textContent=group.label;summary.append(label);section.append(summary);
   let saved;try{saved=localStorage.getItem('loox-sidebar-group:'+group.id);}catch{}
   section.open=saved===null||saved===undefined?group.id==='discover':saved==='open';
   section.addEventListener('toggle',()=>{try{localStorage.setItem('loox-sidebar-group:'+group.id,section.open?'open':'closed');}catch{}});
   summary.addEventListener('click',event=>{if(document.body.classList.contains('loox-sidebar-compact')){event.preventDefault();section.open=true;document.dispatchEvent(new Event('loox:expand-sidebar'));}});
   groups.push(section);
  }
  const list=document.createElement('div');list.className='loox-workspace-group-links';for(const item of group.items)add(list,item);section.append(list);nav.append(section);
 }
 const footer=document.createElement('div');footer.className='loox-workspace-footer';for(const item of navigationFooter)add(footer,item);nav.append(footer);
 const navigationLinks=[...nav.querySelectorAll('a')];
 function update(){const active=activeNavigation(location.href);for(const a of navigationLinks){if(a.dataset.navigationLabel===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}for(const g of groups)if(g.querySelector('[aria-current="page"]'))g.open=true;}
 host.prepend(nav);update();window.addEventListener('hashchange',update);window.addEventListener('popstate',update);
}
