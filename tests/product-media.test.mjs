import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../catalog/seo_catalog.json' with {type:'json'};
import media from '../catalog/product_media.json' with {type:'json'};
import {productMediaGroups} from '../src/product-media.js';
test('every reviewed cover is first and all original images remain reachable across albums',()=>{
 assert.equal(Object.keys(media).length,catalog.length);
 for(const p of catalog){
  const m=media[p.slug],groups=productMediaGroups(p,p.images);
  assert.equal(p.image_url,m.cover);assert.equal(p.images[0].image_url,m.cover);assert.equal(groups.primary[0].image_url,m.cover);
  assert.deepEqual(new Set([...groups.primary,...groups.other].map(i=>i.image_url)),new Set(p.images.map(i=>i.image_url)));
  assert.ok(groups.primary.slice(1).every(i=>m.information.includes(i.image_url)));
  assert.ok(groups.other.every(i=>m.other.includes(i.image_url)));
 }
});
test('unreviewed or newly added photos retain a safe visible fallback',()=>{
 const images=[{image_url:'new-photo',position:1}];assert.deepEqual(productMediaGroups({slug:'unknown'},images),{primary:images,other:[]});
 assert.ok(productMediaGroups(catalog[0],[...catalog[0].images,...images]).primary.some(i=>i.image_url==='new-photo'));
});
