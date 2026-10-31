import {createCpuDetector} from './cpu-detector.js';
let task=null;
self.onmessage=async({data})=>{
 const bitmap=data.bitmap;
 try{
  if(data.type==='init'){
   task=await createCpuDetector();self.postMessage({id:data.id,type:'ready'});return;
  }
  if(!task||!bitmap)throw new Error('NOT_READY');
  const result=await task.detect(bitmap,data.video);
  self.postMessage({id:data.id,type:'result',...result});
 }catch(error){self.postMessage({id:data.id,type:'error',code:data.type==='init'?'MODEL_UNAVAILABLE':'DETECTION_FAILED',...(import.meta.env.DEV?{detail:String(error?.stack||error?.message||error).slice(0,1200)}:{})})}
 finally{bitmap?.close()}
};
