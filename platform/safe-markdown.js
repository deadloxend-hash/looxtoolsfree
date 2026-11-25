import {marked} from '../vendor/marked.esm.js';
// Never place model HTML in the live document. Rebuild an allowlisted DOM tree.
export function safeLink(value){try{const raw=String(value).trim();if(!raw||/[\u0000-\u0020\u007f]/.test(raw))return null;const url=new URL(raw,'https://deadloxend-hash.github.io/looxtoolsfree/');return ['https:','http:','mailto:'].includes(url.protocol)?url.href:null;}catch{return null;}}
const allowed=new Set('P STRONG EM H1 H2 H3 H4 H5 H6 UL OL LI BLOCKQUOTE PRE CODE TABLE THEAD TBODY TR TH TD A BR HR DEL'.split(' '));
const renderer={html({text}){return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');},image({text}){return String(text||'Image').replace(/[<>&]/g,'');}};
marked.use({renderer});
export function renderMarkdown(target,value){
 const parsed=new DOMParser().parseFromString(marked.parse(String(value),{gfm:true,breaks:true}),'text/html');
 function clean(source){if(source.nodeType===3)return document.createTextNode(source.textContent);if(source.nodeType!==1)return document.createDocumentFragment();if(!allowed.has(source.tagName))return document.createTextNode(source.textContent);const n=document.createElement(source.tagName.toLowerCase());if(source.tagName==='A'){const href=safeLink(source.getAttribute('href'));if(href){n.href=href;n.rel='noopener noreferrer';}else return document.createTextNode(source.textContent);}for(const child of source.childNodes)n.append(clean(child));return n;}
 target.replaceChildren(...[...parsed.body.childNodes].map(clean));target.classList.add('loox-markdown');
 for(const table of target.querySelectorAll('table')){const wrap=document.createElement('div');wrap.className='loox-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Response table');table.replaceWith(wrap);wrap.append(table);}
 for(const pre of target.querySelectorAll('pre')){const button=document.createElement('button');button.type='button';button.className='loox-copy-code';button.textContent='Copy code';button.onclick=async()=>{try{await navigator.clipboard.writeText(pre.querySelector('code')?.textContent||'');button.textContent='Copied';}catch{button.textContent='Copy unavailable';}setTimeout(()=>button.textContent='Copy code',2000);};const wrap=document.createElement('div');wrap.className='loox-code-block';pre.replaceWith(wrap);wrap.append(button,pre);}
}
