const feed=document.querySelector('#lig-results');
for(const [label,w,h]of [['Square',1024,1024],['Portrait',768,1152],['Landscape',1440,810],['Tall portrait',720,1280]]){
 const card=document.createElement('article');card.className='lig-output';card.dataset.ratio=w+'/'+h;
 const heading=document.createElement('div');heading.className='lig-output-top';heading.innerHTML='<span class="lig-output-name">'+label+' generation</span>';
 const meta=document.createElement('small');meta.className='loox-generation-meta';meta.textContent='FLUX.1 Schnell · '+w+' × '+h;
 const stage=document.createElement('div');stage.className='lig-output-stage';stage.style.setProperty('--lig-ratio','1 / 1');
 const img=document.createElement('img');img.alt=label+' test generation';img.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#436dc2"/><stop offset="1" stop-color="#dca1aa"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="'+w*.7+'" cy="'+h*.25+'" r="'+Math.min(w,h)*.1+'" fill="#ffe4b8"/><path d="M0 '+h*.75+' L'+w*.35+' '+h*.36+' L'+w*.65+' '+h*.8+' L'+w+' '+h*.48+' V'+h+' H0Z" fill="#172f50"/><rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'" fill="none" stroke="#fff" stroke-width="4"/></svg>');stage.append(img);
 const actions=document.createElement('div');actions.className='loox-generation-actions';for(const label of ['Copy prompt','Reuse settings','Details','Preview','Download original']){const b=document.createElement('button');b.className='lig-small-action';b.textContent=label;actions.append(b)}
 card.append(heading,meta,stage,actions);feed.append(card);
}
const loading=document.createElement('article');loading.className='lig-output';loading.id='loading-fixture';loading.innerHTML='<div class="lig-output-stage" style="--lig-ratio:1/1">Preparing image…</div>';feed.append(loading);
