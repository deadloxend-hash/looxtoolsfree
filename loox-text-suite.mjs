import {textTools} from './content/text-tool-definitions.mjs';
import {runTool,countText} from './tools/text-core.mjs';
import {alphabets,unicodeCombinations} from './tools/unicode-styles.mjs';
const $=id=>document.getElementById(id),slug=document.body.dataset.textTool,tool=textTools.find(t=>t.slug===slug);
if(!tool)throw Error('Unknown text workspace');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const generator=['Random','Security'].includes(tool.group);
const options=$('suite-options'),input=$('suite-input'),second=$('suite-second'),output=$('suite-output');
const status=(text,error=false)=>{$('suite-status').textContent=text;$('suite-status').classList.toggle('error',error)};
const field=(label,id,type='text',value='',more='')=>'<label><span class="suite-label">'+esc(label)+'</span><input class="suite-control" data-option="'+id+'" type="'+type+'" value="'+esc(value)+'" '+more+'></label>';
const select=(label,id,items)=>'<label><span class="suite-label">'+esc(label)+'</span><select class="suite-control" data-option="'+id+'">'+items.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select></label>';
const check=(label,id,checked=false)=>'<label class="suite-check"><input type="checkbox" data-option="'+id+'" '+(checked?'checked':'')+'>'+label+'</label>';
function prefs(){try{return JSON.parse(localStorage.getItem('loox-platform-prefs')||'{}')}catch{return{}}}
let fields='';
if(generator)fields+=field('Count','count','number',10,'min="1" max="1000"');
if(slug==='random-numbers')fields+=field('Minimum','min','number',1,'min="-1000000000" max="1000000000"')+field('Maximum','max','number',100,'min="-1000000000" max="1000000000"')+check('Unique values','unique');
if(['strong-passwords','pronounceable-passwords','random-strings'].includes(slug))fields+=field('Length','length','number',prefs().passwordLength||24,'min="'+(slug==='random-strings'?1:slug==='strong-passwords'?8:12)+'" max="'+(slug==='random-strings'?256:128)+'"');
if(slug==='strong-passwords')fields+=check('Uppercase','upper',true)+check('Lowercase','lower',true)+check('Digits','digits',true)+check('Symbols','symbols',true);
if(slug==='pronounceable-passwords')fields+=check('Include four random ending digits','digits',true);
if(slug==='random-strings')fields+=field('Character alphabet','alphabet','text','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
if(slug==='case-converter')fields+=select('Case','mode',[['upper','UPPERCASE'],['lower','lowercase'],['title','Title Case'],['sentence','Sentence case']]);
if(slug==='remove-spaces')fields+=select('Whitespace','mode',[['horizontal','Keep paragraph breaks'],['all','Collapse all whitespace']]);
if(slug==='unicode-normalizer')fields+=select('Normalization form','mode',[['NFC','NFC · canonical composition'],['NFD','NFD · canonical decomposition'],['NFKC','NFKC · compatibility composition'],['NFKD','NFKD · compatibility decomposition']]);
if(['concat-text','split-text','extract-columns'].includes(slug))fields+=field('Separator (use \\n or \\t)','separator','text',slug==='concat-text'?' ':',');
if(slug==='extract-columns')fields+=field('Columns (one-based)','columns','text','1,3');
if(slug==='find-replace')fields+=field('Find','find','text','bright')+field('Replace with','replacement','text','clear')+check('Case sensitive','sensitive',true)+check('Replace all','all',true);
if(slug==='json-formatter')fields+=select('Output','mode',[['pretty','Readable JSON'],['minify','Minified JSON']]);
if(['base64-encoder','url-encoder'].includes(slug))fields+=select('Action','mode',[['encode','Encode'],['decode','Decode']]);
if(slug==='prompt-builder')fields+=select('Writing goal','goal',[['Explain','Explain'],['Rewrite','Rewrite'],['Summarize','Summarize'],['Draft an announcement','Draft an announcement']])+field('Audience','audience','text','General readers')+select('Tone','tone',[['Clear and friendly','Clear and friendly'],['Professional','Professional'],['Concise','Concise'],['Warm and encouraging','Warm and encouraging']]);
options.innerHTML=fields;
input.value=tool.example;
$('suite-tip').textContent=tool.tip;
$('suite-input-panel').hidden=generator;
if(generator)$('suite-output-panel').style.gridColumn='1 / -1';
second.closest('label').hidden=!['concat-text','text-diff'].includes(slug);
if(slug==='concat-text')second.value='Second idea';
if(slug==='text-diff')second.value='An original line.\nA revised line.';
let outputURL=null,dirty=false,timer=null;
function getOptions(){return Object.fromEntries([...options.querySelectorAll('[data-option]')].map(el=>[el.dataset.option,el.type==='checkbox'?el.checked:el.value]))}
async function copyText(text){try{await navigator.clipboard.writeText(text);status('Copied to clipboard.')}catch{output.value=text;$('suite-output-panel').hidden=false;output.hidden=false;status('Clipboard access is unavailable. The result is selected below; copy it manually.',true);output.focus();output.select()}}
function stats(){const s=countText(input.value);$('suite-stats').replaceChildren(...Object.entries(s).map(([label,value])=>{const span=document.createElement('span'),n=document.createElement('strong');n.textContent=value+' ';span.append(n,document.createTextNode(label));return span}))}
function run(){
 try{const result=runTool(slug,input.value,getOptions(),second.value);$('suite-diff').replaceChildren();if(Array.isArray(result)){output.value=result.map(r=>(r.kind==='add'?'+ ':r.kind==='remove'?'- ':'  ')+r.text).join('\n');result.forEach(r=>{const line=document.createElement('div');line.className=r.kind;line.textContent=(r.kind==='add'?'+ ':r.kind==='remove'?'- ':'  ')+r.text;$('suite-diff').append(line)});$('suite-diff').hidden=false;output.hidden=true}else{output.hidden=false;$('suite-diff').hidden=true;output.value=result}status(generator?'Generated locally. Copy or download only when you are ready.':'Result updated. Review it before replacing your source.');dirty=true;stats()}catch(e){output.value='';$('suite-diff').replaceChildren();status(e.message||'The input could not be processed.',true)}
}
$('suite-run').onclick=run;$('suite-copy').onclick=()=>copyText(output.value);
$('suite-download').onclick=()=>{if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(new Blob([output.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=outputURL;a.download='loox-'+slug+'.txt';a.click();dirty=false;status('Text download started. Your original file was not replaced.')};
$('suite-clear').onclick=()=>{input.value='';second.value='';output.value='';$('suite-diff').replaceChildren();status('Workspace cleared.');stats();if(slug==='fancy-fonts')renderFonts(true)};
$('suite-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Choose a text file smaller than 2 MB.');const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(slug==='fancy-fonts'&&text.length>1000)throw Error('Use at most 1,000 input characters for Unicode style previews.');input.value=text;status('Text file opened locally.');stats();if(slug==='fancy-fonts')renderFonts(true);else if(!generator)run()}catch(err){status(err.message,true)}e.target.value=''};
const onInput=()=>{stats();clearTimeout(timer);if(slug==='fancy-fonts'){timer=setTimeout(()=>renderFonts(true),220);return}if(prefs().livePreview!==false&&!generator)timer=setTimeout(run,250)};
input.oninput=onInput;second.oninput=onInput;options.oninput=()=>{if(!generator&&prefs().livePreview!==false){clearTimeout(timer);timer=setTimeout(run,200)}};
if(slug==='text-editor'){
 const toolbar=$('suite-editor-tools');toolbar.hidden=false;
 for(const [label,fn] of [['UPPERCASE',s=>s.toLocaleUpperCase()],['lowercase',s=>s.toLocaleLowerCase()],['Sort lines',s=>s.split('\n').sort((a,b)=>a.localeCompare(b)).join('\n')],['Unique lines',s=>[...new Set(s.split('\n'))].join('\n')],['Insert timestamp',s=>s+'\n'+new Date().toISOString()]]){
  const b=document.createElement('button');b.className='suite-btn secondary';b.textContent=label;b.onclick=()=>{const before=input.value;input.value=fn(before);run()};toolbar.append(b)
 }
}
let shown=0;
function renderFonts(reset=false){
 const grid=$('font-grid');if(reset){shown=0;grid.replaceChildren()}
 const search=$('font-search').value.toLowerCase(),family=$('font-family').value;
 const list=unicodeCombinations.filter(s=>(family==='all'||s.alphabet===family)&&s.name.toLowerCase().includes(search));
 const end=Math.min(shown+24,list.length),text=input.value||'Create something worth sharing';
 for(const s of list.slice(shown,end)){const card=document.createElement('article');card.className='font-card';const title=document.createElement('small');title.textContent=s.name;const p=document.createElement('p');p.textContent=s.transform(text.slice(0,1000));p.setAttribute('aria-label',text);const button=document.createElement('button');button.className='suite-btn secondary';button.textContent='Copy style';button.setAttribute('aria-label','Copy '+s.name);button.onclick=()=>copyText(s.transform(input.value||'Create something worth sharing'));card.append(title,p,button);grid.append(card)}
 shown=end;$('font-more').hidden=shown>=list.length;$('font-count').textContent=list.length+' style combinations · '+alphabets.length+' Unicode alphabet families. These are character transformations, not installed font files.';
}
if(slug==='fancy-fonts'){
 $('font-library').hidden=false;$('suite-output-panel').hidden=true;$('suite-run').hidden=true;
 $('suite-input-panel').style.gridColumn='1 / -1';
 $('font-family').innerHTML='<option value="all">All alphabet families</option>'+alphabets.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');
 $('font-family').onchange=()=>renderFonts(true);$('font-search').oninput=()=>renderFonts(true);$('font-more').onclick=()=>renderFonts();renderFonts(true);
}else if(!generator)run();
window.addEventListener('beforeunload',()=>{if(outputURL)URL.revokeObjectURL(outputURL)});
stats();
