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
function enter(event){event.preventDefault();try{sessionStorage.setItem(key,JSON.stringify({kind,prompt:prompt.value.trim(),model:model.value}));}catch{}location.assign(destination+'#generate');}
document.getElementById('creative-landing-form').addEventListener('submit',enter);document.getElementById('creative-cta').addEventListener('click',enter);
for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{prompt.value=b.dataset.example;prompt.focus();});
const motion=document.querySelector('video'),toggle=document.getElementById('creative-motion');
if(motion){if(matchMedia('(prefers-reduced-motion:reduce)').matches||navigator.connection?.saveData){motion.pause();toggle.textContent='Play motion';toggle.setAttribute('aria-label','Play background video');}toggle.addEventListener('click',()=>{if(motion.paused){motion.play().catch(()=>{});toggle.textContent='Pause motion';toggle.setAttribute('aria-label','Pause background video');}else{motion.pause();toggle.textContent='Play motion';toggle.setAttribute('aria-label','Play background video');}});}
try{await initialize();await config();if(!video){const models=[{id:'flux',name:'FLUX.1 Schnell',available:state.config?.local?.available},...(state.config?.models||[])];model.replaceChildren(...models.map(m=>{const o=new Option(m.name+(m.available?'':' · unavailable'),m.id);o.disabled=!m.available;return o;}));const available=models.find(m=>m.available);if(available)model.value=available.id;else{model.value='flux';status.textContent='Models are temporarily unavailable. You can still prepare your prompt.';}}}catch(error){status.textContent=error.message;}
