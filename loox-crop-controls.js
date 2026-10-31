/* LOOX Crop Controls — independent draggable crop frame, corner/edge handles, aspect lock */
(function(global){
 'use strict';
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const copy=r=>({x:r.x,y:r.y,w:r.w,h:r.h});
 const handles=r=>({
  nw:[r.x,r.y],n:[r.x+r.w/2,r.y],ne:[r.x+r.w,r.y],
  e:[r.x+r.w,r.y+r.h/2],se:[r.x+r.w,r.y+r.h],
  s:[r.x+r.w/2,r.y+r.h],sw:[r.x,r.y+r.h],w:[r.x,r.y+r.h/2]
 });
 function hit(r,x,y,pixelW,pixelH){
  const tolX=12/Math.max(1,pixelW),tolY=12/Math.max(1,pixelH);
  const candidates=handles(r);let best=null,dist=Infinity;
  for(const [name,[hx,hy]] of Object.entries(candidates)){
   const d=Math.hypot((x-hx)/tolX,(y-hy)/tolY);
   if(d<=1.15&&d<dist){dist=d;best=name}
  }
  if(best)return best;
  if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return 'move';
  return null
 }
 function drag(original,mode,from,to,pixelW,pixelH,ratio){
  const r=copy(original),dx=to.x-from.x,dy=to.y-from.y,minW=Math.max(.008,8/Math.max(pixelW,1)),minH=Math.max(.008,8/Math.max(pixelH,1));
  if(mode==='move'){
   return {x:clamp(r.x+dx,0,1-r.w),y:clamp(r.y+dy,0,1-r.h),w:r.w,h:r.h}
  }
  let left=r.x,top=r.y,right=r.x+r.w,bottom=r.y+r.h;
  if(mode.includes('w'))left=clamp(left+dx,0,right-minW);
  if(mode.includes('e'))right=clamp(right+dx,left+minW,1);
  if(mode.includes('n'))top=clamp(top+dy,0,bottom-minH);
  if(mode.includes('s'))bottom=clamp(bottom+dy,top+minH,1);
  let width=right-left,height=bottom-top;
  if(ratio>0&&Number.isFinite(ratio)){
   const factor=Math.max(.0001,pixelW)/Math.max(.0001,pixelH)/ratio;
   const horizontal=mode==='e'||mode==='w';
   const vertical=mode==='n'||mode==='s';
   const isWidth=horizontal||(!vertical&&Math.abs(dx*pixelW)>=Math.abs(dy*pixelH));
   if(isWidth){
    height=clamp(width*factor,minH,1);
    width=height/factor;
   }else{
    width=clamp(height/factor,minW,1);
    height=width*factor;
   }
   if(mode.includes('w'))left=right-width;
   else if(mode.includes('e'))right=left+width;
   else{const middle=(left+right)/2;left=middle-width/2;right=middle+width/2}
   if(mode.includes('n'))top=bottom-height;
   else if(mode.includes('s'))bottom=top+height;
   else{const middle=(top+bottom)/2;top=middle-height/2;bottom=middle+height/2}
   if(left<0){right-=left;left=0}if(right>1){left-=right-1;right=1}
   if(top<0){bottom-=top;top=0}if(bottom>1){top-=bottom-1;bottom=1}
   left=clamp(left,0,1-minW);top=clamp(top,0,1-minH);right=clamp(right,left+minW,1);bottom=clamp(bottom,top+minH,1);
  }
  return {x:left,y:top,w:Math.max(minW,right-left),h:Math.max(minH,bottom-top)}
 }
 function draw(ctx,canvasW,canvasH,r,{bounds={x:0,y:0,w:1,h:1},mask=true}={}){
  const x=r.x*canvasW,y=r.y*canvasH,w=r.w*canvasW,h=r.h*canvasH;
  const bx=bounds.x*canvasW,by=bounds.y*canvasH,bw=bounds.w*canvasW,bh=bounds.h*canvasH;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.shadowBlur=0;
  if(mask){
   ctx.fillStyle='rgba(5,8,21,.58)';
   ctx.fillRect(bx,by,bw,Math.max(0,y-by));
   ctx.fillRect(bx,y,Math.max(0,x-bx),h);
   ctx.fillRect(x+w,y,Math.max(0,bx+bw-x-w),h);
   ctx.fillRect(bx,y+h,bw,Math.max(0,by+bh-y-h))
  }
  const thick=Math.max(2,Math.min(canvasW,canvasH)/350);
  ctx.strokeStyle='#f8f4ff';ctx.lineWidth=thick;ctx.setLineDash([]);ctx.strokeRect(x,y,w,h);
  ctx.strokeStyle='rgba(255,255,255,.32)';ctx.lineWidth=Math.max(1,thick*.5);
  for(let i=1;i<=2;i++){ctx.beginPath();ctx.moveTo(x+w*i/3,y);ctx.lineTo(x+w*i/3,y+h);ctx.moveTo(x,y+h*i/3);ctx.lineTo(x+w,y+h*i/3);ctx.stroke()}
  ctx.fillStyle='#fff';ctx.strokeStyle='#8553f0';ctx.lineWidth=Math.max(1,thick*.7);
  const size=Math.max(8,Math.min(19,canvasW/90)),p=handles(r);
  for(const [u,v] of Object.values(p)){
   const xx=u*canvasW,yy=v*canvasH;
   ctx.fillRect(xx-size/2,yy-size/2,size,size);
   ctx.strokeRect(xx-size/2,yy-size/2,size,size)
  }
  ctx.restore()
 }
 global.LOOXCrop={hit,drag,draw,copy};
})(window);
