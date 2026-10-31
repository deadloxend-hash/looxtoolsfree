/* LOOX Tools shared header and theme preferences */
(function(){
 'use strict';
 if(document.querySelector('[data-loox-appbar]'))return;
 const root=document.documentElement;
 const themeKey='loox-theme-v1',customKey='loox-custom-theme-v1';
 const fallbackCustom={background:'#f3f0fa',accent:'#7957e8'};
 const readCustom=()=>{try{return Object.assign({},fallbackCustom,JSON.parse(localStorage.getItem(customKey)||'{}'))}catch(_){return Object.assign({},fallbackCustom)}};
 const titleFromDocument=document.title.replace(/\s*[—-]\s*.*$/,'').trim();
 const titleNode=document.querySelector('main h1, .app h1, .topline h1');
 const pageTitle=titleFromDocument|| (titleNode?(titleNode.textContent||'').replace(/\s+/g,' ').trim():'Online tool');
 const header=document.createElement('header');
 header.className='loox-appbar';header.dataset.looxAppbar='true';
 header.innerHTML=
 '<div class="loox-appbar-inner">'+
  '<a class="loox-app-brand" href="index.html" aria-label="LOOX Tools home"><span class="loox-app-mark">L</span><span><span class="loox-app-brand-name">LOOX<em>Tools</em></span><span class="loox-app-sub">FREE ONLINE WORKSPACE</span></span></a>'+
  '<div class="loox-page-name"><small>TOOL WORKSPACE</small><strong></strong></div>'+
  '<div class="loox-app-actions"><a class="loox-back-link" href="index.html"><span aria-hidden="true">←</span> All tools</a>'+
   '<div class="loox-theme"><button class="loox-theme-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Choose appearance"><span class="theme-glyph" aria-hidden="true">◐</span><span class="theme-label">Theme</span><span aria-hidden="true">⌄</span></button>'+
    '<div class="loox-theme-menu" hidden><h3>Appearance</h3><p>Choose how LOOX looks</p>'+
     '<button class="loox-theme-choice" type="button" data-choice="white" aria-pressed="false"><span class="loox-swatch white"></span><span>White<small>Clean and bright</small></span><b>✓</b></button>'+
     '<button class="loox-theme-choice" type="button" data-choice="grey" aria-pressed="false"><span class="loox-swatch grey"></span><span>Light grey<small>Soft neutral look</small></span><b>✓</b></button>'+
     '<button class="loox-theme-choice" type="button" data-choice="dark" aria-pressed="false"><span class="loox-swatch dark"></span><span>Black<small>Easy on the eyes</small></span><b>✓</b></button>'+
     '<button class="loox-theme-choice" type="button" data-choice="custom" aria-pressed="false"><span class="loox-swatch custom"></span><span>Customize<small>Pick your own colors</small></span><b>✓</b></button>'+
     '<div class="loox-custom-fields" hidden><label class="loox-color-row">Page background <input id="looxCustomBg" type="color" value="#f3f0fa"></label><label class="loox-color-row">Accent color <input id="looxCustomAccent" type="color" value="#7957e8"></label><button class="loox-custom-reset" type="button">Reset custom colors</button></div>'+
    '</div>'+
   '</div>'+
  '</div>'+
 '</div>';
 header.querySelector('.loox-page-name strong').textContent=pageTitle||'Online tool';
 document.body.insertBefore(header,document.body.firstChild);
 const footer=document.createElement('div');
 footer.className='loox-app-footer';
 footer.innerHTML='<span>LOOX Tools · Your creative workspace</span><a href="index.html">← Explore all tools</a>';
 document.body.appendChild(footer);
 const themeMenu=header.querySelector('.loox-theme-menu');
 const themeTrigger=header.querySelector('.loox-theme-trigger');
 const customFields=header.querySelector('.loox-custom-fields');
 const customBg=header.querySelector('#looxCustomBg');
 const customAccent=header.querySelector('#looxCustomAccent');
 const rgb=hex=>{const s=String(hex||'').replace('#','');if(!/^[0-9a-f]{6}$/i.test(s))return null;return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]};
 const luminance=hex=>{const c=rgb(hex);return c?.[0]*.2126+c?.[1]*.7152+c?.[2]*.0722||240};
 const mix=(a,b,t)=>{const x=rgb(a),y=rgb(b);if(!x||!y)return a;return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')};
 function applyTheme(name,custom=readCustom(),save=true){
  const valid=['white','grey','dark','custom'].includes(name)?name:'white';
  root.dataset.theme=valid;
  root.dataset.tone=valid==='dark'?'dark':valid==='custom'?(luminance(custom.background)<145?'dark':'light'):'light';
  if(valid==='custom'){
   const dark=root.dataset.tone==='dark';
   const surface=dark?mix(custom.background,'#ffffff',.09):mix(custom.background,'#ffffff',.83);
   const soft=dark?mix(custom.background,'#ffffff',.15):mix(custom.background,'#ffffff',.65);
   root.style.setProperty('--loox-paper',custom.background);
   root.style.setProperty('--loox-surface',surface);
   root.style.setProperty('--loox-surface-soft',soft);
   root.style.setProperty('--loox-user-bg',custom.background);
   root.style.setProperty('--loox-user-surface',surface);
   root.style.setProperty('--loox-user-surface-soft',soft);
   root.style.setProperty('--loox-user-accent',custom.accent);
   root.style.setProperty('--loox-accent',custom.accent);
   root.style.setProperty('--loox-ink',dark?'#f2effb':'#272238');
   root.style.setProperty('--loox-muted',dark?'#bcb5ca':'#756f82');
   root.style.setProperty('--loox-line',dark?mix(custom.background,'#ffffff',.22):mix(custom.background,'#000000',.13));
   root.style.setProperty('--loox-accent-2',custom.accent);
  }else{
   ['--loox-paper','--loox-surface','--loox-surface-soft','--loox-user-bg','--loox-user-surface','--loox-user-surface-soft','--loox-user-accent','--loox-accent','--loox-ink','--loox-muted','--loox-line','--loox-accent-2'].forEach(p=>root.style.removeProperty(p));
  }
  header.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.choice===valid)));
  customFields.hidden=valid!=='custom';
  customBg.value=custom.background;customAccent.value=custom.accent;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=valid==='dark'?'#101116':valid==='grey'?'#e9eaee':valid==='custom'?custom.background:'#ffffff';
  if(save){try{localStorage.setItem(themeKey,valid);if(valid==='custom')localStorage.setItem(customKey,JSON.stringify(custom))}catch(_){}}
 }
 function closeMenu(){themeMenu.hidden=true;themeTrigger.setAttribute('aria-expanded','false')}
 themeTrigger.addEventListener('click',()=>{
  const open=themeMenu.hidden;themeMenu.hidden=!open;themeTrigger.setAttribute('aria-expanded',String(open));
 });
 themeMenu.addEventListener('click',e=>e.stopPropagation());
 themeMenu.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{
  const name=b.dataset.choice;applyTheme(name,readCustom());if(name!=='custom')closeMenu();
 }));
 function updateCustom(){applyTheme('custom',{background:customBg.value,accent:customAccent.value})}
 customBg.addEventListener('input',updateCustom);customAccent.addEventListener('input',updateCustom);
 themeMenu.querySelector('.loox-custom-reset').addEventListener('click',()=>{
  customBg.value=fallbackCustom.background;customAccent.value=fallbackCustom.accent;updateCustom();
 });
 document.addEventListener('click',e=>{if(!header.querySelector('.loox-theme').contains(e.target))closeMenu()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!themeMenu.hidden){closeMenu();themeTrigger.focus()}});
 let saved='dark';try{saved=localStorage.getItem(themeKey)||'dark'}catch(_){}
 applyTheme(saved,readCustom(),false);
})();