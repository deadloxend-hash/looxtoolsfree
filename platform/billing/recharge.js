// Shared dialog. Prices are fetched from the backend; offline state has no prices.
export async function openRecharge({state,api,config,auth,dialog,el,button,refresh}){
 const {box,d}=dialog('Buy Credits');d.classList.add('loox-recharge');
 const intro=el('p','Keep creating with extra credits. No subscription change needed.','recharge-intro');
 const balance=el('p','Current balance: '+(state.account?.wallet?.balance??(state.user?'Loading…':'Sign in to view'))+' credits','recharge-balance');
 const status=el('p','Loading recharge packages…','recharge-status');status.setAttribute('role','status');
 const packages=el('div',null,'recharge-packages');packages.setAttribute('role','group');packages.setAttribute('aria-label','Choose a credit package');
 const checkout=button('Secure checkout coming soon',()=>{},'lx-button lx-primary recharge-checkout');checkout.disabled=true;
 const history=el('a','Purchase history →','recharge-history');history.href='account.html#history';
 box.append(intro,balance,packages,status,checkout,history);
 let selected,catalog;
 function updateBalance(){balance.textContent='Current balance: '+(state.account?.wallet?.balance??'…')+' credits';}
 document.addEventListener('loox-account',updateBalance);d.addEventListener('close',()=>document.removeEventListener('loox-account',updateBalance),{once:true});
 try{
  const [response,cfg]=await Promise.all([fetch('https://looxtoolfree-backend.vercel.app/api/loox?action=billing_catalog',{credentials:'omit',signal:AbortSignal.timeout(15000)}),config().catch(()=>null)]);
  if(!response.ok)throw Error('Recharge packages are temporarily unavailable. Please try again later.');
  catalog=await response.json();
  const cost=cfg?.operations?.find(o=>o.id==='generate')?.cost;
  for(const p of catalog.packages||[]){
   const card=button('',()=>select(p),'recharge-package');card.setAttribute('aria-pressed','false');card.dataset.package=p.id;
   const price=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price_cents/100);
   card.append(el('span',p.name,'recharge-name'),el('strong',p.credits.toLocaleString()+' credits'),el('span',price+' · proposed price','recharge-price'),el('small',cost?'About '+Math.floor(p.credits/cost)+' standard images at '+cost+' credits each':'Image counts depend on the selected model'));
   packages.append(card);
  }
  function select(p){selected=p;for(const b of packages.children)b.setAttribute('aria-pressed',String(b.dataset.package===p.id));checkout.disabled=!(catalog.paymentsEnabled&&catalog.creditTopupsEnabled&&p.approved);checkout.textContent=checkout.disabled?'Secure checkout coming soon':state.user?'Continue to secure checkout':'Sign in to continue';}
  if(catalog.packages?.length)select(catalog.packages[0]);
  status.textContent='Preview packages · prices await cost and margin review. No payment is taken.';
  box.append(el('p',catalog.creditPolicy?.expiration||'Credit terms will be confirmed before purchases are enabled.','recharge-terms'),el('p',catalog.creditPolicy?.refunds||'Refund terms will be confirmed before checkout.','recharge-terms'),el('p','Estimates are alternatives from one balance. Video and premium image costs vary by model.','recharge-terms'));
  checkout.onclick=async()=>{
   if(!state.user){d.close();auth('login');return;}
   checkout.disabled=true;status.textContent='Preparing secure checkout…';
   try{const result=await api('recharge_checkout',{package:selected.id});const target=new URL(result.url);if(target.protocol!=='https:'||!target.hostname.endsWith('.lemonsqueezy.com'))throw Error('Checkout is unavailable.');location.assign(target.href);}
   catch(e){status.textContent=e.message;checkout.disabled=false;}
  };
 }catch(e){status.textContent=e.message;}
 if(state.user&&!state.account)refresh().catch(()=>{});
}
