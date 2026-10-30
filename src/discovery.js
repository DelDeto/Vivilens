// Editorial styling suggestions, not claims about fit, safety, or eye enlargement.
export const styleOptions = [
 {id:'everyday',label:'Hằng ngày',hint:'Phối cùng makeup nhẹ',colors:['Brown','Black']},
 {id:'kbeauty',label:'Makeup Hàn',hint:'Một chút mềm mại, ngọt ngào',colors:['Brown','Pink','Gray']},
 {id:'occasion',label:'Cô dâu & kỷ yếu',hint:'Gợi ý phối look chụp ảnh',colors:['Brown','Gray','Pink']},
 {id:'statement',label:'Nổi bật',hint:'Khám phá một màu mắt khác',colors:['Blue','Green','Violet']}
];
export function stylesFor(product){
 return styleOptions.filter(style=>style.colors.includes(product?.color)).map(style=>style.id);
}
export function matchesStyle(product,style){return !style||style==='All'||stylesFor(product).includes(style)}
export function realPhoto(product){
 const url=String(product?.image_url||'');
 return /^https?:\/\//.test(url)&&!/(unsplash\.com|placehold\.co)/.test(url);
}
export function recommendProducts(products,answers={},limit=3){
 const candidates=(products||[]).filter(realPhoto);
 const colorMatch=p=>!answers.color||answers.color==='All'||p.color===answers.color;
 const periodMatch=p=>!answers.period||answers.period==='All'||p.wear_period===answers.period;
 const exact=candidates.filter(p=>colorMatch(p)&&periodMatch(p)&&matchesStyle(p,answers.style));
 const pool=exact.length?exact:candidates;
 const results=pool.map(product=>{
  const reasons=[];let score=0;
  if(answers.color&&answers.color!=='All'&&colorMatch(product)){score+=20;reasons.push('Màu '+product.color+' bạn chọn')}
  if(answers.period&&answers.period!=='All'&&periodMatch(product)){score+=8;reasons.push('Chu kỳ '+product.wear_period)}
  const style=styleOptions.find(s=>s.id===answers.style);
  if(style&&matchesStyle(product,style.id)){score+=5;reasons.push('Gợi ý phối look '+style.label.toLowerCase())}
  if(answers.occasion==='photo'&&stylesFor(product).includes('occasion'))score+=2;
  if(answers.occasion==='daily'&&stylesFor(product).includes('everyday'))score+=2;
  if(answers.occasion==='explore'&&stylesFor(product).includes('statement'))score+=2;
  if(product.featured)score+=0.1;
  if(!reasons.length)reasons.push('Khám phá qua ảnh sản phẩm thật');
  return {product,reasons,score};
 }).sort((a,b)=>b.score-a.score||a.product.name.localeCompare(b.product.name,'vi')).slice(0,limit);
 return {results,relaxed:!exact.length&&results.length>0};
}
export function toggleCompare(ids,id,max=3){
 if(ids.includes(id))return {ids:ids.filter(x=>x!==id),full:false};
 return ids.length>=max?{ids,full:true}:{ids:[...ids,id],full:false};
}
export function normalizePhone(value){return String(value||'').replace(/[\s().-]/g,'')}
export function validInquiry({name,phone,message,consent}){
 return String(name||'').trim().length>=2&&String(name).trim().length<=80&&
  /^(0[0-9]{9}|\+84[0-9]{9})$/.test(normalizePhone(phone))&&String(message||'').length<=1000&&consent===true;
}
// No contact details, prescriptions or other personal data in discovery events.
export function discoveryEvent(name,details={}){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('vivilens:interaction',{detail:{name,...details}}));
}
