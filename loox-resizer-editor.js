(()=>{'use strict';
const $=id=>document.getElementById(id);
const input=$('work-file'),bar=$('resizerEditorTopbar'),newButton=$('resizerNewPhoto'),canvas=$('work-canvas'),controls=$('work-controls');
if(!input||!bar||!newButton||!canvas||!controls)return;
newButton.addEventListener('click',()=>input.click());
function layout(){
 const ready=!canvas.hidden&&canvas.width>1&&canvas.height>1;
 document.body.classList.toggle('resizer-loaded',ready);bar.hidden=!ready;
 if(!ready)controls.classList.remove('resizer-panel-open');
 const header=document.querySelector('.work-header');
 document.documentElement.style.setProperty('--resizer-header-height',Math.ceil(header?.getBoundingClientRect().height||0)+'px');
}
function drawer(target){
 if(controls.classList.contains('resizer-panel-open')){controls.classList.remove('resizer-panel-open');return}
 controls.classList.add('resizer-panel-open');
 if(target){const node=controls.querySelector(target);if(node)controls.scrollTop=Math.max(0,node.offsetTop-controls.offsetTop-12)}
}
$('resizerMobileSize').addEventListener('click',()=>drawer('#opt-width'));
$('resizerMobilePresets').addEventListener('click',()=>drawer('.resizer-preset-gallery'));
$('resizerMobileCrop').addEventListener('click',()=>{
 const start=$('resizer-crop-start'),apply=$('resizer-crop-apply');
 if(start&&!start.hidden){start.click();controls.classList.remove('resizer-panel-open')}
 else drawer('.resizer-crop-tools');
});
$('resizerMobileSave').addEventListener('click',()=>{controls.classList.remove('resizer-panel-open');$('work-export').click()});
const watcher=new MutationObserver(layout);
watcher.observe(canvas,{attributes:true,attributeFilter:['hidden','width','height']});
window.addEventListener('resize',layout);window.addEventListener('pageshow',layout);
document.addEventListener('keydown',e=>{if(e.key==='Escape')controls.classList.remove('resizer-panel-open')});
layout();
})();