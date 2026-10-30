# VIVILENS 1.3 — Interactive discovery

- Home/catalog style quiz: four questions, real catalog photos, honest fallback messaging when no model matches every answer. Color takes precedence over editorial styling. All metadata comes from existing products.
- Editorial filters: everyday, K-beauty, bridal/yearbook and statement. These are makeup/color-palette suggestions, not claims about fit, physical lens borders, enlargement or medical suitability.
- Quick view: accessible dialog, full original gallery, wishlist, compare and the same two-eye purchase panel as the product page. Preserves catalog filters, pagination and scroll position.
- Compare up to three products: original photos, color, confirmed DIA, cycle, two-lens box price. Missing specifications stay unconfirmed. Comparison IDs persist locally.
- Mobile product actions: wishlist, consultation, and power selection/add-box button. Existing browsing navigation remains on other pages.
- Public consultation form: explicit consent, Vietnamese phone validation, bounded inputs, duplicate-submit protection and a basic honeypot. Saved requests appear in Admin → Yêu cầu tư vấn (new/contacted filters, latest 50 per filter). This is a public form; the honeypot is not a substitute for future rate limiting if spam is observed.
- `product_inquiries` has RLS. Visitors can insert only allowed fields for visible products; only verified `admin_users` can read or update status. No customer contact details go into discovery events.
- Native integration events are dispatched on `window` as `vivilens:interaction`. No external analytics provider or aggregate reporting is enabled by this release.
- Pricing and stock authority remain unchanged. Catalog previews are not automatically activated for sale. The cart remains a two-lens box; no order/checkout/payment functionality was added.

Validation: 17 Node behavior tests; production build; browser quiz/filter/compare/quick-view/cart checks; 390×844 responsive iframe layout; anonymous inquiry insert and read/update denial; mobile consultation submission with test data removed after verification.
