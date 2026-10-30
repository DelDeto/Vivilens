# VIVILENS 1.4 — Product photography and social previews

The homepage now uses original VIVILENS product gallery photos for Milk Tea Brown, Clear Sky Blue, Creamy Pink and Fairy Gray. The design targets the requested female audience aged 15–23 with blush, cream and lilac framing. Images are resized and compressed without changing faces, poses or lens colors. Original posters remain complete with `object-fit: contain`.

## Assets

- Source photo URLs and gallery positions: `catalog/brand_asset_sources.json`.
- Responsive WebP images: `public/brand`, with two resolutions per selected product. Only the main hero image loads eagerly; other editorial images load lazily.
- Favicon: SVG plus PNG and ICO fallbacks. Apple and manifest icons are included.
- Default sharing image: `public/brand/og-vivilens-v14.jpg`, 1200 × 630 pixels. Versioned filenames avoid reusing older cached image URLs.
- Regenerate checked-in assets with `npm ci && npm run build:brand`. This downloads the original public source photos and uses Sharp for resizing and composition.

## Link previews

`npm run build` emits complete Open Graph and Twitter metadata in raw HTML for the homepage, shop and each product in `catalog/social_products.json`. Social crawlers do not need to execute JavaScript. Cloudflare's default HTML handling serves `products/<slug>.html` at `/products/<slug>`, while the existing SPA fallback remains enabled.

The homepage and shop share the branded image; product links use that product's actual public photo. Account and admin pages carry `noindex, nofollow`. `src/routing.js` keeps metadata consistent during browser navigation.

`catalog/social_products.json` is a snapshot of the 122 public products at this release. When adding, hiding or renaming products, refresh this public-only snapshot and rebuild to update static social cards and the sitemap. Do not include private records or admin notes. Product images and catalog browsing in the application still load from the live public catalog.

## Navigation update (1.4.1)

The main navigation contains All lenses, a styling dropdown, Vivi Edit, About VIVILENS and a quiz call to action. Color groups remain in catalog filters and the homepage visual color collection. The logo links home; wishlist access stays in the header and mobile action bar.

Styling links use `/shop?style=everyday`, `kbeauty`, `occasion` or `statement`. These reuse the existing editorial color-group filters and show a collection-specific heading and description. They are styling suggestions, not new claims about product fit or medical suitability. A reload or browser Back restores the selected style; the catalog's color and cycle controls remain available. Social previews for these query URLs use the shop's existing branded image.

Vivi Edit and the brand story are real homepage sections with `/#vivi-edit` and `/#ve-vivilens` links. The styling dropdown works by click or keyboard; Escape and clicking outside close it. Mobile navigation uses the same collections and closes after a selection.

## Validation

Run `npm test && npm run build`. Tests cover social metadata, HTML escaping, icon dimensions and the 1200 × 630 sharing image. Browser QA covers desktop, a 390px-wide mobile layout and product links from the hero.
