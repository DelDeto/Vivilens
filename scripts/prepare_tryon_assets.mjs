import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {visionVersion,wasmPath,detectorPath,landmarkPath} from '../src/tryon/runtime-config.js';
const root=path.resolve(import.meta.dirname,'..'),target=path.join(root,process.argv.includes('--public')?'public':'dist');
const manifest=JSON.parse(await fs.readFile(path.join(root,'catalog/tryon_runtime_assets.json'),'utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
const cache=path.join(root,'.cache/tryon-tfjs');await fs.mkdir(cache,{recursive:true});
for(const [name,model] of Object.entries(manifest)){
 const folder=path.join(cache,name);await fs.mkdir(folder,{recursive:true});
 let complete=true;
 for(const file of model.files){try{if(sha(await fs.readFile(path.join(folder,file.path)))!==file.sha256)complete=false}catch{complete=false}}
 if(!complete){
  let archive;try{archive=await fs.readFile(path.join(cache,name+'.tar.gz'))}catch{}
  if(!archive||sha(archive)!==model.archiveSha256){
   const response=await fetch(model.url,{signal:AbortSignal.timeout(55000)});if(!response.ok)throw new Error('Could not download official '+name+' model');
   archive=Buffer.from(await response.arrayBuffer());if(sha(archive)!==model.archiveSha256)throw new Error('Model archive integrity check failed');await fs.writeFile(path.join(cache,name+'.tar.gz'),archive);
  }
  // Read only the explicitly pinned regular files, never arbitrary archive paths.
  const tar=gunzipSync(archive);
  for(let offset=0;offset+512<=tar.length;){
   const header=tar.subarray(offset,offset+512),filename=header.subarray(0,100).toString().replace(/\0.*$/s,''),size=parseInt(header.subarray(124,136).toString().replace(/\0.*$/s,'').trim(),8)||0;
   const expected=model.files.find(f=>f.path===filename.replace(/^\.\//,''));
   if(expected){const data=tar.subarray(offset+512,offset+512+size);if(sha(data)!==expected.sha256)throw new Error('Model file integrity check failed');await fs.writeFile(path.join(folder,expected.path),data)}
   offset+=512+Math.ceil(size/512)*512;
  }
 }
 const output=path.dirname(path.join(target,(name==='detector'?detectorPath:landmarkPath).slice(1)));await fs.mkdir(output,{recursive:true});
 for(const file of model.files){const data=await fs.readFile(path.join(folder,file.path));if(sha(data)!==file.sha256)throw new Error('Model integrity check failed');await fs.writeFile(path.join(output,file.path),data)}
}
const packageRoot=path.join(root,'node_modules/@tensorflow/tfjs-backend-wasm');
if(JSON.parse(await fs.readFile(path.join(packageRoot,'package.json'),'utf8')).version!==visionVersion)throw new Error('Try-on runtime version mismatch');
const wasmTarget=path.join(target,wasmPath.slice(1));await fs.mkdir(wasmTarget,{recursive:true});
for(const file of ['tfjs-backend-wasm.wasm','tfjs-backend-wasm-simd.wasm','tfjs-backend-wasm-threaded-simd.wasm'])await fs.copyFile(path.join(packageRoot,'dist',file),path.join(wasmTarget,file));
await build({entryPoints:[path.join(root,'src/tryon/landmarks.worker.js')],outfile:path.join(target,'tryon/landmarks-v1.7.0.js'),bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,define:{'import.meta.env.DEV':process.argv.includes('--public')?'true':'false'},legalComments:'eof'});
for(const obsolete of ['wasm','wasm-v1.2.0','models/face_landmarker.task','models/face_landmarker-64184e229b26.task'])await fs.rm(path.join(target,'tryon',obsolete),{recursive:true,force:true});
console.log('Try-on CPU runtime prepared on the same origin; both official models SHA-256 verified.');
