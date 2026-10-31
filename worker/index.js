import catalog from '../catalog/seo_catalog.json' with {type:'json'};
import {renderSeoDocument} from '../src/seo-render.js';
import {SITE_ORIGIN} from '../src/social.js';
import {publicAvailability} from '../src/seo-availability.js';
const PUBLIC_FIELDS='id,name,slug,color,diameter,wear_period,description,image_url,price,stock,active,catalog_visible,featured,inventory_mode,product_images(image_url,alt_text,position)';
async function boundedText(response,limit){
 const reader=response.body?.getReader();if(!reader)return '';
 const chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>limit){await reader.cancel();throw new Error('RESPONSE_LIMIT')}chunks.push(value)}}finally{reader.releaseLock()}
 const combined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length}return new TextDecoder().decode(combined);
}
async function publicJson(env,table,params,fetchImpl){
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.PUBLIC_CATALOG_URL||'')||!String(env.PUBLIC_CATALOG_KEY||'').startsWith('sb_publishable_'))throw new Error('PUBLIC_CONFIG');
 const endpoint=new URL('/rest/v1/'+table,env.PUBLIC_CATALOG_URL);endpoint.search=new URLSearchParams(params).toString();
 const response=await fetchImpl(endpoint,{headers:{apikey:env.PUBLIC_CATALOG_KEY},signal:AbortSignal.timeout(2500)});
 if(!response.ok)throw new Error('CATALOG_UNAVAILABLE');
 const rows=JSON.parse(await boundedText(response,131072));if(!Array.isArray(rows))throw new Error('CATALOG_SHAPE');return rows;
}
export async function handleRequest(request,env,fetchImpl=fetch){
 const requestUrl=new URL(request.url),path=requestUrl.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 if(/^\/order\/VV-[A-F0-9]{12}$/.test(path)){
  const response=await env.ASSETS.fetch(new Request(new URL('/__app-shell',request.url)));
  const base=await boundedText(response,65536);
  return new Response(request.method==='HEAD'?null:renderSeoDocument(base,{page:'receipt',path}),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
 }
 const match=/^\/products\/([a-z0-9-]{1,128})\/?$/.exec(path);
 if(match){
  const slug=match[1],canonicalPath='/products/'+slug;
  if(path!==canonicalPath)return Response.redirect(new URL(canonicalPath+requestUrl.search,requestUrl.origin),301);
  const response=await env.ASSETS.fetch(new Request(new URL('/__app-shell',request.url)));
  const base=await boundedText(response,65536);
  let product=null,availability=null,status=200;
  try{
   const rows=await publicJson(env,'products',{select:PUBLIC_FIELDS,slug:'eq.'+slug,or:'(active.eq.true,catalog_visible.eq.true)',limit:'1'},fetchImpl);
   product=rows[0]||null;
   if(!product)status=404;
   else{
    if(product.slug!==slug||!product.id||typeof product.name!=='string')throw new Error('CATALOG_SHAPE');
    const snapshot=catalog.find(p=>p.slug===slug);product={...product,images:Array.isArray(product.product_images)?product.product_images.sort((a,b)=>a.position-b.position):snapshot?.images||[]};
    if(product.active){
     if(product.inventory_mode==='variant'){
      const variants=await publicJson(env,'product_variants',{select:'stock,power,unit_label',product_id:'eq.'+product.id,active:'eq.true',limit:'100'},fetchImpl);
      availability=publicAvailability(product,variants);
     }else availability=publicAvailability(product);
    }
   }
  }catch{
   product=catalog.find(p=>p.slug===slug)||null;availability=null;if(!product)status=503;
  }
  const html=renderSeoDocument(base,{page:product?'detail':'notfound',path:canonicalPath,product,availability,products:catalog,origin:SITE_ORIGIN});
  return new Response(request.method==='HEAD'?null:html,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff',...(status!==200?{'x-robots-tag':'noindex, nofollow'}:{}),...(status===503?{'retry-after':'120'}:{})}});
 }
 const response=await env.ASSETS.fetch(request);
 if(response.status!==404)return response;
 const fallback=await env.ASSETS.fetch(new Request(new URL('/404',request.url)));
 return new Response(request.method==='HEAD'?null:fallback.body,{status:404,headers:{'content-type':'text/html; charset=utf-8','x-robots-tag':'noindex, nofollow','cache-control':'no-cache'}});
}
export default {fetch(request,env){return handleRequest(request,env)}};
