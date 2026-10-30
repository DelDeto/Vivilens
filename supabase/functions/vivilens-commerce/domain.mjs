export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN=/^[0-9a-f]{64}$/;
export const cleanPhone=v=>String(v??'').replace(/[\s().-]/g,'');
export const validPower=v=>(typeof v==='number'||typeof v==='string'&&/^-?\d+(\.\d+)?$/.test(v))&&Number.isFinite(Number(v))&&(Number(v)===0||(Number(v)<=-1&&Number(v)>=-7&&Number.isInteger(Math.abs(Number(v))*4))||[-7.5,-8].includes(Number(v)));
export function fail(code){throw new Error(code)}
function bounded(v,min,max,code){const s=String(v??'').trim();if(s.length<min||s.length>max)fail(code);return s}
export function normalizeCustomer(value={}){
 const phone=cleanPhone(value.phone);if(!/^(0[0-9]{9}|\+84[0-9]{9})$/.test(phone)||value.consent!==true)fail('INVALID_CUSTOMER');
 return {name:bounded(value.name,2,80,'INVALID_CUSTOMER'),phone,address:bounded(value.address,10,500,'INVALID_CUSTOMER'),city:bounded(value.city,2,80,'INVALID_CUSTOMER'),note:bounded(value.note,0,1000,'INVALID_CUSTOMER'),consent:true};
}
export function normalizeItems(items){
 if(!Array.isArray(items)||items.length<1||items.length>20)fail('INVALID_CART');let boxes=0;
 return items.map(item=>{
  if(!item||!UUID.test(item.product_id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10)fail('INVALID_CART');
  boxes+=item.quantity;if(boxes>20)fail('CART_LIMIT');
  const base={product_id:item.product_id,quantity:item.quantity};
  if(item.left_variant_id||item.right_variant_id){if(!UUID.test(item.left_variant_id)||!UUID.test(item.right_variant_id))fail('INVALID_POWER');return {...base,left_variant_id:item.left_variant_id,right_variant_id:item.right_variant_id};}
  if(!validPower(item.left_power)||!validPower(item.right_power))fail('INVALID_POWER');
  return {...base,left_power:Number(item.left_power),right_power:Number(item.right_power)};
 });
}
export function normalizeSettings(input){
 const data={shop_name:'VIVILENS'};
 for(const key of ['contact_phone','contact_email','contact_address','zalo_url','facebook_url','instagram_url','shipping_text','returns_text'])data[key]=bounded(input?.[key],0,key.endsWith('_text')?8000:500,'INVALID_SETTINGS');
 if(data.contact_phone&&!/^(0[0-9]{9}|\+84[0-9]{9})$/.test(cleanPhone(data.contact_phone)))fail('INVALID_SETTINGS');
 if(data.contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email))fail('INVALID_SETTINGS');
 for(const key of ['zalo_url','facebook_url','instagram_url'])if(data[key]){let url;try{url=new URL(data[key])}catch{fail('INVALID_SETTINGS')}if(url.protocol!=='https:'||url.username||url.password)fail('INVALID_SETTINGS');data[key]=url.href;}
 if(!['confirm','fixed'].includes(input?.shipping_mode))fail('INVALID_SETTINGS');
 data.shipping_mode=input.shipping_mode;data.shipping_fee=data.shipping_mode==='fixed'?Number(input.shipping_fee):null;
 if(data.shipping_mode==='fixed'&&(input.shipping_fee===''||input.shipping_fee===null||!Number.isInteger(data.shipping_fee)||data.shipping_fee<0||data.shipping_fee>1000000))fail('INVALID_SETTINGS');
 return data;
}
export const statusLabels={pending:'Chờ xác nhận',confirmed:'Đã xác nhận',shipped:'Đang giao',delivered:'Đã giao',cancelled:'Đã hủy',returned:'Hoàn hàng'};
export const nextStatuses={pending:['confirmed','cancelled'],confirmed:['shipped','cancelled'],shipped:['delivered','returned'],delivered:['returned'],cancelled:[],returned:[]};
export const errorMessages={INVALID_CART:'Giỏ hàng không hợp lệ. Vui lòng chọn lại mẫu lens.',INVALID_QUANTITY:'Số lượng không hợp lệ.',CART_LIMIT:'Mỗi đơn tối đa 20 hộp, mỗi lựa chọn tối đa 10 hộp.',INVALID_POWER:'Vui lòng chọn đủ độ cận hợp lệ cho cả hai mắt.',INVALID_LEFT_POWER:'Độ mắt trái không còn khả dụng.',INVALID_RIGHT_POWER:'Độ mắt phải không còn khả dụng.',PRODUCT_UNAVAILABLE:'Một mẫu trong giỏ hiện chưa mở bán. Vui lòng kiểm tra lại.',OUT_OF_STOCK:'Tồn kho vừa thay đổi, không đủ số lượng bạn chọn. Vui lòng cập nhật giỏ hàng.',INVALID_CUSTOMER:'Vui lòng kiểm tra tên, số điện thoại, địa chỉ và đồng ý xử lý đơn.',QUOTE_CHANGED:'Giá hoặc phí giao hàng vừa thay đổi. Vui lòng xem lại đơn trước khi gửi.',RATE_LIMIT:'Bạn thao tác khá nhanh. Vui lòng thử lại sau ít phút.',AUTH_REQUIRED:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',ADMIN_REQUIRED:'Bạn không có quyền quản trị.',INVALID_RECEIPT:'Không tìm thấy quyền xem đơn. Vui lòng dùng thiết bị đã đặt đơn hoặc liên hệ hỗ trợ.',ORDER_NOT_FOUND:'Không tìm thấy đơn hàng.',INVALID_TRANSITION:'Trạng thái đơn đã thay đổi. Vui lòng tải lại.',CUSTOMER_CONFIRMATION_REQUIRED:'Cần xác nhận sản phẩm, độ cận và tổng COD với khách trước khi giao.',INVALID_SHIPPING_FEE:'Vui lòng nhập phí giao hàng hợp lệ.',TRACKING_REQUIRED:'Vui lòng nhập đơn vị vận chuyển và mã vận đơn.',STOCK_CHANGED:'Tồn kho đã thay đổi từ lúc mở màn hình. Hãy tải lại trước khi lưu.',OPEN_ORDER_INVENTORY:'Chưa thể đổi kiểu tồn kho khi mẫu còn đơn đang xử lý.',SKU_REQUIRED:'Hãy nhập tồn thực tế cho ít nhất một độ trước khi chuyển sang SKU.',INVALID_INVENTORY:'Số lượng tồn kho hoặc độ cận không hợp lệ.',INVALID_SETTINGS:'Vui lòng kiểm tra phí giao hàng và thông tin liên hệ.',REVIEW_NOT_ALLOWED:'Bạn chỉ có thể đánh giá sản phẩm thuộc đơn đã giao.',INVALID_REVIEW:'Vui lòng nhập tên hiển thị, số sao, nội dung và đồng ý công khai đánh giá.',INVALID_SUPPORT:'Vui lòng kiểm tra thông tin yêu cầu hỗ trợ.',SERVICE_UNAVAILABLE:'Chưa kết nối được cửa hàng. Vui lòng thử lại.',REQUEST_TOO_LARGE:'Nội dung gửi vượt giới hạn cho phép.'};
