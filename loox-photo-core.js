/* Pure geometry shared by rendering, hit testing and editor regression tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LOOXPhotoCore=api})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 const bounds=o=>o.bounds||{x:o.x||0,y:o.y||0,w:o.w||1,h:o.h||1};
 function rotateLayer(o,dir,width,height,rect=bounds(o)){
  if(o.type==='stroke')return {...o,points:o.points.map(p=>({x:dir>0?height-p.y:p.y,y:dir>0?p.x:width-p.x}))};
  const cx=rect.x+rect.w/2,cy=rect.y+rect.h/2;
  return {...o,x:(dir>0?height-cy:cy)-rect.w/2,y:(dir>0?cx:width-cx)-rect.h/2,rotation:((o.rotation||0)+dir*90)%360};
 }
 function flipLayer(o,horizontal,width,height,rect=bounds(o)){
  if(o.type==='stroke')return {...o,points:o.points.map(p=>({x:horizontal?width-p.x:p.x,y:horizontal?p.y:height-p.y}))};
  return {...o,x:horizontal?width-rect.x-rect.w:rect.x,y:horizontal?rect.y:height-rect.y-rect.h,rotation:-(o.rotation||0),[horizontal?'flipX':'flipY']:!o[horizontal?'flipX':'flipY']};
 }
 function localPoint(p,o,rect=bounds(o)){
  const a=-(o.rotation||0)*Math.PI/180,cx=rect.x+rect.w/2,cy=rect.y+rect.h/2,dx=p.x-cx,dy=p.y-cy;
  return {x:cx+(dx*Math.cos(a)-dy*Math.sin(a))*(o.flipX?-1:1),y:cy+(dx*Math.sin(a)+dy*Math.cos(a))*(o.flipY?-1:1)};
 }
 function snapCenter(rect,width,height,tolerance){
  const out={...rect},vertical=Math.abs(rect.x+rect.w/2-width/2)<=tolerance.x,horizontal=Math.abs(rect.y+rect.h/2-height/2)<=tolerance.y;
  if(vertical)out.x=(width-rect.w)/2;if(horizontal)out.y=(height-rect.h)/2;
  return {rect:out,vertical,horizontal};
 }
 function outputSize(width,height,edge,customWidth,customHeight){
  let w=width,h=height;
  if(edge==='custom'){w=Number(customWidth);h=Number(customHeight)}else if(edge!=='original'){const scale=Number(edge)/Math.max(w,h);w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale))}
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>8000||h>8000||w*h>24000000)throw Error('Use whole dimensions from 1–8000 px, up to 24 megapixels.');
  return {w,h};
 }
 return {rotateLayer,flipLayer,localPoint,snapCenter,outputSize};
});
