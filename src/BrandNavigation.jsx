import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronDown,Sparkles} from 'lucide-react';
import {moodCollections,collectionPath} from './marketing';
import './navigation.css';

function follow(event,action){
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();action();
}

export function BrandNavigation({mobileOpen,onClose,onCatalog,onCollection,onQuiz,page,style,admin,onAdmin}){
 const [moodsOpen,setMoodsOpen]=useState(false);
 const root=useRef(null),trigger=useRef(null);
 const close=()=>{setMoodsOpen(false);onClose()};
 useEffect(()=>{
  if(!mobileOpen&&!moodsOpen)return;
  const outside=event=>{if(!root.current?.contains(event.target))close()};
  const keyboard=event=>{
   if(event.key==='Escape'){
    if(moodsOpen){setMoodsOpen(false);trigger.current?.focus()}
    else{onClose();document.getElementById('vv-mobile-menu-toggle')?.focus()}
   }
  };
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',keyboard);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard)};
 },[mobileOpen,moodsOpen,onClose]);
 return <nav ref={root} id="vv-main-navigation" aria-label="Điều hướng chính" className={'vv-brand-navigation'+(mobileOpen?' open':'')}>
  <div className="vv-nav-intro"><span>YOUR EYES, YOUR MOOD</span><strong>Tìm một màu. Kể một chút về bạn.</strong></div>
  <a className={'vv-nav-link'+(page==='catalog'&&style==='All'?' is-active':'')} href="/shop" onClick={e=>follow(e,()=>{close();onCatalog()})}>Tất cả lens</a>
  <div className="vv-nav-moods">
   <button ref={trigger} className={'vv-nav-link vv-moods-trigger'+(moodsOpen||page==='catalog'&&style!=='All'?' is-active':'')} aria-expanded={moodsOpen} aria-controls="vv-mood-navigation" onClick={()=>setMoodsOpen(value=>!value)}>Theo phong cách <ChevronDown size={14}/></button>
   {moodsOpen&&<div className="vv-mood-navigation" id="vv-mood-navigation">
    <div className="vv-mood-nav-heading"><span>THE VIVI MOOD EDIT</span><strong>Hôm nay, bạn là mood nào?</strong><p>Gợi ý phối makeup qua ảnh sản phẩm thật.</p></div>
    <div className="vv-mood-nav-grid">{moodCollections.map(c=><a href={collectionPath(c.id)} key={c.id} className={'vv-mood-nav-card'+(page==='catalog'&&style===c.id?' is-selected':'')} onClick={e=>follow(e,()=>{close();onCollection(c.id)})}><img src={'/brand/'+c.photo} width="64" height="72" alt={'Ảnh thật '+c.product}/><span><strong>{c.title}</strong><small>{c.label}</small></span><ArrowRight size={15}/></a>)}</div>
    <a className="vv-mood-nav-all" href="/shop" onClick={e=>follow(e,()=>{close();onCatalog()})}>Khám phá tất cả lens <ArrowRight size={14}/></a>
   </div>}
  </div>
  <a className="vv-nav-link" href="/#vivi-edit" onClick={close}>Vivi Edit <span className="vv-nav-tag">VIVI CHỌN</span></a>
  <a className="vv-nav-link" href="/#ve-vivilens" onClick={close}>Về VIVILENS</a>
  <button className="vv-nav-quiz" onClick={()=>{close();onQuiz()}}><Sparkles size={15}/> Tìm lens của bạn</button>
  {admin&&<button className="vv-nav-link" onClick={()=>{close();onAdmin()}}>Admin</button>}
 </nav>;
}

export function BrandStory({onQuiz,onCatalog}){
 return <section className="section vv-brand-story" id="ve-vivilens" aria-labelledby="vv-brand-story-title">
  <div className="vv-story-heading"><span className="eyebrow">HELLO, WE'RE VIVILENS</span><h2 id="vv-brand-story-title">Một chút màu.<br/><em>Rất nhiều bạn.</em></h2><p>Với Vivi, chọn màu lens là một phần của việc tìm ra phong cách bạn yêu. Từ look nhẹ nhàng hằng ngày đến những hôm muốn thử điều mới — cứ bắt đầu bằng mood của bạn.</p><button className="textlink" onClick={onQuiz}>TÌM LENS CỦA BẠN <ArrowRight size={16}/></button></div>
  <div className="vv-story-values"><div><span>01 / REAL PHOTOS</span><h3>Xem ảnh thật, chọn look riêng.</h3><p>Khám phá từng mẫu qua bộ ảnh sản phẩm VIVILENS.</p></div><div><span>02 / YOUR MOOD FIRST</span><h3>Màu sắc theo cách của bạn.</h3><p>Chọn theo phong cách, lưu mẫu yêu thích và đặt ảnh cạnh nhau để so sánh.</p></div><div><span>03 / A PAIR, YOUR WAY</span><h3>Hai mắt, hai lựa chọn.</h3><p>Chọn độ cho từng mắt. Một hộp luôn gồm đúng 2 chiếc lens.</p></div><button className="textlink" onClick={onCatalog}>KHÁM PHÁ BỘ SƯU TẬP <ArrowRight size={16}/></button></div>
 </section>;
}
