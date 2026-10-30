import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,Check,Heart,MessageCircle,ShoppingBag,Sparkles,X,CheckCheck,Copy,Scale} from 'lucide-react';
import {ProductGallery} from './ProductGallery';
import {money} from './data';
import {availablePairBoxes,boxPrice,formatPower,isChosenPower,isSupportedPower,remainingLegacyBoxes,remainingPairBoxes,supportedPowers,variantsForProduct} from './variants';
import {discoveryEvent,normalizePhone,recommendProducts,styleOptions,validInquiry} from './discovery';
import './discovery.css';

export function DiscoveryDialog({title,eyebrow,children,onClose,wide=false}){
 const ref=useRef(null),close=useRef(onClose),titleId=useId();close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';ref.current?.focus();
  const handle=e=>{
   if(document.querySelector('.vv-lightbox'))return;
   if(e.key==='Escape'){e.preventDefault();close.current()}
   if(e.key==='Tab'){
    const items=[...ref.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(!first){e.preventDefault();return}
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){e.preventDefault();first.focus()}
   }
  };
  document.addEventListener('keydown',handle);
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',handle);if(previous?.isConnected)previous.focus()};
 },[]);
 return createPortal(<div className="vv-discovery-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><section className={'vv-discovery-dialog '+(wide?'is-wide':'')} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
  <div className="vv-dialog-heading"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div><button className="vv-icon-button" onClick={onClose} aria-label="Đóng cửa sổ"><X size={21}/></button></div>{children}
 </section></div>,document.body);
}

export function QuizInvite({onStart,compact=false}){
 return <section className={'vv-quiz-invite '+(compact?'is-compact':'')} aria-label="Tìm màu lens hợp bạn"><div className="vv-quiz-mark" aria-hidden="true"><Sparkles size={30}/></div><div><span className="eyebrow">YOUR MOOD, YOUR MATCH</span><h2>Để Vivi tìm màu lens <em>cùng bạn.</em></h2><p>4 câu hỏi nhỏ · Gợi ý từ ảnh thật · Không cần đăng nhập</p></div><button className="primary" onClick={onStart}>TÌM MÀU CỦA TÔI <ArrowRight size={17}/></button></section>;
}
const questions=[
 {key:'occasion',title:'Bạn chọn lens cho dịp nào?',hint:'Bắt đầu từ một look bạn đang muốn thử.',options:[{id:'daily',label:'Đi học / đi làm',hint:'Một chút mới mẻ cho mỗi ngày',symbol:'☀'},{id:'photo',label:'Chụp ảnh / sự kiện',hint:'Cô dâu, kỷ yếu hay buổi hẹn',symbol:'✧'},{id:'explore',label:'Đổi mood cuối tuần',hint:'Thử một phong cách khác',symbol:'✳'}]},
 {key:'style',title:'Phong cách nào giống bạn?',hint:'Đây là gợi ý phối makeup, hãy xem ảnh thật để chọn màu.',options:styleOptions.map(s=>({id:s.id,label:s.label,hint:s.hint,symbol:s.id==='statement'?'✳':'✿'}))},
 {key:'color',title:'Bạn đang thích tông màu nào?',hint:'Bạn luôn có thể thử lại với một tông màu khác.',options:[{id:'All',label:'Để Vivi gợi ý',symbol:'✧'},...['Brown','Gray','Pink','Blue','Green','Violet','Black'].map(c=>({id:c,label:{Brown:'Nâu',Gray:'Xám',Pink:'Hồng',Blue:'Xanh dương',Green:'Xanh lá',Violet:'Tím',Black:'Đen'}[c],color:c}))]},
 {key:'period',title:'Bạn muốn xem chu kỳ nào?',hint:'Gợi ý sẽ ưu tiên đúng chu kỳ bạn chọn.',options:[{id:'All',label:'Khám phá tất cả',hint:'Xem các lựa chọn hiện có',symbol:'∞'},{id:'6 tháng',label:'Lens 6 tháng',hint:'Xem thông tin từng sản phẩm',symbol:'06'},{id:'1 ngày',label:'Lens 1 ngày',hint:'Xem thông tin từng sản phẩm',symbol:'01'}]}
];
export function LensQuiz({products,onClose,onView,onWish,wish}){
 const [step,setStep]=useState(0),[answers,setAnswers]=useState({}),[done,setDone]=useState(false);
 const question=questions[step],chosen=answers[question.key];
 const recommendations=done?recommendProducts(products,answers):null;
 function next(){if(!chosen)return;if(step<questions.length-1)setStep(step+1);else{setDone(true);discoveryEvent('quiz_complete',{style:answers.style,color:answers.color,period:answers.period})}}
 return <DiscoveryDialog title={done?'Một chút mood dành cho bạn.':'Tìm màu lens hợp bạn'} eyebrow="VIVI MATCH / STYLE QUIZ" onClose={onClose} wide>
 {!done?<><div className="vv-quiz-progress"><span>Câu {step+1} / {questions.length}</span><div>{questions.map((q,i)=><span key={q.key} className={i<=step?'active':''}/>)}</div></div><h3 className="vv-question-title">{question.title}</h3><p className="vv-dialog-muted">{question.hint}</p><div className={'vv-quiz-options '+(question.key==='color'?'is-colors':'')}>{question.options.map(option=><button key={option.id} className={chosen===option.id?'selected':''} aria-pressed={chosen===option.id} onClick={()=>setAnswers({...answers,[question.key]:option.id})}>{option.color?<span className={'vv-color-dot '+option.color.toLowerCase()}/>:<span className="vv-option-symbol">{option.symbol}</span>}<span><strong>{option.label}</strong>{option.hint&&<small>{option.hint}</small>}</span>{chosen===option.id&&<Check size={17}/>}</button>)}</div><div className="vv-quiz-navigation"><button className="textlink" disabled={step===0} onClick={()=>setStep(step-1)}><ArrowLeft size={16}/> Quay lại</button><button className="primary" disabled={!chosen||products.length===0} onClick={next}>{step===questions.length-1?'XEM GỢI Ý':'TIẾP THEO'}<ArrowRight size={16}/></button></div></>:<>
 <p className="vv-dialog-muted">{recommendations.relaxed?'Chưa có mẫu khớp tất cả lựa chọn. Đây là các gợi ý gần nhất; xem lý do dưới từng mẫu.':'Những gợi ý phối phong cách từ lựa chọn của bạn. Hãy mở ảnh thật để cảm nhận màu lens.'}</p>
 <div className="vv-quiz-results">{recommendations.results.map(({product:p,reasons})=><article key={p.id}><button className="vv-result-photo" onClick={()=>{discoveryEvent('quiz_product_open',{slug:p.slug});onView(p)}}><img src={p.image_url} alt={p.name}/><span>Xem nhanh <ArrowRight size={15}/></span></button><div className="vv-result-title"><h3>{p.name}</h3><button className="vv-icon-button" aria-label={(wish.includes(p.id)?'Bỏ yêu thích ':'Yêu thích ')+p.name} aria-pressed={wish.includes(p.id)} onClick={()=>onWish(p.id)}><Heart size={18} fill={wish.includes(p.id)?'currentColor':'none'}/></button></div><p className="vv-result-price">{money(boxPrice(p))} <small>/ hộp 2 chiếc</small></p><ul>{reasons.map(r=><li key={r}><Check size={13}/>{r}</li>)}</ul><button className="secondary wide" onClick={()=>onView(p)}>KHÁM PHÁ MẪU NÀY</button></article>)}</div>
 <div className="vv-quiz-navigation"><button className="textlink" onClick={()=>{setStep(0);setDone(false);setAnswers({});discoveryEvent('quiz_restart')}}>Làm lại quiz</button><span className="vv-dialog-muted">Màu thực tế có thể khác theo ánh sáng và màn hình.</span></div>
 </>}
 </DiscoveryDialog>;
}

export function PurchasePanel({product:p,variants,cart,onAdd,onConsult,canShop,compact=false,onWish,isSaved=false}){
 const [left,setLeft]=useState(''),[right,setRight]=useState('');const uid=useId();
 useEffect(()=>{setLeft('');setRight('')},[p.id]);
 const bySku=p.inventory_mode==='variant';
 const skus=variantsForProduct(variants,p.id).filter(v=>isSupportedPower(v.power)&&['chiếc','1 chiếc'].includes(v.unit_label.toLocaleLowerCase('vi').trim()));
 const leftSku=skus.find(v=>v.id===left),rightSku=skus.find(v=>v.id===right);
 const both=bySku?!!(leftSku&&rightSku):isChosenPower(left)&&isChosenPower(right);
 const boxes=bySku?remainingPairBoxes(cart,variants,p.id,left,right):remainingLegacyBoxes(cart,p.id,p.stock);
 const cartReady=canShop&&both&&boxes>=1;
 function action(){if(!both){document.getElementById(uid+(left?'-right':'-left'))?.focus();return}if(cartReady){onAdd(p,bySku?{leftVariantId:left,rightVariantId:right}:{leftPower:left,rightPower:right});discoveryEvent('add_to_cart',{slug:p.slug,source:compact?'quick_view':'detail'})}}
 const buttonText=!both?'CHỌN ĐỘ HAI MẮT':boxes<1?'CHỌN ĐỘ KHÁC':'THÊM 1 HỘP · '+money(boxPrice(p));
 return <div className={'vv-purchase-panel '+(compact?'is-compact':'')}>
 {canShop?<><div className="variant-picker"><p><b>1 hộp · 2 chiếc · Chọn độ từng mắt</b></p><div className="variant-eye-fields">{[['left','Chiếc 1 · Mắt trái',left,setLeft],['right','Chiếc 2 · Mắt phải',right,setRight]].map(([key,label,value,set])=><label key={key} htmlFor={uid+'-'+key}>{label}<select id={uid+'-'+key} value={value} onChange={e=>set(e.target.value)}><option value="">{key==='left'?'Chọn độ mắt trái':'Chọn độ mắt phải'}</option>{bySku?skus.map(v=><option key={v.id} value={v.id} disabled={key==='left'?v.stock<1:availablePairBoxes(leftSku||v,v)<1}>{formatPower(v.power)} {v.stock<1?'· Hết hàng':''}</option>):supportedPowers.map(power=><option key={power} value={String(power)}>{formatPower(power)} {power===0?'· Không độ':''}</option>)}</select></label>)}</div><div className="variant-box-summary"><b>Đã chọn {bySku?Number(!!leftSku)+Number(!!rightSku):Number(isChosenPower(left))+Number(isChosenPower(right))}/2 chiếc</b><span>Trái: {bySku?(leftSku?formatPower(leftSku.power):'Chưa chọn'):(isChosenPower(left)?formatPower(left):'Chưa chọn')} · Phải: {bySku?(rightSku?formatPower(rightSku.power):'Chưa chọn'):(isChosenPower(right)?formatPower(right):'Chưa chọn')}</span><strong>{money(boxPrice(p))} / hộp 2 chiếc</strong></div>{both&&boxes<1&&<p role="status" className="vv-dialog-muted">Lựa chọn này hiện không đủ hàng. Bạn có thể chọn độ khác hoặc gửi yêu cầu tư vấn.</p>}</div><div className="vv-purchase-buttons"><button className="primary wide vv-detail-add" onClick={action} disabled={both&&!cartReady}><ShoppingBag size={17}/>{buttonText}</button><button className="secondary wide" onClick={()=>onConsult(p)}><MessageCircle size={17}/> HỎI VỀ MẪU NÀY</button></div></>:<div className="vv-consult-card"><span className="eyebrow">MÌNH CHỌN CÙNG NHA</span><h3>Thích màu này? Hỏi Vivi nhé.</h3><p>Để lại yêu cầu để cửa hàng kiểm tra độ cận và tình trạng mẫu trước khi bạn đặt mua.</p><button className="primary wide" onClick={()=>onConsult(p)}><MessageCircle size={17}/> TƯ VẤN MẪU {p.name.toUpperCase()}</button></div>}
 {canShop&&<p className="vv-box-footnote">Hai mắt khác độ vẫn là 1 hộp, gồm đúng 2 chiếc lens.</p>}
 <div className="vv-mobile-product-actions">{onWish&&<button onClick={()=>onWish(p.id)} aria-label={isSaved?"Bỏ yêu thích":"Yêu thích"} aria-pressed={isSaved}><Heart size={19} fill={isSaved?"currentColor":"none"}/><span>Yêu thích</span></button>}<button onClick={()=>onConsult(p)}><MessageCircle size={19}/><span>Tư vấn</span></button>{canShop?<button className="primary" onClick={action} disabled={both&&!cartReady}><ShoppingBag size={17}/>{both?money(boxPrice(p))+' / hộp':'Chọn độ hai mắt'}</button>:<button className="primary" onClick={()=>onConsult(p)}>HỎI VIVI VỀ MẪU NÀY <ArrowRight size={16}/></button>}</div>
 </div>;
}

export function QuickView({product:p,photos,variants,cart,canShop,onClose,onDetail,onWish,wish,onCompare,compared,onConsult,onAdd}){
 return <DiscoveryDialog title={p.name} eyebrow="VIVILENS / XEM NHANH" onClose={onClose} wide><div className="vv-quick-grid"><ProductGallery product={p} images={photos}/><div className="vv-quick-info"><span className="eyebrow">{p.color} · YOUR EYES, YOUR MOOD</span><div className="detail-price"><b>{money(boxPrice(p))}</b><span> / hộp 2 chiếc · {money(boxPrice(p)/2)} / chiếc</span></div><div className="vv-detail-quickfacts"><span>{p.wear_period}</span>{p.diameter&&p.diameter!=='Chưa xác nhận'&&<span>DIA {p.diameter} mm</span>}</div><div className="vv-quick-tools"><button onClick={()=>onWish(p.id)} aria-pressed={wish.includes(p.id)}><Heart size={16} fill={wish.includes(p.id)?'currentColor':'none'}/>{wish.includes(p.id)?'Đã lưu':'Yêu thích'}</button><button onClick={()=>onCompare(p.id)} aria-pressed={compared}><Scale size={16}/>{compared?'Đã chọn so sánh':'So sánh mẫu'}</button></div><PurchasePanel product={p} variants={variants} cart={cart} canShop={canShop} onAdd={onAdd} onConsult={onConsult} onWish={onWish} isSaved={wish.includes(p.id)} compact/><button className="textlink vv-detail-link" onClick={()=>onDetail(p)}>Xem trang sản phẩm <ArrowRight size={16}/></button></div></div></DiscoveryDialog>;
}

export function CompareTray({products,onRemove,onOpen,onClear}){
 if(!products.length)return null;
 return <aside className="vv-compare-tray" aria-label="Mẫu lens đã chọn so sánh"><div className="vv-compare-thumbs">{products.map(p=><div key={p.id}><img src={p.image_url} alt={p.name}/><button onClick={()=>onRemove(p.id)} aria-label={'Bỏ so sánh '+p.name}><X size={12}/></button></div>)}</div><div className="vv-compare-tray-label"><b>So sánh {products.length}/3 mẫu</b><small>Ảnh thật cạnh nhau</small></div><button className="primary" disabled={products.length<2} onClick={onOpen}><Scale size={16}/><span>{products.length<2?'Chọn thêm 1 mẫu':'SO SÁNH'}</span></button><button className="vv-icon-button" onClick={onClear} aria-label="Bỏ tất cả mẫu so sánh"><X size={17}/></button></aside>;
}
export function CompareDialog({products,onClose,onRemove,onView,onConsult}){
 return <DiscoveryDialog title="Đặt cạnh nhau, chọn dễ hơn." eyebrow="VIVILENS / SO SÁNH MẪU" wide onClose={onClose}><p className="vv-dialog-muted">Xem ảnh gốc cùng thông tin từng mẫu. Ánh sáng và màu mắt mẫu đeo có thể khác nhau.</p><div className="vv-comparison" style={{'--compare-count':products.length}}>{products.map(p=><article key={p.id}><button className="vv-compare-remove" onClick={()=>onRemove(p.id)} aria-label={'Bỏ so sánh '+p.name}><X size={15}/> Bỏ mẫu</button><button className="vv-compare-photo" onClick={()=>onView(p)}><img src={p.image_url} alt={p.name}/></button><h3>{p.name}</h3><dl><div><dt>Màu</dt><dd>{p.color}</dd></div><div><dt>Đường kính DIA</dt><dd>{p.diameter&&p.diameter!=='Chưa xác nhận'?p.diameter+' mm':'Chưa xác nhận'}</dd></div><div><dt>Chu kỳ</dt><dd>{p.wear_period}</dd></div><div><dt>Giá hộp 2 chiếc</dt><dd>{money(boxPrice(p))}</dd></div></dl><button className="primary wide" onClick={()=>onView(p)}>XEM NHANH</button><button className="textlink" onClick={()=>onConsult(p)}>Tư vấn mẫu này <ArrowRight size={14}/></button></article>)}</div>{products.length===0&&<p>Chưa có mẫu để so sánh. Hãy chọn lại từ bộ sưu tập.</p>}</DiscoveryDialog>;
}

export function InquiryDialog({product:p,supabase,onClose}){
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[message,setMessage]=useState(''),[consent,setConsent]=useState(false),[honey,setHoney]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 const requestId=useRef(null),submitting=useRef(false);
 if(!requestId.current&&globalThis.crypto?.randomUUID)requestId.current=globalThis.crypto.randomUUID();
 const [copied,setCopied]=useState(false);
 const text=`Tôi muốn tư vấn mẫu ${p.name}: ${window.location.origin}/products/${encodeURIComponent(p.slug)}${message?'\n'+message:''}`;
 async function copy(){try{await navigator.clipboard.writeText(text);setCopied(true)}catch{setError('Chưa sao chép được. Bạn có thể chọn nội dung bên dưới để sao chép.')}}
 async function submit(e){
  e.preventDefault();if(submitting.current||honey)return;
  if(!validInquiry({name,phone,message,consent})){setError('Vui lòng nhập tên, số điện thoại Việt Nam hợp lệ và đồng ý để cửa hàng liên hệ.');return}
  if(!supabase){setError('Chưa gửi được lúc này. Bạn có thể sao chép nội dung để gửi cho cửa hàng.');return}
  submitting.current=true;setBusy(true);setError('');
  try{
   const {error}=await supabase.from('product_inquiries').insert({...(requestId.current?{id:requestId.current}:{}),product_id:p.id,customer_name:name.trim(),phone:normalizePhone(phone),message:message.trim(),consent:true});
   if(error&&error.code!=='23505')throw error;
   setSent(true);discoveryEvent('consultation_submit',{slug:p.slug});
  }catch{setError('Yêu cầu chưa gửi được. Vui lòng thử lại hoặc sao chép nội dung để gửi cho cửa hàng.')}finally{submitting.current=false;setBusy(false)}
 }
 return <DiscoveryDialog title={sent?'Vivi đã nhận yêu cầu.':'Mình chọn lens cùng nha.'} eyebrow="VIVILENS / TƯ VẤN MẪU LENS" onClose={onClose}>
 <div className="vv-inquiry-product"><img src={p.image_url} alt={p.name}/><div><strong>{p.name}</strong><span>{p.color} · {p.wear_period}</span><b>{money(boxPrice(p))} / hộp 2 chiếc</b></div></div>
 {sent?<div className="vv-inquiry-success" role="status"><CheckCheck size={36}/><h3>Yêu cầu đã được gửi đến cửa hàng.</h3><p>VIVILENS sẽ liên hệ qua số bạn cung cấp để tư vấn và xác nhận tình trạng mẫu. Đây là yêu cầu tư vấn, chưa phải đơn hàng.</p><button className="primary wide" onClick={onClose}>TIẾP TỤC KHÁM PHÁ</button></div>:<form className="vv-inquiry-form" onSubmit={submit}><p className="vv-dialog-muted">Cửa hàng sẽ tiếp nhận yêu cầu và liên hệ với bạn. Chưa cần thanh toán hay tạo tài khoản.</p><label>Tên của bạn<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} maxLength={80} minLength={2} required placeholder="Vivi gọi bạn là…"/></label><label>Số điện thoại / Zalo<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={20} required placeholder="Số điện thoại để cửa hàng liên hệ"/></label><label>Bạn muốn hỏi thêm điều gì? <small>(không bắt buộc)</small><textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} rows={3} placeholder="Màu lens, cách phối makeup, tình trạng mẫu…"/></label><label className="vv-honeypot" aria-hidden="true">Website<input value={honey} onChange={e=>setHoney(e.target.value)} autoComplete="off" tabIndex={-1}/></label><label className="vv-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>Tôi đồng ý để VIVILENS sử dụng thông tin này để liên hệ và tư vấn yêu cầu trên.</span></label>{error&&<p className="vv-form-error" role="alert">{error}</p>}<button className="primary wide" type="submit" disabled={busy}>{busy?'ĐANG GỬI…':'GỬI YÊU CẦU TƯ VẤN'}<ArrowRight size={16}/></button><details className="vv-copy-inquiry"><summary>Hoặc sao chép nội dung để nhắn cửa hàng</summary><textarea readOnly value={text} aria-label="Nội dung tư vấn để sao chép"/><button className="secondary" type="button" onClick={copy}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Đã sao chép':'Sao chép nội dung'}</button></details></form>}
 </DiscoveryDialog>;
}

export function InquiryInbox({supabase,notify,onProduct}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('new'),[error,setError]=useState('');
 async function refresh(){setLoading(true);setError('');let q=supabase.from('product_inquiries').select('id,product_id,customer_name,phone,message,status,created_at').order('created_at',{ascending:false}).limit(50);if(filter!=='all')q=q.eq('status',filter);const {data,error}=await q;if(error)setError('Chưa tải được yêu cầu tư vấn.');else setRows(data||[]);setLoading(false)}
 useEffect(()=>{refresh()},[filter]);
 async function mark(row){const {error}=await supabase.from('product_inquiries').update({status:row.status==='new'?'contacted':'new'}).eq('id',row.id);if(error)notify('Chưa cập nhật được trạng thái tư vấn.');else refresh()}
 return <section className="vv-admin-inquiries"><div className="section-heading"><div><span className="eyebrow">CUSTOMER CARE</span><h2>Yêu cầu tư vấn</h2></div><button className="secondary" onClick={refresh}>Làm mới</button></div><div className="chips">{[['new','Chưa liên hệ'],['contacted','Đã liên hệ'],['all','Tất cả']].map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}</div>{loading?<p>Đang tải…</p>:error?<p role="alert">{error}</p>:rows.length===0?<p className="vv-dialog-muted">Chưa có yêu cầu trong nhóm này.</p>:<div className="vv-inbox-list">{rows.map(row=><article key={row.id}><div><strong>{row.customer_name}</strong><a href={'tel:'+row.phone}>{row.phone}</a><time>{new Date(row.created_at).toLocaleString('vi-VN')}</time></div><p>{row.message||'Khách cần tư vấn về mẫu lens.'}</p><div><button className="textlink" onClick={()=>onProduct(row.product_id)}>Xem mẫu khách hỏi</button><button className="secondary" onClick={()=>mark(row)}>{row.status==='new'?'Đánh dấu đã liên hệ':'Đánh dấu chưa liên hệ'}</button></div></article>)}</div>}<small>Tối đa 50 yêu cầu gần nhất theo bộ lọc. Chỉ tài khoản Admin xem được thông tin khách hàng.</small></section>;
}
