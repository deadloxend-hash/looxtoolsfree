// Synthetic UI only; no checkout calls, accounts, charges or database mutations.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const plans=[{id:'free',price_cents:0,credits:25,cadence:'signup'},{id:'creator',price_cents:1200,credits:500,cadence:'month'},{id:'pro',price_cents:2900,credits:1500,cadence:'month'},{id:'business',price_cents:6900,credits:4000,cadence:'month'}];
const catalog={annualBillingEnabled:false,paymentsEnabled:false,creditTopupsEnabled:false,packages:[{id:'mini',name:'Mini Recharge',credits:100,price_cents:500,approved:false},{id:'creator_boost',name:'Creator Boost',credits:300,price_cents:1000,approved:false},{id:'power',name:'Power Pack',credits:750,price_cents:2500,approved:false},{id:'pro_recharge',name:'Pro Recharge',credits:1500,price_cents:4500,approved:false}],creditPolicy:{expiration:'Purchased credits do not expire.',refunds:'Verified refunds reverse credits.'}};
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
let checks=0;
try{for(const width of [360,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://looxtoolfree-backend.vercel.app/api/loox?**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  assert.equal(route.request().method(),'GET','UI preview must never submit a payment');
  return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(action==='billing_catalog'?catalog:{auth:false,billing:false,annualBillingEnabled:false,plans,operations:[{id:'generate',cost:3}],videoModels:[]})});
 });
 await page.goto(root+'upgrade.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.lp-plan').count(),4);checks++;
 await page.locator('#lp-estimate-model-loox-options').waitFor({state:'attached',timeout:12000});
 assert.equal(await page.locator('.lp-estimator .loox-dropdown.is-ready').count(),2,'Billing selectors must be LOOX themed at '+width);checks++;
 await page.locator('.lp-estimator .loox-dropdown-trigger').first().click();
 assert.equal(await page.locator('#lp-estimate-model-loox-options').isVisible(),true,'Themed model list not open at '+width);checks++;
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#lp-estimate-model-loox-options').isVisible(),false);checks++;
 if(width<901){
  const toggle=page.locator('body > button.loox-sitewide-dock-toggle');
  await toggle.waitFor({state:'visible'});
  assert.equal(await toggle.isVisible(),true,'Sidebar toggle hidden on upgrade at '+width);checks++;
  await toggle.click();
  assert.equal(await page.locator('#loox-sitewide-drawer').getAttribute('class').then(v=>v.includes('is-open')),true,'Sidebar did not open on upgrade at '+width);checks++;
  await toggle.click();
 }
 assert.equal(await page.getByRole('button',{name:/Yearly|Annual/}).count(),0);checks++;
 assert.equal(await page.locator('.lp-plan button:disabled').count(),3);checks++;
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Pricing overflow at '+width);checks++;
 await page.locator('#lp-buy-credits').click();
 await page.locator('.recharge-package').last().waitFor();
 assert.equal(await page.locator('.recharge-package').count(),4);checks++;
 await page.getByRole('button',{name:/Power Pack/}).click();
 assert.equal(await page.getByRole('button',{name:/Power Pack/}).getAttribute('aria-pressed'),'true');checks++;
 assert.equal(await page.locator('.recharge-checkout').isEnabled(),false);checks++;
 assert.equal(await page.locator('.loox-recharge').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true,'Dialog overflow at '+width);checks++;
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');checks++;
 await page.locator('.recharge-package').first().press('Escape');
 assert.equal(await page.locator('dialog[open]').count(),0);checks++;
 assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');checks++;
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
   await dock.waitFor({state:'visible'});
   await dock.click();
   assert.equal(await page.locator('#loox-sitewide-drawer').getAttribute('class').then(v=>v.includes('is-open')),true,'Sidebar inaccessible in '+route+' at '+width);checks++;
   await dock.click();
   const sidebar=page.locator('button.studio-sidebar-menu-action');
   assert.equal(await sidebar.count(),1,'Sidebar menu fallback is missing in '+route);checks++;
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
