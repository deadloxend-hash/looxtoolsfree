import {unicodeText,upsideDown} from './unicode-styles.mjs';
const bounded=(n,min,max,label)=>{n=Number(n);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+' must be an integer between '+min+' and '+max+'.');return n};
export function randomInt(n){if(!Number.isSafeInteger(n)||n<1||n>4294967296)throw Error('Random range is too large.');const limit=Math.floor(4294967296/n)*n,u=new Uint32Array(1);do{crypto.getRandomValues(u)}while(u[0]>=limit);return u[0]%n}
const choose=a=>a[randomInt(a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const literalSeparator=s=>String(s??'').replace(/\\n/g,'\n').replace(/\\t/g,'\t');
export function countText(s){
 const words=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'word'}).segment(s)].filter(x=>x.isWordLike).length:(s.match(/\S+/g)||[]).length;
 const graphemes=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s)].length:[...s].length;
 return {Words:words,'Characters (graphemes)':graphemes,'Unicode code points':[...s].length,'UTF-16 units':s.length,Lines:s?s.split(/\r\n|\r|\n/).length:0,Paragraphs:s.trim()?s.trim().split(/\n\s*\n/).length:0};
}
function parseDelimited(text,delimiter){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else if(quoted||field==='')quoted=!quoted;else field+=c}
 else if(!quoted&&c===delimiter){row.push(field);field=''}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field=''}else field+=c}
 if(quoted)throw Error('A quoted field is not closed.');
 if(field||row.length||!rows.length){row.push(field);rows.push(row)}return rows
}
const serialize=(rows,d)=>rows.map(r=>r.map(f=>f.includes(d)||/["\r\n]/.test(f)?'"'+f.replace(/"/g,'""')+'"':f).join(d)).join('\n');
export function compareLines(a,b){
 const left=a.split('\n'),right=b.split('\n');if(left.length>1200||right.length>1200||a.length+b.length>250000)throw Error('Compare at most 1,200 lines per input and 250,000 characters in total.');
 const grid=Array.from({length:left.length+1},()=>new Uint16Array(right.length+1));
 for(let i=left.length-1;i>=0;i--)for(let j=right.length-1;j>=0;j--)grid[i][j]=left[i]===right[j]?1+grid[i+1][j+1]:Math.max(grid[i+1][j],grid[i][j+1]);
 const result=[];let i=0,j=0;while(i<left.length||j<right.length){if(i<left.length&&j<right.length&&left[i]===right[j]){result.push({kind:'same',text:left[i]});i++;j++}else if(j<right.length&&(i===left.length||grid[i][j+1]>=grid[i+1][j])){result.push({kind:'add',text:right[j++]})}else result.push({kind:'remove',text:left[i++]})}return result
}
export function runTool(slug,input,options={},second=''){
 if(input.length+second.length>2000000)throw Error('Use at most 2 million characters in this workspace.');
 const lines=input.split(/\r\n|\r|\n/),count=()=>bounded(options.count??10,1,1000,'Count');
 switch(slug){
 case'text-editor':return input;
 case'word-counter':return JSON.stringify(countText(input),null,2);
 case'case-converter':return options.mode==='upper'?input.toLocaleUpperCase():options.mode==='lower'?input.toLocaleLowerCase():options.mode==='title'?input.toLocaleLowerCase().replace(/\p{L}[\p{L}\p{M}'’-]*/gu,w=>w[0].toLocaleUpperCase()+w.slice(1)):input.toLocaleLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu,(_,a,b)=>a+b.toLocaleUpperCase());
 case'concat-text':return input+literalSeparator(options.separator??' ')+second;
 case'split-text':{const d=literalSeparator(options.separator??',');if(!d)throw Error('Enter a delimiter.');return input.split(d).join('\n')}
 case'extract-columns':{const d=literalSeparator(options.separator??',');if([...d].length!==1)throw Error('Use one delimiter character or \\t.');const columns=String(options.columns??'1').split(',').map(n=>bounded(n.trim(),1,10000,'Column'));return serialize(parseDelimited(input,d).map(row=>columns.map(n=>row[n-1]??'')),d)}
 case'remove-spaces':return options.mode==='all'?input.replace(/\s+/gu,' ').trim():lines.map(l=>l.replace(/[^\S\r\n]+/gu,' ').trim()).join('\n');
 case'strip-html':{const t=document.createElement('template');t.innerHTML=input;t.content.querySelectorAll('script,style,noscript,template').forEach(n=>n.remove());t.content.querySelectorAll('br').forEach(n=>n.replaceWith(document.createTextNode('\n')));t.content.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,tr,section,article').forEach(n=>n.append(document.createTextNode('\n')));return (t.content.textContent||'').replace(/\n{3,}/g,'\n\n').trim()}
 case'remove-emojis':{const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(input)].map(x=>x.segment):[...input];return parts.filter(s=>!/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(s)).join('').replace(/[\u200d\ufe0f]/g,'')}
 case'remove-symbols':return input.replace(/\p{S}/gu,'').replace(/[\u200d\ufe0f]/g,'');
 case'upside-down':return upsideDown(input);
 case'unicode-normalizer':if(!['NFC','NFD','NFKC','NFKD'].includes(options.mode))throw Error('Choose a normalization form.');return input.normalize(options.mode);
 case'bold-text':return unicodeText(input,'bold');case'italic-text':return unicodeText(input,'italic');case'blackletter-text':return unicodeText(input,'fraktur');case'cursive-text':return unicodeText(input,'script');
 case'random-numbers':{const min=bounded(options.min??1,-1000000000,1000000000,'Minimum'),max=bounded(options.max??100,-1000000000,1000000000,'Maximum'),n=count(),range=max-min+1;if(range<1)throw Error('Maximum must not be below minimum.');if(options.unique&&n>range)throw Error('The range is too small for that many unique values.');const used=new Set(),out=[];while(out.length<n){const value=min+randomInt(range);if(!options.unique||!used.has(value)){out.push(value);used.add(value)}}return out.join('\n')}
 case'random-emails':return Array.from({length:count()},()=>['sample',Array.from({length:12},()=>choose('abcdefghijklmnopqrstuvwxyz0123456789')).join('')].join('.')+'@'+choose(['example.com','example.net','example.org'])).join('\n');
 case'pronounceable-passwords':{const length=bounded(options.length??24,12,128,'Length'),vowels='aeiou',consonants='bcdfghjklmnprstvwz';return Array.from({length:count()},()=>{let s='';for(let i=0;i<length;i++)s+=choose(i%2?vowels:consonants);if(options.digits)s=s.slice(0,-4)+Array.from({length:4},()=>choose('0123456789')).join('');return s}).join('\n')}
 case'strong-passwords':{const length=bounded(options.length??24,8,128,'Length'),groups=[options.upper?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'',options.lower?'abcdefghijklmnopqrstuvwxyz':'',options.digits?'0123456789':'',options.symbols?'!@#$%^&*()-_=+[]{};:,.?':''].filter(Boolean);if(!groups.length)throw Error('Select at least one character group.');const pool=groups.join('');return Array.from({length:count()},()=>shuffle([...groups.map(choose),...Array.from({length:length-groups.length},()=>choose(pool))]).join('')).join('\n')}
 case'usernames':{const a=['quiet','bright','silver','wild','gentle','stellar','clever','mellow','vivid','bold','crystal','cosmic'],b=['fox','otter','falcon','cedar','orbit','river','panda','pixel','comet','tiger','studio','spark'];return Array.from({length:count()},()=>choose(a)+choose(b)+String(randomInt(10000)).padStart(4,'0')).join('\n')}
 case'random-strings':{const alphabet=[...new Set([...(options.alphabet??'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')])],length=bounded(options.length??24,1,256,'Length');if(!alphabet.length)throw Error('Enter at least one alphabet character.');return Array.from({length:count()},()=>Array.from({length},()=>choose(alphabet)).join('')).join('\n')}
 case'email-extractor':return [...new Set((input.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+/gi)||[]).map(s=>s.replace(/[.,;:!?]+$/,'')))].join('\n');
 case'url-extractor':{const candidates=input.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)||[];return [...new Set(candidates.map(s=>{s=s.replace(/[.,;:!?]+$/,'');while(s.endsWith(')')&&(s.match(/\)/g)||[]).length>(s.match(/\(/g)||[]).length)s=s.slice(0,-1);try{const u=new URL(s.startsWith('www.')?'https://'+s:s);return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}}).filter(Boolean))].join('\n')}
 case'find-replace':{const find=options.find||'';if(!find)throw Error('Enter text to find.');if(find.length>10000)throw Error('Keep the search phrase below 10,000 characters.');const replacement=String(options.replacement??'');if(options.sensitive)return options.all?input.split(find).join(replacement):input.replace(find,()=>replacement);const escaped=[...find].map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');return input.replace(new RegExp(escaped,options.all?'giu':'iu'),()=>replacement)}
 case'text-diff':return compareLines(input,second);
 case'json-formatter':return JSON.stringify(JSON.parse(input),null,options.mode==='minify'?0:2);
 case'base64-encoder':{if(options.mode==='decode'){const clean=input.replace(/\s/g,'');if(clean.length%4===1||!/^[A-Za-z0-9+/]*={0,2}$/.test(clean))throw Error('Enter standard Base64 text.');const bytes=Uint8Array.from(atob(clean),c=>c.charCodeAt(0));return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}const bytes=new TextEncoder().encode(input);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
 case'url-encoder':return options.mode==='decode'?decodeURIComponent(input):encodeURIComponent(input);
 case'prompt-builder':return 'Goal: '+(options.goal||'Explain')+'\nAudience: '+(options.audience||'General readers')+'\nTone: '+(options.tone||'Clear and friendly')+'\n\nBrief:\n'+input+'\n\nRequirements:\n- Use only the facts in the brief; flag missing information.\n- Keep the structure easy to scan.\n- Avoid invented statistics, promises or quotations.\n- Suggest a useful next step.\n\nReturn the draft followed by any assumptions that need review.';
 default:throw Error('Choose a supported tool.');
 }
}
