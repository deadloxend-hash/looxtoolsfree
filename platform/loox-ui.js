/* Shared, asynchronous dialogs. No browser dialog overrides or untrusted HTML. */
if(typeof document!=='undefined'){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./loox-ui.css?v=ui-20261125',import.meta.url);document.head.append(css);}
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function icon(kind){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',({trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',edit:'m16 3 5 5-12 12H4v-5ZM14 5l5 5',send:'M12 19V5m-7 7 7-7 7 7',stop:'M6 6h12v12H6Z',plus:'M12 5v14M5 12h14',clip:'m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2',info:'M12 10v7M12 6h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z'})[kind]||'M5 12h14');svg.append(p);return svg;}
export function toast(message){const n=node('div',message);n.className='loox-toast';n.role='status';document.body.append(n);setTimeout(()=>n.remove(),4500);}
let active=null;
export function dialog({title='Confirm action',message='',value,confirmText='Continue',danger=false,maxLength=120,onSubmit}={}){
 if(active)return Promise.resolve(null);
 return new Promise(resolve=>{
  const previous=document.activeElement,d=node('dialog');d.className='loox-dialog';active=d;
  const heading=node('h2',title),description=node('p',message);heading.id='loox-dialog-title';description.id='loox-dialog-description';d.setAttribute('aria-labelledby',heading.id);d.setAttribute('aria-describedby',description.id);
  const f=node('form');f.noValidate=true;const badge=icon(danger?'trash':value!==undefined?'edit':'info');badge.classList.add('loox-dialog-icon');f.append(badge,heading,description);
  let input;if(value!==undefined){const label=node('label','New name');input=node('input');input.id='loox-dialog-input';label.htmlFor=input.id;input.value=value;input.maxLength=maxLength;input.required=true;input.autocomplete='off';f.append(label,input);}
  const error=node('p');error.className='loox-dialog-error';error.role='alert';const actions=node('div');actions.className='loox-dialog-actions';const cancel=node('button','Cancel'),save=node('button',confirmText);cancel.type='button';save.type='submit';save.className=danger?'is-danger':'is-primary';actions.append(cancel,save);f.append(error,actions);d.append(f);document.body.append(d);
  let pending=false,done=false;
  const finish=result=>{if(done)return;done=true;d.close();d.remove();active=null;previous?.isConnected&&previous.focus({preventScroll:true});resolve(result);};
  cancel.onclick=()=>{if(!pending)finish(null);};d.addEventListener('cancel',e=>{e.preventDefault();if(!pending)finish(null);});
  d.addEventListener('click',e=>{if(e.target===d&&!pending){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)finish(null);}});
  f.onsubmit=async e=>{e.preventDefault();if(pending)return;const result=input?input.value.trim():true;if(input&&(!result||result.length>maxLength)){error.textContent='Enter a name between 1 and '+maxLength+' characters.';input.focus();return;}pending=true;cancel.disabled=save.disabled=true;save.textContent='Saving…';d.setAttribute('aria-busy','true');error.textContent='';try{await onSubmit?.(result);finish(result);}catch(err){error.textContent=err.message||'Could not complete this action. Please retry.';}finally{pending=false;cancel.disabled=save.disabled=false;save.textContent=confirmText;d.removeAttribute('aria-busy');}};
  d.showModal();(input||cancel).focus();input?.select();
 });
}
export const confirmDialog=message=>dialog({title:/delete|remove/i.test(message)?'Confirm deletion':'Please confirm',message,confirmText:/delete|remove/i.test(message)?'Delete':'Continue',danger:/delete|remove/i.test(message)}).then(Boolean);
export const promptDialog=(message,value='')=>dialog({title:'Edit name',message,value,confirmText:'Save',maxLength:300});
export const alertDialog=message=>dialog({title:'Notice',message,confirmText:'OK'});
