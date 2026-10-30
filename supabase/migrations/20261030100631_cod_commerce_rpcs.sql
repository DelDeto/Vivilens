-- Server-only commerce RPCs; caller permissions are revoked in this migration.
create function public.commerce_rate(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_hits integer;v_window timestamptz;
begin
 if length(p_key)>160 or p_limit not between 1 and 1000 or p_seconds not between 30 and 86400 then raise exception 'INVALID_RATE';end if;
 v_window:=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
 delete from vivi_private.rate_limits where expires_at<now();
 insert into vivi_private.rate_limits(key,window_start,expires_at,hits) values(p_key,v_window,v_window+make_interval(secs=>p_seconds),1)
 on conflict(key,window_start) do update set hits=vivi_private.rate_limits.hits+1 returning hits into v_hits;
 return v_hits<=p_limit;
end $$;

create function public.commerce_power_valid(p_power numeric)
returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(p_power=0 or (p_power between -7 and -1 and mod(abs(p_power)*100,25)=0) or p_power in (-7.5,-8),false)
$$;

create function public.commerce_quote(p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb;p public.products%rowtype;l public.product_variants%rowtype;r public.product_variants%rowtype;
 q integer;lp numeric;rp numeric;total_boxes integer:=0;subtotal numeric:=0;normalized jsonb:='[]';demand record;s jsonb;fee numeric;result jsonb;
begin
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'INVALID_CART';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item->'quantity')<>'number' or (item->>'quantity') !~ '^[0-9]{1,2}$' then raise exception 'INVALID_QUANTITY';end if;
  q:=(item->>'quantity')::integer;if q not between 1 and 10 then raise exception 'INVALID_QUANTITY';end if;
  total_boxes:=total_boxes+q;if total_boxes>20 then raise exception 'CART_LIMIT';end if;
  select * into p from public.products where id=(item->>'product_id')::uuid;
  if not found or not p.active or p.price<=0 or p.image_url!~'^https://' or p.image_url~'(unsplash.com|placehold.co)' then raise exception 'PRODUCT_UNAVAILABLE';end if;
  if p.inventory_mode='variant' then
   select * into l from public.product_variants where id=(item->>'left_variant_id')::uuid and product_id=p.id and active and unit_label='1 chiếc';
   if not found then raise exception 'INVALID_LEFT_POWER';end if;
   select * into r from public.product_variants where id=(item->>'right_variant_id')::uuid and product_id=p.id and active and unit_label='1 chiếc';
   if not found then raise exception 'INVALID_RIGHT_POWER';end if;
   lp:=l.power;rp:=r.power;
  else
   lp:=(item->>'left_power')::numeric;rp:=(item->>'right_power')::numeric;
  end if;
  if not public.commerce_power_valid(lp) or not public.commerce_power_valid(rp) then raise exception 'INVALID_POWER';end if;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('product_id',p.id,'product_name',p.name,'product_slug',p.slug,'image_url',p.image_url,'inventory_mode',p.inventory_mode,'left_variant_id',case when p.inventory_mode='variant' then l.id else null end,'right_variant_id',case when p.inventory_mode='variant' then r.id else null end,'left_power',lp,'right_power',rp,'quantity',q,'box_price',p.price));
  subtotal:=subtotal+p.price*q;
 end loop;
 for demand in select (x->>'product_id')::uuid id,sum((x->>'quantity')::integer) units from jsonb_array_elements(normalized) x where x->>'inventory_mode'='product' group by 1 loop
  if (select stock from public.products where id=demand.id)<demand.units then raise exception 'OUT_OF_STOCK';end if;
 end loop;
 for demand in select id,sum(units) units from (
  select (x->>'left_variant_id')::uuid id,(x->>'quantity')::integer units from jsonb_array_elements(normalized)x where x->>'inventory_mode'='variant'
  union all select (x->>'right_variant_id')::uuid,(x->>'quantity')::integer from jsonb_array_elements(normalized)x where x->>'inventory_mode'='variant'
 )v group by id loop
  if (select stock from public.product_variants where id=demand.id)<demand.units then raise exception 'OUT_OF_STOCK';end if;
 end loop;
 select data into s from public.store_settings where id=true;
 fee:=case when s->>'shipping_mode'='fixed' then (s->>'shipping_fee')::numeric else null end;
 result:=jsonb_build_object('items',normalized,'subtotal',subtotal,'shipping_mode',s->>'shipping_mode','shipping_fee',fee,'total',subtotal+fee,'currency','VND','boxes',total_boxes);
 return result||jsonb_build_object('quote_hash',encode(extensions.digest(convert_to(result::text,'UTF8'),'sha256'),'hex'));
end $$;

create function public.commerce_create_order(p_request_id uuid,p_receipt_token text,p_customer jsonb,p_items jsonb,p_quote_hash text,p_user_id uuid,p_ip_key text,p_phone_key text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.orders%rowtype;o public.orders%rowtype;quote jsonb;item jsonb;demand record;v_id uuid;v_phone text;token_hash text;
begin
 if p_receipt_token is null or p_receipt_token!~'^[0-9a-f]{64}$' then raise exception 'INVALID_RECEIPT';end if;
 token_hash:=encode(extensions.digest(p_receipt_token,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into existing from public.orders where request_id=p_request_id;
 if found then
  if existing.receipt_hash<>token_hash then raise exception 'INVALID_RECEIPT';end if;
  return jsonb_build_object('code',existing.code,'id',existing.id,'replayed',true);
 end if;
 if not public.commerce_rate('order-ip:'||p_ip_key,5,900) or not public.commerce_rate('order-phone:'||p_phone_key,3,1800) then raise exception 'RATE_LIMIT';end if;
 v_phone:=regexp_replace(coalesce(p_customer->>'phone',''),'[\s().-]','','g');
 if char_length(btrim(coalesce(p_customer->>'name',''))) not between 2 and 80 or v_phone!~'^(0[0-9]{9}|\+84[0-9]{9})$' or char_length(btrim(coalesce(p_customer->>'address',''))) not between 10 and 500 or char_length(btrim(coalesce(p_customer->>'city',''))) not between 2 and 80 or char_length(coalesce(p_customer->>'note',''))>1000 or (p_customer->>'consent')::boolean is distinct from true then raise exception 'INVALID_CUSTOMER';end if;
 -- Lock parent products then selected SKUs in deterministic order, before pricing or stock reads.
 perform id from public.products where id in(select (x->>'product_id')::uuid from jsonb_array_elements(p_items)x) order by id for update;
 perform id from public.product_variants where id in(
  select (x->>'left_variant_id')::uuid from jsonb_array_elements(p_items)x where x->>'left_variant_id' is not null
  union select (x->>'right_variant_id')::uuid from jsonb_array_elements(p_items)x where x->>'right_variant_id' is not null
 ) order by id for update;
 quote:=public.commerce_quote(p_items);
 if quote->>'quote_hash' is distinct from p_quote_hash then raise exception 'QUOTE_CHANGED';end if;
 insert into public.orders(code,request_id,receipt_hash,customer_user_id,customer_name,phone,address,city,note,consent,subtotal,shipping_fee,shipping_mode)
 values('VV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_request_id,token_hash,p_user_id,btrim(p_customer->>'name'),v_phone,btrim(p_customer->>'address'),btrim(p_customer->>'city'),coalesce(p_customer->>'note',''),true,(quote->>'subtotal')::numeric,(quote->>'shipping_fee')::numeric,quote->>'shipping_mode') returning * into o;
 for item in select value from jsonb_array_elements(quote->'items') loop
  insert into public.order_items(order_id,product_id,product_name,product_slug,image_url,inventory_mode,left_variant_id,right_variant_id,left_power,right_power,quantity,box_price)
  values(o.id,(item->>'product_id')::uuid,item->>'product_name',item->>'product_slug',item->>'image_url',item->>'inventory_mode',(item->>'left_variant_id')::uuid,(item->>'right_variant_id')::uuid,(item->>'left_power')::numeric,(item->>'right_power')::numeric,(item->>'quantity')::integer,(item->>'box_price')::numeric);
 end loop;
 insert into vivi_private.order_inventory(order_id,product_id,variant_id,units)
 select o.id,product_id,null,sum(quantity)::integer from public.order_items where order_id=o.id and inventory_mode='product' group by product_id;
 insert into vivi_private.order_inventory(order_id,product_id,variant_id,units)
 select o.id,product_id,variant_id,sum(units)::integer from (
  select product_id,left_variant_id variant_id,quantity units from public.order_items where order_id=o.id and inventory_mode='variant'
  union all select product_id,right_variant_id,quantity from public.order_items where order_id=o.id and inventory_mode='variant'
 )v group by product_id,variant_id;
 for demand in select * from vivi_private.order_inventory where order_id=o.id loop
  if demand.variant_id is null then update public.products set stock=stock-demand.units where id=demand.product_id;
  else update public.product_variants set stock=stock-demand.units where id=demand.variant_id;end if;
 end loop;
 insert into public.order_events(order_id,status,note) values(o.id,'pending','Khách gửi đơn COD; chờ cửa hàng xác nhận.');
 return jsonb_build_object('code',o.code,'id',o.id,'replayed',false);
end $$;

create function public.commerce_transition_order(p_order_id uuid,p_actor_id uuid,p_status text,p_details jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.orders%rowtype;demand record;fee numeric;
begin
 if p_actor_id is null or not exists(select 1 from public.admin_users where user_id=p_actor_id) then raise exception 'ADMIN_REQUIRED';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'ORDER_NOT_FOUND';end if;
 if o.status=p_status then return jsonb_build_object('code',o.code,'status',o.status,'replayed',true);end if;
 if not ((o.status='pending' and p_status in ('confirmed','cancelled')) or (o.status='confirmed' and p_status in ('shipped','cancelled')) or (o.status='shipped' and p_status in ('delivered','returned')) or (o.status='delivered' and p_status='returned')) then raise exception 'INVALID_TRANSITION';end if;
 if p_status='confirmed' then
  if (p_details->>'customer_confirmed')::boolean is distinct from true then raise exception 'CUSTOMER_CONFIRMATION_REQUIRED';end if;
  fee:=coalesce((p_details->>'shipping_fee')::numeric,o.shipping_fee);
  if fee is null or fee<0 or fee>1000000 or fee<>trunc(fee) then raise exception 'INVALID_SHIPPING_FEE';end if;
  update public.orders set shipping_fee=fee,customer_confirmed_at=now() where id=o.id;
 end if;
 if p_status='shipped' then
  if o.shipping_fee is null or o.customer_confirmed_at is null then raise exception 'CUSTOMER_CONFIRMATION_REQUIRED';end if;
  if char_length(btrim(coalesce(p_details->>'carrier',''))) not between 2 and 80 or char_length(btrim(coalesce(p_details->>'tracking_code',''))) not between 3 and 100 then raise exception 'TRACKING_REQUIRED';end if;
  update public.orders set carrier=btrim(p_details->>'carrier'),tracking_code=btrim(p_details->>'tracking_code') where id=o.id;
 end if;
 if p_status='cancelled' and o.inventory_released_at is null then
  perform p.id from public.products p where p.id in(select product_id from vivi_private.order_inventory where order_id=o.id) order by p.id for update;
  perform v.id from public.product_variants v where v.id in(select variant_id from vivi_private.order_inventory where order_id=o.id) order by v.id for update;
  for demand in select * from vivi_private.order_inventory where order_id=o.id loop
   if demand.variant_id is null then update public.products set stock=stock+demand.units where id=demand.product_id;
   else update public.product_variants set stock=stock+demand.units where id=demand.variant_id;end if;
  end loop;
  update public.orders set inventory_released_at=now() where id=o.id;
 end if;
 -- Returned products are NOT automatically restocked. Merchant verifies resale eligibility separately.
 update public.orders set status=p_status,updated_at=now() where id=o.id;
 insert into public.order_events(order_id,status,note,actor_id) values(o.id,p_status,left(coalesce(p_details->>'note',''),1000),p_actor_id);
 return jsonb_build_object('code',o.code,'status',p_status);
end $$;

create function public.commerce_inventory_update(p_actor_id uuid,p_product_id uuid,p_mode text,p_stock integer,p_expected_stock integer,p_rows jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare p public.products%rowtype;v public.product_variants%rowtype;entry jsonb;v_power numeric;v_units integer;
begin
 if p_actor_id is null or not exists(select 1 from public.admin_users where user_id=p_actor_id) then raise exception 'ADMIN_REQUIRED';end if;
 select * into p from public.products where id=p_product_id for update;
 if not found or p_mode not in ('product','variant') or p_stock not between 0 and 1000000 then raise exception 'INVALID_INVENTORY';end if;
 if p.stock is distinct from p_expected_stock then raise exception 'STOCK_CHANGED';end if;
 if p.inventory_mode<>p_mode and exists(select 1 from vivi_private.order_inventory i join public.orders o on o.id=i.order_id where i.product_id=p.id and o.status in ('pending','confirmed','shipped')) then raise exception 'OPEN_ORDER_INVENTORY';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>28 then raise exception 'INVALID_INVENTORY';end if;
 if (select count(*)<>count(distinct (x->>'power')::numeric) from jsonb_array_elements(p_rows)x) then raise exception 'INVALID_POWER';end if;
 for entry in select value from jsonb_array_elements(p_rows) order by (value->>'power')::numeric loop
  v_power:=(entry->>'power')::numeric;v_units:=(entry->>'stock')::integer;
  if not public.commerce_power_valid(v_power) or v_units not between 0 and 1000000 or (entry->>'stock')::numeric<>v_units then raise exception 'INVALID_INVENTORY';end if;
  select * into v from public.product_variants where product_id=p.id and product_variants.power=v_power and unit_label='1 chiếc' for update;
  if found then
   if v.stock is distinct from (entry->>'expected_stock')::integer then raise exception 'STOCK_CHANGED';end if;
   update public.product_variants set stock=v_units where id=v.id;
  else
   if entry->>'expected_stock' is not null then raise exception 'STOCK_CHANGED';end if;
   insert into public.product_variants(product_id,sku,power,unit_label,stock,active) values(p.id,p.slug||'-'||replace(v_power::text,'.','p'),v_power,'1 chiếc',v_units,true);
  end if;
 end loop;
 if p_mode='variant' and not exists(select 1 from public.product_variants where product_id=p.id and active) then raise exception 'SKU_REQUIRED';end if;
 update public.products set stock=p_stock,inventory_mode=p_mode where id=p.id;
 return true;
end $$;

-- Public API callers cannot invoke privileged RPCs or access private stock ledgers.
revoke all on function public.commerce_rate(text,integer,integer) from public,anon,authenticated;
revoke all on function public.commerce_power_valid(numeric) from public,anon,authenticated;
revoke all on function public.commerce_quote(jsonb) from public,anon,authenticated;
revoke all on function public.commerce_create_order(uuid,text,jsonb,jsonb,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.commerce_transition_order(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.commerce_inventory_update(uuid,uuid,text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_rate(text,integer,integer),public.commerce_power_valid(numeric),public.commerce_quote(jsonb),public.commerce_create_order(uuid,text,jsonb,jsonb,text,uuid,text,text),public.commerce_transition_order(uuid,uuid,text,jsonb),public.commerce_inventory_update(uuid,uuid,text,integer,integer,jsonb) to service_role;
