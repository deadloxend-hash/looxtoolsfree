// Shared navigation lives inside the existing sessions rail, preserving its controls/history.
export function mountWorkspaceNavigation(host){
 if(!host||host.querySelector('.loox-workspace-navigation'))return;
 const nav=document.createElement('nav');nav.className='loox-workspace-navigation';nav.setAttribute('aria-label','LOOX AI navigation');
 const rows=[['✧','AI Agent','ai-chat.html'],['▧','AI Image','ai-text-to-image.html#generate'],['▷','AI Video','ai-video-generator.html#generate'],['◈','Community','community.html'],['↗','Trending','trending.html']];
 const add=(parent,[icon,label,path])=>{const a=document.createElement('a');a.href=path;const i=document.createElement('span');i.textContent=icon;i.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=label;a.append(i,text);const target=new URL(path,location.href);if(target.pathname===location.pathname&&(!target.hash||location.hash!== '#templates'))a.setAttribute('aria-current','page');parent.append(a);};
 for(const row of rows)add(nav,row);
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='My workspace';details.append(summary);
 for(const row of [['♡','Saved creations','community.html?feed=saved'],['▤','Collections','collections.html'],['◎','Following','community.html?feed=following'],['◌','My profile','creator.html'],['⚙','Account & credits','account.html']])add(details,row);nav.append(details);
 const tools=document.createElement('details'),label=document.createElement('summary');label.textContent='Creative tools';tools.append(label);for(const row of [['◈','Photo editor','photo-editor.html'],['▷','Video editor','video-editor.html'],['▧','Background remover','bg-remove.html'],['↗','AI upscaler','ai-image-upscaler.html']])add(tools,row);nav.append(tools);host.prepend(nav);
}
