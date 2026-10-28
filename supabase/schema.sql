-- Run once in Supabase SQL Editor. Uses RLS for all public tables.
create extension if not exists pgcrypto;

create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 slug text not null unique,
 color text not null default 'Brown',
 diameter text not null default '14.2',
 wear_period text not null default '6 tháng',
 description text not null default '',
 image_url text not null default '',
 price numeric(12,0) not null check (price >= 0),
 stock integer not null default 0 check (stock >= 0),
 active boolean not null default true,
 featured boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.admin_users enable row level security;

-- Public can view only active products. Admin users can see active and inactive.
create policy "products_public_read" on public.products for select to anon,authenticated using (active = true);
create policy "products_admin_read" on public.products for select to authenticated using (
 exists(select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "products_admin_insert" on public.products for insert to authenticated with check (
 exists(select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "products_admin_update" on public.products for update to authenticated using (
 exists(select 1 from public.admin_users where user_id = (select auth.uid()))
) with check (
 exists(select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "products_admin_delete" on public.products for delete to authenticated using (
 exists(select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin_users_self_read" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
-- No client INSERT/UPDATE/DELETE policies for admin_users. Grant admin manually via SQL Editor.

grant usage on schema public to anon, authenticated;
grant select on public.products to anon,authenticated;
grant insert,update,delete on public.products to authenticated;
grant select on public.admin_users to authenticated;

-- Sample product records: demo data; replace pricing, images and details before launch.
insert into public.products (name,slug,color,diameter,wear_period,price,stock,featured,image_url,description)
values
('Milk Tea Brown','milk-tea-brown','Brown','14.5','6 tháng',189000,24,true,'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=85','Màu nâu trà sữa — thông tin minh họa.'),
('Fairy Gray','fairy-gray','Gray','14.5','6 tháng',199000,15,true,'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=85','Màu xám nhẹ — thông tin minh họa.'),
('Bubble Brown','bubble-brown','Brown','14.2','3 tháng',179000,18,false,'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=85','Màu nâu nhẹ — thông tin minh họa.'),
('Mist Blue','mist-blue','Blue','14.5','6 tháng',209000,20,true,'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=85','Màu xanh — thông tin minh họa.'),
('Fairy Pink','fairy-pink','Pink','14.5','6 tháng',199000,14,false,'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=900&q=85','Màu hồng — thông tin minh họa.'),
('Every Brown','every-brown','Brown','14.2','1 ngày',99000,30,false,'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&q=85','Màu nâu — thông tin minh họa.')
on conflict (slug) do nothing;

-- After registering your own account and confirming its email, run (replace address):
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'your-admin@email.com'
-- on conflict do nothing;
