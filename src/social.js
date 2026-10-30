export const SITE_ORIGIN='https://vivilens.duc-nguyen-ndd127.workers.dev';
export const SOCIAL_IMAGE='/brand/og-vivilens-v14.jpg';
export const BRAND_DESCRIPTION='Mắt xinh, đúng mood. Khám phá lens màu VIVILENS qua ảnh thật và tìm màu hợp phong cách của bạn.';
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function socialMetadata(page='home',product=null,origin=SITE_ORIGIN,path='/'){
 let title='VIVILENS — Mắt xinh, đúng mood.',description=BRAND_DESCRIPTION;
 const hidden=['account','admin','notfound'].includes(page)||(page==='detail'&&!product);
 const isProduct=page==='detail'&&product;
 const color={Brown:'nâu',Gray:'xám',Pink:'hồng',Blue:'xanh dương',Green:'xanh lá',Violet:'tím',Black:'đen'}[product?.color];
 if(page==='catalog'){title='Bộ sưu tập lens màu | VIVILENS';description='Tìm mood của bạn cùng VIVILENS: xem ảnh sản phẩm thật, khám phá tông nâu, xám, hồng, xanh và quiz chọn màu lens.'}
 if(isProduct){title=product.name+' | VIVILENS';description=product.name+' — lens màu'+(color?' '+color:'')+(product.wear_period&&product.wear_period!=='Chưa xác nhận'?', chu kỳ '+product.wear_period:'')+'. Xem bộ ảnh thật và tìm look của bạn cùng VIVILENS.'}
 if(page==='account')title='Tài khoản | VIVILENS';
 if(page==='admin')title='Quản trị | VIVILENS';
 if(page==='notfound')title='Không tìm thấy trang | VIVILENS';
 const canonicalPath=isProduct?'/products/'+encodeURIComponent(product.slug):path;
 const productImage=isProduct&&/^https:\/\//i.test(product.image_url||'')&&!/unsplash\.com|placehold\.co/.test(product.image_url);
 const image=productImage?product.image_url:new URL(SOCIAL_IMAGE,origin).href;
 return {title,description,canonical:new URL(canonicalPath,origin).href,hidden,type:isProduct?'product':'website',image,imageAlt:productImage?product.name+' — ảnh sản phẩm thật VIVILENS':'VIVILENS — Mắt xinh, đúng mood. Ảnh thật Milk Tea Brown, Clear Sky Blue và Creamy Pink.',imageType:productImage?'image/webp':'image/jpeg',width:productImage?null:1200,height:productImage?null:630};
}
export function renderSocialHead(html,meta){
 let result=html.replace(/<title>[\s\S]*?<\/title>/i,()=>'<title>'+escapeHtml(meta.title)+'</title>');
 function set(attribute,key,value){
  const pattern=new RegExp('<meta\\b(?=[^>]*\\b'+attribute+'=["\\\']'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\\\'])[^>]*>','gi');
  result=result.replace(pattern,'');
  if(value!==null&&value!==undefined)result=result.replace('</head>',()=>`<meta ${attribute}="${key}" content="${escapeHtml(value)}"/></head>`);
 }
 const fields={
  description:meta.description,robots:meta.hidden?'noindex, nofollow':'index, follow',
  'twitter:card':'summary_large_image','twitter:title':meta.title,'twitter:description':meta.description,'twitter:image':meta.image,'twitter:image:alt':meta.imageAlt
 };
 for(const [key,value] of Object.entries(fields))set('name',key,value);
 for(const [key,value] of Object.entries({'og:type':meta.type,'og:site_name':'VIVILENS','og:locale':'vi_VN','og:title':meta.title,'og:description':meta.description,'og:url':meta.canonical,'og:image':meta.image,'og:image:secure_url':meta.image,'og:image:type':meta.imageType,'og:image:alt':meta.imageAlt,'og:image:width':meta.width,'og:image:height':meta.height}))set('property',key,value);
 result=result.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi,'');
 return result.replace('</head>',()=>'<link rel="canonical" href="'+escapeHtml(meta.canonical)+'"/></head>');
}
