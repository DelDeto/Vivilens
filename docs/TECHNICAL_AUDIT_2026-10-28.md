# VIVILENS — Technical audit V1.0 (2026-10-28)

Scope: source review of `main`, not a live browser acceptance test. No Supabase credentials or production data were accessed.

## Confirmed present
- React 18/Vite 6, Supabase publishable client and RLS SQL.
- Homepage, catalog filtering, product detail, wishlists, cart (browser localStorage), auth and admin product editor.
- Product gallery and media editor; Cloudflare Workers static assets with SPA fallback.

## Release blockers — do not accept real orders yet
1. **No checkout/orders:** no order entry or order-history flow in main app; README explicitly flags missing checkout.
2. **No prescription variants:** cart items are keyed solely on product ID and quantity; no left/right powers. Schema holds stock only per product, not per SKU/power. Do not decrement stock on client.
3. **Untrusted cart total:** displayed cart total is computed from frontend prices. When implementing COD, server must re-read products, validate variants, verify price/stock and create an order atomically.
4. **Demo inventory/images/prices:** seed data and fallback UI use illustration/demo content; replace with verified VIVILENS assets and commercial info before launch.
5. **No customer address book, shipping costs, delivery or returns workflow** documented.
6. **No reliable direct product URL:** `src/main.jsx` navigates via component state (`page`/`selected`) rather than URL; deep links/share/SEO require routing.
7. **No committed package-lock.json:** reproducible npm ci workflow is not yet available.

## Proposed implementation order
**V1.1A — Foundation:** commit lockfile; build CI; routes for /, /shop, /products/:slug, /account; handle 404 and back/forward; accessibility and metadata.

**V1.1B — Lens SKUs:** product variants (per-eye prescription/power), option selection UI, inventory per SKU, availability validation. Resolve packaging/unit conventions with product owner before coding. Keep domain values configurable.

**V1.1C — Sales:** SQL tables for customer addresses, orders, order_lines and inventory movements; server-side atomic COD checkout/RPC, idempotency and concurrency controls; admin order statuses. Enforce RLS and protect customer PII.

**V1.2 — Content/launch:** real approved photos and color data, storage security, shipping/returns/privacy pages, promo logic and mobile QA.

## Acceptance tests before launch
- Signed-out and signed-in user can navigate, refresh and share a product URL.
- Choosing left/right power creates distinct line items; out-of-stock SKU cannot be ordered.
- Two near-simultaneous orders of last unit: exactly one accepted.
- Modifying client cart price, stock or product ID cannot change server-calculated order total.
- Failed request/retry does not duplicate orders or reserve stock twice.
- Users see only their own address/order data; only admins can change order status.
- Verify checkout mobile layout, clear fees, refunds/returns, communication and privacy details.
- No payment capture or live-sales claims until deployment has passed end-to-end QA.

## Review caveat
Cloudflare live URL could not be accessed by the inspection tool; deployment runtime state and mobile rendering remain **unverified**.
