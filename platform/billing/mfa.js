export async function openMFA({client,dialog,el,button,refresh}){
 const {box}=dialog('Authenticator security');
 const note=el('p','Use an authenticator app to protect financial administration.');
 note.setAttribute('role','status');
 box.append(note);
 try{
  const c=await client();
  const listed=await c.auth.mfa.listFactors();
  if(listed.error)throw listed.error;
  const factors=listed.data.all||listed.data.totp||[];
  let factor=factors.find(f=>f.factor_type==='totp'&&f.status==='verified')
    ||listed.data.totp?.find(f=>f.status==='verified');
  let pending=factors.find(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name==='LOOX administrator');
  let starting=false,formShown=false;
  const start=async trigger=>{
   if(starting||formShown)return;
   starting=true;
   if(trigger)trigger.disabled=true;
   try{
    if(!factor){
     // An interrupted setup already owns this friendly name. Remove only
     // this user's UNVERIFIED factor, never an existing verified factor.
     if(pending){
      const removed=await c.auth.mfa.unenroll({factorId:pending.id});
      if(removed.error)throw removed.error;
      pending=null;
     }
     const enrolled=await c.auth.mfa.enroll({factorType:'totp',friendlyName:'LOOX administrator'});
     if(enrolled.error)throw enrolled.error;
     factor=enrolled.data;
     const qr=el('img');
     qr.alt='Scan this QR code with your authenticator app';
     qr.width=qr.height=220;
     qr.src=enrolled.data.totp.qr_code;
     box.append(qr,el('p','Scan this NEW QR code in your authenticator app. Do not share it or its secret.'));
     note.textContent='Enter the current code from your authenticator app to finish setup.';
    }else{
     note.textContent='Enter the current code from your existing authenticator app to verify administrator access.';
    }
    const form=el('form');
    const input=el('input');
    const label=el('label','6-digit authenticator code');
    input.type='text';
    input.inputMode='numeric';
    input.autocomplete='one-time-code';
    input.pattern='[0-9]{6}';
    input.maxLength=6;
    input.required=true;
    input.setAttribute('aria-label','6-digit authenticator code');
    label.append(input);
    const submit=el('button','Verify code','lx-button lx-primary');
    submit.type='submit';
    form.append(label,submit);
    box.append(form);
    formShown=true;
    if(trigger)trigger.remove();
    form.onsubmit=async event=>{
     event.preventDefault();
     if(submit.disabled)return;
     submit.disabled=true;
     const result=await c.auth.mfa.challengeAndVerify({factorId:factor.id,code:input.value.trim()}).catch(e=>({error:e}));
     if(result.error){
      note.textContent='Code could not be verified. Check the current code and your device time, then try again.';
      submit.disabled=false;
      return;
     }
     form.remove();
     note.textContent='Authenticator verified. Administrator access is enabled for this session.';
     try{await c.auth.refreshSession();await refresh();}catch(e){
      note.textContent='Authenticator verified. Refresh the admin page to load your permissions.';
     }
    };
   }catch(e){
    note.textContent=e.message||'Unable to start authenticator setup. Please try again.';
    if(trigger)trigger.disabled=false;
   }finally{starting=false;}
  };
  if(factor){
   await start();
  }else{
   if(pending)note.textContent='Your earlier authenticator setup was interrupted. Restart setup to generate a fresh QR code.';
   box.append(button(pending?'Restart authenticator setup':'Set up authenticator',function(){return start(this);},'lx-button lx-primary'));
  }
 }catch(e){note.textContent=e.message||'Unable to load authenticator settings.';}
}
