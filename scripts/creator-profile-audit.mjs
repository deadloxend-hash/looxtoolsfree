// Read-only synthetic profile browser checks: no production accounts, no mutations.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const root=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const me='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const icon='data:image/svg+xml,%3Csvg%20xmlns="http://www.w3.org/2000/svg"%20width="400"%20height="230"%3E%3Crect%20width="400"%20height="230"%20fill="%235e3972"/%3E%3C/svg%3E';
const portraitIcon='data:image/svg+xml,%3Csvg%20xmlns="http://www.w3.org/2000/svg"%20width="230"%20height="400"%3E%3Crect%20width="230"%20height="400"%20fill="%235e3972"/%3E%3C/svg%3E';
const accountModule=[
 "export const state={user:{id:'"+me+"'},client:{from:()=>({insert:async()=>{window.__p.followed=true;return {data:{},error:null};},delete:()=>({eq:()=>({eq:async()=>{window.__p.followed=false;return {data:{},error:null};}})}),select:()=>({eq:()=>({order:()=>({range:async()=>({data:window.__replies,error:null})})})})})}};",
 "export function auth(){}",
 "export async function initialize(){}",
 "export async function refresh(){}",
 "export async function buyCredits(){window.__buyCredits=(window.__buyCredits||0)+1;}",
 "export async function api(action,body){window.__calls.push(action);if(action==='community_pin'){window.__p.pinned_post_id=body.post;}if(action==='community_details'){window.__p.profile_location=body.location;window.__p.profile_website=body.website;}if(action==='community_cover'){window.__p.cover_key=body.remove?null:'public/avatars/'+window.__p.user_id+'/banner-test.webp';}if(action==='community_avatar'){return {path:window.__p.user_id+'/test.webp'};}return {saved:true};}",
].join('\n');
const communityModule=[
 "export class Community{async details(){window.__details=(window.__details||0)+1;}async comments(post,container){window.__commentOpens=(window.__commentOpens||0)+1;const el=document.createElement('p');el.textContent='Mock Community comments';container.append(el);}async like(p){p.likes++;p.liked=true;}async save(p){p.saved=true;}async connections(){window.__connections=(window.__connections||0)+1;}async notifications(){}async manage(){}async privacy(){}}",
 "export function result(r){if(r.error)throw Error(r.error.message);return r.data;}",
 "export async function rpc(state,method,body){if(method==='loox_creator_summary')return window.__p;if(method==='loox_discover')return {items:window.__posts,has_more:false};if(method==='loox_public_post')return window.__posts[0];if(method==='loox_save_creator'){window.__p.username=body.p_username;window.__p.display_name=body.p_name;window.__p.bio=body.p_bio;window.__p.avatar_path=body.p_avatar;return null;}throw Error('Unexpected RPC: '+method);}",
 "export async function mediaURL(){return '"+icon+"';}"
].join('\n');
const cloudModule=[
 "export async function cloudRequest(state,path,options={}){window.__cloudCalls=(window.__cloudCalls||0)+1;const p=window.__p;if(path==='profile'){if(options.method==='PATCH'){Object.assign(p,options.data);return p;}return p;}if(path==='feed')return {items:window.__posts,has_more:false};if(path==='replies')return {items:window.__replies,has_more:false};if(path==='pin'){p.pinned_post_id=options.data.post_id;return {pinned_post_id:p.pinned_post_id};}if(path==='follow'){p.followed=options.data.follow;p.followers+=p.followed?1:-1;return p;}if(path==='save'||path==='like')return {on:options.data.on};if(path==='manage'){window.__manageCalls=(window.__manageCalls||[]);window.__manageCalls.push(options.data);if(options.data.action==='edit')window.__posts[0].caption=options.data.caption;if(options.data.action==='delete'){window.__posts=[];window.__p.posts=0;}return {saved:true};}if(path==='connections')return {items:[],has_more:false};if(path==='privacy'){Object.assign(p,options.data);return p;}if(path==='notifications')return {items:[]};throw Error('Unexpected cloud action '+path);}",
 "export async function cloudImage(){return '"+icon+"';}",
 "export async function cloudUpload(){return {key:'test.webp'};}",
 "export async function cloudDelete(){return {saved:true};}"
].join('\n');
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
}catch{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
}
let checks=0;
async function profilePage(width,path,portrait=false){
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.addInitScript(({user,post})=>{
  window.__calls=[];window.__details=0;window.__connections=0;
  window.__p={user_id:user,username:'test_creator',display_name:'Test Creator',bio:'Creating a little magic with AI.',avatar_path:'test.webp',created_at:'2026-11-01T00:00:00Z',is_private:false,hide_connections:false,cover_key:'public/avatars/'+user+'/banner-test.webp',posts:1,followers:3,following:2,profile_location:'Somewhere creative',profile_website:'https://example.com',plan_badge:'Basic',pinned_post_id:null,followed:false};
  window.__posts=[{id:post,creator_id:user,username:'test_creator',display_name:'Test Creator',avatar_path:'test.webp',caption:'A new AI landscape',shared_prompt:'A sample generation prompt',created_at:'2026-11-09T00:00:00Z',media_type:'image',media_path:'test.webp',likes:3,comments:2,saved:false,liked:false}];window.__replies=[{id:'44444444-4444-4444-8444-444444444444',post_id:post,body:'Great work!',created_at:'2026-11-10T00:00:00Z'}];
 },{user:path?'22222222-2222-4222-8222-222222222222':me,post:'33333333-3333-4333-8333-333333333333'});
 await page.route('**/platform/account.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:accountModule}));
 await page.route('**/platform/community.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:portrait?communityModule.replace(icon,portraitIcon):communityModule}));
 await page.route('**/platform/profile-cloudflare.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:cloudModule}));
 await page.route(/\/(loox-experience|loox-sitewide-nav)\.js\?/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.goto(root+'creator.html'+(path?'?id='+other:''),{waitUntil:'load'});
 await page.locator('.cx-name-line h2').waitFor({timeout:12000});
 assert.equal(await page.locator('.cx-name-line h2').innerText(),'Test Creator');checks++;
 assert.equal(await page.locator('.cx-post').count(),1);checks++;
 const mediaFrame=page.locator('.cx-post .cx-media-frame').first();
 await page.locator('.cx-post .cx-media-frame.cx-media-ready').waitFor({timeout:12000});
 const bounds=await mediaFrame.boundingBox();
 const targetRatio=portrait?230/400:400/230;
 assert.ok(Math.abs(bounds.width/bounds.height-targetRatio)<.035,
  'Image frame must preserve '+(portrait?'portrait':'landscape')+' dimensions, got '+(bounds.width/bounds.height));checks++;
 const centerBounds=await page.locator('.cx-center').boundingBox();
 assert.ok(bounds.width>=centerBounds.width*.94,'Artwork should fill the feed without a permanent avatar gutter');checks++;
 assert.equal(await mediaFrame.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px','No background frame border around artwork');checks++;
 const smallPrompt=page.locator('.cx-post .cx-prompt');
 assert.equal(await smallPrompt.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px','Prompt should be an inline link without a large outlined box');checks++;
 assert.ok((await smallPrompt.boundingBox()).height<38,'Collapsed prompt control too tall');checks++;
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6,'Horizontal overflow at '+width);checks++;
 assert.equal(await page.locator('.cx-tab').count(),path?3:4);checks++;
 await page.getByRole('button',{name:'Replies',exact:true}).click();
 assert.equal(await page.locator('.cx-reply').count(),1);checks++;
 await page.getByRole('button',{name:'Media',exact:true}).click();
 assert.equal(await page.locator('.cx-media-tile').count(),1);checks++;
 await page.locator('.cx-media-tile .cx-media-frame.cx-media-ready').waitFor({timeout:12000});
 const mediaTile=await page.locator('.cx-media-tile .cx-media-frame').boundingBox();
 assert.ok(Math.abs(mediaTile.width/mediaTile.height-targetRatio)<.035,'Media tab crops natural image orientation');checks++;
 await page.getByRole('button',{name:'Posts',exact:true}).click();
 assert.equal(await page.locator('.cx-post').count(),1);checks++;
 if(!path){
  await page.getByRole('button',{name:'View comments'}).click();
  const sheet=page.locator('dialog.cx-comments-dialog');
  await sheet.getByText('Mock Community comments').waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>window.__commentOpens),1);checks++;
  assert.equal(await sheet.getByRole('button',{name:'Close comments'}).count(),1,'Comments must have an accessible close button');checks++;
  if(width<800){
   const bounds=await sheet.boundingBox();
   assert.ok(bounds.y>85,'The comment sheet should leave a tappable backdrop area above it');checks++;
   await sheet.getByText('Mock Community comments').click();
   assert.equal(await sheet.isVisible(),true,'Tapping inside the comments must not dismiss it');checks++;
   await page.mouse.click(10,30);
   await sheet.waitFor({state:'detached',timeout:5000});checks++;
   await page.getByRole('button',{name:'View comments'}).click();
   await sheet.getByText('Mock Community comments').waitFor({timeout:10000});checks++;
  }
  await sheet.getByRole('button',{name:'Close comments'}).click();
  await sheet.waitFor({state:'detached',timeout:5000});checks++;
  await page.getByRole('button',{name:'Like post, 3 likes'}).click();
  assert.equal(await page.locator('.cx-post-like').getAttribute('aria-pressed'),'true');checks++;
  assert.equal(await page.locator('.cx-post-like svg').getAttribute('fill'),'currentColor');checks++;
  await page.locator('.cx-post-like').click();
  assert.equal(await page.locator('.cx-post-like svg').getAttribute('fill'),'none');checks++;
  if(width<800){
   await page.locator('.cx-post .cx-media-frame').dblclick({delay:70});
   await page.waitForTimeout(100);
   assert.equal(await page.locator('.cx-post-like').getAttribute('aria-pressed'),'true');checks++;
   assert.equal(await page.locator('.cx-post-like svg').getAttribute('fill'),'currentColor');checks++;
   assert.equal(await page.evaluate(()=>window.__details),0,'Double tap must not open details');checks++;
  }
  await page.getByRole('button',{name:'Post options'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Pin post'}).click();
  await page.locator('.cx-pinned').waitFor({timeout:10000});
  assert.equal(await page.locator('.cx-pinned').count(),1);checks++;
  await page.getByRole('button',{name:'Edit profile'}).click();
  await page.locator('.cx-edit-form').waitFor();
  await page.locator('.cx-edit-form label').filter({hasText:'Name'}).locator('input').first().fill('Updated Creator');
  await page.getByRole('button',{name:'Save',exact:true}).last().click();
  await page.locator('.cx-name-line h2').getByText('Updated Creator').waitFor();
  checks++;
  await page.getByRole('button',{name:'Post options'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Edit title'}).click();
  await page.getByLabel('Post title').fill('Renamed landscape');
  await page.getByRole('button',{name:'Save title'}).click();
  await page.locator('.cx-post-caption').getByText('Renamed landscape').waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>window.__manageCalls?.at(-1)?.action),'edit');checks++;
  await page.getByRole('button',{name:'Post options'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Delete post'}).click();
  await page.getByRole('button',{name:'Cancel'}).click();
  assert.equal(await page.locator('.cx-post').count(),1);checks++;
  await page.getByRole('button',{name:'Post options'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Delete post'}).click();
  await page.getByRole('button',{name:'Delete post'}).click();
  await page.locator('.cx-post').waitFor({state:'detached',timeout:10000});
  assert.equal(await page.evaluate(()=>window.__manageCalls?.at(-1)?.action),'delete');checks++;
 }else{
  assert.equal(await page.getByRole('button',{name:'Post options'}).count(),0,'Visitors cannot manage another creator\'s posts');checks++;
  await page.getByRole('button',{name:'Follow',exact:true}).click();
  assert.equal((await page.getByRole('button',{name:'Following',exact:true}).count()),1);checks++;
 }
 await context.close();
}
try{
 await profilePage(393,false,true);
 await profilePage(393,true,false);
 await profilePage(1350,true,false);
 console.log('PROFILE AUDIT PASS: '+checks+' checks: natural portrait/landscape image ratios, edge-to-edge feed, compact prompt, double-tap likes, post menus, desktop and mobile layout.');
}catch(e){console.error('PROFILE AUDIT FAILED:',e);process.exitCode=1;}finally{await browser.close();}
