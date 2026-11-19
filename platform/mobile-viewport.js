/* Use the visible viewport for composers and dialogs when a software keyboard opens. */
(()=>{
 const vv=window.visualViewport;if(!vv)return;
 let frame=0,lastHeight=vv.height;
 function update(){
  cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const field=document.activeElement,editing=field?.matches('textarea,input:not([type=button]):not([type=checkbox]):not([type=radio])');
   const inset=editing?Math.max(0,innerHeight-vv.height-vv.offsetTop):0;
   document.documentElement.style.setProperty('--loox-visible-height',vv.height+'px');
   document.documentElement.style.setProperty('--loox-keyboard-inset',inset>80?inset+'px':'0px');
   document.body.classList.toggle('loox-keyboard-open',Boolean(editing&&inset>80));
   // Only correct actual occlusion on keyboard resize, preserving normal scrolling.
   if(editing&&vv.height<lastHeight-60){const r=field.getBoundingClientRect(),bottom=vv.offsetTop+vv.height-16;
    if(r.bottom>bottom)window.scrollBy({top:Math.min(r.bottom-bottom,Math.max(0,r.top-vv.offsetTop-16)),behavior:'instant'});
   }
   lastHeight=vv.height;
  });
 }
 vv.addEventListener('resize',update);vv.addEventListener('scroll',update);
 document.addEventListener('focusin',update);document.addEventListener('focusout',update);update();
})();
