import {UUID,TOKEN,normalizeCustomer,normalizeItems,normalizeSettings,errorMessages,fail} from './domain.mjs';

// Dependency injection keeps endpoint authentication and receipt handling testable without live writes.
export function createCommerceHandler({env,fetch:fetcher=globalThis.fetch}){
const fetch=fetcher;

const url=env.get('SUPABASE_URL');
function keys(name){try{return Object.values(JSON.parse(env.get(name)||'{}')).filter(v=>typeof v==='string')}catch{return []}}
const secret=keys('SUPABASE_SECRET_KEYS')[0]||env.get('SUPABASE_SERVICE_ROLE_KEY');
const publicKeys=[...keys('SUPABASE_PUBLISHABLE_KEYS'),env.get('SUPABASE_ANON_KEY')].filter(Boolean);
const allowedOrigins=new Set(['https://vivilens.pages.dev','https://vivilens.duc-nguyen-ndd127.workers.dev','http://terminal.local:4173',env.get('VIVILENS_SITE_ORIGIN')].filter(Boolean));
const orderColumns='id,code,customer_user_id,customer_name,phone,address,city,note,status,payment_method,subtotal,shipping_fee,total,shipping_mode,customer_confirmed_at,carrier,tracking_code,created_at,updated_at';
async function db(path,method='GET',body){
 const headers={apikey:secret,'Content-Type':'application/json',Prefer:'return=representation'};
 if(secret.startsWith('eyJ'))headers.Authorization='Bearer '+secret;
 const r=await fetch(url+'/rest/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok){const code=Object.keys(errorMessages).find(c=>String(data?.message||'').includes(c));fail(code||'SERVICE_UNAVAILABLE')}
 return data;
}
const rpc=(name,args)=>db('rpc/'+name,'POST',args);
async function currentUser(req,required=false){
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer eyJ')||publicKeys.includes(auth.slice(7))){if(required)fail('AUTH_REQUIRED');return null;}
 const r=await fetch(url+'/auth/v1/user',{headers:{apikey:req.headers.get('apikey'),Authorization:auth},signal:AbortSignal.timeout(10000)});
 if(!r.ok)fail('AUTH_REQUIRED');const user=await r.json();if(!user.id)fail('AUTH_REQUIRED');return user;
}
async function admin(req){const user=await currentUser(req,true);const rows=await db('admin_users?select=user_id&user_id=eq.'+user.id+'&limit=1');if(!rows.length)fail('ADMIN_REQUIRED');return user.id;}
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('')}
async function privateKey(value){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('')}
async function rate(key,limit,seconds){if(!await rpc('commerce_rate',{p_key:key,p_limit:limit,p_seconds:seconds}))fail('RATE_LIMIT')}
async function receipt(req,code,token){
 if(!/^VV-[A-F0-9]{12}$/.test(code||''))fail('ORDER_NOT_FOUND');
 const user=await currentUser(req);const rows=await db('orders?code=eq.'+encodeURIComponent(code)+'&select='+orderColumns+',receipt_hash&limit=1');const order=rows[0];
 if(!order||!(user?.id&&user.id===order.customer_user_id)&&!(TOKEN.test(token||'')&&await hash(token)===order.receipt_hash))fail('ORDER_NOT_FOUND');
 delete order.receipt_hash;order.items=await db('order_items?order_id=eq.'+order.id+'&select=*&order=id');return order;
}
async function readBody(req){
 if(!req.body)fail('INVALID_CART');const reader=req.body.getReader();const parts=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();fail('REQUEST_TOO_LARGE')}parts.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}return JSON.parse(new TextDecoder().decode(bytes));
}
return async(req)=>{
 const origin=req.headers.get('origin')||'';
 const originAllowed=!origin||allowedOrigins.has(origin)||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 if(originAllowed&&origin)headers['Access-Control-Allow-Origin']=origin;
 const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(!originAllowed)return respond({error:'ORIGIN_NOT_ALLOWED'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'METHOD_NOT_ALLOWED'},405);
 if(!publicKeys.includes(req.headers.get('apikey')||''))return respond({error:'AUTH_REQUIRED',message:errorMessages.AUTH_REQUIRED},401);
 try{
  const body=await readBody(req);const action=body.action;
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
  const ipKey=await privateKey(ip);
  if(['quote','place_order','get_order','support_create','review_create'].includes(action))await rate('request:'+ipKey,100,60);
  if(action==='quote')return respond(await rpc('commerce_quote',{p_items:normalizeItems(body.items)}));
  if(action==='place_order'){
   if(!UUID.test(body.request_id)||!TOKEN.test(body.receipt_token)||!TOKEN.test(body.quote_hash))fail('INVALID_CART');
   const customer=normalizeCustomer(body.customer),items=normalizeItems(body.items),user=await currentUser(req);
   const result=await rpc('commerce_create_order',{p_request_id:body.request_id,p_receipt_token:body.receipt_token,p_customer:customer,p_items:items,p_quote_hash:body.quote_hash,p_user_id:user?.id||null,p_ip_key:ipKey,p_phone_key:await privateKey(customer.phone)});
   return respond({order:await receipt(req,result.code,body.receipt_token),replayed:result.replayed});
  }
  if(action==='get_order')return respond({order:await receipt(req,body.code,body.receipt_token)});
  if(action==='support_create'){
   if(!UUID.test(body.request_id)||!['contact','shipping','returns','privacy'].includes(body.topic)||body.consent!==true)fail('INVALID_SUPPORT');
   const phone=String(body.phone||'').replace(/[\s().-]/g,''),name=String(body.name||'').trim(),message=String(body.message||'').trim(),orderCode=String(body.order_code||'').trim();
   if(name.length<2||name.length>80||!/^(0[0-9]{9}|\+84[0-9]{9})$/.test(phone)||message.length<5||message.length>2000||orderCode.length>40)fail('INVALID_SUPPORT');
   const prior=await db('support_requests?select=id&request_id=eq.'+body.request_id+'&limit=1');if(prior.length)return respond({received:true});
   await rate('support:'+await privateKey(phone),3,1800);
   await db('support_requests','POST',{request_id:body.request_id,customer_name:name,phone,order_code:orderCode,topic:body.topic,message,consent:true});return respond({received:true});
  }
  if(action==='review_create'){
   const order=await receipt(req,body.code,body.receipt_token);if(order.status!=='delivered')fail('REVIEW_NOT_ALLOWED');
   const item=order.items.find((x)=>x.id===body.order_item_id);const displayName=String(body.display_name||'').trim(),comment=String(body.comment||'').trim();
   if(!item||body.consent!==true||!Number.isInteger(body.rating)||body.rating<1||body.rating>5||displayName.length<2||displayName.length>40||comment.length<5||comment.length>2000)fail('INVALID_REVIEW');
   const prior=await db('product_reviews?select=id&order_item_id=eq.'+item.id+'&limit=1');if(prior.length)return respond({received:true});
   await db('product_reviews','POST',{order_item_id:item.id,product_id:item.product_id,display_name:displayName,rating:body.rating,comment,consent:true});return respond({received:true});
  }
  const actor=await admin(req);
  if(action==='admin_transition')return respond(await rpc('commerce_transition_order',{p_order_id:body.order_id,p_actor_id:actor,p_status:body.status,p_details:body.details||{}}));
  if(action==='admin_inventory')return respond(await rpc('commerce_inventory_update',{p_actor_id:actor,p_product_id:body.product_id,p_mode:body.mode,p_stock:body.stock,p_expected_stock:body.expected_stock,p_rows:body.rows}));
  if(action==='admin_settings'){const settings=normalizeSettings(body.settings);await db('store_settings?id=eq.true','PATCH',{data:settings,updated_at:new Date().toISOString()});return respond({settings});}
  if(action==='admin_support_status'){
   if(!UUID.test(body.id)||!['new','contacted','resolved'].includes(body.status))fail('INVALID_SUPPORT');await db('support_requests?id=eq.'+body.id,'PATCH',{status:body.status});return respond({updated:true});
  }
  if(action==='admin_review_status'){
   if(!UUID.test(body.id)||!['pending','published','rejected'].includes(body.status))fail('INVALID_REVIEW');await db('product_reviews?id=eq.'+body.id,'PATCH',{status:body.status});return respond({updated:true});
  }
  return respond({error:'UNKNOWN_ACTION'},400);
 }catch(error){
  const code=Object.keys(errorMessages).find(c=>String(error?.message||'').includes(c))||'SERVICE_UNAVAILABLE';
  const status=code==='RATE_LIMIT'?429:code==='AUTH_REQUIRED'?401:code==='ADMIN_REQUIRED'?403:code==='ORDER_NOT_FOUND'?404:['OUT_OF_STOCK','QUOTE_CHANGED','STOCK_CHANGED','INVALID_TRANSITION','OPEN_ORDER_INVENTORY'].includes(code)?409:code==='SERVICE_UNAVAILABLE'?503:400;
  return respond({error:code,message:errorMessages[code]},status);
 }
};
}
