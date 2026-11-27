// Disposable browser contexts and intercepted network only; no production credentials.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
try{
 for(const width of [320,360,393,768,1365]){
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://looxtoolfree-backend.vercel.app/**',r=>r.fulfill({json:{auth:false,billing:false,operations:[],imageModels:[],videoModels:[]}}));
  await page.goto(base+'settings.html');await page.locator('.s2-category').last().waitFor();
  assert.equal(await page.locator('.s2-category').count(),15);
  for(const id of ['general','personalization','profile','ai-preferences','notifications','data-controls','privacy','security','devices','connected','billing','storage','accessibility','help','about']){
   await page.goto(base+'settings.html#'+id);await page.locator('#s2-'+id).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow in '+id+' at '+width);
   const panel=await page.locator('#s2-'+id).boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=width+1);
  }
  await page.goto(base+'settings.html#accessibility');await page.getByRole('switch',{name:'Reduced motion',exact:true}).check();
  await page.reload();await page.getByRole('switch',{name:'Reduced motion',exact:true}).waitFor();assert.equal(await page.getByRole('switch',{name:'Reduced motion',exact:true}).isChecked(),true);
  await mkdir('audit-artifacts',{recursive:true});await page.goto(base+'settings.html');await page.locator('.s2-sidebar').waitFor();await page.screenshot({path:'audit-artifacts/settings-2-'+width+'.png',fullPage:true});
  await page.getByRole('searchbox',{name:'Search settings'}).fill('password');assert.ok(await page.locator('.s2-category:visible').count()>0);assert.ok(await page.locator('.s2-category:visible').count()<15);
  await page.getByRole('searchbox',{name:'Search settings'}).fill('does-not-exist-unique');await page.locator('.s2-no-results').waitFor();
  assert.deepEqual(errors,[]);await context.close();console.log('Settings 2.0: 15 categories, search, accessibility persistence and overflow passed at '+width+'px');
 }

// A failed wallet must not block profile/security; a manual retry must recover.
{
 let calls=0;
 const context=await browser.newContext({viewport:{width:360,height:850}}),page=await context.newPage();
 await page.route('**/vendor/supabase-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:`window.supabase={createClient(){const session={access_token:'fixture-token',user:{id:'00000000-0000-4000-8000-000000000001',email:'fixture@example.com',email_confirmed_at:'2026-11-01'}};return {auth:{onAuthStateChange(){return {}},getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),mfa:{listFactors:async()=>({data:{totp:[]}})}}}}};`}));
 await page.route('https://loox-profile-api.looxai-studio.workers.dev/**',r=>r.fulfill({json:{username:'fixture',display_name:'Fixture',notifications_enabled:true,is_private:true}}));
 await page.route('https://looxtoolfree-backend.vercel.app/**',r=>{
  const action=new URL(r.request().url()).searchParams.get('action');
  if(action==='config')return r.fulfill({json:{auth:true,url:'https://fixture.supabase.co',key:'public-fixture',billing:false}});
  if(action==='account'){calls++;if(calls<=2)return r.fulfill({status:503,json:{error:'Billing temporarily unavailable.'}});return r.fulfill({json:{profile:{name:'Fixture'},wallet:{balance:47},plan:'basic',credits:[],payments:[],subscriptions:[]}});}
  if(action==='security_summary')return r.fulfill({json:{sessions:[],activity:[],deletion:{requires_support:true}}});
  return r.fulfill({json:{items:[]}});
 });
 await page.goto(base+'settings.html#billing');await page.getByText('Billing temporarily unavailable.',{exact:true}).waitFor();
 assert.equal(calls,2,'Exactly one automatic wallet retry is allowed');
 await page.getByRole('button',{name:'Retry billing',exact:true}).click();
 await page.locator('#lp-billing-balance').getByText('47',{exact:true}).waitFor();assert.equal(calls,3);
 await context.close();console.log('Billing failure recovery: bounded automatic retry and manual retry preserved the authoritative balance.');
}

}finally{await browser.close();}
