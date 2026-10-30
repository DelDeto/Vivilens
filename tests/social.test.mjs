import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {socialMetadata,renderSocialHead,SITE_ORIGIN,SOCIAL_IMAGE} from '../src/social.js';

test('home and catalog retain a complete large social card before JavaScript',async()=>{
 const template=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const html=renderSocialHead(template,socialMetadata('catalog',null,SITE_ORIGIN,'/shop'));
 assert.equal((html.match(/property="og:image" /g)||[]).length,1);
 assert.ok(html.includes(SITE_ORIGIN+SOCIAL_IMAGE));
 assert.ok(html.includes('content="1200"'));assert.ok(html.includes('content="630"'));
 assert.ok(html.includes('summary_large_image'));assert.ok(html.includes('href="'+SITE_ORIGIN+'/shop"'));
});
test('product links get their own real photo and clean public copy',()=>{
 const p={slug:'milk-tea-brown',name:'Milk Tea Brown',image_url:'https://example.com/real.webp',color:'Brown',wear_period:'6 tháng',description:'Internal warehouse draft'};
 const meta=socialMetadata('detail',p);
 assert.equal(meta.type,'product');assert.equal(meta.image,p.image_url);
 assert.equal(meta.canonical,SITE_ORIGIN+'/products/milk-tea-brown');
 assert.equal(meta.width,null);assert.ok(!meta.description.includes('warehouse'));
 const unsafe=socialMetadata('detail',{...p,image_url:'javascript:alert(1)'});
 assert.equal(unsafe.image,SITE_ORIGIN+SOCIAL_IMAGE);
});
test('social renderer escapes product text and keeps private pages out of search',()=>{
 const meta=socialMetadata('detail',{slug:'test',name:'A $& " lens </title><script>alert(1)</script>',image_url:''});
 const html=renderSocialHead('<html><head><title>Old</title></head><body></body></html>',meta);
 assert.ok(!html.includes('<script>alert(1)'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&quot;'));
 assert.ok(html.includes('A $&amp; &quot; lens'));
 assert.equal((html.match(/<\/head>/g)||[]).length,1);
 for(const p of ['account','admin'])assert.equal(socialMetadata(p).hidden,true);
});
test('favicon fallbacks and share card are real files at the advertised dimensions',async()=>{
 const social=await sharp(new URL('../public/brand/og-vivilens-v14.jpg',import.meta.url).pathname).metadata();
 assert.deepEqual([social.width,social.height,social.format],[1200,630,'jpeg']);
 for(const size of [32,180,192,512]){
  const icon=await sharp(new URL('../public/brand/icon-'+size+'-v14.png',import.meta.url).pathname).metadata();
  assert.deepEqual([icon.width,icon.height],[size,size]);
 }
 const ico=await fs.readFile(new URL('../public/favicon.ico',import.meta.url));
 assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),1);
});
