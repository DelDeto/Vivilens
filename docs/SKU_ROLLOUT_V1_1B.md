# VIVILENS V1.1B — Lens SKU / prescription rollout

## Scope
This release introduces **optional** per-SKU prescription and sellable-unit inventory. Existing products remain in `inventory_mode='product'` and use their existing single stock field.

Each SKU records: product, unique SKU, optical power (diopters), `unit_label` (verified actual selling/packaging unit), available stock, optional override price, active state. For two eyes with different powers, the customer adds the appropriate SKUs separately. The application makes **no claim** about whether a unit is a lens, pair, blister or box; you must set this from the actual supplier packaging.

## Safe rollout
1. Test PR build and Preview first.
2. Back up the production Supabase schema/data.
3. Apply `supabase/migrations/20261028_product_variants.sql` once to the Supabase project.
4. Verify schema privileges and RLS with anonymous, customer and admin roles; do not seed arbitrary SKUs.
5. In Admin, open **SKU** for one product, enter verified SKU code, diopter, sale unit, stock, and price if distinct.
6. After entering all valid SKUs, edit the parent product and switch its inventory mode from **product** to **variant**.
7. Test product detail SKU selection, out-of-stock options, two powers as distinct cart lines, quantity limits, old cart behavior and mobile layouts.
8. Only after QA, merge PR and re-test production.

## Important restrictions
- **There is still no checkout or payment processing.** Browser totals are informational, not a reliable price source.
- Future checkout must revalidate the SKU, pricing and stock on the backend in a transaction; never trust localStorage cart totals.
- No price/stock/packaging defaults for real inventory have been populated.
- When a product is switched into SKU mode, **old legacy cart items without a variant are not purchasable** and must be added again with an explicit SKU.
- Do not enable SKU mode for a product until at least one appropriate SKU has been entered and confirmed.
- The migration adds a new column with a backwards-compatible default and an additional RLS-protected table; it does not delete or recalculate legacy product stock.

## Release tests
- Existing product without SKU mode still adds to cart as previously.
- SKU-mode product requires an active, in-stock SKU selection before adding.
- Different SKU IDs for one product result in separate cart lines.
- Quantity cannot exceed the selected SKU's stock.
- Hidden/inactive SKUs are not selectable by anonymous customers.
- Admin can create/update SKUs; anon and normal authenticated customers cannot.
- Products disabled in `public.products` do not expose SKU inventory to anonymous customers.
