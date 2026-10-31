export function createVision(){
 let worker=null,next=0,closed=false,serial=Promise.resolve(),mainTask=null;const pending=new Map();
 function finish(id,error,result){const job=pending.get(id);if(!job)return;clearTimeout(job.timer);pending.delete(id);error?job.reject(error):job.resolve(result)}
 function close(){if(closed)return;closed=true;worker?.terminate();mainTask?.close();mainTask=null;for(const id of [...pending.keys()])finish(id,new Error('CLOSED'))}
 function send(message,transfer=[]){
  if(closed){message.bitmap?.close();return Promise.reject(new Error('CLOSED'))}
  const id=++next;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{finish(id,new Error('MODEL_TIMEOUT'));close()},45000);pending.set(id,{resolve,reject,timer});
   try{worker.postMessage({...message,id},transfer)}catch(error){message.bitmap?.close();finish(id,error)}
  });
 }
 const ready=(async()=>{
  if(typeof Worker==='function'&&typeof OffscreenCanvas==='function'){
   worker=new Worker('/tryon/landmarks-v1.7.0.js');
   worker.onmessage=({data})=>{if(data.type==='error'&&import.meta.env.DEV)console.warn('VIVILENS try-on:',data.code,data.detail);finish(data.id,data.type==='error'?new Error(data.code):null,data)};
   worker.onerror=event=>{if(import.meta.env.DEV)console.warn('VIVILENS worker:',event.message);for(const id of [...pending.keys()])finish(id,new Error('MODEL_UNAVAILABLE'))};
   await send({type:'init'});
  }else{
   // Older Safari can still try photos on its main thread, at a lower rate.
   const {createCpuDetector}=await import('./cpu-detector.js');
   const task=await createCpuDetector();if(closed){task.close();throw new Error('CLOSED')}mainTask=task;
  }
 })();
 return {ready,close,get frameInterval(){return mainTask?350:150},detect(bitmap,video=false){
  const call=serial.catch(()=>{}).then(async()=>{
   try{await ready;if(closed)throw new Error('CLOSED');return mainTask?await mainTask.detect(bitmap,video):await send({type:'detect',bitmap,video},[bitmap])}
   finally{try{bitmap.close()}catch{}}
  });serial=call;return call;
 }};
}
