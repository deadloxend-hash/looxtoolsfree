/* CI responsive regression for the Utilities discovery dashboard. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const ROOT=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
mkdirSync('audit-artifacts',{recursive:true});
let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
catch{browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
let checks=0;
async function test(width){
 const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
 try{
 await page.goto(ROOT+'index.html',{waitUntil:'domcontentloaded',timeout:25000});
 const visibleCards='#toolGrid .ut-card:not([hidden])';await page.locator(visibleCards).first().waitFor({timeout:18000});
 assert.equal(await page.locator('h1').count(),1);checks++;
 assert.equal(await page.locator('[data-tool-id]').count(),122);checks++;
 assert.equal(await page.locator(visibleCards).count(),24);checks++;
 assert.equal(await page.locator('#comingGrid .ut-card').count(),8);checks++;
 assert.equal(await page.locator('.ut-cover').count(),122,'Keep the tool cover photos');checks++;
 const firstCover=page.locator(visibleCards+' .ut-cover').first();await firstCover.evaluate(img=>img.decode());assert.ok(await firstCover.evaluate(img=>img.naturalWidth>0));checks++;
 assert.equal(await page.locator('.ut-studio').count(),5);checks++;
 assert.equal(await page.locator('#toolSearchForm').count(),1);checks++;
 assert.ok(await page.locator('.ut-hero').evaluate(el=>el.getBoundingClientRect().height<340));checks++;
 assert.ok(await page.locator('#toolSearch').evaluate(el=>el.getBoundingClientRect().top<360));checks++;
 assert.ok(await page.locator('.ut-hero-art').evaluate(img=>img.complete&&img.naturalWidth>0)||width<768);checks++;
 assert.ok(await page.locator('.loox-sitewide-dock-toggle').isHidden(),'Blue edge grip should be hidden');checks++;
 await page.locator('#toolSearch').fill('remove background');
 await page.waitForFunction(()=>document.querySelectorAll('#toolGrid .ut-card:not([hidden])').length===1);
 assert.equal(await page.locator(visibleCards+' .ut-tool-link').getAttribute('href'),'bg-remove.html');checks++;
 await page.locator('#toolSearch').press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'bg-remove.html');checks++;
 await page.locator('#clearSearch').click();
 await page.locator('[data-category="Video Utilities"]').click();assert.ok(await page.locator(visibleCards).count()>0);checks++;
 assert.match(page.url(),/category=Video/);checks++;
 await page.locator('[data-category="All"]').click();await page.locator('#loadMoreTools').click();assert.equal(await page.locator(visibleCards).count(),48);checks++;
 await page.locator('[data-save="photo-editor.html"]').click();await page.locator('[data-view="favorites"]').click();assert.equal(await page.locator(visibleCards).count(),1);checks++;
 await page.locator('[data-save="photo-editor.html"]').click();assert.ok(await page.locator('#emptyResults').isVisible());checks++;
 await page.locator('#resetDiscovery').click();
 const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth}));assert.ok(Math.max(overflow.page,overflow.body)<=width+1,JSON.stringify({width,overflow}));checks++;
 await page.goto(ROOT+'index.html?category=PDF#tools',{waitUntil:'domcontentloaded'});await page.locator('[data-category="PDF & Documents"][aria-pressed="true"]').waitFor();assert.equal(await page.locator(visibleCards).count(),4);checks++;
 await page.goto(ROOT+'index.html?q=compress',{waitUntil:'domcontentloaded'});await page.locator(visibleCards).first().waitFor();assert.ok(await page.locator('#clearSearch').isVisible());checks++;
 await page.locator('#clearSearch').click();
 assert.deepEqual(errors,[],'Dashboard page errors');checks++;
 if([390,768,1440].includes(width))await page.screenshot({path:'audit-artifacts/tools-home-'+width+'.png',fullPage:true,animations:'disabled'});
 }finally{await ctx.close()}
}
try{for(const width of [320,360,390,430,768,1024,1440,1920])await test(width);console.log('UTILITIES DASHBOARD AUDIT PASS: '+checks+' assertions at eight native viewport widths.');}
catch(error){console.error('UTILITIES DASHBOARD AUDIT FAILED:',error);process.exitCode=1;}
finally{await browser.close();}
