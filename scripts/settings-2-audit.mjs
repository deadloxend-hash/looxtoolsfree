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
}finally{await browser.close();}
