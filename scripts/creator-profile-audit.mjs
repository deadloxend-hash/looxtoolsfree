// Read-only synthetic profile browser checks: no production accounts, no mutations.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const root=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const me='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const icon='data:image/svg+xml,%3Csvg%20xmlns="http://www.w3.org/2000/svg"%20width="400"%20height="230"%3E%3Crect%20width="400"%20height="230"%20fill="%235e3972"/%3E%3C/svg%3E';
const accountModule=[
 "export const state={user:{id:'"+me+"'},client:{from:()=>({insert:async()=>{window.__p.followed=true;return {data:{},error:null};},delete:()=>({eq:()=>({eq:async()=>{window.__p.followed=false;return {data:{},error:null};}})})})}};",
 "export function auth(){}",
 "export async function initialize(){}",
 "export async function refresh(){}",
 "export async function api(action,body){window.__calls.push(action);if(action==='community_pin'){window.__p.pinned_post_id=body.post;}if(action==='community_details'){window.__p.profile_location=body.location;window.__p.profile_website=body.website;}if(action==='community_cover'){window.__p.cover_key=body.remove?null:'public/avatars/'+window.__p.user_id+'/banner-test.webp';}if(action==='community_avatar'){return {path:window.__p.user_id+'/test.webp'};}return {saved:true};}",
].join('\n');
const communityModule=[
 "export class Community{async details(){window.__details=(window.__details||0)+1;}async like(p){p.likes++;p.liked=true;}async save(p){p.saved=true;}async connections(){window.__connections=(window.__connections||0)+1;}async notifications(){}async manage(){}async privacy(){}}",
 "export function result(r){if(r.error)throw Error(r.error.message);return r.data;}",
 "export async function rpc(state,method,body){if(method==='loox_creator_summary')return window.__p;if(method==='loox_discover')return {items:window.__posts,has_more:false};if(method==='loox_public_post')return window.__posts[0];if(method==='loox_save_creator'){window.__p.username=body.p_username;window.__p.display_name=body.p_name;window.__p.bio=body.p_bio;window.__p.avatar_path=body.p_avatar;return null;}throw Error('Unexpected RPC: '+method);}",
 "export async function mediaURL(){return '"+icon+"';}"
].join('\n');
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
}catch{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
}
let checks=0;
async function profilePage(width,path){
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.addInitScript(({user,post})=>{
  window.__calls=[];window.__details=0;window.__connections=0;
  window.__p={user_id:user,username:'test_creator',display_name:'Test Creator',bio:'Creating a little magic with AI.',avatar_path:'test.webp',created_at:'2026-11-01T00:00:00Z',is_private:false,hide_connections:false,cover_key:'public/avatars/'+user+'/banner-test.webp',posts:1,followers:3,following:2,profile_location:'Somewhere creative',profile_website:'https://example.com',plan_badge:'Basic',pinned_post_id:null,followed:false};
  window.__posts=[{id:post,creator_id:user,username:'test_creator',display_name:'Test Creator',avatar_path:'test.webp',caption:'A new AI landscape',created_at:'2026-11-09T00:00:00Z',media_type:'image',media_path:'test.webp',likes:3,comments:2,saved:false,liked:false}];
 },{user:path?'22222222-2222-4222-8222-222222222222':me,post:'33333333-3333-4333-8333-333333333333'});
 await page.route('**/platform/account.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:accountModule}));
 await page.route('**/platform/community.js?v=*',r=>r.fulfill({status:200,contentType:'text/javascript',body:communityModule}));
 await page.route(/\/(loox-experience|loox-sitewide-nav)\.js\?/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.goto(root+'creator.html'+(path?'?id='+other:''),{waitUntil:'load'});
 await page.locator('.cx-name-line h2').waitFor({timeout:12000});
 assert.equal(await page.locator('.cx-name-line h2').innerText(),'Test Creator');checks++;
 assert.equal(await page.locator('.cx-post').count(),1);checks++;
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6,'Horizontal overflow at '+width);checks++;
 assert.equal(await page.locator('.cx-tab').count(),path?2:3);checks++;
 await page.getByRole('button',{name:'Media',exact:true}).click();
 assert.equal(await page.locator('.cx-media-tile').count(),1);checks++;
 await page.getByRole('button',{name:'Posts',exact:true}).click();
 assert.equal(await page.locator('.cx-post').count(),1);checks++;
 if(!path){
  await page.getByRole('button',{name:'Pin',exact:true}).click();
  await page.locator('.cx-pinned').waitFor({timeout:10000});
  assert.equal(await page.locator('.cx-pinned').count(),1);checks++;
  await page.getByRole('button',{name:'Edit profile'}).click();
  await page.locator('.cx-edit-form').waitFor();
  await page.locator('.cx-edit-form label').filter({hasText:'Name'}).locator('input').first().fill('Updated Creator');
  await page.getByRole('button',{name:'Save',exact:true}).last().click();
  await page.locator('.cx-name-line h2').getByText('Updated Creator').waitFor();
  checks++;
 }else{
  await page.getByRole('button',{name:'Follow',exact:true}).click();
  assert.equal((await page.getByRole('button',{name:'Following',exact:true}).count()),1);checks++;
 }
 await context.close();
}
try{
 await profilePage(393,false);
 await profilePage(1350,true);
 console.log('PROFILE AUDIT PASS: '+checks+' checks: mobile editing/pinning, public follow, post/media tabs, layout.');
}catch(e){console.error('PROFILE AUDIT FAILED:',e);process.exitCode=1;}finally{await browser.close();}
