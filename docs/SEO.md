# VIVILENS 1.6 — organic search foundation

## Published scope

- 122 real catalog products have initial HTML with name, images, public specifications, price per two-lens box and crawlable product links. A public JSON bootstrap preserves useful initial content while the interactive storefront refreshes the catalog.
- 20 products have individually edited style descriptions in `src/seo-content.js`. This layer adds editorial guidance without changing inventory or inventing specifications. Original photographs, faces and lens colors are unchanged.
- Four curated collection pages: `/collections/lens-nau-tu-nhien`, `/collections/lens-di-hoc`, `/collections/lens-ky-yeu`, `/collections/lens-xam`. Each has its own canonical, description, initial content, related collections and ItemList/Breadcrumb structured data. Homepage mood navigation remains available.
- `/notes` and six guides cover DIA/GDIA, brown versus gray, graduation photos, packaging labels, mixed eye powers and reading product photos. Authors are honestly identified as VIVILENS editorial, without invented medical credentials. Care guidance links to the existing sourced help page.
- `sitemap.xml` contains 140 public URLs. `sitemap-images.xml` identifies the authentic gallery photos. Private pages and internal HTML shell are excluded. Social metadata and favicon assets are retained.
- Product cards expose real anchor URLs. JavaScript still provides quick view, wishlist, comparison, prescription selection and COD checkout.

## Edge behavior and data freshness

The existing Worker now includes a small ESM router plus Static Assets. Static pages/assets are served directly. `/products/*` runs the router first to obtain **public** product fields and images through Supabase's publishable API with existing RLS. Active SKU products additionally read public SKU quantities. No customer records or service-role keys are involved.

`Product` JSON-LD always describes the actual two-lens box. `Offer` is included only after a successful current public read, with the real box price and InStock/OutOfStock state. Build snapshots never supply an Offer. Preview products remain browse-only and have no Offer. No review stars, identifiers, shipping fee or return period are fabricated.

Product reads time out after 2.5 seconds per request and response bodies are bounded. During an upstream failure, known products fall back to public descriptive snapshots without stock claims. An unknown URL during an upstream outage returns 503 with Retry-After; a confirmed missing/hidden product returns 404. Other missing paths also return a real 404. Valid guest receipt paths return the private application shell with no-store/noindex, without reading any order information at the edge.

The frontend refreshes its structured data after live catalog reads. Checkout continues to revalidate current prices and stock in the commerce function. This release writes no stock, powers, order data or new product activations.

## Refreshing catalog HTML

Run `npm run seo:sync` to refresh **public** fields and gallery records from Supabase using `.env.production`'s publishable key, then review and commit `catalog/seo_catalog.json`. Run `npm test`, `npm run build`, `npm run check:seo`, and the Worker dry run before deployment. The committed snapshot makes CI builds reproducible without database write access.

When adding/hiding products or changing gallery/technical fields, refresh the snapshot and publish. Product edge pages read current public fields immediately; category cards and sitemap use the latest published snapshot. Keep both layers aligned.

## Merchant-owned domain and Google access still needed

The connected Cloudflare account currently exposes no zones/custom domains for VIVILENS. The analytics connector currently has no Search Console or GA4 account. No domain was purchased and no Google account was created.

1. Supply the domain already owned by the merchant, add its Cloudflare zone and attach it to the existing Worker. Set `src/site-config.js` origin before building. Also update commerce CORS `VIVILENS_SITE_ORIGIN` and Supabase Auth redirect allowlists for the new hostname.
2. Redirect each old public URL permanently to the matching new path; preserve query parameters when needed. Rebuild canonical URLs, schema URLs, social URLs and both sitemaps on the selected origin. Check the new host before enabling the redirects.
3. Verify the site in Search Console via the domain's DNS or enter the supplied HTML verification value in `src/site-config.js`. Submit `/sitemap.xml` and `/sitemap-images.xml`; inspect home, a collection and a product in URL Inspection. We have not claimed successful Google indexing or rich-result approval.

## Analytics activation

`src/site-config.js` has a blank GA4 measurement ID. Analytics is **inactive** until a real merchant-provided `G-...` ID is added and the site is republished. The consent prompt is shown only when configured and on public pages. No Google script is loaded before consent. Advertising storage/signals/personalization are disabled by the supplied integration.

On activation, configure the GA4 stream for **manual page views**, disabling automatic history-based page views and enhanced form-interaction collection. This ensures the app's sanitized page-view events are the source of page paths. Test with DebugView before relying on reports. Page URLs omit search parameters; referrers are reduced to their origin. Ecommerce events include only product slug/name/color, box price and quantity. Names, phone numbers, addresses, email, eye powers and receipt capabilities are not event parameters.

Prepared events: `page_view`, `view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, and custom `order_submitted`. The last event means a COD order was submitted, **not revenue**. Delivered revenue/purchase events require a later server-side integration with the merchant's GA4 property and must use actual delivered orders, deduplication and cancellation/refund rules. No pending COD order is sent as a `purchase`.

Weekly review: Search Console impressions/clicks for non-brand queries, indexed public pages, landing pages receiving organic visits, and consented shopping funnel events. Compare 28-day windows once enough data exists. Rankings and Google crawl timing remain externally determined.

## Validation

- Node tests include dynamic product prices, preview/fallback Offer suppression, 404 versus outage behavior, private receipt shells, safe escaping, public routes and analytics payload isolation.
- `check:seo` verifies all sitemap HTML, canonical uniqueness, valid JSON-LD and internal links.
- Browser QA covers desktop/mobile collection and article layouts and existing product selection/checkout behavior.
- Google reference: [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [ecommerce structure](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure), [product data](https://developers.google.com/search/docs/appearance/structured-data/product), [ecommerce measurement](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).
