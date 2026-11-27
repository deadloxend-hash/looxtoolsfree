// Synthetic authenticated UI. Every API call is intercepted; no real credentials or deletions.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const id='00000000-0000-4000-8000-000000000001';
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
try{
 for(const width of [320,360,393,768,1365]){
  const context=await browser.newContext({viewport:{width,height:850},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();
  await page.addInitScript(id=>localStorage.setItem('loox-account-v1',JSON.stringify({access_token:'synthetic-test-token',user:{id,email:'fixture@example.com'},expires_at:Math.floor(Date.now()/1000)+3600})),id);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('UI error: '+e.message);});let needsSupport=false,exportCalls=0;
  await page.route('**/vendor/supabase-2.118.0.js',route=>route.fulfill({contentType:'application/javascript',body:`window.supabase={createClient(){let verified=false;const session={access_token:'synthetic-test-token',user:{id:'${id}',email:'fixture@example.com',email_confirmed_at:'2026-11-01T00:00:00Z'}};return {auth:{onAuthStateChange(callback){setTimeout(()=>callback('INITIAL_SESSION',session),0);return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),signInWithPassword:async()=>({data:{user:session.user,session}}),signOut:async()=>({}),mfa:{listFactors:async()=>({data:{totp:verified?[{id:'factor-fixture',status:'verified'}]:[]}}),enroll:async()=>({data:{id:'factor-fixture',totp:{qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224"></svg>'}}}),challengeAndVerify:async({code})=>{if(code!=='123456')return {error:{message:'Wrong code'}};verified=true;return {data:{}};},unenroll:async()=>({})}}}}};`}));
  await page.route('https://loox-profile-api.looxai-studio.workers.dev/**',r=>r.fulfill({json:{user_id:id,display_name:'Fixture',profile:{user_id:id,display_name:'Fixture'}}}));
  await page.route('https://looxtoolfree-backend.vercel.app/api/**',async route=>{
   const action=new URL(route.request().url()).searchParams.get('action');let result;
   switch(action){
    case 'config':result={auth:true,url:'https://fixture.supabase.co',key:'public-fixture',billing:false,plans:[],operations:[]};break;
    case 'account':result={profile:{name:'Fixture'},wallet:{balance:25},plan:'free',subscriptions:[],credits:[],payments:[]};break;
    case 'security_summary':result={deletion:{requires_support:needsSupport},sessions:[{current:true,created_at:'2026-11-01T00:00:00Z',refreshed_at:'2026-11-21T12:00:00Z',user_agent:'Fixture browser <script>unsafe</script>'}],activity:[{action:'login',created_at:'2026-11-21T12:00:00Z'}]};break;
    case 'auth_factor':assert.equal(route.request().method(),'POST');assert.equal(route.request().postDataJSON().password,'fixture-only-password');assert.equal(route.request().postDataJSON().operation,'enroll');result={id:'factor-fixture',totp:{qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224"></svg>'}};break;
    case 'export_account':assert.equal(route.request().method(),'POST');assert.equal(route.request().postDataJSON().password,'fixture-only-password');exportCalls++;result={account:{id},media:[],media_links_expire_at:new Date(Date.now()+299000).toISOString(),records:{profile:{name:'Fixture'}}};break;
    case 'billing_catalog':result={paymentsEnabled:false,creditTopupsEnabled:false,packages:[]};break;
    default:assert.equal(route.request().method(),'GET','No mutation permitted in this UI audit');result=[];
   }
   await route.fulfill({json:result});
  });
  await page.goto(base+'settings.html#devices');
  await page.getByText('This browser session',{exact:true}).waitFor();
  assert.equal(await page.locator('#lp-security-sessions script').count(),0,'User-agent text must not execute HTML');
  assert.match(await page.locator('#lp-security-activity').innerText(),/login/);
  assert.equal(await page.locator('#lp-delete-open').isEnabled(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Settings overflow at '+width);
  await page.goto(base+'settings.html#data-controls');
  await page.locator('#lp-data-export').click();
  const dialog=page.locator('dialog[open]');await dialog.waitFor({timeout:8000}).catch(async error=>{console.error(JSON.stringify({width,errors,dialogs:await page.locator('dialog').evaluateAll(nodes=>nodes.map(n=>({open:n.open,hidden:n.hidden,display:getComputedStyle(n).display,text:n.textContent.slice(0,160)})))}));throw error;});
  await dialog.getByLabel('Confirm your LOOX password').fill('fixture-only-password');
  const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Verify and prepare downloads'}).click();
  assert.match((await download).suggestedFilename(),/^loox-personal-data-.*\.json$/);assert.equal(exportCalls,1);
  await dialog.getByText('Personal-data JSON is ready. No private media files were found.',{exact:true}).waitFor();
  assert.equal(await dialog.getByLabel('Confirm your LOOX password').inputValue(),'');
  const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await dialog.getByRole('button',{name:'Close dialog'}).click();
  await page.goto(base+'settings.html#security');
  await page.locator('#lp-mfa-enable').click();
  const setup=page.locator('dialog[open]');await setup.getByLabel('Current LOOX password').fill('fixture-only-password');
  await setup.getByRole('button',{name:'Verify identity',exact:true}).click();
  await setup.getByLabel('Authenticator code').fill('654321');await setup.getByRole('button',{name:'Enable authenticator',exact:true}).click();
  await setup.getByText('Wrong code',{exact:true}).waitFor();
  await setup.getByLabel('Authenticator code').fill('123456');await setup.getByRole('button',{name:'Enable authenticator',exact:true}).click();
  await page.getByText('Authenticator enabled. Your next sign-in will request a code.',{exact:true}).waitFor();
  assert.equal(await page.locator('#lp-mfa-enable').isHidden(),true);
  assert.equal(await page.locator('.lp-mfa-qr').count(),0,'Setup QR must be removed after verification');
  needsSupport=true;await page.goto(base+'settings.html#data-controls');await page.reload();await page.getByText(/This account needs a verified support review/).waitFor();
  assert.equal(await page.locator('#lp-delete-open').isDisabled(),true);
  assert.deepEqual(errors,[]);await context.close();
  console.log('Account security, record export, safe rendering and deletion eligibility passed at '+width+'px');
 }
}finally{await browser.close();}
