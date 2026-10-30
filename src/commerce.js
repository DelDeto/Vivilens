import {normalizeItems,errorMessages} from '../supabase/functions/vivilens-commerce/domain.mjs';
export {normalizeCustomer,normalizeItems,normalizeSettings,statusLabels,nextStatuses,errorMessages} from '../supabase/functions/vivilens-commerce/domain.mjs';
export const ORDER_COLUMNS='id,code,customer_user_id,customer_name,phone,address,city,note,status,payment_method,subtotal,shipping_fee,total,shipping_mode,customer_confirmed_at,inventory_released_at,carrier,tracking_code,created_at,updated_at';
export function randomRequestId(source=globalThis.crypto){
 if(source.randomUUID)return source.randomUUID();
 const bytes=source.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
export const defaultStoreSettings={shop_name:'VIVILENS',shipping_mode:'confirm',shipping_fee:null,shipping_text:'Phí giao hàng và thời gian dự kiến được cửa hàng xác nhận theo địa chỉ nhận hàng trước khi gửi. Đơn chỉ được giao sau khi khách đồng ý tổng tiền thu hộ.',returns_text:'',contact_phone:'',contact_email:'',contact_address:'',zalo_url:'',facebook_url:'',instagram_url:''};
export async function commerceRequest(supabase,action,payload={}){
 if(!supabase)throw Object.assign(new Error(errorMessages.SERVICE_UNAVAILABLE),{code:'SERVICE_UNAVAILABLE'});
 const {data,error}=await supabase.functions.invoke('vivilens-commerce',{body:{action,...payload}});
 if(error){let body;try{body=await error.context?.json()}catch{}const code=body?.error||'SERVICE_UNAVAILABLE';throw Object.assign(new Error(body?.message||errorMessages[code]||errorMessages.SERVICE_UNAVAILABLE),{code});}
 if(data?.error)throw Object.assign(new Error(data.message||errorMessages[data.error]||errorMessages.SERVICE_UNAVAILABLE),{code:data.error});return data;
}
export function cartItemsForCheckout(cart){return normalizeItems(cart.map(c=>({product_id:c.id,quantity:c.qty,...(c.leftVariantId||c.rightVariantId?{left_variant_id:c.leftVariantId,right_variant_id:c.rightVariantId}:{left_power:c.leftPower,right_power:c.rightPower})})));}
const cartIdentity=c=>[c.id,c.leftVariantId||'power:'+c.leftPower,c.rightVariantId||'power:'+c.rightPower].join('::');
export function subtractPurchasedCart(current,purchased){
 const counts=new Map();for(const c of purchased){const key=cartIdentity(c);counts.set(key,(counts.get(key)||0)+c.qty)}
 return current.flatMap(c=>{const key=cartIdentity(c),used=Math.min(c.qty,counts.get(key)||0);counts.set(key,(counts.get(key)||0)-used);return c.qty>used?[{...c,qty:c.qty-used}]:[]});
}
export function checkoutAttempt(payload){
 const fingerprint=JSON.stringify(payload);let stored;try{stored=JSON.parse(sessionStorage.getItem('vivilens-checkout-attempt')||'null')}catch{}
 if(stored?.fingerprint===fingerprint&&stored.request_id&&stored.receipt_token)return stored;
 const storedNew={fingerprint,request_id:randomRequestId(),receipt_token:[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('')};
 try{sessionStorage.setItem('vivilens-checkout-attempt',JSON.stringify(storedNew))}catch{}return storedNew;
}
const receiptMemory=new Map();let recentMemory='';
export function rememberReceipt(order,token){receiptMemory.set(order.code,token);recentMemory=order.code;try{sessionStorage.setItem('vivilens-receipt:'+order.code,token);sessionStorage.setItem('vivilens-recent-order',order.code);sessionStorage.removeItem('vivilens-checkout-attempt')}catch{}}
export function receiptToken(code){if(receiptMemory.has(code))return receiptMemory.get(code);try{return sessionStorage.getItem('vivilens-receipt:'+code)||''}catch{return ''}}
export function recentOrder(){try{return sessionStorage.getItem('vivilens-recent-order')||recentMemory}catch{return recentMemory}}
