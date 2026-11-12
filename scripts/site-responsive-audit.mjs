/* Automated read-only LOOX layout smoke test.
   Uses a local static server: no backend writes, no credits, no account login. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL_ROOT=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const pages=[
 'index.html','ai-image-landing.html','ai-video-landing.html',
 'ai-text-to-image.html','ai-video-generator.html','ai-chat.html',
 'community.html','trending.html','templates.html','creator.html',
 'collections.html','account.html','all-ai-tools.html',
 'design-studio.html','photo-editor.html','video-editor.html',
 'bg-remove.html','image-resizer.html','pricing.html','help.html',
 'settings.html','toolbox.html'
];
const widths=[
 {name:'android-small',width:360,height:800},
 {name:'android',width:393,height:873},
 {name:'android-landscape',width:873,height:393},
 {name:'tablet',width:768,height:1024},
 {name:'desktop',width:1365,height:900}
];
const outDir=path.resolve('audit-artifacts');
fs.mkdirSync(outDir,{recursive:true});
const results=[];
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
}catch(firstError){
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 }catch(error){
  fs.writeFileSync(path.join(outDir,'browser-error.txt'),String(firstError)+'\n'+String(error));
  console.log('BROWSER ERROR',String(firstError),String(error));
  process.exit(2);
 }
}
for(const viewport of widths){
 const context=await browser.newContext({
  viewport:{width:viewport.width,height:viewport.height},
  reducedMotion:'reduce',
  deviceScaleFactor:1,
  isMobile:viewport.name!=='desktop',
  hasTouch:viewport.name!=='desktop'
 });
 const page=await context.newPage();
 page.setDefaultTimeout(6000);
 for(const file of pages){
  const item={file,viewport:viewport.name,width:viewport.width,problems:[]};
  try{
   await page.goto(URL_ROOT+file,{waitUntil:'domcontentloaded',timeout:16000});
   await page.waitForTimeout(750);
   item.metrics=await page.evaluate(()=>{
    const root=document.documentElement,body=document.body;
    const width=window.innerWidth;
    const horizontal=Math.max(root.scrollWidth,body?.scrollWidth||0);
    const bad=[];
    for(const el of document.querySelectorAll('button,a,input,select,textarea')){
     const style=getComputedStyle(el);
     const rect=el.getBoundingClientRect();
     if(style.visibility==='hidden'||style.display==='none'||rect.width<8||rect.height<8)continue;
     if(rect.right>width+6&&rect.left<width&&rect.top>=0&&rect.top<innerHeight){
      const parent=el.closest('.community-filters,.creative-examples,.studio-quick,.studio-tabs,.loox-sitewide-sidebar');
      const editorRail=el.closest('.ds-rail,.ds-toolbar,.mobile-bar,.filter-categories');
      const intentionallyScrollable=editorRail&&
       ['auto','scroll'].includes(getComputedStyle(editorRail).overflowX)&&
       editorRail.scrollWidth>editorRail.clientWidth+2;
      // Editor toolbars are intentionally horizontally scrollable; their
      // offscreen buttons are reachable with a swipe, not misaligned.
      if(!parent&&!intentionallyScrollable)bad.push({tag:el.tagName,text:(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,38),right:Math.round(rect.right)});
     }
    }
    return {horizontal,viewport:width,clippedButtons:bad.slice(0,8),title:document.title,nav:!!document.querySelector('#loox-sitewide-header')};
   });
   if(item.metrics.horizontal>viewport.width+8)item.problems.push('Horizontal page overflow: '+item.metrics.horizontal+'px');
   if(item.metrics.clippedButtons.length)item.problems.push('Visible controls clipped: '+JSON.stringify(item.metrics.clippedButtons));
   if(['android','android-small','tablet'].includes(viewport.name)){
    const toggle=page.locator('.loox-mobile-app-trigger:visible').first();
    if(await toggle.count()){
     await toggle.click();
     await page.waitForTimeout(400);
     const bounds=await page.locator('.loox-mobile-app-sheet').first().evaluate(el=>{
      const r=el.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,viewport:window.innerHeight,fixed:getComputedStyle(document.body).position==='fixed'};
     });
     item.menu=bounds;
     if(Math.abs(bounds.bottom-bounds.viewport)>4)item.problems.push('Web apps sheet not bottom-aligned: '+JSON.stringify(bounds));
     if(!bounds.fixed)item.problems.push('Web apps background not scroll-locked');
     if(bounds.top< -4)item.problems.push('Web apps sheet starts above viewport: '+JSON.stringify(bounds));
     if(bounds.bottom<bounds.viewport-4)item.problems.push('Web apps sheet floats above bottom: '+JSON.stringify(bounds));
     await page.locator('.loox-mobile-app-close').first().click();
     await page.waitForTimeout(250);
     const closed=await page.evaluate(()=>getComputedStyle(document.body).position);
     if(closed==='fixed')item.problems.push('Web apps did not restore body scroll on close');
    }
   }
   if(item.problems.length){
    const filename=(file+'-'+viewport.name).replace(/[^a-z0-9.-]/gi,'_')+'.png';
    try{await page.screenshot({path:path.join(outDir,filename),fullPage:false})}catch{}
   }
  }catch(e){item.problems.push('Page test error: '+String(e).slice(0,160));}
  results.push(item);
  console.log('PAGE',JSON.stringify({page:file,viewport:viewport.name,problems:item.problems,menu:item.menu}));
 }
 await context.close();
}
await browser.close();
const failed=results.filter(x=>x.problems.length);
const summary={tests:results.length,failed:failed.length,byPage:failed.map(x=>({file:x.file,viewport:x.viewport,problems:x.problems}))};
fs.writeFileSync(path.join(outDir,'visual-report.json'),JSON.stringify({summary,results},null,2));
console.log('RESPONSIVE AUDIT SUMMARY',JSON.stringify(summary));
