// Synthetic read-only browser audit: never mutates production Community posts.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const root=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const ownerId='11111111-1111-4111-8111-111111111111';
const visitorId='22222222-2222-4222-8222-222222222222';
const postId='33333333-3333-4333-8333-333333333333';
let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
catch{browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}

let checks=0;
async function test(pageName,width,owner){
 const ctx=await browser.newContext({viewport:{width,height:860},reducedMotion:'reduce'});
 const page=await ctx.newPage();
 await page.route('**/platform/community-page.js?v=*',route=>route.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.route('**/platform/creator.js?v=*',route=>route.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.route('**/platform/community-watch.js?v=*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export function trackMeaningfulView(){}'}));
 await page.route('**/platform/profile-cloudflare.js?v=*',route=>route.fulfill({
  status:200,contentType:'text/javascript',
  body:"export async function cloudRequest(state,path,opts={}){if(path==='post')return {id:opts.query?.id};if(path==='profile')return {followed:false};if(path==='save'||path==='like')return {saved:true};if(path==='profiles')return {profiles:[]};return {items:[]};}"
 }));
 await page.route(/\/(loox-experience|loox-sitewide-nav)\.js\?/,route=>route.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.goto(root+pageName,{waitUntil:'load'});
 await page.evaluate(async({owner,ownerId,visitorId,postId})=>{
  const {installSocial}=await import('/platform/community-social.js?v=16');
  const e=(tag,cls='',content)=>{const n=document.createElement(tag);n.className=cls;if(content!==undefined)n.textContent=content;return n;};
  const a=(label,fn,cls='',onError=console.error)=>{
   const b=e('button',cls,label);b.type='button';
   b.addEventListener('click',()=>Promise.resolve().then(fn).catch(onError));return b;
  };
  const modal=title=>{
   const d=e('dialog','community-dialog'),header=e('div','community-dialog-head');
   header.append(e('h2','',title),a('×',()=>d.close(),'community-close'));
   d.append(header);d.addEventListener('close',()=>d.remove(),{once:true});
   document.body.append(d);d.showModal();return d;
  };
  const post={id:postId,creator_id:ownerId,media_type:'image',media_path:'preview.webp',
   caption:'Boy Running in Horizon',shared_prompt:'A dramatic sunset landscape',
   created_at:'2026-11-09T00:00:00.000Z',username:'test_creator',display_name:'Test Creator',
   avatar_path:null,allow_download:true,allow_remix:true,comments:2,likes:3,liked:false,saved:false};
  class Community {
   constructor(){this.state={user:{id:owner?ownerId:visitorId},config:{models:[]}};this.posts=[{...post,id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},post,{...post,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}];this.pendingLikes=new Set();}
   auth(){window.__authCalled=true;}
   modelName(){return 'Test model';}
   async like(p,b){p.liked=!p.liked;p.likes+=p.liked?1:-1;b.textContent=p.liked?'♥ 4':'♡ 3';b.setAttribute('aria-pressed',String(p.liked));}
   async load(){window.__reloads=(window.__reloads||0)+1;}
   async mobileDetails(){window.__mobileDetails=(window.__mobileDetails||0)+1;}
   async mobileComments(){window.__mobileComments=(window.__mobileComments||0)+1;}
  }
  installSocial(Community,{element:e,action:a,rpc:async()=>null,result:x=>x,mediaURL:async()=>{
   return 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22400%22%20height=%22280%22%3E%3Crect%20width=%22400%22%20height=%22280%22%20fill=%22%233f3052%22/%3E%3C/svg%3E';
  },modal,field:()=>e('input')});
  const instance=new Community();
  instance.comments=async(_post,host)=>{window.__commentsLoaded=(window.__commentsLoaded||0)+1;host.append(e('p','test-comments','Mock comments loaded'));};
  window.__testPost=post;window.__testViewer=instance;
  await instance.details(post);
 },{owner,ownerId,visitorId,postId});

 const viewer=page.locator('.community-viewer.loox-viewer-media-first');
 await viewer.waitFor({state:'visible'});
 const centered=await viewer.boundingBox();
 assert.ok(Math.abs(centered.y+centered.height/2-860/2)<14,'Photo viewer is top-aligned instead of vertically centered: '+JSON.stringify(centered));checks++;
 assert.equal(await viewer.locator('.community-viewer-stage .community-detail-media').count(),1);checks++;
 assert.equal(await viewer.locator('.community-viewer-info').isHidden(),true,'Only media should show by default');checks++;
 assert.equal(await viewer.locator('.loox-social-photo-actions').count(),0,'Old icon toolbar must be absent');checks++;
 assert.equal(await viewer.locator('.community-viewer-controls button').count(),0,'Old Full screen and Next controls must be in menu');checks++;
 assert.equal(await viewer.locator('.loox-viewer-options-list').isVisible(),false);checks++;
 assert.equal(await viewer.locator('.community-detail-media').getAttribute('src')!==null,true,'Post media missing');checks++;
 assert.equal(await viewer.locator('.community-viewer-stage').isVisible(),true,'Backdrop must not cover an empty modal');checks++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+8),true,'Page horizontal overflow');checks++;
 await viewer.locator('.loox-viewer-options-trigger').click();
 assert.equal(await viewer.locator('.loox-viewer-options-list').isVisible(),true);checks++;
 assert.equal(await viewer.getByRole('button',{name:'Edit title'}).count(),owner?1:0,'Owner-only edit title');checks++;
 assert.equal(await viewer.getByRole('button',{name:'Delete post'}).count(),owner?1:0,'Owner-only delete post');checks++;
 assert.equal(await viewer.getByRole('button',{name:'Previous post'}).count(),1,'Middle post should expose Previous');checks++;
 assert.equal(await viewer.getByRole('button',{name:'Next post'}).count(),1,'Middle post should expose Next');checks++;
 const like=viewer.getByRole('button',{name:'Like post',exact:true});
 await like.click();
 await viewer.locator('.loox-viewer-options-trigger').click();
 assert.equal(await viewer.getByRole('button',{name:'Unlike post'}).count(),1,'Like action retains label and icon');checks++;
 assert.equal(await viewer.locator('.loox-viewer-options-list .loox-viewer-options-icon svg').count()>4,true);checks++;
 await viewer.getByRole('button',{name:'View details'}).click();
 if(pageName==='community.html'&&width<=700){
  assert.equal(await page.evaluate(()=>window.__mobileDetails),1);checks++;
  assert.equal(await viewer.locator('.community-viewer-info').isHidden(),true);checks++;
 }else{
  assert.equal(await viewer.locator('.community-viewer-info').isVisible(),true);checks++;
 }
 await viewer.locator('.loox-viewer-options-trigger').click();
 await viewer.getByRole('button',{name:'View comments'}).click();
 if(pageName==='community.html'&&width<=700){
  assert.equal(await page.evaluate(()=>window.__mobileComments),1);checks++;
  await page.locator('.community-viewer').waitFor({state:'detached',timeout:5000});checks++;
 }else{
  await viewer.getByText('Mock comments loaded').waitFor();checks++;
 }
 await ctx.close();
}
try{
 await test('community.html',393,true);
 await test('community.html',1200,false);
 await test('creator.html',393,true);
 console.log('COMMUNITY VIEWER AUDIT PASS: '+checks+' checks of media-only presentation, owner actions, likes, details, comments and mobile layout.');
}catch(err){console.error('COMMUNITY VIEWER AUDIT FAILED:',err);process.exitCode=1;}
finally{await browser.close();}
