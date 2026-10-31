// Refresh only public catalog data. No service-role key or customer data is used.
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=await fs.readFile(path.join(root,'.env.production'),'utf8');
const values=Object.fromEntries(source.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const url=process.env.VITE_SUPABASE_URL||values.VITE_SUPABASE_URL;
const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||values.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key||key.startsWith('sb_secret_'))throw new Error('A public Supabase URL and publishable key are required');
async function read(table,query){
 const response=await fetch(url+'/rest/v1/'+table+'?'+query,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Public catalog read failed: '+table+' '+response.status);
 return response.json();
}
const [products,images]=await Promise.all([
 read('products','select=id,name,slug,color,diameter,wear_period,description,image_url,price,stock,active,catalog_visible,featured,inventory_mode&or=(active.eq.true,catalog_visible.eq.true)&order=slug.asc'),
 read('product_images','select=product_id,image_url,alt_text,position&order=position.asc&limit=1000')
]);
const real=url=>/^https:\/\//.test(url||'')&&!/unsplash\.com|placehold\.co/.test(url);
const catalog=products.filter(p=>/^[a-z0-9-]{1,128}$/.test(p.slug)).map(p=>({...p,price:Number(p.price),images:images.filter(i=>i.product_id===p.id&&real(i.image_url)).map(({image_url,alt_text,position})=>({image_url,alt_text,position}))})).filter(p=>p.images.length||real(p.image_url));
await fs.writeFile(path.join(root,'catalog/seo_catalog.json'),JSON.stringify(catalog,null,2)+'\n');
console.log('Public SEO snapshot: '+catalog.length+' products, '+catalog.reduce((n,p)=>n+p.images.length,0)+' gallery images. No database writes.');
