import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerceHandler} from '../supabase/functions/vivilens-commerce/handler.mjs';
const publicKey='sb_publishable_test_only',secret='sb_secret_test_only',uuid='12345678-1234-4234-8234-123456789abc',token='a'.repeat(64);
const origin='https://vivilens.pages.dev';
const env={get(name){return {SUPABASE_URL:'https://test.invalid',SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:publicKey}),SUPABASE_SECRET_KEYS:JSON.stringify({default:secret})}[name]}};
const makeRequest=(body,headers={})=>new Request('https://test.invalid/functions/v1/vivilens-commerce',{method:'POST',headers:{apikey:publicKey,Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const response=data=>Response.json(data);

test('Edge rejects unknown API keys, foreign origins and unauthenticated admin actions before privileged mutation',async()=>{
 let mutations=0;const handler=createCommerceHandler({env,fetch:async(url,options)=>{if(options.method==='PATCH')mutations++;return response(true)}});
 assert.equal((await handler(makeRequest({action:'quote'},{apikey:'wrong'}))).status,401);
 assert.equal((await handler(makeRequest({action:'quote'},{Origin:'https://unrelated.example'}))).status,403);
 assert.equal((await handler(makeRequest({action:'admin_settings',settings:{shipping_mode:'fixed',shipping_fee:0}}))).status,401);
 assert.equal(mutations,0);
});
test('Edge validates a user JWT against Auth and checks admin membership rather than trusting a supplied actor id',async()=>{
 let privileged=false;const handler=createCommerceHandler({env,fetch:async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return response({id:uuid});
  if(url.includes('/admin_users?'))return response([]);
  privileged=true;return response({});
 }});
 const result=await handler(makeRequest({action:'admin_transition',actor_id:'forged',status:'confirmed',order_id:uuid},{Authorization:'Bearer eyJ.fake.signature'}));
 assert.equal(result.status,403);assert.equal(privileged,false);
});
test('Edge creates a guest order with server-only pricing and returns a receipt without the stored capability hash',async()=>{
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(n=>n.toString(16).padStart(2,'0')).join('');
 let seenArguments;const handler=createCommerceHandler({env,fetch:async(url,options)=>{
  assert.equal(options.headers.apikey,secret);
  if(url.endsWith('/rpc/commerce_rate'))return response(true);
  if(url.endsWith('/rpc/commerce_create_order')){seenArguments=JSON.parse(options.body);return response({id:uuid,code:'VV-ABC123DEF456',replayed:false})}
  if(url.includes('/orders?'))return response([{id:uuid,code:'VV-ABC123DEF456',receipt_hash:digest,customer_user_id:null,subtotal:220000,shipping_fee:null,total:null}]);
  if(url.includes('/order_items?'))return response([{product_name:'Test product',left_power:0,right_power:-1.25,quantity:1,box_price:220000}]);
  throw new Error('Unexpected request');
 }});
 const result=await handler(makeRequest({action:'place_order',request_id:uuid,receipt_token:token,quote_hash:'b'.repeat(64),customer:{name:'Khách kiểm thử',phone:'090 000 0000',address:'Địa chỉ kiểm thử không gửi hàng',city:'Hà Nội',consent:true},items:[{product_id:uuid,quantity:1,left_power:0,right_power:-1.25,box_price:1}],customer_user_id:'forged'}));
 const data=await result.json();assert.equal(result.status,200);assert.equal(seenArguments.p_user_id,null);assert.equal(seenArguments.p_customer.phone,'0900000000');assert.equal(seenArguments.p_items[0].box_price,undefined);assert.equal(data.order.subtotal,220000);assert.equal(data.order.receipt_hash,undefined);assert.ok(!JSON.stringify(data).includes(secret));
});
test('a wrong guest receipt cannot access an existing order or its items',async()=>{
 let itemsRead=false;const handler=createCommerceHandler({env,fetch:async(url)=>{
  if(url.endsWith('/rpc/commerce_rate'))return response(true);
  if(url.includes('/orders?'))return response([{id:uuid,receipt_hash:'0'.repeat(64),customer_user_id:null}]);
  if(url.includes('/order_items?'))itemsRead=true;
  return response([]);
 }});
 const result=await handler(makeRequest({action:'get_order',code:'VV-ABC123DEF456',receipt_token:token}));
 assert.equal(result.status,404);assert.equal(itemsRead,false);
});
