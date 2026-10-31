import {isSupportedPower} from './variants.js';
export function publicAvailability(product,variants=[]){
 if(!product?.active)return null;
 if(product.inventory_mode!=='variant')return Number(product.stock)>0?'InStock':'OutOfStock';
 const units=variants.filter(v=>v.active!==false&&isSupportedPower(v.power)&&['chiếc','1 chiếc'].includes(String(v.unit_label||'').toLocaleLowerCase('vi').trim())&&Number(v.stock)>0).reduce((n,v)=>n+Number(v.stock),0);
 return units>=2?'InStock':'OutOfStock';
}
