const presets=['4:3','3:4','2:3','3:2','21:9','9:16'];
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function mountAspectControls(host,{kind='image',supported=()=>['1:1','16:9','9:16','4:3','3:4'],onChoose=()=>{},initial=null}={}){
 const panel=document.createElement('div');panel.className='loox-aspect-panel';
 const fields=document.createElement('div');fields.className='loox-aspect-fields';
 const inputs={};for(const name of ['width','height']){const label=document.createElement('label');label.textContent=name==='width'?'Width':'Height';const input=document.createElement('input');input.type='number';input.inputMode='numeric';input.min='64';input.max='4096';input.step='1';input.value='1024';input.setAttribute('aria-label','Custom '+name+' in pixels');label.append(input);fields.append(label);inputs[name]=input;}
 const preview=document.createElement('div');preview.className='loox-aspect-preview';preview.setAttribute('aria-hidden','true');
 const description=document.createElement('p');description.className='loox-aspect-note';description.setAttribute('role','status');
 const choices=document.createElement('div');choices.className='loox-aspect-presets';
 const alternatives=document.createElement('div');alternatives.className='loox-aspect-presets';
 let accepted=null;
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
 function dimensions(){return {width:Number(inputs.width.value),height:Number(inputs.height.value)};}
 function remember(){try{sessionStorage.setItem('loox-custom-ratio:'+kind,JSON.stringify({...dimensions(),accepted}));}catch{}}
 function update(){
  const {width,height}=dimensions(),valid=[width,height].every(n=>Number.isInteger(n)&&n>=64&&n<=4096);
  alternatives.replaceChildren();
  if(!valid){accepted=null;description.textContent='Enter whole dimensions from 64 to 4096 pixels.';return;}
  preview.style.aspectRatio=width+' / '+height;preview.style.width=(width>=height?110:Math.max(24,110*width/height))+'px';
  if(accepted&&!supported().includes(accepted))accepted=null;
  const d=gcd(width,height),ratio=width/d+':'+height/d;
  description.textContent=accepted?'Compatible '+accepted+' preset selected. This model controls output resolution; your requested '+width+' × '+height+' dimensions are kept as a draft only.':'Requested '+width+' × '+height+' ('+ratio+'). This model uses preset sizes. Choose a compatible ratio below; exact custom pixel dimensions are unavailable.';
  for(const value of supported())alternatives.append(button('Use '+value,()=>{accepted=value;onChoose(value);remember();update();}));
  for(const b of alternatives.children)b.setAttribute('aria-pressed',String(b.textContent==='Use '+accepted));remember();
 }
 for(const ratio of presets)choices.append(button(ratio,()=>{const [w,h]=ratio.split(':').map(Number);inputs.width.value=w*128;inputs.height.value=h*128;accepted=null;update();}));
 const reset=button('Reset',()=>{inputs.width.value=inputs.height.value='1024';accepted=null;update();});
 panel.append(fields,choices,preview,description,alternatives,reset);host.append(panel);
 for(const input of Object.values(inputs))input.addEventListener('input',()=>{accepted=null;update();});
 let saved=initial;try{saved||=JSON.parse(sessionStorage.getItem('loox-custom-ratio:'+kind)||'null');}catch{}
 if(saved){inputs.width.value=saved.width||1024;inputs.height.value=saved.height||1024;accepted=saved.accepted||null;}update();
 return {panel,update,get:()=>accepted?{aspect_ratio:accepted,custom_dimensions:dimensions(),custom_dimensions_applied:false}:null,focus:()=>inputs.width.focus({preventScroll:true})};
}
export function mountLandingAspectControls(){
 const form=document.getElementById('creative-landing-form');if(!form)return null;
 const kind=document.body.dataset.creativeMode,video=kind==='video';
 const model=document.getElementById('creative-model');
 const radios=[...form.querySelectorAll('input[name="'+(video?'creative-video-ratio':'creative-ratio')+'"]')];
 const group=radios[0]?.closest(video?'.video-ratio-options':'.image-ratio-options');if(!group)return null;
 const label=document.createElement('label');label.className=radios[0].parentElement.className;
 const radio=document.createElement('input');radio.type='radio';radio.name=radios[0].name;radio.value='custom';const span=document.createElement('span');span.textContent='Custom';label.append(radio,span);group.append(label);
 const box=document.createElement('div');group.after(box);box.hidden=true;
 const controls=mountAspectControls(box,{kind,supported:()=>{if(!video)return ['1:1','16:9','9:16','4:3','3:4'];if(window.__looxVideoLandingRatios)return window.__looxVideoLandingRatios();const radios=[...form.querySelectorAll('[name=creative-video-ratio]')];return radios.filter(r=>r.value!=='custom'&&!r.disabled).map(r=>r.value);}});
 model?.addEventListener('change',controls.update);
 for(const input of [...radios,radio])input.addEventListener('change',()=>{box.hidden=!radio.checked;});
 return {get:()=>radio.checked?controls.get():{},validate:()=>{if(!radio.checked||controls.get())return true;controls.focus();return false;}};
}
