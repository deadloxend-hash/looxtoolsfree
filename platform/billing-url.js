// Validate every browser-side billing redirect, including legacy account actions.
export function billingURL(value){
 let url;try{url=new URL(value);}catch{throw Error('Billing address is unavailable.');}
 if(url.protocol!=='https:'||!(url.hostname==='lemonsqueezy.com'||url.hostname.endsWith('.lemonsqueezy.com'))||url.username||url.password||url.port)throw Error('Unexpected billing address.');
 return url.href;
}
