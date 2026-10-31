import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seoCollections,seoGuides,productEdits} from '../src/seo-content.js';
import {renderSeoDocument,productStructuredData} from '../src/seo-render.js';
import {routeFromPath} from '../src/routing.js';
import {ecommercePayload} from '../src/analytics.js';
import worker,{handleRequest} from '../worker/index.js';
const catalog=JSON.parse(await readFile(new URL('../catalog/seo_catalog.json',import.meta.url)));
const p=catalog.find(p=>p.slug==='milk-tea-brown');
const base='<!doctype html><html><head><title>Vivi</title></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';
const env={PUBLIC_CATALOG_URL:'https://publicproject.supabase.co',PUBLIC_CATALOG_KEY:'sb_publishable_test',ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname==='/404'?'not found':base,{status:200})}};
const dataFrom=html=>JSON.parse(/id="vv-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
test('four collections and six guides have valid routes and every curated product exists',()=>{
 assert.equal(seoCollections.length,4);assert.equal(seoGuides.length,6);assert.equal(Object.keys(productEdits).length,20);
 for(const slug of Object.keys(productEdits))assert.ok(catalog.some(p=>p.slug===slug),slug);
 for(const c of seoCollections){assert.equal(routeFromPath('/collections/'+c.slug).page,'collection');for(const slug of c.slugs)assert.ok(catalog.some(p=>p.slug===slug),slug)}
 for(const g of seoGuides)assert.equal(routeFromPath('/notes/'+g.slug).page,'guide');
 assert.equal(routeFromPath('/notes/missing').page,'notfound');
});
test('initial HTML contains visible product details, authentic image, crawlable links and safe bootstrap',()=>{
 const html=renderSeoDocument(base,{page:'detail',product:p,path:'/products/'+p.slug,products:catalog});
 assert.match(html,/<h1>Milk Tea Brown<\/h1>/);assert.match(html,/220\.000đ \/ hộp 2 chiếc/);assert.match(html,/Khám phá Milk Tea Brown/);assert.match(html,/href="\/collections\/lens-nau-tu-nhien"/);
 assert.match(html,/id="vv-public-data" type="application\/json"/);assert.equal(dataFrom(html)[0].offers,undefined);
 const unsafe=renderSeoDocument(base,{page:'detail',path:'/products/'+p.slug,product:{...p,name:'$& </script><img onerror="boom">',description:'<script>boom</script>'},products:catalog});
 assert.doesNotMatch(unsafe,/<img onerror="boom">/);assert.doesNotThrow(()=>dataFrom(unsafe));
});
test('every public catalog product is linked in the initial shop HTML; collections have distinct canonicals',()=>{
 const html=renderSeoDocument(base,{page:'catalog',path:'/shop',products:catalog});for(const p of catalog)assert.ok(html.includes('href="/products/'+p.slug+'"'));
 for(const c of seoCollections){const html=renderSeoDocument(base,{page:'collection',path:'/collections/'+c.slug,products:catalog});assert.ok(html.includes('/collections/'+c.slug+'"'));assert.match(html,/<h1>/);assert.equal(dataFrom(html)[1]['@type'],'CollectionPage')}
});
test('fresh public price and stock produce box Offer; preview and fallback never advertise stock',async()=>{
 const response=await handleRequest(new Request('https://shop.test/products/'+p.slug),env,async()=>Response.json([{...p,price:230000,stock:2}]));
 assert.equal(response.status,200);const html=await response.text();const product=dataFrom(html)[0];assert.equal(product.offers.price,230000);assert.equal(product.offers.availability,'https://schema.org/InStock');assert.match(html,/230\.000đ \/ hộp 2 chiếc/);
 assert.equal(productStructuredData({...p,active:false},{availability:'InStock'}).offers,undefined);
 const fallback=await handleRequest(new Request('https://shop.test/products/'+p.slug),env,async()=>{throw new Error('offline')});assert.equal(dataFrom(await fallback.text())[0].offers,undefined);
 const zero=await handleRequest(new Request('https://shop.test/products/'+p.slug),env,async()=>Response.json([{...p,stock:0}]));assert.equal(dataFrom(await zero.text())[0].offers.availability,'https://schema.org/OutOfStock');
});
test('edge returns real 404 for nonexistent/hidden products and 503 on unknown product during upstream outage',async()=>{
 const req=new Request('https://shop.test/products/missing-product');const missing=await handleRequest(req,env,async()=>Response.json([]));assert.equal(missing.status,404);assert.equal(missing.headers.get('x-robots-tag'),'noindex, nofollow');
 const unavailable=await handleRequest(req,env,async()=>{throw new Error('offline')});assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('retry-after'),'120');
});
test('receipt shell is private, no-store and never fetches order or customer information',async()=>{
 const response=await handleRequest(new Request('https://shop.test/order/VV-ABCDEF123456'),env,()=>{throw new Error('must not request customer data')});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(await response.text(),/noindex, nofollow/);
});
test('production export ignores Cloudflare execution context as fetch dependency; HTML aliases redirect',async()=>{
 const response=await worker.fetch(new Request('https://shop.test/order/VV-ABCDEF123456'),env,{waitUntil(){}});assert.equal(response.status,200);
 const redirect=await handleRequest(new Request('https://shop.test/products/'+p.slug+'/'),env);assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),'https://shop.test/products/'+p.slug);
});
test('analytics payload counts boxes and excludes prescription, customer and order secrets',()=>{
 const data=ecommercePayload([{product:{...p,email:'private@example.com',leftPower:-2,receiptToken:'secret'},quantity:2}]);assert.equal(data.value,440000);assert.equal(data.items[0].quantity,2);const json=JSON.stringify(data);assert.doesNotMatch(json,/private|leftPower|receiptToken|secret|stock/);
});
