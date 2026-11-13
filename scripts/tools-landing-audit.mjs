/* LOOX All Tools landing: non-destructive responsive and interaction regression. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const ROOT=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
mkdirSync('audit-artifacts',{recursive:true});
let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
catch{browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
let checks=0;
async function test(width,height,screenName){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 await page.goto(ROOT+'index.html',{waitUntil:'domcontentloaded',timeout:25000});
 await page.locator('.tool-card').first().waitFor({timeout:18000});
 const hero=page.locator('.hero');
 assert.equal(await page.locator('h1').count(),1,'Landing must have one primary heading');checks++;
 assert.match(await hero.locator('h1').innerText(),/Big ideas\.[\s\S]*Better tools\.[\s\S]*All in one place\./);checks++;
 assert.equal(await page.locator('#searchForm,.search-panel').count(),0,'Redundant Find a tool bar was not removed');checks++;
 assert.equal(await page.locator('.lt-action-primary').getAttribute('href'),'#tools');checks++;
 assert.equal(await page.locator('.lt-action-secondary').getAttribute('href'),'photo-editor.html');checks++;
 const mainCover=page.locator('.lt-showcase-main img');
 await mainCover.scrollIntoViewIfNeeded();
 await mainCover.evaluate(img=>img.decode());
 assert.ok(await mainCover.evaluate(img=>img.naturalWidth>0),'Hero photo editor cover must load');checks++;
 assert.match(await page.locator('.lt-showcase-main').getAttribute('href'),/photo-editor\.html/);checks++;
 const covers=page.locator('.loox-featured-card .loox-featured-art img');
 assert.equal(await covers.count(),3,'Preserve image-based editing tool covers');checks++;
 for(let i=0;i<3;i++){
  const cover=covers.nth(i);await cover.scrollIntoViewIfNeeded();
  await cover.evaluate(img=>img.decode());
  assert.ok(await cover.evaluate(img=>img.naturalWidth>0),'Featured cover '+i+' broken');checks++;
 }
 assert.equal(await page.locator('#favorites').isHidden(),true,'Empty favorites should not create page gap');checks++;
 assert.equal(await page.locator('#recent').isHidden(),true,'Empty recent list should not create page gap');checks++;
 assert.equal(await page.locator('.quick-card').count(),6);checks++;
 let cardCount=await page.locator('#toolGrid .tool-card').count();
 assert.equal(cardCount,15,'All category should initially show 15 tools, got '+cardCount);checks++;
 assert.ok(await page.locator('#toolGrid .loox-card-cover').count()>=6,'Tool catalog should preserve artwork previews');checks++;
 // Browse from a category tile; there should be no dead navigation or filter.
 await page.locator('.quick-card[data-quick-cat="Video"]').click();
 await page.locator('#filters [data-cat="Video"].active').waitFor({timeout:7000});
 assert.ok((await page.locator('#toolGrid .tool-card').count())>0,'Video category is empty');checks++;
 assert.match(page.url(),/category=Video/);checks++;
 await page.locator('#filters [data-cat="All"]').click();
 await page.locator('#loadMore').waitFor({state:'visible'});
 await page.locator('#loadMore').click();
 assert.ok(await page.locator('#toolGrid .tool-card').count()>15,'Load more failed');checks++;
 await page.locator('#toolGrid .favorite-btn').first().click();
 assert.equal(await page.locator('#favorites').isVisible(),true,'Favorites not revealed after saving');checks++;
 assert.ok(await page.locator('#favGrid .personal-card').count()>0,'Saved favorite not shown');checks++;
 assert.equal(await page.locator('a.loox-featured-card[href="photo-editor.html"]').count(),1,'Editor cover card missing');checks++;
 const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:window.innerWidth}));
 if(Math.max(overflow.page,overflow.body)>overflow.viewport+7){
 const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{
  const r=el.getBoundingClientRect(),css=getComputedStyle(el);
  return r.right>innerWidth+10&&r.width>30&&css.display!=='none'&&css.visibility!=='hidden';
 }).slice(0,25).map(el=>({tag:el.tagName,class:el.className?.toString().slice(0,100),width:Math.round(el.getBoundingClientRect().width),right:Math.round(el.getBoundingClientRect().right),position:getComputedStyle(el).position})));
 console.log('OVERFLOW DEBUG',JSON.stringify({width,overflow,offenders}));
}
 assert.ok(Math.max(overflow.page,overflow.body)<=overflow.viewport+7,'Horizontal page overflow: '+JSON.stringify(overflow));checks++;
 assert.deepEqual(errors,[],'Page JS errors');checks++;
 await page.goto(ROOT+'index.html?category=PDF#tools',{waitUntil:'domcontentloaded'});
 await page.locator('#filters [data-cat="PDF"].active').waitFor({timeout:7000});
 assert.ok((await page.locator('#toolGrid .tool-card').count())>0,'Category deep linking not working');checks++;
 await page.goto(ROOT+'index.html?q=compress',{waitUntil:'domcontentloaded'});
 await page.locator('#toolGrid .tool-card').first().waitFor();
 assert.match(await page.locator('#toolsTitle').innerText(),/Search results/);checks++;
 await page.goto(ROOT+'index.html',{waitUntil:'domcontentloaded'});
 await page.locator('.lt-showcase-main img').waitFor({state:'visible'});
 await page.screenshot({path:'audit-artifacts/tools-home-'+screenName+'.png',fullPage:true,animations:'disabled'});
 await ctx.close();
}
try{
 await test(393,850,'mobile');
 await test(768,1024,'tablet');
 await test(1365,900,'desktop');
 console.log('TOOLS LANDING AUDIT PASS: '+checks+' assertions across phone, tablet and desktop; gallery artwork preserved.');
}catch(error){console.error('TOOLS LANDING AUDIT FAILED:',error);process.exitCode=1;}
finally{await browser.close();}
