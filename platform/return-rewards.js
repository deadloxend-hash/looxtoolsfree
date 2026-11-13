import {state,api,refresh} from './account.js?v=10';
let reward=null,owner=null,loading=false,lastFetch=0,clockOffset=0,errorText='',claiming=false;
const countdown=ms=>{const sec=Math.max(0,Math.ceil(ms/1000));return [Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(n=>String(n).padStart(2,'0')).join(':');};
function render(){
 for(const slot of document.querySelectorAll('[data-loox-reward]')){
  slot.replaceChildren();
  if(!state.user||state.account?.plan!=='basic'){slot.hidden=true;continue;}slot.hidden=false;
  const title=document.createElement('small');title.textContent='Basic return reward';
  const b=document.createElement('button');b.type='button';b.className='lx-reward-button';
  const wait=reward?Date.parse(reward.next_claim_at)-(Date.now()+clockOffset):0;
  const cap=Number(state.account?.wallet?.balance)>=10;
  b.textContent=claiming?'Collecting…':!reward?'Checking reward…':wait>0?'◇ +1 credit in '+countdown(wait):cap?'◇ Reward · use credits first':'✦ Collect 1 free credit';
  b.disabled=claiming||!reward||cap||wait>0||reward.eligible===false;b.onclick=claim;
  b.title='One credit every 12 hours. No stacking of missed rewards. Collect while your balance is below 10.';
  slot.append(title,b);
  if(errorText){const status=document.createElement('small');status.setAttribute('role','status');status.textContent=errorText;slot.append(status);}
 }
}
async function load(force=false){
 if(!state.user||state.account?.plan!=='basic'){reward=null;owner=null;render();return;}
 if(loading||!force&&owner===state.user.id&&Date.now()-lastFetch<60000){render();return;}
 loading=true;const id=state.user.id;
 try{const r=await api('reward');if(state.user?.id!==id)return;reward=r;owner=id;lastFetch=Date.now();clockOffset=Date.parse(r.server_now)-Date.now();errorText='';}catch(e){errorText=e.message;}finally{loading=false;render();}
}
async function claim(){if(claiming)return;claiming=true;errorText='';render();try{const r=await api('claim_reward',{});reward=r;clockOffset=Date.parse(r.server_now)-Date.now();await refresh();errorText='1 credit added to your balance.';}catch(e){errorText=e.message;await load(true);}finally{claiming=false;render();}}
if(typeof document!=='undefined'){
for(const event of ['loox-account','loox-user'])document.addEventListener(event,()=>load());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true);});
const timer=setInterval(()=>{
 if(document.hidden||!state.user||!reward||claiming)return;
 const wait=Date.parse(reward.next_claim_at)-(Date.now()+clockOffset),cap=Number(state.account?.wallet?.balance)>=10;
 for(const b of document.querySelectorAll('.lx-reward-button')){
  b.textContent=wait>0?'◇ +1 credit in '+countdown(wait):cap?'◇ Reward · use credits first':'✦ Collect 1 free credit';
  b.disabled=cap||wait>0||reward.eligible===false;
 }
},1000);timer.unref?.();
}
