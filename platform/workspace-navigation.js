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
 chevron:'<path d="m9 18 6-6-6-6"/>'
};
export function workspaceIcon(kind){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[kind]||paths.tools)+'</svg>';}
export function mountWorkspaceNavigation(host){
 if(!host||host.querySelector('.loox-workspace-navigation'))return;
 const nav=document.createElement('nav');nav.className='loox-workspace-navigation';nav.setAttribute('aria-label','LOOX AI workspace navigation');
 const active=new URL(location.href);
 function add(parent,kind,label,href,external=false){
  const link=document.createElement('a');link.href=href;link.className='loox-workspace-link';
  if(external){link.target='_blank';link.rel='noopener noreferrer';}
  const ico=document.createElement('span');ico.className='loox-workspace-icon';ico.innerHTML=workspaceIcon(kind);
  const text=document.createElement('span');text.className='loox-workspace-label';text.textContent=label;link.append(ico,text);
  if(external){const outgoing=document.createElement('span');outgoing.className='loox-workspace-external';outgoing.innerHTML=workspaceIcon('external');link.append(outgoing);}
  const target=new URL(href,location.href);
  if(target.pathname===active.pathname&&target.search===active.search&&(!target.hash||target.hash===active.hash))link.setAttribute('aria-current','page');
  parent.append(link);return link;
 }
 const primary=[
  ['home','Home','ai-image-landing.html'],
  ['pen','AI Agent','ai-chat.html'],
  ['image','AI Image','ai-text-to-image.html#generate'],
  ['video','AI Video','ai-video-generator.html#generate'],
  ['globe','Community','community.html'],
  ['trending','Trending','trending.html'],
  ['sparkles','Templates','templates.html'],
  ['grid','Utilities','index.html']
 ];
 for(const [icon,label,href] of primary)add(nav,icon,label,href);
 const workspace=document.createElement('details');workspace.className='loox-workspace-group';
 const workspaceTitle=document.createElement('summary');workspaceTitle.innerHTML=workspaceIcon('folder')+'<span>My workspace</span>';workspace.append(workspaceTitle);
 for(const [icon,label,href] of [
  ['workflow','Workflow starters','workflows.html'],
  ['bookmark','Saved creations','community.html?feed=saved'],
  ['folder','Collections','collections.html'],
  ['users','Following','community.html?feed=following'],
  ['user','Profile','creator.html'],
  ['wallet','Account & credits','account.html']
 ])add(workspace,icon,label,href);
 nav.append(workspace);
 const toolHeader=add(nav,'tools','Creative tools','index.html#tools',true);toolHeader.classList.add('loox-creative-tools-title');
 const creative=document.createElement('div');creative.className='loox-creative-links';
 for(const [icon,label,href] of [
  ['photo','Photo editor','photo-editor.html'],
  ['editvideo','Video editor','video-editor.html'],
  ['erase','Background remover','bg-remove.html'],
  ['upscale','AI upscaler','ai-image-upscaler.html'],
  ['face','Face swap','faceswap.html']
 ])add(creative,icon,label,href,true);
 nav.append(creative);
 host.prepend(nav);
}
