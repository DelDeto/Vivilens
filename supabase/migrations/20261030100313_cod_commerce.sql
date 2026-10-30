-- COD checkout, immutable order snapshots and merchant operations.
-- All privileged RPCs are SECURITY INVOKER and executable by service_role only.
-- The Edge Function verifies customer receipt capabilities and admin identity.
create schema if not exists vivi_private;
revoke all on schema vivi_private from public,anon,authenticated;
grant usage on schema vivi_private to service_role;

create table public.store_settings (
 id boolean primary key default true check(id),
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
insert into public.store_settings(data) values ('{"shop_name":"VIVILENS","shipping_mode":"confirm","shipping_fee":null,"shipping_text":"Phí giao hàng và thời gian dự kiến được cửa hàng xác nhận theo địa chỉ nhận hàng trước khi gửi. Đơn chỉ được giao sau khi khách đồng ý tổng tiền thu hộ.","returns_text":"","contact_phone":"","contact_email":"","zalo_url":"","facebook_url":"","instagram_url":""}');
alter table public.store_settings enable row level security;
revoke all on public.store_settings from anon,authenticated;
grant select on public.store_settings to anon,authenticated;
grant all on public.store_settings to service_role;
create policy settings_public_read on public.store_settings for select to anon,authenticated using(true);

create table public.orders (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 request_id uuid not null unique,
 receipt_hash text not null check(receipt_hash ~ '^[0-9a-f]{64}$'),
 customer_user_id uuid references auth.users(id) on delete set null,
 customer_name text not null check(char_length(customer_name) between 2 and 80),
 phone text not null check(phone ~ '^(0[0-9]{9}|\+84[0-9]{9})$'),
 address text not null check(char_length(address) between 10 and 500),
 city text not null check(char_length(city) between 2 and 80),
 note text not null default '' check(char_length(note)<=1000),
 consent boolean not null check(consent),
 status text not null default 'pending' check(status in ('pending','confirmed','shipped','delivered','cancelled','returned')),
 payment_method text not null default 'cod' check(payment_method='cod'),
 subtotal numeric(12,0) not null check(subtotal>0),
 shipping_fee numeric(12,0) check(shipping_fee>=0),
 total numeric(12,0) generated always as (subtotal+shipping_fee) stored,
 shipping_mode text not null check(shipping_mode in ('fixed','confirm')),
 customer_confirmed_at timestamptz,
 inventory_released_at timestamptz,
 carrier text not null default '' check(char_length(carrier)<=80),
 tracking_code text not null default '' check(char_length(tracking_code)<=100),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index orders_user_created_idx on public.orders(customer_user_id,created_at desc);
create index orders_status_created_idx on public.orders(status,created_at desc);
alter table public.orders enable row level security;
revoke all on public.orders from anon,authenticated;
grant select(id,code,customer_user_id,customer_name,phone,address,city,note,status,payment_method,subtotal,shipping_fee,total,shipping_mode,customer_confirmed_at,inventory_released_at,carrier,tracking_code,created_at,updated_at) on public.orders to authenticated;
grant all on public.orders to service_role;
create policy orders_owner_admin_read on public.orders for select to authenticated using(
 customer_user_id=(select auth.uid()) or exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create table public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete restrict,
 product_name text not null,
 product_slug text not null,
 image_url text not null,
 inventory_mode text not null check(inventory_mode in ('product','variant')),
 left_variant_id uuid references public.product_variants(id) on delete restrict,
 right_variant_id uuid references public.product_variants(id) on delete restrict,
 left_power numeric(5,2) not null,
 right_power numeric(5,2) not null,
 quantity integer not null check(quantity between 1 and 10),
 box_price numeric(12,0) not null check(box_price>0)
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_product_idx on public.order_items(product_id);
create index order_items_left_variant_idx on public.order_items(left_variant_id);
create index order_items_right_variant_idx on public.order_items(right_variant_id);
alter table public.order_items enable row level security;
revoke all on public.order_items from anon,authenticated;
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
create policy items_owner_admin_read on public.order_items for select to authenticated using(
 exists(select 1 from public.orders o where o.id=order_id)
);

create table vivi_private.order_inventory (
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete restrict,
 variant_id uuid references public.product_variants(id) on delete restrict,
 units integer not null check(units>0)
);
create unique index order_inventory_unique_idx on vivi_private.order_inventory(order_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index order_inventory_product_idx on vivi_private.order_inventory(product_id);
create index order_inventory_variant_idx on vivi_private.order_inventory(variant_id);
alter table vivi_private.order_inventory enable row level security;
grant all on vivi_private.order_inventory to service_role;

create table public.order_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 status text not null,
 note text not null default '' check(char_length(note)<=1000),
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events(order_id,created_at);
create index order_events_actor_idx on public.order_events(actor_id);
alter table public.order_events enable row level security;
revoke all on public.order_events from anon,authenticated;
grant select on public.order_events to authenticated;
grant all on public.order_events to service_role;
create policy events_admin_read on public.order_events for select to authenticated using(
 exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create table vivi_private.rate_limits (
 key text not null,
 window_start timestamptz not null,
 expires_at timestamptz not null,
 hits integer not null,
 primary key(key,window_start)
);
create index rate_limits_expiry_idx on vivi_private.rate_limits(expires_at);
alter table vivi_private.rate_limits enable row level security;
grant all on vivi_private.rate_limits to service_role;

create table public.support_requests (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 customer_name text not null check(char_length(customer_name) between 2 and 80),
 phone text not null check(phone ~ '^(0[0-9]{9}|\+84[0-9]{9})$'),
 order_code text not null default '' check(char_length(order_code)<=40),
 topic text not null check(topic in ('contact','shipping','returns','privacy')),
 message text not null check(char_length(message) between 5 and 2000),
 consent boolean not null check(consent),
 status text not null default 'new' check(status in ('new','contacted','resolved')),
 created_at timestamptz not null default now()
);
create index support_status_created_idx on public.support_requests(status,created_at desc);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon,authenticated;
grant select on public.support_requests to authenticated;
grant all on public.support_requests to service_role;
create policy support_admin_read on public.support_requests for select to authenticated using(
 exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create table public.product_reviews (
 id uuid primary key default gen_random_uuid(),
 order_item_id uuid not null unique references public.order_items(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete restrict,
 display_name text not null check(char_length(display_name) between 2 and 40),
 rating integer not null check(rating between 1 and 5),
 comment text not null check(char_length(comment) between 5 and 2000),
 consent boolean not null check(consent),
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 created_at timestamptz not null default now()
);
create index reviews_product_status_idx on public.product_reviews(product_id,status,created_at desc);
alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from anon,authenticated;
grant select(id,product_id,display_name,rating,comment,created_at,status) on public.product_reviews to anon,authenticated;
grant all on public.product_reviews to service_role;
create policy reviews_public_read on public.product_reviews for select to anon,authenticated using(status='published');
create policy reviews_admin_read on public.product_reviews for select to authenticated using(
 exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

