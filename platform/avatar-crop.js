export async function cropAvatar(file){
 if(file.size>2_097_152||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPG or WebP under 2 MB.');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>25_000_000){bitmap.close();throw Error('Choose a smaller profile picture.');}
 return new Promise((resolve,reject)=>{
  const d=document.createElement('dialog');d.className='community-dialog';const title=document.createElement('h2');title.textContent='Crop your profile picture';const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.style.cssText='display:block;width:min(100%,320px);height:auto;margin:20px auto;border-radius:50%;background:#111';
  const label=document.createElement('label');label.className='community-field';label.textContent='Zoom · centered square crop';const zoom=document.createElement('input');zoom.type='range';zoom.min='1';zoom.max='3';zoom.step='.01';zoom.value='1';label.append(zoom);const actions=document.createElement('div');actions.className='community-post-actions';let settled=false;
  const finish=(value,error)=>{if(settled)return;settled=true;bitmap.close();d.close();d.remove();if(error)reject(error);else resolve(value);};
  const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.className='community-button';cancel.onclick=()=>finish(null,Error('Profile picture change cancelled.'));
  const save=document.createElement('button');save.textContent='Use picture';save.className='community-primary';save.onclick=()=>canvas.toBlob(blob=>blob?finish(blob):finish(null,Error('Could not crop picture.')),'image/png');actions.append(cancel,save);d.append(title,canvas,label,actions);document.body.append(d);d.addEventListener('cancel',event=>{event.preventDefault();finish(null,Error('Profile picture change cancelled.'));});
  const draw=()=>{const side=Math.min(bitmap.width,bitmap.height)/Number(zoom.value);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,512,512);};zoom.addEventListener('input',draw);draw();d.showModal();
 });
}
