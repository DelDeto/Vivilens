import fs from 'node:fs/promises';
import path from 'node:path';
import {socialMetadata,renderSocialHead,SITE_ORIGIN,escapeHtml} from '../src/social.js';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const base=await fs.readFile(path.join(dist,'index.html'),'utf8');
const products=JSON.parse(await fs.readFile(path.join(root,'catalog/social_products.json'),'utf8'));
await fs.writeFile(path.join(dist,'index.html'),renderSocialHead(base,socialMetadata('home',null,SITE_ORIGIN,'/')));
for(const [page,file] of [['catalog','shop'],['account','account'],['admin','admin'],['checkout','checkout']])await fs.writeFile(path.join(dist,file+'.html'),renderSocialHead(base,socialMetadata(page,null,SITE_ORIGIN,'/'+file)));
await fs.mkdir(path.join(dist,'help'),{recursive:true});
const helpPages=['contact','shipping','returns','lens-care','privacy'];
for(const topic of helpPages)await fs.writeFile(path.join(dist,'help',topic+'.html'),renderSocialHead(base,socialMetadata('help',null,SITE_ORIGIN,'/help/'+topic)));
await fs.mkdir(path.join(dist,'products'),{recursive:true});
for(const product of products){
 if(!/^[a-z0-9-]{1,128}$/.test(product.slug))throw new Error('Invalid product slug in social snapshot');
 await fs.writeFile(path.join(dist,'products',product.slug+'.html'),renderSocialHead(base,socialMetadata('detail',product)));
}
const urls=['/','/shop',...helpPages.map(p=>'/help/'+p),...products.map(p=>'/products/'+p.slug)];
await fs.writeFile(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(p=>'<url><loc>'+escapeHtml(SITE_ORIGIN+p)+'</loc></url>').join('')+'</urlset>');
console.log('Social cards in raw HTML: home, shop, '+products.length+' products; private routes noindexed.');
