import {state,api,initialize,auth,authenticator,el,button} from '../account.js?v=12';
const root=document.getElementById('billing-dashboard');
const money=n=>n===null?'Not verified':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
async function load(){
 root.replaceChildren(el('p','Loading financial records…'));
 try{
  if(!state.user){root.replaceChildren(el('p','Sign in with your administrator account.'),button('Sign in',()=>auth()));return;}
  const data=await api('billing_admin');root.replaceChildren();
  const setupList=el('ul');for(const [label,ready] of [['Merchant credentials',data.setup.merchantConfigured],['Monthly product IDs',data.setup.monthlyVariantsConfigured],['Margin approval',data.setup.marginApproved],['Administrator alert email',data.setup.alertRecipientConfigured],['Verified email sender',data.setup.alertSenderConfigured],['Email provider credentials',data.setup.alertProviderConfigured],['Signed PC worker enforced',data.setup.signedWorkerRequired]])setupList.append(el('li',label+' · '+(ready?'configured':'needs setup')));root.append(el('h2','Launch setup'),setupList,el('p',data.setup.backups));
  root.append(el('p','Payments: '+(data.flags.paymentsEnabled?'enabled':'disabled')+' · Credit purchases: '+(data.flags.creditTopupsEnabled?'enabled':'disabled')+' · Annual billing: '+(data.flags.annualBillingEnabled?'enabled':'disabled')));
  root.append(el('h2','Reconciliation'),el('p','Wallet discrepancies: '+data.health.wallet_mismatches+' · Payment discrepancies: '+data.health.payment_mismatches+' · Pending / failed webhook events: '+data.health.pending_events),el('p','Provider reconciliation: '+(data.providerConfigured?'configured · run a full comparison':'not configured')));
  root.append(el('h2','Payout verification'),el('p',data.payouts.note),el('p','Bank receipt: '+money(data.payouts.bank_received)+' · Fees: '+money(data.payouts.estimated_fees)+' · Expected payout: '+money(data.payouts.expected_payout)));
  const table=(title,headers,rows)=>{root.append(el('h2',title));if(!rows.length){root.append(el('p','No records.'));return;}const wrap=el('div');wrap.style.overflowX='auto';const t=el('table'),head=el('tr');for(const h of headers)head.append(el('th',h));t.append(head);for(const row of rows){const tr=el('tr');for(const value of row)tr.append(el('td',String(value??'—')));t.append(tr);}wrap.append(t);root.append(wrap);};
  table('Customer payments (latest 100 per type)',['Reference','Plan / package','Amount','Status'],data.payments.map(p=>[p.reference,p.plan||p.package_id,money(p.amount_cents),p.status]));
  table('Webhook processing',['Event','Provider reference','State','Attempts'],data.events.map(e=>[e.event_name,e.resource_reference,e.status,e.attempts]));
  table('Security incidents',['Category','Severity','Count','Email delivered'],data.alerts.map(a=>[a.category,a.severity,a.occurrences,a.sent_at||'Pending / email not configured']));
  table('Generation cost controls',['Daily user cap (USD)','Per-operation cap (USD)','Suspended operations'],data.controls.map(c=>[c.user_daily_millicents/100000,c.operation_max_millicents/100000,c.disabled_operations.join(', ')||'None']));
  table('Model safety pauses',['Operation','Paused until','Evidence'],(data.circuits||[]).map(c=>[c.operation,c.paused_until,c.failed_jobs+' failures in '+c.sample_jobs+' jobs across '+c.distinct_users+' accounts']));
  const notice=el('p','Email alerts: '+(data.emailConfigured?'configured; delivery must be tested':'not configured'));notice.setAttribute('role','status');
  const test=button('Send safe test alert',async()=>{test.disabled=true;try{const r=await api('billing_alert_test',{});notice.textContent=r.configured?'Test dispatch completed: '+r.sent+' queued alert(s) sent. Check your administrator inbox.':'Test incident recorded. Configure email delivery before testing Gmail receipt.';}catch(e){notice.textContent=e.message;}finally{test.disabled=false;}});
  let reconciliationCursor=null;
  const compare=button('Compare all provider payments',async()=>{compare.disabled=true;try{let result;for(let pages=0;pages<10;pages++){result=await api('billing_reconcile',{cursor:reconciliationCursor});reconciliationCursor=result.nextCursor;notice.textContent=result.message+' Checked: '+result.totalChecked+' · Mismatches: '+result.totalMismatches;if(!result.configured||!reconciliationCursor)break;}compare.textContent=reconciliationCursor?'Continue reconciliation':'Compare all provider payments';}catch(e){notice.textContent=e.message;}finally{compare.disabled=false;}});
  const controls=data.controls[0];if(controls){
   const form=el('form',null,'lx-card'),daily=el('input'),operation=el('input'),disabled=el('input');
   const field=(text,input)=>{const label=el('label',text,'lx-field');label.append(input);form.append(label);};
   for(const input of [daily,operation]){input.type='number';input.min='0.01';input.max='100';input.step='0.01';input.required=true;}
   daily.value=controls.user_daily_millicents/100000;operation.value=controls.operation_max_millicents/100000;disabled.value=controls.disabled_operations.join(', ');
   form.append(el('h2','Generation spending safeguards'),el('p','These caps use configured cost estimates. The platform-wide budget remains enforced separately.'));
   field('Daily limit per account · USD',daily);field('Maximum estimated cost per operation · USD',operation);field('Suspended operation IDs · comma separated',disabled);
   const save=el('button','Save safeguards','lx-button');save.type='submit';form.append(save);form.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{await api('billing_cost_controls',{userDailyMillicents:Math.round(Number(daily.value)*100000),operationMaxMillicents:Math.round(Number(operation.value)*100000),disabledOperations:disabled.value.split(',').map(x=>x.trim()).filter(Boolean)});notice.textContent='Spending safeguards saved and recorded in the administrator audit.';}catch(e){notice.textContent=e.message;}finally{save.disabled=false;}};root.append(form);
  }
  root.append(notice,test,compare,button('Refresh dashboard',load));
 }catch(e){root.replaceChildren(el('p',e.message),button('Verify authenticator',authenticator),button('Retry',load));}
}
root.append(el('p','Loading financial records…'));
await initialize({publicAccess:true});await load();document.addEventListener('loox-user',load);

document.addEventListener('loox-account',load);
