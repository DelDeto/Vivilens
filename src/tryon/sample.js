function contains(polygon,x,y){
 if(!polygon)return true;
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
export function sampleEyePalette(rgb,width,height,eyes){
 const bands=[[.4,.6],[.6,.8],[.8,.94]],counts=[];
 const hex=bands.map(([inner,outer])=>{
  const pixels=[];
  for(const eye of eyes){
   const r=Math.ceil(Math.max(eye.rx,eye.ry)),co=Math.cos(eye.angle||0),si=Math.sin(eye.angle||0);
   for(let y=Math.max(0,Math.floor(eye.cy-r));y<Math.min(height,eye.cy+r);y++)for(let x=Math.max(0,Math.floor(eye.cx-r));x<Math.min(width,eye.cx+r);x++){
    const dx=x-eye.cx,dy=y-eye.cy,rad=Math.hypot((dx*co+dy*si)/eye.rx,(-dx*si+dy*co)/eye.ry);
    if(rad<inner||rad>outer||!contains(eye.contour,x,y))continue;
    const offset=(y*width+x)*3,p=[rgb[offset],rgb[offset+1],rgb[offset+2]],luma=(p[0]+p[1]+p[2])/3;
    if(luma<15||luma>230)continue;pixels.push(p);
   }
  }
  if(pixels.length<20)throw new Error('Insufficient visible iris samples');
  counts.push(pixels.length);
  // Trim highlights/shadows independently by channel; never manufacture a hue
  // from a product name or borrow another product's color profile.
  return '#'+[0,1,2].map(channel=>{
   const values=pixels.map(p=>p[channel]).sort((a,b)=>a-b),trim=Math.floor(values.length*.1),middle=values.slice(trim,values.length-trim);
   return Math.round(middle.reduce((a,b)=>a+b,0)/middle.length).toString(16).padStart(2,'0');
  }).join('');
 });
 return {palette:{inner:hex[0],mid:hex[1],outer:hex[2]},counts};
}
