import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
try{
 for(const viewport of [{width:360,height:800},{width:393,height:873},{width:873,height:393},{width:768,height:1024},{width:1365,height:900}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
  await page.route('https://looxtoolfree-backend.vercel.app/api/loox?*',r=>r.fulfill({json:{auth:false,ai:false,billing:false,plans:[],operations:[]}}));
  await page.goto(base+'cookie-settings.html');
  const open=async()=>{await page.getByRole('button',{name:'Customize privacy preferences',exact:true}).click();await page.locator('#loox-privacy-dialog').waitFor();};
  const inputs=()=>page.locator('#loox-privacy-dialog input[type=checkbox]');
  assert.equal(await page.locator('[data-loox-consent-banner]').count(),0,'Essential-only release must not force a misleading banner');
  await open();assert.equal(await inputs().count(),4);assert.equal(await inputs().nth(0).isChecked(),true);assert.equal(await inputs().nth(0).isDisabled(),true);
  const bounds=await page.locator('#loox-privacy-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1);assert.ok(bounds.y>=0&&bounds.height<=viewport.height+1);
  await page.getByRole('button',{name:'Accept All',exact:true}).click();await page.reload();await open();
  for(let i=1;i<4;i++)assert.equal(await inputs().nth(i).isChecked(),true);
  await page.getByRole('button',{name:'Reject Optional',exact:true}).click();await page.reload();await open();
  for(let i=1;i<4;i++)assert.equal(await inputs().nth(i).isChecked(),false);
  await inputs().nth(1).check();await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  await page.goto(base+'privacy-policy.html');assert.equal(await page.locator('[data-loox-consent-banner]').count(),0);
  await page.goto(base+'cookie-settings.html');await open();assert.equal(await inputs().nth(1).isChecked(),true);assert.equal(await inputs().nth(2).isChecked(),false);assert.equal(await inputs().nth(3).isChecked(),false);
  await page.getByRole('button',{name:'Close',exact:true}).click();await context.close();
  console.log('Privacy consent persistence, withdrawal and dialog bounds passed at '+viewport.width+'×'+viewport.height);
 }
}finally{await browser.close();}
