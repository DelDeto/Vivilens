import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'public','brand');
const cache=path.join(os.tmpdir(),'vivilens-original-brand-photos');
await fs.mkdir(out,{recursive:true});await fs.mkdir(cache,{recursive:true});
const {sources}=JSON.parse(await fs.readFile(path.join(root,'catalog/brand_asset_sources.json'),'utf8'));
const originals=new Map();
for(const source of sources){
 const cached=path.join(cache,source.key+'.webp');let bytes;
 try{bytes=await fs.readFile(cached)}catch{
  const response=await fetch(source.source_url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Source unavailable: '+source.key);
  bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>12*1024*1024)throw new Error('Unexpectedly large source');
  await fs.writeFile(cached,bytes);
 }
 await sharp(bytes).metadata();originals.set(source.key,bytes);
 for(const width of source.key==='milk-tea-brown'?[480,960]:[320,640]){
  await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality:86,effort:6}).toFile(path.join(out,source.key+'-'+width+'.webp'));
 }
}
const icon=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#a64f73"/><path d="M16 20L30 47L46 17" fill="none" stroke="#fff7f9" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 8v10M45 13h10" stroke="#f8c9dc" stroke-width="2.3" stroke-linecap="round"/></svg>`;
await fs.writeFile(path.join(out,'favicon-v14.svg'),icon);
for(const size of [32,180,192,512])await sharp(Buffer.from(icon)).resize(size,size).png().toFile(path.join(out,`icon-${size}-v14.png`));
// ICO with a standard PNG payload; readable by Chromium and Windows browsers.
const png=await sharp(Buffer.from(icon)).resize(32,32).png().toBuffer();
const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=32;header[7]=32;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
await fs.writeFile(path.join(root,'public','favicon.ico'),Buffer.concat([header,png]));
const background=Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="b"><stop stop-color="#fff9f6"/><stop offset="1" stop-color="#f4dce9"/></linearGradient></defs><rect width="1200" height="630" fill="url(#b)"/><circle cx="1120" cy="52" r="208" fill="#e9e4fa"/><circle cx="716" cy="580" r="196" fill="#efcddc" opacity=".55"/><path d="M597 62v24m-12-12h24M1137 518v30m-15-15h30" stroke="#b76f91" stroke-width="2"/><text x="63" y="92" font-family="DejaVu Serif" font-size="35" letter-spacing="5" fill="#98506e">VIVILENS</text><text x="66" y="125" font-family="DejaVu Sans" font-size="11" letter-spacing="3" fill="#9b7a8b">YOUR EYES, YOUR MOOD</text><text x="61" y="254" font-family="DejaVu Serif" font-size="65" fill="#563143">Mắt xinh,</text><text x="61" y="335" font-family="DejaVu Serif" font-style="italic" font-size="65" fill="#a54f75">đúng mood.</text><text x="66" y="400" font-family="DejaVu Sans" font-size="18" fill="#836477">Lens màu cho look bạn thích.</text><text x="66" y="435" font-family="DejaVu Sans" font-size="15" fill="#836477">Khám phá ảnh thật · Chọn màu cùng Vivi</text><rect x="64" y="486" width="416" height="57" rx="28.5" fill="#a64f73"/><text x="90" y="522" font-family="DejaVu Sans" font-weight="bold" font-size="15" fill="#fff8fa" letter-spacing="1">TÌM MÀU LENS HỢP BẠN</text><path d="M441 507l10 8-10 8m-14-8h24" stroke="#fff8fa" stroke-width="2" fill="none"/><text x="67" y="593" font-family="DejaVu Sans" font-size="11" letter-spacing="2" fill="#a0788c">VIVILENS STUDIO / COLOR YOUR MOOD</text></svg>`);
async function frame(key,w,h){
 const name=sources.find(p=>p.key===key).name;
 const photo=await sharp(originals.get(key)).resize({width:w-16,height:h-51,fit:'contain',background:'#faeef4'}).toBuffer();
 const base=await sharp({create:{width:w,height:h,channels:4,background:'#fffcfb'}}).png().toBuffer();
 const caption=Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="${w/2}" y="${h-16}" text-anchor="middle" font-family="DejaVu Sans" font-size="${w>240?12:11}" fill="#86475f">${name}</text></svg>`);
 const content=await sharp(base).composite([{input:photo,left:8,top:8},{input:caption,left:0,top:0}]).png().toBuffer();
 const mask=Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="18" fill="white"/></svg>`);
 return sharp(content).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
}
const main=await frame('milk-tea-brown',274,408),blue=await frame('clear-sky-blue',194,251),pink=await frame('creamy-pink',194,251);
await sharp(background).composite([{input:main,left:638,top:130},{input:blue,left:934,top:45},{input:pink,left:934,top:322}]).jpeg({quality:90,mozjpeg:true}).toFile(path.join(out,'og-vivilens-v14.jpg'));
await fs.writeFile(path.join(out,'site.webmanifest'),JSON.stringify({name:'VIVILENS — Your Eyes, Your Mood',short_name:'VIVILENS',lang:'vi',start_url:'/',display:'standalone',theme_color:'#a64f73',background_color:'#fff9f6',icons:[{src:'/brand/icon-192-v14.png',sizes:'192x192',type:'image/png'},{src:'/brand/icon-512-v14.png',sizes:'512x512',type:'image/png'}]},null,2));
console.log('Brand assets ready: 4 original photo sets, favicon/icon sizes, 1200×630 social card.');
