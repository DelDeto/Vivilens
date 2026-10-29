# VIVILENS: two-eye selection visible for every product (2026-10-29)

## Why the original control was invisible
All active products were still in the legacy inventory mode (product). The previous UI only mounted the left/right prescription selectors when inventory_mode was variant, which requires actual per-power SKU rows. The product_variants table had no rows, so customers did not see the control.

## Updated storefront behavior
- All colors/products show two prescription selectors, one for the left eye and one for the right eye, including legacy-mode products.
- The "Add 1 box (2 lenses)" button requires **both selections**, including the 0.00 / no-power option.
- Available options follow the currently approved 28 power values; the catalog is not falsely represented as per-power confirmed stock.
- Clicking the small plus button from the product grid opens that product's detail page to choose the two lens powers instead of silently adding an unspecified product.
- One cart line is one **box with two selected lenses**, one box price. Cart displays both powers and retains them across refresh in browser localStorage.
- Stock for legacy-mode products remains counted by total boxes and shared across prescriptions. Exact per-power availability is **not verified**; customer-facing copy notes that selected powers must be confirmed when processing the order. No SKU records or inventory values are invented.
- Actual per-power SKU mode still enforces individual-piece stock for the pair.

## QA
Run npm test + npm run build; verify preview before merge. Manually test product detail with both eyes unselected, one eye selected, two eyes selected (same and different), 0.00, both desktop/mobile, and cart persistence after refresh. No checkout has been activated. When importing verified individual-piece SKU stocks, switch the corresponding product to variant mode and test stock-specific enforcement before accepting orders.
