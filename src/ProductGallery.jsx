import React, {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,ImagePlus,LoaderCircle,MoveDown,MoveUp,Trash2,X,ZoomIn} from 'lucide-react';

export function ProductGallery({product,images=[]}){
 const cover=String(product?.image_url||'');
 const verifiedCover=cover&&!cover.includes('unsplash.com')&&!cover.includes('placehold.co');
 const slides = images.length ? [...images].sort((a,b)=>(a.position||0)-(b.position||0)) : (verifiedCover ? [{id:'cover',image_url:cover,alt_text:'Ảnh lens '+product.name}] : []);
 const [current,setCurrent]=useState(0),[zoom,setZoom]=useState(false),touch=useRef(null);
 useEffect(()=>{setCurrent(0);setZoom(false)},[product?.id]);
 useEffect(()=>{if(!zoom)return;const handle=e=>{if(e.key==='Escape')setZoom(false);if(e.key==='ArrowRight')setCurrent(i=>(i+1)%Math.max(slides.length,1));if(e.key==='ArrowLeft')setCurrent(i=>(i-1+Math.max(slides.length,1))%Math.max(slides.length,1))};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[zoom,slides.length]);
 const idx=Math.min(current,Math.max(slides.length-1,0)),slide=slides[idx],step=dir=>setCurrent(i=>(i+dir+slides.length)%slides.length);
 const swipeStart=e=>{touch.current=e.touches[0]?.clientX};
 const swipeEnd=e=>{if(touch.current===null)return;const delta=e.changedTouches[0]?.clientX-touch.current;touch.current=null;if(Math.abs(delta)>45 && slides.length>1)step(delta<0?1:-1)};
 return <div className="vv-gallery">
  <div className="vv-gallery-stage" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
   {slide?<button type="button" className="vv-gallery-open" onClick={()=>setZoom(true)} aria-label={'Phóng to ảnh '+(idx+1)}><img src={slide.image_url} alt={slide.alt_text||product.name} loading="eager"/><span className="vv-zoom-hint"><ZoomIn size={17}/> Xem ảnh lớn</span></button>:<div className="vv-gallery-empty vv-gallery-brand"><strong>VIVILENS</strong><span>{product.name}</span><small>YOUR EYES, YOUR MOOD</small></div>}
   {slides.length>1&&<><button type="button" className="vv-gallery-arrow prev" onClick={()=>step(-1)} aria-label="Ảnh trước"><ChevronLeft/></button><button type="button" className="vv-gallery-arrow next" onClick={()=>step(1)} aria-label="Ảnh tiếp"><ChevronRight/></button></>}
   {slides.length>1&&<span className="vv-gallery-count">{idx+1}/{slides.length}</span>}
  </div>
  {slides.length>1&&<div className="vv-gallery-thumbs" aria-label="Chọn ảnh sản phẩm">{slides.map((s,i)=><button type="button" key={s.id||i} className={i===idx?'selected':''} onClick={()=>setCurrent(i)} aria-label={'Xem ảnh '+(i+1)} aria-current={i===idx?'true':undefined}><img src={s.image_url} alt={s.alt_text||'Ảnh thu nhỏ '+(i+1)} loading="lazy"/></button>)}</div>}
  {zoom&&slide&&<div className="vv-lightbox" role="dialog" aria-modal="true" aria-label={'Bộ ảnh '+product.name} onClick={()=>setZoom(false)}><button type="button" className="vv-lightbox-close" onClick={()=>setZoom(false)} aria-label="Đóng ảnh"><X/></button>{slides.length>1&&<button type="button" className="vv-lightbox-prev" onClick={e=>{e.stopPropagation();step(-1)}} aria-label="Ảnh trước"><ArrowLeft/></button>}<img onClick={e=>e.stopPropagation()} src={slide.image_url} alt={slide.alt_text||product.name}/>{slides.length>1&&<button type="button" className="vv-lightbox-next" onClick={e=>{e.stopPropagation();step(1)}} aria-label="Ảnh tiếp"><ArrowRight/></button>}<span className="vv-lightbox-counter">{idx+1} / {slides.length}</span></div>}
 </div>;
}

const MAX_IMAGES=5,MAX_BYTES=5*1024*1024,BUCKET='vivilens-products';
export function MediaEditor({product,supabase,onChanged,notify}){
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 async function refresh(){
  const {data,error}=await supabase.from('product_images').select('*').eq('product_id',product.id).order('position',{ascending:true}).order('created_at',{ascending:true});
  if(error)setMessage(error.message);else{setRows(data||[]);setMessage('')}setLoading(false);
 }
 useEffect(()=>{setLoading(true);refresh()},[product.id]);
 const alertText=t=>{setMessage(t);if(notify)notify(t)};
 async function syncCover(next){
  const cover=next[0]?.image_url||'';
  const {error}=await supabase.from('products').update({image_url:cover}).eq('id',product.id);
  if(error)throw Error('Không cập nhật được ảnh bìa: '+error.message);
 }
 async function uploadFiles(event){
  const files=Array.from(event.target.files||[]);event.target.value='';
  if(!files.length||busy)return;
  if(files.length+rows.length>MAX_IMAGES)return alertText('Mỗi sản phẩm có tối đa 5 ảnh. Đã có '+rows.length+' ảnh.');
  if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_BYTES))return alertText('Chỉ nhận JPG, PNG, WebP tối đa 5 MB/ảnh.');
  setBusy(true);let added=0;
  try{
   for(const file of files){
    const safe=(file.name.split('.').pop()||'jpg').toLowerCase();
    const ext=safe==='jpeg'?'jpg':safe;
    const path=product.id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+'.'+ext;
    const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});
    if(uploadError)throw Error(uploadError.message);
    const url=supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const {error:dbError}=await supabase.from('product_images').insert({product_id:product.id,position:rows.length+added+1,image_url:url,storage_path:path,alt_text:'Ảnh '+(rows.length+added+1)+' – '+product.name});
    if(dbError){await supabase.storage.from(BUCKET).remove([path]);throw Error(dbError.message)}
    added++;
    if(rows.length===0&&added===1)await syncCover([{image_url:url}]);
   }
   await refresh();onChanged?.();notify?.('Đã tải lên '+added+' ảnh cho '+product.name);
  }catch(err){await refresh();onChanged?.();alertText('Tải ảnh chưa hoàn tất ('+added+'/'+files.length+'): '+err.message)}
  finally{setBusy(false)}
 }
 async function move(index,delta){
  const next=[...rows],target=index+delta;if(target<0||target>=rows.length||busy)return;
  [next[index],next[target]]=[next[target],next[index]];
  setBusy(true);
  try{for(let i=0;i<next.length;i++){const {error}=await supabase.from('product_images').update({position:i+1}).eq('id',next[i].id);if(error)throw Error(error.message)}
   await syncCover(next);setRows(next.map((r,i)=>({...r,position:i+1})));onChanged?.();
  }catch(err){alertText(err.message);await refresh()}finally{setBusy(false)}
 }
 async function removeImage(row){
  if(busy||!window.confirm('Xóa ảnh này khỏi bộ sản phẩm?'))return;
  setBusy(true);
  try{
   const {error}=await supabase.from('product_images').delete().eq('id',row.id);if(error)throw Error(error.message);
   const next=rows.filter(x=>x.id!==row.id);
   for(let i=0;i<next.length;i++){const {error:e}=await supabase.from('product_images').update({position:i+1}).eq('id',next[i].id);if(e)throw Error(e.message)}
   await syncCover(next);
   if(row.storage_path){const {error:storageError}=await supabase.storage.from(BUCKET).remove([row.storage_path]);if(storageError)alertText('Đã xóa ảnh trong gallery, nhưng chưa xóa được file: '+storageError.message)}
   await refresh();onChanged?.();
  }catch(err){alertText(err.message);await refresh()}finally{setBusy(false)}
 }
 async function saveAlt(row,value){
  if(value===row.alt_text||busy)return;
  const {error}=await supabase.from('product_images').update({alt_text:value.slice(0,250)}).eq('id',row.id);
  if(error)alertText(error.message);else setRows(old=>old.map(x=>x.id===row.id?{...x,alt_text:value}:x));
 }
 return <div className="vv-media-editor">
  <p className="vv-media-note">Mỗi sản phẩm: tối đa 5 ảnh theo đúng thứ tự 01–05. Ảnh đầu tiên là ảnh đại diện trên trang Shop. Giữ nguyên ảnh mẫu thật và thông số đã kiểm chứng.</p>
  <label className={'vv-upload-target '+(busy||rows.length>=MAX_IMAGES?'disabled':'')}>
    {busy?<LoaderCircle size={22}/>:<ImagePlus size={22}/>}
    <span>{busy?'Đang xử lý ảnh...':'Chọn ảnh từ thiết bị'}</span><small>JPG / PNG / WebP · Tối đa 5 MB/ảnh · Còn {Math.max(0,MAX_IMAGES-rows.length)} chỗ</small>
    <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={uploadFiles} disabled={busy||rows.length>=MAX_IMAGES} aria-label="Tải ảnh cho sản phẩm"/>
  </label>
  <div className="vv-media-progress"><strong>{rows.length} / 5 ảnh</strong><div><span style={{width:(rows.length/5*100)+'%'}}/></div></div>
  {loading?<p>Đang tải gallery...</p>:<div className="vv-media-rows">{rows.map((row,i)=><div className="vv-media-row" key={row.id}>
   <img src={row.image_url} alt={row.alt_text||'Ảnh '+(i+1)}/>
   <div className="vv-media-row-info"><b>{String(i+1).padStart(2,'0')} {i===0?'· Ảnh bìa':''}</b><input aria-label={'Mô tả ảnh '+(i+1)} defaultValue={row.alt_text||''} key={row.id} onBlur={e=>saveAlt(row,e.target.value)} maxLength={250} placeholder="Mô tả ảnh cho SEO và accessibility"/></div>
   <div className="vv-media-tools"><button type="button" onClick={()=>move(i,-1)} disabled={busy||i===0} title="Đưa lên" aria-label="Đưa ảnh lên"><MoveUp size={17}/></button><button type="button" onClick={()=>move(i,1)} disabled={busy||i===rows.length-1} title="Đưa xuống" aria-label="Đưa ảnh xuống"><MoveDown size={17}/></button><button type="button" onClick={()=>removeImage(row)} disabled={busy} title="Xóa ảnh" aria-label="Xóa ảnh"><Trash2 size={17}/></button></div>
  </div>)}</div>}
  {message&&<p className="vv-media-error" role="alert">{message}</p>}
  <small className="vv-media-note">Để tạo bộ 5 ảnh đầu tiên, mở sản phẩm Siren Gray trong Admin và chọn cùng lúc 5 file theo thứ tự 01–05.</small>
 </div>;
}
