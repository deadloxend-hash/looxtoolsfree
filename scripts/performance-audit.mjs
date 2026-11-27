// Repeatable lab observations only. This is not field Core Web Vitals data.
import {chromium} from 'playwright';
import fs from 'node:fs';
const baseline=process.env.LOOX_BASELINE_URL,candidate=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const rows=[];let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}catch{browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
try{for(const [label,base] of [['before',baseline],['after',candidate]]){if(!base)continue;for(const width of [390,1440])for(const file of ['index.html','ai-image-landing.html','settings.html#billing']){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
 // Offline account fixture prevents production writes and makes comparisons reproducible.
 await page.route('https://looxtoolfree-backend.vercel.app/api/**',r=>r.fulfill({json:{auth:false,billing:false,plans:[],operations:[],models:[],videoModels:[],local:{available:false}}}));
 await page.addInitScript(()=>{window.__lab={lcp:null,cls:0,longTasks:0,interaction:null};for(const [type,fn] of [['largest-contentful-paint',e=>window.__lab.lcp=e.startTime],['layout-shift',e=>{if(!e.hadRecentInput)window.__lab.cls+=e.value;}],['longtask',e=>window.__lab.longTasks+=e.duration],['event',e=>{if(e.interactionId)window.__lab.interaction=Math.max(window.__lab.interaction||0,e.duration);} ]]){try{new PerformanceObserver(list=>list.getEntries().forEach(fn)).observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})});}catch{}}});
 await page.goto(base+file,{waitUntil:'load'});await page.waitForTimeout(1500);
 const toggle=page.getByRole('button',{name:'Show LOOX navigation',exact:true});if(await toggle.count()){await toggle.click();await page.keyboard.press('Escape');}
 await page.waitForTimeout(250);const metrics=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {...window.__lab,ttfb:n.responseStart-n.startTime,domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd,resources:performance.getEntriesByType('resource').length};});
 rows.push({label,width,page:file,...metrics});await context.close();
}}}finally{await browser.close();}
fs.mkdirSync('audit-artifacts',{recursive:true});fs.writeFileSync('audit-artifacts/performance-lab.json',JSON.stringify({kind:'unthrottled Chromium lab samples; one run per page and width; API mocked; interaction is observed Event Timing, not field INP',rows},null,2));console.log(JSON.stringify(rows));
