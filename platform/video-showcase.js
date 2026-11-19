(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),items=[];
 const saveData=Boolean(navigator.connection?.saveData);
 for(const video of document.querySelectorAll('video[data-showcase-video]')){
  const control=video.parentElement.querySelector('[data-playback]');
  const item={video,control,visible:false,wanted:!reduced.matches&&!saveData};items.push(item);
  video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
  async function play(){if(!item.visible||document.hidden)return;if(!video.src){video.src=video.dataset.showcaseVideo;video.load();}try{await video.play();}catch{control.textContent='Play video';}}
  item.play=play;
  control.onclick=()=>{item.wanted=video.paused;if(item.wanted)play();else video.pause();};
  function update(){control.textContent=video.paused?'Play video':'Pause video';control.setAttribute('aria-label',(video.paused?'Play ':'Pause ')+video.getAttribute('aria-label'));control.setAttribute('aria-pressed',String(!video.paused));}
  video.addEventListener('play',update);video.addEventListener('pause',update);
  video.addEventListener('error',()=>{control.textContent='Video unavailable';control.disabled=true;});
  item.update=update;update();
 }
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){const item=items.find(x=>x.video===entry.target);item.visible=entry.isIntersecting;if(item.visible&&item.wanted)item.play();else item.video.pause();}},{threshold:.15});items.forEach(item=>observer.observe(item.video));}
 else for(const item of items){item.visible=true;item.wanted=false;}
 document.addEventListener('visibilitychange',()=>{for(const item of items)if(document.hidden)item.video.pause();else if(item.visible&&item.wanted)item.play();});
 reduced.addEventListener('change',()=>{if(reduced.matches)for(const item of items){item.wanted=false;item.video.pause();}});
})();
