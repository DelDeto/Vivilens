import {productStructuredData,breadcrumbs,jsonForHtml} from './seo-render.js';
import {SITE_ORIGIN} from './social.js';
import {collectionBySlug,guideBySlug,editedProducts} from './seo-content.js';
import {publicAvailability} from './seo-availability.js';
export function readPublicBootstrap(){
 try{const data=JSON.parse(document.getElementById('vv-public-data')?.textContent||'{}');return Array.isArray(data.products)?data.products.filter(p=>p&&typeof p.id==='string'&&typeof p.slug==='string'):[]}catch{return []}
}
export function updateClientStructuredData(page,product,products,variants,live){
 const path=window.location.pathname;let data=[];
 if(page==='detail'&&product){
  let availability=null;
  if(live&&product.active)availability=publicAvailability(product,variants.filter(v=>v.product_id===product.id));
  data=[productStructuredData(product,{availability}),breadcrumbs([['VIVILENS','/'],['Bộ sưu tập','/shop'],[product.name,path]])];
 }else if(page==='collection'){
  const c=collectionBySlug(path.split('/').at(-1));
  if(c)data=[breadcrumbs([['VIVILENS','/'],['Bộ sưu tập','/shop'],[c.short,path]]),{'@context':'https://schema.org','@type':'CollectionPage',name:c.title,url:SITE_ORIGIN+path,mainEntity:{'@type':'ItemList',itemListElement:editedProducts(products,c).map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:SITE_ORIGIN+'/products/'+p.slug}))}}];
 }else if(page==='guide'){
  const g=guideBySlug(path.split('/').at(-1));
  if(g)data=[{'@context':'https://schema.org','@type':'Article',headline:g.title,description:g.description,author:{'@type':'Organization',name:'VIVILENS'},datePublished:'2026-10-31',dateModified:'2026-10-31',mainEntityOfPage:SITE_ORIGIN+path}];
 }else if(page==='home'||page==='catalog')data=[{'@context':'https://schema.org','@type':'Organization',name:'VIVILENS',url:SITE_ORIGIN,logo:SITE_ORIGIN+'/brand/icon-512-v14.png'}];
 let script=document.getElementById('vv-structured-data');if(!script){script=document.createElement('script');script.id='vv-structured-data';script.type='application/ld+json';document.head.appendChild(script)}
 script.textContent=jsonForHtml(data);
}
