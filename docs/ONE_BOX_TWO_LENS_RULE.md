# VIVILENS: one box of two lenses

Selling unit: ONE BOX with exactly TWO lenses. Customer picks LEFT and RIGHT prescriptions separately. Both different and equal powers cost ONE box price and deliver TWO pieces.

Example:
- Left -1.00 / right -1.25 = one box, two pieces, price x1.
- Left -1.25 / right -1.25 = one box, two pieces, price x1.
- Left 0.00 / right -2.00 = one box, two pieces, price x1.

Valid prescription powers: 0.00, -1.00 through -7.00 in steps of 0.25, then -7.50 and -8.00 (28 values). Do not add -0.25, -0.50 or -0.75 without explicit catalog confirmation.

SKU inventory is counted in INDIVIDUAL LENSES. One purchased box consumes two lenses:
- Same power: decrement 2 pieces from the same SKU.
- Different powers: decrement 1 piece from each selected SKU.
One cart line contains product ID plus left and right variant IDs, and quantity is number of boxes, not number of pieces. Price is taken once from the parent product, not summed from two lens SKUs.

Future server checkout must perform atomic stock checks and deductions and verify every SKU, its validity, product, price, and stock independently from the browser. Cart-side stock checks are advisory and not a substitute for transaction-safe server stock management.

IMPORTANT physical-fulfillment gate: Confirm the supplier/packer can package two different prescriptions in ONE box, with correct hygiene, traceability, and lens-specific lot/expiry labeling. If existing sealed boxes cannot be split/repacked, these bundles cannot be fulfilled as described.

Legacy products stay in product inventory mode. Mixed-power selection becomes usable only after validated piece-level SKUs are entered and the parent product switches to variant inventory mode. No fabricated quantities/prices/powers should be seeded. Existing single-SKU local cart entries for variant-mode products need re-selection of BOTH eyes. Checkout remains disabled.
