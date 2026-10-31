# VIVILENS 1.6.1 — Cloudflare Pages

Production: **https://vivilens.pages.dev/**. The merchant explicitly selected this free address on 31 October 2026.

Cloudflare account: `ea442a00e47070491dd2dc643d0bbf11`; Pages project: `vivilens`; project ID: `f6d3e361-40de-4247-8dc5-9a4fe24b6d87`. The project uses Direct Upload on production branch `main`. GitHub source and CI remain in `DelDeto/Vivilens`; CI validates builds but does not silently claim automatic deployment.

## Build and publish

1. `npm ci --no-audit --no-fund`
2. `npm test`
3. `npm run build:pages`
4. `npm run check:seo`
5. With Cloudflare deployment credentials available, `npx wrangler pages deploy dist --project-name vivilens --branch main`.

`wrangler.jsonc` is now the Pages configuration. `scripts/build_pages.mjs` bundles the same tested public-product router as `dist/_worker.js` using pinned esbuild. `_routes.json` enables Functions only on `/products/*` and `/order/*`; ordinary pages, optimized brand images, JS, CSS and sitemaps remain static CDN assets. Functions retain the public Supabase URL and publishable key bindings in production/preview. These are public browser-safe keys, not server credentials. Functions fail closed rather than bypassing the router if their configuration cannot be applied.

The authentic 122-product catalog, 564 images, eye-power options, two-lens box pricing, order database and stock are unchanged. Product schema continues reading fresh public prices/stock, and unknown products remain real 404s. The 140 public sitemap URLs, canonical URLs, JSON-LD, Open Graph URLs and robots use the new production origin. Account/admin/checkout and private receipt pages remain noindex; private static shells also receive no-store headers.

## Previous address

`worker/legacy-redirect.js` permanently redirects public paths and query strings from `https://vivilens.duc-nguyen-ndd127.workers.dev` to the same Pages path. It constructs the destination with a fixed origin, avoiding protocol-relative redirects. The original Worker is retained, not deleted.

Existing guest receipt URLs and their static assets continue to work on their original origin. Guest receipt capabilities are stored in that origin's sessionStorage and are never copied into query strings, analytics or a migration service. Other browser-local state, including carts, wishlists and authenticated sessions, is scoped by the browser to each hostname; customers may need to sign in again on Pages.

`wrangler.legacy.jsonc` documents the retained Worker. Its first migration deployment retains its existing asset set using the Workers API `keep_assets` option, updates routing to run the redirect first, and keeps the original public catalog bindings for private receipt rendering. Do not remove the legacy Worker or its private receipt support while existing guest links are needed.

## Supabase

The commerce function's exact-origin allowlist now includes `https://vivilens.pages.dev` and the retained old origin. Preview/lookalike hosts remain rejected. Existing API-key checks, verified Auth users, administrator checks, server-side order totals and atomic stock reservations are unchanged.

Email/password sign-in continues through the same Supabase project. The dashboard's Auth URL Configuration requires a signed-in dashboard session; the connected Supabase tools do not expose Auth configuration updates. During migration that dashboard displayed a sign-in screen, so **the new Auth Site URL and redirect allowlist have not yet been saved**. Set Site URL to `https://vivilens.pages.dev` and allow the exact production root (and `https://vivilens.pages.dev/**` only if callbacks need additional paths). Retain the old callback URL while old confirmation links are valid. Registration already sends the current origin as `emailRedirectTo`; confirm the new address is allowed before relying on confirmation emails.

Search Console verification/submission and GA4 activation still require merchant Google access/IDs; no indexing or revenue-attribution success is claimed by this hosting migration.
