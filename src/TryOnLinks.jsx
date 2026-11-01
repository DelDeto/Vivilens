import React from 'react';
import {Camera,ArrowRight} from 'lucide-react';
import {supportsTryOn,tryOnPath} from './tryon/links';
import './tryon.css';
export function ProductTryOn({product}){
 if(!supportsTryOn(product?.slug))return null;
 return <a href={tryOnPath(product.slug)} className="vv-tryon-product-link"><Camera size={18}/><span>Thử tông màu trên ảnh của bạn<small>Mô phỏng tham khảo · camera hoặc ảnh có sẵn</small></span><ArrowRight size={16}/></a>;
}
export function TryOnInvite(){return <section className="section vv-tryon-invite"><div><span className="eyebrow">VIVI TRY-ON / COLOR PLAY</span><h2>Màu này lên mắt mình <em>thì sao?</em></h2><p>Thử các mẫu trong bộ sưu tập trên ảnh của bạn. Đặt cạnh ảnh gốc, tìm mood mình thích.</p></div><a href="/try-on" className="primary"><Camera size={18}/> THỬ MÀU LENS <ArrowRight size={16}/></a></section>}
