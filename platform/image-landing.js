import {config} from './account.js?v=9';
const root=document.querySelector('[data-image-showcase]');
if(root){
 const expand=document.getElementById('models-expand');
 expand.addEventListener('click',()=>{
  const open=expand.getAttribute('aria-expanded')!=='true';
  document.querySelectorAll('[data-model-card]').forEach((card,i)=>{if(i>=6)card.hidden=!open;});
  expand.setAttribute('aria-expanded',String(open));
  expand.textContent=open?'Show fewer models −':`Explore all ${document.querySelectorAll('[data-model-card]').length} models ＋`;
 });
 document.getElementById('image-year').textContent=new Date().getFullYear();
 if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.08});
  document.querySelectorAll('.reveal').forEach(node=>{node.classList.add('reveal-ready');observer.observe(node);});
 }
 const status=document.getElementById('image-model-status');
 try{
  const cfg=await config(),models=[{id:'flux',name:'FLUX.1 Schnell',available:cfg.local?.available,status:'temporarily_unavailable'},...(cfg.models||[])];
  const ids=new Set(models.map(m=>m.id));document.querySelectorAll('[data-model-card]').forEach(card=>{if(!ids.has(card.dataset.modelCard))card.remove();});
  let ready=0;
  for(const model of models){
   let card=[...document.querySelectorAll('[data-model-card]')].find(c=>c.dataset.modelCard===model.id);
   if(!card){
    card=document.createElement('article');card.className='model-card';card.dataset.modelCard=model.id;
    for(const [tag,cls,text] of [['span','model-symbol','✧'],['span','model-state','Checking status…'],['h3','',model.name],['p','',model.description||'Explore this model in the studio.'],['small','','Text prompts · Aspect ratios'],['a','model-launch','View in workspace →']]){const node=document.createElement(tag);node.className=cls;node.textContent=text;if(tag==='a')node.href='ai-text-to-image.html#generate';card.append(node);}
    document.querySelector('.model-grid').append(card);card.hidden=expand.getAttribute('aria-expanded')!=='true';
   }
   card.querySelector('h3').textContent=model.name;
   const badge=card.querySelector('.model-state'),link=card.querySelector('.model-launch');
   badge.textContent=model.available?'Available':model.status==='coming_soon'?'Coming soon':'Temporarily unavailable';
   badge.classList.toggle('ready',Boolean(model.available));
   link.addEventListener('click',()=>{try{sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:'image',prompt:'',model:model.id}));}catch{}});
   if(model.available){ready++;link.textContent='Try Now →';}
  }
  const cards=[...document.querySelectorAll('[data-model-card]')];
  const expanded=expand.getAttribute('aria-expanded')==='true';
  cards.forEach((card,index)=>{card.hidden=!expanded&&index>=6;});
  expand.hidden=cards.length<=6;
  expand.textContent=expanded?'Show fewer models −':`Explore all ${cards.length} models ＋`;
  status.textContent=ready?`${ready} model${ready===1?'':'s'} available now · availability checked live`:'Image generation is currently unavailable. Explore the studio and prepare your ideas while models await activation.';
  const first=models.find(model=>model.available);
  if(first)document.querySelectorAll('[data-feature-model]').forEach(badge=>{badge.textContent=first.name+' · available in studio';badge.parentElement.querySelector('a').addEventListener('click',()=>{try{sessionStorage.setItem('loox-creative-launch-v1',JSON.stringify({kind:'image',prompt:'',model:first.id}));}catch{}});});
 }catch{document.querySelectorAll('.model-state').forEach(b=>b.textContent='Status not checked');status.textContent='Live availability could not be checked. Open the workspace for the latest model status.';}
}
