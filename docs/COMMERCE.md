# VIVILENS 1.5 — COD orders, inventory and customer support

## Customer flow

The cart opens `/checkout`. Guests can order without creating an account. The Edge Function rechecks current product eligibility, selected powers, stock, price and the shipping quote. A box always contains two lenses; powers may differ between eyes. Products remain at their current catalog prices, including the existing 220,000 VND box price.

Only products already marked active can be ordered. This release does not activate the 116 catalog previews or fabricate stock for missing powers. The six existing active products keep their existing box-based stock until the merchant enters verified SKU quantities.

Requests use a UUID idempotency key, retained across retries in the same session. A 256-bit receipt capability allows a guest to view `/order/<code>` from the checkout browser session. Only its SHA-256 digest is stored in the database. The receipt token is not included in URLs, public tables or logs. Signed-in customers can also view their own order history.

## Shipping and confirmation

The initial shipping mode is **confirm**. The checkout shows product subtotal and explicitly states that shipping has not been added. The order's final COD total remains null until the merchant confirms the fee with the customer.

In Admin → Information, the merchant can enter actual phone, email, address, social links, delivery information and return terms. Blank contact channels are hidden. The merchant may configure a fixed shipping fee; entering an explicit zero enables free shipping. No delivery promise, contact number or return period was invented.

In Admin → Orders, confirming an order requires the shipping fee and a checked confirmation that the merchant has agreed the products, powers, address and COD total with the customer. Shipping then requires a carrier and tracking code. The application records these details; it does not buy shipping labels or send messages automatically.

## Order and stock behavior

- `pending` → `confirmed` or `cancelled`
- `confirmed` → `shipped` or `cancelled`
- `shipped` → `delivered` or `returned`
- `delivered` → `returned`

New orders reserve stock atomically. Parent products and selected SKUs are locked in a consistent order. Repeated submission reuses the order. Repeated cancellation cannot release inventory twice.

Box inventory deducts the ordered number of boxes. SKU inventory counts individual lenses: identical eye powers consume two units from one SKU; different powers consume one unit each. Demand is aggregated across the entire cart. Cancellation releases the inventory recorded for that order, even if product metadata later changes.

Returned lenses are not automatically restocked. The merchant checks resale eligibility and explicitly updates stock. Switching inventory mode is blocked while the product has pending, confirmed or shipped orders. Stock edits use expected quantities so stale forms cannot overwrite a concurrent reservation.

Admin → Inventory provides the 28 supported powers. Empty fields mean unentered quantities, while explicit zero means verified zero stock. SKU rows are created only when the merchant supplies a quantity. Product editing no longer writes a stale stock value or switches the inventory model.

The order desk refreshes every 30 seconds while visible and has a manual refresh button, status filters, search and pagination.

## Support and verified reviews

The footer and product details link to contact, shipping/COD, returns support, lens care and privacy pages. Support submissions require contact consent and are visible only to admins. Actual return terms are configurable; until supplied, the page offers a case-specific support workflow.

Lens-care content is based on [CDC guidance](https://www.cdc.gov/contact-lenses/prevention/index.html), with a source link on the page. Product images, models and lens colors are unchanged.

Reviews can be submitted only for items from a delivered order, with receipt access or authenticated ownership and explicit publication consent. They enter a moderation queue. Public reads expose only published review content and the chosen display name. No sample reviews were inserted.

## Deployment and access

Apply the three migrations and deploy `supabase/functions/vivilens-commerce` with `index.ts`, `handler.mjs` and `domain.mjs`. The function uses built-in Supabase environment keys. No server secret is in the frontend or repository.

The function uses `verify_jwt=false` because guest requests carry a publishable API key. It validates that key against the environment; administrative actions additionally verify the user's JWT with Auth and check `admin_users`. Server RPCs are `SECURITY INVOKER`, with EXECUTE revoked from PUBLIC/anon/authenticated and granted only to service_role. Private stock ledgers and rate-limit records are in a non-exposed schema. New public tables have RLS and explicit grants.

Public mutation requests are bounded and rate-limited using HMAC-derived keys. Customer information, powers, tokens and request bodies are not logged. Checkout and receipt routes are excluded from indexing. Existing auth configuration was preserved; the pre-existing leaked-password-protection advisory is outside this release's changes ([Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).

## Verification

- `npm test`: 33 tests, including API authorization, receipt isolation, idempotency, customer validation, shipping configuration and cart preservation.
- `supabase/tests/commerce.sql`: transactional integration assertions for pricing, stock units, duplicate submissions, cancellation, stale edits, status transitions and permissions. All test orders and stock changes roll back.
- Live Edge checks: quote succeeds at 220,000 VND; invalid power is rejected; changed quotes are rejected; guest admin calls and direct private-table/RPC reads are rejected. No real order was created by these checks.
- Browser QA: actual guest checkout quoting, desktop and 390px mobile layouts, support pages and form validation. Admin presentation was checked in an ignored, isolated fixture without backend writes; no admin credentials were generated for testing.

Ignored `qa-*` files are not included in production artifacts.
