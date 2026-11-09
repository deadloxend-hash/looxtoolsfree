import {state,auth,initialize} from './account.js?v=9';
import {Community,result} from './community.js?v=17';
const root=document.getElementById('creator-community');
try{
 const params=new URLSearchParams(location.search);
 const username=params.get('username');
 let id=params.get('id');
 // A direct profile link does not need the account overview before rendering.
 if(username||!id){
  await initialize({publicAccess:true,waitForAccount:false});
  id=id||state.user?.id;
  if(username){
   const profile=result(await state.client.from('loox_creator_profiles')
    .select('user_id').eq('username',username.toLowerCase()).maybeSingle());
   if(!profile)throw Error('This creator profile is private or unavailable.');
   id=profile.user_id;
  }
 }
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))
  throw Error('Choose a creator from Community to open their profile.');
 const community=new Community({state,auth,initialize,root,creator:id});
 await community.show();
}catch(error){root.textContent=error.message;}
