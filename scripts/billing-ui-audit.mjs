// Synthetic UI only; no checkout calls, accounts, charges or database mutations.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const plans=[{id:'free',price_cents:0,credits:25,cadence:'signup'},{id:'creator',price_cents:1200,credits:500,cadence:'month'},{id:'pro',price_cents:2900,credits:1500,cadence:'month'},{id:'business',price_cents:6900,credits:4000,cadence:'month'}];
const catalog={annualBillingEnabled:false,paymentsEnabled:false,creditTopupsEnabled:false,packages:[{id:'mini',name:'Mini Recharge',credits:100,price_cents:500,approved:false},{id:'creator_boost',name:'Creator Boost',credits:300,price_cents:1000,approved:false},{id:'power',name:'Power Pack',credits:750,price_cents:2500,approved:false},{id:'pro_recharge',name:'Pro Recharge',credits:1500,price_cents:4500,approved:false}],creditPolicy:{expiration:'Purchased credits do not expire.',refunds:'Verified refunds reverse credits.'}};
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
let checks=0;
// First paint must explain the disabled launch even without JavaScript.
{const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:850}});
 const page=await context.newPage();await page.goto(root+'upgrade.html');
 assert.match(await page.locator('#lp-billing-notice').innerText(),/Coming Soon/);checks++;
 assert.equal(await page.locator('.lp-estimator').isVisible(),false);checks++;
 assert.match(await page.locator('#lp-plan-grid').innerText(),/Free tools are available now/);checks++;
 await context.close();}
// An empty production catalog keeps the unavailable estimator hidden after hydration.
{const context=await browser.newContext();const page=await context.newPage();
 await page.route('https://looxtoolfree-backend.vercel.app/api/**',r=>r.fulfill({json:{auth:false,billing:false,videoModels:[],plans}}));
 await page.goto(root+'upgrade.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.lp-plan').count(),4);checks++;
 assert.equal(await page.locator('.lp-estimator').isVisible(),false);checks++;await context.close();}
const previewModels=[{id:'preview-video',name:'Preview model',available:true,minimumPlan:'creator',creditCosts:{5:15},durationOptions:[5],capabilities:{resolution:'720p'}}];
try{for(const width of [360,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://looxtoolfree-backend.vercel.app/api/loox?**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  assert.equal(route.request().method(),'GET','UI preview must never submit a payment');
  return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(action==='billing_catalog'?catalog:{auth:false,billing:false,annualBillingEnabled:false,plans,operations:[{id:'generate',cost:3}],videoModels:previewModels})});
 });
 await page.goto(root+'upgrade.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.lp-plan').count(),4);checks++;
 const modelTrigger=page.locator('.lp-estimator .loox-dropdown-trigger').first();
 await modelTrigger.waitFor();
 const popupId=await modelTrigger.getAttribute('aria-controls');
 assert.ok(popupId,'Model selector must identify its controlled popup');
 const modelPopup=page.locator('#'+popupId);
 await modelPopup.waitFor({state:'attached',timeout:12000});
 assert.equal(await page.locator('.lp-estimator .loox-dropdown.is-ready').count(),2,'Billing selectors must be LOOX themed at '+width);checks++;
 await page.locator('.lp-estimator .loox-dropdown-trigger').first().click();
 assert.equal(await modelPopup.isVisible(),true,'Themed model list not open at '+width);checks++;
 await page.keyboard.press('Escape');
 assert.equal(await modelPopup.isVisible(),false);checks++;
 if(width<=600){
  const toggle=page.locator('body > button.loox-sitewide-dock-toggle');
  await page.locator('.loox-notification-bell:visible').waitFor({state:'visible'});
  await toggle.waitFor({state:'hidden'});
  assert.equal(await toggle.isVisible(),false,'Unintended edge handle must stay hidden on phones');checks++;
  await page.getByRole('button',{name:'Open LOOX apps',exact:true}).click();
  assert.equal(await page.locator('dialog.loox-mobile-app-layer').isVisible(),true,'Apps navigation must remain reachable');checks++;
  await page.getByRole('button',{name:'Close apps',exact:true}).click();
 }else if(width<901){
  const toggle=page.locator('.loox-sitewide-burger');
  await toggle.waitFor({state:'visible'});
  assert.equal(await toggle.isVisible(),true,'Sidebar toggle hidden on upgrade at '+width);checks++;
  await toggle.click();
  assert.equal(await page.locator('#loox-sitewide-drawer').getAttribute('class').then(v=>v.includes('is-open')),true,'Sidebar did not open on upgrade at '+width);checks++;
  await toggle.click();
 }
 assert.equal(await page.getByRole('button',{name:/Yearly|Annual/}).count(),0);checks++;
 assert.equal(await page.locator('.lp-plan button:disabled').count(),3);checks++;
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Pricing overflow at '+width);checks++;
 assert.equal(await page.locator('#lp-buy-credits').isEnabled(),false,'Recharge must be locked during the free launch');checks++;
 assert.equal(await page.locator('#lp-buy-credits').innerText(),'Coming Soon');checks++;
 assert.equal(await page.locator('dialog.loox-recharge[open]').count(),0);checks++;
 assert.deepEqual(errors,[]);checks++;
 await context.close();
 }
 // Check all three generator routes in a safe signed-out browser. No paid calls.
 for(const width of [360,390,768]){
  const context=await browser.newContext({viewport:{width,height:860},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route('https://looxtoolfree-backend.vercel.app/api/loox?**',route=>{
   const action=new URL(route.request().url()).searchParams.get('action');
   return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({
    auth:false,billing:false,annualBillingEnabled:false,plans,operations:[{id:'generate',cost:3},{id:'generate_video',cost:8}],videoModels:[],action
   })});
  });
  for(const route of ['ai-text-to-image.html','ai-video-generator.html','ai-chat.html']){
   await page.goto(root+route,{waitUntil:'domcontentloaded'});
   await page.locator('body.loox-studio').waitFor({timeout:20000});
   assert.equal(await page.locator('button.lx-buy-credits,button.studio-budget-link').count(),0,'Unexpected Buy Credits button in '+route+' at '+width);checks++;
   const dock=page.locator('body > button.loox-sitewide-dock-toggle');
   assert.equal(await page.locator('.studio-menu-host').count(),0,'Duplicate workspace menu must not be mounted in '+route);checks++;
   await dock.waitFor({state:'hidden'});
   const headerToggle=page.locator('.loox-sitewide-burger');
   await headerToggle.waitFor({state:'visible'});await headerToggle.click();
   assert.equal(await page.locator('#loox-sitewide-drawer').getAttribute('class').then(v=>v.includes('is-open')),true,'Sidebar inaccessible in '+route+' at '+width);checks++;
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#loox-sitewide-drawer').getAttribute('class').then(v=>v.includes('is-open')),false,'Sidebar must close on Escape');checks++;
   if(route==='ai-video-generator.html'){
    await page.locator('.studio-frame-strip').waitFor({timeout:15000});
    const nativeVisible=await page.locator('#lvg-image-block').evaluate(element=>getComputedStyle(element).display!=='none');
    assert.equal(nativeVisible,false,'Native video file control must be hidden beside frame strip at '+width);checks++;
   }
  }
  await page.goto(root+'ai-image-landing.html',{waitUntil:'domcontentloaded'});
  await page.locator('#image-landing-model-trigger').waitFor();
  await page.locator('#image-landing-model-trigger').click();
  await page.locator('.image-model-option').first().waitFor({timeout:12000});
  const clipped=await page.locator('.image-model-option').evaluateAll(items=>items.some(item=>{
   const small=item.querySelector('small'),a=item.getBoundingClientRect(),b=small?.getBoundingClientRect();
   return !!b&&(b.right>a.right+1||b.left<a.left-1);
  }));
  assert.equal(clipped,false,'Image model availability badge overflows at '+width);checks++;
  await page.goto(root+'settings.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#billing').count(),1,'Billing section missing from Settings');checks++;
  assert.equal(await page.locator('#lp-billing-recharge').count(),1,'Recharge action missing from Settings');checks++;
  await context.close();
 }
 console.log('Billing and generator UI: '+checks+' checks passed, with payments disabled.');
}finally{await browser.close();}
