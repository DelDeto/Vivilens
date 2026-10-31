let installed=false;
// Attention Mesh repeats small integer coordinate grids with MatMul. TFJS
// 4.22 WASM only implements float32 MatMul. Cast these bounded, exactly
// representable grids around the existing kernel, retaining integer output.
export function installAttentionWasmCompat(tf){
 if(installed)return;installed=true;
 const base=tf.getKernel('BatchMatMul','wasm'),cast=tf.getKernel('Cast','wasm').kernelFunc;
 tf.unregisterKernel('BatchMatMul','wasm');
 tf.registerKernel({...base,kernelFunc(args){
  const {a,b}=args.inputs,backend=args.backend;
  if(a.dtype!=='int32'||b.dtype!=='int32')return base.kernelFunc(args);
  const av=backend.readSync(a.dataId),bv=backend.readSync(b.dataId);
  const max=values=>values.reduce((n,v)=>Math.max(n,Math.abs(v)),0);
  const inner=a.shape[a.shape.length-(args.attrs.transposeA?2:1)];
  if(max(av)*max(bv)*inner>16777216)throw new Error('INTEGER_GRID_OUT_OF_RANGE');
  let af,bf,out;
  try{
   af=cast({inputs:{x:a},backend,attrs:{dtype:'float32'}});bf=cast({inputs:{x:b},backend,attrs:{dtype:'float32'}});
   out=base.kernelFunc({...args,inputs:{a:af,b:bf}});
   return cast({inputs:{x:out},backend,attrs:{dtype:'int32'}});
  }finally{for(const temporary of [af,bf,out])if(temporary)backend.disposeData(temporary.dataId)}
 }});
}
