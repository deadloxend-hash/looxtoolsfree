// Browser regression test for the real comment renderer using fake data only.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const me='11111111-1111-4111-8111-111111111111';
const postId='33333333-3333-4333-8333-333333333333';
const cloud=[
 "export async function cloudRequest(state,path,opts={}){",
 " if(path==='profiles')return {profiles:[{user_id:'11111111-1111-4111-8111-111111111111',display_name:'Creator',username:'creator',avatar_path:null}]};",
 " if(path==='comments'){",
 "  if(opts.method==='POST'){",
 "   window.__submitted.push(opts.data);",
 "   const c={id:'44444444-4444-4444-8444-444444444444',post_id:opts.data.post_id,user_id:opts.data.user_id,body:opts.data.body,parent_id:opts.data.parent_id||null,created_at:new Date().toISOString()};",
 "   if(c.parent_id)window.__replies.push(c);else window.__parents.push(c);return {saved:true};",
 "  }",
 "  if(opts.method==='DELETE')return {deleted:true};",
 "  return {items:opts.query?.kind==='replies'?window.__replies:window.__parents};",
 " }",
 " throw Error('Unexpected comment API call '+path);",
 "}"
].join('\n');
let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
catch{browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
let checks=0;
async function audit(width){
 const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
 const page=await ctx.newPage();
 const errs=[];page.on('pageerror',err=>errs.push(err.message));
 await page.route('**/platform/creator.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.route('**/platform/profile-cloudflare.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:cloud}));
 await page.route('**/platform/community-watch.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:'export function trackMeaningfulView(){}'}));
 await page.route(/\/(loox-experience|loox-sitewide-nav)\.js\?/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.goto(base+'creator.html',{waitUntil:'load'});
 await page.evaluate(async({me,postId})=>{
  window.__submitted=[];
  const stamp=new Date(Date.now()-2*3600000).toISOString();
  window.__parents=[
   {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',post_id:postId,user_id:me,body:'This is a sample comment',created_at:stamp},
   {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',post_id:postId,user_id:me,body:'A second comment',created_at:stamp}
  ];
  window.__replies=[
   {id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',post_id:postId,user_id:me,body:'This is a reply',parent_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',created_at:stamp}
  ];
  const {installSocial}=await import('/platform/community-social.js?v=16');
  const e=(tag,cls='',text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const a=(text,fn,cls='',onError=console.error)=>{
   const btn=e('button',cls,text);btn.type='button';
   btn.addEventListener('click',()=>Promise.resolve().then(fn).catch(onError));return btn;
  };
  class Community{auth(){throw Error('Unexpected sign-in');}}
  installSocial(Community,{element:e,action:a,rpc:async()=>({}),result:x=>x,mediaURL:async()=>'',modal:()=>{},field:()=>{}});
  const instance=new Community();instance.state={user:{id:me}};instance.report=async()=>{};
  const post={id:postId,creator_id:me,comments:3,comments_enabled:true};
  const d=e('dialog','cx-edit-dialog cx-comments-dialog'),wrap=e('div','cx-dialog-content');
  const head=e('div','cx-dialog-top');head.append(e('h2','','Comments'));
  const content=e('div','cx-comments-content');
  wrap.append(head,content);d.append(wrap);document.body.append(d);d.showModal();
  await instance.comments(post,content);
 },{me,postId});
 const sheet=page.locator('.cx-comments-dialog');
 await sheet.locator('.loox-comment-thread').first().waitFor();
 assert.equal(await sheet.locator('.loox-comment-thread').count(),2);checks++;
 assert.equal(await sheet.locator('.community-comment.is-reply').count(),1);checks++;
 const time=(await sheet.locator('.loox-comment-date').first().innerText()).trim();
 assert.match(time,/^\d+h$/,'Comment dates should be short');checks++;
 const list=sheet.locator('.loox-thread-list');
 assert.equal(await list.evaluate(el=>getComputedStyle(el).overflowY),'auto','Threads need independent scrolling');checks++;
 const form=sheet.locator('.loox-compact-comment-form');
 const box=await sheet.boundingBox(),composer=await form.boundingBox();
 assert.ok(composer.y>=box.y&&composer.y+composer.height<=box.y+box.height+3,'Composer must remain inside sheet');checks++;
 if(width<700){assert.ok(box.y>85,'Leave space above mobile comments sheet');checks++;}
 const input=sheet.getByRole('textbox',{name:'Your comment'}),cancel=sheet.locator('.loox-comment-cancel');
 assert.equal(await cancel.isHidden(),true);checks++;
 await input.fill('Draft to cancel');
 assert.equal(await cancel.isVisible(),true);checks++;
 await cancel.click();
 assert.equal(await input.inputValue(),'');checks++;
 assert.equal(await cancel.isHidden(),true);checks++;
 await sheet.locator('.loox-comment-action').filter({hasText:'Reply'}).first().click();
 assert.match(await input.getAttribute('placeholder'),/Reply to @/);checks++;
 assert.equal(await sheet.locator('.loox-comment-send').innerText(),'Reply');checks++;
 await input.fill('Draft reply');
 await sheet.locator('.loox-reply-cancel').click();
 assert.equal(await sheet.locator('.loox-comment-send').innerText(),'Post');checks++;
 await input.fill('New public comment');
 await sheet.locator('.loox-comment-send').click();
 await page.waitForFunction(()=>window.__submitted?.length===1);
 assert.equal(await page.evaluate(()=>window.__submitted[0].body),'New public comment');checks++;
 await sheet.getByText('New public comment').waitFor();checks++;
 assert.deepEqual(errs,[],'Unexpected browser JS errors');checks++;
 await ctx.close();
}
try{
 await audit(393);await audit(1200);
 console.log('COMMENT SHEET AUDIT PASS: '+checks+' checks: mobile/desktop, timestamps, replies, draft cancellation, posting and scroll.');
}catch(error){console.error('COMMENT SHEET AUDIT FAILED:',error);process.exitCode=1;}
finally{await browser.close();}
