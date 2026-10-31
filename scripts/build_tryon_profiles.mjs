import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog/seo_catalog.json'),'utf8'));
const samples=[['milk-tea-brown',.105,.895,.073],['fairy-gray',.113,.864,.073],['fairy-pink',.11,.887,.077],['mist-blue',.119,.835,.075],['olive-brown',.127,.91,.081],['bubble-brown',.112,.878,.077]];
const profiles=[];
for(const [slug,x,y,r] of samples){
 const p=catalog.find(p=>p.slug===slug),response=await fetch(p.image_url);if(!response.ok)throw new Error('Missing source photo: '+slug);const bytes=Buffer.from(await response.arrayBuffer());
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),radius=r*info.width,cx=x*info.width,cy=y*info.height;
 const bands=[[.38,.6],[.6,.8],[.8,.93]].map(([min,max])=>{
  let sum=[0,0,0],n=0;for(let yy=Math.floor(cy-radius);yy<=cy+radius;yy++)for(let xx=Math.floor(cx-radius);xx<=cx+radius;xx++){
   const rr=Math.hypot(xx-cx,yy-cy)/radius;if(rr<min||rr>max||xx<0||yy<0||xx>=info.width||yy>=info.height)continue;
   const at=(yy*info.width+xx)*4,rgb=[data[at],data[at+1],data[at+2]],luma=rgb.reduce((a,b)=>a+b)/3;
   if(luma<30||luma>220)continue;sum=sum.map((s,i)=>s+rgb[i]);n++;
  }
  if(n<50)throw new Error('Insufficient color samples: '+slug);return '#'+sum.map(s=>Math.round(s/n).toString(16).padStart(2,'0')).join('');
 });
 profiles.push({slug,name:p.name,color:p.color,image:p.image_url,mode:'color-only',palette:{inner:bands[0],mid:bands[1],outer:bands[2]},source:{url:p.image_url,sha256:createHash('sha256').update(bytes).digest('hex'),sampleCircle:{x,y,r},note:'Radial average from the product illustration; no calibrated lens artwork available.'}});
}
await fs.writeFile(path.join(root,'catalog/tryon_profiles.json'),JSON.stringify(profiles,null,2)+'\n');console.log('Six photo-sampled color profiles written; original photos unchanged.');
