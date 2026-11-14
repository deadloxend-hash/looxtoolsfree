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
 console.log('Billing UI: '+checks+' checks passed at 360, 390, 768 and 1440 pixels.');
}finally{await browser.close();}
