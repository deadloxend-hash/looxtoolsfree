const iframe=document.querySelector('#fixture'),results=document.querySelector('#results'),summary=document.querySelector('#summary');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assert(ok,message){if(!ok)throw Error(message)}
document.querySelector('#run').onclick=async()=>{
 const button=document.querySelector('#run');button.disabled=true;results.replaceChildren();let pass=0,total=0;
 try{
 for(const [w,h]of [[320,568],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]]){
  iframe.width=w;iframe.height=h;await pause(180);const doc=iframe.contentDocument;
  for(const img of doc.querySelectorAll('#lig-results img'))await img.decode();
  const row=document.createElement('tr');total++;
  try{
   const cards=[...doc.querySelectorAll('#lig-results>.lig-output:has(img)')];
   for(const card of cards){const img=card.querySelector('img'),stage=card.querySelector('.lig-output-stage'),r=img.getBoundingClientRect(),s=stage.getBoundingClientRect();const css=iframe.contentWindow.getComputedStyle(stage);
    assert(r.width>0&&r.height>0,'Image has no visible size');
    assert(Math.abs(r.width/r.height-img.naturalWidth/img.naturalHeight)<.015,'Image proportions changed');
    assert(Math.abs(r.width-s.width)<2&&Math.abs(r.height-s.height)<2,'Empty letterbox space remains around image');
    assert(css.backgroundColor==='rgba(0, 0, 0, 0)','Media stage still has a solid background');
    assert(r.width<=w+1,'Image wider than viewport');
    const actions=card.querySelector('.loox-generation-actions').getBoundingClientRect();assert(actions.width<=card.getBoundingClientRect().width+2,'Actions overflow the card');
   }
   assert(doc.documentElement.scrollWidth<=w+1,'Horizontal page overflow');
   const square=cards[0].querySelector('img').getBoundingClientRect();if(w>=1024)assert(square.height>=h*.6,'Desktop image is still too small');
   const loading=doc.querySelector('#loading-fixture .lig-output-stage');assert(iframe.contentWindow.getComputedStyle(loading).backgroundColor!=='rgba(0, 0, 0, 0)','Loading placeholder was changed');
   row.innerHTML='<td>'+w+' × '+h+'</td><td class="pass">PASS · all four ratios, no letterboxing or overflow</td>';pass++;
  }catch(e){row.innerHTML='<td>'+w+' × '+h+'</td><td class="fail"></td>';row.lastElementChild.textContent=e.message}
  results.append(row);summary.textContent=pass+'/'+total+' viewports passed';
 }
 }finally{summary.textContent='Complete: '+pass+'/'+total+' viewports passed';button.disabled=false}
};
