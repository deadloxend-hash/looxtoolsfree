import {state,auth,initialize} from './account.js?v=9';
import {Community} from './community.js?v=1';
const root=document.getElementById('creator-community');
try{await initialize({publicAccess:true});const id=new URLSearchParams(location.search).get('id')||state.user?.id;if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw Error('Choose a creator from Community to open their profile.');const community=new Community({state,auth,initialize,root,creator:id});await community.show();}catch(error){root.textContent=error.message;}
