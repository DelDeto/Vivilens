-- Public preview catalog without enabling orders on unverified lens models.
-- Existing drafts stay inactive, with prices and inventory unchanged.
alter table public.products
  add column if not exists catalog_visible boolean not null default false;

-- The 122 model folders were explicitly requested for website display.
update public.products set catalog_visible = true;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (active or catalog_visible);

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p
      where p.id = product_images.product_id and (p.active or p.catalog_visible))
  );

-- Exposed public catalog is read-only for visitors; admin writes retain their RLS guard.
revoke all on table public.products from anon;
grant select on table public.products to anon;
revoke all on table public.product_images from anon;
grant select on table public.product_images to anon;
