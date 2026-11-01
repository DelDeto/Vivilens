import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import sharp from 'sharp';
import {eyesFromLandmarks} from '../src/tryon/geometry.js';
import {installAttentionWasmCompat} from '../src/tryon/wasm-compat.js';
import {sampleEyePalette} from '../src/tryon/sample.js';

const root=path.resolve(import.meta.dirname,'..'),cache=path.join(root,'.cache/tryon-all-sources');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog/seo_catalog.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const overrides=JSON.parse(await fs.readFile(path.join(root,'catalog/tryon_sample_overrides.json'),'utf8'));
await fs.mkdir(cache,{recursive:true});
let cacheManifest={};try{cacheManifest=JSON.parse(await fs.readFile(path.join(cache,'manifest.json'),'utf8'))}catch{}
let detections={};try{detections=JSON.parse(await fs.readFile(path.join(cache,'detections-v1.json'),'utf8'))}catch{}

const require=createRequire(import.meta.url),tf=require('@tensorflow/tfjs-core'),wasm=require('@tensorflow/tfjs-backend-wasm'),mesh=require('@tensorflow-models/face-landmarks-detection');
wasm.setWasmPaths(path.join(root,'node_modules/@tensorflow/tfjs-backend-wasm/dist/'));wasm.setThreadsCount(1);
installAttentionWasmCompat(tf);await tf.setBackend('wasm');
async function localModel(name){
 const folder=path.join(root,'.cache/tryon-tfjs',name),pinned=JSON.parse(await fs.readFile(path.join(root,'catalog/tryon_runtime_assets.json'),'utf8'))[name];
 for(const file of pinned.files)if(hash(await fs.readFile(path.join(folder,file.path)))!==file.sha256)throw new Error('Run npm run tryon:assets to restore the verified model files');
 const json=JSON.parse(await fs.readFile(path.join(folder,'model.json'),'utf8'));
 const weights=Buffer.concat(await Promise.all(json.weightsManifest.flatMap(m=>m.paths.map(p=>fs.readFile(path.join(folder,p))))));
 return {load:async()=>({modelTopology:json.modelTopology,signature:json.signature,weightSpecs:json.weightsManifest.flatMap(m=>m.weights),weightData:weights.buffer.slice(weights.byteOffset,weights.byteOffset+weights.byteLength)})};
}
const detector=await mesh.createDetector(mesh.SupportedModels.MediaPipeFaceMesh,{runtime:'tfjs',refineLandmarks:true,maxFaces:4,detectorModelUrl:await localModel('detector'),landmarkModelUrl:await localModel('landmark')});
const profiles=[],missing=[],audit=[];
for(const p of catalog){
 const override=overrides[p.slug],url=override?.imagePosition?(p.images.find(i=>i.position===override.imagePosition)?.image_url):p.image_url;
 if(!url)throw new Error('Missing source URL: '+p.slug);
 const imageFile=path.join(cache,p.slug+'.webp');let bytes;
 if(cacheManifest[p.slug]?.url===url){try{bytes=await fs.readFile(imageFile);if(hash(bytes)!==cacheManifest[p.slug].sha256)bytes=null}catch{}}
 if(!bytes){const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error('Missing source photo: '+p.slug);bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(imageFile,bytes)}
 const sha256=hash(bytes);cacheManifest[p.slug]={url,sha256};
 const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let eyes;
 if(override?.eyes){
  eyes=override.eyes.map((e,i)=>({id:String(i),cx:e.x*info.width,cy:e.y*info.height,rx:e.rx*info.width,ry:(e.ry??e.rx)*info.width,angle:e.angle||0,contour:null}));
 }else if(detections[p.slug]?.sha256===sha256&&detections[p.slug]?.regionKey===JSON.stringify(override?.region||null)){eyes=detections[p.slug].eyes}
 else{
  const region=override?.region?{left:Math.round(override.region.x*info.width),top:Math.round(override.region.y*info.height),width:Math.round(override.region.width*info.width),height:Math.round(override.region.height*info.height)}:{left:0,top:0,width:info.width,height:info.height};
  const analysis=await sharp(bytes).extract(region).resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const input=tf.tensor3d(new Uint8Array(analysis.data),[analysis.info.height,analysis.info.width,3],'int32');
  try{
   detector.reset();const faces=await detector.estimateFaces(input,{staticImageMode:true});
   const candidates=faces.map(face=>({area:face.box.width*face.box.height,eyes:eyesFromLandmarks(face.keypoints.map(k=>({x:(region.left+k.x/analysis.info.width*region.width)/info.width,y:(region.top+k.y/analysis.info.height*region.height)/info.height})),info.width,info.height)})).filter(f=>f.eyes.length===2).sort((a,b)=>b.area-a.area);
   eyes=candidates[0]?.eyes||[];detections[p.slug]={sha256,regionKey:JSON.stringify(override?.region||null),eyes};
  }finally{input.dispose()}
 }
 if(!eyes?.length){missing.push(p.slug);continue}
 let sampled;try{sampled=sampleEyePalette(data,info.width,info.height,eyes)}catch{missing.push(p.slug);continue}
 const rounded=value=>Math.round(value*1e7)/1e7;
 profiles.push({slug:p.slug,name:p.name,color:p.color,image:p.image_url,mode:'color-only',palette:sampled.palette,source:{url,sha256,method:override?'reviewed-iris-photo':'detected-iris-photo',sampleEyes:eyes.map(e=>({x:rounded(e.cx/info.width),y:rounded(e.cy/info.height),rx:rounded(e.rx/info.width),ry:rounded(e.ry/info.width),angle:rounded(e.angle),...(e.contour?{contour:e.contour.map(q=>[rounded(q.x/info.width),rounded(q.y/info.height)])}:{})})),pixelsPerBand:sampled.counts,note:'Reference tone sampled from the worn iris in the authentic product photo; not a calibrated product texture.'}});
 audit.push({slug:p.slug,eyes,palette:sampled.palette,width:info.width,height:info.height});
 if(profiles.length%20===0)console.log('Product iris palettes:',profiles.length);
}
detector.dispose();
await fs.writeFile(path.join(cache,'manifest.json'),JSON.stringify(cacheManifest,null,2)+'\n');
await fs.writeFile(path.join(cache,'detections-v1.json'),JSON.stringify(detections)+'\n');
await fs.writeFile(path.join(cache,'audit.json'),JSON.stringify(audit)+'\n');
if(missing.length)throw new Error('Review iris samples for: '+missing.join(', '));
// Keep the familiar six entry choices, then make every other public model reachable.
const featured=['milk-tea-brown','fairy-gray','fairy-pink','mist-blue','olive-brown','bubble-brown'];
profiles.sort((a,b)=>{const ai=featured.indexOf(a.slug),bi=featured.indexOf(b.slug);return ai<0&&bi<0?a.name.localeCompare(b.name,'en'):ai<0?1:bi<0?-1:ai-bi});
await fs.writeFile(path.join(root,'catalog/tryon_profiles.json'),JSON.stringify(profiles,null,2)+'\n');
await fs.writeFile(path.join(root,'catalog/tryon_index.json'),JSON.stringify(profiles.map(p=>p.slug),null,2)+'\n');
console.log(`${profiles.length} product-specific photo-sampled color profiles written; original photos unchanged.`);
