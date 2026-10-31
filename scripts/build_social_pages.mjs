import fs from 'node:fs/promises';
import path from 'node:path';
import {socialMetadata,renderSocialHead,SITE_ORIGIN,escapeHtml} from '../src/social.js';
import {renderSeoDocument} from '../src/seo-render.js';
import {seoCollections,seoGuides} from '../src/seo-content.js';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const base=await fs.readFile(path.join(dist,'index.html'),'utf8');
const products=JSON.parse(await fs.readFile(path.join(root,'catalog/seo_catalog.json'),'utf8'));
async function write(file,options){const output=path.join(dist,file);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,renderSeoDocument(base,{...options,products}))}
await write('index.html',{page:'home',path:'/'});
await fs.writeFile(path.join(dist,'__app-shell.html'),renderSocialHead(base,socialMetadata('account',null,SITE_ORIGIN,'/__app-shell')));
for(const [page,file] of [['catalog','shop'],['account','account'],['admin','admin'],['checkout','checkout'],['journal','notes'],['tryon','try-on'],['notfound','404']])await write(file+'.html',{page,path:'/'+file});
for(const topic of ['contact','shipping','returns','lens-care','privacy'])await write('help/'+topic+'.html',{page:'help',path:'/help/'+topic});
for(const collection of seoCollections)await write('collections/'+collection.slug+'.html',{page:'collection',path:'/collections/'+collection.slug});
for(const guide of seoGuides)await write('notes/'+guide.slug+'.html',{page:'guide',path:'/notes/'+guide.slug});
for(const product of products){
 if(!/^[a-z0-9-]{1,128}$/.test(product.slug))throw new Error('Invalid product slug');
 await write('products/'+product.slug+'.html',{page:'detail',product,path:'/products/'+product.slug});
}
const urls=['/','/shop','/notes','/try-on',...['contact','shipping','returns','lens-care','privacy'].map(p=>'/help/'+p),...seoCollections.map(c=>'/collections/'+c.slug),...seoGuides.map(g=>'/notes/'+g.slug),...products.map(p=>'/products/'+p.slug)];
const images=products.map(p=>'<url><loc>'+escapeHtml(SITE_ORIGIN+'/products/'+p.slug)+'</loc>'+p.images.map(i=>'<image:image><image:loc>'+escapeHtml(i.image_url)+'</image:loc><image:title>'+escapeHtml(p.name+' — ảnh sản phẩm VIVILENS')+'</image:title></image:image>').join('')+'</url>').join('');
await fs.writeFile(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(p=>'<url><loc>'+escapeHtml(SITE_ORIGIN+p)+'</loc></url>').join('')+'</urlset>');
await fs.writeFile(path.join(dist,'sitemap-images.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+images+'</urlset>');
await fs.writeFile(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /order/\nDisallow: /__app-shell\nSitemap: '+SITE_ORIGIN+'/sitemap.xml\nSitemap: '+SITE_ORIGIN+'/sitemap-images.xml\n');
console.log('SEO HTML: '+products.length+' products, '+seoCollections.length+' collections, '+seoGuides.length+' guides; '+urls.length+' sitemap URLs. Offers require live edge data.');
