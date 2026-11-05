(() => {
 'use strict';
 const form=document.getElementById('loox-image-landing-form');
 const prompt=document.getElementById('loox-landing-prompt');
 const storageKey='loox-image-generator-draft-v2';
 if(!form||!prompt)return;
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const value=prompt.value.trim();
  if(!value){prompt.focus();return;}
  if(value.length>1200){prompt.setCustomValidity('Use 1,200 characters or fewer.');prompt.reportValidity();return;}
  prompt.setCustomValidity('');
  try{sessionStorage.setItem(storageKey,value);}catch{}
  // Open the existing real generator with the prompt prefilled; the user
  // chooses a model and confirms generation there (no hidden credit charge).
  location.assign('ai-text-to-image.html#generate');
 });
 prompt.addEventListener('input',()=>prompt.setCustomValidity(''));
 document.getElementById('loox-landing-add')?.addEventListener('click',()=>{
  const value=prompt.value.trim();
  try{if(value)sessionStorage.setItem(storageKey,value);}catch{}
  location.assign('ai-text-to-image.html#generate');
 });
 document.querySelectorAll('.loox-landing-ideas [data-prompt]').forEach(button=>{
  button.addEventListener('click',()=>{
   prompt.value=button.dataset.prompt||'';
   prompt.focus();
  });
 });
})();