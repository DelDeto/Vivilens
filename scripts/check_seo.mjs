import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {SITE_ORIGIN} from '../src/social.js';
const dist=path.resolve(import.meta.dirname,'../dist');
const sitemap=await fs.readFile(path.join(dist,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]));
for(const url of urls){
 assert.equal(url.origin,SITE_ORIGIN);const pathname=url.pathname;
 const file=path.join(dist,pathname==='/'?'index.html':pathname.slice(1)+'.html');
 const html=await fs.readFile(file,'utf8');
 assert.match(html,/<h1>/,pathname);assert.doesNotMatch(html,/<meta name="robots" content="noindex/,pathname);
 assert.equal([...html.matchAll(/rel="canonical"/g)].length,1,pathname);
 for(const m of html.matchAll(/type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(m[1]),pathname);
 for(const match of html.matchAll(/href="(\/[^"?#]*)(?:[?#][^"]*)?"/g)){
  const href=match[1];if(href==='/')continue;
  const candidates=[path.join(dist,href.slice(1)),path.join(dist,href.slice(1)+'.html'),path.join(dist,href.slice(1),'index.html')];
  assert.ok((await Promise.all(candidates.map(p=>fs.stat(p).then(s=>s.isFile()).catch(()=>false)))).some(Boolean),'Broken static link '+href+' on '+pathname);
 }
}
for(const file of ['404.html','admin.html','account.html','checkout.html','__app-shell.html'])assert.match(await fs.readFile(path.join(dist,file),'utf8'),/noindex, nofollow/);
console.log('SEO verification passed: '+urls.length+' public HTML pages, unique canonicals, valid JSON-LD and no broken internal links.');
