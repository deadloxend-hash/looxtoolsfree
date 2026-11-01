(()=>{'use strict';
const $=id=>document.getElementById(id);
const input=$('work-file'),bar=$('resizerEditorTopbar'),newButton=$('resizerNewPhoto'),canvas=$('work-canvas'),controls=$('work-controls');
if(!input||!bar||!newButton||!canvas||!controls)return;
newButton.addEventListener('click',()=>input.click());
const topActions=$('resizerTopActions'),exportButton=$('work-export'),cancelButton=$('work-cancel');
if(topActions&&exportButton&&cancelButton){
 topActions.append(exportButton,cancelButton);
}

function layout(){
 const ready=!canvas.hidden&&canvas.width>1&&canvas.height>1;
 document.body.classList.toggle('resizer-loaded',ready);bar.hidden=!ready;
 if(!ready)controls.classList.remove('resizer-panel-open');
 const header=document.querySelector('.work-header');
 document.documentElement.style.setProperty('--resizer-header-height',Math.ceil(header?.getBoundingClientRect().height||0)+'px');
}
// Each mobile tool opens only its own settings, leaving the image visible.
const mobileBar=$('resizerMobileBar');
const panelTitle=document.createElement('div');panelTitle.className='resizer-panel-title';panelTitle.innerHTML='<strong id="resizerPanelName">Resize</strong><button type="button" id="resizerPanelClose" aria-label="Close settings">✕</button>';
controls.prepend(panelTitle);
const sections={
 size:['opt-width','opt-height','opt-percent','opt-lock','opt-fit','opt-zoom'],
 presets:['opt-preset'],
 crop:['resizer-crop-start','resizer-crop-apply','resizer-crop-cancel'],
 export:['opt-format','opt-quality','opt-color']
};
let activePanel='';
function showPanel(name){
 if(activePanel===name&&controls.classList.contains('resizer-panel-open')){closePanel();return}
 activePanel=name;
 const names={size:'Resize image',presets:'Choose size preset',crop:'Crop image',export:'Export settings'};
 $('resizerPanelName').textContent=names[name]||'Settings';
 [...controls.children].forEach(child=>{
  if(child===panelTitle)return;
  const ids=sections[name]||[];
  const visible=ids.some(id=>child.id===id||child.querySelector('#'+id));
  child.classList.toggle('resizer-section-hidden',!visible);
 });
 controls.classList.add('resizer-panel-open');
 controls.scrollTop=0;
 mobileBar?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
}
function closePanel(){controls.classList.remove('resizer-panel-open');activePanel='';mobileBar?.querySelectorAll('button').forEach(b=>b.classList.remove('active'))}
$('resizerPanelClose').addEventListener('click',closePanel);
[['resizerMobileSize','size'],['resizerMobilePresets','presets'],['resizerMobileCrop','crop']].forEach(([id,name])=>{const b=$(id);b.dataset.panel=name;b.addEventListener('click',()=>showPanel(name))});
$('resizerMobileSave').addEventListener('click',()=>{closePanel();$('work-export').click()});
document.addEventListener('pointerdown',e=>{if(controls.classList.contains('resizer-panel-open')&&!controls.contains(e.target)&&!mobileBar?.contains(e.target))closePanel()});
const watcher=new MutationObserver(layout);
watcher.observe(canvas,{attributes:true,attributeFilter:['hidden','width','height']});
window.addEventListener('resize',layout);window.addEventListener('pageshow',layout);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()});
layout();
})();