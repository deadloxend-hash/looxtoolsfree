import {state,api,initialize,auth,authenticator,el,button} from '../account.js?v=12';
const root=document.getElementById('billing-dashboard');
const money=n=>n===null?'Not verified':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
async function load(){
 root.replaceChildren(el('p','Loading financial records…'));
 try{
  if(!state.user){root.replaceChildren(el('p','Sign in with your administrator account.'),button('Sign in',()=>auth()));return;}
  const data=await api('billing_admin');root.replaceChildren();
  root.append(el('p','Payments: '+(data.flags.paymentsEnabled?'enabled':'disabled')+' · Credit purchases: '+(data.flags.creditTopupsEnabled?'enabled':'disabled')+' · Annual billing: '+(data.flags.annualBillingEnabled?'enabled':'disabled')));
  root.append(el('h2','Reconciliation'),el('p','Wallet discrepancies: '+data.health.wallet_mismatches+' · Payment discrepancies: '+data.health.payment_mismatches+' · Pending / failed webhook events: '+data.health.pending_events),el('p','Provider reconciliation: '+(data.health.provider_reconciled?'verified':'not configured')));
  root.append(el('h2','Payout verification'),el('p',data.payouts.note),el('p','Bank receipt: '+money(data.payouts.bank_received)+' · Fees: '+money(data.payouts.estimated_fees)+' · Expected payout: '+money(data.payouts.expected_payout)));
  const table=(title,headers,rows)=>{root.append(el('h2',title));if(!rows.length){root.append(el('p','No records.'));return;}const wrap=el('div');wrap.style.overflowX='auto';const t=el('table'),head=el('tr');for(const h of headers)head.append(el('th',h));t.append(head);for(const row of rows){const tr=el('tr');for(const value of row)tr.append(el('td',String(value??'—')));t.append(tr);}wrap.append(t);root.append(wrap);};
  table('Customer payments (latest 100 per type)',['Reference','Plan / package','Amount','Status'],data.payments.map(p=>[p.reference,p.plan||p.package_id,money(p.amount_cents),p.status]));
  table('Webhook processing',['Event','Provider reference','State','Attempts'],data.events.map(e=>[e.event_name,e.resource_reference,e.status,e.attempts]));
  table('Security incidents',['Category','Severity','Count','Email delivered'],data.alerts.map(a=>[a.category,a.severity,a.occurrences,a.sent_at||'Pending / email not configured']));
  table('Generation cost controls',['Daily user cap (USD)','Per-operation cap (USD)','Suspended operations'],data.controls.map(c=>[c.user_daily_millicents/100000,c.operation_max_millicents/100000,c.disabled_operations.join(', ')||'None']));
  const notice=el('p','Email alerts: '+(data.emailConfigured?'configured; delivery must be tested':'not configured'));notice.setAttribute('role','status');
  const test=button('Send safe test alert',async()=>{test.disabled=true;try{const r=await api('billing_alert_test',{});notice.textContent=r.configured?'Test dispatch completed: '+r.sent+' queued alert(s) sent. Check your administrator inbox.':'Test incident recorded. Configure email delivery before testing Gmail receipt.';}catch(e){notice.textContent=e.message;}finally{test.disabled=false;}});
  root.append(notice,test,button('Compare provider payments',async()=>{try{const r=await api('billing_reconcile',{});notice.textContent=r.message+' Checked: '+r.checked+' · Mismatches: '+r.mismatches.length;}catch(e){notice.textContent=e.message;}}),button('Refresh dashboard',load));
 }catch(e){root.replaceChildren(el('p',e.message),button('Verify authenticator',authenticator),button('Retry',load));}
}
await initialize({publicAccess:true});await load();document.addEventListener('loox-user',load);
