# VIVILENS Drive catalog import — 2026-10-29

Source: https://drive.google.com/drive/folders/1Hj6y0IcPjbOx8_dNQHS4rQhlrLNBp_QJ

## Verified work
- Original Drive: 134 subfolders, 12 collections or marketing folders excluded, leaving 122 candidate lens-color models.
- Existing 7 Supabase products unchanged. Inserted 115 new unique-slug rows as unpublished drafts.
- Database verification: 122 total products, 6 active and 116 drafts (including existing Siren Gray draft).
- No invented prices, stock counts or optical specification values; inactive drafts have 0 price, 0 stock, and pending-verification technical specifications.
- All 122 source folders now have indexed real photo references (564 photo references, at most 5 per model). For Olive Brown, photos were found in a nested folder. The complete original Drive image IDs, filenames, and source folder links are saved in catalog/drive_products_2026-10-29.json.
- Admin improvements: search, status and color filters, and 15 results per page. Prevent accidental publication when price, photo URL, stock, diameter or use duration are missing.

## Not yet completed
- The indexed Drive image references are **not** uploaded to the website image storage. The new drafts have no public image URL. Google Drive thumbnail hotlinks are unverified and should not be treated as hosted assets.
- Validate authentic lens photo identity, diameter, use duration, pricing, and package/stock definitions.
- Review apparent duplicates or variant naming: CREAMY PINK versus CRAMY PINK; Milk Tea Brown versus Milk Tea Browm (1DAY).
- Publish model by model after real images and verified details are imported.
- A box contains exactly two lenses, each selected independently by eye. Per-power inventory represents individual pieces; checkout remains disabled.

## Where to manage
Open https://vivilens.duc-nguyen-ndd127.workers.dev/admin while signed in as an authorized Admin and filter status to Bản nháp. The public Shop continues showing only confirmed active products until individual drafts are completed and published.
