import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyRequest} from '../worker/legacy-redirect.js';
import {siteConfig} from '../src/site-config.js';
import {createCommerceHandler} from '../supabase/functions/vivilens-commerce/handler.mjs';

const oldOrigin='https://vivilens.duc-nguyen-ndd127.workers.dev';
test('legacy redirects preserve deep paths and query strings without accepting an external target',async()=>{
 for(const path of ['/','/products/milk-tea-brown?utm_source=instagram','//unrelated.example/shop','/collections/lens-di-hoc']){
  const request=new Request(oldOrigin+path),response=await legacyRequest(request,{});
  const target=new URL(response.headers.get('location'));
  assert.equal(response.status,301);assert.equal(target.origin,siteConfig.origin);
  assert.equal(target.pathname,new URL(request.url).pathname);assert.equal(target.search,new URL(request.url).search);
 }
});
test('old private receipts retain their own origin instead of leaking capabilities into a redirect',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('<html><head></head><body><div id="root"></div></body></html>')}};
 const response=await legacyRequest(new Request(oldOrigin+'/order/VV-ABCDEF123456'),env);
 assert.equal(response.status,200);assert.equal(response.headers.get('location'),null);
 assert.equal(response.headers.get('cache-control'),'no-store');assert.match(await response.text(),/noindex, nofollow/);
});
test('commerce accepts only the exact production and retained legacy origins',async()=>{
 const handler=createCommerceHandler({env:{get:()=>''},fetch:async()=>{throw new Error('preflight must not touch the database')}});
 for(const origin of [siteConfig.origin,oldOrigin]){
  const response=await handler(new Request('https://service.test',{method:'OPTIONS',headers:{Origin:origin}}));
  assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 }
 for(const origin of ['https://preview.vivilens.pages.dev','https://vivilens.pages.dev.unrelated.example']){
  assert.equal((await handler(new Request('https://service.test',{method:'OPTIONS',headers:{Origin:origin}}))).status,403);
 }
});
