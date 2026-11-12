import {state,config,initialize} from './account.js?v=9';
const kind=document.body.dataset.creativeMode,video=kind==='video';
const prompt=document.getElementById('creative-prompt'),model=document.getElementById('creative-model'),status=document.getElementById('creative-landing-status');
const key='loox-creative-launch-v1',destination=video?'ai-video-generator.html':'ai-text-to-image.html';
// Landing pages always start with a blank, real input. Previous homepage drafts
// and generator launch data must never be restored into the landing composer.
// The animated examples are placeholders, not user-submitted text.
prompt.value='';
const landingForm=document.getElementById('creative-landing-form');
landingForm.setAttribute('autocomplete','off');
prompt.setAttribute('autocomplete','off');
// Browsers can restore form values when returning via Back/Forward cache.
window.addEventListener('pageshow',()=>{
  prompt.value='';
  if(document.activeElement===prompt)prompt.blur();
});
function enter(event){event.preventDefault();const launch={kind,prompt:prompt.value.trim(),model:model.value};if(!video){const ratio=document.querySelector('input[name="creative-ratio"]:checked');if(ratio)launch.settings={aspect_ratio:ratio.value};}try{sessionStorage.setItem(key,JSON.stringify(launch));}catch{}location.assign(destination+'#generate');}
document.getElementById('creative-landing-form').addEventListener('submit',enter);
for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{prompt.value=b.dataset.example;prompt.focus();});
const motion=document.querySelector('video'),toggle=document.getElementById('creative-motion');
if(motion&&toggle){
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const managed=Boolean(motion.dataset.videoSrc);
 let wanted=!reduced.matches&&!navigator.connection?.saveData,visible=true;
 const update=()=>{const playing=!motion.paused&&!motion.ended;toggle.textContent=playing?'Pause motion':'Play motion';toggle.setAttribute('aria-label',playing?'Pause background video':'Play background video');if(playing)motion.classList.add('is-playing');};
 async function play(){if(managed&&!motion.getAttribute('src')){motion.src=motion.dataset.videoSrc;motion.load();}try{await motion.play();}catch{}update();}
 motion.addEventListener('playing',update);motion.addEventListener('pause',update);motion.addEventListener('error',()=>{motion.classList.remove('is-playing');toggle.textContent='Video unavailable';toggle.disabled=true;});
 if(managed){if(wanted)play();}else if(!wanted)motion.pause();
 update();
 toggle.addEventListener('click',()=>{wanted=motion.paused;if(wanted)play();else motion.pause();});
 reduced.addEventListener('change',()=>{if(reduced.matches){wanted=false;motion.pause();}});
 if(managed&&'IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)motion.pause();else if(wanted&&!document.hidden)play();},{threshold:0}).observe(motion.parentElement);
 if(managed)document.addEventListener('visibilitychange',()=>{if(document.hidden)motion.pause();else if(wanted&&visible)play();});
}

try{await initialize();await config();if(!video){const models=[{id:'flux',name:'FLUX.1 Schnell',available:state.config?.local?.available},...(state.config?.models||[])];model.replaceChildren(...models.map(m=>{const o=new Option(m.name+(m.available?'':' · unavailable'),m.id);o.disabled=!m.available;return o;}));const available=models.find(m=>m.available);if(available)model.value=available.id;else{model.value='flux';status.textContent='Models are temporarily unavailable. You can still prepare your prompt.';}}}catch(error){status.textContent=error.message;}
