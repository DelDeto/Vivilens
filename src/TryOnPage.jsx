import React,{useEffect,useRef,useState} from 'react';
import {Camera,ImagePlus,ShieldCheck,Download,RotateCcw,X,Eye,SlidersHorizontal,ArrowRight,Check,LoaderCircle,SplitSquareHorizontal} from 'lucide-react';
import {profiles,profileFor,validatePhoto} from './tryon/profiles';
import {createVision} from './tryon/vision';
import {colorTexture,drawTryOn,exportTryOn} from './tryon/render';
import {manualEye,sourcePoint,smoothEyes} from './tryon/geometry';
import {money} from './data';
import './tryon.css';

async function photoCanvas(file){
 let image,url;
 try{
  if(typeof createImageBitmap==='function')image=await createImageBitmap(file,{imageOrientation:'from-image'});
  else{url=URL.createObjectURL(file);image=new Image();image.src=url;await image.decode()}
  if(!(image.width>0&&image.height>0)||image.width*image.height>65000000)throw new Error('IMAGE_SIZE');
  const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;
 }finally{image?.close?.();if(url)URL.revokeObjectURL(url)}
}
export default function TryOnPage({products,onProduct}){
 const initial=new URLSearchParams(window.location.search).get('lens');
 const [slug,setSlug]=useState(profileFor(initial)?.slug||profiles[0].slug),[consent,setConsent]=useState(false),[mode,setMode]=useState('empty'),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[count,setCount]=useState(0),[strength,setStrength]=useState(.65),[original,setOriginal]=useState(false),[split,setSplit]=useState(false),[manual,setManual]=useState(false),[manualStep,setManualStep]=useState(0),[activeEye,setActiveEye]=useState(0),[radius,setRadius]=useState(1.7),[sample,setSample]=useState(false);
 const canvasRef=useRef(null),videoRef=useRef(null),inputRef=useRef(null),sourceRef=useRef(null),eyesRef=useRef([]),textureRef=useRef(null),visionRef=useRef(null),readyRef=useRef(false),rafRef=useRef(0),generation=useRef(0),mounted=useRef(true),settings=useRef({}),drag=useRef(null),inflight=useRef(false),lastDetect=useRef(0),lastPaint=useRef(0);
 const profile=profileFor(slug),product=products.find(p=>p.slug===slug);
 settings.current={strength,original,split,manual};
 function paint(override={}){const source=sourceRef.current;if(source&&canvasRef.current)drawTryOn(canvasRef.current,source.element,eyesRef.current,textureRef.current,{...settings.current,mirror:source.mirror,...override})}
 function release(){
  generation.current++;cancelAnimationFrame(rafRef.current);sourceRef.current?.stream?.getTracks().forEach(t=>t.stop());
  if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null}
  sourceRef.current=null;eyesRef.current=[];drag.current=null;inflight.current=false;
 }
 function clear(){release();visionRef.current?.close();visionRef.current=null;readyRef.current=false;setSample(false);setMode('empty');setCount(0);setBusy(false);setManual(false);setManualStep(0);setMessage('');setOriginal(false);setSplit(false);if(canvasRef.current)canvasRef.current.getContext('2d').clearRect(0,0,canvasRef.current.width,canvasRef.current.height)}
 async function engine(){
  if(!visionRef.current)visionRef.current=createVision();
  const vision=visionRef.current;
  try{await vision.ready;if(visionRef.current!==vision)throw new Error('CLOSED');readyRef.current=true;return vision}catch(error){vision.close();if(visionRef.current===vision){visionRef.current=null;readyRef.current=false}throw error}
 }
 function receive(result,epoch,video=false){
  if(epoch!==generation.current||!mounted.current)return;
  eyesRef.current=video?smoothEyes(eyesRef.current,result.eyes):result.eyes;setCount(result.eyes.length);
  setMessage(result.count>1?'Có nhiều khuôn mặt. Bạn giữ một người trong khung hình nhé.':result.count===0?'Chưa tìm thấy khuôn mặt. Nhìn thẳng, đủ sáng và để lộ hai mắt nhé.':result.eyes.length<2?'Giữ hai mắt mở nhẹ và nhìn gần chính diện nhé.':'Đã tìm thấy hai mắt · chọn tông màu bạn thích');paint();
 }
 async function detectPhoto(epoch){
  try{
   setMessage('Đang chuẩn bị và tìm vị trí hai mắt…');const detector=await engine();
   if(epoch!==generation.current)return;
   const frame=await createImageBitmap(sourceRef.current.element);const result=await detector.detect(frame,false);receive(result,epoch);
  }catch{if(epoch===generation.current&&mounted.current)setMessage('Chưa thể tự tìm mắt trên thiết bị này. Bạn có thể chọn “Chỉnh vị trí mắt” để tiếp tục trên ảnh.')}
  finally{if(epoch===generation.current&&mounted.current)setBusy(false)}
 }
 async function choosePhoto(file,isSample=false){
  if(!consent&&!isSample)return;const error=validatePhoto(file);if(error){setMessage(error);return}
  release();setSample(isSample);const epoch=generation.current;setBusy(true);setManual(false);setOriginal(false);setSplit(false);setCount(0);
  try{
   const image=await photoCanvas(file);if(epoch!==generation.current||!mounted.current)return;
   sourceRef.current={mode:'photo',element:image,width:image.width,height:image.height,mirror:false};canvasRef.current.width=image.width;canvasRef.current.height=image.height;setMode('photo');paint();await detectPhoto(epoch);
  }catch{if(epoch===generation.current&&mounted.current){setBusy(false);setMessage('Ảnh này chưa mở được. Bạn thử ảnh JPG hoặc PNG khác nhé.')}}
 }
 async function samplePhoto(){
  try{const response=await fetch('/brand/milk-tea-brown-960.webp');if(!response.ok)throw new Error('SAMPLE');const blob=await response.blob();await choosePhoto(new File([blob],'vivilens-sample.webp',{type:'image/webp'}),true)}catch{setMessage('Chưa mở được ảnh mẫu. Bạn có thể chọn ảnh của mình để thử nhé.')}
 }
 function tick(time){
  const source=sourceRef.current;if(!mounted.current||source?.mode!=='camera')return;
  if(time-lastPaint.current>32){paint();lastPaint.current=time}
  if(readyRef.current&&!inflight.current&&time-lastDetect.current>(visionRef.current?.frameInterval||100)&&source.element.readyState>=2){
   const epoch=generation.current;inflight.current=true;lastDetect.current=time;
   createImageBitmap(source.element).then(frame=>visionRef.current.detect(frame,true)).then(result=>receive(result,epoch,true)).catch(()=>{if(epoch===generation.current){eyesRef.current=[];setCount(0);setMessage('Chưa theo kịp vị trí mắt. Giữ máy ổn định hoặc chụp ảnh để thử nhé.')}}).finally(()=>{if(epoch===generation.current)inflight.current=false});
  }rafRef.current=requestAnimationFrame(tick);
 }
 async function startCamera(){
  if(!consent)return;
  if(!navigator.mediaDevices?.getUserMedia){setMessage('Trình duyệt này chưa mở được camera. Bạn chọn ảnh có sẵn để thử nhé.');return}
  release();setSample(false);const epoch=generation.current;setBusy(true);setCount(0);setManual(false);setOriginal(false);setSplit(false);setMessage('Đang mở camera…');let stream;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}}});
   if(epoch!==generation.current||!mounted.current){stream.getTracks().forEach(t=>t.stop());return}
   const video=videoRef.current;video.srcObject=stream;await video.play();
   if(!video.videoWidth)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('VIDEO_TIMEOUT')),8000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve()},{once:true})});
   if(epoch!==generation.current||!mounted.current){stream.getTracks().forEach(t=>t.stop());return}
   sourceRef.current={mode:'camera',element:video,width:video.videoWidth,height:video.videoHeight,mirror:true,stream};canvasRef.current.width=video.videoWidth;canvasRef.current.height=video.videoHeight;setMode('camera');setBusy(false);setMessage('Đang chuẩn bị thử màu…');rafRef.current=requestAnimationFrame(tick);
   await engine();if(epoch===generation.current)setMessage('Nhìn thẳng và giữ hai mắt trong khung hình nhé.');
  }catch(error){
   stream?.getTracks().forEach(t=>t.stop());
   if(epoch!==generation.current||!mounted.current)return;
   release();setMode('empty');setBusy(false);
   setMessage(error.name==='NotAllowedError'?'Camera chưa được cấp quyền. Bạn có thể cho phép trong trình duyệt hoặc dùng ảnh có sẵn.':error.name==='NotFoundError'?'Chưa tìm thấy camera trên thiết bị. Bạn chọn ảnh để thử nhé.':error.name==='NotReadableError'?'Camera đang được ứng dụng khác sử dụng. Bạn đóng ứng dụng đó hoặc thử bằng ảnh nhé.':'Chưa mở được chế độ camera trên thiết bị này. Bạn có thể thử bằng ảnh có sẵn.');
  }
 }
 async function freeze(){
  const source=sourceRef.current;if(source?.mode!=='camera')return;
  const image=document.createElement('canvas');image.width=source.width;image.height=source.height;image.getContext('2d').drawImage(source.element,0,0);
  // Store the unmirrored pixels and carry the presentation mirror forward.
  release();const epoch=generation.current;sourceRef.current={mode:'photo',element:image,width:image.width,height:image.height,mirror:true};setMode('photo');setBusy(true);paint();await detectPhoto(epoch);
 }
 function editEyes(){
  if(mode!=='photo')return;
  if(busy){generation.current++;visionRef.current?.close();visionRef.current=null;readyRef.current=false;setBusy(false)}
  setManual(true);setOriginal(false);setSplit(false);
  eyesRef.current=eyesRef.current.map(e=>({...e,contour:null}));setManualStep(eyesRef.current.length);setActiveEye(0);
  if(eyesRef.current[0])setRadius(eyesRef.current[0].rx/sourceRef.current.width*100);
  setMessage(eyesRef.current.length===2?'Kéo vòng tròn vào giữa mống mắt. Chỉnh độ rộng nếu cần.':'Chạm giữa mống mắt bên trái ảnh, rồi mống mắt bên phải ảnh.');paint({manual:true});
 }
 function pointer(event,move=false){
  if(!manual||mode!=='photo')return;const source=sourceRef.current;
  const p=sourcePoint(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect(),source.width,source.height,source.mirror);if(!p)return;
  if(move){if(drag.current===null)return;eyesRef.current=eyesRef.current.map((eye,i)=>i===drag.current?{...eye,cx:p.x,cy:p.y}:eye);paint();return}
  if(eyesRef.current.length<2){eyesRef.current=[...eyesRef.current,manualEye(p,source.width*.017,eyesRef.current.length?'left':'right')];setCount(eyesRef.current.length);setManualStep(eyesRef.current.length);setActiveEye(eyesRef.current.length-1);setRadius(1.7);setMessage(eyesRef.current.length===2?'Đã đặt hai mắt. Bạn kéo vòng tròn để chỉnh lại nếu cần.':'Tiếp theo, chạm giữa mống mắt còn lại.');paint();return}
  const nearest=eyesRef.current.reduce((best,eye,i)=>Math.hypot(eye.cx-p.x,eye.cy-p.y)<Math.hypot(eyesRef.current[best].cx-p.x,eyesRef.current[best].cy-p.y)?i:best,0);
  drag.current=nearest;setActiveEye(nearest);setRadius(eyesRef.current[nearest].rx/source.width*100);event.currentTarget.setPointerCapture(event.pointerId);
 }
 function resizeEye(value){const source=sourceRef.current;if(!source)return;setRadius(value);eyesRef.current=eyesRef.current.map((eye,i)=>i===activeEye?{...eye,rx:source.width*value/100,ry:source.width*value/100}:eye);paint()}
 async function save(){
  if(mode!=='photo'||count!==2)return;setSaving(true);
  try{paint({manual:false,original:false,split:false});const blob=await exportTryOn(canvasRef.current,profile.name),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='vivilens-'+slug+'-thu-mau.jpg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{setMessage('Chưa lưu được ảnh. Bạn thử lại nhé.')}finally{paint();setSaving(false)}
 }
 function selectProfile(next){setSlug(next);const url=new URL(window.location.href);url.searchParams.set('lens',next);window.history.replaceState(null,'',url.pathname+url.search);setOriginal(false)}
 useEffect(()=>{textureRef.current=colorTexture(profile);paint()},[slug]);
 useEffect(()=>{paint()},[strength,original,split,manual]);
 useEffect(()=>{
  mounted.current=true;
  const hide=()=>{if(document.hidden&&sourceRef.current?.mode==='camera'){release();setMode('empty');setCount(0);setBusy(false);setMessage('Camera đã tắt khi bạn rời tab. Bấm “Bật camera” khi muốn thử tiếp.')}};
  const leave=()=>release();document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
  return()=>{mounted.current=false;release();visionRef.current?.close();visionRef.current=null;document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave)};
 },[]);
 return <main className="vv-tryon-page section">
  <div className="vv-tryon-heading"><div><span className="eyebrow">VIVI TRY-ON / YOUR COLOR PLAYGROUND</span><h1>Mắt mình, <em>mood mới.</em></h1><p>Thử tông màu trên ảnh của bạn. So với ảnh gốc, chọn mood mình thích.</p></div><span className="vv-tryon-beta">MÔ PHỎNG MÀU</span></div>
  {initial&&!profileFor(initial)&&<p className="vv-tryon-notice" role="status">Mẫu bạn chọn chưa có bản mô phỏng. Bạn thử một trong 6 mẫu dưới đây nhé.</p>}
  <div className="vv-tryon-grid">
   <section className="vv-tryon-studio" aria-label="Khung thử màu lens">
    <div className="vv-tryon-stage" data-mode={mode}>
     <canvas ref={canvasRef} width="960" height="960" aria-label={mode==='empty'?'Khung thử màu, chưa chọn ảnh':'Ảnh thử tông màu '+profile.name} className={manual?'is-editing':''} onPointerDown={e=>pointer(e)} onPointerMove={e=>pointer(e,true)} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} hidden={mode==='empty'}/>
     <video ref={videoRef} playsInline muted className="vv-tryon-video" aria-hidden="true"/>
     {mode==='empty'?<div className="vv-tryon-empty"><div className="vv-tryon-eye-art"><Eye size={56} strokeWidth={1}/><span/><span/></div><span>HELLO, BEAUTIFUL EYES ♡</span><h2>Một chút màu.<br/>Một mood rất bạn.</h2><p>Chọn ảnh rõ hai mắt hoặc bật camera để bắt đầu.</p><div className="vv-tryon-empty-tags"><span>Ảnh của bạn</span><span>6 tông màu</span><span>Trước / sau</span></div></div>:<><span className="vv-tryon-stage-tag">{sample?'ẢNH MẪU · ':''}{original?'ẢNH GỐC':profile.name}</span>{split&&!original&&<div className="vv-tryon-split-label"><span>Gốc</span><span>Thử màu</span></div>}<button className="vv-tryon-clear" onClick={clear} aria-label="Xóa ảnh và tắt camera"><X size={17}/></button></>}
     {busy&&<div className="vv-tryon-loading" role="status"><LoaderCircle size={20}/><span>Đang chuẩn bị phòng thử…</span></div>}
    </div>
    <p className="vv-tryon-status" role="status" aria-live="polite">{message||'Ảnh chính diện, đủ sáng và không dùng filter sẽ dễ thử hơn.'}</p>
    <label className="vv-tryon-consent"><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);if(!e.target.checked)clear()}}/><span>Tôi đồng ý xử lý ảnh/camera trên thiết bị để thử màu lens.</span></label>
    <div className="vv-tryon-inputs"><button className="primary" disabled={!consent||busy} onClick={startCamera}><Camera size={17}/>{mode==='camera'?'Mở lại camera':'Bật camera'}</button><button className="secondary" disabled={!consent||busy} onClick={()=>inputRef.current?.click()}><ImagePlus size={17}/>Chọn ảnh</button><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Chọn ảnh khuôn mặt để thử lens" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)choosePhoto(file)}} hidden/></div>
    {mode==='empty'&&<button className="textlink vv-tryon-sample" onClick={samplePhoto} disabled={busy}>Xem thử trên ảnh mẫu <ArrowRight size={14}/></button>}
    {sample&&<p className="vv-tryon-sample-note">Ảnh mẫu VIVILENS đã đeo lens; dùng để khám phá thao tác. Chọn ảnh của bạn để thử tông màu trên chính mình.</p>}
    {mode==='camera'&&<div className="vv-tryon-camera-actions"><button className="secondary" onClick={freeze} disabled={busy}><Camera size={16}/>Chụp ảnh để so sánh</button><button className="textlink" onClick={clear}>Tắt camera</button></div>}
    {mode!=='empty'&&<div className="vv-tryon-tools"><button aria-pressed={original} onClick={()=>setOriginal(v=>!v)}><Eye size={16}/>{original?'Đang xem ảnh gốc':'Xem ảnh gốc'}</button><button aria-pressed={split} onClick={()=>{setSplit(v=>!v);setOriginal(false)}} disabled={manual}><SplitSquareHorizontal size={16}/>Trước / sau</button>{mode==='photo'&&<button aria-pressed={manual} onClick={()=>manual?setManual(false):editEyes()}><SlidersHorizontal size={16}/>{manual?'Xong chỉnh mắt':'Chỉnh vị trí mắt'}</button>}</div>}
    {manual&&<div className="vv-tryon-manual"><p>{manualStep<2?'Chạm giữa từng mống mắt trên ảnh để đặt vòng màu.':'Kéo vòng màu để chỉnh vị trí. Dùng thanh bên dưới để chỉnh độ rộng.'}</p>{manualStep===2&&<><div>{eyesRef.current.map((e,i)=><button key={e.id} aria-pressed={activeEye===i} onClick={()=>{setActiveEye(i);setRadius(e.rx/sourceRef.current.width*100)}}>Mắt {i+1}</button>)}</div><label>Độ rộng vùng màu<input aria-label="Độ rộng vùng màu" type="range" min="0.4" max="6" step="0.05" value={radius} onChange={e=>resizeEye(Number(e.target.value))}/></label></>}<button className="textlink" onClick={()=>{eyesRef.current=[];setCount(0);setManualStep(0);paint()}}><RotateCcw size={14}/> Đặt lại hai mắt</button></div>}
    <div className="vv-tryon-private"><ShieldCheck size={16}/><span>Ảnh và vị trí mắt được xử lý trên thiết bị. VIVILENS không tải ảnh của bạn lên máy chủ.</span></div>
   </section>
   <aside className="vv-tryon-picker">
    <span className="eyebrow">01 / PICK YOUR COLOR</span><h2>Hôm nay thử <em>màu nào?</em></h2>
    <div className="vv-tryon-options">{profiles.map(p=><button key={p.slug} aria-pressed={slug===p.slug} onClick={()=>selectProfile(p.slug)}><img src={p.image} alt={'Ảnh sản phẩm thật '+p.name} loading="lazy" width="60" height="60"/><span><strong>{p.name}</strong><small>{({Brown:'Nâu',Gray:'Xám',Pink:'Hồng',Blue:'Xanh dương'})[p.color]}</small></span>{slug===p.slug&&<Check size={17}/>}</button>)}</div>
    <label className="vv-tryon-strength">Độ đậm màu <span>{Math.round(strength*100)}%</span><input type="range" aria-label="Độ đậm màu lens" min="0.2" max="0.9" step="0.01" value={strength} onChange={e=>setStrength(Number(e.target.value))}/><small>Nhẹ nhàng <span>Nổi bật hơn</span></small></label>
    <div className="vv-tryon-selected"><span className="eyebrow">YOUR LITTLE COLOR PICK</span><h3>{profile.name}</h3>{product&&<p>{money(product.price)} / hộp 2 chiếc</p>}<button className="primary wide" onClick={()=>product?onProduct(product):window.location.assign('/products/'+slug)}>{product?.active?'Xem mẫu & chọn độ':'Xem ảnh sản phẩm thật'}<ArrowRight size={16}/></button><button className="secondary wide" disabled={mode!=='photo'||count!==2||busy||saving} onClick={save}><Download size={16}/>{saving?'Đang lưu…':'Lưu ảnh thử màu'}</button></div>
    <p className="vv-tryon-accuracy">Mô phỏng tông màu tham khảo. Hoa văn, độ giãn và màu thực tế có thể khác theo màu mắt, ánh sáng và màn hình.</p>
    <details className="vv-tryon-explain"><summary>Vivi thử màu như thế nào?</summary><p>Bản đầu hỗ trợ 6 tông được lấy mẫu từ ảnh minh họa sản phẩm. Lớp màu được đặt vào vùng mống mắt, có thể so với ảnh gốc và chỉnh vị trí nếu cần. Đây chưa phải bản tái tạo hoa văn lens đã được hiệu chuẩn.</p><p>Ảnh chỉ ở bộ nhớ của tab đang mở. “Xóa ảnh” hoặc rời trang sẽ xóa phiên thử; camera tự tắt khi bạn rời tab. Chỉ khi bấm “Lưu ảnh thử màu”, ảnh mới được tải xuống thiết bị.</p><a href="/help/privacy">Thông tin riêng tư</a></details>
   </aside>
  </div>
 </main>;
}
