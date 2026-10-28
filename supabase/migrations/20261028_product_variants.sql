-- VIVILENS V1.1B: sellable stock-keeping units for prescription/power variants.
-- Apply in Supabase SQL Editor only after reviewing actual VIVILENS SKUs, packaging and prices.
-- Preserves existing product inventory by default and does not enable checkout.
alter table public.products
  add column if not exists inventory_mode text not null default 'product'
  check (inventory_mode in ('product','variant'));

-- Switch to inventory_mode = 'variant' only after verified SKU rows are populated.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique check (btrim(sku) <> ''),
  power numeric(5,2) not null,
  unit_label text not null check (btrim(unit_label) <> ''),
  price_override numeric(12,0) check (price_override is null or price_override >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, power, unit_label)
);

create index if not exists product_variants_product_idx on public.product_variants(product_id);
alter table public.product_variants enable row level security;
revoke all on table public.product_variants from anon, authenticated;

-- A public customer may only see active SKUs under active parent products.
create policy "variants_public_read" on public.product_variants
for select to anon,authenticated using (
  active = true and exists (
    select 1 from public.products p where p.id = product_id and p.active = true
  )
);

create policy "variants_admin_read" on public.product_variants
for select to authenticated using (
  exists(select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
create policy "variants_admin_insert" on public.product_variants
for insert to authenticated with check (
  exists(select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
create policy "variants_admin_update" on public.product_variants
for update to authenticated using (
  exists(select 1 from public.admin_users a where a.user_id = (select auth.uid()))
) with check (
  exists(select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
create policy "variants_admin_delete" on public.product_variants
for delete to authenticated using (
  exists(select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

grant select on public.product_variants to anon,authenticated;
grant insert,update,delete on public.product_variants to authenticated;

-- No sample power values or stock are inserted. Import verified real stock only.
-- Frontend cart remains non-binding; a future checkout transaction must re-read
-- variant pricing/stock on the server and enforce inventory concurrency.
