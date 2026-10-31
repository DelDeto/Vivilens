import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import {setWasmPaths,setThreadsCount} from '@tensorflow/tfjs-backend-wasm';
import {createDetector,SupportedModels} from '@tensorflow-models/face-landmarks-detection';
import {eyesFromLandmarks} from './geometry.js';
import {wasmPath,detectorPath,landmarkPath} from './runtime-config.js';
import {installAttentionWasmCompat} from './wasm-compat.js';

export async function createCpuDetector(){
 // CPU inference also works without WebGL. One thread avoids cross-origin
 // isolation requirements and leaves the rest of the storefront unaffected.
 setWasmPaths(new URL(wasmPath,globalThis.location.origin).href);
 tf.env().set('WASM_HAS_MULTITHREAD_SUPPORT',false);setThreadsCount(1);
 installAttentionWasmCompat(tf);
 if(!await tf.setBackend('wasm'))throw new Error('WASM_UNAVAILABLE');
 await tf.ready();
 const detector=await createDetector(SupportedModels.MediaPipeFaceMesh,{runtime:'tfjs',refineLandmarks:true,maxFaces:2,detectorModelUrl:new URL(detectorPath,globalThis.location.origin).href,landmarkModelUrl:new URL(landmarkPath,globalThis.location.origin).href});
 const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas');
 const context=canvas.getContext('2d',{willReadFrequently:true});
 return {
  close(){detector.dispose()},
  async detect(bitmap,video=false){
   const scale=Math.min(1,768/Math.max(bitmap.width,bitmap.height));
   canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   // Tensor input avoids DOM/WebGL pixel conversion inside the model.
   const pixels=context.getImageData(0,0,canvas.width,canvas.height),rgb=new Int32Array(canvas.width*canvas.height*3);
   for(let i=0,j=0;i<pixels.data.length;i+=4){rgb[j++]=pixels.data[i];rgb[j++]=pixels.data[i+1];rgb[j++]=pixels.data[i+2]}
   const input=tf.tensor3d(rgb,[canvas.height,canvas.width,3],'int32');
   try{
    if(!video)detector.reset();
    const faces=await detector.estimateFaces(input,{flipHorizontal:false,staticImageMode:!video}),count=faces.length;
    const points=count===1?faces[0].keypoints.map(p=>({x:p.x/canvas.width,y:p.y/canvas.height})):[];
    return {count,eyes:eyesFromLandmarks(points,bitmap.width,bitmap.height)};
   }finally{input.dispose()}
  }
 };
}
