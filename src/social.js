import {siteConfig} from './site-config.js';
import {collectionBySlug,guideBySlug,colorNames,seoProductText} from './seo-content.js';
export const SITE_ORIGIN=siteConfig.origin;
export const SOCIAL_IMAGE='/brand/og-vivilens-v14.jpg';
export const BRAND_DESCRIPTION='Mắt xinh, đúng mood. Khám phá lens màu VIVILENS qua ảnh thật và tìm màu hợp phong cách của bạn.';
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function socialMetadata(page='home',product=null,origin=SITE_ORIGIN,path='/'){
 let title='VIVILENS | Lens màu, kính áp tròng chọn độ từng mắt',description=BRAND_DESCRIPTION;
 const hidden=['account','admin','notfound','checkout','receipt'].includes(page)||(page==='detail'&&!product);
 const isProduct=page==='detail'&&product;
 const color={Brown:'nâu',Gray:'xám',Pink:'hồng',Blue:'xanh dương',Green:'xanh lá',Violet:'tím',Black:'đen'}[product?.color];
 if(page==='catalog'){title='Bộ sưu tập lens màu | VIVILENS';description='Tìm mood của bạn cùng VIVILENS: xem ảnh sản phẩm thật, khám phá tông nâu, xám, hồng, xanh và quiz chọn màu lens.'}
 if(isProduct){title='Lens '+product.name+(color?' màu '+color:'')+' | VIVILENS';description=seoProductText(product).slice(0,170)}
 const collection=page==='collection'?collectionBySlug(path.split('/').at(-1)):null;
 const guide=page==='guide'?guideBySlug(path.split('/').at(-1)):null;
 if(collection){title=collection.title+' | VIVILENS';description=collection.description}
 if(guide){title=guide.title+' | VIVILENS';description=guide.description}
 if(page==='journal'){title='Vivi Notes | Chọn màu lens, đọc thông số & phối makeup';description='Hướng dẫn chọn màu lens qua ảnh thật, phân biệt thông số và phối makeup cùng VIVILENS.'}
 if(page==='account')title='Tài khoản | VIVILENS';
 if(page==='admin')title='Quản trị | VIVILENS';
 if(page==='checkout')title='Đặt hàng COD | VIVILENS';
 if(page==='receipt')title='Đơn hàng của bạn | VIVILENS';
 if(page==='help'){
  const helpTitles={contact:'Liên hệ & hỗ trợ',shipping:'Vận chuyển & COD',returns:'Hỗ trợ đổi trả','lens-care':'Sử dụng & bảo quản lens',privacy:'Thông tin riêng tư'};
  title=(helpTitles[path.split('/').at(-1)]||'Hỗ trợ')+' | VIVILENS';
  description='Thông tin hỗ trợ khách hàng VIVILENS: đơn hàng, giao hàng COD, chăm sóc lens và gửi yêu cầu đến cửa hàng.';
 }
 if(page==='notfound')title='Không tìm thấy trang | VIVILENS';
 const canonicalPath=isProduct?'/products/'+encodeURIComponent(product.slug):path.split('?')[0];
 const productImage=isProduct&&/^https:\/\//i.test(product.image_url||'')&&!/unsplash\.com|placehold\.co/.test(product.image_url);
 const image=productImage?product.image_url:new URL(SOCIAL_IMAGE,origin).href;
 return {title,description,canonical:new URL(canonicalPath,origin).href,hidden,type:isProduct?'product':guide?'article':'website',image,imageAlt:productImage?product.name+' — ảnh sản phẩm thật VIVILENS':'VIVILENS — Mắt xinh, đúng mood. Ảnh thật Milk Tea Brown, Clear Sky Blue và Creamy Pink.',imageType:productImage?'image/webp':'image/jpeg',width:productImage?null:1200,height:productImage?null:630};
}
export function renderSocialHead(html,meta){
 let result=html.replace(/<title>[\s\S]*?<\/title>/i,()=>'<title>'+escapeHtml(meta.title)+'</title>');
 function set(attribute,key,value){
  const pattern=new RegExp('<meta\\b(?=[^>]*\\b'+attribute+'=["\\\']'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\\\'])[^>]*>','gi');
  result=result.replace(pattern,'');
  if(value!==null&&value!==undefined)result=result.replace('</head>',()=>`<meta ${attribute}="${key}" content="${escapeHtml(value)}"/></head>`);
 }
 const fields={
  description:meta.description,robots:meta.hidden?'noindex, nofollow':'index, follow, max-image-preview:large',
  'twitter:card':'summary_large_image','twitter:title':meta.title,'twitter:description':meta.description,'twitter:image':meta.image,'twitter:image:alt':meta.imageAlt
 };
 for(const [key,value] of Object.entries(fields))set('name',key,value);
 for(const [key,value] of Object.entries({'og:type':meta.type,'og:site_name':'VIVILENS','og:locale':'vi_VN','og:title':meta.title,'og:description':meta.description,'og:url':meta.canonical,'og:image':meta.image,'og:image:secure_url':meta.image,'og:image:type':meta.imageType,'og:image:alt':meta.imageAlt,'og:image:width':meta.width,'og:image:height':meta.height}))set('property',key,value);
 result=result.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi,'');
 return result.replace('</head>',()=>'<link rel="canonical" href="'+escapeHtml(meta.canonical)+'"/></head>');
}
