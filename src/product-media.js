import media from '../catalog/product_media_display.json' with {type:'json'};
export function productMediaGroups(product,images=[]){
 const policy=media[product?.slug];
 const all=[...images].sort((a,b)=>(a.position||0)-(b.position||0));
 if(!policy)return {primary:all,other:[]};
 const extras=new Set(policy.other),primary=all.filter(i=>!extras.has(i.image_url)),other=all.filter(i=>extras.has(i.image_url));
 return {primary,other};
}
