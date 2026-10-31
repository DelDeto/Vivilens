import profiles from '../../catalog/tryon_profiles.json' with {type:'json'};
export {profiles};
export const profileFor=slug=>profiles.find(p=>p.slug===slug)||null;
export const tryOnPath=slug=>'/try-on'+(profileFor(slug)?'?lens='+encodeURIComponent(slug):'');
export function validatePhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))return 'Bạn chọn ảnh JPG, PNG hoặc WebP nhé. Nếu ảnh HEIC chưa mở được, hãy xuất sang JPG trước.';
 if(file.size>12*1024*1024)return 'Ảnh hơi lớn. Bạn chọn ảnh dưới 12 MB nhé.';
 return '';
}
