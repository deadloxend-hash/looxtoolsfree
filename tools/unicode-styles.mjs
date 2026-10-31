const chars=(start,n=26)=>Array.from({length:n},(_,i)=>String.fromCodePoint(start+i));
const latin='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const map=(upper,lower,digits='0123456789')=>new Map([...latin].map((c,i)=>[c,i<26?[...upper][i]:i<52?[...lower][i-26]:[...digits][i-52]]).filter(([,v])=>v));
const mathematical=(u,l,d=0x1d7ce)=>map(chars(u).join(''),chars(l).join(''),chars(d,10).join(''));
const styles=[
 ['plain','Original',new Map()],['bold','Bold',mathematical(0x1d400,0x1d41a)],
 ['italic','Italic',map(chars(0x1d434).join(''),chars(0x1d44e).map((c,i)=>i===7?'ℎ':c).join(''))],
 ['bold-italic','Bold italic',mathematical(0x1d468,0x1d482)],
 ['script','Cursive',map('𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵','𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏')],
 ['bold-script','Bold cursive',mathematical(0x1d4d0,0x1d4ea)],
 ['fraktur','Old English',map('𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',chars(0x1d51e).join(''))],
 ['bold-fraktur','Bold blackletter',mathematical(0x1d56c,0x1d586)],
 ['double','Double-struck',map('𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',chars(0x1d552).join(''),chars(0x1d7d8,10).join(''))],
 ['sans','Sans serif',mathematical(0x1d5a0,0x1d5ba,0x1d7e2)],
 ['sans-bold','Sans bold',mathematical(0x1d5d4,0x1d5ee,0x1d7ec)],
 ['sans-italic','Sans italic',mathematical(0x1d608,0x1d622,0x1d7e2)],
 ['sans-bold-italic','Sans bold italic',mathematical(0x1d63c,0x1d656,0x1d7ec)],
 ['mono','Monospace',mathematical(0x1d670,0x1d68a,0x1d7f6)],
 ['circled','Circled',map(chars(0x24b6).join(''),chars(0x24d0).join(''),'⓪①②③④⑤⑥⑦⑧⑨')],
 ['fullwidth','Fullwidth',map(chars(0xff21).join(''),chars(0xff41).join(''),chars(0xff10,10).join(''))],
 ['smallcaps','Small capitals',map('ABCDEFGHIJKLMNOPQRSTUVWXYZ','ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ')],
 ['squared','Squared',map(chars(0x1f130).join(''),chars(0x1f130).join(''))],
 ['negative-square','Filled squares',map(chars(0x1f170).join(''),chars(0x1f170).join(''))],
 ['negative-circle','Filled circles',map(chars(0x1f150).join(''),chars(0x1f150).join(''))],
 ['parenthesized','Parenthesized',map(chars(0x249c).join(''),chars(0x249c).join(''))],
 ['super','Superscript',map('ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻ','ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ','⁰¹²³⁴⁵⁶⁷⁸⁹')],
 ['sub','Subscript',map('ABCDEFGHIJKLMNOPQRSTUVWXYZ','ₐbcdₑfgₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓyz','₀₁₂₃₄₅₆₇₈₉')],
 ['regional','Regional indicators',map(chars(0x1f1e6).join(''),chars(0x1f1e6).join(''))]
];
export const alphabets=styles.map(([id,name])=>({id,name}));
const accents=[['Clean',''],['Underline','\u0332'],['Double underline','\u0333'],['Strike','\u0336'],['Overline','\u0305'],['Dotted','\u0307'],['Wavy','\u0330']];
const frames=[['Minimal','',''],['Sparkle','✦ ',' ✦'],['Brackets','【','】'],['Corners','「','」'],['Arrows','› ',' ‹'],['Floral','❀ ',' ❀'],['Stars','⋆｡ ',' ｡⋆'],['Outline','《','》']];
export const unicodeCombinations=styles.flatMap(([alphabet,name,mapping])=>accents.flatMap(([accent,mark])=>frames.map(([frame,left,right])=>({id:alphabet+'-'+accent+'-'+frame,alphabet,name:name+' · '+accent+' · '+frame,transform:text=>left+[...text].map(c=>{const out=mapping.get(c)||c;return out+(mark&&/[\p{L}\p{N}]/u.test(c)?mark:'')}).join('')+right}))));
export function unicodeText(text,id){const s=styles.find(s=>s[0]===id);if(!s)throw Error('Unknown alphabet');return [...text].map(c=>s[2].get(c)||c).join('')}
export function upsideDown(text){
 const source=[...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?()[]{}<>_'],
 target=[...'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz∀𐐒ƆᗡƎℲפHIſʞ˥WNOԀΌᴚS⊥∩ΛMX⅄Z0ƖᄅƐㄣϛ9ㄥ86˙‘¡¿)(][}{><‾'];
 const lookup=new Map(source.map((c,i)=>[c,target[i]||c]));return [...text].reverse().map(c=>lookup.get(c)||c).join('')
}
