const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
// Reports enter the existing private support queue, including D1-only content.
export function communityReportPayload({postId,commentId=null,reason,requestId}){
 if(!UUID.test(postId)||!UUID.test(requestId)||commentId!==null&&!UUID.test(commentId))throw Error('Invalid content reference.');
 if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000)throw Error('Enter a report of 5–1,000 characters.');
 const reference='community:'+postId+(commentId?':'+commentId:'');
 return {requestId,category:'community',subject:commentId?'Community comment report':'Community post report',reference,body:reason.trim()+'\n\nContent reference: '+reference};
}
