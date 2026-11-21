// Reauthentication uses an isolated session, never replacing the current account.
export async function verifyCurrentPassword({sdk,config,user,password,currentUser}){
 const proof=sdk.createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 let verified=false;
 try{
  const result=await proof.auth.signInWithPassword({email:user.email,password});
  verified=Boolean(!result.error&&result.data?.user);
  if(result.error||result.data?.user?.id!==user.id)throw Error('Password verification failed.');
  if(currentUser()!==user.id)throw Error('Account changed. Please retry.');
 }finally{
  if(verified){const result=await proof.auth.signOut({scope:'local'});if(result?.error)throw Error('Verification cleanup failed. Please retry later.');}
 }
}
export function authenticatorImage(totp){
 let svg=totp?.qr_code;
 if(typeof svg!=='string'||svg.length>100000)throw Error('Authenticator QR code is unavailable.');
 // The bundled Supabase SDK prefixes the raw SVG; encode it once for an image URL.
 if(svg.startsWith('data:image/svg+xml;utf-8,'))svg=svg.slice('data:image/svg+xml;utf-8,'.length);
 if(!svg.trimStart().startsWith('<svg'))throw Error('Authenticator QR code is unavailable.');
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
