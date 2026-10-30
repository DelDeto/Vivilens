-- Customer consultation requests. Public visitors may submit; only verified admins may read.
create table public.product_inquiries (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete restrict,
 customer_name text not null check(char_length(btrim(customer_name)) between 2 and 80),
 phone text not null check(phone ~ '^(0[0-9]{9}|\+84[0-9]{9})$'),
 message text not null default '' check(char_length(message)<=1000),
 consent boolean not null check(consent=true),
 status text not null default 'new' check(status in ('new','contacted')),
 created_at timestamptz not null default now()
);
alter table public.product_inquiries enable row level security;
revoke all on public.product_inquiries from anon,authenticated;
grant insert(id,product_id,customer_name,phone,message,consent) on public.product_inquiries to anon,authenticated;
grant select on public.product_inquiries to authenticated;
grant update(status) on public.product_inquiries to authenticated;
create policy inquiries_submit on public.product_inquiries for insert to anon,authenticated with check (
 consent=true and exists(select 1 from public.products p where p.id=product_id and (p.active or p.catalog_visible))
);
create policy inquiries_admin_read on public.product_inquiries for select to authenticated using (
 exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
create policy inquiries_admin_update on public.product_inquiries for update to authenticated using (
 exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
) with check (
 exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
create index product_inquiries_product_idx on public.product_inquiries(product_id);
create index product_inquiries_status_created_idx on public.product_inquiries(status,created_at desc);
