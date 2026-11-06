(() => {
 'use strict';
 const form=document.getElementById('loox-image-landing-form');
 const prompt=document.getElementById('loox-landing-prompt');
 const storageKey='loox-image-generator-draft-v2';
 if(!form||!prompt)return;
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const value=prompt.value.trim();
  if(!value){prompt.focus();return;}
  if(value.length>1200){prompt.setCustomValidity('Use 1,200 characters or fewer.');prompt.reportValidity();return;}
  prompt.setCustomValidity('');
  try{sessionStorage.setItem(storageKey,value);}catch{}
  // Open the existing real generator with the prompt prefilled; the user
  // chooses a model and confirms generation there (no hidden credit charge).
  location.assign('ai-text-to-image.html#generate');
 });
 prompt.addEventListener('input',()=>prompt.setCustomValidity(''));
 document.getElementById('loox-landing-add')?.addEventListener('click',()=>{
  const value=prompt.value.trim();
  try{if(value)sessionStorage.setItem(storageKey,value);}catch{}
  location.assign('ai-text-to-image.html#generate');
 });
 document.querySelectorAll('.loox-landing-ideas [data-prompt]').forEach(button=>{
  button.addEventListener('click',()=>{
   prompt.value=button.dataset.prompt||'';
   prompt.focus();
  });
 });
})();

/* Hero background: crossfade between five locally hosted images every six seconds. */
(() => {
 'use strict';
 const layers=[...document.querySelectorAll('.loox-landing-art .loox-landing-slide')];
 if(layers.length!==2)return;
 const sources=[
  'assets/ai-hero/purple-cosmic-dreamscape.jpg',
  'assets/ai-hero/neon-cosmic-creators-island.jpg',
  'assets/ai-hero/retro-neon-mustang-sunset.jpg',
  'assets/ai-hero/neon-graffiti-lion-and-street-artist.jpg',
  'assets/ai-hero/celestial-ruins-and-golden-cracks.jpg'
 ];
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 let currentIndex=0,activeLayer=0,busy=false;
 const preloads=new Map();
 function preload(src){
  if(!preloads.has(src)){
   preloads.set(src,new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
     if(typeof img.decode==='function')img.decode().then(()=>resolve(true),()=>resolve(true));
     else resolve(true);
    };
    img.onerror=()=>resolve(false);
    img.src=src;
   }));
  }
  return preloads.get(src);
 }
 void preload(sources[1]);
 async function changeSlide(){
  if(busy||document.hidden)return;
  busy=true;
  try{
   const nextIndex=(currentIndex+1)%sources.length;
   const src=sources[nextIndex];
   if(!(await preload(src))){currentIndex=nextIndex;return;}
   const incoming=layers[1-activeLayer],outgoing=layers[activeLayer];
   incoming.src=src;
   if(typeof incoming.decode==='function'){
    try{await incoming.decode();}catch{currentIndex=nextIndex;return;}
   }
   incoming.classList.add('is-current');
   outgoing.classList.remove('is-current');
   activeLayer=1-activeLayer;
   currentIndex=nextIndex;
   void preload(sources[(currentIndex+1)%sources.length]);
  }finally{busy=false;}
 }
 const timer=setInterval(changeSlide,6000);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
