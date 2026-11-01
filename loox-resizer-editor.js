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
const cropActions=document.createElement('div');
cropActions.id='resizerCropTopActions';
cropActions.innerHTML='<button type="button" id="resizerCropTopCancel" aria-label="Cancel crop">✕</button><span>Crop</span><button type="button" id="resizerCropUndo" aria-label="Undo crop">↶</button><button type="button" id="resizerCropRedo" aria-label="Redo crop">↷</button><button type="button" id="resizerCropTopApply" aria-label="Apply crop">✓</button>';
bar.append(cropActions);
function cropActive(){const button=$('resizer-crop-apply');return !!button&&!button.hidden}
function refreshCropUI(){const active=cropActive();document.body.classList.toggle('resizer-cropping',active);cropActions.hidden=!active;topActions?.classList.toggle('resizer-crop-hide',active)}
$('resizerCropTopCancel').onclick=()=>{$('resizer-crop-cancel')?.click();refreshCropUI()};
$('resizerCropTopApply').onclick=()=>{$('resizer-crop-apply')?.click();refreshCropUI()};
const undo=$('resizerCropUndo'),redo=$('resizerCropRedo');
undo.onclick=()=>window.looxResizerUndo?.();
redo.onclick=()=>window.looxResizerRedo?.();
function updateHistory(){const h=window.looxResizerHistory?.()||{undo:0,redo:0};undo.disabled=!h.undo;redo.disabled=!h.redo}
window.addEventListener('loox-resizer-history',updateHistory);
updateHistory();
new MutationObserver(refreshCropUI).observe($('resizer-crop-apply'),{attributes:true,attributeFilter:['hidden']});

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
 if(name==='crop'){closePanel();if(!cropActive())$('resizer-crop-start')?.click();refreshCropUI();return}
 controls.classList.add('resizer-panel-open');
 controls.scrollTop=0;
 mobileBar?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
}
function closePanel(){controls.classList.remove('resizer-panel-open');activePanel='';mobileBar?.querySelectorAll('button').forEach(b=>b.classList.remove('active'))}
$('resizerPanelClose').addEventListener('click',closePanel);
[['resizerMobileSize','size'],['resizerMobilePresets','presets'],['resizerMobileCrop','crop']].forEach(([id,name])=>{const b=$(id);b.dataset.panel=name;b.addEventListener('click',()=>showPanel(name))});
$('resizerMobileSave').addEventListener('click',()=>{
 closePanel();
 if(cropActive()){$('resizerCropTopApply').click();return}
 const previous=new Set([...document.querySelectorAll('#work-results a[href]')].map(a=>a.href));
 const observer=new MutationObserver(()=>{
  const link=[...document.querySelectorAll('#work-results a[href]')].find(a=>!previous.has(a.href)&&a.href.startsWith('blob:'));
  if(link){observer.disconnect();link.click()}
 });
 observer.observe($('work-results'),{childList:true,subtree:true});
 setTimeout(()=>observer.disconnect(),12000);
 $('work-export').click();
});
document.addEventListener('pointerdown',e=>{if(controls.classList.contains('resizer-panel-open')&&!controls.contains(e.target)&&!mobileBar?.contains(e.target))closePanel()});
const watcher=new MutationObserver(layout);
watcher.observe(canvas,{attributes:true,attributeFilter:['hidden','width','height']});
window.addEventListener('resize',layout);window.addEventListener('pageshow',layout);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()});
layout();refreshCropUI();
})();