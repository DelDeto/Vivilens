import {clamp} from './geometry.js';

// A color-only annular simulation. It deliberately has no claim of reproducing
// a product's uncalibrated printed pattern or its physical diameter on an eye.
export function colorTexture(profile,size=256){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d'),c=size/2,r=size*.48;
 const gradient=ctx.createRadialGradient(c,c,r*.25,c,c,r);
 gradient.addColorStop(0,profile.palette.inner);gradient.addColorStop(.48,profile.palette.inner);
 gradient.addColorStop(.76,profile.palette.mid);gradient.addColorStop(.94,profile.palette.outer);gradient.addColorStop(1,profile.palette.outer);
 ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.fill();
 // Fixed subtle radial variation avoids a solid sticker while remaining an
 // honestly generic illustration, not an invented product-specific texture.
 for(let i=0;i<192;i++){
  const angle=i*Math.PI*2/192,variation=(Math.sin(i*91.73)+1)/2;
  ctx.strokeStyle=variation>.5?'rgba(255,255,255,.12)':'rgba(30,25,25,.13)';ctx.lineWidth=.65;
  ctx.beginPath();ctx.moveTo(c+Math.cos(angle)*r*.35,c+Math.sin(angle)*r*.35);ctx.lineTo(c+Math.cos(angle)*r*.94,c+Math.sin(angle)*r*.94);ctx.stroke();
 }
 const mask=document.createElement('canvas');mask.width=mask.height=size;
 const m=mask.getContext('2d'),alpha=m.createRadialGradient(c,c,0,c,c,r);
 alpha.addColorStop(0,'transparent');alpha.addColorStop(.26,'transparent');alpha.addColorStop(.38,'#fff');alpha.addColorStop(.87,'#fff');alpha.addColorStop(1,'transparent');
 m.fillStyle=alpha;m.fillRect(0,0,size,size);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);
 return canvas;
}
function eyelidPath(ctx,contour){
 const last=contour.at(-1),first=contour[0];ctx.beginPath();ctx.moveTo((last.x+first.x)/2,(last.y+first.y)/2);
 for(let i=0;i<contour.length;i++){const p=contour[i],q=contour[(i+1)%contour.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2)}ctx.closePath();
}
export function drawTryOn(canvas,source,eyes,texture,{strength=.65,original=false,mirror=false,split=false,manual=false}={}){
 if(!canvas||!source)return;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.save();if(mirror){ctx.translate(canvas.width,0);ctx.scale(-1,1)}
 ctx.drawImage(source,0,0,canvas.width,canvas.height);
 if(!original&&texture){
  ctx.save();if(split){ctx.beginPath();ctx.rect(mirror?0:canvas.width/2,0,canvas.width/2,canvas.height);ctx.clip()}
  for(const eye of eyes){
   ctx.save();if(eye.contour){eyelidPath(ctx,eye.contour);ctx.clip()}
   ctx.translate(eye.cx,eye.cy);ctx.rotate(eye.angle);ctx.globalAlpha=clamp(strength,.2,.9);
   ctx.drawImage(texture,-eye.rx*1.06,-eye.ry*1.06,eye.rx*2.12,eye.ry*2.12);ctx.restore();
  }ctx.restore();
 }
 if(manual&&!original){
  eyes.forEach((eye,i)=>{ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1.5,canvas.width/650);ctx.beginPath();ctx.arc(eye.cx,eye.cy,eye.rx,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#a24e71';ctx.font=`600 ${Math.max(15,canvas.width/55)}px sans-serif`;ctx.fillText(String(i+1),eye.cx+eye.rx+4,eye.cy)})
 }ctx.restore();
 if(split&&!original){ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,canvas.width/500);ctx.beginPath();ctx.moveTo(canvas.width/2,0);ctx.lineTo(canvas.width/2,canvas.height);ctx.stroke()}
}
export function exportTryOn(canvas,name){
 const out=document.createElement('canvas');out.width=canvas.width;const footer=Math.max(72,Math.round(canvas.width*.085));out.height=canvas.height+footer;
 const ctx=out.getContext('2d');ctx.fillStyle='#fff7fa';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(canvas,0,0);
 ctx.fillStyle='#82415e';ctx.font=`600 ${Math.max(14,Math.round(out.width*.023))}px sans-serif`;ctx.fillText('VIVILENS · '+name,Math.round(out.width*.035),canvas.height+footer*.4);
 ctx.fillStyle='#765c69';ctx.font=`${Math.max(11,Math.round(out.width*.017))}px sans-serif`;ctx.fillText('Mô phỏng tông màu tham khảo · vivilens.pages.dev',Math.round(out.width*.035),canvas.height+footer*.75);
 return new Promise((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(new Error('EXPORT_FAILED')),'image/jpeg',.92));
}
