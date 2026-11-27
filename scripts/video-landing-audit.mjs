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
  const page=await context.newPage();await page.goto(base+'ai-video-landing.html');
  await page.locator('input[value="custom"]').waitFor({state:'attached'});
  await page.waitForFunction(()=>document.querySelector('#creative-model option[value="kling_30"]'));
  assert.equal(await page.locator('#creative-model option[value="kling_30"]').evaluate(n=>n.disabled),true);
  assert.match(await page.locator('#creative-landing-status').textContent(),/Coming Soon/i);
  assert.equal(await page.locator('.video-ratio-choice').count(),4);
  assert.equal(await page.locator('.video-ratio-options').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
  await page.locator('[data-example]').first().click();assert.ok((await page.locator('#creative-prompt').inputValue()).length>0);
  await page.locator('.video-ratio-choice').filter({hasText:'Portrait'}).click();
  await page.locator('#video-landing-model-trigger').click();
  assert.equal(await page.locator('#video-landing-model-options').isVisible(),true);
  assert.equal(await page.locator('#video-landing-model-options button').filter({hasText:'Kling 3.0'}).isDisabled(),true);
  await page.keyboard.press('Escape');
  await page.locator('.video-home-faq summary').first().click();assert.equal(await page.locator('.video-home-faq details').first().getAttribute('open'),'');
  assert.equal(await page.locator('.video-landing-submit').isDisabled(),true);
  await page.locator('#creative-landing-form').evaluate(form=>form.requestSubmit());assert.ok(page.url().includes('ai-video-landing.html'));
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('loox-creative-launch-v1')),null);
  await page.goto(base+'ai-video-generator.html#generate');await page.getByRole('heading',{name:'AI Video Studio is locked'}).waitFor();assert.equal(await page.locator('#lvg-generate,.lig-compose-wrap').count(),0);assert.equal(studioLoads,0);
  await context.close();console.log('Video landing passed at '+width+'px');
 }
}finally{await browser.close();}
