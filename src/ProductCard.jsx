import React from 'react';
import {ArrowRight,Eye,Heart,Scale} from 'lucide-react';
import {money} from './data';

// Kept outside App so selections don't remount cards or lose keyboard focus.
export function ProductCard({p,photos,saved,compared,onWish,onCompare,onQuick,onDetail}){
 const [cover,next]=photos;
 return <article className="product vv-catalog-card vv-shop-card">
  <div className="product-photo vv-catalog-photo">
   <button className="vv-photo-open" aria-label={'Xem '+p.name} onClick={()=>onDetail(p)}>
    {cover?<><img className="vv-catalog-cover" src={cover.image_url} alt={cover.alt_text||'Lens '+p.name} loading="lazy"/>{next&&<img className="vv-catalog-alt" src={next.image_url} alt={'Khám phá '+p.name+' ở góc nhìn khác'} loading="lazy"/>}</>:<div className="vv-card-no-photo vv-brand-art"><span>VIVILENS</span><strong>{p.name}</strong><small>YOUR EYES, YOUR MOOD</small></div>}
   </button>
   {p.featured&&<span className="featured-tag">VIVILENS PICK</span>}
   <button className={'wish-button '+(saved?'saved':'')} aria-label={(saved?'Bỏ yêu thích ':'Yêu thích ')+p.name} aria-pressed={saved} onClick={()=>onWish(p.id)}><Heart size={19} fill={saved?'currentColor':'none'}/></button>
  </div>
  <div className="vv-card-body"><div className="product-meta"><div><h3>{p.name}</h3><p>{p.color} · Kính áp tròng màu</p></div></div><div className="vv-card-specs">{p.wear_period&&p.wear_period!=='Chưa xác nhận'&&<span>{p.wear_period}</span>}{p.diameter&&p.diameter!=='Chưa xác nhận'&&<span>DIA {p.diameter} mm</span>}</div><div className="price">{Number(p.price)>0?<><strong>{money(p.price)}</strong> <span>/ cặp 2 chiếc</span><small className="vv-unit-price">{money(Number(p.price)/2)} / chiếc</small></>:'Liên hệ để biết giá'}</div><div className="vv-card-interactions"><button onClick={()=>onQuick(p)} aria-label={'Xem nhanh '+p.name}><Eye size={15}/> Xem nhanh</button><button className={compared?'is-compared':''} aria-label={'So sánh '+p.name} aria-pressed={compared} onClick={()=>onCompare(p.id)}><Scale size={15}/><span className="vv-compare-label">{compared?'Đã chọn':'So sánh'}</span></button></div><button className="card-shop-link vv-card-cta" onClick={()=>onDetail(p)}>CHI TIẾT MẪU LENS <ArrowRight size={15}/></button></div>
 </article>;
}
