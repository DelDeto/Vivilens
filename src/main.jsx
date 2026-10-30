import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShoppingBag,UserRound,Search,Heart,Menu,X,ArrowRight,Plus,Minus,Trash2,LogOut,Settings,ChevronRight,Sparkles,Filter,ShieldCheck,ImagePlus,Package,Truck,Instagram,Check,SlidersHorizontal,Star,RotateCcw,Scale,Eye,MessageCircle} from 'lucide-react';
import {supabase,configured} from './supabase';
import {demoProducts,money} from './data';
import {ProductGallery,MediaEditor} from './ProductGallery';
import {ProductCard} from './ProductCard';
import {routeFromPath,pathForPage,updatePageMetadata} from './routing';
import {formatPower,variantsForProduct,cartLineKey,availableUnits,supportedPowers,isSupportedPower,pairCartKey,availablePairBoxes,remainingPairBoxes,boxPrice,isChosenPower,remainingLegacyBoxes,legacyPairKey,hasCompleteCartSelection} from './variants';
import './style.css';
import {matchesStyle,toggleCompare,discoveryEvent,styleOptions} from './discovery';
import {QuizInvite,LensQuiz,QuickView,CompareTray,CompareDialog,PurchasePanel,InquiryDialog,InquiryInbox} from './Discovery';

import {BrandHero,RealColorCollection,RealMoodEditorial,RealPinkFeature} from './BrandEditorial';

const cartKey='vivilens-cart-v1';
const catalogPageSize=12;
// Unverified model previews are browseable, but never buyable.
function App(){
 const [products,setProducts]=useState(configured?[]:demoProducts),[loading,setLoading]=useState(configured),[user,setUser]=useState(null),[admin,setAdmin]=useState(false),[page,setPage]=useState(()=>routeFromPath(window.location.pathname).page),[selected,setSelected]=useState(null),[category,setCategory]=useState('All'),[period,setPeriod]=useState('All'),[sort,setSort]=useState('featured'),[catalogPage,setCatalogPage]=useState(1),[query,setQuery]=useState(''),[wish,setWish]=useState(()=>{try{return JSON.parse(localStorage.getItem('vivilens-wishlist-v1'))||[]}catch{return []}}),[cart,setCart]=useState(()=>{try{const stored=JSON.parse(localStorage.getItem(cartKey));return Array.isArray(stored)?stored.filter(hasCompleteCartSelection):[]}catch{return []}}),[cartOpen,setCartOpen]=useState(false),[authOpen,setAuthOpen]=useState(false),[authMode,setAuthMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[authBusy,setAuthBusy]=useState(false),[notice,setNotice]=useState(''),[mobileOpen,setMobileOpen]=useState(false),[adminForm,setAdminForm]=useState(null),[adminProducts,setAdminProducts]=useState([]),[adminSearch,setAdminSearch]=useState(''),[adminStatus,setAdminStatus]=useState('draft'),[adminColor,setAdminColor]=useState('All'),[adminPage,setAdminPage]=useState(1),[galleryImages,setGalleryImages]=useState([]),[mediaProduct,setMediaProduct]=useState(null),[variants,setVariants]=useState([]),[adminVariants,setAdminVariants]=useState([]),[variantProduct,setVariantProduct]=useState(null),[variantForm,setVariantForm]=useState(null);
 const [style,setStyle]=useState('All'),[quizOpen,setQuizOpen]=useState(false),[quickProduct,setQuickProduct]=useState(null),[compareIds,setCompareIds]=useState(()=>{try{const value=JSON.parse(localStorage.getItem('vivilens-compare-v1')||'[]');return Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,3):[]}catch{return []}}),[compareOpen,setCompareOpen]=useState(false),[inquiryProduct,setInquiryProduct]=useState(null);
 const notify=t=>{setNotice(t);setTimeout(()=>setNotice(''),4800)};
 async function loadGallery(){if(!supabase)return;const {data,error}=await supabase.from('product_images').select('id,product_id,image_url,alt_text,position').order('position',{ascending:true}).order('created_at',{ascending:true});if(error)notify('Lỗi tải thư viện ảnh: '+error.message);else setGalleryImages(data||[])}
 async function loadVariants(){
  if(!supabase)return;
  const {data,error}=await supabase.from('product_variants').select('id,product_id,sku,power,unit_label,price_override,stock,active');
  if(!error)setVariants(data||[]); // Older installations may not have applied the V1.1B migration.
 }
 async function loadAdminVariants(){
  if(!supabase)return;
  const {data,error}=await supabase.from('product_variants').select('*').order('power',{ascending:true});
  if(!error){setAdminVariants(data||[]);setVariants((data||[]).filter(v=>v.active))}
  else notify('Lỗi tải SKU: '+error.message);
 }
 async function loadProducts(){if(!supabase)return;setLoading(true);const {data,error}=await supabase.from('products').select('*').or('active.eq.true,catalog_visible.eq.true').order('created_at',{ascending:false});if(error)notify('Lỗi tải sản phẩm: '+error.message);else setProducts(data||[]);setLoading(false);await loadGallery();await loadVariants()}
 async function loadAdminProducts(){if(!supabase)return;const {data,error}=await supabase.from('products').select('*').order('created_at',{ascending:false});if(error)notify('Lỗi tải danh sách quản trị: '+error.message);else setAdminProducts(data||[])}
 async function checkAdmin(uid){if(!supabase||!uid){setAdmin(false);setAdminProducts([]);return}const {data}=await supabase.from('admin_users').select('user_id').eq('user_id',uid).maybeSingle();setAdmin(!!data);if(data){await loadAdminProducts();await loadAdminVariants()}else{setAdminProducts([]);setAdminVariants([])}}
 useEffect(()=>{if(!supabase)return;loadProducts();supabase.auth.getUser().then(({data})=>{setUser(data.user);checkAdmin(data.user?.id)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user||null);checkAdmin(session?.user?.id)});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{localStorage.setItem(cartKey,JSON.stringify(cart))},[cart]);
 useEffect(()=>{localStorage.setItem('vivilens-wishlist-v1',JSON.stringify(wish))},[wish]);
 useEffect(()=>{setCatalogPage(1)},[category,period,sort,query,style]);
 useEffect(()=>{localStorage.setItem('vivilens-compare-v1',JSON.stringify(compareIds))},[compareIds]);
 useEffect(()=>{if(products.length)setCompareIds(ids=>[...new Set(ids)].filter(id=>products.some(p=>p.id===id)).slice(0,3))},[products]);
 function startQuiz(){setQuizOpen(true);discoveryEvent('quiz_start')}
 function openQuick(p){setQuizOpen(false);setCompareOpen(false);setQuickProduct(p);discoveryEvent('quick_view_open',{slug:p.slug})}
 function consult(p){setQuickProduct(null);setCompareOpen(false);setInquiryProduct(p);discoveryEvent('consultation_open',{slug:p.slug})}
 function compare(id){const result=toggleCompare(compareIds,id);if(result.full)return notify('Bạn có thể so sánh tối đa 3 mẫu. Bỏ một mẫu để chọn mẫu khác.');setCompareIds(result.ids);discoveryEvent('compare_select',{count:result.ids.length})}
 function resetFilters(){setCategory('All');setPeriod('All');setQuery('');setStyle('All');setSort('featured')}
 function addFromPanel(p,picks){add(p,picks.leftVariantId,picks.rightVariantId,picks)}
 useEffect(()=>{setAdminPage(1)},[adminSearch,adminStatus,adminColor]);
 useEffect(()=>{
  const syncRoute=()=>{
   const route=routeFromPath(window.location.pathname);
   setPage(route.page);
   setSelected(route.page==='detail' ? products.find(p=>p.slug===route.slug)||null : null);
   setMobileOpen(false);
  };
  syncRoute();
  window.addEventListener('popstate',syncRoute);
  return ()=>window.removeEventListener('popstate',syncRoute);
 },[products]);
 useEffect(()=>{updatePageMetadata(page,selected)},[page,selected]);
 function toggleWish(id){discoveryEvent('wishlist_toggle',{productId:id});setWish(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}
 // Use real Supabase product gallery photos. Exclude legacy Unsplash demo photography.
 const photoByProduct=useMemo(()=>{
  const result=new Map();
  for(const photo of galleryImages){
   if(!photo.image_url)continue;
   if(!result.has(photo.product_id))result.set(photo.product_id,[]);
   result.get(photo.product_id).push(photo);
  }
  return result;
 },[galleryImages]);
 const photosFor=p=>{
  const imgs=photoByProduct.get(p.id)||[];
  if(imgs.length)return imgs;
  const url=String(p.image_url||'');
  return url&&!url.includes('unsplash.com')&&!url.includes('placehold.co')?[{image_url:url,alt_text:'Ảnh thật '+p.name}]:[];
 };
 const hasPhoto=p=>photosFor(p).length>0;
 const canShopProduct=p=>Boolean(p?.active&&Number(p.price)>0&&(p.inventory_mode==='variant'||Number(p.stock)>0));
 const available=useMemo(()=>products.filter(p=>
  (category==='All'||category==='Favorites'&&wish.includes(p.id)||p.color===category) &&
  (period==='All'||p.wear_period===period) && matchesStyle(p,style) &&
  (!query||p.name.toLowerCase().includes(query.toLowerCase()))
 ).sort((a,b)=>{
  if(sort==='name')return a.name.localeCompare(b.name,'vi');
  if(sort==='price-asc'||sort==='price-desc'){
   if(!a.active||Number(a.price)<=0)return (!b.active||Number(b.price)<=0)?a.name.localeCompare(b.name,'vi'):1;
   if(!b.active||Number(b.price)<=0)return -1;
   return sort==='price-asc'?a.price-b.price:b.price-a.price;
  }
  return Number(hasPhoto(b))-Number(hasPhoto(a))||Number(b.featured)-Number(a.featured)||a.name.localeCompare(b.name,'vi');
 }),[products,category,period,sort,query,wish,photoByProduct,style]);
 // For SKU-mode products, a cart line represents ONE BOX with TWO chosen lenses.
 const catalogPages=Math.max(1,Math.ceil(available.length/catalogPageSize));
 const catalogItems=available.slice((catalogPage-1)*catalogPageSize,catalogPage*catalogPageSize);
 function moveCatalogPage(next){setCatalogPage(next);document.getElementById('vv-catalog-results')?.scrollIntoView({behavior:'smooth',block:'start'});}
 const adminFiltered=adminProducts.filter(p=>
  (adminStatus==='all'||(adminStatus==='draft'?!p.active:p.active)) &&
  (adminColor==='All'||p.color===adminColor) &&
  (!adminSearch||[p.name,p.slug,p.color].some(v=>String(v||'').toLowerCase().includes(adminSearch.trim().toLowerCase())))
 ).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 const adminPageCount=Math.max(1,Math.ceil(adminFiltered.length/15));
 const adminVisible=adminFiltered.slice((adminPage-1)*15,adminPage*15);
 const cartDetails=cart.map(c=>{
  const product=products.find(p=>p.id===c.id);
  const left=c.leftVariantId?variants.find(v=>v.id===c.leftVariantId && v.product_id===c.id && v.active):null;
  const right=c.rightVariantId?variants.find(v=>v.id===c.rightVariantId && v.product_id===c.id && v.active):null;
  return {...c,product,left,right};
 }).filter(c=>canShopProduct(c.product) && (c.product.inventory_mode==='variant'
   ? !!(c.left&&c.right&&availablePairBoxes(c.left,c.right)>0)
   : (isChosenPower(c.leftPower)&&isChosenPower(c.rightPower))));
 const total=cartDetails.reduce((sum,c)=>sum+c.qty*boxPrice(c.product),0);
 const count=cartDetails.reduce((sum,c)=>sum+c.qty,0);
 function go(p,product=null){
  const path=pathForPage(p,product);
  if(window.location.pathname!==path) window.history.pushState(null,'',path);
  setPage(p);setSelected(product);setMobileOpen(false);setQuickProduct(null);setQuizOpen(false);setCompareOpen(false);
  window.scrollTo({top:0,behavior:'smooth'});
 }
 function chooseColor(c){setCategory(c);setPeriod('All');setStyle('All');setQuery('');go('catalog')}
 function add(p,leftId=null,rightId=null,powers={leftPower:'',rightPower:''}){
  if(!canShopProduct(p))return notify('Mẫu lens này đang được giới thiệu, chưa mở bán.');
  if(p.inventory_mode==='variant'){
   const left=variants.find(v=>v.id===leftId&&v.product_id===p.id&&v.active);
   const right=variants.find(v=>v.id===rightId&&v.product_id===p.id&&v.active);
   if(!left||!right||!isSupportedPower(left.power)||!isSupportedPower(right.power))return notify('Vui lòng chọn độ cho cả hai mắt.');
   if(!['chiếc','1 chiếc'].includes(left.unit_label.toLocaleLowerCase('vi').trim())||!['chiếc','1 chiếc'].includes(right.unit_label.toLocaleLowerCase('vi').trim()))return notify('SKU phải quản lý tồn kho theo từng chiếc lens.');
   const key=pairCartKey(p.id,left.id,right.id);
   const existing=cart.find(x=>pairCartKey(x.id,x.leftVariantId,x.rightVariantId)===key);
   const max=remainingPairBoxes(cart,variants,p.id,left.id,right.id,existing?key:null);
   if(max<1||(existing&&existing.qty>=max))return notify('Không đủ tồn kho để thêm một hộp gồm hai chiếc lens.');
   setCart(old=>{
    const ex=old.find(x=>pairCartKey(x.id,x.leftVariantId,x.rightVariantId)===key);
    const safeMax=remainingPairBoxes(old,variants,p.id,left.id,right.id,ex?key:null);
    if(ex)return old.map(x=>pairCartKey(x.id,x.leftVariantId,x.rightVariantId)===key?{...x,qty:Math.min(safeMax,x.qty+1)}:x);
    return safeMax>=1?[...old,{id:p.id,leftVariantId:left.id,rightVariantId:right.id,qty:1}]:old;
   });
  } else {
   // Legacy products share stock at box level; persist both eye powers in cart.
   if(!isChosenPower(powers.leftPower)||!isChosenPower(powers.rightPower))return notify('Vui lòng chọn đủ độ cận cho cả mắt trái và mắt phải.');
   const key=legacyPairKey(p.id,powers.leftPower,powers.rightPower);
   if(remainingLegacyBoxes(cart,p.id,p.stock)<1)return notify('Sản phẩm hiện không đủ số hộp trong giỏ.');
   setCart(old=>{
    if(remainingLegacyBoxes(old,p.id,p.stock)<1)return old;
    const ex=old.find(x=>legacyPairKey(x.id,x.leftPower,x.rightPower)===key);
    if(ex)return old.map(x=>legacyPairKey(x.id,x.leftPower,x.rightPower)===key?{...x,qty:x.qty+1}:x);
    return [...old,{id:p.id,leftPower:Number(powers.leftPower),rightPower:Number(powers.rightPower),qty:1}];
   });
  }
  notify('Đã thêm 1 hộp (2 chiếc) '+p.name+' vào giỏ hàng');
 }
 function setQty(id,qty,leftId=null,rightId=null,legacyLeft=null,legacyRight=null){
  const product=products.find(p=>p.id===id);
  if(!canShopProduct(product))return;
  const bySku=product.inventory_mode==='variant';
  const key=bySku?pairCartKey(id,leftId,rightId):legacyPairKey(id,legacyLeft,legacyRight);
  setCart(old=>{
   const lineKey=x=>bySku?pairCartKey(x.id,x.leftVariantId,x.rightVariantId):legacyPairKey(x.id,x.leftPower,x.rightPower);
   if(qty<=0)return old.filter(x=>lineKey(x)!==key);
   const max=bySku
    ?remainingPairBoxes(old,variants,id,leftId,rightId,key)
    :remainingLegacyBoxes(old,id,product.stock,key);
   return old.map(x=>lineKey(x)===key?{...x,qty:Math.max(0,Math.min(qty,max))}:x);
  });
 }
 async function authSubmit(e){e.preventDefault();if(!configured)return notify('Cần kết nối Supabase trước khi đăng ký tài khoản');setAuthBusy(true);const args={email,password};const {data,error}=authMode==='register'?await supabase.auth.signUp({...args,options:{emailRedirectTo:window.location.origin}}):await supabase.auth.signInWithPassword(args);setAuthBusy(false);if(error)return notify(error.message);if(authMode==='register'&&!data.session)notify('Vui lòng mở email để xác nhận tài khoản.');else{notify('Đăng nhập thành công');setAuthOpen(false);setEmail('');setPassword('')}}
 async function logout(){await supabase.auth.signOut();setAdmin(false);go('home');notify('Đã đăng xuất')}
 async function saveProduct(e){e.preventDefault();if(!admin)return;const p={...adminForm,price:Number(adminForm.price),stock:Number(adminForm.stock),active:!!adminForm.active,catalog_visible:!!adminForm.catalog_visible,featured:!!adminForm.featured};if(p.active&&(!p.image_url||p.price<=0||p.stock<=0||!p.diameter||p.diameter==='Chưa xác nhận'||!p.wear_period||p.wear_period==='Chưa xác nhận'))return notify('Để công khai mẫu lens cần ảnh thật, giá, tồn kho và thông số đã xác nhận.');delete p.created_at;const {error}=p.id?await supabase.from('products').update(p).eq('id',p.id):await supabase.from('products').insert([Object.fromEntries(Object.entries(p).filter(([k])=>k!=='id'))]);if(error)return notify(error.message);notify('Đã lưu sản phẩm');setAdminForm(null);loadProducts();loadAdminProducts()}
 async function deactivate(id){if(!admin||!confirm('Ẩn sản phẩm này khỏi cửa hàng?'))return;const {error}=await supabase.from('products').update({active:false,catalog_visible:false}).eq('id',id);if(error)notify(error.message);else{notify('Đã ẩn sản phẩm');loadProducts();loadAdminProducts()}}
 function startEdit(p=null){setAdminForm(p?{...p}:{name:'',slug:'',color:'Brown',diameter:'14.2',wear_period:'6 tháng',price:0,stock:0,inventory_mode:'product',image_url:'',description:'',active:false,catalog_visible:true,featured:false})}
 function startVariant(product,variant=null){
  setVariantProduct(product);
  setVariantForm(variant?{...variant}:{product_id:product.id,sku:'',power:'0.00',unit_label:'1 chiếc',stock:0,price_override:'',active:true});
 }
 async function saveVariant(e){
  e.preventDefault();if(!admin||!variantForm)return;
  if(!isSupportedPower(variantForm.power))return notify('Độ cận không nằm trong 28 mức hỗ trợ.');
  if(!['chiếc','1 chiếc'].includes(variantForm.unit_label.toLocaleLowerCase('vi').trim()))return notify('Đơn vị tồn kho SKU phải là 1 chiếc lens.');
  const body={product_id:variantProduct.id,sku:variantForm.sku.trim(),power:Number(variantForm.power),unit_label:'1 chiếc',stock:Number(variantForm.stock),price_override:null,active:!!variantForm.active};
  const {error}=variantForm.id?await supabase.from('product_variants').update(body).eq('id',variantForm.id):await supabase.from('product_variants').insert(body);
  if(error)return notify('Lỗi lưu SKU: '+error.message);
  notify('Đã lưu SKU');setVariantForm(null);await loadAdminVariants();
 }
 const renderItem=p=><ProductCard key={p.id} p={p} photos={photosFor(p)} saved={wish.includes(p.id)} compared={compareIds.includes(p.id)} onWish={toggleWish} onCompare={compare} onQuick={openQuick} onDetail={p=>go('detail',p)}/>;
 return <><div className="topline">VIVILENS STUDIO ✳ YOUR EYES, YOUR MOOD · K-BEAUTY COLOR LENSES</div><header><div className="header-inner"><button className="plain mobile-only" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Menu"><Menu/></button><button className="logo" onClick={()=>go('home')}>VIVILENS<span>YOUR EYES, YOUR MOOD</span></button><nav className={mobileOpen?'open':''}><button onClick={()=>go('home')}>Trang chủ</button><button onClick={()=>{resetFilters();go('catalog')}}>Tất cả lens</button><button onClick={()=>chooseColor('Brown')}>Lens Brown</button><button onClick={()=>chooseColor('Gray')}>Lens Gray</button><button onClick={()=>chooseColor('Pink')}>Lens Pink</button><button onClick={()=>chooseColor('Blue')}>Lens Blue</button><button onClick={startQuiz}>Tìm màu hợp bạn ✧</button><button onClick={()=>chooseColor('Favorites')}>Yêu thích</button>{admin&&<button onClick={()=>go('admin')}>Admin</button>}</nav><div className="head-actions"><button aria-label="Yêu thích" onClick={()=>chooseColor('Favorites')}><Heart size={21}/>{wish.length>0&&<span className="counter">{wish.length}</span>}</button><button aria-label="Tài khoản" onClick={()=>user?go('account'):setAuthOpen(true)}><UserRound size={21}/></button><button aria-label="Giỏ hàng" onClick={()=>setCartOpen(true)}><ShoppingBag size={21}/>{count>0&&<span className="counter">{count}</span>}</button></div></div></header>
 {!configured&&<div className="demo-strip">CHẾ ĐỘ DEMO — Sản phẩm và giá chỉ minh họa. Kết nối Supabase để dùng dữ liệu thật.</div>}
 {page==='home'&&<>
<BrandHero onCatalog={()=>{resetFilters();go('catalog')}} onQuiz={startQuiz} onProduct={slug=>{const p=products.find(p=>p.slug===slug);if(p)openQuick(p);else notify('Ảnh đang tải, bạn có thể xem bộ sưu tập trước nhé.')}}/>
<section className="benefits"><div><ShieldCheck/><span>Thông tin lens rõ ràng</span></div><div><Heart/><span>Chọn màu theo phong cách</span></div><div><ShoppingBag/><span>Giỏ hàng đơn giản</span></div></section>
<QuizInvite onStart={startQuiz}/><RealColorCollection onColor={chooseColor}/>
<section className="section featured-section"><div className="section-heading"><div><span className="eyebrow">02 / THE VIVILENS EDIT</span><h2>Vivi chọn, <em>bạn thử mood.</em></h2><p>Ảnh thật, màu thật từ bộ sưu tập VIVILENS.</p></div><button className="textlink" onClick={()=>go('catalog')}>Xem tất cả <ArrowRight size={17}/></button></div><div className="products-grid">{([...products].sort((a,b)=>Number(hasPhoto(b))-Number(hasPhoto(a))||Number(b.featured)-Number(a.featured)).slice(0,4)).map(renderItem)}</div>{loading&&<p className="muted">Đang tải sản phẩm...</p>}</section>
<RealMoodEditorial onColor={chooseColor}/><RealPinkFeature onColor={chooseColor}/>
<section className="service-note section"><span className="eyebrow">A LITTLE REMINDER / VIVILENS</span><p>Chọn phong cách bạn yêu thích, đồng thời luôn sử dụng và chăm sóc lens theo hướng dẫn phù hợp.</p><span>BEAUTY WITH CARE ✦</span></section>
 </>}
 {page==='catalog'&&<main className="section catalog"><span className="eyebrow">VIVILENS / COLOR LENS COLLECTION</span><h1>Chọn màu lens dành cho bạn.</h1><p className="muted">Tự nhiên, trong trẻo hay nổi bật — khám phá màu lens hợp với phong cách của bạn. <strong>220.000đ / cặp 2 chiếc.</strong></p><QuizInvite onStart={startQuiz} compact/><div className="filter-row"><div className="chips">{['All',...Array.from(new Set(products.map(p=>p.color))).sort((a,b)=>a.localeCompare(b)), 'Favorites'].map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c==='All'?'Tất cả':c==='Favorites'?'♡ Yêu thích':c}</button>)}</div><label className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên lens..."/></label></div><div className="catalog-controls"><label>Chu kỳ sử dụng <select value={period} onChange={e=>setPeriod(e.target.value)}><option value="All">Tất cả</option>{['1 ngày','3 tháng','6 tháng'].map(p=><option key={p}>{p}</option>)}</select></label><label>Sắp xếp <select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Gợi ý cho bạn</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option><option value="name">Tên A–Z</option></select></label></div><div className="vv-style-filters" aria-label="Lọc theo phong cách"><span>PHỐI THEO PHONG CÁCH</span>{[{id:"All",label:"Tất cả phong cách"},...styleOptions].map(option=><button key={option.id} className={style===option.id?"active":""} aria-pressed={style===option.id} onClick={()=>{setStyle(option.id);discoveryEvent("style_filter",{style:option.id})}}>{option.label}</button>)}</div><p className="vv-style-note">Gợi ý phối makeup theo nhóm màu. Xem ảnh thật của từng mẫu để chọn look bạn thích.</p><div className="vv-results-summary"><span aria-live="polite">{loading?"Đang tìm mẫu…":available.length+" mẫu dành cho lựa chọn của bạn"}</span>{(style!=="All"||category!=="All"||period!=="All"||query)&&<button onClick={resetFilters}>Xóa bộ lọc</button>}</div>{loading?<p>Đang tải sản phẩm...</p>:<div id="vv-catalog-results" className="products-grid">{catalogItems.map(renderItem)}</div>}{!loading&&catalogPages>1&&<nav className="vv-catalog-pagination" aria-label="Trang sản phẩm"><button disabled={catalogPage<=1} onClick={()=>moveCatalogPage(catalogPage-1)}>← Trước</button><span>Trang {catalogPage} / {catalogPages}</span><button disabled={catalogPage>=catalogPages} onClick={()=>moveCatalogPage(catalogPage+1)}>Tiếp →</button></nav>}{!loading&&!available.length&&<div className="vv-consult-card"><h3>Mình thử một mood khác nhé?</h3><p>Chưa có mẫu khớp các bộ lọc hiện tại. Bạn có thể xóa bộ lọc hoặc để Vivi gợi ý.</p><button className="secondary" onClick={resetFilters}>Xóa bộ lọc</button> <button className="primary" onClick={startQuiz}>Tìm màu hợp tôi</button></div>}</main>}
 {page==='detail'&&selected&&<main className="section detail vv-detail-page">
 <div className="vv-detail-breadcrumb"><button className="back" onClick={()=>go('catalog')}>← Bộ sưu tập</button><span aria-hidden="true">/</span><span>{selected.name}</span></div>
 <div className="vv-detail-gallery-header"><span>VIVILENS · YOUR EYES, YOUR MOOD</span><span>Chạm để xem ảnh lớn</span></div><div className="detail-grid vv-detail-grid">
  <ProductGallery product={selected} images={photosFor(selected)}/>
  <div className="vv-detail-info">
   <div className="vv-detail-heading">
    <div><span className="eyebrow">VIVILENS COLLECTION</span><h1>{selected.name}</h1></div>
    <button className="detail-heart" onClick={()=>toggleWish(selected.id)} aria-label={wish.includes(selected.id)?'Bỏ yêu thích':'Thêm yêu thích'} title={wish.includes(selected.id)?'Đã yêu thích':'Yêu thích'}><Heart size={20} fill={wish.includes(selected.id)?"currentColor":"none"}/></button>
   </div>
   <div className="detail-price">{Number(selected.price)>0?<><b>{money(boxPrice(selected))}</b> <span>/ hộp 2 chiếc · {money(Number(selected.price)/2)} / chiếc</span></>:<span className="vv-pending-price">Giá đang cập nhật</span>}</div>
   <div className="vv-detail-quickfacts"><span>{selected.color}</span>{selected.diameter&&selected.diameter!=='Chưa xác nhận'&&<span>{selected.diameter} mm</span>}{selected.wear_period&&selected.wear_period!=='Chưa xác nhận'&&<span>{selected.wear_period}</span>}</div>
   <div className="vv-quick-tools"><button onClick={()=>compare(selected.id)} aria-pressed={compareIds.includes(selected.id)}><Scale size={16}/>{compareIds.includes(selected.id)?"Đã chọn so sánh":"So sánh với mẫu khác"}</button></div>
   <PurchasePanel product={selected} variants={variants} cart={cart} canShop={canShopProduct(selected)} onAdd={addFromPanel} onConsult={consult} onWish={toggleWish} isSaved={wish.includes(selected.id)}/>
   <details className="vv-product-facts">
    <summary>Chi tiết sản phẩm &amp; hướng dẫn <ChevronRight size={17}/></summary>
    <div className="vv-product-facts-body">
     <p>{selected.description}</p>
     <div className="specs"><span>Màu sắc <b>{selected.color}</b></span>{selected.diameter&&selected.diameter!=='Chưa xác nhận'&&<span>Đường kính <b>{selected.diameter} mm</b></span>}{selected.wear_period&&selected.wear_period!=='Chưa xác nhận'&&<span>Chu kỳ <b>{selected.wear_period}</b></span>}</div>
     <small>Lưu ý: màu lens thực tế có thể khác màn hình. Sử dụng theo hướng dẫn phù hợp và thông tin chuyên môn.</small>
    </div>
   </details>
  </div>
 </div>
 </main>}
 {(page==='notfound'||(page==='detail'&&!selected&&!loading))&&<main className="section account" role="main"><span className="eyebrow">404 / VIVILENS</span><h1>Không tìm thấy trang</h1><p className="muted">Sản phẩm hoặc trang bạn tìm kiếm hiện không khả dụng.</p><button className="primary" onClick={()=>go('catalog')}>KHÁM PHÁ BỘ SƯU TẬP <ArrowRight size={17}/></button></main>}
 {page==='detail'&&!selected&&loading&&<main className="section account" aria-live="polite">Đang tải thông tin sản phẩm...</main>}
 {page==='account'&&<main className="section account"><span className="eyebrow">MY VIVILENS</span><h1>Tài khoản của tôi</h1>{user?<div className="account-card"><UserRound/><div><b>{user.email}</b><p>Mã tài khoản: {user.id.slice(0,8)}…</p></div><button className="secondary" onClick={logout}><LogOut size={17}/> Đăng xuất</button></div>:<button className="primary" onClick={()=>setAuthOpen(true)}>Đăng nhập</button>}{admin&&<button className="primary" onClick={()=>go('admin')}>Vào trang quản trị</button>}<p className="muted">Lịch sử đơn hàng và checkout sẽ được bổ sung ở phiên bản V1.1.</p></main>}
 {page==='admin'&&<main className="section admin"><span className="eyebrow">VIVILENS MANAGEMENT</span><h1>Admin Dashboard</h1>{!user||!admin?<p>Bạn không có quyền quản trị. Hãy đăng nhập bằng tài khoản đã được cấp quyền trong bảng admin_users.</p>:<><div className="admin-summary"><div><Package/> <strong>{adminProducts.length}</strong><span>Tổng mẫu lens</span></div><div><ShoppingBag/><strong>{adminProducts.filter(p=>p.active).length}</strong><span>Đang bán</span></div><div><ImagePlus/> <strong>{adminProducts.filter(p=>!p.active).length}</strong><span>Bản nháp cần hoàn thiện</span></div></div>
 <div className="vv-admin-toolbar">
  <button className="primary" onClick={()=>startEdit()}><Plus size={18}/> Thêm sản phẩm</button>
  <label><span>Tìm tên mẫu</span><input value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} placeholder="Milk Tea, Fairy, Blue..." /></label>
  <label><span>Trạng thái</span><select value={adminStatus} onChange={e=>setAdminStatus(e.target.value)}><option value="draft">Bản nháp</option><option value="live">Đang bán</option><option value="all">Tất cả</option></select></label>
  <label><span>Nhóm màu</span><select value={adminColor} onChange={e=>setAdminColor(e.target.value)}><option value="All">Tất cả màu</option>{Array.from(new Set(adminProducts.map(p=>p.color))).sort().map(c=><option key={c} value={c}>{c}</option>)}</select></label>
 </div>
 <p className="vv-admin-note">{adminFiltered.length} mẫu phù hợp · Trang {adminPage}/{adminPageCount}. Mẫu Drive mới được giữ ở bản nháp cho đến khi đủ ảnh, giá, thông số và tồn kho thật.</p>
 <div className="admin-table"><div className="admin-row heading"><span>Sản phẩm</span><span>Giá</span><span>Tồn kho</span><span>Thao tác</span></div>
 {adminVisible.map(p=><div className="admin-row" key={p.id}>
  <span><b>{p.name}</b><small className={p.active?'vv-status-live':'vv-status-draft'}>{p.active?'Đang bán':'Bản nháp'} · {p.color}</small></span>
  <span>{p.price>0?money(p.price):'Chưa có giá'}</span>
  <span>{p.stock>0?p.stock:'Chưa nhập'}</span>
  <span className="vv-admin-actions"><button onClick={()=>startEdit(p)}>Sửa</button><button onClick={()=>setMediaProduct(p)}>Ảnh {galleryImages.filter(img=>img.product_id===p.id).length}/5</button><button onClick={()=>{setVariantProduct(p);setVariantForm(null);loadAdminVariants()}}>SKU {adminVariants.filter(v=>v.product_id===p.id).length}</button>{p.active&&<button onClick={()=>deactivate(p.id)}>Ẩn</button>}</span>
 </div>)}
 </div>
 <nav className="vv-catalog-pagination" aria-label="Trang quản lý sản phẩm"><button disabled={adminPage<=1} onClick={()=>setAdminPage(v=>v-1)}>← Trước</button><span>Trang {adminPage} / {adminPageCount}</span><button disabled={adminPage>=adminPageCount} onClick={()=>setAdminPage(v=>v+1)}>Tiếp →</button></nav><InquiryInbox supabase={supabase} notify={notify} onProduct={id=>{const p=adminProducts.find(p=>p.id===id);if(p)go("detail",p)}}/></>}{adminForm&&<div className="overlay" onClick={()=>setAdminForm(null)}><div className="modal admin-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setAdminForm(null)}><X/></button><h2>{adminForm.id?'Sửa sản phẩm':'Thêm sản phẩm'}</h2><form onSubmit={saveProduct} className="product-form">{[['name','Tên sản phẩm'],['slug','Slug (duy nhất, không dấu)'],['image_url','URL ảnh sản phẩm'],['price','Giá (VND)'],['stock','Tồn kho'],['diameter','Đường kính (mm)'],['wear_period','Chu kỳ sử dụng']].map(([key,label])=><label key={key}>{label}<input required value={adminForm[key]??''} type={['price','stock'].includes(key)?'number':'text'} min={['price','stock'].includes(key)?0:undefined} onChange={e=>setAdminForm({...adminForm,[key]:e.target.value})}/></label>)}<label>Kiểu tồn kho<select value={adminForm.inventory_mode||'product'} onChange={e=>setAdminForm({...adminForm,inventory_mode:e.target.value})}><option value="product">Theo hộp nguyên bản (cũ)</option><option value="variant">Đóng hộp 2 chiếc từ SKU từng mắt</option></select></label><label>Màu<select value={adminForm.color} onChange={e=>setAdminForm({...adminForm,color:e.target.value})}>{['Brown','Gray','Pink','Blue','Green','Violet','Black','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label>Mô tả<textarea value={adminForm.description||''} onChange={e=>setAdminForm({...adminForm,description:e.target.value})}/></label><label className="check"><input type="checkbox" checked={!!adminForm.catalog_visible} onChange={e=>setAdminForm({...adminForm,catalog_visible:e.target.checked})}/> Hiển thị trong bộ sưu tập (có thể xem trước dù chưa bán)</label><label className="check"><input type="checkbox" checked={adminForm.active} onChange={e=>setAdminForm({...adminForm,active:e.target.checked,catalog_visible:e.target.checked?true:adminForm.catalog_visible})}/> Đang bán (cần đủ giá, ảnh, tồn kho và thông số)</label><label className="check"><input type="checkbox" checked={adminForm.featured} onChange={e=>setAdminForm({...adminForm,featured:e.target.checked})}/> Nổi bật</label><button className="primary wide">Lưu sản phẩm</button></form></div></div>}{mediaProduct&&<div className="overlay" onClick={()=>setMediaProduct(null)}><div className="modal media-modal" role="dialog" aria-modal="true" aria-label={"Quản lý ảnh "+mediaProduct.name} onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setMediaProduct(null)} aria-label="Đóng quản lý ảnh"><X/></button><span className="eyebrow">VIVILENS / PRODUCT MEDIA</span><h2>Quản lý ảnh · {mediaProduct.name}</h2><MediaEditor product={mediaProduct} supabase={supabase} notify={notify} onChanged={()=>{loadProducts();loadAdminProducts()}}/></div></div>}</main>}
 {page!=="admin"&&<CompareTray products={products.filter(p=>compareIds.includes(p.id))} onRemove={compare} onOpen={()=>{setCompareOpen(true);discoveryEvent("compare_open",{count:compareIds.length})}} onClear={()=>setCompareIds([])}/>}
 {quizOpen&&<LensQuiz products={products} onClose={()=>setQuizOpen(false)} onView={openQuick} onWish={toggleWish} wish={wish}/>}
 {quickProduct&&<QuickView product={quickProduct} photos={photosFor(quickProduct)} variants={variants} cart={cart} canShop={canShopProduct(quickProduct)} onClose={()=>setQuickProduct(null)} onDetail={p=>go("detail",p)} onWish={toggleWish} wish={wish} onCompare={compare} compared={compareIds.includes(quickProduct.id)} onConsult={consult} onAdd={addFromPanel}/>}
 {compareOpen&&<CompareDialog products={products.filter(p=>compareIds.includes(p.id))} onClose={()=>setCompareOpen(false)} onRemove={compare} onView={openQuick} onConsult={consult}/>}
 {inquiryProduct&&<InquiryDialog product={inquiryProduct} supabase={supabase} onClose={()=>setInquiryProduct(null)}/>}
 <footer><div className="footer-main"><div><h2>VIVILENS</h2><p>Your eyes, your mood.<br/>Make every glance your own.</p></div><div><b>KHÁM PHÁ</b><button onClick={startQuiz}>Tìm màu lens hợp bạn ✧</button><button onClick={()=>{resetFilters();go('catalog')}}>Tất cả sản phẩm</button><button onClick={()=>chooseColor('Brown')}>Lens Brown</button><button onClick={()=>chooseColor('Gray')}>Lens Gray</button><button onClick={()=>chooseColor('Favorites')}>Yêu thích</button></div><div><b>THÔNG TIN</b><p>Hướng dẫn sử dụng và bảo quản lens</p><p>Thông tin giao hàng, đổi trả: đang cập nhật</p></div></div><div className="footer-bottom">© 2026 VIVILENS. All rights reserved. <span>Made with ♡ for your eyes</span></div></footer>
 {variantProduct&&<div className="overlay" onClick={()=>{setVariantProduct(null);setVariantForm(null)}}><div className="modal media-modal" role="dialog" aria-modal="true" aria-label={'SKU '+variantProduct.name} onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>{setVariantProduct(null);setVariantForm(null)}} aria-label="Đóng"><X/></button><span className="eyebrow">VIVILENS / SKU INVENTORY</span><h2>Biến thể · {variantProduct.name}</h2><p className="muted">Chỉ nhập mã SKU, độ cận, quy cách và tồn kho đã xác minh. Không dùng số lượng minh họa.</p><div className="variant-list">{adminVariants.filter(v=>v.product_id===variantProduct.id).map(v=><div className="variant-row" key={v.id}><span><b>{v.sku}</b><small>{formatPower(v.power)} độ · {v.unit_label} · tồn {v.stock} {v.active?'':'(Ẩn)'}</small></span><button className="secondary" onClick={()=>setVariantForm({...v,price_override:v.price_override??''})}>Sửa</button></div>)}</div>{!variantForm?<button className="primary" onClick={()=>startVariant(variantProduct)}>Thêm SKU</button>:<form className="product-form" onSubmit={saveVariant}><label>SKU<input required value={variantForm.sku} onChange={e=>setVariantForm({...variantForm,sku:e.target.value})}/></label><label>Độ cận (D)<input required type="number" step="0.25" value={variantForm.power} onChange={e=>setVariantForm({...variantForm,power:e.target.value})}/></label><label>Đơn vị tồn kho SKU (phải là “1 chiếc”)<input required value={variantForm.unit_label} onChange={e=>setVariantForm({...variantForm,unit_label:e.target.value})}/></label><label>Tồn kho SKU (số chiếc lẻ)<input type="number" required min="0" value={variantForm.stock} onChange={e=>setVariantForm({...variantForm,stock:e.target.value})}/></label><label>Giá riêng SKU (không áp dụng; giá hộp lấy từ sản phẩm)<input type="number" disabled min="0" value={variantForm.price_override??''} onChange={e=>setVariantForm({...variantForm,price_override:e.target.value})}/></label><label className="check"><input type="checkbox" checked={variantForm.active} onChange={e=>setVariantForm({...variantForm,active:e.target.checked})}/> Đang bán</label><button className="primary wide">Lưu SKU</button><button className="secondary" type="button" onClick={()=>setVariantForm(null)}>Hủy</button></form>}</div></div>}
 <div className="mobile-bottom-nav" aria-label="Điều hướng nhanh"><button className={page==='home'?'active':''} onClick={()=>go('home')}><Sparkles size={19}/><span>Trang chủ</span></button><button className={page==='catalog'&&category!=='Favorites'?'active':''} onClick={()=>{resetFilters();go('catalog')}}><Search size={19}/><span>Khám phá</span></button><button className={page==='catalog'&&category==='Favorites'?'active':''} onClick={()=>chooseColor('Favorites')}><Heart size={19}/><span>Yêu thích</span></button><button className={page==='account'||page==='admin'?'active':''} onClick={()=>user?go('account'):setAuthOpen(true)}><UserRound size={19}/><span>Tài khoản</span></button><button onClick={()=>setCartOpen(true)}><ShoppingBag size={19}/><span>Giỏ ({count})</span></button></div>
 {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-top"><h2>Giỏ hàng <span>({count})</span></h2><button className="plain" onClick={()=>setCartOpen(false)} aria-label="Đóng giỏ hàng"><X/></button></div><div className="cart-lines">{cartDetails.length===0?<div className="empty"><ShoppingBag size={50}/><p>Giỏ hàng của bạn đang trống</p><button className="secondary" onClick={()=>{setCartOpen(false);go('catalog')}}>Khám phá sản phẩm</button></div>:cartDetails.map(c=><div className="cart-item" key={c.product.inventory_mode==='variant'?pairCartKey(c.id,c.leftVariantId,c.rightVariantId):legacyPairKey(c.id,c.leftPower,c.rightPower)}> <img src={c.product.image_url} alt={c.product.name}/><div className="cart-item-body"><b>{c.product.name}</b><small>{c.product.color} · {c.product.diameter}mm · 1 hộp = 2 chiếc {c.product.inventory_mode==='variant'&&c.left&&c.right?' · Trái '+formatPower(c.left.power)+' / Phải '+formatPower(c.right.power):' · Trái '+formatPower(c.leftPower)+' / Phải '+formatPower(c.rightPower)}</small><strong>{money(boxPrice(c.product))} / hộp</strong><div className="qty"><button onClick={()=>setQty(c.id,c.qty-1,c.leftVariantId,c.rightVariantId,c.leftPower,c.rightPower)}><Minus size={15}/></button>{c.qty}<button onClick={()=>setQty(c.id,c.qty+1,c.leftVariantId,c.rightVariantId,c.leftPower,c.rightPower)}><Plus size={15}/></button><button className="remove" aria-label={"Xóa "+c.product.name+" khỏi giỏ"} onClick={()=>setQty(c.id,0,c.leftVariantId,c.rightVariantId,c.leftPower,c.rightPower)}><Trash2 size={15}/></button></div></div></div>)}</div><div className="drawer-bottom"><div className="subtotal"><b>Tạm tính</b><strong>{money(total)}</strong></div><button className="primary wide" disabled>THANH TOÁN — SẮP RA MẮT</button><p>V1.0 chỉ hỗ trợ giỏ hàng. Tạo đơn hàng và thanh toán sẽ được bổ sung trong V1.1.</p></div></aside></div>}
 {authOpen&&<div className="overlay" onClick={()=>setAuthOpen(false)}><div className="modal auth-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setAuthOpen(false)}><X/></button><span className="eyebrow">WELCOME TO VIVILENS</span><h2>{authMode==='login'?'Đăng nhập':'Tạo tài khoản'}</h2><p>Thế giới lens yêu thích đang chờ bạn.</p><form onSubmit={authSubmit}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required autoComplete="email" placeholder="you@example.com"/></label><label>Mật khẩu<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required minLength={6} autoComplete={authMode==='login'?'current-password':'new-password'} placeholder="Ít nhất 6 ký tự"/></label><button className="primary wide" disabled={authBusy}>{authBusy?'Đang xử lý...':authMode==='login'?'ĐĂNG NHẬP':'ĐĂNG KÝ'}</button></form><p className="switch">{authMode==='login'?'Chưa có tài khoản?':'Đã có tài khoản?'} <button onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login'?'Đăng ký ngay':'Đăng nhập'}</button></p></div></div>}
 {notice&&<div role="status" className="toast">{notice}</div>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);
