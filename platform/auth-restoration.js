// Bounds UI waits without trusting cached identity or deleting recoverable sessions.
export function withDeadline(promise,ms=12000,message='Account verification is taking too long. Check your connection and retry.'){
 let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]).finally(()=>clearTimeout(timer));
}
export async function authFetch(input,options={}){
 const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000);
 return fetch(input,{...options,signal});
}
