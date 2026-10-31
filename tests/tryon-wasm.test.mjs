import test from 'node:test';
import assert from 'node:assert/strict';
import tf from '@tensorflow/tfjs-core';
import wasm from '@tensorflow/tfjs-backend-wasm';
import {installAttentionWasmCompat} from '../src/tryon/wasm-compat.js';

test('CPU attention compatibility preserves integer grids, transpose/broadcast, floats and tensor cleanup',async()=>{
 wasm.setWasmPaths(new URL('../node_modules/@tensorflow/tfjs-backend-wasm/dist/',import.meta.url).pathname);
 wasm.setThreadsCount(1);installAttentionWasmCompat(tf);await tf.setBackend('wasm');
 const before=tf.memory().numTensors;
 for(let iteration=0;iteration<3;iteration++){
  tf.tidy(()=>{
   const a=tf.tensor2d([[1,2],[3,4]],undefined,'int32'),b=tf.tensor2d([[5,6],[7,8]],undefined,'int32');
   const result=tf.matMul(a,b);assert.equal(result.dtype,'int32');assert.deepEqual(Array.from(result.dataSync()),[19,22,43,50]);
   assert.deepEqual(Array.from(tf.matMul(a,b,true).dataSync()),[26,30,38,44]);
   const grids=tf.matMul(tf.tensor3d([1,2,3,4],[2,2,1],'int32'),tf.tensor3d([1,1,1],[1,1,3],'int32'));
   assert.deepEqual(grids.shape,[2,2,3]);assert.deepEqual(Array.from(grids.dataSync()),[1,1,1,2,2,2,3,3,3,4,4,4]);
   assert.deepEqual(Array.from(tf.matMul(tf.tensor2d([[.5,1]]),tf.tensor2d([[2],[3]])).dataSync()),[4]);
  });
 }
 assert.equal(tf.memory().numTensors,before);
 assert.throws(()=>tf.tidy(()=>tf.matMul(tf.tensor2d([[20000000]],undefined,'int32'),tf.tensor2d([[2]],undefined,'int32'))),/INTEGER_GRID_OUT_OF_RANGE/);
 assert.equal(tf.memory().numTensors,before);
});
