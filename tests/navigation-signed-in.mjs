import {state,initialize,renderHeader} from '../platform/account.js?v=settings-2-20261124';
await initialize();
// Exercise the production renderer with synthetic presentation data only.
// Never change a visitor's real session or authenticated account.
if(!state.user&&!state.session){
 state.user={id:'navigation-presentation-fixture',email:'navigation@example.invalid',user_metadata:{full_name:'Navigation Tester'}};
 state.account={plan:'basic',profile:{name:'Navigation Tester'},wallet:{balance:25}};
 renderHeader();
 document.body.dataset.fixture='signed-in';
}
