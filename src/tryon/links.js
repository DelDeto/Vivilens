import tryOnSlugs from '../../catalog/tryon_index.json' with {type:'json'};
const supported=new Set(tryOnSlugs);
export {tryOnSlugs};
export const supportsTryOn=slug=>supported.has(slug);
export const tryOnPath=slug=>'/try-on'+(supportsTryOn(slug)?'?lens='+encodeURIComponent(slug):'');
