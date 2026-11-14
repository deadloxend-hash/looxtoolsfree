export async function openMFA({client,dialog,el,button,refresh}){
 const {box}=dialog('Authenticator security');
 const note=el('p','Use an authenticator app to protect financial administration.');note.setAttribute('role','status');box.append(note);
 try{
  const c=await client(),listed=await c.auth.mfa.listFactors();if(listed.error)throw listed.error;
  let factor=listed.data.totp?.find(f=>f.status==='verified');
  const start=async()=>{
   if(!factor){const r=await c.auth.mfa.enroll({factorType:'totp',friendlyName:'LOOX administrator'});if(r.error)throw r.error;factor=r.data;
    const qr=el('img');qr.alt='Scan this QR code with your authenticator app';qr.width=qr.height=220;qr.src=r.data.totp.qr_code;box.append(qr,el('p','Scan the QR code in your authenticator app. Keep recovery access secure.'));
   }
   const form=el('form'),input=el('input'),label=el('label','6-digit authenticator code');input.inputMode='numeric';input.autocomplete='one-time-code';input.pattern='[0-9]{6}';input.maxLength=6;input.required=true;input.setAttribute('aria-label','6-digit authenticator code');label.append(input);
   const submit=el('button','Verify code','lx-button lx-primary');submit.type='submit';form.append(label,submit);box.append(form);
   form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{const r=await c.auth.mfa.challengeAndVerify({factorId:factor.id,code:input.value});if(r.error)throw r.error;await c.auth.refreshSession();note.textContent='Authenticator verified. Financial administration is available for this session.';form.remove();await refresh();}catch{note.textContent='Code could not be verified. Try the current code from your authenticator app.';submit.disabled=false;}};
  };
  if(factor)await start();else box.append(button('Set up authenticator',async()=>{try{await start();}catch(e){note.textContent=e.message;}},'lx-button lx-primary'));
 }catch(e){note.textContent=e.message;}
}
