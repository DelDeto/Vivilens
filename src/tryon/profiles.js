import profiles from '../../catalog/tryon_profiles.json' with {type:'json'};
export {profiles};
export const profileFor=slug=>profiles.find(p=>p.slug===slug)||null;
export {tryOnPath} from './links.js';
export const colorLabels={Brown:'Nâu',Gray:'Xám',Pink:'Hồng',Blue:'Xanh dương',Green:'Xanh lá',Black:'Đen',Violet:'Tím',Other:'Phối màu'};
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
export function filterProfiles(items,query='',color='All'){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 return items.filter(p=>{const words=normalize(p.name+' '+p.slug+' '+(colorLabels[p.color]||p.color)).split(' ');return (color==='All'||p.color===color)&&terms.every(term=>words.some(word=>word.startsWith(term)))});
}
export function profilePage(items,page=1,size=6){
 const pageSize=Number.isFinite(size)&&size>0?Math.max(1,Math.floor(size)):6,totalPages=Math.max(1,Math.ceil(items.length/pageSize));
 const current=Math.max(1,Math.min(totalPages,Number.isFinite(page)?Math.floor(page):1)),offset=(current-1)*pageSize;
 return {items:items.slice(offset,offset+pageSize),page:current,totalPages,total:items.length,start:items.length?offset+1:0,end:Math.min(offset+pageSize,items.length)};
}
export function validatePhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))return 'Bạn chọn ảnh JPG, PNG hoặc WebP nhé. Nếu ảnh HEIC chưa mở được, hãy xuất sang JPG trước.';
 if(file.size>12*1024*1024)return 'Ảnh hơi lớn. Bạn chọn ảnh dưới 12 MB nhé.';
 return '';
}
