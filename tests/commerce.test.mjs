import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCustomer,normalizeItems,normalizeSettings,cartItemsForCheckout,subtractPurchasedCart,checkoutAttempt,rememberReceipt,receiptToken,randomRequestId} from '../src/commerce.js';
import {routeFromPath,pathForPage} from '../src/routing.js';
import {socialMetadata} from '../src/social.js';
const id='12345678-1234-4234-8234-123456789abc';
test('preview browsers without crypto.randomUUID still create valid version-4 request IDs using secure random bytes',()=>{
 const id=randomRequestId({getRandomValues(bytes){bytes.fill(143);return bytes}});
 assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('checkout never treats an empty power as plano or accepts unsupported half powers',()=>{
 const valid={product_id:id,quantity:1,left_power:0,right_power:-1.25,box_price:1};
 assert.deepEqual(normalizeItems([valid]),[{product_id:id,quantity:1,left_power:0,right_power:-1.25}]);
 for(const power of ['',null,undefined,false,[],{},' ',-0.5,-0.25,-0.75,-7.25,-8.25])assert.throws(()=>normalizeItems([{...valid,left_power:power}]),/INVALID_POWER/);
 assert.throws(()=>normalizeItems([{...valid,quantity:0}]),/INVALID_CART/);
 assert.throws(()=>normalizeItems([{...valid,quantity:1.5}]),/INVALID_CART/);
 assert.throws(()=>normalizeItems([{...valid,quantity:10},{...valid,quantity:10},{...valid,quantity:1}]),/CART_LIMIT/);
});
test('both variant eyes are required and cart payload excludes client price and contact data',()=>{
 assert.throws(()=>normalizeItems([{product_id:id,quantity:1,left_variant_id:id}]),/INVALID_POWER/);
 assert.deepEqual(cartItemsForCheckout([{id,qty:2,leftVariantId:id,rightVariantId:id,price:1,name:'Not trusted'}]),[{product_id:id,quantity:2,left_variant_id:id,right_variant_id:id}]);
});
test('checkout customer consent and bounded delivery information are mandatory',()=>{
 const c={name:'Khách thử',phone:'090 123 4567',address:'12 đường thử, phường thử',city:'Hà Nội',note:'',consent:true};
 assert.equal(normalizeCustomer(c).phone,'0901234567');
 for(const patch of [{consent:false},{address:'x'},{phone:'invalid'},{note:'x'.repeat(1001)}])assert.throws(()=>normalizeCustomer({...c,...patch}),/INVALID_CUSTOMER/);
});
test('unknown shipping fee remains unknown; free shipping requires an explicit configured zero',()=>{
 assert.equal(normalizeSettings({shipping_mode:'confirm',shipping_fee:0}).shipping_fee,null);
 assert.equal(normalizeSettings({shipping_mode:'fixed',shipping_fee:0}).shipping_fee,0);
 for(const fee of ['',null,-1,0.5,1000001])assert.throws(()=>normalizeSettings({shipping_mode:'fixed',shipping_fee:fee}),/INVALID_SETTINGS/);
 assert.throws(()=>normalizeSettings({shipping_mode:'confirm',zalo_url:'javascript:alert(1)'}),/INVALID_SETTINGS/);
});
test('completing checkout preserves other eye combinations and quantities added after submission',()=>{
 const purchased=[{id,qty:1,leftPower:0,rightPower:-1.25}];
 const current=[{...purchased[0],qty:3},{id,qty:1,leftPower:-2,rightPower:-2},{id:'other',qty:1,leftPower:0,rightPower:0}];
 const remaining=subtractPurchasedCart(current,purchased);
 assert.equal(remaining.length,3);assert.equal(remaining[0].qty,2);assert.equal(remaining[1].qty,1);
 assert.equal(subtractPurchasedCart(purchased,purchased).length,0);
});
test('checkout and receipt URLs are private; help routes remain shareable',()=>{
 const order={code:'VV-ABC123DEF456'};
 assert.equal(pathForPage('receipt',order),'/order/'+order.code);
 assert.deepEqual(routeFromPath('/order/'+order.code),{page:'receipt',code:order.code});
 assert.deepEqual(routeFromPath('/help/returns'),{page:'help',topic:'returns'});
 assert.equal(routeFromPath('/help/not-a-page').page,'notfound');
 assert.equal(socialMetadata('checkout').hidden,true);assert.equal(socialMetadata('receipt').hidden,true);
 assert.match(socialMetadata('help',null,undefined,'/help/shipping').title,/Vận chuyển/);
});
test('network retries reuse a checkout key and receipt access survives blocked session storage in the same view',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage'),values=new Map();
 try{
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}});
  const first=checkoutAttempt([{product_id:id,quantity:1,left_power:0,right_power:-1}]);
  const retry=checkoutAttempt([{product_id:id,quantity:1,left_power:0,right_power:-1}]);
  assert.equal(first.request_id,retry.request_id);assert.equal(first.receipt_token,retry.receipt_token);
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem(){throw new Error('Blocked')},setItem(){throw new Error('Blocked')},removeItem(){throw new Error('Blocked')}}});
  rememberReceipt({code:'VV-000000000001'},first.receipt_token);
  assert.equal(receiptToken('VV-000000000001'),first.receipt_token);
 }finally{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete globalThis.sessionStorage;}
});
