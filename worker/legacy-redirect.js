import {handleRequest} from './index.js';
import {siteConfig} from '../src/site-config.js';

export async function legacyRequest(request,env){
 const from=new URL(request.url);
 // Guest receipt capabilities live only in this origin's sessionStorage.
 // Keep existing private receipts and their original assets usable without
 // copying credentials into a URL or across origins.
 if(/^\/order\/VV-[A-F0-9]{12}$/.test(from.pathname))return handleRequest(request,env);
 if(from.pathname.startsWith('/assets/')||from.pathname.startsWith('/brand/')){
  const asset=await env.ASSETS.fetch(request);
  if(asset.status!==404)return asset;
 }
 const target=new URL(siteConfig.origin);
 target.pathname=from.pathname;target.search=from.search;
 return new Response(null,{status:301,headers:{Location:target.href,'Cache-Control':'public, max-age=300'}});
}
export default {fetch(request,env){return legacyRequest(request,env)}};
