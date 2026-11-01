import test from 'node:test';
import assert from 'node:assert/strict';
import {eyesFromLandmarks,sourcePoint,smoothEyes} from '../src/tryon/geometry.js';
import {profiles,profileFor,tryOnPath,validatePhoto,filterProfiles,profilePage} from '../src/tryon/profiles.js';
import {supportsTryOn,tryOnSlugs} from '../src/tryon/links.js';
import {sampleEyePalette} from '../src/tryon/sample.js';
import catalog from '../catalog/seo_catalog.json' with {type:'json'};
import {routeFromPath,pathForPage} from '../src/routing.js';
import {socialMetadata} from '../src/social.js';
import {renderSeoDocument} from '../src/seo-render.js';

function landmarks(angle=0){
 const data=Array.from({length:478},()=>({x:.5,y:.5}));
 function put(i,x,y){const dx=x-500,dy=y-400;data[i]={x:(500+dx*Math.cos(angle)-dy*Math.sin(angle))/1000,y:(400+dx*Math.sin(angle)+dy*Math.cos(angle))/800}}
 for(const [cx,center,iris,corners,top,bottom,contour] of [[350,468,[469,470,471,472],[33,133],159,145,[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246]],[650,473,[474,475,476,477],[362,263],386,374,[362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398]]]){
  contour.forEach((i,n)=>put(i,cx+50*Math.cos(Math.PI+n*Math.PI*2/16),360+22*Math.sin(Math.PI+n*Math.PI*2/16)));
  put(center,cx,360);put(iris[0],cx+25,360);put(iris[1],cx,340);put(iris[2],cx-25,360);put(iris[3],cx,380);put(corners[0],cx-50,360);put(corners[1],cx+50,360);put(top,cx,338);put(bottom,cx,382);
 }
 return data;
}
test('eye geometry follows rotated irises and suppresses closed, small or malformed eyes',()=>{
 const front=eyesFromLandmarks(landmarks(),1000,800);assert.equal(front.length,2);assert.equal(front[0].rx,25);assert.equal(front[0].ry,20);
 const rotated=eyesFromLandmarks(landmarks(Math.PI/6),1000,800);assert.equal(rotated.length,2);assert.ok(Math.abs(rotated[0].angle-Math.PI/6)<.0001);assert.ok(Math.abs(rotated[0].rx-25)<.0001);
 const blink=landmarks();blink[159]=blink[145];assert.equal(eyesFromLandmarks(blink,1000,800).length,1);
 assert.deepEqual(eyesFromLandmarks([],1000,800),[]);const malformed=landmarks();malformed[468].x=NaN;assert.equal(eyesFromLandmarks(malformed,1000,800).length,1);
});
test('manual eye placement maps contained portrait/landscape photos and mirrored camera captures correctly',()=>{
 const rect={left:10,top:20,width:400,height:400};assert.deepEqual(sourcePoint(110,220,rect,800,400),{x:200,y:200});
 assert.equal(sourcePoint(50,25,rect,800,400),null);
 assert.deepEqual(sourcePoint(110,220,rect,800,400,true),{x:600,y:200});
});
test('tracking drops lost eyes immediately and does not smear a newly positioned face',()=>{
 const old=[{id:'right',cx:10,cy:10,rx:5,ry:5}];assert.deepEqual(smoothEyes(old,[]),[]);
 const jumped=[{id:'right',cx:100,cy:100,rx:5,ry:5}];assert.deepEqual(smoothEyes(old,jumped),jumped);
});
test('every public product has its own photo-sourced color profile and valid deep link',()=>{
 assert.equal(profiles.length,catalog.length);assert.equal(new Set(profiles.map(p=>p.slug)).size,catalog.length);
 assert.deepEqual(tryOnSlugs,profiles.map(p=>p.slug));
 for(const p of profiles){
  const product=catalog.find(c=>c.slug===p.slug);assert.ok(product);assert.equal(p.name,product.name);assert.equal(p.color,product.color);assert.equal(p.image,product.image_url);
  assert.equal(p.mode,'color-only');assert.match(p.source.sha256,/^[0-9a-f]{64}$/);for(const c of Object.values(p.palette))assert.match(c,/^#[0-9a-f]{6}$/);
  assert.ok([product.image_url,...product.images.map(i=>i.image_url)].includes(p.source.url));assert.ok(p.source.sampleEyes.length>0);assert.ok(p.source.pixelsPerBand.every(n=>n>=20));
  for(const eye of p.source.sampleEyes){assert.ok(eye.x>0&&eye.x<1&&eye.y>0&&eye.y<1&&eye.rx>0&&eye.ry>0)}
  assert.ok(supportsTryOn(p.slug));assert.equal(tryOnPath(p.slug),'/try-on?lens='+p.slug);
 }
});
test('unknown products and unsupported image files never acquire invented samples',()=>{
 assert.equal(profileFor('not-supported'),null);assert.equal(tryOnPath('not-supported'),'/try-on');
 assert.equal(supportsTryOn('not-supported'),false);
 assert.equal(validatePhoto({type:'image/svg+xml',size:20}).length>0,true);assert.equal(validatePhoto({type:'image/jpeg',size:13*1024*1024}).length>0,true);assert.equal(validatePhoto({type:'image/jpeg',size:1000}),'');
});
test('shareable try-on route keeps a clean canonical and useful initial HTML without private images',()=>{
 assert.equal(routeFromPath('/try-on').page,'tryon');assert.equal(pathForPage('tryon',{slug:'milk-tea-brown'}),'/try-on?lens=milk-tea-brown');
 const meta=socialMetadata('tryon',null,'https://vivilens.pages.dev','/try-on?lens=milk-tea-brown');assert.equal(meta.hidden,false);assert.equal(meta.canonical,'https://vivilens.pages.dev/try-on');
 const html=renderSeoDocument('<html><head><title>Vivi</title></head><body><div id="root"></div></body></html>',{page:'tryon',path:'/try-on',products:catalog});assert.ok(html.includes('Mô phỏng tông màu của '+catalog.length+' mẫu lens'));assert.doesNotMatch(html,/getUserMedia|data:image|blob:/);
 for(const product of catalog)assert.ok(html.includes('/products/'+product.slug));
});
test('search handles exact words, accents, case and combined color filters across the catalog',()=>{
 assert.deepEqual(filterProfiles(profiles,' AI BLUE ').map(p=>p.slug),['ai-blue']);
 assert.equal(filterProfiles(profiles,'ĐEN').length,3);assert.equal(filterProfiles(profiles,'xanh lá').length,8);
 assert.equal(filterProfiles(profiles,'blue','Pink').length,0);assert.equal(filterProfiles(profiles,'','Violet').length,6);
 assert.equal(filterProfiles(profiles,'not-a-lens').length,0);
});
test('pagination reaches every model once and clamps filters or invalid page requests',()=>{
 const all=[];for(let page=1;page<=Math.ceil(profiles.length/6);page++)all.push(...profilePage(profiles,page).items.map(p=>p.slug));
 assert.deepEqual(all,profiles.map(p=>p.slug));assert.equal(profilePage([],999).page,1);assert.equal(profilePage([],999).start,0);
 const selected=filterProfiles(profiles,'','Violet');assert.equal(profilePage(selected,20).page,1);assert.equal(profilePage(profiles,-10).page,1);assert.equal(profilePage(profiles,NaN).page,1);
 assert.equal(profilePage(profiles,1,.5).items.length,1);
});
test('photo tone sampling excludes skin outside the eyelid and bright glare without a generic hue fallback',()=>{
 const width=100,height=100,data=new Uint8Array(width*height*3);for(let i=0;i<width*height;i++)data.set([210,50,40],i*3);
 const eye={cx:50,cy:50,rx:23,ry:19,angle:0,contour:[{x:20,y:20},{x:80,y:20},{x:80,y:50},{x:20,y:50}]};
 for(let y=20;y<50;y++)for(let x=20;x<80;x++)if(Math.hypot((x-50)/23,(y-50)/19)<1)data.set(x>56&&y<40?[255,255,255]:[65,110,180],(y*width+x)*3);
 const result=sampleEyePalette(data,width,height,[eye]);assert.deepEqual(result.palette,{inner:'#416eb4',mid:'#416eb4',outer:'#416eb4'});assert.ok(result.counts.every(n=>n>=20));
 assert.throws(()=>sampleEyePalette(data,width,height,[]),/Insufficient/);
});
