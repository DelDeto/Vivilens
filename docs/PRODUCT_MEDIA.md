# Product photo review · 2 November 2026

Reviewed all 564 original gallery files belonging to 122 visible products. Selected cover photographs show the model wearing the product; 21 existing covers were replaced by another original photo from the same product. No photo was generated, recolored, or deleted. Products with only collage/poster material retain an authentic image containing the model's face.

The live product cover matches position 1 for all 122 products. The remaining 302 information/detail images follow the cover. Another 140 model photographs remain available in the separate “Ảnh mẫu khác” album. Products without additional model photos keep the simpler gallery. The shop hover image uses the information album, rather than switching to an unrelated model shot.

`catalog/product_media.json` records original URLs, selected cover, information/other groups and previous cover/order for rollback. Gallery groups affect only storefront presentation; all 564 database rows and Storage files remain present. No inventory, pricing, prescription, or authentication settings were changed. Existing pearl background and theme are retained.

The SEO snapshot, social preview data and Try-On thumbnails use the same cover. Existing Try-On colors are preserved; manually sampled reference photos now use stable image URLs so a gallery reorder cannot apply iris coordinates to a different image.

Validation: catalog-wide tests verify cover/first-image consistency, complete image reachability, group separation and safe handling of newly added photos, alongside the existing commerce/SEO tests. `npm run build:pages` and `npm run check:seo` validate the published package.
