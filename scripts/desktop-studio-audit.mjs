// Focused, deterministic desktop regressions. Provider calls are intercepted;
// sample cards are browser fixtures and never become user generations.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const out='desktop-audit-artifacts';fs.mkdirSync(out,{recursive:true});
const config={auth:false,ai:false,billing:false,annualBillingEnabled:false,plans:[{id:'free',price_cents:0,credits:25},{id:'creator',price_cents:1200,credits:500},{id:'creator_yearly',price_cents:12000,credits:6000},{id:'pro',price_cents:2900,credits:1500},{id:'pro_yearly',price_cents:29000,credits:18000},{id:'business',price_cents:6900,credits:4000},{id:'business_yearly',price_cents:69000,credits:48000}],operations:[{id:'generate',cost:3},{id:'generate_video',cost:8}],models:[],local:{available:false},videoModels:[{id:'kling_40',name:'Kling 4.0',available:true,status:'available',minimumPlan:'pro',cost:110,creditCosts:{5:110,10:220},durationOptions:[5,10],capabilities:{imageReference:true,ratios:['16:9','9:16','1:1'],resolution:'720p'}},{id:'grok_video',name:'Grok Imagine Video',available:true,status:'available',minimumPlan:'creator',cost:50,creditCosts:{5:50,10:100},durationOptions:[5,10],capabilities:{imageReference:true,ratios:['16:9','9:16'],resolution:'720p'}}]};
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
try{
 for(const viewport of [{width:1280,height:720},{width:1365,height:900},{width:1920,height:1080}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  await page.route('https://looxtoolfree-backend.vercel.app/api/loox?*',route=>route.fulfill({json:new URL(route.request().url()).searchParams.get('action')==='config'?config:{error:'Disabled in UI test'}}));
  for(const file of ['ai-text-to-image.html','ai-video-generator.html']){
   await page.goto(base+file);await page.locator('.studio-content-switcher').waitFor();
   await page.locator('.studio-model-trigger').waitFor();
   const prefix=file.includes('video')?'lvg':'lig';
   const geometry=await page.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    return {feed:r('.lig-content-scroll:not([hidden])'),compose:r('.lig-compose-wrap'),search:r('.loox-chat-header-search'),menu:r('.studio-menu-host'),account:r('.lig-header-user'),width:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert.ok(geometry.feed.bottom<=geometry.compose.top+2,'Results must stop above the composer');assert.ok(geometry.compose.bottom<=viewport.height+2,'Composer must fit viewport');assert.ok(geometry.menu.left-geometry.search.right<25,'Header controls must stay together');assert.ok(geometry.account.left-geometry.menu.right>=8&&geometry.account.left-geometry.menu.right<25,'Header account must not overlap menu');assert.ok(geometry.width<=geometry.viewport+2);
   await page.locator('.studio-model-trigger').click();await page.getByRole('button',{name:/Close Choose/}).waitFor();
   if(prefix==='lvg'){assert.equal(await page.locator('[data-model-value="kling_40"]').count(),1);assert.equal(await page.locator('[data-model-value="grok_video"]').count(),1);}
   const close=page.getByRole('button',{name:/Close Choose/});const size=await close.boundingBox();assert.ok(Math.abs(size.width-size.height)<1);assert.ok(size.width>=32);await close.click();
   await page.evaluate(prefix=>{
    const feed=document.getElementById(prefix+'-results');
    const svg='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1400"><rect width="800" height="1400" fill="#372249"/><circle cx="400" cy="700" r="240" fill="#ad7ce7"/></svg>');
    for(let i=0;i<2;i++){const card=document.createElement('article');card.className='lig-output';card.innerHTML='<div class="lig-output-top"><span class="lig-output-name">'+('A detailed cinematic portrait prompt with soft light and fine textures. '.repeat(8))+'</span></div><small class="loox-generation-meta">FLUX · 3:4 · 2026-11-13</small><div class="lig-output-stage"><img alt="Test portrait" src="'+svg+'"></div><div class="loox-generation-actions"><button>Download</button></div>';feed.append(card);}
   },prefix);
   await page.waitForFunction(()=>[...document.querySelectorAll('.lig-output-stage>img')].every(i=>i.complete&&i.naturalHeight));
   await page.locator('.lig-output').last().scrollIntoViewIfNeeded();
   const sample=await page.evaluate(()=>({image:document.querySelector('.lig-output:last-child img').getBoundingClientRect().toJSON(),feed:document.querySelector('.lig-content-scroll:not([hidden])').getBoundingClientRect().toJSON(),compose:document.querySelector('.lig-compose-wrap').getBoundingClientRect().toJSON()}));
   assert.ok(sample.image.top>=sample.feed.top-2,'Portrait must fit the visible results region');assert.ok(sample.image.bottom<=sample.compose.top+2,'Portrait must never sit behind composer');
   await page.screenshot({path:out+'/'+prefix+'-'+viewport.width+'.png'});
  }
  await page.goto(base+'ai-chat.html');await page.locator('body.loox-studio .ai-composer').waitFor();
  const assistant=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {header:rect('header.lig-header'),search:rect('.loox-chat-header-search'),menu:rect('.studio-menu-host'),account:rect('.lig-header-user'),thread:rect('.ai-thread'),composer:rect('.ai-composer-wrap'),form:rect('.ai-composer'),toolbar:rect('.loox-uc-agent-toolbar')};});
  assert.equal(assistant.header.height,64);assert.ok(assistant.menu.left-assistant.search.right<25);assert.ok(assistant.account.left-assistant.menu.right>=8&&assistant.account.left-assistant.menu.right<25,'Assistant account must not overlap menu');assert.ok(assistant.composer.bottom<=viewport.height+2);assert.ok(assistant.thread.bottom<=assistant.composer.top+2);assert.ok(Math.abs(assistant.toolbar.left-assistant.form.left)<3,'Assistant model must align with composer');
  await page.screenshot({path:out+'/assistant-'+viewport.width+'.png'});
  await page.goto(base+'upgrade.html');await page.locator('#lp-estimate-model option[value="kling_40"]').waitFor({state:'attached'});
  await page.locator('.lp-estimator .loox-dropdown-trigger').first().click();
  await page.locator('#lp-estimate-model-loox-options').getByRole('option',{name:/Grok Imagine Video/}).click();
  assert.equal(await page.locator('#lp-estimate-model').inputValue(),'grok_video');
  assert.match(await page.locator('[data-plan="creator"] .lp-plan-estimates').innerText(),/10 × 5s videos/);
  assert.equal(await page.getByRole('button',{name:/Yearly|Annual/}).count(),0);assert.match(await page.locator('[data-plan="creator"]').innerText(),/500 credits per month/);assert.match(await page.locator('[data-plan="creator"] .lp-plan-estimates').innerText(),/10 × 5s videos/);
  await page.screenshot({path:out+'/plans-'+viewport.width+'.png',fullPage:true});await page.close();
 }
 console.log('Desktop portrait visibility, header grouping, centered close controls, new models and plan estimates passed.');
}finally{await browser.close();}
