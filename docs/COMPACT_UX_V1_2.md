# VIVILENS compact responsive interface — V1.2

Goal: reduce unnecessary vertical scrolling while preserving access to full product descriptions, photography and the two-eye prescription flow.

## Desktop (>= 1001px)
- Reduced announcement strip + sticky navigation height; smaller spacing between breadcrumb and product content.
- Product detail uses a balanced two-column layout with a viewport-bounded photo gallery.
- Left/right prescription selection and add-to-cart are prioritized immediately after the title/price; long product details are in an accessible expandable section.
- Home editorial sections, color cards, feature cards and footer have less unproductive whitespace.

## Mobile (< 651px)
- Hide redundant announcement strip; retain main navigation and bottom navigation.
- Product hero image capped by viewport height, with horizontally scrolling compact thumbnails and an accessible full-size photo zoom.
- Main product details, two eye selects and call-to-action follow the photo without oversized spacers; expandable specifications are optional.
- Filter chips use a horizontally scrollable single row rather than many wrapped rows; product cards are more compact.

## Catalog
- Paginate eight products at a time with Previous/Next controls; filter changes reset to page 1. Full catalog remains available through pagination.
- Page navigation scrolls to the product grid, not the top of the entire website.

## Acceptance checks
- 1366x768 / 1440x900: product detail shows photo and prescription controls without excessive blank regions.
- 390x844 / 375x667: image fits, selectors do not overflow, add button enables only after choosing both eyes.
- Long titles, no gallery image, multiple gallery images, 0.00 and mixed prescriptions.
- Full-size gallery modal, accessible Details disclosure, page navigation with filters, cart drawer, Admin and login modal.
- Homepage, shop, detail and account: scrolling remains available where content truly exceeds screen height.
- No SQL or inventory data changes; checkout remains disabled.
