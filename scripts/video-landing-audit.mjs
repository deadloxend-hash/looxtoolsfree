import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('https://looxtoolfree-backend.vercel.app/**',r=>{assert.equal(r.request().method(),'GET','Landing must never create a paid job');return r.fulfill({json:{auth:false,billing:false,operations:[],models:[],videoModels:[{id:'kling_30',name:'Kling 3.0',available:true,durationOptions:[5,10],capabilities:{ratios:['16:9','9:16','1:1']}}]}});});
  await context.route('https://loox-profile-api.looxai-studio.workers.dev/**',r=>r.fulfill({json:{items:[]}}));
  let studioLoads=0;await context.route('**/platform/loox-video-generator.js*',r=>{studioLoads++;return r.abort();});
  const page=await context.newPage();
  for(const route of ['ai-video-landing.html','ai-video-generator.html#generate']){
   await page.goto(base+route);
   await page.getByRole('heading',{name:'AI Video is coming soon'}).waitFor();
   assert.match(await page.locator('.video-lock-card p').innerText(),/working on/i);
   assert.doesNotMatch(await page.locator('main').innerText(),/lock|unavailable|credits/i);
   assert.equal(await page.locator('main form,#creative-prompt,#lvg-generate,.lig-compose-wrap').count(),0);
   assert.equal(await page.locator('main a[href*="ai-video-"]').count(),0);
   assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal overflow at '+width);
   assert.equal(studioLoads,0);
  }
  await context.close();console.log('Video landing passed at '+width+'px');
 }
}finally{await browser.close();}
